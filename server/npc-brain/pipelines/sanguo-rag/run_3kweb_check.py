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


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCES_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_SCOREBOARD_JSON = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard/full-roster-scoreboard.json")
DEFAULT_SOURCE_HEALTH_CLI = Path("tools_node/agent-clis/3klife-source-health.js")

TERM_PATTERNS = [
    re.compile(pattern)
    for pattern in (
        r"三國",
        r"三国",
        r"曹操",
        r"劉備",
        r"刘备",
        r"孫權",
        r"孙权",
        r"關羽",
        r"关羽",
        r"諸葛亮",
        r"诸葛亮",
        r"司馬懿",
        r"司马懿",
    )
]


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


def count_term_hits(plain_text: str) -> int:
    total = 0
    for pattern in TERM_PATTERNS:
        total += len(pattern.findall(plain_text))
    return total


def relevance_level(term_hit_count: int, plain_text: str) -> str:
    if term_hit_count >= 3:
        return "likely-relevant"
    if term_hit_count >= 1:
        return "possible-relevant"
    if "歷史" in plain_text or "演義" in plain_text or "演义" in plain_text:
        return "possible-relevant"
    return "unclear"


def url_status(url: str) -> str:
    value = str(url or "").strip()
    if not value:
        return "pending-url"
    if value.startswith("http://") or value.startswith("https://"):
        return "http-url"
    return "manual-url"


def fetch_via_python(url: str, timeout_seconds: float) -> dict[str, Any]:
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
    hits = count_term_hits(plain_text)
    return {
        "liveStatus": "ok" if 200 <= status < 400 else "http-error",
        "httpStatus": status,
        "contentType": content_type,
        "bytesRead": len(raw),
        "termHitCount": hits,
        "relevanceLevel": relevance_level(hits, plain_text),
        "snippet": truncate(plain_text),
        "title": extract_title(html),
        "textHash": text_hash(plain_text),
        "reason": None if 200 <= status < 400 else f"HTTP {status}",
        "fetchBackend": "python-urllib",
        "fallbackFrom": None,
        "fallbackReason": None,
    }


def fetch_via_node_cli(source_id: str, url: str, timeout_seconds: float, cli_path: Path) -> dict[str, Any]:
    command = [
        "node",
        str(cli_path),
        "--source-id",
        source_id,
        "--url",
        url,
        "--timeout-seconds",
        str(max(timeout_seconds, 1.0)),
        "--json",
    ]
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


def fetch_live(source: dict[str, Any], args: argparse.Namespace, cli_path: Path) -> dict[str, Any]:
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
            row = fetch_via_node_cli(source_id, base_url, args.timeout_seconds, cli_path=cli_path)
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
                python_row = fetch_via_python(base_url, args.timeout_seconds)
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
        row = fetch_via_python(base_url, args.timeout_seconds)
        row["manualEvidenceCount"] = manual_count
        return row
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        plain = strip_html(body)
        return {
            "liveStatus": "http-error",
            "httpStatus": int(exc.code),
            "contentType": str(exc.headers.get("Content-Type") or ""),
            "bytesRead": len(body.encode("utf-8", errors="ignore")),
            "termHitCount": count_term_hits(plain),
            "relevanceLevel": relevance_level(count_term_hits(plain), plain),
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
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output root path.")
    parser.add_argument("--sources-config", default=str(DEFAULT_SOURCES_CONFIG), help="External sources JSON config.")
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON), help="Scoreboard JSON for gap analysis.")
    parser.add_argument("--approved-only", action="store_true", help="Include only status=approved sources.")
    parser.add_argument("--fetch-live", action="store_true", help="Execute live fetch for http urls.")
    parser.add_argument("--dry-run", action="store_true", help="Skip live network fetch.")
    parser.add_argument("--fetch-backend", choices=("auto", "node-cli", "python"), default="auto")
    parser.add_argument("--source-health-cli", default=str(DEFAULT_SOURCE_HEALTH_CLI), help="Source health node CLI path.")
    parser.add_argument("--timeout-seconds", type=float, default=12.0, help="HTTP timeout in seconds.")
    parser.add_argument("--max-gap-generals", type=int, default=60, help="Reserved for future gap analysis.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
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

    cli_path = resolve_path(args.source_health_cli)
    source_checks: list[dict[str, Any]] = []
    backend_usage: dict[str, int] = {}
    for source in source_rows:
        base_url = str(source.get("baseUrl") or "")
        info = {
            "sourceId": source.get("sourceId"),
            "status": source.get("status"),
            "adapterType": source.get("adapterType"),
            "sourceFamily": source.get("sourceFamily"),
            "sourceLayer": source.get("sourceLayer"),
            "trustTier": source.get("trustTier"),
            "baseUrl": base_url,
            "urlStatus": url_status(base_url),
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
            row = fetch_live(source, args=args, cli_path=cli_path)
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
    main()
