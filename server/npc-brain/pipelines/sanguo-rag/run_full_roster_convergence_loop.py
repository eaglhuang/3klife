from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCES_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run full-roster external-evidence convergence loop: "
            "external refresh -> full pilot -> confidence scoreboard -> optional three-lane."
        )
    )
    parser.add_argument("--run-id", default=None, help="Run id. Defaults to full-roster-convergence-<UTC>.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output root.")
    parser.add_argument("--sources-config", default=str(DEFAULT_SOURCES_CONFIG), help="External evidence source policy JSON path.")
    parser.add_argument("--baseline-manifest", default=None, help="Optional initial baseline manifest passed to three-lane scheduler.")
    parser.add_argument("--top", type=int, default=500, help="Full pilot top generals per round.")
    parser.add_argument("--include-cold", type=int, default=20, help="Full pilot cold-start slots per round.")
    parser.add_argument("--max-rounds", type=int, default=6, help="Maximum convergence rounds.")
    parser.add_argument("--human-pending-limit", type=int, default=20, help="Stop and emit human batch when pending reaches this number.")
    parser.add_argument("--new-evidence-patience", type=int, default=2, help="Stop after N rounds with zero new evidence cards.")
    parser.add_argument("--score-delta-threshold", type=float, default=0.05, help="Worldbuilding average weak-delta threshold.")
    parser.add_argument("--score-delta-patience", type=int, default=2, help="Stop after N weak-delta rounds.")
    parser.add_argument("--same-residual-repeat-limit", type=int, default=2, help="Stop after N repeated residual signatures.")
    parser.add_argument("--failure-rate-limit", type=float, default=0.20, help="Stop if cumulative command failure rate exceeds this.")
    parser.add_argument("--max-wall-time-minutes", type=float, default=None, help="Optional wall-time stop before next round.")
    parser.add_argument("--run-three-lane", action="store_true", help="Also run three-lane scheduler each round.")
    parser.add_argument("--three-lane-continue-on-failure", action="store_true", help="Pass --continue-on-failure to three-lane runs.")
    parser.add_argument("--overwrite", action="store_true", help="Pass --overwrite to child commands.")
    parser.add_argument("--dry-run", action="store_true", help="Do not execute child commands; still write summary artifacts.")
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


def run_command(command: list[str], dry_run: bool) -> dict[str, Any]:
    if dry_run:
        return {
            "command": " ".join(command),
            "returnCode": 0,
            "dryRun": True,
            "stdout": "",
            "stderr": "",
        }
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True)
    return {
        "command": " ".join(command),
        "returnCode": int(result.returncode),
        "dryRun": False,
        "stdout": result.stdout.strip()[-8000:],
        "stderr": result.stderr.strip()[-8000:],
    }


def count_pending_review(path: Path) -> int:
    payload = read_json(path)
    questions = list((payload or {}).get("questions") or [])
    return sum(1 for question in questions if not question.get("answer"))


