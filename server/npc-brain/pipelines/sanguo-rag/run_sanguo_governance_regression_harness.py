from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_governance_regression_harness_policy,
    load_governance_validation_stabilization_policy,
    resolve_governance_root,
)
from validate_sanguo_governance import validate_expected_files, validate_minimum_shapes


PIPELINE_ROOT = Path(__file__).resolve().parent


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Sanguo governance regression harness sensors.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--regression-harness-policy", default=None, help="Override policy-governance-regression-harness.json path")
    parser.add_argument("--validation-policy", default=None, help="Override policy-governance-validation-stabilization.json path")
    parser.add_argument("--output-root", default=None, help="Output root for harness reports")
    parser.add_argument("--strict-phase-plans", action="store_true", help="Fail if a planned phase document is missing")
    parser.add_argument("--strict-validation-coverage", action="store_true", help="Fail if required validation summary keys are missing")
    parser.add_argument("--strict-fixtures", action="store_true", help="Fail if fixture manifests or referenced files are missing")
    parser.add_argument("--no-write", action="store_true", help="Print JSON payload without writing report files")
    return parser.parse_args()


def phase_plan_matrix(policy: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in policy.get("phaseMatrix") or []:
        if not isinstance(row, dict):
            continue
        plan_name = str(row.get("plan") or "").strip()
        plan_path = PIPELINE_ROOT / plan_name
        rows.append(
            {
                "phase": row.get("phase"),
                "name": row.get("name"),
                "plan": plan_name,
                "planExists": plan_path.exists(),
            }
        )
    return rows


def validation_coverage(policy: dict[str, Any], shape_summary: dict[str, Any]) -> dict[str, Any]:
    required = [str(item).strip() for item in policy.get("requiredMinimumShapeSummaryKeys") or [] if str(item).strip()]
    present = set(shape_summary.keys())
    missing = [item for item in required if item not in present]
    return {
        "requiredSummaryKeys": required,
        "requiredSummaryKeyCount": len(required),
        "coveredSummaryKeyCount": len(required) - len(missing),
        "missingSummaryKeys": missing,
        "missingSummaryKeyCount": len(missing),
    }


def fixture_matrix(policy: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in policy.get("fixtureManifests") or []:
        if not isinstance(item, dict):
            continue
        manifest_path = PIPELINE_ROOT / str(item.get("path") or "")
        row: dict[str, Any] = {
            "id": str(item.get("id") or ""),
            "path": manifest_path.as_posix(),
            "manifestExists": manifest_path.exists(),
            "files": [],
            "missingFiles": [],
        }
        if not manifest_path.exists():
            row["missingFiles"].append(manifest_path.name)
            rows.append(row)
            continue
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            row["manifestError"] = str(exc)
            rows.append(row)
            continue
        for file_item in manifest.get("files") or []:
            if not isinstance(file_item, dict):
                continue
            relative_path = str(file_item.get("path") or "")
            file_path = manifest_path.parent / relative_path
            file_row = {
                "path": relative_path,
                "purpose": str(file_item.get("purpose") or ""),
                "exists": file_path.exists(),
            }
            row["files"].append(file_row)
            if not file_row["exists"]:
                row["missingFiles"].append(relative_path)
        rows.append(row)
    return rows


def render_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "# Sanguo Governance Regression Harness",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Status: `{payload['status']}`",
        f"- Expected Governance Files: `{payload['summary']['expectedFileCount']}`",
        f"- Phase Plans: `{payload['summary']['phasePlanCount']}`",
        f"- Missing Phase Plans: `{payload['summary']['missingPhasePlanCount']}`",
        f"- Missing Validation Summary Keys: `{payload['summary']['missingValidationSummaryKeyCount']}`",
        f"- Fixture Manifests: `{payload['summary']['fixtureManifestCount']}`",
        f"- Missing Fixture Files: `{payload['summary']['missingFixtureFileCount']}`",
        "",
        "## Phase Matrix",
        "",
        "| Phase | Name | Plan | Exists |",
        "| --- | --- | --- | --- |",
    ]
    for row in payload["phaseMatrix"]:
        lines.append(f"| `{row['phase']}` | {row['name']} | `{row['plan']}` | `{row['planExists']}` |")
    lines.extend(["", "## Validation Coverage", ""])
    coverage = payload["validationCoverage"]
    lines.append(f"- Required Summary Keys: `{coverage['requiredSummaryKeyCount']}`")
    lines.append(f"- Covered Summary Keys: `{coverage['coveredSummaryKeyCount']}`")
    if coverage["missingSummaryKeys"]:
        for key in coverage["missingSummaryKeys"]:
            lines.append(f"- Missing: `{key}`")
    else:
        lines.append("- Missing: `none`")
    lines.extend(["", "## Fixture Matrix", ""])
    for row in payload["fixtureMatrix"]:
        status = "ok" if row["manifestExists"] and not row["missingFiles"] and not row.get("manifestError") else "missing"
        lines.append(f"- `{row['id']}`: `{status}` {row['path']}")
        if row.get("manifestError"):
            lines.append(f"- Manifest Error: `{row['manifestError']}`")
        for missing in row["missingFiles"]:
            lines.append(f"- Missing Fixture File: `{missing}`")
    lines.extend(["", "## Governance Consumers", ""])
    for row in payload["expectedGovernanceFiles"]:
        lines.append(f"- `{row['section']}/{row['file']}` -> {row['consumer']}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    try:
        root = resolve_governance_root(args.governance_root)
        policy = load_governance_regression_harness_policy(
            root,
            regression_harness_policy=args.regression_harness_policy,
        )
        validation_policy = load_governance_validation_stabilization_policy(
            root,
            governance_validation_policy=args.validation_policy,
        )
        expected_rows = validate_expected_files(root)
        shape_summary = validate_minimum_shapes(root)
    except SanguoGovernanceError as exc:
        print(f"[run_sanguo_governance_regression_harness] governance error: {exc}")
        raise SystemExit(2) from None

    phase_rows = phase_plan_matrix(policy)
    missing_phase_plans = [row for row in phase_rows if not row["planExists"]]
    coverage = validation_coverage(validation_policy, shape_summary)
    fixture_rows = fixture_matrix(policy)
    missing_fixture_count = sum(len(row["missingFiles"]) for row in fixture_rows)
    fixture_error_count = sum(1 for row in fixture_rows if row.get("manifestError"))
    status = "ok"
    if args.strict_phase_plans and missing_phase_plans:
        status = "failed"
    if args.strict_validation_coverage and coverage["missingSummaryKeys"]:
        status = "failed"
    if args.strict_fixtures and (missing_fixture_count or fixture_error_count):
        status = "failed"
    payload = {
        "generatedAt": utc_now(),
        "status": status,
        "summary": {
            "expectedFileCount": len(expected_rows),
            "phasePlanCount": len(phase_rows),
            "missingPhasePlanCount": len(missing_phase_plans),
            "missingValidationSummaryKeyCount": coverage["missingSummaryKeyCount"],
            "fixtureManifestCount": len(fixture_rows),
            "missingFixtureFileCount": missing_fixture_count,
            "fixtureManifestErrorCount": fixture_error_count,
            "minimumShapeMetricCount": len(shape_summary),
        },
        "sensors": policy.get("requiredSensorNames") or [],
        "phaseMatrix": phase_rows,
        "validationCoverage": coverage,
        "fixtureMatrix": fixture_rows,
        "expectedGovernanceFiles": expected_rows,
        "minimumShapeSummary": shape_summary,
    }
    if args.no_write:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        output_root = Path(args.output_root or policy.get("defaultOutputRoot") or "local/codex-smoke/governance-regression")
        output_root.mkdir(parents=True, exist_ok=True)
        (output_root / "governance-regression-harness.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (output_root / "governance-regression-harness.md").write_text(render_markdown(payload), encoding="utf-8")
        print(f"[run_sanguo_governance_regression_harness] wrote {output_root}")
    if status != "ok":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
