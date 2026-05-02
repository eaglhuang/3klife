from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from .etl_graph import (
    SanguoETLState,
    assess_completion_bottlenecks,
    load_campaign_summary,
    load_completion_summary,
    load_etl_pilot_report,
    load_review_queue,
    select_focus_generals,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")
DEFAULT_STUDIO_REPAIR_ROOT = Path("local/studio-etl-repair")
DEFAULT_REASONING_MODEL = "deepseek-r1:7b"
DEFAULT_WINDOW_BEFORE = 2
DEFAULT_WINDOW_AFTER = 2
DEFAULT_REVIEWER_PRESET = "agent"
DEFAULT_REVIEWER_PROVIDER = "agent-reviewer"
DEFAULT_STEP_TIMEOUT_SECONDS = 30
DEFAULT_REVIEW_TOP = 20
MAX_REVIEW_GENERALS = 3
MAX_CAMPAIGN_GENERALS = 5


class SanguoETLRepairState(SanguoETLState, total=False):
    runLabel: str | None
    studioRepairRoot: str | None
    overwriteOutputs: bool
    reviewTop: int
    requireHumanReviewInterrupt: bool
    reviewInterruptBatchSize: int
    runContextEnrichment: bool
    fillReviewAnswers: bool
    reasoningModel: str | None
    windowBefore: int
    windowAfter: int
    runRepairCampaign: bool
    runApiReadinessRefresh: bool
    reviewerPreset: str | None
    reviewerProvider: str | None
    stepTimeoutSeconds: int
    studioRunId: str
    studioRunRoot: str
    pilotOutputRoot: str
    targetGeneralIds: list[str]
    reviewBundles: list[dict[str, Any]]
    pilotRefreshSummary: dict[str, Any]
    reviewCandidateSummary: dict[str, Any]
    contextEnrichmentSummary: dict[str, Any]
    repairCampaignSummary: dict[str, Any]
    apiReadinessSummary: dict[str, Any]
    smokeReadiness: dict[str, Any]
    commandLogs: list[dict[str, Any]]


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", text.strip()).strip("-_.")
    return slug.lower() or "run"


def _resolve_path(path_text: str | None, default_path: Path) -> Path:
    raw_path = Path(path_text) if path_text else default_path
    if raw_path.is_absolute():
        return raw_path
    return (REPO_ROOT / raw_path).resolve()


def _repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return _read_json(path)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _bool_flag(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "no", "n", "off"}:
        return False
    return default


def _int_flag(value: Any, default: int, minimum: int = 1) -> int:
    try:
        return max(int(value), minimum)
    except (TypeError, ValueError):
        return max(default, minimum)


def _run_pipeline_command(script_name: str, args: list[str]) -> dict[str, Any]:
    command = [sys.executable, str((REPO_ROOT / PIPELINE_ROOT / script_name).resolve()), *args]
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True)
    return {
        "script": script_name,
        "command": " ".join(command),
        "returnCode": result.returncode,
        "success": result.returncode == 0,
        "stdoutTail": result.stdout.strip()[-8000:],
        "stderrTail": result.stderr.strip()[-8000:],
    }


def _append_command_log(state: SanguoETLRepairState, payload: dict[str, Any], **extra: Any) -> list[dict[str, Any]]:
    logs = list(state.get("commandLogs") or [])
    row = dict(payload)
    row.update(extra)
    logs.append(row)
    return logs


def _collect_target_general_ids(state: SanguoETLRepairState) -> list[str]:
    rows: list[str] = []
    seen: set[str] = set()

    def add(value: Any) -> None:
        text = str(value or "").strip()
        if text and text not in seen:
            seen.add(text)
            rows.append(text)

    add(state.get("resolvedFocusGeneralId"))
    for general in state.get("focusGenerals") or []:
        add(general.get("generalId"))
    for question in state.get("focusReviewQuestions") or []:
        add(question.get("generalId"))
    return rows[:MAX_CAMPAIGN_GENERALS]


