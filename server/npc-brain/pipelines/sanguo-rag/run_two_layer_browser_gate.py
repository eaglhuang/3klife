from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, pipeline_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCES_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_SCOREBOARD_JSON = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard/full-roster-scoreboard.json")
DEFAULT_SOURCE_HEALTH_SCRIPT = PIPELINE_ROOT / "run_3kweb_check.py"
DEFAULT_BROWSER_FALLBACK_RULES = pipeline_config_path(REPO_ROOT, "browser-fallback-adapters.json")

FAIL_STATUSES = {"http-error", "url-error", "timeout", "fetch-error", "output-contract-error", "backend-unavailable", "network-blocked"}
PASS_STATUSES = {"ok", "manual-only"}

BUILTIN_403_FALLBACK_RULES: dict[str, dict[str, Any]] = {
    "ctext-sanguozhi": {
        "adapterType": "browser-static-html",
        "autoApply": True,
        "priority": "high",
        "suggestion": "HTTP 403 detected. Auto-route to browser-static-html fallback and keep source layer as history.",
        "rationale": "ctext commonly blocks default CLI user-agent and needs browser-like fetch semantics.",
    },
    "rekowiki-musou-character-list": {
        "adapterType": "browser-static-html",
        "autoApply": True,
        "priority": "high",
        "suggestion": "HTTP 403 detected. Auto-route to browser-static-html fallback and keep source layer as game/worldbuilding.",
        "rationale": "fandom mirrors frequently reject non-browser clients with 403.",
    },
    "chiculture-romance-vs-history": {
        "adapterType": "browser-static-html",
        "autoApply": True,
        "priority": "high",
        "suggestion": "HTTP 403 detected. Auto-route to browser-static-html fallback with strict citation extraction.",
        "rationale": "site may enforce anti-bot policies for non-browser requests.",
    },
}


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Two-layer browser gate: run CLI precheck first, escalate failed sources to browser fallback queue."
    )
    parser.add_argument("--run-id", default=None, help="Output run id. Defaults to two-layer-browser-gate-<UTC>.")
    parser.add_argument("--source-health-run-id", default=None, help="Optional run id for the internal 3kweb-check step.")
    parser.add_argument("--source-health-summary", default=None, help="Use an existing 3kweb-check-summary.json instead of launching run_3kweb_check.py.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output root path.")
    parser.add_argument("--sources-config", default=str(DEFAULT_SOURCES_CONFIG), help="External source config JSON path.")
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON), help="Scoreboard JSON path.")
    parser.add_argument("--fetch-backend", choices=("auto", "node-cli", "python"), default="auto", help="3kweb-check fetch backend.")
    parser.add_argument("--source-health-cli", default="tools_node/agent-clis/3klife-source-health.js", help="Node CLI path for source health fetch.")
    parser.add_argument("--browser-fallback-rules", default=str(DEFAULT_BROWSER_FALLBACK_RULES), help="Browser fallback adapter rules JSON path.")
    parser.add_argument("--timeout-seconds", type=float, default=12.0, help="HTTP timeout seconds for precheck.")
    parser.add_argument("--max-gap-generals", type=int, default=60, help="Forwarded to 3kweb-check.")
    parser.add_argument("--include-non-approved", action="store_true", help="Include non-approved sources in precheck.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting run outputs.")
    parser.add_argument("--dry-run", action="store_true", help="Skip live fetch in precheck.")
    return parser.parse_args()


def classify_row(row: dict[str, Any]) -> str:
    status = str(row.get("liveStatus") or "")
    url_status = str(row.get("urlStatus") or "")
    if status in PASS_STATUSES:
        return "cli-pass"
    if status in FAIL_STATUSES and url_status == "http-url":
        return "needs-browser"
    return "not-escalated"


