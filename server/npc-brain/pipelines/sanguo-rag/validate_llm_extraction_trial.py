from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError, model_validator
from repo_layout import pipeline_config_path, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_DIALOGUE_RESOLUTION_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.json")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial")


class LlmRelationshipEdge(BaseModel):
    fromId: str
    toId: str
    type: str
    evidenceRefs: list[str] = Field(default_factory=list)
    edgeConfidence: float = Field(ge=0.0, le=1.0)
    edgeStrength: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_confidence(cls, raw_value):
        if isinstance(raw_value, dict) and "edgeConfidence" not in raw_value and "confidence" in raw_value:
            raw_value = dict(raw_value)
            raw_value["edgeConfidence"] = raw_value.get("confidence")
        return raw_value


class LlmEventOutput(BaseModel):
    eventId: str
    eventKey: str
    generalIds: list[str]
    summary: str
    relationshipEdges: list[LlmRelationshipEdge] = Field(default_factory=list)
    moodTags: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    sourceRefs: list[str]

    @model_validator(mode="after")
    def ensure_source_refs(self):
        if not self.sourceRefs:
            raise ValueError("sourceRefs must not be empty")
        return self


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and validate an offline LLM extraction trial against deterministic events.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events.jsonl path")
    parser.add_argument("--dialogue-resolution", default=str(DEFAULT_DIALOGUE_RESOLUTION_PATH), help="dialogue-resolution.json path")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual-roster-seeds.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_events(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_allowed_general_ids(generals_path: Path, manual_roster_path: Path) -> set[str]:
    allowed: set[str] = set()
    if generals_path.exists():
        allowed.update(str(entry.get("id")) for entry in read_json(generals_path) if entry.get("id"))
    if manual_roster_path.exists():
        payload = read_json(manual_roster_path)
        allowed.update(str(entry.get("generalId")) for entry in payload.get("entries") or [] if entry.get("generalId"))
    return allowed


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [output_root / "llm-trial-prompt-bundle.json", output_root / "llm-trial-report.json", output_root / "llm-trial-report.md"]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def validate_event_output(raw_event: dict, allowed_general_ids: set[str]) -> tuple[bool, str | None]:
    try:
        event = LlmEventOutput.model_validate(raw_event)
    except ValidationError as exc:
        return False, str(exc)
    unknown = sorted(general_id for general_id in event.generalIds if general_id not in allowed_general_ids)
    if unknown:
        return False, f"Unknown generalIds: {unknown}"
    hallucinated_edge_ids = sorted(
        value
        for edge in event.relationshipEdges
        for value in (edge.fromId, edge.toId)
        if value.endswith("-general") and value not in allowed_general_ids
    )
    if hallucinated_edge_ids:
        return False, f"Unknown edge ids: {hallucinated_edge_ids}"
    return True, None


def build_prompt_bundle(events: list[dict], dialogue_resolution_path: Path) -> dict:
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "offline-schema-trial",
        "instruction": "LLM may summarize and classify relationships, but must not invent generalIds or sourceRefs.",
        "dialogueResolutionPath": str(dialogue_resolution_path),
        "events": [
            {
                "eventId": event.get("eventId"),
                "eventKey": event.get("eventKey"),
                "generalIds": event.get("generalIds") or [],
                "sourceQuote": event.get("sourceQuote"),
                "sourceRefs": event.get("sourceRefs") or [],
                "relationshipEdges": event.get("relationshipEdges") or [],
            }
            for event in events
        ],
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# LLM Extraction Trial Report",
        "",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Result: `{'PASS' if report['passed'] else 'FAIL'}`",
        f"- Baseline Accepted: `{report['baselineAcceptedCount']}`",
        f"- Hallucination Rejected: `{report['hallucinationRejected']}`",
        "",
        "## Checks",
        "",
    ]
    for check in report["checks"]:
        lines.append(f"- `{check['name']}`: `{'PASS' if check['passed'] else 'FAIL'}` {check.get('detail') or ''}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)
    events = load_events(Path(args.events))
    allowed_general_ids = load_allowed_general_ids(Path(args.generals), Path(args.manual_roster))
    prompt_bundle = build_prompt_bundle(events, Path(args.dialogue_resolution))

    checks = []
    accepted = 0
    for event in events:
        trial_output = {
            "eventId": event.get("eventId"),
            "eventKey": event.get("eventKey"),
            "generalIds": event.get("generalIds") or [],
            "summary": event.get("summary") or "",
            "relationshipEdges": event.get("relationshipEdges") or [],
            "moodTags": event.get("moodTags") or [],
            "confidence": event.get("confidence") or 0,
            "sourceRefs": event.get("sourceRefs") or [],
        }
        passed, error = validate_event_output(trial_output, allowed_general_ids)
        checks.append({"name": f"baseline:{event.get('eventKey')}", "passed": passed, "detail": error})
        if passed:
            accepted += 1

    hallucinated = {
        "eventId": "romance.ch042.fake",
        "eventKey": "fake-hallucinated-event",
        "generalIds": ["fake-general"],
        "summary": "This should be rejected.",
        "relationshipEdges": [],
        "moodTags": [],
        "confidence": 0.99,
        "sourceRefs": ["042#p4"],
    }
    hallucination_passed, hallucination_error = validate_event_output(hallucinated, allowed_general_ids)
    checks.append({"name": "hallucinated-generalId-rejection", "passed": not hallucination_passed, "detail": hallucination_error})

    malformed_json_rejected = False
    malformed_detail = None
    try:
        json.loads("{not-valid-json")
    except json.JSONDecodeError as exc:
        malformed_json_rejected = True
        malformed_detail = str(exc)
    checks.append({"name": "malformed-json-rejection", "passed": malformed_json_rejected, "detail": malformed_detail})

    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "eventsPath": args.events,
        "promptBundlePath": str(output_root / "llm-trial-prompt-bundle.json"),
        "baselineAcceptedCount": accepted,
        "baselineTotalCount": len(events),
        "hallucinationRejected": not hallucination_passed,
        "checks": checks,
    }
    report["malformedJsonRejected"] = malformed_json_rejected
    report["passed"] = accepted == len(events) and report["hallucinationRejected"] and report["malformedJsonRejected"]

    (output_root / "llm-trial-prompt-bundle.json").write_text(json.dumps(prompt_bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "llm-trial-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "llm-trial-report.md").write_text(render_markdown(report), encoding="utf-8")
    print(f"[validate_llm_extraction_trial] wrote {output_root / 'llm-trial-report.json'}")
    print(f"[validate_llm_extraction_trial] result={'PASS' if report['passed'] else 'FAIL'} baseline={accepted}/{len(events)} hallucinationRejected={report['hallucinationRejected']}")
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