def _review_output_paths(output_root: Path, general_id: str) -> tuple[Path, Path]:
    return (
        output_root / f"event-review-choices.{general_id}.md",
        output_root / f"event-review-answers.{general_id}.todo.json",
    )


def _context_output_paths(output_root: Path, answers_path: Path) -> dict[str, Path]:
    stem = answers_path.name.replace("event-review-answers", "event-review-context").replace(".todo.json", "")
    answer_stem = answers_path.name.replace(".todo.json", ".enriched.todo.json")
    return {
        "bundle": output_root / f"{stem}-bundle.json",
        "report": output_root / f"{stem}-report.json",
        "markdown": output_root / f"{stem}-report.md",
        "raw": output_root / f"{stem}-raw.json",
        "enrichedAnswers": output_root / answer_stem,
    }


def _target_for_api_readiness(state: SanguoETLRepairState) -> str | None:
    for general in state.get("focusGenerals") or []:
        if general.get("status") == "ready-for-dialogue-smoke":
            return str(general.get("generalId"))
    return str((state.get("resolvedFocusGeneralId") or (state.get("targetGeneralIds") or [None])[0]) or "") or None


def _normalize_review_answer(raw_answer: Any, allowed_answers: dict[str, Any]) -> str | None:
    text = str(raw_answer or "").strip()
    if not text:
        return None
    upper = text.upper()
    if upper in allowed_answers:
        return upper
    lowered = text.lower()
    for code, label in allowed_answers.items():
        if lowered == str(label or "").strip().lower():
            return str(code)
    return None


def _normalize_review_decisions(response: Any) -> list[dict[str, Any]]:
    if response is None:
        return []
    if isinstance(response, dict):
        if isinstance(response.get("decisions"), list):
            return [item for item in response["decisions"] if isinstance(item, dict)]
        if response.get("candidateId") or response.get("eventKey"):
            return [response]
        return []
    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]
    return []


def _apply_review_decisions(questions: list[dict[str, Any]], decisions: list[dict[str, Any]]) -> int:
    decision_map: dict[str, dict[str, Any]] = {}
    for decision in decisions:
        for key in (decision.get("candidateId"), decision.get("eventKey")):
            text = str(key or "").strip()
            if text:
                decision_map[text] = decision

    updated_count = 0
    for question in questions:
        decision = None
        for key in (question.get("candidateId"), question.get("eventKey")):
            text = str(key or "").strip()
            if text and text in decision_map:
                decision = decision_map[text]
                break
        if decision is None:
            continue

        answer = _normalize_review_answer(
            decision.get("answer") or decision.get("decision"),
            dict(question.get("allowedAnswers") or {}),
        )
        if answer is None:
            continue

        question["answer"] = answer
        question["reviewedAt"] = _utc_iso()
        notes = decision.get("notes") or decision.get("reason")
        if notes:
            question["humanReviewNotes"] = str(notes)
        edits = decision.get("edits")
        if isinstance(edits, dict):
            merged_edits = dict(question.get("edits") or {})
            merged_edits.update(edits)
            question["edits"] = merged_edits
        updated_count += 1
    return updated_count


