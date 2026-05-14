from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from repo_layout import pipeline_config_path, pipeline_root, resolve_npc_brain_root, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
NPC_BRAIN_ROOT = resolve_npc_brain_root(REPO_ROOT)


def resolve_default_cli(cli_name: str) -> Path:
    seen: set[Path] = set()
    ancestors: list[Path] = []
    for anchor in [REPO_ROOT, NPC_BRAIN_ROOT]:
        current = anchor
        for _ in range(len(current.parents) + 1):
            if current not in seen:
                ancestors.append(current)
                seen.add(current)
            if current.parent == current:
                break
            current = current.parent
    for root in ancestors:
        candidate = root / "tools_node" / "agent-clis" / cli_name
        if candidate.exists():
            return candidate
    return REPO_ROOT / "tools_node" / "agent-clis" / cli_name


DEFAULT_SOURCE_HEALTH_CLI = resolve_default_cli("3klife-source-health.js")
DEFAULT_HARVESTER_CLI = resolve_default_cli("3klife-web-page-harvester.js")
DEFAULT_BIOGRAPHY_EXTRACTOR = PIPELINE_ROOT / "extract_harvested_page_evidence_seeds.py"
DEFAULT_GENERIC_EXTRACTOR = PIPELINE_ROOT / "extract_generic_passage_evidence_seeds.py"
DEFAULT_SEED_HARVESTER = PIPELINE_ROOT / "harvest_external_evidence_seeds.py"
DEFAULT_SEED_SCORER = PIPELINE_ROOT / "score_external_evidence_seeds.py"
DEFAULT_SEED_PROMOTER = PIPELINE_ROOT / "promote_seed_to_evidence_card.py"

SOURCE_CLASSES = (
    "high-yield-character-site",
    "primary-text-site",
    "community-worldbuilding-site",
)

DEFAULT_TERM_HIT_KEYWORDS = (
    "\u4e09\u570b",
    "\u4e09\u56fd",
    "\u66f9\u64cd",
    "\u5289\u5099",
    "\u5218\u5907",
    "\u5b6b\u6b0a",
    "\u5b59\u6743",
    "\u95dc\u7fbd",
    "\u5173\u7fbd",
    "\u8af8\u845b\u4eae",
    "\u8bf8\u845b\u4eae",
    "\u53f8\u99ac\u61ff",
    "\u53f8\u9a6c\u61ff",
)
DEFAULT_PRECHECK_POLICY = {
    "likelyThreshold": 3,
    "possibleThreshold": 1,
    "minimumTermHitCount": 1,
    "hintKeywords": ["歷史", "历史", "演義", "演义"],
    "loginPatterns": ["登入", "登录", "sign in", "log in", "建立帳號", "创建账号"],
    "javascriptShellContentTypePrefixes": ["application/javascript"],
    "loginGatedMaxTermHitCount": 1,
    "loginGatedMaxBytesRead": 8000,
}
DEFAULT_STAGE2_GATE_POLICY = {
    "fetchSuccessRateMin": 0.90,
    "relevantPageRateMin": 0.70,
    "errorRateMax": 0.10,
    "duplicateLinkRateMax": 0.05,
}
DEFAULT_STAGE3_CLASS_GATE_POLICY = {
    "high-yield-character-site": {
        "seedPerPageMin": 1.0,
        "candidateCardPerPageMin": 0.40,
        "canonicalMatchPageRateMin": 0.40,
        "shadowPeopleMin": 15,
    },
    "primary-text-site": {
        "quoteLocatorHashCoverageMin": 0.90,
        "claimBearingPassageCountMin": 20,
    },
    "community-worldbuilding-site": {
        "seedPerPageMin": 0.80,
        "candidateCardPerPageMin": 0.20,
    },
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def resolve_existing_path(path_text: str | Path, *, fallback_roots: list[Path] | None = None) -> Path:
    base_path = Path(path_text)
    if base_path.is_absolute():
        return base_path

    search_roots = [
        REPO_ROOT,
        NPC_BRAIN_ROOT,
        REPO_ROOT.parent,
        NPC_BRAIN_ROOT.parent,
        REPO_ROOT.parent.parent,
        NPC_BRAIN_ROOT.parent.parent,
    ]
    if fallback_roots:
        search_roots.extend(fallback_roots)

    candidates: list[Path] = []
    seen = set()
    for root in search_roots:
        candidate = (root / base_path).resolve()
        if candidate not in seen:
            seen.add(candidate)
            candidates.append(candidate)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0] if candidates else resolve_path(base_path)


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_source_row_from_payload(payload: dict[str, Any], source_id: str) -> dict[str, Any] | None:
    rows = payload.get("sources") if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        return None
    for row in rows:
        if isinstance(row, dict) and str(row.get("sourceId") or "").strip() == source_id:
            return row
    return None


def load_source_row(path: Path, source_id: str) -> dict[str, Any] | None:
    payload = read_json(path)
    return load_source_row_from_payload(payload if isinstance(payload, dict) else {}, source_id)


def to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def to_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def normalize_string_list(raw_values: Any, fallback: list[str] | tuple[str, ...] | None = None) -> list[str]:
    if isinstance(raw_values, str):
        values = [raw_values]
    elif isinstance(raw_values, list) or isinstance(raw_values, tuple):
        values = [str(value or "") for value in raw_values]
    else:
        values = []
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        token = str(value or "").strip()
        if not token or token in seen:
            continue
        seen.add(token)
        normalized.append(token)
    if normalized:
        return normalized
    if fallback is not None:
        return normalize_string_list(fallback, fallback=None)
    return []


