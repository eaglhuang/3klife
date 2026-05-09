from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SOURCES_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SCOREBOARD_JSON = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard/full-roster-scoreboard.json")
DEFAULT_SOURCE_HEALTH_CLI = Path("tools_node/agent-clis/3klife-source-health.js")
PROXY_ENV_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
)
RELEVANCE_TERMS = (
    "三國",
    "三国",
    "武將",
    "武将",
    "人物",
    "列傳",
    "列传",
    "傳",
    "传",
    "關係",
    "关系",
    "事件",
    "演義",
    "演义",
)


@dataclass(frozen=True)
class SourcePolicy:
    source_id: str
    status: str
    adapter_type: str
    source_family: str
    source_layer: str
    trust_tier: str
    base_url: str
    claim_scopes: tuple[str, ...]
    manual_evidence_count: int


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "3kweb-check: validate external evidence source policies with deterministic checks, "
            "optional live fetch, and missing-evidence suggestions."
        )
    )
    parser.add_argument("--run-id", default=None, help="Run id. Defaults to 3kweb-check-<UTC>.")
    parser.add_argument("--sources-config", default=str(DEFAULT_SOURCES_CONFIG), help="Source policy config JSON path.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output root.")
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON), help="Optional scoreboard JSON path.")
    parser.add_argument("--approved-only", action="store_true", help="Only evaluate status=approved sources.")
    parser.add_argument("--fetch-live", action="store_true", help="Attempt deterministic GET checks for http/https sources.")
    parser.add_argument(
        "--fetch-backend",
        choices=("auto", "node-cli", "python"),
        default="auto",
        help="Live fetch backend. auto prefers the Node CLI from agent-cli-factory.",
    )
    parser.add_argument(
        "--source-health-cli",
        default=str(DEFAULT_SOURCE_HEALTH_CLI),
        help="Path to the Node source-health CLI used by --fetch-backend auto|node-cli.",
    )
    parser.add_argument("--timeout-seconds", type=float, default=12.0, help="HTTP timeout for live fetch.")
    parser.add_argument("--max-read-bytes", type=int, default=900_000, help="Max bytes read per source.")
    parser.add_argument("--max-gap-generals", type=int, default=40, help="Max missing-evidence generals in report.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs.")
    parser.add_argument("--dry-run", action="store_true", help="Skip live fetch even if --fetch-live is set.")
    return parser.parse_args()


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