def _summarize_review_bundles(bundles: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int, int, list[dict[str, Any]]]:
    per_general: list[dict[str, Any]] = []
    pending_items: list[dict[str, Any]] = []
    total_answered = 0
    total_pending = 0

    for bundle in bundles:
        answers_path = _resolve_path(bundle.get("answersPath"), Path(bundle.get("answersPath") or ""))
        payload = _read_optional_json(answers_path)
        questions = list(payload.get("questions") or [])
        answered = sum(1 for question in questions if question.get("answer"))
        pending = max(len(questions) - answered, 0)
        total_answered += answered
        total_pending += pending
        per_general.append(
            {
                "generalId": bundle.get("generalId"),
                "answersPath": bundle.get("answersPath"),
                "questionCount": len(questions),
                "answeredQuestions": answered,
                "pendingQuestions": pending,
                "needsHumanReview": pending > 0,
            }
        )
        for question in questions:
            if question.get("answer"):
                continue
            pending_items.append(
                {
                    "generalId": bundle.get("generalId"),
                    "answersPath": bundle.get("answersPath"),
                    "candidateId": question.get("candidateId"),
                    "eventKey": question.get("eventKey"),
                    "chapterNo": question.get("chapterNo"),
                    "summary": question.get("summary"),
                    "sourceQuote": question.get("sourceQuote"),
                    "suggestedAnswer": question.get("suggestedAnswer"),
                    "allowedAnswers": question.get("allowedAnswers") or {},
                    "missingFields": question.get("missingFields") or [],
                    "sourceRefs": question.get("sourceRefs") or [],
                    "edits": question.get("edits") or {},
                }
            )

    return per_general, total_answered, total_pending, pending_items


def prepare_focus_workspace(state: SanguoETLRepairState) -> dict[str, Any]:
    target_general_ids = _collect_target_general_ids(state)
    if not target_general_ids:
        raise ValueError("No focus generals selected. Provide focusGeneralId or focusStatus that resolves to at least one target.")

    focus_general_id = str(state.get("resolvedFocusGeneralId") or target_general_ids[0])
    run_label = str(state.get("runLabel") or f"{focus_general_id}-{_utc_stamp()}")
    run_id = _slugify(run_label)
    run_root = _resolve_path(state.get("studioRepairRoot"), DEFAULT_STUDIO_REPAIR_ROOT) / run_id
    run_root.mkdir(parents=True, exist_ok=True)
    pilot_output_root = run_root / "etl-quality-pilot"

    return {
        "studioRunId": run_id,
        "studioRunRoot": _repo_relative(run_root),
        "pilotOutputRoot": _repo_relative(pilot_output_root),
        "targetGeneralIds": target_general_ids,
        "commandLogs": list(state.get("commandLogs") or []),
    }


def refresh_focus_pilot(state: SanguoETLRepairState) -> dict[str, Any]:
    output_root = _resolve_path(state.get("pilotOutputRoot"), Path("local/studio-etl-repair/etl-quality-pilot"))
    output_root.mkdir(parents=True, exist_ok=True)
    args = ["--output-root", _repo_relative(output_root)]
    for general_id in state.get("targetGeneralIds") or []:
        args.extend(["--general-id", general_id])
    if _bool_flag(state.get("overwriteOutputs"), True):
        args.append("--overwrite")

    payload = _run_pipeline_command("run_etl_quality_pilot.py", args)
    report_path = output_root / "etl-quality-pilot-report.json"
    report = _read_optional_json(report_path)
    focus_generals = [
        general
        for general in (report.get("generals") or [])
        if str(general.get("generalId") or "") in set(state.get("targetGeneralIds") or [])
    ]
    review_queue_questions = list((report.get("reviewQueue") or {}).get("questions") or [])

    return {
        "etlPilotReport": report or dict(state.get("etlPilotReport") or {}),
        "focusGenerals": focus_generals or list(state.get("focusGenerals") or []),
        "reviewQueueQuestions": review_queue_questions or list(state.get("reviewQueueQuestions") or []),
        "pilotRefreshSummary": {
            "success": payload["success"],
            "outputRoot": _repo_relative(output_root),
            "reportPath": _repo_relative(report_path),
            "generalCount": len(focus_generals),
            "statusCounts": report.get("statusCounts") or {},
        },
        "commandLogs": _append_command_log(state, payload, stage="refresh-focus-pilot"),
    }