def resolve_precheck_policy(
    *,
    source_class: str,
    source_row: dict[str, Any] | None,
    source_config_payload: dict[str, Any],
) -> dict[str, Any]:
    pipeline_policies = source_config_payload.get("pipelinePolicies") if isinstance(source_config_payload, dict) else {}
    if not isinstance(pipeline_policies, dict):
        pipeline_policies = {}
    default_policy = pipeline_policies.get("precheckDefaults") if isinstance(pipeline_policies.get("precheckDefaults"), dict) else {}
    class_policy_map = (
        pipeline_policies.get("sourceClassPrecheck")
        if isinstance(pipeline_policies.get("sourceClassPrecheck"), dict)
        else {}
    )
    class_policy = class_policy_map.get(source_class) if isinstance(class_policy_map.get(source_class), dict) else {}
    source_policy = (source_row or {}).get("precheckPolicy") if isinstance((source_row or {}).get("precheckPolicy"), dict) else {}
    likely_threshold = to_int(
        source_policy.get("likelyThreshold"),
        to_int(class_policy.get("likelyThreshold"), to_int(default_policy.get("likelyThreshold"), int(DEFAULT_PRECHECK_POLICY["likelyThreshold"]))),
    )
    possible_threshold = to_int(
        source_policy.get("possibleThreshold"),
        to_int(class_policy.get("possibleThreshold"), to_int(default_policy.get("possibleThreshold"), int(DEFAULT_PRECHECK_POLICY["possibleThreshold"]))),
    )
    return {
        "likelyThreshold": max(likely_threshold, possible_threshold),
        "possibleThreshold": possible_threshold,
        "minimumTermHitCount": max(
            0,
            to_int(
                source_policy.get("minimumTermHitCount"),
                to_int(
                    class_policy.get("minimumTermHitCount"),
                    to_int(default_policy.get("minimumTermHitCount"), int(DEFAULT_PRECHECK_POLICY["minimumTermHitCount"])),
                ),
            ),
        ),
        "hintKeywords": normalize_string_list(
            source_policy.get("hintKeywords"),
            fallback=normalize_string_list(
                class_policy.get("hintKeywords"),
                fallback=normalize_string_list(default_policy.get("hintKeywords"), fallback=DEFAULT_PRECHECK_POLICY["hintKeywords"]),
            ),
        ),
        "loginPatterns": normalize_string_list(
            source_policy.get("loginPatterns"),
            fallback=normalize_string_list(
                class_policy.get("loginPatterns"),
                fallback=normalize_string_list(default_policy.get("loginPatterns"), fallback=DEFAULT_PRECHECK_POLICY["loginPatterns"]),
            ),
        ),
        "javascriptShellContentTypePrefixes": normalize_string_list(
            source_policy.get("javascriptShellContentTypePrefixes"),
            fallback=normalize_string_list(
                class_policy.get("javascriptShellContentTypePrefixes"),
                fallback=normalize_string_list(
                    default_policy.get("javascriptShellContentTypePrefixes"),
                    fallback=DEFAULT_PRECHECK_POLICY["javascriptShellContentTypePrefixes"],
                ),
            ),
        ),
        "loginGatedMaxTermHitCount": max(
            0,
            to_int(
                source_policy.get("loginGatedMaxTermHitCount"),
                to_int(
                    class_policy.get("loginGatedMaxTermHitCount"),
                    to_int(default_policy.get("loginGatedMaxTermHitCount"), int(DEFAULT_PRECHECK_POLICY["loginGatedMaxTermHitCount"])),
                ),
            ),
        ),
        "loginGatedMaxBytesRead": max(
            0,
            to_int(
                source_policy.get("loginGatedMaxBytesRead"),
                to_int(
                    class_policy.get("loginGatedMaxBytesRead"),
                    to_int(default_policy.get("loginGatedMaxBytesRead"), int(DEFAULT_PRECHECK_POLICY["loginGatedMaxBytesRead"])),
                ),
            ),
        ),
    }


def resolve_stage2_gate_policy(
    *,
    source_class: str,
    source_row: dict[str, Any] | None,
    source_config_payload: dict[str, Any],
) -> dict[str, float]:
    pipeline_policies = source_config_payload.get("pipelinePolicies") if isinstance(source_config_payload, dict) else {}
    if not isinstance(pipeline_policies, dict):
        pipeline_policies = {}
    defaults = pipeline_policies.get("stage2GateDefaults") if isinstance(pipeline_policies.get("stage2GateDefaults"), dict) else {}
    class_map = pipeline_policies.get("stage2ClassGate") if isinstance(pipeline_policies.get("stage2ClassGate"), dict) else {}
    class_policy = class_map.get(source_class) if isinstance(class_map.get(source_class), dict) else {}
    source_policy = (source_row or {}).get("stage2GatePolicy") if isinstance((source_row or {}).get("stage2GatePolicy"), dict) else {}
    return {
        "fetchSuccessRateMin": to_float(
            source_policy.get("fetchSuccessRateMin"),
            to_float(class_policy.get("fetchSuccessRateMin"), to_float(defaults.get("fetchSuccessRateMin"), float(DEFAULT_STAGE2_GATE_POLICY["fetchSuccessRateMin"]))),
        ),
        "relevantPageRateMin": to_float(
            source_policy.get("relevantPageRateMin"),
            to_float(class_policy.get("relevantPageRateMin"), to_float(defaults.get("relevantPageRateMin"), float(DEFAULT_STAGE2_GATE_POLICY["relevantPageRateMin"]))),
        ),
        "errorRateMax": to_float(
            source_policy.get("errorRateMax"),
            to_float(class_policy.get("errorRateMax"), to_float(defaults.get("errorRateMax"), float(DEFAULT_STAGE2_GATE_POLICY["errorRateMax"]))),
        ),
        "duplicateLinkRateMax": to_float(
            source_policy.get("duplicateLinkRateMax"),
            to_float(class_policy.get("duplicateLinkRateMax"), to_float(defaults.get("duplicateLinkRateMax"), float(DEFAULT_STAGE2_GATE_POLICY["duplicateLinkRateMax"]))),
        ),
    }


def resolve_stage3_gate_policy(
    *,
    source_class: str,
    source_row: dict[str, Any] | None,
    source_config_payload: dict[str, Any],
) -> dict[str, float]:
    pipeline_policies = source_config_payload.get("pipelinePolicies") if isinstance(source_config_payload, dict) else {}
    if not isinstance(pipeline_policies, dict):
        pipeline_policies = {}
    default_class_map = (
        pipeline_policies.get("stage3ClassGateDefaults")
        if isinstance(pipeline_policies.get("stage3ClassGateDefaults"), dict)
        else {}
    )
    class_default_policy = (
        default_class_map.get(source_class)
        if isinstance(default_class_map.get(source_class), dict)
        else {}
    )
    class_fallback = DEFAULT_STAGE3_CLASS_GATE_POLICY.get(source_class) or {}
    source_policy = (source_row or {}).get("stage3GatePolicy") if isinstance((source_row or {}).get("stage3GatePolicy"), dict) else {}
    merged: dict[str, float] = {}
    for key, fallback_value in class_fallback.items():
        merged[key] = to_float(
            source_policy.get(key),
            to_float(class_default_policy.get(key), float(fallback_value)),
        )
    return merged


def infer_source_class(source_row: dict[str, Any] | None) -> str:
    if source_row and source_row.get("sourceClass") in SOURCE_CLASSES:
        return str(source_row["sourceClass"])
    adapter_type = str((source_row or {}).get("adapterType") or "").strip()
    source_family = str((source_row or {}).get("sourceFamily") or "").strip()
    if adapter_type in {"wikisource", "scan_pdf", "gutenberg_text"}:
        return "primary-text-site"
    if "character" in source_family or "biography" in source_family:
        return "high-yield-character-site"
    return "community-worldbuilding-site"


def run_command(command: list[str], *, cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
        env=env,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            "Command failed (rc={rc}): {cmd}\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}".format(
                rc=completed.returncode,
                cmd=" ".join(command),
                stdout=completed.stdout.strip(),
                stderr=completed.stderr.strip(),
            )
        )
    return completed


def run_json_command(command: list[str], *, cwd: Path = REPO_ROOT) -> dict[str, Any]:
    completed = run_command(command, cwd=cwd)
    stdout = completed.stdout.strip()
    if not stdout:
        raise RuntimeError(f"Expected JSON output but stdout was empty: {' '.join(command)}")
    return json.loads(stdout)


def bool_ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def duplicate_link_rate(discovered: int, selected: int) -> float:
    if discovered <= 0 or selected <= 0 or selected < discovered:
        return 0.0
    return max(0.0, 1.0 - bool_ratio(selected, discovered))


