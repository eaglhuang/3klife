from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import SanguoGovernanceError, default_governance_root, load_runtime_batch_keyword_readiness_policy


REPO_ROOT = Path(__file__).resolve().parents[4]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")

DEFAULT_GENERAL_ID_FILE = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/top50-runtime-fill-r1.general-ids.txt"
)
DEFAULT_EVENTS_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/"
    "full-roster-highway-r1-continue-r5-r1-precision-a3-rerun1-merged-staged-ready-events.jsonl"
)
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/"
    "full-roster-highway-r1-continue-r5-r1-precision-a3-rerun1-merged-staged-relationship-evidence.jsonl"
)
DEFAULT_CORE_REPORT_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/top50-runtime-fill-r1.json"
)
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles")
DEFAULT_REPORT_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles/top50-runtime-fill-r1-export-report.json"
)
DEFAULT_STABLE_KNOWLEDGE_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json"
)
DEFAULT_SOURCE_EVENT_PACKETS_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets/source-event-packets.jsonl"
)
DEFAULT_GOVERNANCE_ROOT = default_governance_root()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export runtime profiles for many generals with per-general timeout.")
    parser.add_argument("--general-id", action="append", default=[])
    parser.add_argument("--general-id-file", default=str(DEFAULT_GENERAL_ID_FILE))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--source-event-packets", default=str(DEFAULT_SOURCE_EVENT_PACKETS_PATH))
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--core-report", default=str(DEFAULT_CORE_REPORT_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH))
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--per-general-timeout", type=float, default=10.0)
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance root")
    parser.add_argument("--runtime-batch-keyword-policy", default=None, help="Override policy-runtime-batch-keyword-readiness.json path")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(path)


def read_general_ids(path: Path) -> list[str]:
    if not path.exists():
        return []
    ids: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        cleaned = line.split("#", 1)[0].strip()
        if not cleaned:
            continue
        ids.extend(part.strip() for part in cleaned.replace(",", " ").split() if part.strip())
    return ids


def unique(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = str(value or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(key)
    return result


def expected_outputs(output_root: Path, general_id: str) -> list[Path]:
    output_dir = output_root / general_id
    return [
        output_dir / f"{general_id}.persona.json",
        output_dir / f"{general_id}.keywords.json",
        output_dir / f"{general_id}.relationships.json",
        output_dir / f"{general_id}.runtime-summary.md",
    ]


def clip_text(value: str | None, limit: int = 5000) -> str:
    text = value or ""
    if len(text) <= limit:
        return text
    return text[-limit:]


def write_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_export(args: argparse.Namespace, general_id: str) -> dict[str, Any]:
    output_root = Path(args.output_root)
    outputs = expected_outputs(output_root, general_id)
    if args.skip_existing and all(path.exists() for path in outputs):
        return {
            "generalId": general_id,
            "status": "skipped-existing",
            "returnCode": 0,
            "elapsedSec": 0,
            "stdout": "",
            "stderr": "",
        }

    command = [
        sys.executable,
        repo_relative(REPO_ROOT / PIPELINE_ROOT / "export_general_runtime_profile.py"),
        "--general-id",
        general_id,
        "--stable-knowledge",
        args.stable_knowledge,
        "--source-event-packets",
        args.source_event_packets,
        "--events",
        args.events,
        "--relationship-evidence",
        args.relationship_evidence,
        "--core-report",
        args.core_report,
        "--output-root",
        args.output_root,
    ]
    if args.overwrite:
        command.append("--overwrite")
    started = time.monotonic()
    if args.dry_run:
        return {
            "generalId": general_id,
            "status": "dry-run",
            "returnCode": 0,
            "elapsedSec": 0,
            "command": command,
            "stdout": "",
            "stderr": "",
        }
    try:
        completed = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=max(float(args.per_general_timeout), 1.0),
            check=False,
        )
        elapsed = round(time.monotonic() - started, 3)
        return {
            "generalId": general_id,
            "status": "ok" if completed.returncode == 0 else "failed",
            "returnCode": completed.returncode,
            "elapsedSec": elapsed,
            "stdout": clip_text(completed.stdout),
            "stderr": clip_text(completed.stderr),
        }
    except subprocess.TimeoutExpired as exc:
        elapsed = round(time.monotonic() - started, 3)
        return {
            "generalId": general_id,
            "status": "timeout",
            "returnCode": None,
            "elapsedSec": elapsed,
            "stdout": clip_text(exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else exc.stdout),
            "stderr": clip_text(exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else exc.stderr),
        }


def main() -> None:
    args = parse_args()
    try:
        load_runtime_batch_keyword_readiness_policy(
            args.governance_root,
            runtime_batch_keyword_policy=args.runtime_batch_keyword_policy,
        )
    except SanguoGovernanceError as exc:
        print(f"[export_runtime_profiles_batch] governance error: {exc}")
        raise SystemExit(2) from None
    general_ids = unique([*read_general_ids(Path(args.general_id_file)), *args.general_id])
    if args.offset:
        general_ids = general_ids[max(args.offset, 0) :]
    if args.limit and args.limit > 0:
        general_ids = general_ids[: args.limit]
    if not general_ids:
        raise SystemExit("No general ids to export.")

    required_paths = [
        Path(args.stable_knowledge),
        Path(args.source_event_packets),
        Path(args.events),
        Path(args.relationship_evidence),
        Path(args.core_report),
    ]
    missing = [repo_relative(path) for path in required_paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing input files: {missing}")

    report_path = Path(args.report_path)
    results: list[dict[str, Any]] = []
    payload: dict[str, Any] = {
        "generatedAt": utc_now(),
        "mode": "runtime-profile-batch-export",
        "generalIds": general_ids,
        "inputs": {
            "stableKnowledge": args.stable_knowledge,
            "sourceEventPackets": args.source_event_packets,
            "events": args.events,
            "relationshipEvidence": args.relationship_evidence,
            "coreReport": args.core_report,
            "outputRoot": args.output_root,
        },
        "settings": {
            "perGeneralTimeoutSec": args.per_general_timeout,
            "overwrite": args.overwrite,
            "skipExisting": args.skip_existing,
            "dryRun": args.dry_run,
        },
        "summary": {},
        "results": results,
    }

    for index, general_id in enumerate(general_ids, 1):
        result = run_export(args, general_id)
        results.append(result)
        counts: dict[str, int] = {}
        for item in results:
            status = str(item.get("status") or "unknown")
            counts[status] = counts.get(status, 0) + 1
        payload["summary"] = {
            "total": len(general_ids),
            "completed": len(results),
            "statusCounts": counts,
            "okCount": counts.get("ok", 0) + counts.get("skipped-existing", 0),
            "failCount": counts.get("failed", 0) + counts.get("timeout", 0),
        }
        payload["updatedAt"] = utc_now()
        write_report(report_path, payload)
        print(f"[{index}/{len(general_ids)}] {general_id}: {result['status']} ({result['elapsedSec']}s)")

    fail_count = int(payload["summary"].get("failCount") or 0)
    print(f"[export_runtime_profiles_batch] wrote {repo_relative(report_path)}")
    print(f"[export_runtime_profiles_batch] statusCounts={payload['summary']['statusCounts']}")
    if fail_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