def extract_event_review_candidates(state: SanguoETLRepairState) -> dict[str, Any]:
    run_root = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_REPAIR_ROOT)
    review_top = _int_flag(state.get("reviewTop"), DEFAULT_REVIEW_TOP)
    overwrite = _bool_flag(state.get("overwriteOutputs"), True)
    bundles: list[dict[str, Any]] = []
    logs = list(state.get("commandLogs") or [])

    for general_id in (state.get("targetGeneralIds") or [])[:MAX_REVIEW_GENERALS]:
        output_root = run_root / f"event-review-{general_id}"
        output_root.mkdir(parents=True, exist_ok=True)
        args = [
            "--general-id",
            general_id,
            "--output-root",
            _repo_relative(output_root),
            "--top",
            str(review_top),
        ]
        if overwrite:
            args.append("--overwrite")
        payload = _run_pipeline_command("generate_event_review_choices.py", args)
        choices_path, answers_path = _review_output_paths(output_root, general_id)
        answers_payload = _read_optional_json(answers_path)
        questions = list(answers_payload.get("questions") or [])
        bundles.append(
            {
                "generalId": general_id,
                "outputRoot": _repo_relative(output_root),
                "choicesPath": _repo_relative(choices_path),
                "answersPath": _repo_relative(answers_path),
                "questionCount": len(questions),
                "suggestedAnswers": sum(1 for question in questions if question.get("suggestedAnswer")),
                "success": payload["success"],
            }
        )
        logs = _append_command_log({"commandLogs": logs}, payload, stage="extract-event-review-candidates", generalId=general_id)

    return {
        "reviewBundles": bundles,
        "reviewCandidateSummary": {
            "bundleCount": len(bundles),
            "totalQuestions": sum(int(bundle.get("questionCount") or 0) for bundle in bundles),
            "bundles": bundles,
        },
        "commandLogs": logs,
    }


def review_candidates(state: SanguoETLRepairState) -> dict[str, Any]:
    bundles = list(state.get("reviewBundles") or [])
    per_general, total_answered, total_pending, pending_items = _summarize_review_bundles(bundles)
    applied_decision_count = 0

    if _bool_flag(state.get("requireHumanReviewInterrupt"), False) and total_pending > 0:
        batch_size = _int_flag(state.get("reviewInterruptBatchSize"), 3)
        response = interrupt(
            {
                "kind": "event-review-batch",
                "instructions": (
                    "請回傳 {\"decisions\": [...]}。每筆 decision 至少包含 candidateId 與 answer。"
                    "answer 可用 A/B/C/D，或 accept / accept-with-edits / reject / defer。"
                    "若要補欄位，可附上 edits，例如 summary/location/relationshipEdges/moodTags。"
                ),
                "studioRunRoot": state.get("studioRunRoot"),
                "answerLegend": {
                    "A": "accept",
                    "B": "accept-with-edits",
                    "C": "reject",
                    "D": "defer",
                },
                "items": pending_items[:batch_size],
            }
        )
        decisions = _normalize_review_decisions(response)
        if decisions:
            for bundle in bundles:
                answers_path = _resolve_path(bundle.get("answersPath"), Path(bundle.get("answersPath") or ""))
                payload = _read_optional_json(answers_path)
                questions = list(payload.get("questions") or [])
                updated = _apply_review_decisions(questions, decisions)
                if updated:
                    applied_decision_count += updated
                    payload["questions"] = questions
                    payload["lastHumanReviewAt"] = _utc_iso()
                    _write_json(answers_path, payload)
            per_general, total_answered, total_pending, pending_items = _summarize_review_bundles(bundles)

    return {
        "reviewCandidateSummary": {
            **dict(state.get("reviewCandidateSummary") or {}),
            "perGeneral": per_general,
            "answeredQuestions": total_answered,
            "pendingQuestions": total_pending,
            "humanReviewNeeded": total_pending > 0,
            "interruptEnabled": _bool_flag(state.get("requireHumanReviewInterrupt"), False),
            "interruptBatchSize": _int_flag(state.get("reviewInterruptBatchSize"), 3),
            "appliedDecisionCount": applied_decision_count,
            "pendingItemsPreview": pending_items[:5],
        }
    }