def calc_residual_signature(scoreboard: dict[str, Any], pending_count: int, new_evidence_count: int) -> str:
    metrics = dict((scoreboard or {}).get("metrics") or {})
    key = json.dumps(
        {
            "gradeCounts": metrics.get("gradeCounts") or {},
            "laneCounts": metrics.get("laneCounts") or {},
            "pendingReviewCount": pending_count,
            "newEvidenceCardCount": new_evidence_count,
            "avgHistorical": metrics.get("avgHistoricalTrustScore"),
            "avgWorld": metrics.get("avgWorldbuildingUsabilityScore"),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def build_rule_proposals(scoreboard: dict[str, Any], pending_count: int) -> list[dict[str, Any]]:
    metrics = dict((scoreboard or {}).get("metrics") or {})
    rows = list((scoreboard or {}).get("rows") or [])
    grade_counts = Counter(metrics.get("gradeCounts") or {})
    lane_counts = Counter(metrics.get("laneCounts") or {})
    proposals: list[dict[str, Any]] = []

    if grade_counts.get("C", 0) + grade_counts.get("D", 0) >= max(20, int(metrics.get("rowCount") or 0) * 0.25):
        proposals.append(
            {
                "proposalId": "rule:external-evidence-discovery-priority",
                "proposalType": "evidence-source",
                "summary": "C/D 佔比偏高，優先擴增外部證據來源與人工核准來源策略。",
                "expectedImpact": "降低 evidence-discovery backlog，提升 B 以上占比。",
            }
        )

    if lane_counts.get("deterministic-repair", 0) >= 20:
        proposals.append(
            {
                "proposalId": "rule:deterministic-repair-batch",
                "proposalType": "location-or-relationship",
                "summary": "deterministic-repair 量偏高，建議新增 location/relationship 補欄位規則。",
                "expectedImpact": "減少同類缺欄位反覆進 human-review。",
            }
        )

    if lane_counts.get("rumination", 0) >= 10:
        proposals.append(
            {
                "proposalId": "rule:rumination-downgrade-audit",
                "proposalType": "rumination",
                "summary": "rumination 候選偏高，建議擴充 A->B 降級審計與 stale-evidence 抽查頻率。",
                "expectedImpact": "避免低可信 A 長期殘留。",
            }
        )

    female_rows = [row for row in rows if row.get("gender") == "female"]
    if female_rows:
        female_world_avg = sum(float(row.get("worldbuildingUsabilityScore") or 0) for row in female_rows) / len(female_rows)
        if female_world_avg < 65:
            proposals.append(
                {
                    "proposalId": "rule:female-worldbuilding-boost",
                    "proposalType": "female-priority",
                    "summary": "女性角色可用分數偏低，建議提高 romance/folklore 外部證據補齊與活動種子擴展。",
                    "expectedImpact": "增加女性角色可用數與互動線完整度。",
                }
            )

    if pending_count >= 20:
        proposals.append(
            {
                "proposalId": "rule:human-batch-throttle",
                "proposalType": "human-gate",
                "summary": "人工待審已達門檻，建議先收斂 deterministic/skill preview 規則再繼續全量輪次。",
                "expectedImpact": "降低人工題海效應，縮短每輪回饋時間。",
            }
        )

    if not proposals:
        proposals.append(
            {
                "proposalId": "rule:steady-continue",
                "proposalType": "steady-progress",
                "summary": "目前分布穩定，建議持續同策略再跑 1-2 輪觀察收斂。",
                "expectedImpact": "維持穩定提升並確認是否進入平台期。",
            }
        )
    return proposals


def render_rule_proposals_markdown(proposals: list[dict[str, Any]]) -> str:
    lines = [
        "# Rule Proposals",
        "",
        "| Proposal ID | Type | Summary | Impact |",
        "|---|---|---|---|",
    ]
    for item in proposals:
        lines.append(
            "| `{pid}` | `{typ}` | {summary} | {impact} |".format(
                pid=item.get("proposalId"),
                typ=item.get("proposalType"),
                summary=item.get("summary"),
                impact=item.get("expectedImpact"),
            )
        )
    lines.append("")
    return "\n".join(lines)


def render_human_batch_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "# Human Review Batch",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Pending Count: `{payload['pendingReviewCount']}`",
        f"- Threshold: `{payload['pendingThreshold']}`",
        f"- canonicalWrites: `{payload['canonicalWrites']}`",
        "",
        "## Batch Questions",
        "",
        "| General | Name | Status | Suggested | Notes |",
        "|---|---|---|---|---|",
    ]
    for item in payload.get("questions") or []:
        lines.append(
            "| `{gid}` | {name} | `{status}` | `{decision}` | {notes} |".format(
                gid=item.get("generalId"),
                name=item.get("displayName") or item.get("generalId"),
                status=item.get("status"),
                decision=item.get("suggestedDecision"),
                notes=" / ".join(item.get("reasons") or []) if item.get("reasons") else "-",
            )
        )
    lines.append("")
    return "\n".join(lines)


def render_summary_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Full Roster Convergence Loop",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Dry Run: `{summary['dryRun']}`",
        f"- Rounds Executed: `{summary['roundsExecuted']}`",
        f"- Stop Reason: `{summary.get('stopReason') or '-'}`",
        f"- Next Action: {summary.get('nextAction') or '-'}",
        "",
        "## Rounds",
        "",
        "| Round | New Evidence | Pending | Avg H-Score | Avg W-Score | Delta W | Three-Lane |",
        "|---|---:|---:|---:|---:|---:|---|",
    ]
    for row in summary.get("rounds") or []:
        lines.append(
            "| `{rid}` | `{e}` | `{p}` | `{h}` | `{w}` | `{d}` | `{t}` |".format(
                rid=row.get("roundId"),
                e=row.get("newEvidenceCardCount"),
                p=row.get("pendingReviewCount"),
                h=row.get("avgHistoricalTrustScore"),
                w=row.get("avgWorldbuildingUsabilityScore"),
                d=row.get("deltaWorldbuildingScore"),
                t=row.get("threeLaneStopReason") or "-",
            )
        )
    lines.extend(
        [
            "",
            "## Output",
            "",
            f"- Baseline Manifest: `{summary['outputs']['baselineManifestPath']}`",
            f"- Rule Proposals: `{summary['outputs']['ruleProposalsMarkdownPath']}`",
            f"- Summary JSON: `{summary['outputs']['summaryJsonPath']}`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    args.run_id = args.run_id or f"full-roster-convergence-{utc_stamp()}"
    run_root = resolve_path(Path(args.output_root) / args.run_id)
    run_root.mkdir(parents=True, exist_ok=True)
    started_at = time.monotonic()

    initial_baseline_manifest = args.baseline_manifest
    active_baseline_manifest = args.baseline_manifest

    rounds: list[dict[str, Any]] = []
    stop_reason: str | None = None
    last_world_score: float | None = None
    weak_delta_count = 0
    zero_evidence_count = 0
    repeated_signature_count = 0
    previous_signature: str | None = None
    command_count = 0
    command_failure_count = 0
    final_paths: dict[str, str] = {}

    for round_index in range(1, max(args.max_rounds, 1) + 1):
        if args.max_wall_time_minutes and args.max_wall_time_minutes > 0:
            if (time.monotonic() - started_at) >= args.max_wall_time_minutes * 60.0:
                stop_reason = "max-wall-time-minutes"
                break

        round_id = f"{args.run_id}-r{round_index}"
        round_root = run_root / round_id
        round_root.mkdir(parents=True, exist_ok=True)

        external_root = round_root / "external-evidence"
        pilot_root = round_root / "full-pilot"
        scoreboard_root = round_root / "scoreboard"
        three_lane_root = round_root / "three-lane"
        external_summary_path = external_root / "external-evidence-summary.json"
        external_cards_path = external_root / "external-evidence-cards.jsonl"
        pilot_report_path = pilot_root / "etl-quality-pilot-report.json"
        review_queue_path = pilot_root / "review-queue.todo.json"
        scoreboard_json_path = scoreboard_root / "full-roster-scoreboard.json"
        scoreboard_markdown_path = scoreboard_root / "full-roster-scoreboard.zh-TW.md"
        shadow_roster_path = scoreboard_root / "shadow-roster-index.json"

        round_commands: list[dict[str, Any]] = []

        external_cmd = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "build_external_evidence_cards.py").resolve()),
            "--sources-config",
            str(resolve_path(args.sources_config)),
            "--output-root",
            repo_relative(external_root),
            "--approved-only",
        ]
        if args.overwrite:
            external_cmd.append("--overwrite")
        if args.dry_run:
            external_cmd.append("--dry-run")
        external_result = run_command(external_cmd, args.dry_run)
        round_commands.append(external_result)

        pilot_cmd = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "run_etl_quality_pilot.py").resolve()),
            "--top",
            str(max(args.top, 1)),
            "--include-cold",
            str(max(args.include_cold, 0)),
            "--output-root",
            repo_relative(pilot_root),
        ]
        if args.overwrite:
            pilot_cmd.append("--overwrite")
        pilot_result = run_command(pilot_cmd, args.dry_run)
        round_commands.append(pilot_result)

        scoreboard_cmd = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "build_full_roster_scoreboard.py").resolve()),
            "--pilot-report",
            repo_relative(pilot_report_path),
            "--external-evidence-cards",
            repo_relative(external_cards_path),
            "--output-root",
            repo_relative(scoreboard_root),
        ]
        if args.overwrite:
            scoreboard_cmd.append("--overwrite")
        scoreboard_result = run_command(scoreboard_cmd, args.dry_run)
        round_commands.append(scoreboard_result)

        three_lane_summary_path: Path | None = None
        three_lane_stop_reason = ""
        three_lane_final_baseline_manifest = ""
        if args.run_three_lane:
            three_lane_run_id = f"{round_id}-three-lane"
            three_lane_cmd = [
                sys.executable,
                str((REPO_ROOT / PIPELINE_ROOT / "run_three_lane_progress_scheduler.py").resolve()),
                "--run-id",
                three_lane_run_id,
                "--output-root",
                repo_relative(three_lane_root),
            ]
            if active_baseline_manifest:
                three_lane_cmd.extend(["--baseline-manifest", active_baseline_manifest])
            if args.three_lane_continue_on_failure:
                three_lane_cmd.append("--continue-on-failure")
            if args.overwrite:
                three_lane_cmd.append("--overwrite")
            if args.dry_run:
                three_lane_cmd.append("--dry-run")
            three_lane_result = run_command(three_lane_cmd, args.dry_run)
            round_commands.append(three_lane_result)
            three_lane_summary_path = three_lane_root / three_lane_run_id / "three-lane-progress-summary.json"
            three_lane_summary = read_json(three_lane_summary_path)
            three_lane_stop_reason = str(three_lane_summary.get("stopReason") or "")
            three_lane_final_baseline_manifest = str(three_lane_summary.get("finalBaselineManifest") or "")
            if three_lane_final_baseline_manifest:
                active_baseline_manifest = three_lane_final_baseline_manifest

        for command in round_commands:
            command_count += 1
            if int(command.get("returnCode") or 0) != 0:
                command_failure_count += 1

        external_summary = read_json(external_summary_path)
        pilot_report = read_json(pilot_report_path)
        scoreboard = read_json(scoreboard_json_path)

        new_evidence_card_count = int(external_summary.get("newEvidenceCardCount") or 0)
        pending_review_count = count_pending_review(review_queue_path)
        metrics = dict((scoreboard or {}).get("metrics") or {})
        avg_historical = float(metrics.get("avgHistoricalTrustScore") or 0.0)
        avg_world = float(metrics.get("avgWorldbuildingUsabilityScore") or 0.0)
        delta_world = None if last_world_score is None else round(avg_world - last_world_score, 4)
        last_world_score = avg_world

        if new_evidence_card_count == 0:
            zero_evidence_count += 1
        else:
            zero_evidence_count = 0

        if delta_world is None:
            weak_delta_count = 0
        elif abs(delta_world) < float(args.score_delta_threshold):
            weak_delta_count += 1
        else:
            weak_delta_count = 0

        residual_signature = calc_residual_signature(scoreboard, pending_review_count, new_evidence_card_count)
        if residual_signature == previous_signature:
            repeated_signature_count += 1
        else:
            repeated_signature_count = 0
        previous_signature = residual_signature

        command_failure_rate = (command_failure_count / command_count) if command_count > 0 else 0.0

        round_record = {
            "roundIndex": round_index,
            "roundId": round_id,
            "newEvidenceCardCount": new_evidence_card_count,
            "pendingReviewCount": pending_review_count,
            "avgHistoricalTrustScore": round(avg_historical, 4),
            "avgWorldbuildingUsabilityScore": round(avg_world, 4),
            "deltaWorldbuildingScore": delta_world,
            "residualSignature": residual_signature,
            "zeroEvidenceStreak": zero_evidence_count,
            "weakDeltaStreak": weak_delta_count,
            "repeatResidualStreak": repeated_signature_count,
            "commandFailureRate": round(command_failure_rate, 4),
            "threeLaneStopReason": three_lane_stop_reason,
            "threeLaneFinalBaselineManifest": three_lane_final_baseline_manifest,
            "paths": {
                "externalSummaryPath": repo_relative(external_summary_path),
                "externalCardsPath": repo_relative(external_cards_path),
                "pilotReportPath": repo_relative(pilot_report_path),
                "reviewQueuePath": repo_relative(review_queue_path),
                "scoreboardJsonPath": repo_relative(scoreboard_json_path),
                "scoreboardMarkdownPath": repo_relative(scoreboard_markdown_path),
                "shadowRosterPath": repo_relative(shadow_roster_path),
                "threeLaneSummaryPath": repo_relative(three_lane_summary_path) if three_lane_summary_path else None,
            },
            "commands": round_commands,
        }
        rounds.append(round_record)

        final_paths = {
            "externalSummaryPath": repo_relative(external_summary_path),
            "externalCardsPath": repo_relative(external_cards_path),
            "pilotReportPath": repo_relative(pilot_report_path),
            "reviewQueuePath": repo_relative(review_queue_path),
            "scoreboardJsonPath": repo_relative(scoreboard_json_path),
            "scoreboardMarkdownPath": repo_relative(scoreboard_markdown_path),
            "shadowRosterPath": repo_relative(shadow_roster_path),
        }
        if three_lane_summary_path:
            final_paths["threeLaneSummaryPath"] = repo_relative(three_lane_summary_path)
        if three_lane_final_baseline_manifest:
            final_paths["threeLaneFinalBaselineManifest"] = three_lane_final_baseline_manifest

        if pending_review_count >= max(args.human_pending_limit, 1):
            stop_reason = "human-pending-limit"
            break
        if zero_evidence_count >= max(args.new_evidence_patience, 1):
            stop_reason = "no-new-evidence-patience"
            break
        if weak_delta_count >= max(args.score_delta_patience, 1):
            stop_reason = "score-delta-patience"
            break
        if repeated_signature_count >= max(args.same_residual_repeat_limit, 1):
            stop_reason = "same-residual-repeat-limit"
            break
        if command_failure_rate > float(args.failure_rate_limit):
            stop_reason = "failure-rate-limit"
            break

    if stop_reason is None:
        stop_reason = "max-rounds" if len(rounds) >= max(args.max_rounds, 1) else "completed"

    latest_scoreboard = read_json(resolve_path(final_paths["scoreboardJsonPath"])) if final_paths.get("scoreboardJsonPath") else {}
    latest_pending = count_pending_review(resolve_path(final_paths["reviewQueuePath"])) if final_paths.get("reviewQueuePath") else 0
    rule_proposals = build_rule_proposals(latest_scoreboard, latest_pending)

    rule_proposals_json_path = run_root / "rule-proposals.json"
    rule_proposals_markdown_path = run_root / "rule-proposals.zh-TW.md"
    write_json(
        rule_proposals_json_path,
        {
            "version": "1.0.0",
            "generatedAt": utc_now(),
            "canonicalWrites": False,
            "proposals": rule_proposals,
        },
    )
    rule_proposals_markdown_path.write_text(render_rule_proposals_markdown(rule_proposals), encoding="utf-8")

    human_batch_json_path = run_root / "human-review-batch.json"
    human_batch_markdown_path = run_root / "human-review-batch.zh-TW.md"
    human_batch_created = False
    if stop_reason == "human-pending-limit" and final_paths.get("reviewQueuePath"):
        queue_payload = read_json(resolve_path(final_paths["reviewQueuePath"]))
        all_questions = list(queue_payload.get("questions") or [])
        unanswered = [item for item in all_questions if not item.get("answer")]
        selected = unanswered[: max(args.human_pending_limit, 1)]
        human_payload = {
            "version": "1.0.0",
            "generatedAt": utc_now(),
            "canonicalWrites": False,
            "pendingReviewCount": len(unanswered),
            "pendingThreshold": max(args.human_pending_limit, 1),
            "questions": selected,
        }
        write_json(human_batch_json_path, human_payload)
        human_batch_markdown_path.write_text(render_human_batch_markdown(human_payload), encoding="utf-8")
        human_batch_created = True

    inherited_baseline_paths: dict[str, Any] = {}
    if final_paths.get("threeLaneFinalBaselineManifest"):
        inherited_manifest_path = resolve_path(final_paths["threeLaneFinalBaselineManifest"])
        inherited_manifest = read_json(inherited_manifest_path)
        inherited_baseline_paths = dict((inherited_manifest or {}).get("paths") or {})

    baseline_manifest_path = run_root / "baseline-manifest.output.json"
    baseline_manifest = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-convergence-loop",
        "canonicalWrites": False,
        "runId": args.run_id,
        "stopReason": stop_reason,
        "initialBaselineManifest": initial_baseline_manifest,
        "finalThreeLaneBaselineManifest": final_paths.get("threeLaneFinalBaselineManifest"),
        "paths": {
            **inherited_baseline_paths,
            **final_paths,
            "ruleProposalsJsonPath": repo_relative(rule_proposals_json_path),
            "ruleProposalsMarkdownPath": repo_relative(rule_proposals_markdown_path),
            "humanReviewBatchJsonPath": repo_relative(human_batch_json_path) if human_batch_created else None,
            "humanReviewBatchMarkdownPath": repo_relative(human_batch_markdown_path) if human_batch_created else None,
        },
        "metrics": {
            "roundsExecuted": len(rounds),
            "latestPendingReviewCount": latest_pending,
            "commandCount": command_count,
            "commandFailureCount": command_failure_count,
            "commandFailureRate": round((command_failure_count / command_count), 4) if command_count else 0.0,
        },
    }
    write_json(baseline_manifest_path, baseline_manifest)

    next_action = {
        "human-pending-limit": "人工待審已滿門檻，請先處理 human-review-batch，再回填規則後重跑。",
        "no-new-evidence-patience": "連續兩輪沒有新增外部證據，請先補充來源設定或人工核准新站點。",
        "score-delta-patience": "平均分數提升趨緩，建議先套用 rule proposals 後再續跑。",
        "same-residual-repeat-limit": "殘差簽名重複，建議先修 deterministic 規則避免空轉。",
        "failure-rate-limit": "子流程失敗率超標，請先檢查 rounds 內 stderr。",
        "max-wall-time-minutes": "已達 wall-time 上限，可從 baseline-manifest.output.json 續跑。",
        "max-rounds": "已達本次最大輪數，可檢查 scoreboard 後決定是否加輪。",
        "completed": "本次流程已完整完成。",
    }.get(stop_reason, "請先檢查 summary 與報表再決定下一步。")

    summary_json_path = run_root / "full-roster-convergence-summary.json"
    summary_markdown_path = run_root / "full-roster-convergence-summary.md"
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-convergence-loop",
        "canonicalWrites": False,
        "dryRun": bool(args.dry_run),
        "runId": args.run_id,
        "outputRoot": repo_relative(run_root),
        "roundsExecuted": len(rounds),
        "stopReason": stop_reason,
        "nextAction": next_action,
        "policy": {
            "maxRounds": max(args.max_rounds, 1),
            "humanPendingLimit": max(args.human_pending_limit, 1),
            "newEvidencePatience": max(args.new_evidence_patience, 1),
            "scoreDeltaThreshold": float(args.score_delta_threshold),
            "scoreDeltaPatience": max(args.score_delta_patience, 1),
            "sameResidualRepeatLimit": max(args.same_residual_repeat_limit, 1),
            "failureRateLimit": float(args.failure_rate_limit),
        },
        "inputs": {
            "sourcesConfigPath": repo_relative(resolve_path(args.sources_config)),
            "baselineManifestInput": initial_baseline_manifest,
            "top": max(args.top, 1),
            "includeCold": max(args.include_cold, 0),
            "runThreeLane": bool(args.run_three_lane),
        },
        "outputs": {
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_markdown_path),
            "baselineManifestPath": repo_relative(baseline_manifest_path),
            "ruleProposalsJsonPath": repo_relative(rule_proposals_json_path),
            "ruleProposalsMarkdownPath": repo_relative(rule_proposals_markdown_path),
            "humanReviewBatchJsonPath": repo_relative(human_batch_json_path) if human_batch_created else None,
            "humanReviewBatchMarkdownPath": repo_relative(human_batch_markdown_path) if human_batch_created else None,
        },
        "rounds": rounds,
    }
    write_json(summary_json_path, summary)
    summary_markdown_path.write_text(render_summary_markdown(summary), encoding="utf-8")

    print(f"[run_full_roster_convergence_loop] wrote {summary_json_path}")
    print(f"[run_full_roster_convergence_loop] wrote {summary_markdown_path}")
    print(
        "[run_full_roster_convergence_loop] "
        f"runId={args.run_id} rounds={len(rounds)} stopReason={stop_reason} "
        f"baseline={repo_relative(baseline_manifest_path)} canonicalWrites=false"
    )


if __name__ == "__main__":
    main()
