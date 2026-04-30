from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_PILOT_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json")
DEFAULT_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_REVIEW_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")
DEFAULT_DEEPSEEK_API_URL = "http://172.31.80.1:11435/api/chat"
REPO_ROOT = Path(__file__).resolve().parents[4]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one Sanguo knowledge growth round over a selected review cohort.")
    parser.add_argument("--round-id", default="round-001-relationship-location", help="Round id for batch and summary outputs")
    parser.add_argument("--pilot-report", default=str(DEFAULT_PILOT_REPORT_PATH), help="ETL pilot report JSON path")
    parser.add_argument("--candidates", default=str(DEFAULT_CANDIDATES_PATH), help="Live event candidates JSONL path used for cohort selection and review generation")
    parser.add_argument("--review-root", default=str(DEFAULT_REVIEW_ROOT), help="Root for per-general event review files")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Knowledge growth round output directory")
    parser.add_argument("--max-generals", type=int, default=5, help="Maximum generals to process")
    parser.add_argument("--cohort-offset", type=int, default=0, help="Skip this many ranked generic-candidate generals before selecting the cohort")
    parser.add_argument("--general-id", action="append", default=[], help="Explicit general id to include; can be provided multiple times")
    parser.add_argument("--top-per-general", type=int, default=3, help="Maximum questions per general")
    parser.add_argument("--reviewer-preset", default="fast", help="Reviewer preset: agent, fast, balanced, quality/deepseek, or hints-only")
    parser.add_argument("--reviewer-provider", default=None, help="Reviewer provider: agent-reviewer, ollama, or hints-only")
    parser.add_argument("--api-url", default=DEFAULT_DEEPSEEK_API_URL, help="Ollama /api/chat URL")
    parser.add_argument("--model", default=None, help="Override reviewer preset model")
    parser.add_argument("--window-before", type=int, default=2, help="Paragraph context before source ref")
    parser.add_argument("--window-after", type=int, default=2, help="Paragraph context after source ref")
    parser.add_argument("--timeout-ms", type=int, default=None, help="Override reviewer preset timeout in milliseconds")
    parser.add_argument("--num-predict", type=int, default=None, help="Override reviewer preset generated token limit")
    parser.add_argument("--step-timeout-seconds", type=int, default=30, help="Timeout for each generate/enrich subprocess step")
    parser.add_argument("--prompt-only", action="store_true", help="Only generate expanded context bundles")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def choose_cohort(pilot: dict, max_generals: int, cohort_offset: int = 0, general_ids: list[str] | None = None) -> list[dict]:
    rows = [row for row in pilot.get("generals") or [] if int(row.get("genericCandidateCount") or 0) > 0]
    rows.sort(key=lambda row: (-(row.get("genericCandidateCount") or 0), row.get("status") or "", row.get("generalId") or ""))
    if general_ids:
        wanted = set(general_ids)
        return [row for row in rows if row.get("generalId") in wanted]
    start = max(cohort_offset, 0)
    end = start + max(max_generals, 0)
    return rows[start:end]


def choose_live_candidate_cohort(candidates: list[dict], max_generals: int, cohort_offset: int = 0, general_ids: list[str] | None = None) -> list[dict]:
    counter: Counter = Counter()
    for candidate in candidates:
        if candidate.get("reviewStatus", "needs-review") == "ready":
            continue
        for general_id in candidate.get("generalIds") or []:
            general_id = str(general_id or "").strip()
            if general_id:
                counter[general_id] += 1
    rows = [
        {
            "generalId": general_id,
            "displayName": general_id,
            "status": "live-candidate",
            "genericCandidateCount": count,
            "keywordTotal": 0,
        }
        for general_id, count in counter.items()
    ]
    rows.sort(key=lambda row: (-(row.get("genericCandidateCount") or 0), row.get("generalId") or ""))
    if general_ids:
        wanted = set(general_ids)
        return [row for row in rows if row.get("generalId") in wanted]
    start = max(cohort_offset, 0)
    end = start + max(max_generals, 0)
    return rows[start:end]


def command_summary(command: list[str]) -> str:
    return " ".join(command)


def run_command(command: list[str], timeout_seconds: int) -> dict:
    try:
        result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True, timeout=timeout_seconds)
        return {
            "command": command_summary(command),
            "returnCode": result.returncode,
            "stdout": result.stdout.strip()[-4000:],
            "stderr": result.stderr.strip()[-4000:],
            "timedOut": False,
        }
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        return {
            "command": command_summary(command),
            "returnCode": 124,
            "stdout": str(stdout).strip()[-4000:],
            "stderr": (str(stderr).strip() + f"\nstep timed out after {timeout_seconds}s").strip()[-4000:],
            "timedOut": True,
        }
    except Exception as exc:
        return {
            "command": command_summary(command),
            "returnCode": 1,
            "stdout": "",
            "stderr": f"{type(exc).__name__}: {exc}",
            "timedOut": False,
        }