def enrich_review_context(state: SanguoETLRepairState) -> dict[str, Any]:
    if not _bool_flag(state.get("runContextEnrichment"), False):
        return {
            "contextEnrichmentSummary": {
                "skipped": True,
                "why": "runContextEnrichment=false；Studio 會先把這一步顯示出來，但不主動呼叫 reasoning 模型。",
            }
        }

    reasoning_model = str(state.get("reasoningModel") or DEFAULT_REASONING_MODEL)
    window_before = _int_flag(state.get("windowBefore"), DEFAULT_WINDOW_BEFORE)
    window_after = _int_flag(state.get("windowAfter"), DEFAULT_WINDOW_AFTER)
    fill_answers = _bool_flag(state.get("fillReviewAnswers"), False)
    overwrite = _bool_flag(state.get("overwriteOutputs"), True)

    updated_bundles: list[dict[str, Any]] = []
    logs = list(state.get("commandLogs") or [])
    success_count = 0

    for bundle in state.get("reviewBundles") or []:
        answers_path = _resolve_path(bundle.get("answersPath"), Path(bundle.get("answersPath") or ""))
        output_root = _resolve_path(bundle.get("outputRoot"), Path(bundle.get("outputRoot") or ""))
        args = [
            "--answers",
            _repo_relative(answers_path),
            "--output-root",
            _repo_relative(output_root),
            "--model",
            reasoning_model,
            "--window-before",
            str(window_before),
            "--window-after",
            str(window_after),
        ]
        if fill_answers:
            args.append("--fill-answers")
        if overwrite:
            args.append("--overwrite")
        payload = _run_pipeline_command("enrich_event_review_context.py", args)
        paths = _context_output_paths(output_root, answers_path)
        report = _read_optional_json(paths["report"])
        if payload["success"]:
            success_count += 1
        updated_bundles.append(
            {
                **bundle,
                "contextReportPath": _repo_relative(paths["report"]),
                "contextMarkdownPath": _repo_relative(paths["markdown"]),
                "enrichedAnswersPath": _repo_relative(paths["enrichedAnswers"]),
                "contextEnrichmentSuccess": payload["success"],
                "proposalCount": len(report.get("answers") or []),
            }
        )
        logs = _append_command_log({"commandLogs": logs}, payload, stage="enrich-review-context", generalId=bundle.get("generalId"))

    return {
        "reviewBundles": updated_bundles,
        "contextEnrichmentSummary": {
            "enabled": True,
            "successCount": success_count,
            "bundleCount": len(updated_bundles),
            "reasoningModel": reasoning_model,
        },
        "commandLogs": logs,
    }


