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


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCE_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
DEFAULT_SOURCE_HEALTH_CLI = Path("tools_node/agent-clis/3klife-source-health.js")
DEFAULT_HARVESTER_CLI = Path("tools_node/agent-clis/3klife-web-page-harvester.js")
DEFAULT_BIOGRAPHY_EXTRACTOR = Path("server/npc-brain/pipelines/sanguo-rag/extract_harvested_page_evidence_seeds.py")
DEFAULT_GENERIC_EXTRACTOR = Path("server/npc-brain/pipelines/sanguo-rag/extract_generic_passage_evidence_seeds.py")
DEFAULT_SEED_HARVESTER = Path("server/npc-brain/pipelines/sanguo-rag/harvest_external_evidence_seeds.py")
DEFAULT_SEED_SCORER = Path("server/npc-brain/pipelines/sanguo-rag/score_external_evidence_seeds.py")
DEFAULT_SEED_PROMOTER = Path("server/npc-brain/pipelines/sanguo-rag/promote_seed_to_evidence_card.py")

SOURCE_CLASSES = (
    "high-yield-character-site",
    "primary-text-site",
    "community-worldbuilding-site",
)

LOGIN_PATTERNS = (
    "登入",
    "登录",
    "sign in",
    "log in",
    "建立帳號",
    "创建账号",
)


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


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_source_row(path: Path, source_id: str) -> dict[str, Any] | None:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        return None
    for row in rows:
        if isinstance(row, dict) and str(row.get("sourceId") or "").strip() == source_id:
            return row
    return None


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
) -> tuple[dict[str, Any], list[str], bool]:
    payload = run_json_command(
        [
            "node",
            str(source_health_cli),
            "--source-id",
            source_id,
            "--url",
            url,
            "--timeout-seconds",
            str(max(timeout_seconds, 1.0)),
            "--json",
        ]
    )
    snippet = str(payload.get("snippet") or "")
    title = str(payload.get("title") or "")
    combined = f"{title}\n{snippet}".lower()
    reasons: list[str] = []
    if int(payload.get("httpStatus") or 0) != 200:
        reasons.append(f"httpStatus={payload.get('httpStatus')}")
    if int(payload.get("termHitCount") or 0) <= 0:
        reasons.append("termHitCount<=0")
    if not (snippet.strip() or title.strip()):
        reasons.append("deterministic-text-empty")
    login_hit = any(pattern in combined for pattern in LOGIN_PATTERNS)
    if login_hit and int(payload.get("termHitCount") or 0) <= 1 and int(payload.get("bytesRead") or 0) < 8000:
        reasons.append("login-gated")
    if str(payload.get("contentType") or "").startswith("application/javascript"):
        reasons.append("javascript-shell")
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


