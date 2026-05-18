from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_governance_drift_detection_policy,
    load_governance_operator_summary_policy,
    load_governance_failure_triage_policy,
    load_governance_completion_ledger_policy,
    load_governance_release_readiness_policy,
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
    parser.add_argument("--release-readiness-policy", default=None, help="Override policy-governance-release-readiness.json path")
    parser.add_argument("--drift-detection-policy", default=None, help="Override policy-governance-drift-detection.json path")
    parser.add_argument("--operator-summary-policy", default=None, help="Override policy-governance-operator-summary.json path")
    parser.add_argument("--failure-triage-policy", default=None, help="Override policy-governance-failure-triage.json path")
    parser.add_argument("--completion-ledger-policy", default=None, help="Override policy-governance-completion-ledger.json path")
    parser.add_argument("--output-root", default=None, help="Output root for harness reports")
    parser.add_argument("--strict-phase-plans", action="store_true", help="Fail if a planned phase document is missing")
    parser.add_argument("--strict-validation-coverage", action="store_true", help="Fail if required validation summary keys are missing")
    parser.add_argument("--strict-fixtures", action="store_true", help="Fail if fixture manifests or referenced files are missing")
    parser.add_argument("--strict-release-readiness", action="store_true", help="Fail if release readiness checks are not satisfied")
    parser.add_argument("--strict-drift", action="store_true", help="Fail if governance drift checks are not satisfied")
    parser.add_argument("--strict-triage", action="store_true", help="Fail if governance failure triage has any open item")
    parser.add_argument("--strict-completion-ledger", action="store_true", help="Fail if governance completion ledger has missing plans")
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


def handoff_index(expected_rows: list[dict[str, Any]]) -> dict[str, Any]:
    sections: dict[str, list[dict[str, str]]] = {}
    consumers: dict[str, list[dict[str, str]]] = {}
    for row in expected_rows:
        section = str(row.get("section") or "")
        consumer = str(row.get("consumer") or "")
        file_ref = f"{section}/{row.get('file')}"
        sections.setdefault(section, []).append(
            {"file": str(row.get("file") or ""), "consumer": consumer}
        )
        consumers.setdefault(consumer, []).append(
            {"section": section, "file": str(row.get("file") or ""), "fileRef": file_ref}
        )
    return {
        "sectionCount": len(sections),
        "consumerCount": len(consumers),
        "sections": {key: sorted(value, key=lambda item: item["file"]) for key, value in sorted(sections.items())},
        "consumers": {key: sorted(value, key=lambda item: item["fileRef"]) for key, value in sorted(consumers.items())},
    }