def run_targeted_repair_review(state: SanguoETLRepairState) -> dict[str, Any]:
    if not _bool_flag(state.get("runRepairCampaign"), True):
        return {
            "repairCampaignSummary": {
                "skipped": True,
                "why": "runRepairCampaign=false；只顯示節點，不實際執行 repair-review campaign。",
            }
        }

    run_root = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_REPAIR_ROOT)
    repair_root = run_root / "repair-review"
    round_id = f"studio-repair-{state.get('studioRunId') or _utc_stamp()}"
    progress_root = repair_root / "knowledge-growth-progress"
    args = [
        "--round-id",
        round_id,
        "--repair-output-root",
        _repo_relative(repair_root / "backlog-repair-tasks"),
        "--rounds-root",
        _repo_relative(repair_root / "knowledge-growth-rounds"),
        "--event-seed-root",
        _repo_relative(repair_root / "event-question-seeds"),
        "--packet-root",
        _repo_relative(repair_root / "source-event-packets"),
        "--progress-root",
        _repo_relative(progress_root),
        "--top-per-general",
        str(_int_flag(state.get("topFocusGenerals"), 5)),
        "--reviewer-preset",
        str(state.get("reviewerPreset") or DEFAULT_REVIEWER_PRESET),
        "--reviewer-provider",
        str(state.get("reviewerProvider") or DEFAULT_REVIEWER_PROVIDER),
        "--step-timeout-seconds",
        str(_int_flag(state.get("stepTimeoutSeconds"), DEFAULT_STEP_TIMEOUT_SECONDS)),
    ]
    for general_id in (state.get("targetGeneralIds") or [])[:MAX_CAMPAIGN_GENERALS]:
        args.extend(["--general-id", general_id])
    if _bool_flag(state.get("overwriteOutputs"), True):
        args.append("--overwrite")

    payload = _run_pipeline_command("run_repair_review_campaign.py", args)
    summary_path = progress_root / f"{round_id}-campaign-summary.json"
    summary = _read_optional_json(summary_path)
    return {
        "repairCampaignSummary": {
            **summary,
            "success": payload["success"],
            "outputRoot": _repo_relative(repair_root),
            "summaryPath": _repo_relative(summary_path),
        },
        "commandLogs": _append_command_log(state, payload, stage="run-targeted-repair-review"),
    }


def refresh_api_readiness(state: SanguoETLRepairState) -> dict[str, Any]:
    if not _bool_flag(state.get("runApiReadinessRefresh"), True):
        return {
            "apiReadinessSummary": {
                "skipped": True,
                "why": "runApiReadinessRefresh=false；保留節點但不重建 runtime readiness fixtures。",
            }
        }

    general_id = _target_for_api_readiness(state)
    if not general_id:
        return {
            "apiReadinessSummary": {
                "skipped": True,
                "why": "No focus general available for readiness refresh.",
            }
        }

    pilot_output_root = _resolve_path(state.get("pilotOutputRoot"), Path("local/studio-etl-repair/etl-quality-pilot"))
    keyword_pack = pilot_output_root / "keyword-options" / f"{general_id}.keywords.json"
    persona_card = pilot_output_root / "persona-cards" / f"{general_id}.persona.json"
    if not keyword_pack.exists():
        for general in state.get("focusGenerals") or []:
            if general.get("generalId") == general_id and general.get("keywordPackPath"):
                keyword_pack = _resolve_path(str(general.get("keywordPackPath")), Path(str(general.get("keywordPackPath"))))
                break
    if not persona_card.exists():
        for general in state.get("focusGenerals") or []:
            if general.get("generalId") == general_id and general.get("personaCardPath"):
                persona_card = _resolve_path(str(general.get("personaCardPath")), Path(str(general.get("personaCardPath"))))
                break

    output_root = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_REPAIR_ROOT) / f"api-readiness-{general_id}"
    output_root.mkdir(parents=True, exist_ok=True)
    args = [
        "--general-id",
        general_id,
        "--output-root",
        _repo_relative(output_root),
    ]
    if keyword_pack.exists():
        args.extend(["--keyword-pack", _repo_relative(keyword_pack)])
    if persona_card.exists():
        args.extend(["--persona-card", _repo_relative(persona_card)])
    if _bool_flag(state.get("overwriteOutputs"), True):
        args.append("--overwrite")

    payload = _run_pipeline_command("build_api_readiness_index.py", args)
    context_options = _read_optional_json(output_root / "context-options.response.json")
    dialogue_probe = _read_optional_json(output_root / "dialogue-evidence-probe.json")

    readiness = str(dialogue_probe.get("readiness") or "unknown")
    ready_for_dialogue_smoke = readiness == "pass"
    summary = {
        "success": payload["success"],
        "generalId": general_id,
        "outputRoot": _repo_relative(output_root),
        "dialogueProbeReadiness": readiness,
        "contextOptionCount": len(context_options.get("options") or []),
        "readyForDialogueSmoke": ready_for_dialogue_smoke,
        "nextSuggestedGraph": "npc_brain_graph" if ready_for_dialogue_smoke else None,
    }
    return {
        "apiReadinessSummary": summary,
        "smokeReadiness": summary,
        "commandLogs": _append_command_log(state, payload, stage="refresh-api-readiness", generalId=general_id),
    }