def body_text_examples(ranking_summary: dict[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    ranked = ranking_summary.get("rankedSeeds") if isinstance(ranking_summary, dict) else []
    if not isinstance(ranked, list):
        return []
    examples: list[dict[str, Any]] = []
    for row in ranked:
        if not isinstance(row, dict):
            continue
        if str(row.get("contentSource") or "") != "page-text":
            continue
        examples.append(
            {
                "personId": str(row.get("generalId") or row.get("candidatePersonId") or "").strip(),
                "angleType": str(row.get("angleType") or "").strip(),
                "seedConfidenceScore": float(row.get("seedConfidenceScore") or 0.0),
                "pageTitle": row.get("pageTitle"),
                "sourceUrl": row.get("sourceUrl"),
                "locator": row.get("locator"),
                "quote": row.get("quote") or row.get("seedText"),
            }
        )
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


def count_term_hits(text: str) -> int:
    patterns = (
        "三國",
        "三国",
        "曹操",
        "劉備",
        "刘备",
        "孫權",
        "孙权",
        "關羽",
        "关羽",
        "諸葛亮",
        "诸葛亮",
        "司馬懿",
        "司马懿",
    )
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
        "termHitCount": count_term_hits(plain_text),
        "relevanceLevel": "likely-relevant" if count_term_hits(plain_text) >= 3 else "possible-relevant",
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


def harvest_source(
    *,
    source_id: str,
    source_url: str,
    source_row: dict[str, Any] | None,
    args: argparse.Namespace,
    harvester_cli: Path,
    run_root: Path,
) -> tuple[dict[str, Any] | None, list[str]]:
    harvest_policy = (source_row or {}).get("harvestPolicy") or {}
    if not harvest_policy:
        single_page_policy = (source_row or {}).get("singlePagePolicy") or {}
        if single_page_policy:
            return (
                harvest_single_page(
                    source_id=source_id,
                    source_url=source_url,
                    run_root=run_root,
                    timeout_seconds=args.timeout_seconds,
                ),
                [],
            )
        return None, ["missing-harvestPolicy-or-singlePagePolicy"]
    link_include = args.link_include or list(harvest_policy.get("linkInclude") or [])
    link_exclude = list(harvest_policy.get("linkExclude") or [])
    same_origin = bool(args.same_origin or harvest_policy.get("sameOrigin"))
    harvest_root = run_root / "harvest"
    command = [
        "node",
        str(harvester_cli),
        "--source-id",
        source_id,
        "--index-url",
        str(harvest_policy.get("indexUrl") or source_url),
        "--max-pages",
        str(max(1, int(args.sample_size))),
        "--concurrency",
        str(max(1, int(args.concurrency))),
        "--timeout-seconds",
        str(max(args.timeout_seconds, 1.0)),
        "--output-root",
        str(harvest_root),
        "--json",
    ]
    for pattern in link_include:
        command.extend(["--link-include", str(pattern)])
    for pattern in link_exclude:
        command.extend(["--link-exclude", str(pattern)])
    if same_origin:
        command.append("--same-origin")
    return run_json_command(command), []


def evaluate_stage2(harvest_summary: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
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
    if metrics["fetchSuccessRate"] < 0.90:
        reasons.append("fetchSuccessRate<0.90")
    if metrics["relevantPageRate"] < 0.70:
        reasons.append("relevantPageRate<0.70")
    if metrics["errorRate"] > 0.10:
        reasons.append("errorRate>0.10")
    if metrics["duplicateLinkRate"] > 0.05:
        reasons.append("duplicateLinkRate>0.05")
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


def evaluate_stage3(source_class: str, metrics: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if source_class == "high-yield-character-site":
        if metrics["seedPerPage"] < 1.0:
            reasons.append("seedPerPage<1.0")
        if metrics["candidateCardPerPage"] < 0.40:
            reasons.append("candidateCardPerPage<0.40")
        if metrics["canonicalMatchPageRate"] < 0.40 and metrics["shadowPeople"] < 15:
            reasons.append("canonicalMatchPageRate<0.40 and shadowPeople<15")
        return reasons
    if source_class == "primary-text-site":
        if metrics["quoteLocatorHashCoverage"] < 0.90:
            reasons.append("quoteLocatorHashCoverage<0.90")
        if metrics["claimBearingPassageCount"] < 20:
            reasons.append("claimBearingPassageCount<20")
        return reasons
    if source_class == "community-worldbuilding-site":
        if metrics["seedPerPage"] < 0.80:
            reasons.append("seedPerPage<0.80")
        if metrics["candidateCardPerPage"] < 0.20:
            reasons.append("candidateCardPerPage<0.20")
        return reasons
    return ["unsupported-sourceClass"]


def render_markdown(summary: dict[str, Any]) -> str:
    precheck = summary["stage1Precheck"]
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
                "",
                "## 內文採樣例",
                "",
                "| Person | Angle | Score | Quote |",
                "| --- | --- | ---: | --- |",
            ]
        )
        examples = summary.get("bodyTextExamples") or []
        if examples:
            for row in examples:
                quote = str(row.get("quote") or "").replace("\n", " ").replace("|", "\\|")
                if len(quote) > 110:
                    quote = quote[:107] + "..."
                lines.append(
                    f"| `{row['personId']}` | `{row['angleType']}` | {float(row['seedConfidenceScore']):.2f} | {quote} |"
                )
        else:
            lines.append("| _none_ | _none_ | 0.00 | no page-text seeds |")
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
    source_row = load_source_row(source_config_path, args.source_id)
    source_class = args.source_class or infer_source_class(source_row)
    source_url = str(args.url or (source_row or {}).get("baseUrl") or "").strip()
    if not source_url:
        raise SystemExit("source url is required when sourceId is not found or has no baseUrl")
    if source_class not in SOURCE_CLASSES:
        raise SystemExit(f"unsupported sourceClass: {source_class}")

    run_id = args.run_id or f"benchmark-{args.source_id}-{utc_stamp()}"
    run_root = resolve_path(args.output_root) / run_id
    if run_root.exists() and any(run_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output already exists: {repo_relative(run_root)}")
    run_root.mkdir(parents=True, exist_ok=True)

    source_health_cli = resolve_path(args.source_health_cli)
    harvester_cli = resolve_path(args.harvester_cli)
    alias_map_path = resolve_path(args.alias_map)
    scoreboard_path = resolve_path(args.scoreboard_json)
    single_source_health_path = run_root / "single-source-health-summary.json"
    benchmark_summary_path = run_root / "benchmark-summary.json"
    benchmark_markdown_path = run_root / "benchmark-summary.zh-TW.md"

    precheck_payload, stage1_reasons, stage1_passed = stage1_precheck(
        source_id=args.source_id,
        url=source_url,
        timeout_seconds=args.timeout_seconds,
        source_health_cli=source_health_cli,
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
            args=args,
            harvester_cli=harvester_cli,
            run_root=run_root,
        )
        if harvest_summary:
            stage2_metrics, auto_stage2_reasons = evaluate_stage2(harvest_summary)
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
        stage3_reasons = evaluate_stage3(source_class, stage3_metrics)
        final_verdict = "approve" if not stage3_reasons else "reject"
    elif stage1_passed and stage2_reasons == ["missing-harvestPolicy"]:
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
