from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, pipeline_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_SOURCE_SCHEMA = pipeline_config_path(REPO_ROOT, "source-policy.schema.json")
DEFAULT_BENCHMARK_SCRIPT = PIPELINE_ROOT / "benchmark_external_source.py"

CRAWLABLE_SOURCE_CLASSES = (
    "high-yield-character-site",
    "primary-text-site",
    "community-worldbuilding-site",
)

DEFAULT_CLASS_SAMPLE_SIZE = {
    "high-yield-character-site": 30,
    "primary-text-site": 5,
    "community-worldbuilding-site": 5,
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


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_with_schema_validation(config_path: Path, schema_path: Path) -> tuple[dict[str, Any], list[str], str]:
    payload = read_json(config_path)
    schema = read_json(schema_path)
    errors: list[str] = []
    validator_backend = "custom"

    try:
        from jsonschema import Draft202012Validator  # type: ignore

        validator_backend = "jsonschema+custom"
        validator = Draft202012Validator(schema)
        for issue in validator.iter_errors(payload):
            location = ".".join(str(part) for part in issue.path) or "<root>"
            errors.append(f"{location}: {issue.message}")
    except Exception:
        validator_backend = "custom"

    if not isinstance(payload, dict):
        errors.append("<root>: must be an object")
        return {}, errors, validator_backend
    if not isinstance(payload.get("sources"), list):
        errors.append("sources: must be an array")
        return payload, errors, validator_backend

    required_fields = (
        "sourceId",
        "status",
        "adapterType",
        "sourceClass",
        "sourceFamily",
        "sourceLayer",
        "trustTier",
        "baseUrl",
        "singleSourceMaxGrade",
        "claimScopes",
    )
    for index, row in enumerate(payload["sources"]):
        if not isinstance(row, dict):
            errors.append(f"sources[{index}]: must be an object")
            continue
        for field in required_fields:
            value = row.get(field)
            if isinstance(value, str):
                if not value.strip():
                    errors.append(f"sources[{index}].{field}: must not be empty")
            elif value is None:
                errors.append(f"sources[{index}].{field}: is required")
        source_class = str(row.get("sourceClass") or "").strip()
        adapter_type = str(row.get("adapterType") or "").strip()
        status = str(row.get("status") or "").strip()
        base_url = str(row.get("baseUrl") or "").strip()
        if source_class in CRAWLABLE_SOURCE_CLASSES and adapter_type != "manual_quote":
            if not (base_url.startswith("http://") or base_url.startswith("https://")):
                errors.append(f"sources[{index}].baseUrl: crawlable source must use http(s)")
            if not isinstance(row.get("harvestPolicy"), dict) and not isinstance(row.get("singlePagePolicy"), dict):
                errors.append(f"sources[{index}]: crawlable source must have harvestPolicy or singlePagePolicy")
        if status not in {"approved", "manual_quote"}:
            errors.append(f"sources[{index}].status: unexpected status '{status}'")
    return payload, errors, validator_backend


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


def parse_json_payload(text: str) -> dict[str, Any]:
    raw = text.strip()
    if not raw:
        raise RuntimeError("empty stdout; expected JSON payload")
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    start_indexes = [index for index, char in enumerate(raw) if char == "{"]
    for start in reversed(start_indexes):
        candidate = raw[start:].strip()
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue
    raise RuntimeError("stdout did not contain a valid JSON object payload")


def normalize_string_list(raw_values: Any) -> list[str]:
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
    return normalized


def infer_sample_size(row: dict[str, Any], args: argparse.Namespace) -> int:
    if args.sample_size is not None:
        return max(1, int(args.sample_size))
    source_class = str(row.get("sourceClass") or "").strip()
    default_size = int(DEFAULT_CLASS_SAMPLE_SIZE.get(source_class, 5))
    harvest_policy = row.get("harvestPolicy") if isinstance(row.get("harvestPolicy"), dict) else {}
    harvest_max_pages = harvest_policy.get("maxPages")
    if isinstance(harvest_max_pages, int) and harvest_max_pages > 0:
        return max(1, min(default_size, int(harvest_max_pages)))
    return max(1, default_size)


def select_sources(payload: dict[str, Any], args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = payload.get("sources")
    if not isinstance(rows, list):
        return []
    selected: list[dict[str, Any]] = []
    wanted_ids = set(normalize_string_list(args.source_id))
    wanted_classes = set(normalize_string_list(args.source_class))

    for row in rows:
        if not isinstance(row, dict):
            continue
        source_id = str(row.get("sourceId") or "").strip()
        source_class = str(row.get("sourceClass") or "").strip()
        status = str(row.get("status") or "").strip()
        adapter_type = str(row.get("adapterType") or "").strip()
        base_url = str(row.get("baseUrl") or "").strip()

        if args.approved_only and status != "approved":
            continue
        if not args.include_manual_quote and adapter_type == "manual_quote":
            continue
        if source_class not in CRAWLABLE_SOURCE_CLASSES:
            continue
        if not (base_url.startswith("http://") or base_url.startswith("https://")):
            continue
        if wanted_ids and source_id not in wanted_ids:
            continue
        if wanted_classes and source_class not in wanted_classes:
            continue
        selected.append(row)

    selected.sort(key=lambda item: str(item.get("sourceId") or ""))
    if args.max_sources is not None and args.max_sources > 0:
        return selected[: args.max_sources]
    return selected


def run_single_benchmark(
    *,
    benchmark_script: Path,
    source_config_path: Path,
    output_root: Path,
    parent_run_id: str,
    source_row: dict[str, Any],
    sample_size: int,
    timeout_seconds: float,
    overwrite: bool,
) -> dict[str, Any]:
    source_id = str(source_row.get("sourceId") or "").strip()
    run_id = f"{parent_run_id}-{source_id}"
    command = [
        sys.executable,
        str(benchmark_script),
        "--source-id",
        source_id,
        "--source-config",
        str(source_config_path),
        "--output-root",
        str(output_root),
        "--run-id",
        run_id,
        "--sample-size",
        str(max(1, sample_size)),
        "--timeout-seconds",
        str(max(1.0, timeout_seconds)),
    ]
    if overwrite:
        command.append("--overwrite")
    completed = run_command(command)
    payload = parse_json_payload(completed.stdout)
    if not isinstance(payload, dict):
        raise RuntimeError(f"benchmark output for {source_id} is not an object")
    return payload


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def summarize_rows(benchmarks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for payload in benchmarks:
        source_id = str(payload.get("sourceId") or "")
        source_class = str(payload.get("sourceClass") or "")
        verdict = str(payload.get("finalVerdict") or "reject")
        stage1_failures = normalize_string_list(payload.get("stage1FailureReasons"))
        stage2_failures = normalize_string_list(payload.get("stage2FailureReasons"))
        stage3_failures = normalize_string_list(payload.get("stage3FailureReasons"))
        reasons = stage1_failures + stage2_failures + stage3_failures
        stage2 = payload.get("stage2Harvest") if isinstance(payload.get("stage2Harvest"), dict) else {}
        stage3 = payload.get("stage3Yield") if isinstance(payload.get("stage3Yield"), dict) else {}

        recommendation = "keep"
        if verdict == "reject":
            recommendation = "drop"
        elif verdict == "manual-only":
            recommendation = "manual-only"

        rows.append(
            {
                "sourceId": source_id,
                "sourceClass": source_class,
                "finalVerdict": verdict,
                "recommendation": recommendation,
                "samplePageCount": to_int(stage2.get("samplePageCount"), 0),
                "fetchedPageCount": to_int(stage2.get("fetchedPageCount"), 0),
                "seedCount": to_int(stage3.get("seedCount"), 0),
                "candidateCardCount": to_int(stage3.get("candidateCardCount"), 0),
                "previewCount": to_int(stage3.get("previewCount"), 0),
                "seedPerPage": to_float(stage3.get("seedPerPage"), 0.0),
                "candidateCardPerPage": to_float(stage3.get("candidateCardPerPage"), 0.0),
                "failureReasons": reasons,
                "benchmarkRunRoot": str(((payload.get("paths") or {}).get("runRoot") or "")).strip(),
            }
        )
    rows.sort(key=lambda item: item["sourceId"])
    return rows


def build_metrics(summary_rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_sources = len(summary_rows)
    kept_sources = sum(1 for row in summary_rows if row["recommendation"] == "keep")
    dropped_sources = sum(1 for row in summary_rows if row["recommendation"] == "drop")
    manual_only_sources = sum(1 for row in summary_rows if row["recommendation"] == "manual-only")
    total_fetched_pages = sum(to_int(row.get("fetchedPageCount"), 0) for row in summary_rows)
    total_seeds = sum(to_int(row.get("seedCount"), 0) for row in summary_rows)
    total_candidate_cards = sum(to_int(row.get("candidateCardCount"), 0) for row in summary_rows)
    avg_seed_per_page = (total_seeds / total_fetched_pages) if total_fetched_pages > 0 else 0.0
    avg_card_per_page = (total_candidate_cards / total_fetched_pages) if total_fetched_pages > 0 else 0.0
    return {
        "sourceCount": total_sources,
        "keepCount": kept_sources,
        "dropCount": dropped_sources,
        "manualOnlyCount": manual_only_sources,
        "totalFetchedPageCount": total_fetched_pages,
        "totalSeedCount": total_seeds,
        "totalCandidateCardCount": total_candidate_cards,
        "avgSeedPerPageWeighted": avg_seed_per_page,
        "avgCandidateCardPerPageWeighted": avg_card_per_page,
    }


def render_markdown(summary: dict[str, Any]) -> str:
    rows = summary.get("results") if isinstance(summary.get("results"), list) else []
    metrics = summary.get("metrics") if isinstance(summary.get("metrics"), dict) else {}
    lines = [
        "# Universal Source Crawler Smoke Summary",
        "",
        f"- Run ID: `{summary.get('runId')}`",
        f"- Generated At: `{summary.get('generatedAt')}`",
        f"- Source Config: `{summary.get('inputs', {}).get('sourceConfigPath')}`",
        f"- Source Policy Schema: `{summary.get('inputs', {}).get('sourcePolicySchemaPath')}`",
        f"- canonicalWrites: `{summary.get('canonicalWrites')}`",
        "",
        "## Aggregate",
        "",
        f"- Source Count: `{metrics.get('sourceCount', 0)}`",
        f"- Keep / Drop / Manual-only: `{metrics.get('keepCount', 0)} / {metrics.get('dropCount', 0)} / {metrics.get('manualOnlyCount', 0)}`",
        f"- Total Fetched Pages: `{metrics.get('totalFetchedPageCount', 0)}`",
        f"- Total Seeds: `{metrics.get('totalSeedCount', 0)}`",
        f"- Total Candidate Cards: `{metrics.get('totalCandidateCardCount', 0)}`",
        f"- Weighted Seed/Page: `{to_float(metrics.get('avgSeedPerPageWeighted'), 0.0):.3f}`",
        f"- Weighted Card/Page: `{to_float(metrics.get('avgCandidateCardPerPageWeighted'), 0.0):.3f}`",
        "",
        "## Site ROI",
        "",
        "| Source | Class | Verdict | Recommendation | Fetched | Seeds | Cards | Seed/Page | Card/Page |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in rows:
        lines.append(
            "| `{source}` | `{clazz}` | `{verdict}` | `{recommendation}` | {fetched} | {seeds} | {cards} | {seed_per_page:.3f} | {card_per_page:.3f} |".format(
                source=row.get("sourceId"),
                clazz=row.get("sourceClass"),
                verdict=row.get("finalVerdict"),
                recommendation=row.get("recommendation"),
                fetched=to_int(row.get("fetchedPageCount"), 0),
                seeds=to_int(row.get("seedCount"), 0),
                cards=to_int(row.get("candidateCardCount"), 0),
                seed_per_page=to_float(row.get("seedPerPage"), 0.0),
                card_per_page=to_float(row.get("candidateCardPerPage"), 0.0),
            )
        )
    lines.extend(
        [
            "",
            "## Failure Reasons",
            "",
        ]
    )
    for row in rows:
        reasons = normalize_string_list(row.get("failureReasons"))
        reason_text = ", ".join(reasons) if reasons else "none"
        lines.append(f"- `{row.get('sourceId')}`: {reason_text}")
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Universal external source crawler orchestrator (policy-validated) with smoke benchmark output."
    )
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--source-policy-schema", default=str(DEFAULT_SOURCE_SCHEMA))
    parser.add_argument("--benchmark-script", default=str(DEFAULT_BENCHMARK_SCRIPT))
    parser.add_argument("--source-id", action="append", default=[])
    parser.add_argument("--source-class", action="append", default=[], choices=CRAWLABLE_SOURCE_CLASSES)
    parser.add_argument("--approved-only", action="store_true", default=True)
    parser.add_argument("--include-manual-quote", action="store_true")
    parser.add_argument("--max-sources", type=int, default=3)
    parser.add_argument("--sample-size", type=int, default=None)
    parser.add_argument("--timeout-seconds", type=float, default=20.0)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_id = args.run_id or f"universal-source-crawler-{utc_stamp()}"
    output_root = resolve_path(args.output_root)
    run_root = output_root / run_id
    run_root.mkdir(parents=True, exist_ok=True)

    source_config_path = resolve_path(args.source_config)
    source_schema_path = resolve_path(args.source_policy_schema)
    benchmark_script_path = resolve_path(args.benchmark_script)

    source_payload, validation_errors, validator_backend = load_with_schema_validation(source_config_path, source_schema_path)
    if validation_errors:
        error_path = run_root / "source-policy-validation-errors.json"
        write_json(
            error_path,
            {
                "generatedAt": utc_now(),
                "validatorBackend": validator_backend,
                "sourceConfigPath": repo_relative(source_config_path),
                "sourcePolicySchemaPath": repo_relative(source_schema_path),
                "errorCount": len(validation_errors),
                "errors": validation_errors,
                "canonicalWrites": False,
            },
        )
        raise SystemExit(
            "source policy validation failed with {count} error(s). see {path}".format(
                count=len(validation_errors),
                path=repo_relative(error_path),
            )
        )

    selected_sources = select_sources(source_payload, args)
    if not selected_sources:
        raise SystemExit("no crawlable sources selected after filtering")

    benchmark_payloads: list[dict[str, Any]] = []
    for row in selected_sources:
        source_id = str(row.get("sourceId") or "").strip()
        sample_size = infer_sample_size(row, args)
        payload = run_single_benchmark(
            benchmark_script=benchmark_script_path,
            source_config_path=source_config_path,
            output_root=output_root,
            parent_run_id=run_id,
            source_row=row,
            sample_size=sample_size,
            timeout_seconds=args.timeout_seconds,
            overwrite=args.overwrite,
        )
        payload["requestedSampleSize"] = sample_size
        payload["sourceId"] = source_id
        benchmark_payloads.append(payload)

    summary_rows = summarize_rows(benchmark_payloads)
    metrics = build_metrics(summary_rows)
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "runId": run_id,
        "canonicalWrites": False,
        "inputs": {
            "sourceConfigPath": repo_relative(source_config_path),
            "sourcePolicySchemaPath": repo_relative(source_schema_path),
            "benchmarkScriptPath": repo_relative(benchmark_script_path),
            "requestedSourceIds": normalize_string_list(args.source_id),
            "requestedSourceClasses": normalize_string_list(args.source_class),
            "maxSources": args.max_sources,
            "sampleSizeOverride": args.sample_size,
            "timeoutSeconds": args.timeout_seconds,
            "approvedOnly": bool(args.approved_only),
            "includeManualQuote": bool(args.include_manual_quote),
            "validatorBackend": validator_backend,
        },
        "metrics": metrics,
        "results": summary_rows,
    }

    summary_json_path = run_root / "universal-source-crawler-summary.json"
    summary_md_path = run_root / "universal-source-crawler-summary.zh-TW.md"
    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_markdown(summary), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