def summarize_dialogue_smoke(state: SanguoETLRepairState) -> dict[str, Any]:
    primary_bottleneck = ((state.get("bottlenecks") or [{}]) + [{}])[0]
    review_summary = dict(state.get("reviewCandidateSummary") or {})
    repair_summary = dict(state.get("repairCampaignSummary") or {})
    readiness_summary = dict(state.get("apiReadinessSummary") or state.get("smokeReadiness") or {})
    next_best_move = (
        "切到 npc_brain_graph 做真正的 dialogue smoke。"
        if readiness_summary.get("readyForDialogueSmoke")
        else "先完成人工 review / enrich，再補 repair-review 後重新刷新 readiness。"
    )
    return {
        "smokeReadiness": {
            **readiness_summary,
            "focusGeneralIds": list(state.get("targetGeneralIds") or []),
            "primaryBottleneck": primary_bottleneck,
            "pendingReviewQuestions": review_summary.get("pendingQuestions"),
            "answeredReviewQuestions": review_summary.get("answeredQuestions"),
            "repairDeltaOverallPercent": repair_summary.get("deltaOverallPercent"),
            "studioRunRoot": state.get("studioRunRoot"),
            "nextBestMove": next_best_move,
        }
    }


def make_graph(_config: Any | None = None):
    builder = StateGraph(SanguoETLRepairState)
    builder.add_node("load_completion_summary", load_completion_summary)
    builder.add_node("load_campaign_summary", load_campaign_summary)
    builder.add_node("load_etl_pilot_report", load_etl_pilot_report)
    builder.add_node("load_review_queue", load_review_queue)
    builder.add_node("assess_completion_bottlenecks", assess_completion_bottlenecks)
    builder.add_node("select_focus_generals", select_focus_generals)
    builder.add_node("prepare_focus_workspace", prepare_focus_workspace)
    builder.add_node("refresh_focus_pilot", refresh_focus_pilot)
    builder.add_node("extract_event_review_candidates", extract_event_review_candidates)
    builder.add_node("review_candidates", review_candidates)
    builder.add_node("enrich_review_context", enrich_review_context)
    builder.add_node("run_targeted_repair_review", run_targeted_repair_review)
    builder.add_node("refresh_api_readiness", refresh_api_readiness)
    builder.add_node("summarize_dialogue_smoke", summarize_dialogue_smoke)

    builder.add_edge(START, "load_completion_summary")
    builder.add_edge("load_completion_summary", "load_campaign_summary")
    builder.add_edge("load_campaign_summary", "load_etl_pilot_report")
    builder.add_edge("load_etl_pilot_report", "load_review_queue")
    builder.add_edge("load_review_queue", "assess_completion_bottlenecks")
    builder.add_edge("assess_completion_bottlenecks", "select_focus_generals")
    builder.add_edge("select_focus_generals", "prepare_focus_workspace")
    builder.add_edge("prepare_focus_workspace", "refresh_focus_pilot")
    builder.add_edge("refresh_focus_pilot", "extract_event_review_candidates")
    builder.add_edge("extract_event_review_candidates", "review_candidates")
    builder.add_edge("review_candidates", "enrich_review_context")
    builder.add_edge("enrich_review_context", "run_targeted_repair_review")
    builder.add_edge("run_targeted_repair_review", "refresh_api_readiness")
    builder.add_edge("refresh_api_readiness", "summarize_dialogue_smoke")
    builder.add_edge("summarize_dialogue_smoke", END)
    return builder.compile()


graph = make_graph()
