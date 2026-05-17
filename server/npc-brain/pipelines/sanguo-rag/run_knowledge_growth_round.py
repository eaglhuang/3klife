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

from repo_layout import pipeline_root, resolve_repo_root
from sanguo_governance_loader import SanguoGovernanceError, load_knowledge_growth_round_runner_policy


DEFAULT_PILOT_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json")
DEFAULT_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_REVIEW_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")
DEFAULT_CHAPTERS_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
DEFAULT_DEEPSEEK_API_URL = "http://172.31.80.1:11435/api/chat"
REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)


KNOWLEDGE_GROWTH_ROUND_POLICY: dict[str, Any] = {}


def apply_knowledge_growth_round_governance(policy: dict[str, Any]) -> None:
    global KNOWLEDGE_GROWTH_ROUND_POLICY, DEFAULT_CHAPTERS_ROOT, DEFAULT_DEEPSEEK_API_URL
    KNOWLEDGE_GROWTH_ROUND_POLICY = dict(policy)
    paths = knowledge_growth_section("defaultPaths")
    chapters_root = str(paths.get("chaptersRoot") or "").strip()
    if chapters_root:
        DEFAULT_CHAPTERS_ROOT = Path(chapters_root)
    reviewer = knowledge_growth_section("reviewerDefaults")
    api_url = str(reviewer.get("apiUrl") or "").strip()
    if api_url:
        DEFAULT_DEEPSEEK_API_URL = api_url


def knowledge_growth_section(name: str) -> dict[str, Any]:
    section = KNOWLEDGE_GROWTH_ROUND_POLICY.get(name)
    return section if isinstance(section, dict) else {}


def knowledge_growth_text_arg(cli_value: str | None, section: dict[str, Any], key: str, fallback: str | Path) -> str:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return str(Path(value)) if value else str(fallback)


def knowledge_growth_optional_text_arg(cli_value: str | None, section: dict[str, Any], key: str) -> str | None:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or None


def knowledge_growth_int_arg(cli_value: int | None, section: dict[str, Any], key: str, fallback: int) -> int:
    if cli_value is not None:
        return cli_value
    try:
        return int(section.get(key, fallback))
    except (TypeError, ValueError):
        return fallback


