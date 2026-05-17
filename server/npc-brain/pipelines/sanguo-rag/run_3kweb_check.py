from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root
from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_three_kweb_check_cue_rules,
    load_three_kweb_check_runner_policy,
)

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCES_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_SCOREBOARD_JSON = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard/full-roster-scoreboard.json")
DEFAULT_SOURCE_HEALTH_CLI = Path("tools_node/agent-clis/3klife-source-health.js")

DEFAULT_TERM_HIT_KEYWORDS: tuple[str, ...] = ()
DEFAULT_PRECHECK_POLICY: dict[str, Any] = {}
THREE_KWEB_CHECK_RUNNER_POLICY: dict[str, Any] = {}


def _three_kweb_section(name: str) -> dict[str, Any]:
    section = THREE_KWEB_CHECK_RUNNER_POLICY.get(name)
    return section if isinstance(section, dict) else {}


def _three_kweb_path_arg(cli_value: str | None, section: dict[str, Any], key: str, fallback: str | Path) -> str:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or str(fallback)


def _three_kweb_text_arg(cli_value: str | None, section: dict[str, Any], key: str, fallback: str) -> str:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or fallback


def _three_kweb_float_arg(cli_value: float | None, section: dict[str, Any], key: str, fallback: float) -> float:
    if cli_value is not None:
        return float(cli_value)
    try:
        return float(section.get(key, fallback))
    except (TypeError, ValueError):
        return float(fallback)


def _three_kweb_int_arg(cli_value: int | None, section: dict[str, Any], key: str, fallback: int) -> int:
    if cli_value is not None:
        return int(cli_value)
    try:
        return int(section.get(key, fallback))
    except (TypeError, ValueError):
        return int(fallback)


def apply_three_kweb_check_governance(policy: dict[str, Any], cue_rules: list[dict[str, Any]]) -> None:
    global THREE_KWEB_CHECK_RUNNER_POLICY, DEFAULT_OUTPUT_ROOT, DEFAULT_SOURCES_CONFIG, DEFAULT_SCOREBOARD_JSON
    global DEFAULT_SOURCE_HEALTH_CLI, DEFAULT_TERM_HIT_KEYWORDS, DEFAULT_PRECHECK_POLICY

    THREE_KWEB_CHECK_RUNNER_POLICY = dict(policy)
    paths = _three_kweb_section("defaultPaths")
    DEFAULT_OUTPUT_ROOT = Path(str(paths.get("outputRoot") or DEFAULT_OUTPUT_ROOT))
    DEFAULT_SOURCES_CONFIG = Path(str(paths.get("sourcesConfig") or DEFAULT_SOURCES_CONFIG))
    DEFAULT_SCOREBOARD_JSON = Path(str(paths.get("scoreboardJson") or DEFAULT_SCOREBOARD_JSON))
    DEFAULT_SOURCE_HEALTH_CLI = Path(str(paths.get("sourceHealthCli") or DEFAULT_SOURCE_HEALTH_CLI))
    DEFAULT_PRECHECK_POLICY = dict(_three_kweb_section("precheckDefaults"))
    for row in cue_rules:
        if str(row.get("constantName") or "") == "DEFAULT_TERM_HIT_KEYWORDS":
            DEFAULT_TERM_HIT_KEYWORDS = tuple(str(item) for item in row.get("value") or [] if str(item).strip())
            break


