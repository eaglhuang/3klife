from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt


REPO_ROOT = Path(__file__).resolve().parents[3]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")
DEFAULT_STUDIO_OUTPUT_ROOT = Path("local/studio-progress-advancement")


class SanguoProgressAdvancementState(TypedDict, total=False):
    runLabel: str | None
    studioOutputRoot: str | None
    overwriteOutputs: bool
    dryRun: bool
    maxRounds: int
    maxABCycles: int
    topGenerals: int
    topPerGeneral: int
    generalIds: list[str]
    reviewerPreset: str | None
    reviewerProvider: str | None
    stepTimeoutSeconds: int
    noImprovementThreshold: float
    noImprovementPatience: int
    pendingReviewLimit: int
    sameResidualRepeatLimit: int
    reviewBatchSize: int
    reviewDecisionsPath: str | None
    requireHumanReviewInterrupt: bool
    studioRunId: str
    studioRunRoot: str
    progressSummary: dict[str, Any]
    reviewBatches: list[dict[str, Any]]
    residualReviewPath: str | None
    commandLogs: list[dict[str, Any]]
    reviewDecisionsApplied: bool
    nextBestMove: str | None
    studioTips: list[str]


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def _repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def _resolve_path(path_text: str | None, default_path: Path) -> Path:
    raw_path = Path(path_text) if path_text else default_path
    if raw_path.is_absolute():
        return raw_path.resolve()
    return (REPO_ROOT / raw_path).resolve()


def _read_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
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


def prepare_progress_workspace(state: SanguoProgressAdvancementState) -> dict[str, Any]:
    run_label = str(state.get("runLabel") or f"progress-advancement-{_utc_stamp()}")
    run_id = run_label.strip().replace(" ", "-") or f"progress-advancement-{_utc_stamp()}"
    output_root = _resolve_path(state.get("studioOutputRoot"), DEFAULT_STUDIO_OUTPUT_ROOT)
    output_root.mkdir(parents=True, exist_ok=True)
    return {
        "studioRunId": run_id,
        "studioRunRoot": _repo_relative(output_root),
        "commandLogs": list(state.get("commandLogs") or []),
    }


def _build_progress_args(state: SanguoProgressAdvancementState) -> list[str]:
    args = [
        "--run-id",
        str(state.get("studioRunId") or f"progress-advancement-{_utc_stamp()}"),
        "--output-root",
        str(state.get("studioRunRoot") or _repo_relative(DEFAULT_STUDIO_OUTPUT_ROOT)),
        "--max-rounds",
        str(int(state.get("maxRounds") or 3)),
        "--max-ab-cycles",
        str(int(state.get("maxABCycles") or 3)),
        "--top-generals",
        str(int(state.get("topGenerals") or 5)),
        "--top-per-general",
        str(int(state.get("topPerGeneral") or 5)),
        "--reviewer-preset",
        str(state.get("reviewerPreset") or "agent"),
        "--reviewer-provider",
        str(state.get("reviewerProvider") or "agent-reviewer"),
        "--step-timeout-seconds",
        str(int(state.get("stepTimeoutSeconds") or 30)),
        "--no-improvement-threshold",
        str(float(state.get("noImprovementThreshold") or 0.05)),
        "--no-improvement-patience",
        str(int(state.get("noImprovementPatience") or 2)),
        "--pending-review-limit",
        str(int(state.get("pendingReviewLimit") or 15)),
        "--same-residual-repeat-limit",
        str(int(state.get("sameResidualRepeatLimit") or 2)),
        "--review-batch-size",
        str(int(state.get("reviewBatchSize") or 10)),
    ]
    if _bool_flag(state.get("overwriteOutputs"), True):
        args.append("--overwrite")
    if _bool_flag(state.get("dryRun"), False):
        args.append("--dry-run")
    for general_id in state.get("generalIds") or []:
        args.extend(["--general-id", str(general_id)])
    if state.get("reviewDecisionsPath"):
        args.extend(["--review-decisions", str(state.get("reviewDecisionsPath"))])
    return args


def run_progress_advancement(state: SanguoProgressAdvancementState) -> dict[str, Any]:
    args = _build_progress_args(state)
    payload = _run_pipeline_command("run_progress_advancement_loop.py", args)
    run_root = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_OUTPUT_ROOT) / str(state.get("studioRunId"))
    summary_path = run_root / "progress-advancement-summary.json"
    residual_path = run_root / "residual-review.md"
    summary = _read_optional_json(summary_path)
    return {
        "progressSummary": summary,
        "reviewBatches": list(summary.get("reviewBatches") or []),
        "residualReviewPath": _repo_relative(residual_path) if residual_path.exists() else None,
        "commandLogs": list(state.get("commandLogs") or []) + [payload],
    }


