from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


NPC_BRAIN_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = NPC_BRAIN_ROOT.parents[1]
if str(NPC_BRAIN_ROOT) not in sys.path:
    sys.path.insert(0, str(NPC_BRAIN_ROOT))

from app.npc_dialogue_service import DialogueRequest, NpcDialogueService  # noqa: E402


DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness")
DEFAULT_GENERAL_IDS = [
    "cao-cao",
    "guan-yu",
    "liu-bei",
    "lu-bu",
    "sun-quan",
    "wei-yan",
    "yuan-shao",
    "zhang-fei",
    "zhao-yun",
    "zhuge-liang",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build multi-general runtime readiness matrix from NPC brain facade.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--general-id", action="append", default=[])
    parser.add_argument("--general-id-file", default=None)
    parser.add_argument("--limit-keywords", type=int, default=3)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def flatten_keywords(categories: dict, limit: int) -> list[dict]:
    selected: list[dict] = []
    for category in ["person", "item", "event"]:
        for option in categories.get(category, [])[: max(limit, 0)]:
            selected.append({"category": category, **option})
    if selected:
        return selected[:limit]
    for category, options in categories.items():
        for option in options[:1]:
            selected.append({"category": category, **option})
        if len(selected) >= limit:
            break
    return selected[:limit]


def read_general_ids(path: Path) -> list[str]:
    if not path.exists():
        return []
    ids: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        cleaned = line.split("#", 1)[0].strip()
        if not cleaned:
            continue
        ids.extend(part.strip() for part in cleaned.replace(",", " ").split() if part.strip())
    return ids


def unique(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = str(value or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(key)
    return result


def narrative_coverage(profile) -> dict:
    target_ids = {str(target.targetId) for target in profile.interactionTargets if str(target.targetId).strip()}
    female_target_ids = {str(target.targetId) for target in profile.interactionTargets if target.femaleFocus}
    angle_target_pairs: set[tuple[str, str]] = set()
    angle_counts: dict[str, int] = {}
    for card in profile.evidenceCards:
        angle = str(card.angle or "").strip()
        if not angle:
            continue
        for target_id in [str(item).strip() for item in (card.relatedTargetIds or []) if str(item).strip()]:
            if target_id not in target_ids:
                continue
            angle_target_pairs.add((angle, target_id))
            angle_counts[angle] = angle_counts.get(angle, 0) + 1
    female_emotion_targets = sorted({target_id for angle, target_id in angle_target_pairs if angle == "emotion" and target_id in female_target_ids})
    warnings: list[str] = []
    if profile.evidenceCards and profile.interactionTargets and not angle_target_pairs:
        warnings.append("narrative:no-angle-target-pairs")
    if female_target_ids and not female_emotion_targets:
        warnings.append("narrative:no-female-emotion-pairs")
    return {
        "sourceMode": profile.sourceMode,
        "evidenceCardCount": len(profile.evidenceCards),
        "interactionTargetCount": len(profile.interactionTargets),
        "femaleTargetCount": len(female_target_ids),
        "angleTargetPairCount": len(angle_target_pairs),
        "emotionFemaleTargetCount": len(female_emotion_targets),
        "femaleEmotionTargetIds": female_emotion_targets,
        "angleCounts": angle_counts,
        "narrativeWarnings": warnings,
    }


def classify_status(
    persona_ready: bool,
    context_count: int,
    keyword_category_count: int,
    used_evidence_ref_count: int,
    fallback_used: bool,
    quality_warnings: list[str],
) -> str:
    if not persona_ready or context_count <= 0 or keyword_category_count <= 0 or used_evidence_ref_count <= 0:
        return "fail"
    if fallback_used or quality_warnings:
        return "warn"
    return "pass"


def row_for_general(service: NpcDialogueService, general_id: str, limit_keywords: int) -> dict:
    contexts = service.get_context_options(general_id)
    keywords = service.get_keyword_options(general_id)
    persona = service.get_persona_card(general_id)
    narrative_profile = service.get_narrative_profile(general_id)
    coverage = narrative_coverage(narrative_profile)
    narrative_warnings = list(coverage.pop("narrativeWarnings"))
    selected_context = contexts.options[0] if contexts.options else None
    selected_keywords = flatten_keywords(
        {category: [option.model_dump() for option in options] for category, options in keywords.categories.items()},
        limit_keywords,
    )
    selected_keyword_keys = [item["keywordKey"] for item in selected_keywords]
    response = service.build_dialogue(
        DialogueRequest(
            generalId=general_id,
            contextKey=selected_context.contextKey if selected_context else None,
            selectedKeywordKeys=selected_keyword_keys,
            locale="zh-TW",
            speechContextMode="life_chat",
            llmModelPreset="fallback_chain",
            maxChars=90,
        )
    )
    quality_warnings = list(response.qualityWarnings or [])
    resolution_warnings: list[str] = []
    if response.unresolvedEvidenceRefs:
        resolution_warnings.append(f"unresolved-evidence:{len(response.unresolvedEvidenceRefs)}")
    selected_context_label = selected_context.label if selected_context else None
    selected_keyword_labels = [item["label"] for item in selected_keywords]
    status = classify_status(
        persona_ready=bool(persona),
        context_count=len(contexts.options),
        keyword_category_count=len(keywords.categories),
        used_evidence_ref_count=len(response.usedEvidenceRefs),
        fallback_used=response.fallbackUsed,
        quality_warnings=[*quality_warnings, *resolution_warnings, *narrative_warnings],
    )
    return {
        "generalId": general_id,
        "displayName": persona.displayName if persona else general_id,
        "status": status,
        "persona": bool(persona),
        "contextCount": len(contexts.options),
        "keywordCategoryCount": len(keywords.categories),
        "selectedContext": response.contextKey,
        "selectedContextLabel": selected_context_label,
        "selectedKeywordKeys": selected_keyword_keys,
        "selectedKeywordLabels": selected_keyword_labels,
        "evidenceRefCount": len(response.evidenceRefs),
        "usedEvidenceRefCount": len(response.usedEvidenceRefs),
        "unresolvedEvidenceRefCount": len(response.unresolvedEvidenceRefs),
        "usedEvidenceRefs": list(response.usedEvidenceRefs),
        "unresolvedEvidenceRefs": list(response.unresolvedEvidenceRefs),
        "resolutionTrace": list(response.resolutionTrace),
        "fallbackUsed": response.fallbackUsed,
        "provider": response.provider,
        "model": response.model,
        "providerTrace": list(response.providerTrace),
        "qualityWarnings": quality_warnings,
        "resolutionWarnings": resolution_warnings,
        "narrativeWarnings": narrative_warnings,
        "narrativeCoverage": coverage,
        "repairUsed": response.repairUsed,
        "deterministicText": response.text,
    }


def render_report(payload: dict) -> str:
    lines = [
        "# Multi-General API Readiness Matrix",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Generals: `{len(payload['rows'])}`",
        f"- Status Counts: `{json.dumps(payload['summary']['statusCounts'], ensure_ascii=True)}`",
        "",
        "| generalId | status | persona | contexts | keyword categories | used evidence | fallback | warnings |",
        "|---|---|---:|---:|---:|---:|---|---|",
    ]
    for row in payload["rows"]:
        warnings = ", ".join([*row["qualityWarnings"], *row["resolutionWarnings"], *row["narrativeWarnings"]]) or "-"
        coverage = row["narrativeCoverage"]
        lines.append(
            f"| `{row['generalId']}` | `{row['status']}` | `{row['persona']}` | "
            f"`{row['contextCount']}` | `{row['keywordCategoryCount']}` | "
            f"`{row['usedEvidenceRefCount']}` | `{row['fallbackUsed']}` | "
            f"`pairs={coverage['angleTargetPairCount']}, femaleEmotion={coverage['emotionFemaleTargetCount']}; {warnings}` |"
        )
    lines.append("")
    for row in payload["rows"]:
        lines.extend(
            [
                f"## `{row['generalId']}` / {row['displayName']}",
                "",
                f"- Status: `{row['status']}`",
                f"- Persona Ready: `{row['persona']}`",
                f"- Selected Context: `{row['selectedContext'] or '-'}` / `{row['selectedContextLabel'] or '-'}`",
                f"- Selected Keywords: `{', '.join(row['selectedKeywordKeys']) or '-'}`",
                f"- Selected Keyword Labels: `{', '.join(row['selectedKeywordLabels']) or '-'}`",
                f"- Used Evidence Refs: `{', '.join(row['usedEvidenceRefs']) or '-'}`",
                f"- Unresolved Evidence Refs: `{', '.join(row['unresolvedEvidenceRefs']) or '-'}`",
                f"- Resolution Trace: `{' > '.join(row['resolutionTrace']) or '-'}`",
                f"- Provider: `{row['provider'] or '-'}` / `{row['model'] or '-'}`",
                f"- Provider Trace: `{' > '.join(row['providerTrace']) or '-'}`",
                f"- Fallback Used: `{row['fallbackUsed']}` / Repair Used: `{row['repairUsed']}`",
                f"- Quality Warnings: `{', '.join(row['qualityWarnings']) or '-'}`",
                f"- Resolution Warnings: `{', '.join(row['resolutionWarnings']) or '-'}`",
                f"- Narrative Warnings: `{', '.join(row['narrativeWarnings']) or '-'}`",
                f"- Narrative Coverage: `cards={row['narrativeCoverage']['evidenceCardCount']}, targets={row['narrativeCoverage']['interactionTargetCount']}, pairs={row['narrativeCoverage']['angleTargetPairCount']}, femaleTargets={row['narrativeCoverage']['femaleTargetCount']}, femaleEmotion={row['narrativeCoverage']['emotionFemaleTargetCount']}`",
                f"- Deterministic Text: `{row['deterministicText']}`",
                "",
            ]
        )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    output_json = output_root / "multi-general-readiness.json"
    output_md = output_root / "multi-general-readiness.md"
    if not args.overwrite and (output_json.exists() or output_md.exists()):
        raise FileExistsError("Readiness matrix already exists. Re-run with --overwrite.")
    service = NpcDialogueService(repo_root=REPO_ROOT)
    general_ids = unique([*(read_general_ids(Path(args.general_id_file)) if args.general_id_file else []), *args.general_id])
    if not general_ids:
        general_ids = DEFAULT_GENERAL_IDS
    rows = [row_for_general(service, general_id, args.limit_keywords) for general_id in general_ids]
    status_counts: dict[str, int] = {}
    for row in rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1
    payload = {
        "generatedAt": utc_now(),
        "summary": {
            "statusCounts": status_counts,
            "warnCount": status_counts.get("warn", 0),
            "failCount": status_counts.get("fail", 0),
        },
        "rows": rows,
    }
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    output_md.write_text(render_report(payload), encoding="utf-8")
    print(f"[build_runtime_readiness_matrix] wrote {output_root}")
    print(f"[build_runtime_readiness_matrix] statusCounts={status_counts}")
    if status_counts.get("fail"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
