from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import SanguoGovernanceError, load_deepseek_reasoning_trial_policy

from ollama_reasoning_client import (
    DEFAULT_REASONING_NUM_CTX,
    DEFAULT_REASONING_NUM_PREDICT,
    DEFAULT_REASONING_REPEAT_PENALTY,
    DEFAULT_REASONING_TEMPERATURE,
    DEFAULT_REASONING_TIMEOUT_MS,
    DEFAULT_REASONING_TOP_P,
    OllamaReasoningError,
    compact_text,
    request_ollama_reasoning_json,
    resolve_deepseek_model,
    resolve_ollama_api_url,
)


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_KEYWORD_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning")
DEFAULT_GENERAL_ID = "zhang-fei"


DEEPSEEK_REASONING_TRIAL_POLICY: dict[str, Any] = {}


def deepseek_reasoning_section(name: str) -> dict[str, Any]:
    section = DEEPSEEK_REASONING_TRIAL_POLICY.get(name)
    return section if isinstance(section, dict) else {}


def deepseek_text_arg(cli_value: str | None, section: dict[str, Any], key: str, fallback: str | Path) -> str:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or str(fallback)


def deepseek_optional_text_arg(cli_value: str | None, section: dict[str, Any], key: str) -> str | None:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or None


def deepseek_int_arg(cli_value: int | None, section: dict[str, Any], key: str, fallback: int) -> int:
    if cli_value is not None:
        return int(cli_value)
    try:
        return int(section.get(key, fallback))
    except (TypeError, ValueError):
        return int(fallback)


def deepseek_float_arg(cli_value: float | None, section: dict[str, Any], key: str, fallback: float) -> float:
    if cli_value is not None:
        return float(cli_value)
    try:
        return float(section.get(key, fallback))
    except (TypeError, ValueError):
        return float(fallback)


def apply_deepseek_reasoning_trial_governance(policy: dict[str, Any]) -> None:
    global DEEPSEEK_REASONING_TRIAL_POLICY, DEFAULT_KEYWORD_ROOT
    DEEPSEEK_REASONING_TRIAL_POLICY = dict(policy)
    paths = deepseek_reasoning_section("defaultPaths")
    keyword_root = str(paths.get("keywordRoot") or "").strip()
    if keyword_root:
        DEFAULT_KEYWORD_ROOT = Path(keyword_root)


