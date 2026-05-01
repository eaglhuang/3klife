from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from .graph import POPULAR_TEST_GENERALS, PopularGeneralIdValue


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_COMPLETION_SUMMARY_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress/repair-review-r2-wide-merged.json"
)
DEFAULT_CAMPAIGN_SUMMARY_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress/repair-review-r2-wide-campaign-summary.json"
)
DEFAULT_ETL_PILOT_REPORT_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json"
)
DEFAULT_REVIEW_QUEUE_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/review-queue.todo.json"
)
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")
REPAIR_CAMPAIGN_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")

ETLStatusValue = Literal["ready-for-dialogue-smoke", "thin-but-testable", "needs-etl-evidence"]


class SanguoETLState(TypedDict, total=False):
    focusGeneralId: PopularGeneralIdValue | None
    customFocusGeneralId: str | None
    focusStatus: ETLStatusValue | None
    topFocusGenerals: int
    completionSummaryPath: str | None
    campaignSummaryPath: str | None
    etlPilotReportPath: str | None
    reviewQueuePath: str | None
    completionSummary: dict[str, Any]
    campaignSummary: dict[str, Any]
    etlPilotReport: dict[str, Any]
    reviewQueueQuestions: list[dict[str, Any]]
    bottlenecks: list[dict[str, Any]]
    popularGeneralCandidates: list[dict[str, str]]
    resolvedFocusGeneralId: str | None
    focusGenerals: list[dict[str, Any]]
    focusReviewQuestions: list[dict[str, Any]]
    recommendedCommands: list[dict[str, Any]]
    optimizationLoop: list[dict[str, Any]]
    optimizationSummary: dict[str, Any]