def stage1_precheck(
    *,
    source_id: str,
    url: str,
    timeout_seconds: float,
    source_health_cli: Path,
    source_config_path: Path,
    source_row: dict[str, Any] | None,
    precheck_policy: dict[str, Any],
) -> tuple[dict[str, Any], list[str], bool]:
    command = [
        "node",
        str(source_health_cli),
        "--source-id",
        source_id,
        "--url",
        url,
        "--timeout-seconds",
        str(max(timeout_seconds, 1.0)),
        "--sources-config",
        str(source_config_path),
        "--json",
    ]
    for keyword in normalize_term_hit_keywords((source_row or {}).get("termHitKeywords")):
        command.extend(["--term-hit-keyword", str(keyword)])
    payload = run_json_command(command)
    snippet = str(payload.get("snippet") or "")
    title = str(payload.get("title") or "")
    combined = f"{title}\n{snippet}".lower()
    reasons: list[str] = []
    minimum_term_hit_count = max(0, to_int(precheck_policy.get("minimumTermHitCount"), 1))
    login_patterns = normalize_string_list(precheck_policy.get("loginPatterns"), fallback=DEFAULT_PRECHECK_POLICY["loginPatterns"])
    javascript_prefixes = normalize_string_list(
        precheck_policy.get("javascriptShellContentTypePrefixes"),
        fallback=DEFAULT_PRECHECK_POLICY["javascriptShellContentTypePrefixes"],
    )
    login_gated_max_hits = max(0, to_int(precheck_policy.get("loginGatedMaxTermHitCount"), 1))
    login_gated_max_bytes = max(0, to_int(precheck_policy.get("loginGatedMaxBytesRead"), 8000))
    if int(payload.get("httpStatus") or 0) != 200:
        reasons.append(f"httpStatus={payload.get('httpStatus')}")
    if int(payload.get("termHitCount") or 0) < minimum_term_hit_count:
        reasons.append(f"termHitCount<{minimum_term_hit_count}")
    if not (snippet.strip() or title.strip()):
        reasons.append("deterministic-text-empty")
    login_hit = any(pattern.lower() in combined for pattern in login_patterns)
    if login_hit and int(payload.get("termHitCount") or 0) <= login_gated_max_hits and int(payload.get("bytesRead") or 0) < login_gated_max_bytes:
        reasons.append("login-gated")
    content_type = str(payload.get("contentType") or "").lower()
    if any(content_type.startswith(prefix.lower()) for prefix in javascript_prefixes):
        reasons.append("javascript-shell-content-type")
    passed = not reasons
    return payload, reasons, passed


def write_single_source_health_summary(path: Path, source_id: str, source_url: str, source_class: str, precheck: dict[str, Any]) -> None:
    write_json(
        path,
        {
            "version": "1.0.0",
            "generatedAt": utc_now(),
            "mode": "benchmark-single-source-health-summary",
            "canonicalWrites": False,
            "sourceChecks": [
                {
                    "sourceId": source_id,
                    "sourceClass": source_class,
                    "baseUrl": source_url,
                    **precheck,
                }
            ],
        },
    )


def gather_angle_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counter = Counter(str(row.get("angleType") or "") for row in rows if isinstance(row, dict))
    return dict(sorted((angle, count) for angle, count in counter.items() if angle))


def angle_label_zh_tw(angle_type: str) -> str:
    mapping = {
        "identity": "身分",
        "relationship": "關係",
        "event": "事件",
        "title": "官職/稱號",
        "trait": "特質",
        "role": "角色/定位",
        "location": "地點",
        "habit": "習慣",
        "activity": "活動",
        "worldbuilding_note": "世界觀補充",
        "dialogue_seed": "對話素材",
        "source_conflict": "來源衝突",
    }
    return mapping.get(angle_type, angle_type)


def build_review_summary_zh_tw(row: dict[str, Any]) -> str:
    person_label = str(row.get("matchedName") or row.get("personId") or "").strip() or "此人物"
    angle_type = str(row.get("angleType") or "").strip()
    quote = str(row.get("quote") or "")
    source_layer = str(row.get("sourceLayer") or "").strip()
    layer_label = {
        "history": "史料層",
        "romance": "演義層",
        "worldbuilding": "世界觀層",
        "encyclopedia": "整理層",
    }.get(source_layer, "來源層")
    base = {
        "identity": f"這句主要在確認「{person_label}」的身分或人物對應，審核時先看是不是明確在介紹同一個人。",
        "relationship": f"這句主要在看「{person_label}」與其他人物的親屬、婚配或從屬關係，審核時先抓主語與關係方向。",
        "event": f"這句主要在看「{person_label}」參與的事件或行動，審核時先確認動作主體與事件邊界。",
        "title": f"這句主要在看「{person_label}」的官職、封號或稱謂，審核時先確認它是不是正式頭銜。",
        "trait": f"這句主要在看「{person_label}」的性格、容貌或能力描寫，審核時先確認這不是單純事件敘述。",
        "role": f"這句主要在看「{person_label}」的角色定位或身份功能，審核時先分清楚它是不是人物關係而不是官職。",
        "location": f"這句主要在看「{person_label}」涉及的地點線索，審核時先確認地名是不是明確落地。",
        "habit": f"這句主要在看「{person_label}」的習慣或偏好，審核時先分清楚它是不是穩定特徵而不是單次事件。",
        "activity": f"這句主要在看「{person_label}」做過的生活或任務活動，審核時先抓動作主體與行為類型。",
        "worldbuilding_note": f"這句偏向「{person_label}」的演義/整理型補充素材，適合世界觀用途，審核時先分清楚它不是正史硬證。",
    }.get(angle_type, f"這句是在補「{person_label}」的 {angle_label_zh_tw(angle_type)} 線索。")

    caution_parts: list[str] = []
    if "、" in quote or quote.count("，") >= 2:
        caution_parts.append("這句同時提到多人，審核時要先確認真正掛到誰身上。")
    if len(quote) >= 80:
        caution_parts.append("句子偏長，建議先看前半句主語，再看後半句補述。")
    if source_layer == "romance":
        caution_parts.append("這是演義層資料，可用來補世界觀，但不要直接當成 A-history。")
    elif source_layer == "worldbuilding":
        caution_parts.append("這是整理/世界觀層資料，適合 seed 或 B 級旁證。")
    else:
        caution_parts.append(f"目前歸在 {layer_label}，可優先當成嚴格交叉驗證的候選。")
    if row.get("relationshipSubjectHint") and row.get("relationshipObjectHint") and row.get("relationshipAnchorLabel"):
        caution_parts.append(
            f"目前降噪器暫判主客體為「{row['relationshipSubjectHint']} -> {row['relationshipObjectHint']}」，關係詞是「{row['relationshipAnchorLabel']}」。"
        )
    if row.get("relationshipLegalityPassed") is False:
        caution_parts.append(
            f"此句未通過合法關係組合檢查（{row.get('relationshipLegalityReason') or 'unknown'}），建議只做人工參考不自動升級。"
        )
    if person_label.startswith("子") or person_label in {"王立", "子桓", "子孝"}:
        caution_parts.append("這個名字像字號或泛稱，審核時要特別確認不是誤掛到別的歷史人物。")
    return f"{base} {' '.join(caution_parts)}".strip()