def apply_deepseek_reasoning_trial_arg_defaults(args: argparse.Namespace) -> None:
    paths = deepseek_reasoning_section("defaultPaths")
    limits = deepseek_reasoning_section("promptLimits")
    reasoning = deepseek_reasoning_section("reasoningDefaults")
    args.events = deepseek_text_arg(args.events, paths, "events", DEFAULT_EVENTS_PATH)
    args.generic_candidates = deepseek_text_arg(args.generic_candidates, paths, "genericCandidates", DEFAULT_GENERIC_CANDIDATES_PATH)
    args.output_root = deepseek_text_arg(args.output_root, paths, "outputRoot", DEFAULT_OUTPUT_ROOT)
    args.general_id = deepseek_text_arg(args.general_id, DEEPSEEK_REASONING_TRIAL_POLICY, "defaultGeneralId", DEFAULT_GENERAL_ID)
    args.api_url = deepseek_optional_text_arg(args.api_url, reasoning, "apiUrl")
    args.model = deepseek_optional_text_arg(args.model, reasoning, "model")
    args.top_events = deepseek_int_arg(args.top_events, limits, "topEvents", 8)
    args.top_generic = deepseek_int_arg(args.top_generic, limits, "topGeneric", 8)
    args.top_keywords_per_category = deepseek_int_arg(args.top_keywords_per_category, limits, "topKeywordsPerCategory", 6)
    args.timeout_ms = deepseek_int_arg(args.timeout_ms, reasoning, "timeoutMs", DEFAULT_REASONING_TIMEOUT_MS)
    args.num_ctx = deepseek_int_arg(args.num_ctx, reasoning, "numCtx", DEFAULT_REASONING_NUM_CTX)
    args.num_predict = deepseek_int_arg(args.num_predict, reasoning, "numPredict", DEFAULT_REASONING_NUM_PREDICT)
    args.temperature = deepseek_float_arg(args.temperature, reasoning, "temperature", DEFAULT_REASONING_TEMPERATURE)
    args.top_p = deepseek_float_arg(args.top_p, reasoning, "topP", DEFAULT_REASONING_TOP_P)
    args.repeat_penalty = deepseek_float_arg(args.repeat_penalty, reasoning, "repeatPenalty", DEFAULT_REASONING_REPEAT_PENALTY)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run DeepSeek R1 as a non-canonical ETL reasoning sidecar for events and keyword options.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--deepseek-reasoning-policy", default=None, help="Override policy-deepseek-reasoning-trial.json path")
    parser.add_argument("--events", default=None, help="Canonical events.jsonl path. Defaults to governance policy.")
    parser.add_argument("--generic-candidates", default=None, help="Review-only generic battle candidates JSONL path. Defaults to governance policy.")
    parser.add_argument("--keyword-pack", default=None, help="Keyword pack JSON path. Defaults to output-root/general-id convention.")
    parser.add_argument("--general-id", default=None, help="General id for keyword pack context. Defaults to governance policy.")
    parser.add_argument("--output-root", default=None, help="Output directory for DeepSeek sidecar artifacts. Defaults to governance policy.")
    parser.add_argument("--api-url", default=None, help="Ollama /api/chat URL. Defaults to NPC_LLM_DEEPSEEK_API_URL or 127.0.0.1:11434")
    parser.add_argument("--model", default=None, help="Ollama model. Defaults to NPC_LLM_MODEL_DEEPSEEK_REASONER or deepseek-r1:7b")
    parser.add_argument("--top-events", type=int, default=None, help="Max canonical events to include. Defaults to governance policy.")
    parser.add_argument("--top-generic", type=int, default=None, help="Max generic candidates to include. Defaults to governance policy.")
    parser.add_argument("--top-keywords-per-category", type=int, default=None, help="Max keywords per category to include. Defaults to governance policy.")
    parser.add_argument("--timeout-ms", type=int, default=None, help="Reasoning timeout in milliseconds. Defaults to governance policy.")
    parser.add_argument("--num-ctx", type=int, default=None, help="Ollama num_ctx. Defaults to governance policy.")
    parser.add_argument("--num-predict", type=int, default=None, help="Ollama num_predict. Defaults to governance policy.")
    parser.add_argument("--temperature", type=float, default=None, help="Reasoning temperature. Defaults to governance policy.")
    parser.add_argument("--top-p", type=float, default=None, help="Reasoning top_p. Defaults to governance policy.")
    parser.add_argument("--repeat-penalty", type=float, default=None, help="Reasoning repeat penalty. Defaults to governance policy.")
    parser.add_argument("--prompt-only", action="store_true", help="Only write prompt bundle; do not call Ollama")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting output files")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def ensure_output_root(output_root: Path, overwrite: bool, prompt_only: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [output_root / "deepseek-reasoning-prompt-bundle.json"]
    if not prompt_only:
        outputs.extend([
            output_root / "deepseek-reasoning-report.json",
            output_root / "deepseek-reasoning-report.md",
            output_root / "deepseek-reasoning-raw.json",
        ])
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def keyword_pack_path(args: argparse.Namespace) -> Path:
    if args.keyword_pack:
        return Path(args.keyword_pack)
    return DEFAULT_KEYWORD_ROOT / f"{args.general_id}.keywords.json"


def compact_event(event: dict) -> dict:
    return {
        "eventId": event.get("eventId"),
        "eventKey": event.get("eventKey"),
        "eventType": event.get("eventType"),
        "reviewStatus": event.get("reviewStatus"),
        "generalIds": event.get("generalIds") or [],
        "location": event.get("location"),
        "summary": compact_text(str(event.get("summary") or ""), 140),
        "sourceQuote": compact_text(str(event.get("sourceQuote") or ""), 180),
        "relationshipEdges": (event.get("relationshipEdges") or [])[:8],
        "moodTags": event.get("moodTags") or [],
        "confidence": event.get("confidence"),
        "sourceRefs": event.get("sourceRefs") or [],
    }


def compact_keyword_pack(pack: dict, top_per_category: int) -> dict:
    categories: dict[str, list[dict]] = {}
    for category, keywords in (pack.get("categories") or {}).items():
        categories[category] = [
            {
                "keywordKey": keyword.get("keywordKey"),
                "label": keyword.get("label"),
                "fullLabel": keyword.get("fullLabel"),
                "category": category,
                "generalIds": keyword.get("generalIds") or [],
                "sourceRefs": keyword.get("sourceRefs") or [],
                "confidence": keyword.get("confidence"),
            }
            for keyword in (keywords or [])[: max(top_per_category, 0)]
        ]
    return {
        "generalId": pack.get("generalId"),
        "keywordVersion": pack.get("keywordVersion"),
        "sourceEventsPath": pack.get("sourceEventsPath"),
        "categories": categories,
    }