def release_readiness(policy: dict[str, Any], summary: dict[str, Any], handoff: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    for key in policy.get("requiredHarnessSummaryKeys") or []:
        key_text = str(key).strip()
        if not key_text:
            continue
        max_allowed = float((policy.get("maxAllowed") or {}).get(key_text, 0))
        actual = float(summary.get(key_text, 0))
        checks.append(
            {
                "key": key_text,
                "actual": actual,
                "maxAllowed": max_allowed,
                "ok": actual <= max_allowed,
            }
        )
    required_sections = [str(item).strip() for item in policy.get("requiredHandoffSections") or [] if str(item).strip()]
    present_sections = set((handoff.get("sections") or {}).keys())
    missing_sections = [section for section in required_sections if section not in present_sections]
    failed_checks = [row for row in checks if not row["ok"]]
    return {
        "status": "ok" if not failed_checks and not missing_sections else "failed",
        "checkCount": len(checks),
        "failureCount": len(failed_checks),
        "missingSections": missing_sections,
        "missingSectionCount": len(missing_sections),
        "checks": checks,
    }


def governance_drift(policy: dict[str, Any], summary: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    for key, minimum in (policy.get("baselineMinimums") or {}).items():
        key_text = str(key)
        actual = float(summary.get(key_text, 0))
        expected = float(minimum)
        checks.append(
            {
                "key": key_text,
                "direction": "min",
                "actual": actual,
                "expected": expected,
                "ok": actual >= expected,
            }
        )
    for key, maximum in (policy.get("maxAllowed") or {}).items():
        key_text = str(key)
        actual = float(summary.get(key_text, 0))
        expected = float(maximum)
        checks.append(
            {
                "key": key_text,
                "direction": "max",
                "actual": actual,
                "expected": expected,
                "ok": actual <= expected,
            }
        )
    failed = [row for row in checks if not row["ok"]]
    return {
        "status": "ok" if not failed else "failed",
        "checkCount": len(checks),
        "failureCount": len(failed),
        "checks": checks,
    }


def operator_summary(
    policy: dict[str, Any],
    payload_status: str,
    summary: dict[str, Any],
    readiness: dict[str, Any],
    drift: dict[str, Any],
) -> dict[str, Any]:
    section_values = {
        "status": payload_status,
        "releaseReadiness": readiness["status"],
        "governanceDrift": drift["status"],
        "failureTriage": f"{summary.get('governanceFailureTriageItemCount', 0)} items / {summary.get('governanceFailureTriageHighSeverityCount', 0)} high severity",
        "completionLedger": f"{summary.get('governanceCompletionLedgerCompletedCount', 0)} completed / {summary.get('governanceCompletionLedgerPhaseCount', 0)} phases",
        "handoffIndex": f"{summary.get('handoffSectionCount', 0)} sections / {summary.get('handoffConsumerCount', 0)} consumers",
        "fixtureMatrix": f"{summary.get('fixtureManifestCount', 0)} manifests / {summary.get('missingFixtureFileCount', 0)} missing files",
    }
    sections: list[dict[str, str]] = []
    for row in policy.get("summarySections") or []:
        if not isinstance(row, dict):
            continue
        key = str(row.get("key") or "")
        sections.append(
            {
                "key": key,
                "label": str(row.get("label") or key),
                "value": str(section_values.get(key, "")),
            }
        )
    return {
        "audiences": [str(item) for item in policy.get("audiences") or []],
        "sectionCount": len(sections),
        "sections": sections,
    }


def completion_ledger(policy: dict[str, Any], phase_rows: list[dict[str, Any]]) -> dict[str, Any]:
    phase_range = policy.get("phaseRange") if isinstance(policy.get("phaseRange"), dict) else {}
    min_phase = int(phase_range.get("min") or 0)
    max_phase = int(phase_range.get("max") or 0)
    labels = policy.get("statusLabels") if isinstance(policy.get("statusLabels"), dict) else {}
    completed_label = str(labels.get("completed") or "completed")
    missing_label = str(labels.get("missingPlan") or "missing-plan")
    rows: list[dict[str, Any]] = []
    for row in phase_rows:
        phase_value = int(row.get("phase") or 0)
        if phase_value < min_phase or phase_value > max_phase:
            continue
        status = completed_label if row.get("planExists") else missing_label
        rows.append(
            {
                "phase": phase_value,
                "name": row.get("name"),
                "plan": row.get("plan"),
                "status": status,
            }
        )
    missing = [row for row in rows if row["status"] == missing_label]
    return {
        "status": "ok" if not missing else "failed",
        "phaseCount": len(rows),
        "completedCount": len(rows) - len(missing),
        "missingPlanCount": len(missing),
        "rows": rows,
    }


def failure_triage(
    policy: dict[str, Any],
    summary: dict[str, Any],
    coverage: dict[str, Any],
    readiness: dict[str, Any],
    drift: dict[str, Any],
    completion: dict[str, Any],
    fixture_rows: list[dict[str, Any]],
    missing_phase_plans: list[dict[str, Any]],
) -> dict[str, Any]:
    source_values = dict(summary)
    source_values["governanceCompletionLedgerMissingPlanCount"] = completion.get("missingPlanCount", 0)
    examples = {
        "missingPhasePlanCount": [str(row.get("plan") or "") for row in missing_phase_plans[:5]],
        "missingValidationSummaryKeyCount": [str(item) for item in (coverage.get("missingSummaryKeys") or [])[:5]],
        "missingFixtureFileCount": [str(item) for row in fixture_rows for item in (row.get("missingFiles") or [])][:5],
        "fixtureManifestErrorCount": [str(row.get("path") or "") for row in fixture_rows if row.get("manifestError")][:5],
        "releaseReadinessFailureCount": [str(row.get("key") or "") for row in readiness.get("checks", []) if not row.get("ok")][:5],
        "governanceDriftFailureCount": [str(row.get("key") or "") for row in drift.get("checks", []) if not row.get("ok")][:5],
        "governanceCompletionLedgerMissingPlanCount": [str(row.get("plan") or "") for row in completion.get("rows", []) if row.get("status") == "missing-plan"][:5],
    }
    items: list[dict[str, Any]] = []
    for row in policy.get("categories") or []:
        if not isinstance(row, dict):
            continue
        source_metric = str(row.get("sourceMetric") or "")
        count = int(source_values.get(source_metric, 0) or 0)
        if count <= 0:
            continue
        items.append(
            {
                "key": str(row.get("key") or source_metric),
                "sourceMetric": source_metric,
                "count": count,
                "severity": str(row.get("severity") or "medium"),
                "owner": str(row.get("owner") or "governance-maintainer"),
                "action": str(row.get("action") or "Inspect the harness payload."),
                "examples": examples.get(source_metric, []),
            }
        )
    high_severity = [item for item in items if item["severity"] in {"critical", "high"}]
    return {
        "status": "ok" if not items else "attention",
        "itemCount": len(items),
        "highSeverityCount": len(high_severity),
        "items": items,
    }


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
        f"- Handoff Consumers: `{payload['summary']['handoffConsumerCount']}`",
        f"- Release Readiness: `{payload['releaseReadiness']['status']}`",
        f"- Governance Drift: `{payload['governanceDrift']['status']}`",
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
    lines.extend(["", "## Handoff Index", ""])
    for section, rows in payload["handoffIndex"]["sections"].items():
        lines.append(f"- Section `{section}`: `{len(rows)}` files")
    lines.extend(["", "## Release Readiness", ""])
    readiness = payload["releaseReadiness"]
    lines.append(f"- Status: `{readiness['status']}`")
    lines.append(f"- Checks: `{readiness['checkCount']}`")
    lines.append(f"- Failures: `{readiness['failureCount']}`")
    if readiness["missingSections"]:
        for section in readiness["missingSections"]:
            lines.append(f"- Missing Handoff Section: `{section}`")
    else:
        lines.append("- Missing Handoff Section: `none`")
    lines.extend(["", "## Governance Drift", ""])
    drift = payload["governanceDrift"]
    lines.append(f"- Status: `{drift['status']}`")
    lines.append(f"- Checks: `{drift['checkCount']}`")
    lines.append(f"- Failures: `{drift['failureCount']}`")
    lines.extend(["", "## Failure Triage", ""])
    triage = payload["failureTriage"]
    lines.append(f"- Status: `{triage['status']}`")
    lines.append(f"- Items: `{triage['itemCount']}`")
    lines.append(f"- High Severity Items: `{triage['highSeverityCount']}`")
    for item in triage["items"]:
        lines.append(f"- `{item['key']}` severity=`{item['severity']}` owner=`{item['owner']}` count=`{item['count']}`")
    lines.extend(["", "## Completion Ledger", ""])
    ledger = payload["completionLedger"]
    lines.append(f"- Status: `{ledger['status']}`")
    lines.append(f"- Completed: `{ledger['completedCount']}` / `{ledger['phaseCount']}`")
    lines.append(f"- Missing Plans: `{ledger['missingPlanCount']}`")
    lines.extend(["", "## Operator Summary", ""])
    for row in payload["operatorSummary"]["sections"]:
        lines.append(f"- {row['label']}: `{row['value']}`")
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
        release_policy = load_governance_release_readiness_policy(
            root,
            governance_release_readiness_policy=args.release_readiness_policy,
        )
        drift_policy = load_governance_drift_detection_policy(
            root,
            governance_drift_detection_policy=args.drift_detection_policy,
        )
        operator_policy = load_governance_operator_summary_policy(
            root,
            governance_operator_summary_policy=args.operator_summary_policy,
        )
        failure_triage_policy = load_governance_failure_triage_policy(
            root,
            governance_failure_triage_policy=args.failure_triage_policy,
        )
        completion_ledger_policy = load_governance_completion_ledger_policy(
            root,
            governance_completion_ledger_policy=args.completion_ledger_policy,
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
    handoff = handoff_index(expected_rows)
    summary = {
        "expectedFileCount": len(expected_rows),
        "phasePlanCount": len(phase_rows),
        "missingPhasePlanCount": len(missing_phase_plans),
        "missingValidationSummaryKeyCount": coverage["missingSummaryKeyCount"],
        "fixtureManifestCount": len(fixture_rows),
        "missingFixtureFileCount": missing_fixture_count,
        "fixtureManifestErrorCount": fixture_error_count,
        "minimumShapeMetricCount": len(shape_summary),
        "handoffConsumerCount": handoff["consumerCount"],
        "handoffSectionCount": handoff["sectionCount"],
    }
    readiness = release_readiness(release_policy, summary, handoff)
    summary["releaseReadinessCheckCount"] = readiness["checkCount"]
    summary["releaseReadinessFailureCount"] = readiness["failureCount"]
    summary["releaseReadinessMissingSectionCount"] = readiness["missingSectionCount"]
    drift = governance_drift(drift_policy, summary)
    summary["governanceDriftCheckCount"] = drift["checkCount"]
    summary["governanceDriftFailureCount"] = drift["failureCount"]
    completion = completion_ledger(completion_ledger_policy, phase_rows)
    summary["governanceCompletionLedgerPhaseCount"] = completion["phaseCount"]
    summary["governanceCompletionLedgerCompletedCount"] = completion["completedCount"]
    summary["governanceCompletionLedgerMissingPlanCount"] = completion["missingPlanCount"]
    triage = failure_triage(failure_triage_policy, summary, coverage, readiness, drift, completion, fixture_rows, missing_phase_plans)
    summary["governanceFailureTriageItemCount"] = triage["itemCount"]
    summary["governanceFailureTriageHighSeverityCount"] = triage["highSeverityCount"]
    status = "ok"
    if args.strict_phase_plans and missing_phase_plans:
        status = "failed"
    if args.strict_validation_coverage and coverage["missingSummaryKeys"]:
        status = "failed"
    if args.strict_fixtures and (missing_fixture_count or fixture_error_count):
        status = "failed"
    if args.strict_release_readiness and readiness["status"] != "ok":
        status = "failed"
    if args.strict_drift and drift["status"] != "ok":
        status = "failed"
    if args.strict_completion_ledger and completion["status"] != "ok":
        status = "failed"
    if args.strict_triage and triage["itemCount"]:
        status = "failed"
    operator = operator_summary(operator_policy, status, summary, readiness, drift)
    summary["operatorSummarySectionCount"] = operator["sectionCount"]
    payload = {
        "generatedAt": utc_now(),
        "status": status,
        "summary": summary,
        "sensors": policy.get("requiredSensorNames") or [],
        "phaseMatrix": phase_rows,
        "validationCoverage": coverage,
        "fixtureMatrix": fixture_rows,
        "handoffIndex": handoff,
        "releaseReadiness": readiness,
        "governanceDrift": drift,
        "failureTriage": triage,
        "completionLedger": completion,
        "operatorSummary": operator,
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
