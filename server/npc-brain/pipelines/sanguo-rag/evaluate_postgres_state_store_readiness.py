from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    default_governance_root,
    load_postgres_state_store_evaluation_policy,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate whether Sanguo-RAG state is ready for PostgreSQL state store migration.")
    parser.add_argument("--governance-root", default=str(default_governance_root()), help="Sanguo governance root")
    parser.add_argument("--postgres-state-policy", default=None, help="Override policy-postgres-state-store-evaluation.json path")
    parser.add_argument("--run-history-row-count", type=int, default=0)
    parser.add_argument("--review-state-row-count", type=int, default=0)
    parser.add_argument("--incremental-state-file-count", type=int, default=0)
    parser.add_argument("--average-resume-scan-seconds", type=float, default=0.0)
    parser.add_argument("--manifest-fanout-count", type=int, default=0)
    parser.add_argument("--output", default="", help="Optional JSON report output path")
    return parser.parse_args()


def decide(policy: dict[str, Any], metrics: dict[str, float | int]) -> tuple[str, list[str]]:
    thresholds = policy.get("recommendationThresholds") if isinstance(policy.get("recommendationThresholds"), dict) else {}
    triggered: list[str] = []
    for key, value in metrics.items():
        threshold = thresholds.get(key)
        if threshold is not None and float(value) >= float(threshold):
            triggered.append(key)
    if len(triggered) >= 3:
        return "migrate-state-store", triggered
    if triggered:
        return "prepare-postgres-adapter", triggered
    return "stay-jsonl-manifest", triggered


def main() -> None:
    args = parse_args()
    try:
        policy = load_postgres_state_store_evaluation_policy(
            args.governance_root,
            postgres_state_policy=args.postgres_state_policy,
        )
    except SanguoGovernanceError as exc:
        print(f"[evaluate_postgres_state_store_readiness] governance error: {exc}")
        raise SystemExit(2) from None

    metrics = {
        "runHistoryRowCount": args.run_history_row_count,
        "reviewStateRowCount": args.review_state_row_count,
        "incrementalStateFileCount": args.incremental_state_file_count,
        "averageResumeScanSeconds": args.average_resume_scan_seconds,
        "manifestFanoutCount": args.manifest_fanout_count,
    }
    recommendation, triggered = decide(policy, metrics)
    payload = {
        "generatedAt": utc_now(),
        "status": "ok",
        "recommendation": recommendation,
        "triggeredThresholds": triggered,
        "metrics": metrics,
        "guards": policy.get("postgresMigrationGuards") or [],
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
        print(f"[evaluate_postgres_state_store_readiness] wrote {output}")
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