def filter_records_for_general(records: list[dict], general_id: str, limit: int) -> list[dict]:
    if limit <= 0:
        return []
    filtered = [record for record in records if general_id in (record.get("generalIds") or [])]
    return filtered[:limit]


def build_prompt_bundle(args: argparse.Namespace) -> dict:
    events_path = Path(args.events)
    generic_path = Path(args.generic_candidates)
    keyword_path = keyword_pack_path(args)
    events = filter_records_for_general(read_jsonl(events_path), args.general_id, max(args.top_events, 0))
    generic_candidates = filter_records_for_general(read_jsonl(generic_path), args.general_id, max(args.top_generic, 0))
    keyword_pack = read_json(keyword_path) if keyword_path.exists() else {"generalId": args.general_id, "categories": {}}
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "deepseek-reasoning-sidecar",
        "modelRole": "推理測試模型，只能產生 review hints，不可直接改 canonical events 或 keyword fixtures。",
        "inputs": {
            "eventsPath": str(events_path),
            "genericCandidatesPath": str(generic_path),
            "keywordPackPath": str(keyword_path),
            "generalIdFilter": args.general_id,
        },
        "hardRules": [
            "Return JSON only.",
            "Use sourceRefs and existing generalIds exactly as provided; do not invent new ids.",
            "Your output is advisory only. Do not claim anything has been published.",
            "For generic candidates, recommend accept/review/reject but leave final decision to human review.",
            "For keywords, recommend keep/rename/retire/review only as UI and RAG hints.",
            "Keep every reason concise; no long chain-of-thought in final JSON.",
        ],
        "expectedJsonContract": {
            "eventAssessments": [{"eventKey": "string", "recommendation": "keep|review|reject", "reasons": ["string"], "risks": ["string"], "confidenceAdjustment": "number|null"}],
            "genericCandidateAssessments": [{"eventKey": "string", "recommendation": "accept|review|reject", "reasons": ["string"], "missingFields": ["string"]}],
            "keywordAssessments": [{"keywordKey": "string", "category": "string", "recommendation": "keep|rename|retire|review", "uiLabelSuggestion": "string|null", "reasons": ["string"]}],
            "pipelineNotes": ["string"],
        },
        "canonicalEvents": [compact_event(event) for event in events],
        "genericBattleCandidates": [compact_event(candidate) for candidate in generic_candidates],
        "keywordPack": compact_keyword_pack(keyword_pack, args.top_keywords_per_category),
    }


def build_system_prompt() -> str:
    return "\n".join([
        "You are DeepSeek R1 used as a local reasoning sidecar for a Three Kingdoms ETL pipeline.",
        "You review deterministic event candidates and keyword options; you do not generate canonical runtime data.",
        "Return one compact JSON object only. Do not include markdown.",
        "Do not expose chain-of-thought. Put only short conclusions in reasons and pipelineNotes.",
        "Use Traditional Chinese for human-readable reasons.",
    ])


def bounded_list(value: Any, limit: int) -> list[Any]:
    if not isinstance(value, list):
        return []
    return value[:limit]