def apply_knowledge_growth_round_arg_defaults(args: argparse.Namespace) -> None:
    paths = knowledge_growth_section("defaultPaths")
    cohort = knowledge_growth_section("cohortDefaults")
    reviewer = knowledge_growth_section("reviewerDefaults")
    context_window = knowledge_growth_section("contextWindowDefaults")
    gates = knowledge_growth_section("gateDefaults")
    args.round_id = knowledge_growth_text_arg(args.round_id, KNOWLEDGE_GROWTH_ROUND_POLICY, "defaultRoundId", "round-001-relationship-location")
    args.pilot_report = knowledge_growth_text_arg(args.pilot_report, paths, "pilotReport", DEFAULT_PILOT_REPORT_PATH)
    args.candidates = knowledge_growth_text_arg(args.candidates, paths, "candidates", DEFAULT_CANDIDATES_PATH)
    args.review_root = knowledge_growth_text_arg(args.review_root, paths, "reviewRoot", DEFAULT_REVIEW_ROOT)
    args.output_root = knowledge_growth_text_arg(args.output_root, paths, "outputRoot", DEFAULT_OUTPUT_ROOT)
    args.max_generals = knowledge_growth_int_arg(args.max_generals, cohort, "maxGenerals", 5)
    args.cohort_offset = knowledge_growth_int_arg(args.cohort_offset, cohort, "cohortOffset", 0)
    args.top_per_general = knowledge_growth_int_arg(args.top_per_general, cohort, "topPerGeneral", 3)
    args.reviewer_preset = knowledge_growth_text_arg(args.reviewer_preset, reviewer, "preset", "fast")
    args.reviewer_provider = knowledge_growth_optional_text_arg(args.reviewer_provider, reviewer, "provider")
    args.api_url = knowledge_growth_text_arg(args.api_url, reviewer, "apiUrl", DEFAULT_DEEPSEEK_API_URL)
    args.model = knowledge_growth_optional_text_arg(args.model, reviewer, "model")
    args.timeout_ms = knowledge_growth_int_arg(args.timeout_ms, reviewer, "timeoutMs", 0) or None
    args.num_predict = knowledge_growth_int_arg(args.num_predict, reviewer, "numPredict", 0) or None
    args.window_before = knowledge_growth_int_arg(args.window_before, context_window, "windowBefore", 2)
    args.window_after = knowledge_growth_int_arg(args.window_after, context_window, "windowAfter", 2)
    args.human_question_threshold = knowledge_growth_int_arg(args.human_question_threshold, gates, "humanQuestionThreshold", 20)
    args.step_timeout_seconds = knowledge_growth_int_arg(args.step_timeout_seconds, gates, "stepTimeoutSeconds", 30)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one Sanguo knowledge growth round over a selected review cohort.")
    parser.add_argument("--round-id", default=None, help="Round id for batch and summary outputs. Defaults to governance policy.")
    parser.add_argument("--pilot-report", default=None, help="ETL pilot report JSON path. Defaults to governance policy.")
    parser.add_argument("--candidates", default=None, help="Live event candidates JSONL path used for cohort selection and review generation. Defaults to governance policy.")
    parser.add_argument("--review-root", default=None, help="Root for per-general event review files. Defaults to governance policy.")
    parser.add_argument("--output-root", default=None, help="Knowledge growth round output directory. Defaults to governance policy.")
    parser.add_argument("--max-generals", type=int, default=None, help="Maximum generals to process. Defaults to governance policy.")
    parser.add_argument("--cohort-offset", type=int, default=None, help="Skip this many ranked generic-candidate generals before selecting the cohort. Defaults to governance policy.")
    parser.add_argument("--general-id", action="append", default=[], help="Explicit general id to include; can be provided multiple times")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--knowledge-growth-round-policy", default=None, help="Override policy-knowledge-growth-round-runner.json path")
    parser.add_argument("--top-per-general", type=int, default=None, help="Maximum questions per general. Defaults to governance policy.")
    parser.add_argument("--reviewer-preset", default=None, help="Reviewer preset: agent, fast, balanced, quality/deepseek, or hints-only. Defaults to governance policy.")
    parser.add_argument("--reviewer-provider", default=None, help="Reviewer provider: agent-reviewer, ollama, or hints-only")
    parser.add_argument("--api-url", default=None, help="Ollama /api/chat URL. Defaults to governance policy.")
    parser.add_argument("--model", default=None, help="Override reviewer preset model")
    parser.add_argument("--window-before", type=int, default=None, help="Paragraph context before source ref. Defaults to governance policy.")
    parser.add_argument("--window-after", type=int, default=None, help="Paragraph context after source ref. Defaults to governance policy.")
    parser.add_argument("--timeout-ms", type=int, default=None, help="Override reviewer preset timeout in milliseconds")
    parser.add_argument("--num-predict", type=int, default=None, help="Override reviewer preset generated token limit")
    parser.add_argument("--human-question-threshold", type=int, default=None, help="Surface human MCQ only when manual review count reaches this threshold. Defaults to governance policy.")
    parser.add_argument("--step-timeout-seconds", type=int, default=None, help="Timeout for each generate/enrich subprocess step. Defaults to governance policy.")
    parser.add_argument("--prompt-only", action="store_true", help="Only generate expanded context bundles")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def resolve_chapters_root() -> Path:
    candidates = [
        (REPO_ROOT / DEFAULT_CHAPTERS_ROOT).resolve(),
        (REPO_ROOT.parent / DEFAULT_CHAPTERS_ROOT).resolve(),
        (REPO_ROOT.parent.parent / DEFAULT_CHAPTERS_ROOT).resolve(),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


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


def manual_review_count(counts: dict[str, int]) -> int:
    return sum(int(value or 0) for key, value in counts.items() if str(key).strip().upper() != "A")


def compact_answer_counts(counts: dict[str, int]) -> str:
    ordered_keys = ("A", "B", "C", "D", "UNANSWERED", "ERROR")
    parts: list[str] = []
    for key in ordered_keys:
        value = int(counts.get(key) or 0)
        if value:
            parts.append(f"{key}:{value}")
    for key in sorted(counts):
        normalized = str(key).strip().upper()
        if normalized in ordered_keys:
            continue
        value = int(counts.get(key) or 0)
        if value:
            parts.append(f"{normalized}:{value}")
    return " ".join(parts) or "-"


def normalize_preview_text(value: Any, limit: int) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: max(limit - 3, 0)].rstrip() + "..."