def _resolve_path(path_text: str | None, default_path: Path) -> Path:
    raw_path = Path(path_text) if path_text else default_path
    if raw_path.is_absolute():
        return raw_path
    return (REPO_ROOT / raw_path).resolve()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _repo_relative(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def _resolve_focus_general_id(state: SanguoETLState) -> str | None:
    custom_focus_general_id = (state.get("customFocusGeneralId") or "").strip()
    if custom_focus_general_id:
        return custom_focus_general_id
    focus_general_id = state.get("focusGeneralId")
    if focus_general_id:
        return str(focus_general_id)
    return None


def load_completion_summary(state: SanguoETLState) -> dict[str, Any]:
    completion_summary_path = _resolve_path(state.get("completionSummaryPath"), DEFAULT_COMPLETION_SUMMARY_PATH)
    return {
        "completionSummary": _read_json(completion_summary_path),
    }


def load_campaign_summary(state: SanguoETLState) -> dict[str, Any]:
    campaign_summary_path = _resolve_path(state.get("campaignSummaryPath"), DEFAULT_CAMPAIGN_SUMMARY_PATH)
    return {
        "campaignSummary": _read_json(campaign_summary_path),
        "popularGeneralCandidates": [dict(candidate) for candidate in POPULAR_TEST_GENERALS],
        "resolvedFocusGeneralId": _resolve_focus_general_id(state),
    }


def load_etl_pilot_report(state: SanguoETLState) -> dict[str, Any]:
    etl_pilot_report_path = _resolve_path(state.get("etlPilotReportPath"), DEFAULT_ETL_PILOT_REPORT_PATH)
    return {
        "etlPilotReport": _read_json(etl_pilot_report_path),
    }


def load_review_queue(state: SanguoETLState) -> dict[str, Any]:
    review_queue_path = _resolve_path(state.get("reviewQueuePath"), DEFAULT_REVIEW_QUEUE_PATH)
    payload = _read_json(review_queue_path)
    return {
        "reviewQueueQuestions": list(payload.get("questions") or []),
    }


def assess_completion_bottlenecks(state: SanguoETLState) -> dict[str, Any]:
    completion = (state.get("completionSummary") or {}).get("completion") or {}
    raw_scores = completion.get("rawScores") or {}
    weights = completion.get("weights") or {}
    observed_counts = completion.get("observedCounts") or {}
    targets = completion.get("targets") or {}
    notes = {
        "eventQuestionCoverage": {
            "why": "event question seed 與 source packet 還是最大權重缺口，先補它最能推 overall。",
            "observed": observed_counts.get("sourceGroundedEventQuestionSeedCount"),
            "target": targets.get("eventQuestionSlots"),
        },
        "relationshipGraph": {
            "why": "relationship edge 與 source-grounded relationship evidence 仍偏薄。",
            "observed": observed_counts.get("relationshipEdgeCount"),
            "target": targets.get("relationshipEdges"),
        },
        "reviewValidation": {
            "why": "preview A/B 答案轉正率還低，表示 review queue 仍是 bottleneck。",
            "observed": observed_counts.get("previewAcceptedA"),
            "target": observed_counts.get("previewTotalAnswers"),
        },
        "femalePriority": {
            "why": "女性互動與 female coverage 仍需要持續補量。",
            "observed": observed_counts.get("sampledFemaleGeneralCount"),
            "target": targets.get("femaleProfiles"),
        },
    }
    bottlenecks: list[dict[str, Any]] = []
    for dimension, score in raw_scores.items():
        weight = float(weights.get(dimension) or 0.0)
        score_value = float(score or 0.0)
        weighted_gap = round(weight * (1.0 - score_value), 2)
        note = notes.get(dimension, {})
        bottlenecks.append(
            {
                "dimension": dimension,
                "score": round(score_value, 4),
                "weight": weight,
                "weightedGapPoints": weighted_gap,
                "observed": note.get("observed"),
                "target": note.get("target"),
                "why": note.get("why") or "用權重 x 缺口估算優先級。",
            }
        )
    bottlenecks.sort(key=lambda item: item["weightedGapPoints"], reverse=True)
    return {"bottlenecks": bottlenecks}


def select_focus_generals(state: SanguoETLState) -> dict[str, Any]:
    focus_general_id = state.get("resolvedFocusGeneralId") or _resolve_focus_general_id(state)
    focus_status = state.get("focusStatus")
    top_focus_generals = max(int(state.get("topFocusGenerals") or 5), 1)
    pilot_generals = list((state.get("etlPilotReport") or {}).get("generals") or [])
    campaign_selected_generals = set((state.get("campaignSummary") or {}).get("selectedGenerals") or [])

    filtered_generals = pilot_generals
    if focus_general_id:
        filtered_generals = [general for general in filtered_generals if general.get("generalId") == focus_general_id]
    if focus_status:
        filtered_generals = [general for general in filtered_generals if general.get("status") == focus_status]

    def sort_key(general: dict[str, Any]) -> tuple[Any, ...]:
        return (
            0 if general.get("generalId") in campaign_selected_generals else 1,
            0 if general.get("status") == "needs-etl-evidence" else 1,
            -int(general.get("genericCandidateCount") or 0),
            int(general.get("eventCount") or 0),
            -int(general.get("keywordTotal") or 0),
        )

    focus_generals = sorted(filtered_generals, key=sort_key)[:top_focus_generals]
    selected_general_ids = {str(general.get("generalId")) for general in focus_generals if general.get("generalId")}
    focus_review_questions = list(state.get("reviewQueueQuestions") or [])
    if focus_general_id:
        focus_review_questions = [question for question in focus_review_questions if question.get("generalId") == focus_general_id]
    elif focus_status == "needs-etl-evidence":
        focus_review_questions = [
            question for question in focus_review_questions if question.get("status") == "needs-etl-evidence"
        ]
    else:
        focus_review_questions = [
            question for question in focus_review_questions if question.get("generalId") in selected_general_ids
        ]

    return {
        "resolvedFocusGeneralId": focus_general_id,
        "focusGenerals": focus_generals,
        "focusReviewQuestions": focus_review_questions[:top_focus_generals],
    }


def _command_dict(label: str, command: str, why: str, stage: str) -> dict[str, str]:
    return {
        "label": label,
        "command": command,
        "why": why,
        "stage": stage,
    }


def build_next_etl_plan(state: SanguoETLState) -> dict[str, Any]:
    bottlenecks = list(state.get("bottlenecks") or [])
    focus_generals = list(state.get("focusGenerals") or [])
    focus_review_questions = list(state.get("focusReviewQuestions") or [])
    focus_general_id = state.get("resolvedFocusGeneralId")
    review_queue_count = len(state.get("reviewQueueQuestions") or [])

    target_general_ids: list[str] = []
    for general in focus_generals:
        general_id = general.get("generalId")
        if general_id and general_id not in target_general_ids:
            target_general_ids.append(str(general_id))
    for question in focus_review_questions:
        general_id = question.get("generalId")
        if general_id and general_id not in target_general_ids:
            target_general_ids.append(str(general_id))
    if focus_general_id and focus_general_id not in target_general_ids:
        target_general_ids.insert(0, focus_general_id)

    recommended_commands: list[dict[str, str]] = []
    optimization_loop: list[dict[str, Any]] = []

    if target_general_ids:
        pilot_command_parts = [
            "$HOME/.venv/3klife-etl/bin/python",
            "server/npc-brain/pipelines/sanguo-rag/run_etl_quality_pilot.py",
        ]
        for general_id in target_general_ids[:5]:
            pilot_command_parts.extend(["--general-id", general_id])
        pilot_command_parts.append("--overwrite")
        recommended_commands.append(
            _command_dict(
                label="refresh-etl-pilot-focus",
                command=" ".join(pilot_command_parts),
                why="先把 focus generals 的 pilot 報表刷新，避免用過期的 keyword/persona 與 review queue 做決策。",
                stage="diagnose",
            )
        )

    for general_id in target_general_ids[:3]:
        output_root = REPAIR_CAMPAIGN_OUTPUT_ROOT / f"event-review-{general_id}"
        reasoning_report_path = REPAIR_CAMPAIGN_OUTPUT_ROOT / f"deepseek-{general_id}" / "deepseek-reasoning-report.json"
        command_parts = [
            "$HOME/.venv/3klife-etl/bin/python",
            "server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py",
            "--general-id",
            general_id,
            "--output-root",
            _repo_relative(output_root),
        ]
        if reasoning_report_path.exists():
            command_parts.extend(["--reasoning-report", _repo_relative(reasoning_report_path)])
        command_parts.append("--overwrite")
        recommended_commands.append(
            _command_dict(
                label=f"review-choices-{general_id}",
                command=" ".join(command_parts),
                why="先把 generic battle candidates 轉成 review MCQ，才能往 A/B 收斂。",
                stage="review-choices",
            )
        )

        answers_path = output_root / f"event-review-answers.{general_id}.todo.json"
        if answers_path.exists():
            recommended_commands.append(
                _command_dict(
                    label=f"enrich-review-context-{general_id}",
                    command=(
                        "$HOME/.venv/3klife-etl/bin/python "
                        "server/npc-brain/pipelines/sanguo-rag/enrich_event_review_context.py "
                        f"--answers {_repo_relative(answers_path)} --model deepseek-r1:7b "
                        "--window-before 2 --window-after 2 --fill-answers --overwrite"
                    ),
                    why="若單段 sourceQuote 不夠，先補上下文與 relationship/location hints，再讓 review-only edits 收斂。",
                    stage="context-enrichment",
                )
            )

    if target_general_ids:
        repair_command_parts = [
            "$HOME/.venv/3klife-etl/bin/python",
            "server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py",
            "--round-id",
            "repair-review-r3-auto",
        ]
        for general_id in target_general_ids[:5]:
            repair_command_parts.extend(["--general-id", general_id])
        repair_command_parts.extend([
            "--top-per-general",
            "5",
            "--reviewer-preset",
            "agent",
            "--reviewer-provider",
            "agent-reviewer",
            "--overwrite",
        ])
        recommended_commands.append(
            _command_dict(
                label="targeted-repair-review-campaign",
                command=" ".join(repair_command_parts),
                why="把已識別的高槓桿 generals 送進下一輪 repair-review wave，直接推 event seeds / packets / completion。",
                stage="campaign",
            )
        )

    readiness_general_id = None
    for general in focus_generals:
        if general.get("status") == "ready-for-dialogue-smoke":
            readiness_general_id = general.get("generalId")
            break
    if readiness_general_id is None and focus_general_id:
        readiness_general_id = focus_general_id
    if readiness_general_id:
        recommended_commands.append(
            _command_dict(
                label=f"refresh-api-readiness-{readiness_general_id}",
                command=(
                    "$HOME/.venv/3klife-etl/bin/python "
                    "server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py "
                    f"--general-id {readiness_general_id} --overwrite"
                ),
                why="當事件 / keyword 有更新後，最後重建 runtime fixtures，讓 NPC graph 與 Cocos smoke test 直接吃到新資料。",
                stage="runtime-fixtures",
            )
        )

    top_bottlenecks = bottlenecks[:3]
    optimization_loop.append(
        {
            "step": 1,
            "label": "measure-current-bottlenecks",
            "focus": [item.get("dimension") for item in top_bottlenecks],
            "why": "先看 weighted gap 最大的維度，避免把時間花在低槓桿修補。",
        }
    )
    optimization_loop.append(
        {
            "step": 2,
            "label": "convert-candidates-to-review-choices",
            "targets": target_general_ids[:3],
            "why": "把 generic candidates 轉成可審核 MCQ，是 eventQuestionCoverage 與 reviewValidation 的共同入口。",
        }
    )
    optimization_loop.append(
        {
            "step": 3,
            "label": "enrich-source-context-before-accepting-A",
            "targets": [question.get("generalId") for question in focus_review_questions[:3]],
            "why": "對 location / relationship 缺上下文的題目，先補 expanded context，再做 A/B 判斷。",
        }
    )
    optimization_loop.append(
        {
            "step": 4,
            "label": "run-targeted-repair-review-wave",
            "targets": target_general_ids[:5],
            "why": "把已補好的 queue 推回 repair-review campaign，讓 ready events、question seeds、source packets 一起更新。",
        }
    )
    optimization_loop.append(
        {
            "step": 5,
            "label": "refresh-runtime-fixtures-and-smoke",
            "targets": [readiness_general_id] if readiness_general_id else [],
            "why": "最後重建 API readiness fixtures，再回 Studio / Cocos 做對話 smoke。",
        }
    )

    primary_bottleneck = top_bottlenecks[0] if top_bottlenecks else None
    optimization_summary = {
        "primaryBottleneck": primary_bottleneck,
        "reviewQueueCount": review_queue_count,
        "focusGeneralIds": target_general_ids[:5],
        "recommendedCommandCount": len(recommended_commands),
        "nextBestMove": (
            "先把 needs-etl-evidence generals 轉成 review choices，再用 targeted repair-review campaign 回灌 completion。"
            if focus_review_questions
            else "先刷新 focus generals 的 ETL pilot 與 API readiness，確認 bottleneck 是否仍然成立。"
        ),
    }
    return {
        "recommendedCommands": recommended_commands,
        "optimizationLoop": optimization_loop,
        "optimizationSummary": optimization_summary,
    }


def make_graph(_config: Any | None = None):
    builder = StateGraph(SanguoETLState)
    builder.add_node("load_completion_summary", load_completion_summary)
    builder.add_node("load_campaign_summary", load_campaign_summary)
    builder.add_node("load_etl_pilot_report", load_etl_pilot_report)
    builder.add_node("load_review_queue", load_review_queue)
    builder.add_node("assess_completion_bottlenecks", assess_completion_bottlenecks)
    builder.add_node("select_focus_generals", select_focus_generals)
    builder.add_node("build_next_etl_plan", build_next_etl_plan)

    builder.add_edge(START, "load_completion_summary")
    builder.add_edge("load_completion_summary", "load_campaign_summary")
    builder.add_edge("load_campaign_summary", "load_etl_pilot_report")
    builder.add_edge("load_etl_pilot_report", "load_review_queue")
    builder.add_edge("load_review_queue", "assess_completion_bottlenecks")
    builder.add_edge("assess_completion_bottlenecks", "select_focus_generals")
    builder.add_edge("select_focus_generals", "build_next_etl_plan")
    builder.add_edge("build_next_etl_plan", END)
    return builder.compile()


graph = make_graph()