def body_example_quality(row: dict[str, Any]) -> tuple[float, float]:
    person_label = str(row.get("matchedName") or row.get("personId") or "").strip()
    person_id = str(row.get("personId") or "").strip()
    quote = str(row.get("quote") or "")
    score = float(row.get("seedConfidenceScore") or 0.0)
    if person_id.startswith("romance-person-"):
        score -= 20.0
    if person_label.startswith("子") or person_label in {"王立", "子桓", "子孝"}:
        score -= 18.0
    if re.match(r"^\d+\s", quote):
        score -= 8.0
    if len(person_label) >= 3:
        score += 6.0
    if 20 <= len(quote) <= 80:
        score += 3.0
    if any(token in quote for token in ("字", "妻", "女", "殺", "攻", "嫁", "娶", "官", "將軍")):
        score += 2.0
    return score, float(row.get("seedConfidenceScore") or 0.0)


def body_text_examples(ranking_summary: dict[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    ranked = ranking_summary.get("rankedSeeds") if isinstance(ranking_summary, dict) else []
    if not isinstance(ranked, list):
        return []
    candidates: list[dict[str, Any]] = []
    for row in ranked:
        if not isinstance(row, dict):
            continue
        if str(row.get("contentSource") or "") != "page-text":
            continue
        candidate = {
            "personId": str(row.get("generalId") or row.get("candidatePersonId") or "").strip(),
            "matchedName": str(row.get("matchedName") or row.get("generalId") or row.get("candidatePersonId") or "").strip(),
            "angleType": str(row.get("angleType") or "").strip(),
            "angleLabelZhTw": angle_label_zh_tw(str(row.get("angleType") or "").strip()),
            "seedConfidenceScore": float(row.get("seedConfidenceScore") or 0.0),
            "pageTitle": row.get("pageTitle"),
            "sourceUrl": row.get("sourceUrl"),
            "locator": row.get("locator"),
            "quote": row.get("translatedTraditionalText") or row.get("quote") or row.get("seedText"),
            "originalQuote": row.get("quote") or row.get("seedText"),
            "sourceLayer": row.get("sourceLayer"),
            "relationshipSubjectHint": row.get("relationshipSubjectHint"),
            "relationshipObjectHint": row.get("relationshipObjectHint"),
            "relationshipAnchorLabel": row.get("relationshipAnchorLabel"),
            "relationshipLegalityPassed": row.get("relationshipLegalityPassed"),
            "relationshipLegalityReason": row.get("relationshipLegalityReason"),
        }
        candidate["reviewSummaryZhTw"] = build_review_summary_zh_tw(candidate)
        candidates.append(candidate)
    candidates.sort(key=body_example_quality, reverse=True)
    examples: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for candidate in candidates:
        dedupe_key = (
            str(candidate.get("personId") or ""),
            str(candidate.get("angleType") or ""),
            str(candidate.get("quote") or ""),
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        examples.append(candidate)
        if len(examples) >= limit:
            break
    return examples


def detect_charset_from_bytes(content_type: str, content: bytes) -> str:
    header_match = re.search(r"charset\s*=\s*[\"']?([a-zA-Z0-9._-]+)", str(content_type or ""), flags=re.I)
    if header_match:
        value = header_match.group(1).strip().lower()
        if value == "utf8":
            return "utf-8"
        if value in {"gb2312", "gb_2312-80", "gb18030"}:
            return "gbk"
        return value
    probe = content[:2048].decode("ascii", errors="ignore")
    meta_match = re.search(r"charset\s*=\s*[\"']?\s*([a-zA-Z0-9._-]+)", probe, flags=re.I)
    if meta_match:
        value = meta_match.group(1).strip().lower()
        if value == "utf8":
            return "utf-8"
        if value in {"gb2312", "gb_2312-80", "gb18030"}:
            return "gbk"
        return value
    return "utf-8"


def strip_html_to_text(raw_html: str) -> str:
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", raw_html)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p\s*>", "\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_title_from_html(raw_html: str) -> str:
    match = re.search(r"(?is)<title[^>]*>(.*?)</title>", raw_html)
    if not match:
        return ""
    return strip_html_to_text(match.group(1))[:180]


def normalize_term_hit_keywords(raw_keywords: Any) -> list[str]:
    if isinstance(raw_keywords, str):
        values = [raw_keywords]
    elif isinstance(raw_keywords, list):
        values = [str(value or "") for value in raw_keywords]
    else:
        values = list(DEFAULT_TERM_HIT_KEYWORDS)
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        token = str(value or "").strip()
        if not token or token in seen:
            continue
        seen.add(token)
        normalized.append(token)
    return normalized or list(DEFAULT_TERM_HIT_KEYWORDS)


def count_term_hits(text: str, term_hit_keywords: list[str] | None = None) -> int:
    patterns = term_hit_keywords or list(DEFAULT_TERM_HIT_KEYWORDS)
    return sum(text.count(pattern) for pattern in patterns)


def normalize_request_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            quote(parts.path, safe="/%"),
            quote(parts.query, safe="=&%"),
            quote(parts.fragment, safe="%"),
        )
    )


def harvest_single_page(
    *,
    source_id: str,
    source_url: str,
    run_root: Path,
    timeout_seconds: float,
    term_hit_keywords: list[str] | None = None,
) -> dict[str, Any]:
    harvest_root = run_root / "harvest"
    harvest_root.mkdir(parents=True, exist_ok=True)
    request_url = normalize_request_url(source_url)
    request = Request(
        request_url,
        headers={
            "User-Agent": "Mozilla/5.0 (3KLife Single Page Benchmark Harvester)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urlopen(request, timeout=max(timeout_seconds, 1.0)) as response:
        content = response.read()
        content_type = str(response.headers.get("Content-Type") or "")
        charset = detect_charset_from_bytes(content_type, content)
        raw_html = content.decode(charset, errors="ignore")
        title = extract_title_from_html(raw_html)
        plain_text = strip_html_to_text(raw_html)
        text_hash = f"sha256:{stable_sha256_short(plain_text)}"
    page_text_dir = harvest_root / "page-texts"
    page_text_dir.mkdir(parents=True, exist_ok=True)
    page_text_path = page_text_dir / f"0001-{stable_sha256_short(source_url)}.txt"
    page_text_path.write_text(
        "\n".join(
            [
                f"sourceId: {source_id}",
                f"url: {source_url}",
                f"title: {title}",
                f"textHash: {text_hash}",
                "canonicalWrites: false",
                "",
                plain_text,
                "",
            ]
        ),
        encoding="utf-8",
    )
    hit_count = count_term_hits(plain_text, term_hit_keywords)
    page_row = {
        "pageId": f"page:{source_id}:{stable_sha256_short(source_url)}",
        "sourceId": source_id,
        "url": source_url,
        "discoveredFrom": source_url,
        "pageIndex": 1,
        "httpStatus": 200,
        "liveStatus": "ok",
        "contentType": content_type,
        "charset": charset,
        "bytesRead": len(content),
        "title": title,
        "termHitCount": hit_count,
        "relevanceLevel": "likely-relevant" if hit_count >= 3 else "possible-relevant",
        "textHash": text_hash,
        "textPath": str(page_text_path.resolve()),
        "snippet": plain_text[:800],
        "textLength": len(plain_text),
        "canonicalWrites": False,
    }
    pages_jsonl = harvest_root / "pages.jsonl"
    pages_jsonl.write_text(json.dumps(page_row, ensure_ascii=False) + "\n", encoding="utf-8")
    errors_jsonl = harvest_root / "fetch-errors.jsonl"
    errors_jsonl.write_text("", encoding="utf-8")
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "single-page-harvest",
        "sourceId": source_id,
        "canonicalWrites": False,
        "metrics": {
            "discoveredLinkCount": 1,
            "selectedLinkCount": 1,
            "fetchedPageCount": 1,
            "relevantPageCount": 1 if page_row["termHitCount"] > 0 else 0,
            "errorCount": 0,
        },
        "outputs": {
            "pagesJsonl": str(pages_jsonl.resolve()),
            "errorsJsonl": str(errors_jsonl.resolve()),
            "summaryJson": str((harvest_root / "harvest-summary.json").resolve()),
            "summaryMarkdown": str((harvest_root / "harvest-summary.zh-TW.md").resolve()),
            "pageTextDir": str(page_text_dir.resolve()),
        },
        "samplePages": [
            {
                "title": title,
                "url": source_url,
                "termHitCount": page_row["termHitCount"],
            }
        ],
    }
    write_json(harvest_root / "harvest-summary.json", summary)
    (harvest_root / "harvest-summary.zh-TW.md").write_text(
        "\n".join(
            [
                "# Single Page Harvest Summary",
                "",
                f"- Source: `{source_id}`",
                f"- URL: `{source_url}`",
                f"- Title: {title}",
                f"- Term Hit Count: `{page_row['termHitCount']}`",
                f"- canonicalWrites: `{False}`",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return summary


def stable_sha256_short(text: str, length: int = 16) -> str:
    import hashlib

    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def harvest_single_page_via_harvester(
    *,
    source_id: str,
    source_url: str,
    run_root: Path,
    timeout_seconds: float,
    source_config_path: Path,
    harvester_cli: Path,
    term_hit_keywords: list[str] | None = None,
) -> dict[str, Any]:
    harvest_root = run_root / "harvest"
    command = [
        "node",
        str(harvester_cli),
        "--source-id",
        source_id,
        "--index-url",
        source_url,
        "--max-pages",
        "1",
        "--concurrency",
        "1",
        "--timeout-seconds",
        str(max(timeout_seconds, 1.0)),
        "--sources-config",
        str(source_config_path),
        "--output-root",
        str(harvest_root),
        "--include-index-page",
        "--same-origin",
        "--json",
    ]
    for keyword in term_hit_keywords or []:
        command.extend(["--term-hit-keyword", str(keyword)])
    return run_json_command(command)


def harvest_source(
    *,
    source_id: str,
    source_url: str,
    source_row: dict[str, Any] | None,
    source_config_path: Path,
    args: argparse.Namespace,
    harvester_cli: Path,
    run_root: Path,
) -> tuple[dict[str, Any] | None, list[str]]:
    harvest_policy = (source_row or {}).get("harvestPolicy") or {}
    if not harvest_policy:
        single_page_policy = (source_row or {}).get("singlePagePolicy") or {}
        if single_page_policy:
            try:
                return (
                    harvest_single_page_via_harvester(
                        source_id=source_id,
                        source_url=source_url,
                        run_root=run_root,
                        timeout_seconds=args.timeout_seconds,
                        source_config_path=source_config_path,
                        harvester_cli=harvester_cli,
                        term_hit_keywords=normalize_term_hit_keywords((source_row or {}).get("termHitKeywords")),
                    ),
                    [],
                )
            except Exception:
                return (
                    harvest_single_page(
                        source_id=source_id,
                        source_url=source_url,
                        run_root=run_root,
                        timeout_seconds=args.timeout_seconds,
                        term_hit_keywords=normalize_term_hit_keywords((source_row or {}).get("termHitKeywords")),
                    ),
                    [],
                )
        return None, ["missing-harvestPolicy-or-singlePagePolicy"]
    link_include = args.link_include or list(harvest_policy.get("linkInclude") or [])
    link_exclude = list(harvest_policy.get("linkExclude") or [])
    same_origin = bool(args.same_origin or harvest_policy.get("sameOrigin"))
    link_extraction_mode = str(harvest_policy.get("linkExtractionMode") or "").strip()
    table_class_contains = str(harvest_policy.get("tableClassContains") or "").strip()
    api_url = str(harvest_policy.get("apiUrl") or "").strip()
    api_method = str(harvest_policy.get("apiMethod") or "").strip()
    api_list_path = str(harvest_policy.get("apiListPath") or "").strip()
    api_url_field = str(harvest_policy.get("apiUrlField") or "").strip()
    api_title_field = str(harvest_policy.get("apiTitleField") or "").strip()
    api_snippet_field = str(harvest_policy.get("apiSnippetField") or "").strip()
    api_people_field = str(harvest_policy.get("apiPeopleField") or "").strip()
    api_headers = harvest_policy.get("apiHeaders") if isinstance(harvest_policy.get("apiHeaders"), dict) else {}
    api_body_template = harvest_policy.get("apiBodyTemplate")
    api_start_page = harvest_policy.get("apiStartPage")
    api_max_index_pages = harvest_policy.get("apiMaxIndexPages")
    table_column_index: int | None = None
    if harvest_policy.get("tableColumnIndex") is not None:
        try:
            table_column_index = max(0, int(harvest_policy.get("tableColumnIndex")))
        except (TypeError, ValueError):
            table_column_index = None
    max_pages = max(1, int(args.sample_size))
    policy_max_pages_raw = harvest_policy.get("maxPages")
    if policy_max_pages_raw is not None:
        try:
            policy_max_pages = max(1, int(policy_max_pages_raw))
            max_pages = min(max_pages, policy_max_pages)
        except (TypeError, ValueError):
            pass
    harvest_root = run_root / "harvest"
    command = [
        "node",
        str(harvester_cli),
        "--source-id",
        source_id,
        "--index-url",
        str(harvest_policy.get("indexUrl") or source_url),
        "--max-pages",
        str(max_pages),
        "--concurrency",
        str(max(1, int(args.concurrency))),
        "--timeout-seconds",
        str(max(args.timeout_seconds, 1.0)),
        "--sources-config",
        str(source_config_path),
        "--output-root",
        str(harvest_root),
        "--json",
    ]
    for keyword in normalize_term_hit_keywords((source_row or {}).get("termHitKeywords")):
        command.extend(["--term-hit-keyword", str(keyword)])
    for pattern in link_include:
        command.extend(["--link-include", str(pattern)])
    for pattern in link_exclude:
        command.extend(["--link-exclude", str(pattern)])
    if link_extraction_mode:
        command.extend(["--link-extraction-mode", link_extraction_mode])
    if table_class_contains:
        command.extend(["--table-class-contains", table_class_contains])
    if table_column_index is not None:
        command.extend(["--table-column-index", str(table_column_index)])
    if api_url:
        command.extend(["--api-url", api_url])
    if api_method:
        command.extend(["--api-method", api_method])
    if api_headers:
        command.extend(["--api-headers-json", json.dumps(api_headers, ensure_ascii=False)])
    if api_body_template is not None:
        command.extend(["--api-body-template", json.dumps(api_body_template, ensure_ascii=False)])
    if api_list_path:
        command.extend(["--api-list-path", api_list_path])
    if api_url_field:
        command.extend(["--api-url-field", api_url_field])
    if api_title_field:
        command.extend(["--api-title-field", api_title_field])
    if api_snippet_field:
        command.extend(["--api-snippet-field", api_snippet_field])
    if api_people_field:
        command.extend(["--api-people-field", api_people_field])
    if api_start_page is not None:
        command.extend(["--api-start-page", str(api_start_page)])
    if api_max_index_pages is not None:
        command.extend(["--api-max-index-pages", str(api_max_index_pages)])
    if same_origin:
        command.append("--same-origin")
    return run_json_command(command), []


def evaluate_stage2(harvest_summary: dict[str, Any], gate_policy: dict[str, float]) -> tuple[dict[str, Any], list[str]]:
    discovered = int(((harvest_summary.get("metrics") or {}).get("discoveredLinkCount") or 0))
    selected = int(((harvest_summary.get("metrics") or {}).get("selectedLinkCount") or 0))
    fetched = int(((harvest_summary.get("metrics") or {}).get("fetchedPageCount") or 0))
    relevant = int(((harvest_summary.get("metrics") or {}).get("relevantPageCount") or 0))
    errors = int(((harvest_summary.get("metrics") or {}).get("errorCount") or 0))
    metrics = {
        "samplePageCount": selected,
        "fetchedPageCount": fetched,
        "relevantPageCount": relevant,
        "fetchSuccessRate": bool_ratio(fetched, max(selected, 1)),
        "relevantPageRate": bool_ratio(relevant, max(fetched, 1)),
        "errorRate": bool_ratio(errors, max(selected, 1)),
        "duplicateLinkRate": duplicate_link_rate(discovered, selected),
        "outputs": harvest_summary.get("outputs") or {},
    }
    reasons: list[str] = []
    fetch_success_rate_min = to_float(gate_policy.get("fetchSuccessRateMin"), float(DEFAULT_STAGE2_GATE_POLICY["fetchSuccessRateMin"]))
    relevant_page_rate_min = to_float(gate_policy.get("relevantPageRateMin"), float(DEFAULT_STAGE2_GATE_POLICY["relevantPageRateMin"]))
    error_rate_max = to_float(gate_policy.get("errorRateMax"), float(DEFAULT_STAGE2_GATE_POLICY["errorRateMax"]))
    duplicate_link_rate_max = to_float(gate_policy.get("duplicateLinkRateMax"), float(DEFAULT_STAGE2_GATE_POLICY["duplicateLinkRateMax"]))
    if metrics["fetchSuccessRate"] < fetch_success_rate_min:
        reasons.append(f"fetchSuccessRate<{fetch_success_rate_min:.2f}")
    if metrics["relevantPageRate"] < relevant_page_rate_min:
        reasons.append(f"relevantPageRate<{relevant_page_rate_min:.2f}")
    if metrics["errorRate"] > error_rate_max:
        reasons.append(f"errorRate>{error_rate_max:.2f}")
    if metrics["duplicateLinkRate"] > duplicate_link_rate_max:
        reasons.append(f"duplicateLinkRate>{duplicate_link_rate_max:.2f}")
    return metrics, reasons


def run_seed_pipeline(
    *,
    source_id: str,
    source_class: str,
    run_root: Path,
    harvest_root: Path,
    source_config_path: Path,
    alias_map_path: Path,
    scoreboard_path: Path,
    single_source_health_path: Path,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    extracted_root = run_root / "extracted-seeds"
    standard_root = run_root / "standard-pipeline"
    extractor_path = resolve_path(
        DEFAULT_BIOGRAPHY_EXTRACTOR if source_class == "high-yield-character-site" else DEFAULT_GENERIC_EXTRACTOR
    )
    extractor_command = [
        sys.executable,
        str(extractor_path),
        "--source-id",
        source_id,
        "--pages-jsonl",
        str(harvest_root / "pages.jsonl"),
        "--source-config",
        str(source_config_path),
        "--alias-map",
        str(alias_map_path),
        "--scoreboard-json",
        str(scoreboard_path),
        "--output-root",
        str(extracted_root),
        "--overwrite",
    ]
    if source_class != "high-yield-character-site":
        extractor_command.extend(["--source-class", source_class])
    run_command(extractor_command)
    extract_summary = read_json(extracted_root / "manual-evidence-seeds-summary.json")

    run_command(
        [
            sys.executable,
            str(resolve_path(DEFAULT_SEED_HARVESTER)),
            "--no-default-external-evidence-cards",
            "--manual-seeds-jsonl",
            str(extracted_root / "manual-evidence-seeds.jsonl"),
            "--scoreboard-json",
            str(scoreboard_path),
            "--source-health-summary",
            str(single_source_health_path),
            "--output-root",
            str(standard_root),
            "--overwrite",
        ]
    )
    run_command(
        [
            sys.executable,
            str(resolve_path(DEFAULT_SEED_SCORER)),
            "--seeds-jsonl",
            str(standard_root / "external-evidence-seeds.jsonl"),
            "--output-root",
            str(standard_root),
            "--overwrite",
        ]
    )
    run_command(
        [
            sys.executable,
            str(resolve_path(DEFAULT_SEED_PROMOTER)),
            "--ranking-json",
            str(standard_root / "external-evidence-seed-ranking.json"),
            "--output-root",
            str(standard_root),
            "--overwrite",
        ]
    )
    ranking_summary = read_json(standard_root / "external-evidence-seed-ranking.json")
    candidate_summary = read_json(standard_root / "candidate-evidence-card-summary.json")
    return extract_summary, ranking_summary, candidate_summary


def stage3_metrics_common(
    *,
    extract_summary: dict[str, Any],
    ranking_summary: dict[str, Any],
    candidate_summary: dict[str, Any],
    fetched_pages: int,
    run_root: Path,
) -> dict[str, Any]:
    extract_metrics = extract_summary.get("metrics") or {}
    ranking_metrics = ranking_summary.get("metrics") or {}
    candidate_metrics = candidate_summary.get("metrics") or {}
    page_count = int(extract_metrics.get("pageCount") or 0)
    seed_count = int(ranking_metrics.get("seedCount") or 0)
    candidate_count = int(candidate_metrics.get("candidateCardCount") or 0)
    preview_count = int(ranking_metrics.get("previewCount") or 0)
    canonical_people = int(extract_metrics.get("uniqueCanonicalGeneralCount") or 0)
    shadow_people = int(extract_metrics.get("uniqueShadowPersonCount") or 0)
    canonical_match_page_count = int(extract_metrics.get("matchedCanonicalPageCount") or 0)
    claim_bearing_passages = int(extract_metrics.get("claimBearingPassageCount") or 0)
    quote_locator_hash_coverage = float(extract_metrics.get("quoteLocatorHashCoverage") or 0.0)
    return {
        "seedCount": seed_count,
        "candidateCardCount": candidate_count,
        "previewCount": preview_count,
        "canonicalPeople": canonical_people,
        "shadowPeople": shadow_people,
        "seedPerPage": bool_ratio(seed_count, max(fetched_pages, 1)),
        "candidateCardPerPage": bool_ratio(candidate_count, max(fetched_pages, 1)),
        "canonicalMatchPageRate": bool_ratio(canonical_match_page_count, max(page_count, 1)),
        "pageTextSeedCount": int(extract_metrics.get("pageTextSeedCount") or 0),
        "claimBearingPassageCount": claim_bearing_passages,
        "quoteLocatorHashCoverage": quote_locator_hash_coverage,
        "outputs": {
            "extractSummary": repo_relative(run_root / "extracted-seeds" / "manual-evidence-seeds-summary.json"),
            "rankingJson": repo_relative(run_root / "standard-pipeline" / "external-evidence-seed-ranking.json"),
            "candidateSummary": repo_relative(run_root / "standard-pipeline" / "candidate-evidence-card-summary.json"),
        },
    }


def evaluate_stage3(source_class: str, metrics: dict[str, Any], gate_policy: dict[str, float]) -> list[str]:
    reasons: list[str] = []
    if source_class == "high-yield-character-site":
        seed_per_page_min = to_float(gate_policy.get("seedPerPageMin"), 1.0)
        candidate_card_per_page_min = to_float(gate_policy.get("candidateCardPerPageMin"), 0.40)
        canonical_match_page_rate_min = to_float(gate_policy.get("canonicalMatchPageRateMin"), 0.40)
        shadow_people_min = to_int(gate_policy.get("shadowPeopleMin"), 15)
        if metrics["seedPerPage"] < seed_per_page_min:
            reasons.append(f"seedPerPage<{seed_per_page_min:.2f}")
        if metrics["candidateCardPerPage"] < candidate_card_per_page_min:
            reasons.append(f"candidateCardPerPage<{candidate_card_per_page_min:.2f}")
        if metrics["canonicalMatchPageRate"] < canonical_match_page_rate_min and metrics["shadowPeople"] < shadow_people_min:
            reasons.append(
                f"canonicalMatchPageRate<{canonical_match_page_rate_min:.2f} and shadowPeople<{shadow_people_min}"
            )
        return reasons
    if source_class == "primary-text-site":
        quote_locator_hash_coverage_min = to_float(gate_policy.get("quoteLocatorHashCoverageMin"), 0.90)
        claim_bearing_passage_count_min = to_int(gate_policy.get("claimBearingPassageCountMin"), 20)
        if metrics["quoteLocatorHashCoverage"] < quote_locator_hash_coverage_min:
            reasons.append(f"quoteLocatorHashCoverage<{quote_locator_hash_coverage_min:.2f}")
        if metrics["claimBearingPassageCount"] < claim_bearing_passage_count_min:
            reasons.append(f"claimBearingPassageCount<{claim_bearing_passage_count_min}")
        return reasons
    if source_class == "community-worldbuilding-site":
        seed_per_page_min = to_float(gate_policy.get("seedPerPageMin"), 0.80)
        candidate_card_per_page_min = to_float(gate_policy.get("candidateCardPerPageMin"), 0.20)
        page_text_seed_count_min = to_int(gate_policy.get("pageTextSeedCountMin"), 1)
        claim_bearing_passage_count_min = to_int(gate_policy.get("claimBearingPassageCountMin"), 1)
        if metrics["seedPerPage"] < seed_per_page_min:
            reasons.append(f"seedPerPage<{seed_per_page_min:.2f}")
        if metrics["candidateCardPerPage"] < candidate_card_per_page_min:
            reasons.append(f"candidateCardPerPage<{candidate_card_per_page_min:.2f}")
        if metrics["pageTextSeedCount"] < page_text_seed_count_min:
            reasons.append(f"pageTextSeedCount<{page_text_seed_count_min}")
        if metrics["claimBearingPassageCount"] < claim_bearing_passage_count_min:
            reasons.append(f"claimBearingPassageCount<{claim_bearing_passage_count_min}")
        return reasons
    return ["unsupported-sourceClass"]


def render_markdown(summary: dict[str, Any]) -> str:
    precheck = summary["stage1Precheck"]
    policy_block = summary.get("policies") or {}
    precheck_policy = policy_block.get("precheckPolicy") or {}
    stage2_policy = policy_block.get("stage2GatePolicy") or {}
    stage3_policy = policy_block.get("stage3GatePolicy") or {}
    harvest = summary.get("stage2Harvest") or {}
    yield_stage = summary.get("stage3Yield") or {}
    lines = [
        "# 外部網站採證 Benchmark",
        "",
        f"- Source: `{summary['sourceId']}`",
        f"- Source Class: `{summary['sourceClass']}`",
        f"- URL: {summary['url']}",
        f"- Final Verdict: `{summary['finalVerdict']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        "",
        "## Stage 1 Precheck",
        "",
        f"- HTTP Status: `{precheck.get('httpStatus')}`",
        f"- termHitCount: `{precheck.get('termHitCount')}`",
        (
            f"- Precheck Policy: `likely={precheck_policy.get('likelyThreshold')} / "
            f"possible={precheck_policy.get('possibleThreshold')} / minHit={precheck_policy.get('minimumTermHitCount')}`"
        ),
        f"- Stage 1 Passed: `{summary['stage1Passed']}`",
        f"- Failure Reasons: `{', '.join(summary['stage1FailureReasons']) or 'none'}`",
        "",
    ]
    if harvest:
        lines.extend(
            [
                "## Stage 2 Harvest",
                "",
                f"- Selected Pages: `{harvest.get('samplePageCount')}`",
                f"- Fetched Pages: `{harvest.get('fetchedPageCount')}`",
                f"- Relevant Page Rate: `{harvest.get('relevantPageRate', 0.0):.2%}`",
                f"- Fetch Success Rate: `{harvest.get('fetchSuccessRate', 0.0):.2%}`",
                f"- Duplicate Link Rate: `{harvest.get('duplicateLinkRate', 0.0):.2%}`",
                f"- Stage 2 Passed: `{summary.get('stage2Passed')}`",
                f"- Failure Reasons: `{', '.join(summary.get('stage2FailureReasons') or []) or 'none'}`",
                (
                    f"- Stage 2 Policy: `success>={stage2_policy.get('fetchSuccessRateMin')} / "
                    f"relevant>={stage2_policy.get('relevantPageRateMin')} / "
                    f"error<={stage2_policy.get('errorRateMax')} / dup<={stage2_policy.get('duplicateLinkRateMax')}`"
                ),
                "",
            ]
        )
    if yield_stage:
        lines.extend(
            [
                "## Stage 3 Yield",
                "",
                f"- Seed Count: `{yield_stage.get('seedCount')}`",
                f"- Candidate Card Count: `{yield_stage.get('candidateCardCount')}`",
                f"- Preview Count: `{yield_stage.get('previewCount')}`",
                f"- Canonical People: `{yield_stage.get('canonicalPeople')}`",
                f"- Shadow People: `{yield_stage.get('shadowPeople')}`",
                f"- Seed / Page: `{yield_stage.get('seedPerPage', 0.0):.2f}`",
                f"- Candidate Card / Page: `{yield_stage.get('candidateCardPerPage', 0.0):.2f}`",
                f"- Canonical Match Page Rate: `{yield_stage.get('canonicalMatchPageRate', 0.0):.2%}`",
                f"- Claim-bearing Passages: `{yield_stage.get('claimBearingPassageCount', 0)}`",
                f"- Quote/Locator/Hash Coverage: `{yield_stage.get('quoteLocatorHashCoverage', 0.0):.2%}`",
                f"- Stage 3 Passed: `{summary.get('stage3Passed')}`",
                f"- Failure Reasons: `{', '.join(summary.get('stage3FailureReasons') or []) or 'none'}`",
                f"- Stage 3 Policy: `{json.dumps(stage3_policy, ensure_ascii=False)}`",
                "",
                "## 內文採樣例",
                "",
                "| Person | Angle | Score | Quote | 中文審核摘要 |",
                "| --- | --- | ---: | --- | --- |",
            ]
        )
        examples = summary.get("bodyTextExamples") or []
        if examples:
            for row in examples:
                quote = str(row.get("quote") or "").replace("\n", " ").replace("|", "\\|")
                if len(quote) > 110:
                    quote = quote[:107] + "..."
                review_summary = str(row.get("reviewSummaryZhTw") or "").replace("\n", " ").replace("|", "\\|")
                if len(review_summary) > 120:
                    review_summary = review_summary[:117] + "..."
                lines.append(
                    f"| `{row['personId']}` | `{row['angleLabelZhTw']}` | {float(row['seedConfidenceScore']):.2f} | {quote} | {review_summary} |"
                )
        else:
            lines.append("| _none_ | _none_ | 0.00 | no page-text seeds | 無正文 seed |")
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark one external evidence source through deterministic three-stage gates.")
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--url", default=None)
    parser.add_argument("--source-class", choices=SOURCE_CLASSES, default=None)
    parser.add_argument("--sample-size", type=int, default=30)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--alias-map", default=str(DEFAULT_ALIAS_MAP))
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON))
    parser.add_argument("--source-health-cli", default=str(DEFAULT_SOURCE_HEALTH_CLI))
    parser.add_argument("--harvester-cli", default=str(DEFAULT_HARVESTER_CLI))
    parser.add_argument("--timeout-seconds", type=float, default=20.0)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--link-include", action="append", default=[])
    parser.add_argument("--same-origin", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_config_path = resolve_path(args.source_config)
    source_config_payload = read_json(source_config_path)
    if not isinstance(source_config_payload, dict):
        source_config_payload = {}
    source_row = load_source_row_from_payload(source_config_payload, args.source_id)
    source_class = args.source_class or infer_source_class(source_row)
    source_url = str(args.url or (source_row or {}).get("baseUrl") or "").strip()
    if not source_url:
        raise SystemExit("source url is required when sourceId is not found or has no baseUrl")
    if source_class not in SOURCE_CLASSES:
        raise SystemExit(f"unsupported sourceClass: {source_class}")
    precheck_policy = resolve_precheck_policy(
        source_class=source_class,
        source_row=source_row,
        source_config_payload=source_config_payload,
    )
    stage2_gate_policy = resolve_stage2_gate_policy(
        source_class=source_class,
        source_row=source_row,
        source_config_payload=source_config_payload,
    )
    stage3_gate_policy = resolve_stage3_gate_policy(
        source_class=source_class,
        source_row=source_row,
        source_config_payload=source_config_payload,
    )

    run_id = args.run_id or f"benchmark-{args.source_id}-{utc_stamp()}"
    run_root = resolve_path(args.output_root) / run_id
    if run_root.exists() and any(run_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output already exists: {repo_relative(run_root)}")
    run_root.mkdir(parents=True, exist_ok=True)

    source_health_cli = resolve_path(args.source_health_cli)
    harvester_cli = resolve_path(args.harvester_cli)
    alias_map_path = resolve_existing_path(args.alias_map)
    scoreboard_path = resolve_existing_path(args.scoreboard_json)
    single_source_health_path = run_root / "single-source-health-summary.json"
    benchmark_summary_path = run_root / "benchmark-summary.json"
    benchmark_markdown_path = run_root / "benchmark-summary.zh-TW.md"

    precheck_payload, stage1_reasons, stage1_passed = stage1_precheck(
        source_id=args.source_id,
        url=source_url,
        timeout_seconds=args.timeout_seconds,
        source_health_cli=source_health_cli,
        source_config_path=source_config_path,
        source_row=source_row,
        precheck_policy=precheck_policy,
    )
    write_single_source_health_summary(single_source_health_path, args.source_id, source_url, source_class, precheck_payload)

    stage2_reasons: list[str] = []
    stage3_reasons: list[str] = []
    harvest_summary: dict[str, Any] | None = None
    stage2_metrics: dict[str, Any] | None = None
    extract_summary: dict[str, Any] | None = None
    ranking_summary: dict[str, Any] | None = None
    candidate_summary: dict[str, Any] | None = None
    stage3_metrics: dict[str, Any] | None = None
    final_verdict = "reject"

    if stage1_passed:
        harvest_summary, stage2_reasons = harvest_source(
            source_id=args.source_id,
            source_url=source_url,
            source_row=source_row,
            source_config_path=source_config_path,
            args=args,
            harvester_cli=harvester_cli,
            run_root=run_root,
        )
        if harvest_summary:
            stage2_metrics, auto_stage2_reasons = evaluate_stage2(harvest_summary, gate_policy=stage2_gate_policy)
            stage2_reasons.extend(auto_stage2_reasons)

    if stage1_passed and harvest_summary and not stage2_reasons:
        extract_summary, ranking_summary, candidate_summary = run_seed_pipeline(
            source_id=args.source_id,
            source_class=source_class,
            run_root=run_root,
            harvest_root=run_root / "harvest",
            source_config_path=source_config_path,
            alias_map_path=alias_map_path,
            scoreboard_path=scoreboard_path,
            single_source_health_path=single_source_health_path,
        )
        fetched_pages = int(((harvest_summary.get("metrics") or {}).get("fetchedPageCount") or 0))
        stage3_metrics = stage3_metrics_common(
            extract_summary=extract_summary,
            ranking_summary=ranking_summary,
            candidate_summary=candidate_summary,
            fetched_pages=fetched_pages,
            run_root=run_root,
        )
        stage3_reasons = evaluate_stage3(source_class, stage3_metrics, gate_policy=stage3_gate_policy)
        final_verdict = "approve" if not stage3_reasons else "reject"
    elif stage1_passed and stage2_reasons == ["missing-harvestPolicy-or-singlePagePolicy"]:
        final_verdict = "manual-only"

    body_examples = body_text_examples(ranking_summary or {}, limit=8)
    angle_counts = gather_angle_counts((ranking_summary or {}).get("rankedSeeds") or [])
    summary = {
        "version": "2.0.0",
        "generatedAt": utc_now(),
        "mode": "external-source-benchmark",
        "sourceId": args.source_id,
        "sourceClass": source_class,
        "url": source_url,
        "canonicalWrites": False,
        "runId": run_id,
        "paths": {
            "runRoot": repo_relative(run_root),
            "singleSourceHealthSummary": repo_relative(single_source_health_path),
        },
        "policies": {
            "precheckPolicy": precheck_policy,
            "stage2GatePolicy": stage2_gate_policy,
            "stage3GatePolicy": stage3_gate_policy,
        },
        "stage1Precheck": precheck_payload,
        "stage1Passed": stage1_passed,
        "stage1FailureReasons": stage1_reasons,
        "stage2Harvest": stage2_metrics,
        "stage2Passed": (not stage2_reasons) if stage2_metrics else None,
        "stage2FailureReasons": stage2_reasons,
        "stage3Yield": stage3_metrics,
        "stage3Passed": (not stage3_reasons) if stage3_metrics else None,
        "stage3FailureReasons": stage3_reasons,
        "angleCounts": angle_counts,
        "bodyTextExamples": body_examples,
        "finalVerdict": final_verdict,
    }
    write_json(benchmark_summary_path, summary)
    benchmark_markdown_path.write_text(render_markdown(summary), encoding="utf-8")
    sys.stdout.buffer.write((json.dumps(summary, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