def maybe_request_b_review(state: SanguoProgressAdvancementState) -> dict[str, Any]:
    summary = dict(state.get("progressSummary") or {})
    if not _bool_flag(state.get("requireHumanReviewInterrupt"), False):
        return {}
    if _bool_flag(state.get("reviewDecisionsApplied"), False):
        return {}
    if summary.get("nextRoute") != "B-review":
        return {}
    review_batches = list(state.get("reviewBatches") or [])
    if not review_batches:
        return {}

    latest_batch = review_batches[-1]
    batch_path = _resolve_path(str(latest_batch.get("jsonPath") or ""), Path(str(latest_batch.get("jsonPath") or "")))
    batch_payload = _read_optional_json(batch_path)
    if not batch_payload:
        return {}

    response = interrupt(
        {
            "kind": "progress-advancement-b-review",
            "instructions": "請回傳 {\"decisions\": [...]}，每筆 decision 至少包含 candidateId 與 answer，可附 edits/notes。",
            "runId": state.get("studioRunId"),
            "batchPath": latest_batch.get("jsonPath"),
            "items": batch_payload.get("items") or [],
            "decisionTemplate": batch_payload.get("decisionTemplate") or {"decisions": []},
        }
    )
    decisions_path = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_OUTPUT_ROOT) / str(state.get("studioRunId")) / "studio-review-decisions.json"
    _write_json(decisions_path, response)
    return {
        "reviewDecisionsPath": _repo_relative(decisions_path),
    }


def rerun_progress_advancement_with_review(state: SanguoProgressAdvancementState) -> dict[str, Any]:
    if not state.get("reviewDecisionsPath"):
        return {}
    if _bool_flag(state.get("reviewDecisionsApplied"), False):
        return {}
    summary = dict(state.get("progressSummary") or {})
    if summary.get("nextRoute") != "B-review":
        return {"reviewDecisionsApplied": True}

    args = _build_progress_args(state)
    payload = _run_pipeline_command("run_progress_advancement_loop.py", args)
    run_root = _resolve_path(state.get("studioRunRoot"), DEFAULT_STUDIO_OUTPUT_ROOT) / str(state.get("studioRunId"))
    summary_path = run_root / "progress-advancement-summary.json"
    residual_path = run_root / "residual-review.md"
    summary = _read_optional_json(summary_path)
    return {
        "progressSummary": summary,
        "reviewBatches": list(summary.get("reviewBatches") or []),
        "residualReviewPath": _repo_relative(residual_path) if residual_path.exists() else None,
        "commandLogs": list(state.get("commandLogs") or []) + [payload],
        "reviewDecisionsApplied": True,
    }


def summarize_progress_advancement(state: SanguoProgressAdvancementState) -> dict[str, Any]:
    summary = dict(state.get("progressSummary") or {})
    latest_batch = ((summary.get("reviewBatches") or [{}]) + [{}])[-1]
    latest_batch_path = latest_batch.get("markdownPath")
    residual_path = state.get("residualReviewPath")
    next_best_move = str(summary.get("nextRecommendedAction") or "請先檢查 summary，再決定下一步 workflow。")
    studio_tips: list[str] = []

    next_route = str(summary.get("nextRoute") or "")
    if next_route == "B-review" and latest_batch_path:
        studio_tips.append(f"下一步：先開啟 B 審核批次 {latest_batch_path}")
    elif next_route == "C-residual-dossier" and residual_path:
        studio_tips.append(f"下一步：先讀 residual dossier {residual_path}")
    elif next_route == "complete":
        studio_tips.append("目前這輪已無剩餘 repair backlog，可改檢查 pilot review queue 或另開新的 focus cohort。")
    else:
        studio_tips.append("先看 stopReason 與 nextRoute，再決定要續跑 A、進 B，或改做 C。")

    if summary.get("bReviewCount"):
        studio_tips.append(f"本輪已套用 B 審核 {summary.get('bReviewCount')} 次。")

    return {
        "nextBestMove": next_best_move,
        "studioTips": studio_tips,
        "progressSummary": {
            **summary,
            "latestReviewBatchPath": latest_batch_path,
            "residualReviewPath": residual_path,
            "studioTips": studio_tips,
        },
    }


def make_graph(_config: Any | None = None):
    builder = StateGraph(SanguoProgressAdvancementState)
    builder.add_node("準備進度工作區", prepare_progress_workspace)
    builder.add_node("執行A輪自動推進", run_progress_advancement)
    builder.add_node("等待B階段審核", maybe_request_b_review)
    builder.add_node("套用B審核並續跑", rerun_progress_advancement_with_review)
    builder.add_node("整理進度摘要", summarize_progress_advancement)

    builder.add_edge(START, "準備進度工作區")
    builder.add_edge("準備進度工作區", "執行A輪自動推進")
    builder.add_edge("執行A輪自動推進", "等待B階段審核")
    builder.add_edge("等待B階段審核", "套用B審核並續跑")
    builder.add_edge("套用B審核並續跑", "整理進度摘要")
    builder.add_edge("整理進度摘要", END)
    return builder.compile()


graph = make_graph()
