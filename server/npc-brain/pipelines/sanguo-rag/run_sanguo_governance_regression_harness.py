from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_governance_regression_harness_policy,
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
    parser.add_argument("--output-root", default=None, help="Output root for harness reports")
    parser.add_argument("--strict-phase-plans", action="store_true", help="Fail if a planned phase document is missing")
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


def render_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "# Sanguo Governance Regression Harness",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Status: `{payload['status']}`",
        f"- Expected Governance Files: `{payload['summary']['expectedFileCount']}`",
        f"- Phase Plans: `{payload['summary']['phasePlanCount']}`",
        f"- Missing Phase Plans: `{payload['summary']['missingPhasePlanCount']}`",
        "",
        "## Phase Matrix",
        "",
        "| Phase | Name | Plan | Exists |",
        "| --- | --- | --- | --- |",
    ]
    for row in payload["phaseMatrix"]:
        lines.append(f"| `{row['phase']}` | {row['name']} | `{row['plan']}` | `{row['planExists']}` |")
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
        expected_rows = validate_expected_files(root)
        shape_summary = validate_minimum_shapes(root)
    except SanguoGovernanceError as exc:
        print(f"[run_sanguo_governance_regression_harness] governance error: {exc}")
        raise SystemExit(2) from None

    phase_rows = phase_plan_matrix(policy)
    missing_phase_plans = [row for row in phase_rows if not row["planExists"]]
    status = "failed" if args.strict_phase_plans and missing_phase_plans else "ok"
    payload = {
        "generatedAt": utc_now(),
        "status": status,
        "summary": {
            "expectedFileCount": len(expected_rows),
            "phasePlanCount": len(phase_rows),
            "missingPhasePlanCount": len(missing_phase_plans),
            "minimumShapeMetricCount": len(shape_summary),
        },
        "sensors": policy.get("requiredSensorNames") or [],
        "phaseMatrix": phase_rows,
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
