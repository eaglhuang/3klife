from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/events")
DEFAULT_REASONING_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning/deepseek-reasoning-report.json")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DIRECT_BATTLE_TERMS = ["交鋒", "廝殺", "交戰", "搦戰", "親戰", "迎敵", "迎戰", "便戰", "酣戰", "直取", "攻打", "殺敗", "大敗", "截住", "追趕", "追襲", "斬", "殺"]
LOW_REVIEW_VALUE_TERMS = ["表陳", "薦爲", "除", "遷", "奏其功", "前功", "司馬", "縣令", "現居何職", "白身", "太守", "鎮", "招募", "來投", "來會", "帳前吏", "族弟", "弟兄", "習槍棒", "散家資"]
RANKING_SINGLE_ALIAS_HINTS = {
    "dong-zhuo": ["卓"],
    "lu-bu": ["布"],
    "zhang-fei": ["飛"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate human-review MCQ files for review-only Sanguo event candidates.")
    parser.add_argument("--candidates", default=str(DEFAULT_CANDIDATES_PATH), help="generic candidates JSONL path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--general-id", default=None, help="Optional generalId filter")
    parser.add_argument("--reasoning-report", default=None, help="Optional DeepSeek sidecar report JSON path")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path for focus alias ranking")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual roster path for focus alias ranking")
    parser.add_argument("--top", type=int, default=20, help="Maximum candidate count")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def output_paths(output_root: Path, general_id: str | None) -> tuple[Path, Path]:
    suffix = f".{general_id}" if general_id else ""
    return output_root / f"event-review-choices{suffix}.md", output_root / f"event-review-answers{suffix}.todo.json"


def ensure_output_root(output_root: Path, general_id: str | None, overwrite: bool) -> tuple[Path, Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    choices_path, answers_path = output_paths(output_root, general_id)
    existing = [path for path in [choices_path, answers_path] if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")
    return choices_path, answers_path


def focus_aliases(general_id: str | None, people_aliases: dict[str, list[str]]) -> list[str]:
    if not general_id:
        return []
    aliases = [alias for alias in people_aliases.get(general_id) or [] if len(alias) > 1]
    aliases.extend(RANKING_SINGLE_ALIAS_HINTS.get(general_id) or [])
    return sorted({alias for alias in aliases if alias}, key=len, reverse=True)


def normalize_candidate(candidate: dict) -> dict:
    normalized = dict(candidate)
    if not normalized.get("eventId"):
        normalized["eventId"] = normalized.get("candidateId") or normalized.get("taskId") or normalized.get("eventKey")
    if not normalized.get("candidateId"):
        normalized["candidateId"] = normalized.get("eventId")
    if not normalized.get("summary") and normalized.get("currentSummary"):
        normalized["summary"] = normalized.get("currentSummary")
    if not normalized.get("sourceQuote") and normalized.get("currentSourceQuote"):
        normalized["sourceQuote"] = normalized.get("currentSourceQuote")
    if not normalized.get("location") and normalized.get("currentLocation"):
        normalized["location"] = normalized.get("currentLocation")
    if not normalized.get("relationshipEdges") and normalized.get("currentRelationshipEdges"):
        normalized["relationshipEdges"] = normalized.get("currentRelationshipEdges")
    if not normalized.get("generalIds") and normalized.get("focusGeneralId"):
        normalized["generalIds"] = [normalized.get("focusGeneralId")]
    if not normalized.get("reviewStatus"):
        normalized["reviewStatus"] = normalized.get("repairStatus") or "needs-review"
    return normalized


def load_people_aliases(generals_path: Path, manual_roster_path: Path) -> dict[str, list[str]]:
    people: list[dict] = []
    if generals_path.exists():
        people.extend(read_json(generals_path))
    if manual_roster_path.exists():
        people.extend(read_json(manual_roster_path).get("entries") or [])
    aliases: dict[str, list[str]] = {}
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id:
            continue
        labels = [name] + [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        aliases[general_id] = sorted({label for label in labels if label}, key=len, reverse=True)
    return aliases


def focus_candidate_score(candidate: dict, general_id: str | None, people_aliases: dict[str, list[str]]) -> tuple:
    candidate = normalize_candidate(candidate)
    if not general_id:
        return (0, float(candidate.get("confidence") or 0), str(candidate.get("eventKey") or ""))
    text = "".join(str(candidate.get(key) or "") for key in ("sourceQuote", "summary"))
    aliases = focus_aliases(general_id, people_aliases)
    focus_hits = sum(1 for alias in aliases if alias and alias in text)
    has_direct_battle = any(term in text for term in DIRECT_BATTLE_TERMS)
    has_low_value = any(term in text for term in LOW_REVIEW_VALUE_TERMS)
    focus_edges = [
        edge for edge in candidate.get("relationshipEdges") or []
        if general_id in {edge.get("fromId"), edge.get("toId")}
    ]
    score = 0
    score += 80 if focus_hits else -20
    score += min(focus_hits, 3) * 8
    score += 30 if focus_edges else 0
    score += 22 if has_direct_battle else 0
    score -= 140 if has_low_value and not has_direct_battle else 0
    score -= 45 if has_low_value and has_direct_battle and not focus_edges else 0
    score += 8 if candidate.get("location") else 0
    score += 8 if candidate.get("relationshipEdges") else 0
    return (score, float(candidate.get("confidence") or 0), str(candidate.get("eventKey") or ""))


def filter_candidates(candidates: list[dict], general_id: str | None, top: int, people_aliases: dict[str, list[str]] | None = None) -> list[dict]:
    candidates = [normalize_candidate(candidate) for candidate in candidates]
    if general_id:
        candidates = [candidate for candidate in candidates if general_id in (candidate.get("generalIds") or [])]
    candidates = [candidate for candidate in candidates if candidate.get("reviewStatus", "needs-review") != "ready"]
    if general_id:
        aliases = people_aliases or {}
        candidates = sorted(candidates, key=lambda candidate: focus_candidate_score(candidate, general_id, aliases), reverse=True)
    return candidates[: max(top, 0)]


def load_reasoning_hints(path: Path | None) -> dict[str, dict]:
    if path is None or not path.exists():
        return {}
    report = read_json(path)
    hints: dict[str, dict] = {}
    for entry in (report.get("reasoning") or {}).get("genericCandidateAssessments") or []:
        event_key = entry.get("eventKey")
        if event_key:
            hints[event_key] = entry
    return hints


def default_reasoner_path(general_id: str | None) -> Path | None:
    if not general_id:
        return DEFAULT_REASONING_REPORT_PATH if DEFAULT_REASONING_REPORT_PATH.exists() else None
    pilot_path = Path(f"artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/deepseek-{general_id}/deepseek-reasoning-report.json")
    if pilot_path.exists():
        return pilot_path
    return DEFAULT_REASONING_REPORT_PATH if DEFAULT_REASONING_REPORT_PATH.exists() else None


def suggested_answer(candidate: dict, hint: dict | None) -> str | None:
    candidate = normalize_candidate(candidate)
    recommendation = (hint or {}).get("recommendation")
    if recommendation == "reject":
        return "C"
    if missing_fields(candidate):
        return "B"
    if candidate.get("eventType") == "female-interaction-candidate":
        return "B"
    if recommendation == "accept":
        return "A"
    if recommendation == "review":
        return "B"
    if candidate.get("relationshipEdges") and candidate.get("location"):
        return "A"
    return "B"


def choice_record(candidate: dict, hint: dict | None) -> dict:
    candidate = normalize_candidate(candidate)
    event_key = candidate.get("eventKey") or candidate.get("eventId")
    return {
        "candidateId": candidate.get("candidateId") or candidate.get("eventId"),
        "eventKey": event_key,
        "chapterNo": candidate.get("chapterNo"),
        "sourceRefs": candidate.get("sourceRefs") or [],
        "generalIds": candidate.get("generalIds") or [],
        "summary": candidate.get("summary"),
        "sourceQuote": candidate.get("sourceQuote"),
        "confidence": candidate.get("confidence"),
        "missingFields": missing_fields(candidate),
        "deepseekHint": hint or None,
        "suggestedAnswer": suggested_answer(candidate, hint),
        "answer": None,
        "allowedAnswers": {
            "A": "accept",
            "B": "accept-with-edits",
            "C": "reject",
            "D": "defer",
        },
        "edits": {
            "eventKey": event_key,
            "summary": candidate.get("summary"),
            "location": candidate.get("location"),
            "relationshipEdges": candidate.get("relationshipEdges") or [],
            "moodTags": candidate.get("moodTags") or [],
        },
    }


def missing_fields(candidate: dict) -> list[str]:
    candidate = normalize_candidate(candidate)
    missing = []
    if not candidate.get("location"):
        missing.append("location")
    if not candidate.get("relationshipEdges"):
        missing.append("relationshipEdges")
    if not candidate.get("sourceRefs"):
        missing.append("sourceRefs")
    if not candidate.get("generalIds"):
        missing.append("generalIds")
    return missing


def render_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "# Event Review Choices",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- General Filter: `{payload.get('generalId') or 'all'}`",
        f"- Candidate Count: `{len(payload['questions'])}`",
        f"- Canonical Writes: `{payload['canonicalWrites']}`",
        "",
        "每題請在 `event-review-answers*.todo.json` 填 `answer`：`A accept` / `B accept-with-edits` / `C reject` / `D defer`。",
        "",
    ]
    for index, question in enumerate(payload["questions"], start=1):
        hint = question.get("deepseekHint") or {}
        reasons = "; ".join(hint.get("reasons") or []) or "-"
        lines.extend([
            f"## Q{index}. `{question['eventKey']}`",
            "",
            f"- Candidate ID: `{question.get('candidateId')}`",
            f"- Chapter: `{question.get('chapterNo')}`",
            f"- Source Refs: `{', '.join(question.get('sourceRefs') or [])}`",
            f"- General IDs: `{', '.join(question.get('generalIds') or [])}`",
            f"- Confidence: `{question.get('confidence')}`",
            f"- Missing Fields: `{', '.join(question.get('missingFields') or []) or '-'}`",
            f"- Suggested Answer: `{question.get('suggestedAnswer') or '-'}`",
            f"- DeepSeek Recommendation: `{hint.get('recommendation') or '-'}`",
            f"- DeepSeek Reasons: {reasons}",
            "",
            "Source Quote:",
            "",
            f"> {question.get('sourceQuote') or '-'}",
            "",
            "Options:",
            "",
            "- `A accept`: 直接接受為正式事件候選。",
            "- `B accept-with-edits`: 接受但需補 location / relationshipEdges / summary 等欄位。",
            "- `C reject`: 排除，不進正式事件。",
            "- `D defer`: 暫緩，保留到下一輪 review。",
            "",
        ])
    return "\n".join(lines)


def build_payload(args: argparse.Namespace) -> dict:
    people_aliases = load_people_aliases(Path(args.generals), Path(args.manual_roster)) if args.general_id else {}
    candidates = filter_candidates(read_jsonl(Path(args.candidates)), args.general_id, args.top, people_aliases)
    reasoning_path = Path(args.reasoning_report) if args.reasoning_report else default_reasoner_path(args.general_id)
    hints = load_reasoning_hints(reasoning_path)
    questions = [choice_record(candidate, hints.get(candidate.get("eventKey") or candidate.get("eventId"))) for candidate in candidates]
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "event-review-mcq",
        "canonicalWrites": False,
        "generalId": args.general_id,
        "inputs": {
            "candidatesPath": str(Path(args.candidates)),
            "reasoningReportPath": str(reasoning_path) if reasoning_path else None,
        },
        "questions": questions,
    }


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    choices_path, answers_path = ensure_output_root(output_root, args.general_id, args.overwrite)
    payload = build_payload(args)
    choices_path.write_text(render_markdown(payload), encoding="utf-8")
    answers_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[generate_event_review_choices] wrote {choices_path}")
    print(f"[generate_event_review_choices] wrote {answers_path}")
    print(f"[generate_event_review_choices] questions={len(payload['questions'])} canonicalWrites=false")


if __name__ == "__main__":
    main()