def build_review_question_intent(event_key: Any, missing_fields: list[str]) -> str:
    missing = [str(field).strip() for field in missing_fields if str(field).strip()]
    if missing:
        return (
            f"判斷是否將 `{event_key or '-'}` 納入正式事件候選；若要接受，是否需先補齊 "
            f"{', '.join(missing)}。"
        )
    return f"判斷是否將 `{event_key or '-'}` 納入正式事件候選，並在 A/B/C/D 中選擇處理方式。"


def build_allowed_answer_guide(allowed_answers: dict[str, Any]) -> list[dict[str, str]]:
    defaults = {
        "A": ("accept", "直接接受為正式事件候選。"),
        "B": ("accept-with-edits", "接受但需補 location / relationshipEdges / summary 等欄位。"),
        "C": ("reject", "排除，不進正式事件。"),
        "D": ("defer", "暫緩，保留到下一輪 review。"),
    }
    guide: list[dict[str, str]] = []
    for code in ("A", "B", "C", "D"):
        raw_label = str((allowed_answers or {}).get(code) or defaults[code][0]).strip() or defaults[code][0]
        guide.append(
            {
                "code": code,
                "raw": raw_label,
                "zh": defaults[code][1],
            }
        )
    return guide


def build_review_clues(enriched_answers_path: Path, limit: int = 3) -> list[dict[str, Any]]:
    if not enriched_answers_path.exists():
        return []
    payload = read_json(enriched_answers_path)
    questions = list((payload or {}).get("questions") or [])
    clues: list[dict[str, Any]] = []
    for question in questions:
        answer = str(question.get("answer") or question.get("suggestedAnswer") or "").strip().upper()
        if answer == "A":
            continue
        proposal = question.get("deepseekContextProposal") or {}
        edits = proposal.get("edits") or question.get("edits") or {}
        context_preview = []
        for item in (question.get("expandedContext") or [])[:2]:
            source_ref = str(item.get("sourceRef") or "").strip()
            snippet = normalize_preview_text(item.get("text"), 120)
            if source_ref or snippet:
                context_preview.append(
                    {
                        "sourceRef": source_ref or "-",
                        "text": snippet or "-",
                    }
                )
        clues.append(
            {
                "candidateId": question.get("candidateId"),
                "eventKey": question.get("eventKey"),
                "chapterNo": question.get("chapterNo"),
                "sourceRefs": list(question.get("sourceRefs") or []),
                "generalIds": list(question.get("generalIds") or []),
                "answer": answer or "UNANSWERED",
                "suggestedAnswer": str(question.get("suggestedAnswer") or proposal.get("recommendedAnswer") or "").strip().upper() or "-",
                "sourceQuote": normalize_preview_text(question.get("sourceQuote"), 220) or "-",
                "summary": normalize_preview_text(question.get("summary"), 180) or "-",
                "missingFields": list(question.get("missingFields") or []),
                "questionIntent": build_review_question_intent(
                    question.get("eventKey"),
                    list(question.get("missingFields") or []),
                ),
                "allowedAnswerGuide": build_allowed_answer_guide(question.get("allowedAnswers") or {}),
                "recommendedAnswer": str(proposal.get("recommendedAnswer") or "").strip().upper() or "-",
                "confidence": proposal.get("confidence") or question.get("confidence"),
                "location": normalize_preview_text(edits.get("location"), 80) or "-",
                "relationshipEdgeCount": len(edits.get("relationshipEdges") or []),
                "reasons": [normalize_preview_text(reason, 100) for reason in (proposal.get("reasons") or question.get("deepseekHint", {}).get("reasons") or [])][:3],
                "risks": [normalize_preview_text(risk, 100) for risk in (proposal.get("risks") or question.get("deepseekHint", {}).get("risks") or [])][:3],
                "contextPreview": context_preview,
            }
        )
        if len(clues) >= max(limit, 0):
            break
    return clues


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
    chapters_root = resolve_chapters_root()
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
        "--chapters-root",
        str(chapters_root),
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
        "reviewClues": build_review_clues(enriched_path, limit=3),
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