def sanitize_reasoning_report(parsed: dict) -> dict:
    def sanitize_entry(entry: Any, key_fields: list[str], list_fields: list[str]) -> dict:
        if not isinstance(entry, dict):
            return {}
        result = {field: compact_text(str(entry.get(field) or ""), 80) for field in key_fields}
        for field in list_fields:
            result[field] = [compact_text(str(item), 120) for item in bounded_list(entry.get(field), 5)]
        if "confidenceAdjustment" in entry:
            result["confidenceAdjustment"] = entry.get("confidenceAdjustment")
        if "uiLabelSuggestion" in entry:
            suggestion = entry.get("uiLabelSuggestion")
            result["uiLabelSuggestion"] = compact_text(str(suggestion), 20) if suggestion else None
        return result

    return {
        "eventAssessments": [
            sanitize_entry(entry, ["eventKey", "recommendation"], ["reasons", "risks"])
            for entry in bounded_list(parsed.get("eventAssessments"), 20)
        ],
        "genericCandidateAssessments": [
            sanitize_entry(entry, ["eventKey", "recommendation"], ["reasons", "missingFields"])
            for entry in bounded_list(parsed.get("genericCandidateAssessments"), 20)
        ],
        "keywordAssessments": [
            sanitize_entry(entry, ["keywordKey", "category", "recommendation"], ["reasons"])
            for entry in bounded_list(parsed.get("keywordAssessments"), 40)
        ],
        "pipelineNotes": [compact_text(str(item), 140) for item in bounded_list(parsed.get("pipelineNotes"), 10)],
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# DeepSeek Reasoning Sidecar Report",
        "",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Model: `{report['model']}`",
        f"- Mode: `{report['mode']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        "",
        "## Pipeline Notes",
        "",
    ]
    for note in report["reasoning"].get("pipelineNotes") or []:
        lines.append(f"- {note}")
    lines.extend(["", "## Generic Candidate Assessments", ""])
    for entry in report["reasoning"].get("genericCandidateAssessments") or []:
        reasons = "; ".join(entry.get("reasons") or []) or "-"
        lines.append(f"- `{entry.get('eventKey')}` -> `{entry.get('recommendation')}`: {reasons}")
    lines.extend(["", "## Keyword Assessments", ""])
    for entry in report["reasoning"].get("keywordAssessments") or []:
        reasons = "; ".join(entry.get("reasons") or []) or "-"
        lines.append(f"- `{entry.get('category')}/{entry.get('keywordKey')}` -> `{entry.get('recommendation')}`: {reasons}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    deepseek_policy = load_deepseek_reasoning_trial_policy(
        args.governance_root,
        deepseek_reasoning_policy=args.deepseek_reasoning_policy,
    )
    apply_deepseek_reasoning_trial_governance(deepseek_policy)
    apply_deepseek_reasoning_trial_arg_defaults(args)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite, args.prompt_only)
    prompt_bundle = build_prompt_bundle(args)
    prompt_path = output_root / "deepseek-reasoning-prompt-bundle.json"
    prompt_path.write_text(json.dumps(prompt_bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.prompt_only:
        print(f"[run_deepseek_reasoning_trial] wrote {prompt_path}")
        print("[run_deepseek_reasoning_trial] promptOnly=true")
        return

    api_url = resolve_ollama_api_url(args.api_url)
    model = resolve_deepseek_model(args.model)
    try:
        result = request_ollama_reasoning_json(
            api_url=api_url,
            model=model,
            system_prompt=build_system_prompt(),
            user_payload=prompt_bundle,
            timeout_ms=args.timeout_ms,
            num_ctx=args.num_ctx,
            num_predict=args.num_predict,
            temperature=args.temperature,
            top_p=args.top_p,
            repeat_penalty=args.repeat_penalty,
        )
    except OllamaReasoningError as exc:
        raise SystemExit(f"[run_deepseek_reasoning_trial] FAIL {exc}") from exc

    reasoning = sanitize_reasoning_report(result.parsedJson)
    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "deepseek-reasoning-sidecar",
        "model": result.model,
        "apiUrl": api_url,
        "canonicalWrites": False,
        "inputCounts": {
            "canonicalEvents": len(prompt_bundle["canonicalEvents"]),
            "genericBattleCandidates": len(prompt_bundle["genericBattleCandidates"]),
            "keywordCategories": len(prompt_bundle["keywordPack"].get("categories") or {}),
        },
        "payloadSummary": result.payloadSummary,
        "reasoningTracePreview": result.reasoningTrace,
        "reasoning": reasoning,
    }
    raw = {
        "model": result.model,
        "rawContentPreview": compact_text(result.rawContent, 2000),
        "cleanedContentPreview": compact_text(result.cleanedContent, 2000),
        "parsedJson": result.parsedJson,
    }
    report_path = output_root / "deepseek-reasoning-report.json"
    raw_path = output_root / "deepseek-reasoning-raw.json"
    md_path = output_root / "deepseek-reasoning-report.md"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raw_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[run_deepseek_reasoning_trial] wrote {prompt_path}")
    print(f"[run_deepseek_reasoning_trial] wrote {report_path}")
    print(f"[run_deepseek_reasoning_trial] wrote {md_path}")
    print(
        "[run_deepseek_reasoning_trial] "
        f"events={report['inputCounts']['canonicalEvents']} generic={report['inputCounts']['genericBattleCandidates']} "
        f"keywordCategories={report['inputCounts']['keywordCategories']} canonicalWrites=false"
    )


if __name__ == "__main__":
    main()