def normalize_fallback_rules(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    normalized: dict[str, dict[str, Any]] = {}
    raw_rules = payload.get("rules")
    if isinstance(raw_rules, dict):
        for source_id, value in raw_rules.items():
            if isinstance(value, dict):
                normalized[str(source_id)] = dict(value)
        return normalized
    if isinstance(raw_rules, list):
        for row in raw_rules:
            if not isinstance(row, dict):
                continue
            source_id = str(row.get("sourceId") or "").strip()
            if not source_id:
                continue
            normalized[source_id] = dict(row)
    return normalized


def load_fallback_rules(path_text: str) -> dict[str, dict[str, Any]]:
    rules: dict[str, dict[str, Any]] = {key: dict(value) for key, value in BUILTIN_403_FALLBACK_RULES.items()}
    rules_path = resolve_path(path_text)
    if not rules_path.exists():
        return rules
    payload = read_json(rules_path)
    for source_id, value in normalize_fallback_rules(payload).items():
        current = dict(rules.get(source_id) or {})
        current.update(value)
        rules[source_id] = current
    return rules


def default_browser_suggestion(row: dict[str, Any]) -> str:
    status = str(row.get("liveStatus") or "")
    reason = str(row.get("reason") or "")
    if status == "http-error" and "403" in reason:
        return "HTTP 403 detected. Escalate to browser fallback adapter queue."
    if status == "url-error":
        return "URL parse/TLS issue detected. Retry with browser fallback adapter."
    if status in {"timeout", "fetch-error", "network-blocked"}:
        return "Network-level issue detected. Retry via browser fallback or alternate runtime."
    if status == "backend-unavailable":
        return "CLI backend unavailable. Route to browser fallback adapter."
    return "Unknown failure class. Route to browser fallback queue for deterministic retry."


def enrich_browser_row(row: dict[str, Any], rules: dict[str, dict[str, Any]]) -> dict[str, Any]:
    enriched = dict(row)
    source_id = str(row.get("sourceId") or "")
    rule = rules.get(source_id) or {}
    suggestion = str(rule.get("suggestion") or "").strip() or default_browser_suggestion(row)
    enriched["suggestion"] = suggestion
    enriched["fallbackAdapterType"] = str(rule.get("adapterType") or "browser-static-html")
    enriched["fallbackAutoApply"] = bool(rule.get("autoApply", False))
    enriched["fallbackPriority"] = str(rule.get("priority") or "normal")
    enriched["fallbackRationale"] = str(rule.get("rationale") or "")
    return enriched


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Two-Layer Browser Gate",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Source Health Run: `{summary['inputs']['sourceHealthRunId']}`",
        f"- CLI Precheck Sources: `{summary['metrics']['sourceCount']}`",
        f"- CLI Pass Count: `{summary['metrics']['cliPassCount']}`",
        f"- Browser Escalation Count: `{summary['metrics']['browserEscalationCount']}`",
        f"- Auto Fallback Count: `{summary['metrics']['autoFallbackCount']}`",
        f"- Not Escalated Count: `{summary['metrics']['notEscalatedCount']}`",
        "",
        "## Layer 1 CLI Pass",
        "",
        "| Source | URL | Live Status | Backend |",
        "|---|---|---|---|",
    ]
    for row in summary.get("cliPassSources") or []:
        lines.append(
            "| `{source}` | {url} | `{status}` | `{backend}` |".format(
                source=row.get("sourceId"),
                url=row.get("baseUrl"),
                status=row.get("liveStatus"),
                backend=row.get("fetchBackend"),
            )
        )

    lines.extend(
        [
            "",
            "## Layer 2 Browser Escalation Queue",
            "",
            "| Source | URL | Live Status | Adapter | Auto | Reason | Suggestion |",
            "|---|---|---|---|---|---|---|",
        ]
    )
    for row in summary.get("browserEscalationQueue") or []:
        lines.append(
            "| `{source}` | {url} | `{status}` | `{adapter}` | `{auto}` | {reason} | {suggestion} |".format(
                source=row.get("sourceId"),
                url=row.get("baseUrl"),
                status=row.get("liveStatus"),
                adapter=row.get("fallbackAdapterType"),
                auto=str(bool(row.get("fallbackAutoApply"))).lower(),
                reason=row.get("reason") or "-",
                suggestion=row.get("suggestion"),
            )
        )

    lines.extend(
        [
            "",
            "## Not Escalated",
            "",
            "| Source | URL Status | Live Status | Reason |",
            "|---|---|---|---|",
        ]
    )
    for row in summary.get("notEscalatedSources") or []:
        lines.append(
            "| `{source}` | `{url_status}` | `{status}` | {reason} |".format(
                source=row.get("sourceId"),
                url_status=row.get("urlStatus"),
                status=row.get("liveStatus"),
                reason=row.get("reason") or "-",
            )
        )
    return "\n".join(lines)