def apply_three_kweb_check_arg_defaults(args: argparse.Namespace) -> None:
    paths = _three_kweb_section("defaultPaths")
    fetch = _three_kweb_section("fetchDefaults")
    args.output_root = _three_kweb_path_arg(args.output_root, paths, "outputRoot", DEFAULT_OUTPUT_ROOT)
    args.sources_config = _three_kweb_path_arg(args.sources_config, paths, "sourcesConfig", DEFAULT_SOURCES_CONFIG)
    args.scoreboard_json = _three_kweb_path_arg(args.scoreboard_json, paths, "scoreboardJson", DEFAULT_SCOREBOARD_JSON)
    args.source_health_cli = _three_kweb_path_arg(args.source_health_cli, paths, "sourceHealthCli", DEFAULT_SOURCE_HEALTH_CLI)
    args.fetch_backend = _three_kweb_text_arg(args.fetch_backend, fetch, "fetchBackend", "auto")
    args.timeout_seconds = _three_kweb_float_arg(args.timeout_seconds, fetch, "timeoutSeconds", 12.0)
    args.max_gap_generals = _three_kweb_int_arg(args.max_gap_generals, fetch, "maxGapGenerals", 60)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def strip_html(text: str) -> str:
    body = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", text, flags=re.IGNORECASE)
    body = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", body, flags=re.IGNORECASE)
    body = re.sub(r"<[^>]+>", " ", body)
    body = unescape(body)
    body = re.sub(r"\s+", " ", body)
    return body.strip()


def extract_title(html: str) -> str:
    match = re.search(r"<title[^>]*>([\s\S]*?)</title>", html, flags=re.IGNORECASE)
    if not match:
        return ""
    return strip_html(match.group(1))[:180]


def truncate(text: str, max_len: int = 180) -> str:
    value = str(text or "").strip()
    if len(value) <= max_len:
        return value
    return value[: max(0, max_len - 3)] + "..."