def preview_gate_summary(results: list[dict], human_question_threshold: int) -> dict[str, Any]:
    deterministic_manual_review_count = sum(manual_review_count(result.get("originalAnswerCounts") or {}) for result in results)
    agent_manual_review_count = sum(manual_review_count(result.get("enrichedAnswerCounts") or {}) for result in results)
    return {
        "humanQuestionThreshold": human_question_threshold,
        "deterministicPreviewManualReviewCount": deterministic_manual_review_count,
        "agentPreviewManualReviewCount": agent_manual_review_count,
        "surfaceHumanMcq": agent_manual_review_count >= max(human_question_threshold, 1),
    }


def render_preview_gate_markdown(report: dict) -> str:
    gate = report.get("previewGate") or {}
    threshold = int(gate.get("humanQuestionThreshold") or 0)
    agent_preview_enabled = "on" if str(report.get("reviewerProvider") or "").strip().lower() == "agent-reviewer" else "off"
    lines = [
        "## Preview Gate",
        "",
        "- Deterministic Preview: `on`",
        f"- Agent Skill Preview: `{agent_preview_enabled}`",
        f"- Human Question Threshold: `{threshold}`",
        f"- Deterministic Manual Review Count: `{gate.get('deterministicPreviewManualReviewCount')}`",
        f"- Agent Manual Review Count: `{gate.get('agentPreviewManualReviewCount')}`",
        f"- Surface Human MCQ: `{gate.get('surfaceHumanMcq')}`",
        "",
        "## Decision Table",
        "",
        "| General | Deterministic Preview | Agent Preview | Manual Load | Human? |",
        "|---|---|---|---:|---|",
    ]
    for result in report["results"]:
        manual_load = manual_review_count(result.get("enrichedAnswerCounts") or {})
        human = "yes" if manual_load >= max(threshold, 1) else "no"
        lines.append(
            f"| `{result['generalId']}` | `{compact_answer_counts(result.get('originalAnswerCounts') or {})}` | "
            f"`{compact_answer_counts(result.get('enrichedAnswerCounts') or {})}` | {manual_load} | `{human}` |"
        )
    lines.append("")
    return "\n".join(lines)