def answer_counts(path: Path) -> dict[str, int]:
    if not path.exists():
        return {}
    payload = read_json(path)
    counter: Counter = Counter()
    for question in payload.get("questions") or []:
        answer = str(question.get("answer") or question.get("suggestedAnswer") or "unanswered").strip().upper()
        counter[answer if answer else "unanswered"] += 1
    return dict(sorted(counter.items()))


def report_counts(path: Path) -> dict[str, int]:
    if not path.exists():
        return {}
    payload = read_json(path)
    counter: Counter = Counter()
    for answer in payload.get("answers") or []:
        value = str(answer.get("recommendedAnswer") or "unanswered").strip().upper()
        counter[value if value else "unanswered"] += 1
    return dict(sorted(counter.items()))


def raw_error_count(path: Path) -> int:
    if not path.exists():
        return 0
    payload = read_json(path)
    return sum(1 for request in payload.get("requests") or [] if request.get("error"))


def raw_parsed_count(path: Path) -> int:
    if not path.exists():
        return 0
    payload = read_json(path)
    return sum(1 for request in payload.get("requests") or [] if request.get("parsedJson"))


def snapshot_round_outputs(args: argparse.Namespace, general_id: str, paths: dict[str, Path]) -> dict[str, str]:
    snapshot_dir = Path(args.output_root) / f"{args.round_id}.snapshots" / general_id
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    snapshotted: dict[str, str] = {}
    for key, source_path in paths.items():
        try:
            if not source_path.exists():
                snapshotted[key] = str(source_path)
                continue
            target_path = snapshot_dir / source_path.name
            shutil.copyfile(source_path, target_path)
            snapshotted[key] = str(target_path)
        except Exception as exc:
            snapshotted[key] = str(source_path)
            snapshotted[f"{key}SnapshotError"] = f"{type(exc).__name__}: {exc}"
    return snapshotted


def failed_general_result(row: dict, error: str) -> dict:
    general_id = str(row.get("generalId") or "unknown")
    return {
        "generalId": general_id,
        "displayName": row.get("displayName"),
        "status": row.get("status"),
        "genericCandidateCount": row.get("genericCandidateCount") or 0,
        "keywordTotal": row.get("keywordTotal") or 0,
        "paths": {},
        "originalAnswerCounts": {},
        "enrichedAnswerCounts": {"ERROR": 1},
        "reportAnswerCounts": {},
        "rawErrorCount": 1,
        "rawParsedCount": 0,
        "generate": {"returnCode": 1, "stdout": "", "stderr": error, "timedOut": False},
        "enrich": {"returnCode": 1, "stdout": "", "stderr": "skipped because general setup failed", "timedOut": False},
    }


def run_for_general(args: argparse.Namespace, row: dict) -> dict:
    general_id = str(row.get("generalId") or "").strip()
    if not general_id:
        return failed_general_result(row, "missing generalId in cohort row")
    output_dir = Path(args.review_root) / f"event-review-{general_id}"
    choices_path = output_dir / f"event-review-choices.{general_id}.md"
    answers_path = output_dir / f"event-review-answers.{general_id}.todo.json"
    enriched_path = output_dir / f"event-review-answers.{general_id}.enriched.todo.json"
    report_path = output_dir / f"event-review-context.{general_id}-report.json"
    raw_path = output_dir / f"event-review-context.{general_id}-raw.json"
    generate_command = [
        sys.executable,
        str(PIPELINE_ROOT / "generate_event_review_choices.py"),
        "--candidates",
        args.candidates,
        "--general-id",
        general_id,
        "--output-root",
        str(output_dir),
        "--top",
        str(args.top_per_general),
        "--overwrite",
    ]
    enrich_command = [
        sys.executable,
        str(PIPELINE_ROOT / "enrich_event_review_context.py"),
        "--answers",
        str(answers_path),
        "--reviewer-preset",
        args.reviewer_preset,
        "--api-url",
        args.api_url,
        "--window-before",
        str(args.window_before),
        "--window-after",
        str(args.window_after),
        "--fill-answers",
        "--overwrite",
    ]
    if args.reviewer_provider:
        enrich_command.extend(["--reviewer-provider", args.reviewer_provider])
    if args.model:
        enrich_command.extend(["--model", args.model])
    if args.timeout_ms is not None:
        enrich_command.extend(["--timeout-ms", str(args.timeout_ms)])
    if args.num_predict is not None:
        enrich_command.extend(["--num-predict", str(args.num_predict)])
    if args.prompt_only:
        enrich_command.append("--prompt-only")
    try:
        generate_result = run_command(generate_command, args.step_timeout_seconds)
        enrich_result = run_command(enrich_command, args.step_timeout_seconds) if generate_result["returnCode"] == 0 else {
            "command": command_summary(enrich_command),
            "returnCode": 1,
            "stdout": "",
            "stderr": "generate step failed",
            "timedOut": False,
        }
    except Exception as exc:
        return failed_general_result(row, f"{type(exc).__name__}: {exc}")
    paths = {
        "choices": choices_path,
        "answers": answers_path,
        "enrichedAnswers": enriched_path,
        "report": report_path,
        "raw": raw_path,
    }
    snapshotted_paths = snapshot_round_outputs(args, general_id, paths)
    return {
        "generalId": general_id,
        "displayName": row.get("displayName"),
        "status": row.get("status"),
        "genericCandidateCount": row.get("genericCandidateCount") or 0,
        "keywordTotal": row.get("keywordTotal") or 0,
        "paths": snapshotted_paths,
        "originalAnswerCounts": answer_counts(answers_path),
        "enrichedAnswerCounts": answer_counts(enriched_path),
        "reportAnswerCounts": report_counts(report_path),
        "rawErrorCount": raw_error_count(raw_path),
        "rawParsedCount": raw_parsed_count(raw_path),
        "generate": generate_result,
        "enrich": enrich_result,
    }