def text_hash(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def normalize_text_list(raw_values: Any, fallback: list[str] | tuple[str, ...] | None = None) -> list[str]:
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
        return normalize_text_list(fallback, fallback=None)
    return []


def normalize_term_hit_keywords(raw_keywords: Any, fallback: list[str] | tuple[str, ...] | None = None) -> list[str]:
    def _normalize(values: Any) -> list[str]:
        if isinstance(values, str):
            raw_values = [values]
        elif isinstance(values, list) or isinstance(values, tuple):
            raw_values = [str(value or "") for value in values]
        else:
            raw_values = []
        normalized_values: list[str] = []
        seen_values: set[str] = set()
        for value in raw_values:
            token = str(value or "").strip()
            if not token or token in seen_values:
                continue
            seen_values.add(token)
            normalized_values.append(token)
        return normalized_values

    normalized = _normalize(raw_keywords)
    if normalized:
        return normalized
    if fallback is not None:
        return _normalize(fallback)
    return list(DEFAULT_TERM_HIT_KEYWORDS)


def resolve_precheck_policy(source: dict[str, Any], config_payload: dict[str, Any]) -> dict[str, Any]:
    pipeline_policies = config_payload.get("pipelinePolicies") if isinstance(config_payload, dict) else {}
    if not isinstance(pipeline_policies, dict):
        pipeline_policies = {}
    defaults = pipeline_policies.get("precheckDefaults") if isinstance(pipeline_policies.get("precheckDefaults"), dict) else {}
    class_policy_map = (
        pipeline_policies.get("sourceClassPrecheck")
        if isinstance(pipeline_policies.get("sourceClassPrecheck"), dict)
        else {}
    )
    source_class = str(source.get("sourceClass") or "").strip()
    class_policy = class_policy_map.get(source_class) if isinstance(class_policy_map.get(source_class), dict) else {}
    source_policy = source.get("precheckPolicy") if isinstance(source.get("precheckPolicy"), dict) else {}
    likely_threshold = to_int(
        source_policy.get("likelyThreshold"),
        to_int(class_policy.get("likelyThreshold"), to_int(defaults.get("likelyThreshold"), int(DEFAULT_PRECHECK_POLICY["likelyThreshold"]))),
    )
    possible_threshold = to_int(
        source_policy.get("possibleThreshold"),
        to_int(
            class_policy.get("possibleThreshold"),
            to_int(defaults.get("possibleThreshold"), int(DEFAULT_PRECHECK_POLICY["possibleThreshold"])),
        ),
    )
    if likely_threshold < possible_threshold:
        likely_threshold = possible_threshold
    minimum_term_hit_count = max(
        0,
        to_int(
            source_policy.get("minimumTermHitCount"),
            to_int(
                class_policy.get("minimumTermHitCount"),
                to_int(defaults.get("minimumTermHitCount"), int(DEFAULT_PRECHECK_POLICY["minimumTermHitCount"])),
            ),
        ),
    )
    hint_keywords = normalize_text_list(
        source_policy.get("hintKeywords"),
        fallback=normalize_text_list(
            class_policy.get("hintKeywords"),
            fallback=normalize_text_list(defaults.get("hintKeywords"), fallback=DEFAULT_PRECHECK_POLICY["hintKeywords"]),
        ),
    )
    if not hint_keywords:
        hint_keywords = list(DEFAULT_PRECHECK_POLICY["hintKeywords"])
    return {
        "likelyThreshold": likely_threshold,
        "possibleThreshold": possible_threshold,
        "minimumTermHitCount": minimum_term_hit_count,
        "hintKeywords": hint_keywords,
    }


def count_term_hits(plain_text: str, term_hit_keywords: list[str] | tuple[str, ...] | None = None) -> int:
    keywords = term_hit_keywords or DEFAULT_TERM_HIT_KEYWORDS
    return sum(plain_text.count(keyword) for keyword in keywords)


def relevance_level(term_hit_count: int, plain_text: str, precheck_policy: dict[str, Any] | None = None) -> str:
    policy = precheck_policy or DEFAULT_PRECHECK_POLICY
    likely_threshold = to_int(policy.get("likelyThreshold"), int(DEFAULT_PRECHECK_POLICY["likelyThreshold"]))
    possible_threshold = to_int(policy.get("possibleThreshold"), int(DEFAULT_PRECHECK_POLICY["possibleThreshold"]))
    if likely_threshold < possible_threshold:
        likely_threshold = possible_threshold
    if term_hit_count >= likely_threshold:
        return "likely-relevant"
    if term_hit_count >= possible_threshold:
        return "possible-relevant"
    hint_keywords = normalize_text_list(policy.get("hintKeywords"), fallback=DEFAULT_PRECHECK_POLICY["hintKeywords"])
    if any(keyword in plain_text for keyword in hint_keywords):
        return "possible-relevant"
    return "unclear"


def url_status(url: str) -> str:
    value = str(url or "").strip()
    if not value:
        return "pending-url"
    if value.startswith("http://") or value.startswith("https://"):
        return "http-url"
    return "manual-url"


def fetch_via_python(
    url: str,
    timeout_seconds: float,
    term_hit_keywords: list[str] | None = None,
    precheck_policy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    parsed_url = urllib.parse.urlsplit(url)
    safe_url = urllib.parse.urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            urllib.parse.quote(parsed_url.path or "", safe="/%:@"),
            urllib.parse.quote_plus(parsed_url.query or "", safe="=&%:@"),
            urllib.parse.quote(parsed_url.fragment or "", safe="%:@"),
        )
    )
    request = urllib.request.Request(
        safe_url,
        headers={
            "User-Agent": "Mozilla/5.0 (3KLife 3kweb-check)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=max(timeout_seconds, 1.0)) as response:
        raw = response.read()
        content_type = str(response.headers.get("Content-Type") or "")
        status = int(getattr(response, "status", 200))
    html = raw.decode("utf-8", errors="ignore")
    plain_text = strip_html(html)
    hits = count_term_hits(plain_text, term_hit_keywords)
    return {
        "liveStatus": "ok" if 200 <= status < 400 else "http-error",
        "httpStatus": status,
        "contentType": content_type,
        "bytesRead": len(raw),
        "termHitCount": hits,
        "relevanceLevel": relevance_level(hits, plain_text, precheck_policy=precheck_policy),
        "snippet": truncate(plain_text),
        "title": extract_title(html),
        "textHash": text_hash(plain_text),
        "reason": None if 200 <= status < 400 else f"HTTP {status}",
        "fetchBackend": "python-urllib",
        "fallbackFrom": None,
        "fallbackReason": None,
    }


def fetch_via_node_cli(
    source_id: str,
    url: str,
    timeout_seconds: float,
    cli_path: Path,
    sources_config_path: Path,
    term_hit_keywords: list[str] | None = None,
) -> dict[str, Any]:
    command = [
        "node",
        str(cli_path),
        "--source-id",
        source_id,
        "--url",
        url,
        "--timeout-seconds",
        str(max(timeout_seconds, 1.0)),
        "--sources-config",
        str(sources_config_path),
        "--json",
    ]
    for keyword in term_hit_keywords or []:
        command.extend(["--term-hit-keyword", str(keyword)])
    completed = subprocess.run(command, cwd=str(REPO_ROOT), capture_output=True, text=False, check=False)
    if completed.returncode != 0:
        stderr_text = (completed.stderr or b"").decode("utf-8", errors="ignore").strip()
        raise RuntimeError(f"node-cli failed: rc={completed.returncode} stderr={stderr_text}")
    stdout_text = (completed.stdout or b"").decode("utf-8", errors="ignore")
    payload = json.loads(stdout_text)
    return {
        "liveStatus": payload.get("liveStatus"),
        "httpStatus": payload.get("httpStatus"),
        "contentType": payload.get("contentType"),
        "bytesRead": payload.get("bytesRead"),
        "termHitCount": payload.get("termHitCount"),
        "relevanceLevel": payload.get("relevanceLevel"),
        "snippet": payload.get("snippet"),
        "title": payload.get("title"),
        "textHash": payload.get("textHash"),
        "reason": payload.get("reason"),
        "fetchBackend": payload.get("fetchBackend") or "node-cli",
        "fallbackFrom": payload.get("fallbackFrom"),
        "fallbackReason": payload.get("fallbackReason"),
        "cachePath": payload.get("cachePath"),
    }


def fetch_live(
    source: dict[str, Any],
    args: argparse.Namespace,
    cli_path: Path,
    sources_config_path: Path,
    term_hit_keywords: list[str],
    precheck_policy: dict[str, Any],
) -> dict[str, Any]:
    source_id = str(source.get("sourceId") or "").strip()
    base_url = str(source.get("baseUrl") or "").strip()
    manual_count = int(source.get("manualEvidenceCount") or 0)
    adapter_type = str(source.get("adapterType") or "")
    if adapter_type == "manual_quote" or base_url.startswith("about:"):
        return {
            "liveStatus": "manual-only",
            "httpStatus": None,
            "contentType": "",
            "bytesRead": 0,
            "termHitCount": 0,
            "relevanceLevel": "manual-only",
            "snippet": "",
            "title": "",
            "textHash": text_hash(source_id + "|manual-only"),
            "reason": None,
            "fetchBackend": "node-cli",
            "fallbackFrom": None,
            "fallbackReason": None,
            "manualEvidenceCount": manual_count,
        }
    if url_status(base_url) != "http-url":
        return {
            "liveStatus": "pending-url",
            "httpStatus": None,
            "contentType": "",
            "bytesRead": 0,
            "termHitCount": 0,
            "relevanceLevel": "unclear",
            "snippet": "",
            "title": "",
            "textHash": text_hash(source_id + "|pending-url"),
            "reason": "missing-or-non-http-url",
            "fetchBackend": "none",
            "fallbackFrom": None,
            "fallbackReason": None,
            "manualEvidenceCount": manual_count,
        }

    requested = args.fetch_backend
    if requested in {"auto", "node-cli"} and cli_path.exists():
        try:
            row = fetch_via_node_cli(
                source_id,
                base_url,
                args.timeout_seconds,
                cli_path=cli_path,
                sources_config_path=sources_config_path,
                term_hit_keywords=term_hit_keywords,
            )
            row["manualEvidenceCount"] = manual_count
            return row
        except Exception as exc:
            if requested == "node-cli":
                return {
                    "liveStatus": "backend-unavailable",
                    "httpStatus": None,
                    "contentType": "",
                    "bytesRead": 0,
                    "termHitCount": 0,
                    "relevanceLevel": "unclear",
                    "snippet": "",
                    "title": "",
                    "textHash": text_hash(source_id + "|node-cli-error"),
                    "reason": str(exc),
                    "fetchBackend": "node-cli",
                    "fallbackFrom": None,
                    "fallbackReason": None,
                    "manualEvidenceCount": manual_count,
                }
            try:
                python_row = fetch_via_python(
                    base_url,
                    args.timeout_seconds,
                    term_hit_keywords=term_hit_keywords,
                    precheck_policy=precheck_policy,
                )
            except Exception as python_exc:
                return {
                    "liveStatus": "fetch-error",
                    "httpStatus": None,
                    "contentType": "",
                    "bytesRead": 0,
                    "termHitCount": 0,
                    "relevanceLevel": "unclear",
                    "snippet": "",
                    "title": "",
                    "textHash": text_hash(str(python_exc)),
                    "reason": f"node-cli: {exc}; python-fallback: {python_exc}",
                    "fetchBackend": "python-urllib",
                    "fallbackFrom": "node-cli",
                    "fallbackReason": str(exc),
                    "manualEvidenceCount": manual_count,
                }
            python_row["fallbackFrom"] = "node-cli"
            python_row["fallbackReason"] = str(exc)
            python_row["manualEvidenceCount"] = manual_count
            return python_row

    try:
        row = fetch_via_python(
            base_url,
            args.timeout_seconds,
            term_hit_keywords=term_hit_keywords,
            precheck_policy=precheck_policy,
        )
        row["manualEvidenceCount"] = manual_count
        return row
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        plain = strip_html(body)
        hits = count_term_hits(plain, term_hit_keywords)
        return {
            "liveStatus": "http-error",
            "httpStatus": int(exc.code),
            "contentType": str(exc.headers.get("Content-Type") or ""),
            "bytesRead": len(body.encode("utf-8", errors="ignore")),
            "termHitCount": hits,
            "relevanceLevel": relevance_level(hits, plain, precheck_policy=precheck_policy),
            "snippet": truncate(plain),
            "title": "",
            "textHash": text_hash(plain),
            "reason": f"HTTP {exc.code}",
            "fetchBackend": "python-urllib",
            "fallbackFrom": None,
            "fallbackReason": None,
            "manualEvidenceCount": manual_count,
        }
    except Exception as exc:
        return {
            "liveStatus": "fetch-error",
            "httpStatus": None,
            "contentType": "",
            "bytesRead": 0,
            "termHitCount": 0,
            "relevanceLevel": "unclear",
            "snippet": "",
            "title": "",
            "textHash": text_hash(str(exc)),
            "reason": str(exc),
            "fetchBackend": "python-urllib",
            "fallbackFrom": None,
            "fallbackReason": None,
            "manualEvidenceCount": manual_count,
        }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# 3kweb-check Summary",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Source Count: `{summary['metrics']['sourceCount']}`",
        f"- Reachable Count: `{summary['metrics']['reachableSourceCount']}`",
        f"- Pending URL Count: `{summary['metrics']['pendingUrlCount']}`",
        "",
        "## Source Health",
        "",
        "| Source | Layer | Live Status | HTTP | Hits | Relevance |",
        "|---|---|---|---:|---:|---|",
    ]
    for row in summary.get("sourceChecks") or []:
        lines.append(
            "| `{source}` | `{layer}` | `{status}` | {http} | {hits} | `{relevance}` |".format(
                source=row.get("sourceId"),
                layer=row.get("sourceLayer"),
                status=row.get("liveStatus"),
                http=row.get("httpStatus") if row.get("httpStatus") is not None else "-",
                hits=row.get("termHitCount") or 0,
                relevance=row.get("relevanceLevel"),
            )
        )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deterministic external source health check for Sanguo ETL/RAG.")
    parser.add_argument("--run-id", default=None, help="Run id. Defaults to 3kweb-check-<UTC>.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--three-kweb-check-policy", default=None, help="Override policy-3kweb-check-runner.json path")
    parser.add_argument("--three-kweb-check-cue-rules", default=None, help="Override rule-3kweb-check-cues.jsonl path")
    parser.add_argument("--output-root", default=None, help="Output root path. Defaults to governance policy.")
    parser.add_argument("--sources-config", default=None, help="External sources JSON config. Defaults to governance policy.")
    parser.add_argument("--scoreboard-json", default=None, help="Scoreboard JSON for gap analysis. Defaults to governance policy.")
    parser.add_argument("--approved-only", action="store_true", help="Include only status=approved sources.")
    parser.add_argument("--fetch-live", action="store_true", help="Execute live fetch for http urls.")
    parser.add_argument("--dry-run", action="store_true", help="Skip live network fetch.")
    parser.add_argument("--fetch-backend", choices=("auto", "node-cli", "python"), default=None, help="Fetch backend. Defaults to governance policy.")
    parser.add_argument("--source-health-cli", default=None, help="Source health node CLI path. Defaults to governance policy.")
    parser.add_argument(
        "--term-hit-keyword",
        action="append",
        default=[],
        help="Optional precheck keyword override (repeatable). When provided, applies to all sources.",
    )
    parser.add_argument("--timeout-seconds", type=float, default=None, help="HTTP timeout in seconds. Defaults to governance policy.")
    parser.add_argument("--max-gap-generals", type=int, default=None, help="Reserved for future gap analysis. Defaults to governance policy.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    three_kweb_policy = load_three_kweb_check_runner_policy(
        args.governance_root,
        three_kweb_check_policy=args.three_kweb_check_policy,
    )
    three_kweb_cue_rules = load_three_kweb_check_cue_rules(
        args.governance_root,
        three_kweb_check_cue_rules=args.three_kweb_check_cue_rules,
    )
    apply_three_kweb_check_governance(three_kweb_policy, three_kweb_cue_rules)
    apply_three_kweb_check_arg_defaults(args)
    run_id = args.run_id or f"3kweb-check-{utc_stamp()}"
    run_root = resolve_path(Path(args.output_root) / run_id)
    run_root.mkdir(parents=True, exist_ok=True)
    summary_json_path = run_root / "3kweb-check-summary.json"
    summary_md_path = run_root / "3kweb-check-summary.zh-TW.md"
    if (summary_json_path.exists() or summary_md_path.exists()) and not args.overwrite:
        raise FileExistsError("Output already exists. Re-run with --overwrite.")

    config_path = resolve_path(args.sources_config)
    config = read_json(config_path)
    source_rows = list(config.get("sources") or [])
    if args.approved_only:
        source_rows = [row for row in source_rows if str(row.get("status") or "").strip() == "approved"]
    global_term_hit_keywords = normalize_term_hit_keywords(args.term_hit_keyword, fallback=[])

    cli_path = resolve_path(args.source_health_cli)
    source_checks: list[dict[str, Any]] = []
    backend_usage: dict[str, int] = {}
    for source in source_rows:
        base_url = str(source.get("baseUrl") or "")
        source_precheck_policy = resolve_precheck_policy(source, config_payload=config)
        source_term_hit_keywords = (
            list(global_term_hit_keywords)
            if global_term_hit_keywords
            else normalize_term_hit_keywords(source.get("termHitKeywords"))
        )
        info = {
            "sourceId": source.get("sourceId"),
            "status": source.get("status"),
            "adapterType": source.get("adapterType"),
            "sourceFamily": source.get("sourceFamily"),
            "sourceLayer": source.get("sourceLayer"),
            "trustTier": source.get("trustTier"),
            "baseUrl": base_url,
            "urlStatus": url_status(base_url),
            "termHitKeywords": source_term_hit_keywords,
            "precheckPolicy": source_precheck_policy,
        }
        if args.dry_run or not args.fetch_live:
            row = {
                "liveStatus": "manual-only" if info["urlStatus"] == "manual-url" else "pending-url",
                "httpStatus": None,
                "contentType": "",
                "bytesRead": 0,
                "termHitCount": 0,
                "relevanceLevel": "unclear",
                "snippet": "",
                "reason": None,
                "fetchBackend": "none",
                "fallbackFrom": None,
                "fallbackReason": None,
                "title": "",
                "textHash": text_hash((info["sourceId"] or "") + "|dry-run"),
                "manualEvidenceCount": int(source.get("manualEvidenceCount") or 0),
            }
        else:
            row = fetch_live(
                source,
                args=args,
                cli_path=cli_path,
                sources_config_path=config_path,
                term_hit_keywords=source_term_hit_keywords,
                precheck_policy=source_precheck_policy,
            )
        combined = {**info, **row, "canonicalWrites": False}
        backend = str(combined.get("fetchBackend") or "none")
        backend_usage[backend] = backend_usage.get(backend, 0) + 1
        source_checks.append(combined)

    scoreboard_path = resolve_path(args.scoreboard_json)
    scoreboard_present = scoreboard_path.exists()
    warnings: list[str] = []
    if not scoreboard_present:
        warnings.append("scoreboard JSON missing; missing-evidence generals and seed target suggestions may be incomplete")

    reachable = [row for row in source_checks if str(row.get("liveStatus")) in {"ok", "manual-only"}]
    pending = [row for row in source_checks if str(row.get("urlStatus")) == "pending-url"]
    seed_suggestions = [
        {
            "sourceId": row.get("sourceId"),
            "reason": "likely-relevant source with term hits; consider seed harvesting",
            "termHitCount": row.get("termHitCount"),
            "relevanceLevel": row.get("relevanceLevel"),
        }
        for row in source_checks
        if str(row.get("liveStatus")) == "ok" and int(row.get("termHitCount") or 0) > 0
    ]

    summary = {
        "version": "1.1.0",
        "generatedAt": utc_now(),
        "mode": "3kweb-check",
        "canonicalWrites": False,
        "runId": run_id,
        "inputs": {
            "sourcesConfigPath": repo_relative(config_path),
            "scoreboardJsonPath": repo_relative(scoreboard_path),
            "scoreboardPresent": scoreboard_present,
            "sourceHealthCliPath": repo_relative(cli_path),
            "approvedOnly": bool(args.approved_only),
            "fetchLive": bool(args.fetch_live),
            "dryRun": bool(args.dry_run),
            "fetchBackendRequested": args.fetch_backend,
            "termHitKeywordsDefault": list(DEFAULT_TERM_HIT_KEYWORDS),
            "termHitKeywordsOverride": list(global_term_hit_keywords),
        },
        "outputs": {
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_md_path),
        },
        "metrics": {
            "sourceCount": len(source_checks),
            "reachableSourceCount": len(reachable),
            "pendingUrlCount": len(pending),
            "missingEvidenceGeneralCount": 0,
            "seedSuggestionCount": len(seed_suggestions),
            "backendUsage": backend_usage,
        },
        "warnings": warnings,
        "sourceChecks": source_checks,
        "missingEvidenceGenerals": [],
        "seedSuggestions": seed_suggestions,
    }

    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_markdown(summary), encoding="utf-8")
    print(f"[run_3kweb_check] wrote {summary_json_path}")
    print(f"[run_3kweb_check] wrote {summary_md_path}")
    print(
        "[run_3kweb_check] "
        f"runId={run_id} sourceCount={len(source_checks)} reachable={len(reachable)} "
        f"seedSuggestions={len(seed_suggestions)}"
    )


if __name__ == "__main__":
    try:
        main()
    except SanguoGovernanceError as exc:
        raise SystemExit(f"[run_3kweb_check] governance error: {exc}") from None