def run_source_health(args: argparse.Namespace, source_health_run_id: str) -> Path:
    if args.source_health_summary:
        return resolve_path(args.source_health_summary)

    script_path = resolve_path(DEFAULT_SOURCE_HEALTH_SCRIPT)
    if not script_path.exists():
        raise FileNotFoundError(
            f"Source health script not found: {script_path}. "
            "Provide --source-health-summary <path/to/3kweb-check-summary.json>."
        )

    command = [
        sys.executable,
        str(script_path),
        "--run-id",
        source_health_run_id,
        "--output-root",
        args.output_root,
        "--sources-config",
        args.sources_config,
        "--scoreboard-json",
        args.scoreboard_json,
        "--fetch-backend",
        args.fetch_backend,
        "--source-health-cli",
        args.source_health_cli,
        "--timeout-seconds",
        str(max(args.timeout_seconds, 1.0)),
        "--max-gap-generals",
        str(max(args.max_gap_generals, 0)),
    ]
    if not args.include_non_approved:
        command.append("--approved-only")
    if args.dry_run:
        command.append("--dry-run")
    else:
        command.append("--fetch-live")
    if args.overwrite:
        command.append("--overwrite")

    completed = subprocess.run(command, cwd=str(REPO_ROOT), capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise RuntimeError(
            "run_3kweb_check failed:\n"
            f"command={' '.join(command)}\n"
            f"stdout={completed.stdout}\n"
            f"stderr={completed.stderr}"
        )
    return resolve_path(Path(args.output_root) / source_health_run_id / "3kweb-check-summary.json")


def main() -> None:
    args = parse_args()
    run_id = args.run_id or f"two-layer-browser-gate-{utc_stamp()}"
    source_health_run_id = args.source_health_run_id or f"{run_id}-precheck"
    run_root = resolve_path(Path(args.output_root) / run_id)
    run_root.mkdir(parents=True, exist_ok=True)

    summary_json_path = run_root / "two-layer-browser-gate-summary.json"
    summary_md_path = run_root / "two-layer-browser-gate-summary.zh-TW.md"
    if (summary_json_path.exists() or summary_md_path.exists()) and not args.overwrite:
        raise FileExistsError("Output already exists. Re-run with --overwrite.")

    source_health_summary_path = run_source_health(args, source_health_run_id=source_health_run_id)
    source_health_summary = read_json(source_health_summary_path)
    source_checks = list(source_health_summary.get("sourceChecks") or [])
    fallback_rules = load_fallback_rules(args.browser_fallback_rules)

    cli_pass_sources: list[dict[str, Any]] = []
    browser_escalation_queue: list[dict[str, Any]] = []
    not_escalated_sources: list[dict[str, Any]] = []
    for row in source_checks:
        lane = classify_row(row)
        if lane == "cli-pass":
            cli_pass_sources.append(row)
            continue
        if lane == "needs-browser":
            browser_escalation_queue.append(enrich_browser_row(row, fallback_rules))
            continue
        not_escalated_sources.append(row)

    auto_fallback_count = sum(1 for row in browser_escalation_queue if row.get("fallbackAutoApply"))

    summary = {
        "version": "1.1.0",
        "generatedAt": utc_now(),
        "mode": "two-layer-browser-gate",
        "runId": run_id,
        "canonicalWrites": False,
        "inputs": {
            "outputRoot": args.output_root,
            "sourceHealthRunId": source_health_run_id,
            "sourceHealthSummaryPath": repo_relative(source_health_summary_path),
            "sourceHealthSummaryInputPath": args.source_health_summary,
            "sourcesConfigPath": args.sources_config,
            "scoreboardJsonPath": args.scoreboard_json,
            "fetchBackend": args.fetch_backend,
            "browserFallbackRulesPath": args.browser_fallback_rules,
            "includeNonApproved": bool(args.include_non_approved),
            "dryRun": bool(args.dry_run),
        },
        "outputs": {
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_md_path),
        },
        "metrics": {
            "sourceCount": len(source_checks),
            "cliPassCount": len(cli_pass_sources),
            "browserEscalationCount": len(browser_escalation_queue),
            "autoFallbackCount": auto_fallback_count,
            "notEscalatedCount": len(not_escalated_sources),
        },
        "cliPassSources": cli_pass_sources,
        "browserEscalationQueue": browser_escalation_queue,
        "notEscalatedSources": not_escalated_sources,
    }

    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_markdown(summary), encoding="utf-8")
    print(f"[run_two_layer_browser_gate] wrote {summary_json_path}")
    print(f"[run_two_layer_browser_gate] wrote {summary_md_path}")
    print(
        "[run_two_layer_browser_gate] "
        f"runId={run_id} sourceCount={len(source_checks)} cliPass={len(cli_pass_sources)} "
        f"browserEscalation={len(browser_escalation_queue)} autoFallback={auto_fallback_count}"
    )


if __name__ == "__main__":
    main()