def render_review_clues_markdown(report: dict) -> str:
    lines = [
        "## 審核線索",
        "",
        "這一段只列出需要你判斷的題目。先看 `原文線索` 和 `中文摘要`，再看 `缺欄位` / `建議答案`。",
        "",
    ]
    any_clues = False
    for result in report["results"]:
        clues = list(result.get("reviewClues") or [])
        if not clues:
            continue
        any_clues = True
        lines.extend([
            f"### `{result['generalId']}` {result.get('displayName') or ''}",
            f"- 狀態: `{result.get('status')}`",
            f"- 原始答案分布: `{compact_answer_counts(result.get('originalAnswerCounts') or {})}`",
            f"- 預覽後答案分布: `{compact_answer_counts(result.get('enrichedAnswerCounts') or {})}`",
            "",
        ])
        for clue in clues:
            lines.extend([
                f"#### `{clue.get('eventKey') or '-'}`",
                f"- 題目在問什麼: {clue.get('questionIntent') or '-'}",
                f"- 建議答案: `{clue.get('suggestedAnswer') or '-'}`",
                f"- 原文線索: {clue.get('sourceQuote') or '-'}",
                f"- 中文摘要: {clue.get('summary') or '-'}",
                f"- 來源編號: `{', '.join(clue.get('sourceRefs') or []) or '-'}`",
                f"- 缺欄位: `{', '.join(clue.get('missingFields') or []) or '-'}`",
                f"- 推薦判定: `{clue.get('recommendedAnswer') or '-'}`",
                "- A/B/C/D 中文說明:",
            ])
            for answer_item in clue.get("allowedAnswerGuide") or []:
                lines.append(
                    f"- {answer_item.get('code')}: `{answer_item.get('raw') or '-'}` / {answer_item.get('zh') or '-'}"
                )
            lines.extend([
                f"- Location: `{clue.get('location') or '-'}`",
                f"- relationshipEdges: `{clue.get('relationshipEdgeCount') or 0}`",
                f"- 理由: {'; '.join(clue.get('reasons') or []) or '-'}",
                f"- 風險: {'; '.join(clue.get('risks') or []) or '-'}",
            ])
            if clue.get("contextPreview"):
                for index, item in enumerate(clue.get("contextPreview") or [], start=1):
                    lines.append(f"- 上下文 {index}: `{item.get('sourceRef') or '-'}` {item.get('text') or '-'}")
            lines.append("")
    if not any_clues:
        lines.append("- 這輪沒有需要人工判斷的題目。")
        lines.append("")
    return "\n".join(lines)


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
        render_preview_gate_markdown(report),
        "## Results",
        "",
        "| General | Status | Generic | Original ABCD | Enriched ABCD | Raw Errors |",
        "|---|---|---:|---|---|---:|",
    ]
    for result in report["results"]:
        lines.append(
            f"| `{result['generalId']}` {result.get('displayName') or ''} | `{result.get('status')}` | "
            f"{result.get('genericCandidateCount') or 0} | `{compact_answer_counts(result.get('originalAnswerCounts') or {})}` | "
            f"`{compact_answer_counts(result.get('enrichedAnswerCounts') or {})}` | {result.get('rawErrorCount') or 0} parsed={result.get('rawParsedCount') or 0} |"
        )
    lines.extend(["", render_review_clues_markdown(report), "## Optimization Notes", ""])
    for note in report["optimizationNotes"]:
        lines.append(f"- {note}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    knowledge_growth_policy = load_knowledge_growth_round_runner_policy(
        args.governance_root,
        knowledge_growth_round_policy=args.knowledge_growth_round_policy,
    )
    apply_knowledge_growth_round_governance(knowledge_growth_policy)
    apply_knowledge_growth_round_arg_defaults(args)
    candidates = read_jsonl(Path(args.candidates))
    pilot_path = Path(args.pilot_report)
    cohort_source = "live-candidates"
    if candidates:
        cohort = choose_live_candidate_cohort(candidates, args.max_generals, args.cohort_offset, args.general_id)
    else:
        pilot = read_json(pilot_path)
        cohort = choose_cohort(pilot, args.max_generals, args.cohort_offset, args.general_id)
        cohort_source = "pilot-report" if pilot else "empty-fallback"

    if not cohort and args.general_id:
        # When both candidates and pilot report are unavailable, still honor explicit general targets
        # so outer repair loops can continue without hard-failing.
        cohort = [
            {
                "generalId": str(general_id or "").strip(),
                "displayName": str(general_id or "").strip(),
                "status": "fallback-general-id",
                "genericCandidateCount": 0,
                "keywordTotal": 0,
            }
            for general_id in args.general_id
            if str(general_id or "").strip()
        ]
        if cohort:
            cohort_source = "explicit-general-fallback"
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
        "pilotReportPath": args.pilot_report,
        "cohortSource": cohort_source,
        "reviewerPreset": args.reviewer_preset,
        "reviewerProvider": args.reviewer_provider,
        "model": args.model,
        "timeoutMs": args.timeout_ms,
        "numPredict": args.num_predict,
        "humanQuestionThreshold": args.human_question_threshold,
        "stepTimeoutSeconds": args.step_timeout_seconds,
        "cohortOffset": args.cohort_offset,
        "generalIds": args.general_id,
        "cohort": [{"generalId": row.get("generalId"), "genericCandidateCount": row.get("genericCandidateCount")} for row in cohort],
        "results": results,
        "previewGate": preview_gate_summary(results, args.human_question_threshold),
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
        f"canonicalWrites=false promptOnly={args.prompt_only} "
        f"manualReviewQuestions={report['previewGate']['agentPreviewManualReviewCount']} "
        f"surfaceHumanMcq={report['previewGate']['surfaceHumanMcq']}"
    )


if __name__ == "__main__":
    try:
        main()
    except SanguoGovernanceError as exc:
        print(f"[run_knowledge_growth_round] governance error: {exc}", file=sys.stderr)
        raise SystemExit(2) from None