def ensure_overwrite(paths: list[Path], overwrite: bool) -> None:
    existing = [path for path in paths if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def cleaned_proxy_env() -> dict[str, str]:
    env = dict(os.environ)
    for key in PROXY_ENV_KEYS:
        env.pop(key, None)
    return env


def load_policies(path: Path, approved_only: bool) -> list[SourcePolicy]:
    payload = read_json(path)
    raw_sources = payload.get("sources") if isinstance(payload, dict) else payload
    if not isinstance(raw_sources, list):
        return []
    policies: list[SourcePolicy] = []
    for raw in raw_sources:
        if not isinstance(raw, dict):
            continue
        source_id = normalize_text(raw.get("id"))
        if not source_id:
            continue
        status = normalize_text(raw.get("status") or "suggested").lower()
        if approved_only and status != "approved":
            continue
        evidence_seeds = raw.get("manualEvidence") or raw.get("evidenceSeeds") or raw.get("manualQuotes") or []
        seed_count = len(evidence_seeds) if isinstance(evidence_seeds, list) else 0
        scopes = tuple(str(item).strip() for item in (raw.get("claimScopes") or []) if str(item).strip())
        policies.append(
            SourcePolicy(
                source_id=source_id,
                status=status,
                adapter_type=normalize_text(raw.get("adapterType")).lower(),
                source_family=normalize_text(raw.get("sourceFamily")),
                source_layer=normalize_text(raw.get("sourceLayer")).lower(),
                trust_tier=normalize_text(raw.get("trustTier")).lower(),
                base_url=normalize_text(raw.get("baseUrl")),
                claim_scopes=scopes,
                manual_evidence_count=seed_count,
            )
        )
    return policies


def strip_html_to_text(value: str) -> str:
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", value)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def decode_bytes(raw: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "big5", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def relevance_check(plain_text: str) -> tuple[int, str]:
    term_hits = [term for term in RELEVANCE_TERMS if term in plain_text]
    hit_count = len(term_hits)
    if hit_count >= 3:
        level = "likely-relevant"
    elif hit_count >= 1:
        level = "weak-relevant"
    else:
        level = "unclear"
    return hit_count, level


def pick_snippet(plain_text: str, width: int = 170) -> str:
    if not plain_text:
        return ""
    for term in RELEVANCE_TERMS:
        idx = plain_text.find(term)
        if idx >= 0:
            start = max(0, idx - (width // 2))
            end = min(len(plain_text), idx + (width // 2))
            return plain_text[start:end].strip()
    return plain_text[:width].strip()


def normalize_http_url(url: str) -> str:
    parts = urllib.parse.urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return url
    try:
        netloc = parts.netloc.encode("idna").decode("ascii")
    except UnicodeError:
        netloc = parts.netloc
    safe_path = urllib.parse.quote(parts.path, safe="/%:@-._~!$&'()*+,;=")
    safe_query = urllib.parse.quote(parts.query, safe="=&%:@-._~!$'()*+,;/?")
    safe_fragment = urllib.parse.quote(parts.fragment, safe="%:@-._~!$&'()*+,;=/?")
    return urllib.parse.urlunsplit((parts.scheme, netloc, safe_path, safe_query, safe_fragment))


def check_source_live_python(policy: SourcePolicy, timeout_seconds: float, max_read_bytes: int) -> dict[str, Any]:
    url = policy.base_url
    if not url:
        return {"liveStatus": "invalid-url", "reason": "empty-base-url", "fetchBackend": "python-urllib"}
    if url.startswith("about:pending-url"):
        return {"liveStatus": "pending-url", "reason": "pending-url-placeholder", "fetchBackend": "python-urllib"}
    if url.startswith("about:manual"):
        return {"liveStatus": "manual-only", "reason": "manual-quote-source", "fetchBackend": "python-urllib"}
    if not (url.startswith("http://") or url.startswith("https://")):
        return {"liveStatus": "invalid-url", "reason": "non-http-url", "fetchBackend": "python-urllib"}

    try:
        normalized_url = normalize_http_url(url)
    except Exception as exc:  # noqa: BLE001
        return {"liveStatus": "invalid-url", "reason": f"url-normalization-failed: {exc}", "fetchBackend": "python-urllib"}

    request = urllib.request.Request(
        normalized_url,
        headers={
            "User-Agent": "3KLife-3kweb-check/1.1 (+python-urllib-fallback)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(request, timeout=timeout_seconds) as response:
            code = int(getattr(response, "status", 200) or 200)
            content_type = str(response.headers.get("Content-Type") or "")
            raw = response.read(max(max_read_bytes, 1))
            text = decode_bytes(raw)
            plain_text = strip_html_to_text(text)
            term_hit_count, relevance_level = relevance_check(plain_text)
            return {
                "liveStatus": "ok",
                "httpStatus": code,
                "contentType": content_type,
                "bytesRead": len(raw),
                "termHitCount": term_hit_count,
                "relevanceLevel": relevance_level,
                "snippet": pick_snippet(plain_text),
                "fetchBackend": "python-urllib",
            }
    except urllib.error.HTTPError as exc:
        return {
            "liveStatus": "http-error",
            "httpStatus": int(getattr(exc, "code", 0) or 0),
            "reason": str(exc),
            "fetchBackend": "python-urllib",
        }
    except urllib.error.URLError as exc:
        return {"liveStatus": "url-error", "reason": str(exc), "fetchBackend": "python-urllib"}
    except TimeoutError as exc:
        return {"liveStatus": "timeout", "reason": str(exc), "fetchBackend": "python-urllib"}
    except Exception as exc:  # noqa: BLE001
        return {"liveStatus": "fetch-error", "reason": str(exc), "fetchBackend": "python-urllib"}


def check_source_live_node_cli(
    policy: SourcePolicy,
    timeout_seconds: float,
    max_read_bytes: int,
    cli_path: Path,
) -> dict[str, Any]:
    if not cli_path.exists():
        return {
            "liveStatus": "backend-unavailable",
            "reason": f"node-cli-missing: {repo_relative(cli_path)}",
            "fetchBackend": "node-cli",
        }

    command = [
        "node",
        str(cli_path),
        "--json",
        "--compact",
        "--source-id",
        policy.source_id,
        "--url",
        policy.base_url,
        "--timeout-ms",
        str(int(max(timeout_seconds, 1.0) * 1000)),
        "--max-bytes",
        str(max(max_read_bytes, 10_000)),
    ]
    try:
        completed = subprocess.run(
            command,
            cwd=str(REPO_ROOT),
            env=cleaned_proxy_env(),
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
    except FileNotFoundError as exc:
        return {"liveStatus": "backend-unavailable", "reason": str(exc), "fetchBackend": "node-cli"}
    except Exception as exc:  # noqa: BLE001
        return {"liveStatus": "fetch-error", "reason": str(exc), "fetchBackend": "node-cli"}

    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()
    if not stdout:
        return {
            "liveStatus": "output-contract-error",
            "reason": stderr or f"node-cli-exit-{completed.returncode}",
            "fetchBackend": "node-cli",
        }

    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        return {
            "liveStatus": "output-contract-error",
            "reason": f"invalid-json: {exc}",
            "fetchBackend": "node-cli",
            "rawStdout": stdout[:400],
            "rawStderr": stderr[:400],
        }

    result = {
        "liveStatus": str(payload.get("liveStatus") or ("ok" if payload.get("ok") else "fetch-error")),
        "httpStatus": payload.get("httpStatus"),
        "contentType": payload.get("contentType"),
        "bytesRead": payload.get("bytesRead"),
        "termHitCount": payload.get("termHitCount"),
        "relevanceLevel": payload.get("relevanceLevel"),
        "snippet": payload.get("snippet"),
        "reason": payload.get("reason") or ((payload.get("error") or {}).get("message") if isinstance(payload.get("error"), dict) else None),
        "fetchBackend": str(payload.get("fetchBackend") or "node-cli"),
        "cachePath": payload.get("cachePath"),
        "textHash": payload.get("textHash"),
        "title": payload.get("title"),
    }
    if completed.returncode not in {0, 2, 3, 4} and result["liveStatus"] == "ok":
        result["liveStatus"] = "output-contract-error"
        result["reason"] = stderr or f"unexpected-exit-{completed.returncode}"
    return result


def check_source_live(
    policy: SourcePolicy,
    timeout_seconds: float,
    max_read_bytes: int,
    fetch_backend: str,
    cli_path: Path,
) -> dict[str, Any]:
    if fetch_backend == "python":
        return check_source_live_python(policy, timeout_seconds=timeout_seconds, max_read_bytes=max_read_bytes)
    if fetch_backend == "node-cli":
        return check_source_live_node_cli(
            policy,
            timeout_seconds=timeout_seconds,
            max_read_bytes=max_read_bytes,
            cli_path=cli_path,
        )

    node_result = check_source_live_node_cli(
        policy,
        timeout_seconds=timeout_seconds,
        max_read_bytes=max_read_bytes,
        cli_path=cli_path,
    )
    if node_result.get("liveStatus") in {"ok", "http-error", "invalid-url", "pending-url", "manual-only"}:
        return node_result
    python_result = check_source_live_python(policy, timeout_seconds=timeout_seconds, max_read_bytes=max_read_bytes)
    python_result["fallbackFrom"] = node_result.get("fetchBackend") or "node-cli"
    python_result["fallbackReason"] = node_result.get("reason") or node_result.get("liveStatus")
    return python_result


def build_missing_evidence_list(scoreboard_json: dict[str, Any], max_rows: int) -> list[dict[str, Any]]:
    rows = list((scoreboard_json or {}).get("rows") or [])
    filtered = [
        row
        for row in rows
        if int(row.get("externalEvidenceCount") or 0) <= 0
        and str(row.get("reviewGrade") or "") in {"B", "C", "D"}
    ]
    filtered.sort(
        key=lambda item: (
            float(item.get("priorityScore") or 0.0),
            float(item.get("worldbuildingUsabilityScore") or 0.0),
            float(item.get("historicalTrustScore") or 0.0),
        ),
        reverse=True,
    )
    output: list[dict[str, Any]] = []
    for row in filtered[: max(max_rows, 0)]:
        output.append(
            {
                "generalId": str(row.get("generalId") or ""),
                "displayName": str(row.get("displayName") or row.get("generalId") or ""),
                "gender": str(row.get("gender") or ""),
                "reviewGrade": str(row.get("reviewGrade") or ""),
                "nextLane": str(row.get("nextLane") or ""),
                "priorityScore": float(row.get("priorityScore") or 0.0),
            }
        )
    return output


def pick_suggested_generals(
    gaps: list[dict[str, Any]],
    source_layer: str,
    max_count: int = 5,
) -> list[str]:
    if max_count <= 0:
        return []
    pool = list(gaps)
    if source_layer in {"romance", "worldbuilding", "game", "folklore", "encyclopedia"}:
        female_first = [item for item in pool if item.get("gender") == "female"]
        others = [item for item in pool if item.get("gender") != "female"]
        pool = female_first + others
    return [str(item.get("generalId") or "") for item in pool[:max_count] if str(item.get("generalId") or "")]


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# 3kweb-check External Evidence Validation",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Fetch Live: `{summary['inputs']['fetchLive']}`",
        f"- Approved Only: `{summary['inputs']['approvedOnly']}`",
        f"- Fetch Backend Requested: `{summary['inputs']['fetchBackendRequested']}`",
        f"- Source Count: `{summary['metrics']['sourceCount']}`",
        f"- Reachable Source Count: `{summary['metrics']['reachableSourceCount']}`",
        f"- Pending URL Count: `{summary['metrics']['pendingUrlCount']}`",
        f"- Missing-Evidence Generals: `{summary['metrics']['missingEvidenceGeneralCount']}`",
        "",
    ]
    warnings = list(summary.get("warnings") or [])
    if warnings:
        lines.extend(["## Warnings", ""])
        for warning in warnings:
            lines.append(f"- {warning}")
        lines.append("")
    lines.extend(
        [
            "## Source Health",
            "",
            "| Source | Layer | Adapter | URL Status | Live Status | Backend | Manual Seeds | Relevance |",
            "|---|---|---|---|---|---|---:|---|",
        ]
    )
    for row in summary.get("sourceChecks") or []:
        lines.append(
            "| `{sid}` | `{layer}` | `{adapter}` | `{url_status}` | `{live}` | `{backend}` | `{seed_count}` | `{rel}` |".format(
                sid=row.get("sourceId"),
                layer=row.get("sourceLayer"),
                adapter=row.get("adapterType"),
                url_status=row.get("urlStatus"),
                live=row.get("liveStatus"),
                backend=row.get("fetchBackend") or "-",
                seed_count=row.get("manualEvidenceCount"),
                rel=row.get("relevanceLevel") or "-",
            )
        )
    lines.extend(
        [
            "",
            "## Missing-Evidence Top Generals",
            "",
            "| General | Name | Gender | Grade | Lane | Priority |",
            "|---|---|---|---|---|---:|",
        ]
    )
    for row in summary.get("missingEvidenceGenerals") or []:
        lines.append(
            "| `{gid}` | {name} | `{gender}` | `{grade}` | `{lane}` | `{score}` |".format(
                gid=row.get("generalId"),
                name=row.get("displayName"),
                gender=row.get("gender"),
                grade=row.get("reviewGrade"),
                lane=row.get("nextLane"),
                score=row.get("priorityScore"),
            )
        )
    lines.extend(
        [
            "",
            "## Suggested Seed Targets",
            "",
            "| Source | Suggested General IDs | Reason |",
            "|---|---|---|",
        ]
    )
    for row in summary.get("seedSuggestions") or []:
        suggested = ", ".join(f"`{item}`" for item in row.get("suggestedGeneralIds") or [])
        lines.append(
            "| `{sid}` | {generals} | {reason} |".format(
                sid=row.get("sourceId"),
                generals=suggested or "-",
                reason=row.get("reason") or "-",
            )
        )
    lines.extend(
        [
            "",
            "## ETL Rule",
            "",
            "- Deterministic fetch/parse/hash first; LLM only acts as reviewer with citation gate.",
            "- `auto` now prefers the Node CLI from agent-cli-factory and falls back to Python urllib only when needed.",
            "- Single source never auto-promotes to A-history; requires cross-family evidence or internal sourceRef corroboration.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    run_id = args.run_id or f"3kweb-check-{utc_stamp()}"
    run_root = resolve_path(Path(args.output_root) / run_id)
    run_root.mkdir(parents=True, exist_ok=True)

    summary_json_path = run_root / "3kweb-check-summary.json"
    summary_md_path = run_root / "3kweb-check-summary.zh-TW.md"
    ensure_overwrite([summary_json_path, summary_md_path], args.overwrite)

    sources_config_path = resolve_path(args.sources_config)
    scoreboard_path = resolve_path(args.scoreboard_json)
    cli_path = resolve_path(args.source_health_cli)
    policies = load_policies(sources_config_path, args.approved_only)
    scoreboard_present = scoreboard_path.exists()
    scoreboard_json = read_json(scoreboard_path)
    missing_evidence_generals = build_missing_evidence_list(scoreboard_json, max_rows=max(args.max_gap_generals, 0))
    warnings: list[str] = []
    if not scoreboard_present:
        warnings.append("scoreboard JSON missing; missing-evidence generals and seed target suggestions may be incomplete")

    source_checks: list[dict[str, Any]] = []
    reachable_count = 0
    pending_url_count = 0
    backend_usage: dict[str, int] = {}
    for policy in policies:
        if policy.base_url.startswith("about:pending-url"):
            url_status = "pending-url"
            pending_url_count += 1
        elif policy.base_url.startswith("about:manual"):
            url_status = "manual-only"
        elif policy.base_url.startswith("http://") or policy.base_url.startswith("https://"):
            url_status = "http-url"
        elif not policy.base_url:
            url_status = "empty-url"
        else:
            url_status = "invalid-url"

        live_check: dict[str, Any]
        if args.fetch_live and not args.dry_run:
            live_check = check_source_live(
                policy,
                timeout_seconds=max(args.timeout_seconds, 1.0),
                max_read_bytes=max(args.max_read_bytes, 10_000),
                fetch_backend=args.fetch_backend,
                cli_path=cli_path,
            )
        else:
            live_check = {"liveStatus": "skipped-live-fetch", "reason": "fetch-live-disabled-or-dry-run", "fetchBackend": "skipped"}

        live_status = str(live_check.get("liveStatus") or "")
        fetch_backend_used = str(live_check.get("fetchBackend") or "unknown")
        backend_usage[fetch_backend_used] = backend_usage.get(fetch_backend_used, 0) + 1
        if live_status == "ok":
            reachable_count += 1

        source_checks.append(
            {
                "sourceId": policy.source_id,
                "status": policy.status,
                "adapterType": policy.adapter_type,
                "sourceFamily": policy.source_family,
                "sourceLayer": policy.source_layer,
                "trustTier": policy.trust_tier,
                "baseUrl": policy.base_url,
                "urlStatus": url_status,
                "liveStatus": live_status,
                "httpStatus": live_check.get("httpStatus"),
                "contentType": live_check.get("contentType"),
                "bytesRead": live_check.get("bytesRead"),
                "termHitCount": live_check.get("termHitCount"),
                "relevanceLevel": live_check.get("relevanceLevel"),
                "snippet": live_check.get("snippet"),
                "reason": live_check.get("reason"),
                "fetchBackend": fetch_backend_used,
                "fallbackFrom": live_check.get("fallbackFrom"),
                "fallbackReason": live_check.get("fallbackReason"),
                "cachePath": live_check.get("cachePath"),
                "textHash": live_check.get("textHash"),
                "title": live_check.get("title"),
                "manualEvidenceCount": policy.manual_evidence_count,
                "canonicalWrites": False,
            }
        )

    seed_suggestions: list[dict[str, Any]] = []
    for row in source_checks:
        sid = str(row.get("sourceId") or "")
        if int(row.get("manualEvidenceCount") or 0) > 0:
            continue
        suggested = pick_suggested_generals(
            gaps=missing_evidence_generals,
            source_layer=str(row.get("sourceLayer") or ""),
            max_count=5,
        )
        reason = "source has no manual seeds; recommend adding evidence seeds for high-priority gaps"
        if str(row.get("urlStatus")) == "pending-url":
            reason = "pending-url placeholder; confirm exact URL first, then add seeds"
        seed_suggestions.append(
            {
                "sourceId": sid,
                "sourceLayer": row.get("sourceLayer"),
                "suggestedGeneralIds": suggested,
                "reason": reason,
                "canonicalWrites": False,
            }
        )

    summary = {
        "version": "1.1.0",
        "generatedAt": utc_now(),
        "mode": "3kweb-check",
        "canonicalWrites": False,
        "runId": run_id,
        "inputs": {
            "sourcesConfigPath": repo_relative(sources_config_path),
            "scoreboardJsonPath": repo_relative(scoreboard_path),
            "scoreboardPresent": scoreboard_present,
            "sourceHealthCliPath": repo_relative(cli_path),
            "approvedOnly": bool(args.approved_only),
            "fetchLive": bool(args.fetch_live and not args.dry_run),
            "dryRun": bool(args.dry_run),
            "fetchBackendRequested": args.fetch_backend,
        },
        "outputs": {
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_md_path),
        },
        "metrics": {
            "sourceCount": len(source_checks),
            "reachableSourceCount": reachable_count,
            "pendingUrlCount": pending_url_count,
            "missingEvidenceGeneralCount": len(missing_evidence_generals),
            "seedSuggestionCount": len(seed_suggestions),
            "backendUsage": backend_usage,
        },
        "warnings": warnings,
        "sourceChecks": source_checks,
        "missingEvidenceGenerals": missing_evidence_generals,
        "seedSuggestions": seed_suggestions,
    }
    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_markdown(summary), encoding="utf-8")

    print(f"[run_3kweb_check] wrote {summary_json_path}")
    print(f"[run_3kweb_check] wrote {summary_md_path}")
    print(
        "[run_3kweb_check] "
        f"runId={run_id} sources={len(source_checks)} reachable={reachable_count} "
        f"pendingUrl={pending_url_count} backend={args.fetch_backend} canonicalWrites=false"
    )


if __name__ == "__main__":
    main()