def build_optimization_notes(results: list[dict]) -> list[str]:
    notes: list[str] = []
    total_errors = sum(result.get("rawErrorCount") or 0 for result in results)
    total_parsed = sum(result.get("rawParsedCount") or 0 for result in results)
    total_a = sum((result.get("enrichedAnswerCounts") or {}).get("A", 0) for result in results)
    total_b = sum((result.get("enrichedAnswerCounts") or {}).get("B", 0) for result in results)
    if total_errors:
        notes.append("本輪有請求錯誤或 per-general step 失敗；runner 會保留錯誤並繼續處理其他武將，下一輪需先看 batch JSON 的 generate/enrich stderr。")
    if not total_parsed:
        notes.append("本輪沒有成功 parsed LLM JSON；A 題只能視為 deterministic candidate hints，不能當作 DeepSeek 已審核。")
    if total_b:
        notes.append("仍有 B 題，下一輪應強化 location terms、人物 alias 與 relationship verb pattern。")
    if total_a:
        notes.append("已產生 A 題，可進入人工 review/apply script，而不是手改 canonical events。")
    notes.append("Round 1 優先目標維持 relationshipEdges 與 location，先讓 battle candidates 從 B 轉 A，再擴 affect/talent/work。")
    return notes


def render_markdown(report: dict) -> str:
    lines = [
        "# Knowledge Growth Round Batch Report",
        "",
        f"- Round ID: `{report['roundId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Cohort Size: `{len(report['results'])}`",
        f"- Prompt Only: `{report['promptOnly']}`",
        "",
        "## Results",
        "",
        "| General | Status | Generic | Original ABCD | Enriched ABCD | Raw Errors |",
        "|---|---|---:|---|---|---:|",
    ]
    for result in report["results"]:
        lines.append(
            f"| `{result['generalId']}` {result.get('displayName') or ''} | `{result.get('status')}` | "
            f"{result.get('genericCandidateCount') or 0} | `{result.get('originalAnswerCounts')}` | "
            f"`{result.get('enrichedAnswerCounts')}` | {result.get('rawErrorCount') or 0} parsed={result.get('rawParsedCount') or 0} |"
        )
    lines.extend(["", "## Optimization Notes", ""])
    for note in report["optimizationNotes"]:
        lines.append(f"- {note}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    candidates = read_jsonl(Path(args.candidates))
    if candidates:
        cohort = choose_live_candidate_cohort(candidates, args.max_generals, args.cohort_offset, args.general_id)
    else:
        pilot = read_json(Path(args.pilot_report))
        cohort = choose_cohort(pilot, args.max_generals, args.cohort_offset, args.general_id)
    results = []
    for row in cohort:
        try:
            results.append(run_for_general(args, row))
        except Exception as exc:
            results.append(failed_general_result(row, f"{type(exc).__name__}: {exc}"))
    report = {
        "version": "1.0.0",
        "roundId": args.round_id,
        "generatedAt": utc_now(),
        "mode": "knowledge-growth-round-batch-enrichment",
        "canonicalWrites": False,
        "promptOnly": args.prompt_only,
        "apiUrl": args.api_url,
        "candidatesPath": args.candidates,
        "reviewerPreset": args.reviewer_preset,
        "reviewerProvider": args.reviewer_provider,
        "model": args.model,
        "timeoutMs": args.timeout_ms,
        "numPredict": args.num_predict,
        "stepTimeoutSeconds": args.step_timeout_seconds,
        "cohortOffset": args.cohort_offset,
        "generalIds": args.general_id,
        "cohort": [{"generalId": row.get("generalId"), "genericCandidateCount": row.get("genericCandidateCount")} for row in cohort],
        "results": results,
        "optimizationNotes": build_optimization_notes(results),
    }
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    json_path = output_root / f"{args.round_id}.batch.json"
    md_path = output_root / f"{args.round_id}.batch.md"
    if not args.overwrite and (json_path.exists() or md_path.exists()):
        raise FileExistsError("Round batch output exists. Re-run with --overwrite.")
    write_json(json_path, report)
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[run_knowledge_growth_round] wrote {json_path}")
    print(f"[run_knowledge_growth_round] wrote {md_path}")
    print(
        f"[run_knowledge_growth_round] roundId={args.round_id} cohort={len(results)} "
        f"canonicalWrites=false promptOnly={args.prompt_only}"
    )


if __name__ == "__main__":
    main()