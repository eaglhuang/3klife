from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    expected_governance_files,
    load_full_roster_runner_governance,
    load_progress_runner_governance,
    load_stable_bootstrap_governance,
    read_governance_json,
    read_governance_jsonl,
    resolve_governance_root,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Sanguo governance Rule/Policy/Schema/Catalog data.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--dry-run-report", action="store_true", help="Print file-to-consumer mapping without writing files.")
    return parser.parse_args()


def validate_expected_files(root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in expected_governance_files():
        path = root / item["section"] / item["file"]
        if not path.exists():
            raise SanguoGovernanceError(f"governance file missing: {path}")
        if path.suffix == ".jsonl":
            payload = read_governance_jsonl(path)
            row_count = len(payload)
        else:
            payload = read_governance_json(path)
            row_count = 1
        rows.append({**item, "path": str(path), "rowCount": row_count})
    return rows


def validate_minimum_shapes(root: Path) -> dict[str, Any]:
    stable = load_stable_bootstrap_governance(root)
    full = load_full_roster_runner_governance(root)
    progress = load_progress_runner_governance(root)
    schema = read_governance_json(root / "schemas/schema-stable-bootstrap-payload.json")

    if not stable["hardRelationshipSpecs"]:
        raise SanguoGovernanceError("hardRelationshipSpecs cannot be empty")
    if not stable["knownFemaleNames"]:
        raise SanguoGovernanceError("knownFemaleNames cannot be empty")
    if not full.get("transientHttpStatus"):
        raise SanguoGovernanceError("policy-full-roster-runner transientHttpStatus cannot be empty")
    if not progress["locationRule"].get("fromCuePattern"):
        raise SanguoGovernanceError("rule-location-extraction fromCuePattern cannot be empty")
    if "summary" not in (schema.get("requiredTopLevelKeys") or []):
        raise SanguoGovernanceError("schema-stable-bootstrap-payload must require summary")

    return {
        "hardRelationshipSpecCount": len(stable["hardRelationshipSpecs"]),
        "factionTimelineSpecCount": len(stable["factionTimelineSpecs"]),
        "eventLocationSeedCount": len(stable["eventLocationSeeds"]),
        "socialRoleSeedCount": len(stable["socialRoleSeeds"]),
        "knownFemaleNameCount": len(stable["knownFemaleNames"]),
        "commonRelationLabelCount": len(stable["commonRelationLabels"]),
        "femaleProfileOverrideCount": len(stable["femaleProfileOverrides"]),
        "transientHttpStatusCount": len(full.get("transientHttpStatus") or []),
        "rootCauseGroupCount": len(progress["policy"].get("rootCauseGroups") or []),
    }


def render_report(rows: list[dict[str, Any]], summary: dict[str, Any]) -> str:
    consumers = Counter(row["consumer"] for row in rows)
    payload = {
        "status": "ok",
        "summary": summary,
        "consumerCounts": dict(sorted(consumers.items())),
        "files": rows,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def main() -> int:
    args = parse_args()
    root = resolve_governance_root(args.governance_root)
    rows = validate_expected_files(root)
    summary = validate_minimum_shapes(root)
    print(render_report(rows, summary))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SanguoGovernanceError as exc:
        print(f"[validate_sanguo_governance] {exc}", file=sys.stderr)
        raise SystemExit(1)
