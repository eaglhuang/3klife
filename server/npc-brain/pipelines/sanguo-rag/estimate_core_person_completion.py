from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import load_core_person_completion_policy


DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_EVENT_QUESTION_SEEDS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds/event-question-seeds.jsonl")
DEFAULT_SOURCE_EVENT_PACKETS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets/source-event-packets.jsonl")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl")
DEFAULT_READY_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_ROUNDS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress")

ANGLE_FAMILY_TARGET = 0
PROFILE_COVERAGE_SCORE: dict[str, float] = {}
COMPONENT_WEIGHTS: dict[str, float] = {}
SCORING_POLICY: dict[str, Any] = {}


def apply_scoring_policy(policy: dict[str, Any]) -> None:
    global ANGLE_FAMILY_TARGET, PROFILE_COVERAGE_SCORE, COMPONENT_WEIGHTS, SCORING_POLICY
    SCORING_POLICY = policy
    ANGLE_FAMILY_TARGET = int(policy.get("angleFamilyTarget") or 0)
    PROFILE_COVERAGE_SCORE = {str(key): float(value) for key, value in (policy.get("profileCoverageScore") or {}).items()}
    COMPONENT_WEIGHTS = {str(key): float(value) for key, value in (policy.get("componentWeights") or {}).items()}


def policy_section(name: str) -> dict[str, Any]:
    value = SCORING_POLICY.get(name)
    return value if isinstance(value, dict) else {}


def confidence_unit(confidence: float) -> float:
    for tier in SCORING_POLICY.get("relationshipEvidenceTiers") or []:
        if confidence >= float(tier.get("minConfidence") or 0.0):
            return float(tier.get("unitWeight") or 0.0)
    return 0.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Estimate completion for the top core Sanguo people and build a boost queue.")
    parser.add_argument("--round-id", default="current")
    parser.add_argument("--top", type=int, default=10)
    parser.add_argument("--core-general-id", action="append", default=[], help="Explicit core generalId. Defaults to data-driven top N.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--event-question-seeds", default=str(DEFAULT_EVENT_QUESTION_SEEDS_PATH))
    parser.add_argument("--source-event-packets", default=str(DEFAULT_SOURCE_EVENT_PACKETS_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--ready-events", default=str(DEFAULT_READY_EVENTS_PATH))
    parser.add_argument("--rounds-root", default=str(DEFAULT_ROUNDS_ROOT))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--boost-per-person", type=int, default=12)
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--core-person-completion-policy", default=None, help="Override core person completion scoring policy JSON.")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_ref_key(source_ref: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", source_ref).strip("-").lower() or "unknown"


def load_observed_rows(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    return payload.get("data") if isinstance(payload, dict) else payload


def general_ids_from_row(row: dict[str, Any]) -> set[str]:
    return {
        str(general_id).strip()
        for general_id in list(row.get("matchedGeneralIds") or []) + list(row.get("sceneParticipants") or [])
        if str(general_id or "").strip() and not str(general_id).startswith("romance-person-")
    }


def stable_indexes(stable: dict[str, Any]) -> tuple[dict[str, str], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    names = {str(item.get("generalId")): str(item.get("name") or item.get("generalId")) for item in stable.get("identitySeeds") or []}
    identities = {str(item.get("generalId")): item for item in stable.get("identitySeeds") or []}
    profiles = {str(item.get("generalId")): item for item in stable.get("basicProfileSeeds") or []}
    return names, identities, profiles


def summarize_preview_rounds(rounds_root: Path) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = defaultdict(lambda: {"answerCounts": Counter(), "resultCount": 0, "rawErrors": 0, "timeouts": 0})
    for path in rounds_root.glob("*.batch.json"):
        payload = read_json(path)
        for item in payload.get("results") or []:
            general_id = str(item.get("generalId") or "").strip()
            if not general_id:
                continue
            bucket = result[general_id]
            bucket["resultCount"] += 1
            for answer, count in (item.get("reportAnswerCounts") or item.get("enrichedAnswerCounts") or {}).items():
                bucket["answerCounts"][str(answer).upper()] += int(count or 0)
            bucket["rawErrors"] += int(item.get("rawErrorCount") or 0)
            generate = item.get("generate") or {}
            enrich = item.get("enrich") or {}
            if generate.get("timedOut") or enrich.get("timedOut"):
                bucket["timeouts"] += 1
    return {
        general_id: {
            "answerCounts": dict(sorted(bucket["answerCounts"].items())),
            "resultCount": bucket["resultCount"],
            "rawErrors": bucket["rawErrors"],
            "timeouts": bucket["timeouts"],
        }
        for general_id, bucket in result.items()
    }


def collect_metrics(args: argparse.Namespace) -> dict[str, Any]:
    stable = read_json(Path(args.stable_knowledge))
    names, identities, profiles = stable_indexes(stable)
    observed_rows = load_observed_rows(Path(args.observed_mentions))
    seeds = read_jsonl(Path(args.event_question_seeds))
    packets = read_jsonl(Path(args.source_event_packets))
    relationships = read_jsonl(Path(args.relationship_evidence))
    ready_events = read_jsonl(Path(args.ready_events))
    preview = summarize_preview_rounds(Path(args.rounds_root))

    mention_counts: Counter[str] = Counter()
    for row in observed_rows:
        if row.get("matchStatus") != "resolved":
            continue
        for general_id in general_ids_from_row(row):
            mention_counts[general_id] += 1

    seed_units: Counter[str] = Counter()
    seed_slots: Counter[str] = Counter()
    seed_families: dict[str, set[str]] = defaultdict(set)
    for seed in seeds:
        general_id = str(seed.get("generalId") or "").strip()
        angle_family = str(seed.get("angleFamily") or "").strip()
        if not general_id or not angle_family:
            continue
        seed_units[general_id] += float(seed.get("eventQuestionUnitWeight") or 0.0)
        seed_slots[general_id] += 1
        seed_families[general_id].add(angle_family)

    packet_units: Counter[str] = Counter()
    packet_counts: Counter[str] = Counter()
    packets_by_general: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for packet in packets:
        weight = float(packet.get("eventPacketUnitWeight") or 0.0)
        for general_id in packet.get("generalIds") or []:
            general_id = str(general_id or "").strip()
            if not general_id:
                continue
            packet_units[general_id] += weight
            packet_counts[general_id] += 1
            packets_by_general[general_id].append(packet)

    relationship_units: Counter[str] = Counter()
    relationship_counts: Counter[str] = Counter()
    relationships_by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in relationships:
        confidence = float(edge.get("edgeConfidence") or 0.0)
        unit = confidence_unit(confidence)
        refs = list(edge.get("evidenceRefs") or [])
        if refs:
            relationships_by_source[str(refs[0])].append(edge)
        for general_id in [edge.get("fromId"), edge.get("toId")]:
            general_id = str(general_id or "").strip()
            if general_id:
                relationship_units[general_id] += unit
                relationship_counts[general_id] += 1

    ready_event_counts: Counter[str] = Counter()
    for event in ready_events:
        for general_id in event.get("generalIds") or []:
            if str(general_id or "").strip():
                ready_event_counts[str(general_id).strip()] += 1

    return {
        "names": names,
        "identities": identities,
        "profiles": profiles,
        "mentionCounts": mention_counts,
        "seedUnits": seed_units,
        "seedSlots": seed_slots,
        "seedFamilies": seed_families,
        "packetUnits": packet_units,
        "packetCounts": packet_counts,
        "packetsByGeneral": packets_by_general,
        "relationshipUnits": relationship_units,
        "relationshipCounts": relationship_counts,
        "relationshipsBySource": relationships_by_source,
        "readyEventCounts": ready_event_counts,
        "preview": preview,
    }


def core_score(general_id: str, metrics: dict[str, Any]) -> float:
    mentions = metrics["mentionCounts"][general_id]
    seed_slots = metrics["seedSlots"][general_id]
    packet_count = metrics["packetCounts"][general_id]
    relationship_count = metrics["relationshipCounts"][general_id]
    family_count = len(metrics["seedFamilies"].get(general_id) or set())
    weights = policy_section("coreScoreWeights")
    return (
        math.log1p(mentions) * float(weights.get("mentionLog") or 0.0)
        + seed_slots * float(weights.get("seedSlot") or 0.0)
        + packet_count * float(weights.get("packetCount") or 0.0)
        + relationship_count * float(weights.get("relationshipCount") or 0.0)
        + family_count * float(weights.get("angleFamily") or 0.0)
    )


def select_core_people(args: argparse.Namespace, metrics: dict[str, Any]) -> list[str]:
    if args.core_general_id:
        return args.core_general_id[: args.top]
    candidates = set(metrics["mentionCounts"]) | set(metrics["seedSlots"]) | set(metrics["packetCounts"]) | set(metrics["relationshipCounts"])
    ranked = sorted(candidates, key=lambda general_id: (core_score(general_id, metrics), general_id), reverse=True)
    return ranked[: args.top]


def profile_score(general_id: str, profiles: dict[str, dict[str, Any]]) -> float:
    profile = profiles.get(general_id) or {}
    base = PROFILE_COVERAGE_SCORE.get(str(profile.get("coverageLevel") or ""), 0.0)
    depth = 0.0
    profile_depth = policy_section("profileDepth")
    for field in profile_depth.get("fields") or []:
        if profile.get(field):
            depth += float(profile_depth.get("perFieldIncrement") or 0.0)
    return min(1.0, base + depth)


def preview_units(general_id: str, preview: dict[str, dict[str, Any]]) -> float:
    counts = (preview.get(general_id) or {}).get("answerCounts") or {}
    answer_weights = policy_section("previewAnswerWeights")
    return sum(float(counts.get(key) or 0) * float(weight or 0.0) for key, weight in answer_weights.items())


def component_scores(general_id: str, metrics: dict[str, Any], max_mentions: int) -> dict[str, float]:
    denominators = policy_section("componentDenominators")
    seed_target = ANGLE_FAMILY_TARGET * float(denominators.get("seedTargetUnit") or 0.0)
    return {
        "sourcePresence": min(1.0, math.log1p(metrics["mentionCounts"][general_id]) / max(1.0, math.log1p(max_mentions))),
        "profileFoundation": profile_score(general_id, metrics["profiles"]),
        "angleSeedCoverage": min(1.0, metrics["seedUnits"][general_id] / seed_target),
        "sourceEventPackets": min(1.0, metrics["packetUnits"][general_id] / float(denominators.get("sourceEventPackets") or 1.0)),
        "relationshipEvidence": min(1.0, metrics["relationshipUnits"][general_id] / float(denominators.get("relationshipEvidence") or 1.0)),
        "previewValidation": min(1.0, preview_units(general_id, metrics["preview"]) / float(denominators.get("previewValidation") or 1.0)),
        "readyEvents": min(1.0, metrics["readyEventCounts"][general_id] / float(denominators.get("readyEvents") or 1.0)),
    }


def weighted_completion(scores: dict[str, float]) -> tuple[float, dict[str, float]]:
    weighted = {key: scores[key] * COMPONENT_WEIGHTS[key] for key in COMPONENT_WEIGHTS}
    return sum(weighted.values()), weighted


def recommended_actions(scores: dict[str, float]) -> list[str]:
    gaps = sorted(((COMPONENT_WEIGHTS[key] * (1.0 - value), key) for key, value in scores.items()), reverse=True)
    actions = []
    action_by_component = policy_section("recommendedActionByComponent")
    for gap, key in gaps:
        if gap < 1.0:
            continue
        action = str(action_by_component.get(key) or "").strip()
        if action:
            actions.append(action)
        if len(actions) >= 3:
            break
    return actions or [str(SCORING_POLICY.get("fallbackRecommendedAction") or "maintain_current_pipeline")]


def build_person_reports(core_people: list[str], metrics: dict[str, Any]) -> list[dict[str, Any]]:
    max_mentions = max(metrics["mentionCounts"][general_id] for general_id in core_people) if core_people else 1
    reports = []
    for rank, general_id in enumerate(core_people, start=1):
        scores = component_scores(general_id, metrics, max_mentions)
        completion, weighted = weighted_completion(scores)
        reports.append({
            "rank": rank,
            "generalId": general_id,
            "name": metrics["names"].get(general_id, general_id),
            "coreScore": round(core_score(general_id, metrics), 2),
            "completionPercent": round(completion, 2),
            "rawScores": {key: round(value, 4) for key, value in scores.items()},
            "weightedPoints": {key: round(value, 2) for key, value in weighted.items()},
            "observedCounts": {
                "mentionCount": int(metrics["mentionCounts"][general_id]),
                "seedSlotCount": int(metrics["seedSlots"][general_id]),
                "seedUnitCount": round(float(metrics["seedUnits"][general_id]), 2),
                "seedAngleFamilies": sorted(metrics["seedFamilies"].get(general_id) or []),
                "sourceEventPacketCount": int(metrics["packetCounts"][general_id]),
                "sourceEventPacketUnits": round(float(metrics["packetUnits"][general_id]), 2),
                "relationshipEvidenceCount": int(metrics["relationshipCounts"][general_id]),
                "relationshipEvidenceUnits": round(float(metrics["relationshipUnits"][general_id]), 2),
                "previewAnswerCounts": (metrics["preview"].get(general_id) or {}).get("answerCounts") or {},
                "readyEventCount": int(metrics["readyEventCounts"][general_id]),
            },
            "recommendedActions": recommended_actions(scores),
        })
    return reports


def packet_priority(packet: dict[str, Any], person_report: dict[str, Any]) -> float:
    strength = policy_section("packetStrengthPriority").get(str(packet.get("packetStrength") or ""), 0.0)
    angle_count = len(packet.get("angleFamilies") or [])
    priority_weights = policy_section("packetPriorityWeights")
    relationship_bonus = min(int(priority_weights.get("relationshipBonusCap") or 0), int(packet.get("relationshipEdgeCount") or 0))
    completion_gap = max(0.0, 100.0 - float(person_report.get("completionPercent") or 0.0)) / 100.0
    return (
        float(strength or 0.0) * float(priority_weights.get("strength") or 0.0)
        + angle_count * float(priority_weights.get("angleFamily") or 0.0)
        + relationship_bonus * float(priority_weights.get("relationshipBonus") or 0.0)
        + completion_gap
    )


def packet_candidate(packet: dict[str, Any], focus_general_id: str, focus_name: str, relationships: list[dict[str, Any]]) -> dict[str, Any]:
    source_ref = str(packet.get("sourceRef") or "")
    examples = packet.get("examples") or []
    source_quote = "。".join(str(item) for item in examples[:2])[:220]
    angle_families = list(packet.get("angleFamilies") or [])
    relationship_edges = [
        {
            "fromId": edge.get("fromId"),
            "toId": edge.get("toId"),
            "type": edge.get("type"),
            "evidenceRefs": edge.get("evidenceRefs") or [source_ref],
            "edgeConfidence": edge.get("edgeConfidence"),
            "edgeStrength": edge.get("edgeStrength"),
        }
        for edge in relationships
    ]
    return {
        "eventId": f"romance.core-source-packet.{focus_general_id}.{source_ref_key(source_ref)}",
        "chapterNo": packet.get("chapterNo"),
        "eventKey": f"core-source-packet-{focus_general_id}-{source_ref_key(source_ref)}",
        "eventType": "source-event-packet-candidate",
        "subtype": "core_person_source_packet",
        "generalIds": packet.get("generalIds") or [],
        "location": None,
        "summary": f"Core person review packet for {focus_name} at {source_ref}; confirm event boundary, location, relationship edges, and publishability.",
        "sourceQuote": source_quote,
        "relationshipEdges": relationship_edges,
        "moodTags": ["core-person", "source-event-packet"] + angle_families[:6],
        "affectTags": ["source-affect-candidate"] if "affect_story" in angle_families else [],
        "aptitudeTags": ["source-aptitude-candidate"] if "aptitude_talent" in angle_families else [],
        "roleActivityTags": ["source-role-candidate"] if "work_role" in angle_families else [],
        "activitySeedHints": ["source-activity-candidate"] if "activity_seed" in angle_families else [],
        "decisionWeightHints": ["source-decision-candidate"] if "decision_weight" in angle_families else [],
        "confidence": policy_section("packetStrengthConfidence").get(
            str(packet.get("packetStrength") or ""),
            policy_section("packetStrengthConfidence").get("default", 0.5),
        ),
        "sourceRefs": [source_ref],
        "extractionMode": "core-source-event-packet-v1",
        "reviewStatus": "needs-review",
    }


def build_boost_queue(person_reports: list[dict[str, Any]], metrics: dict[str, Any], per_person: int) -> list[dict[str, Any]]:
    queue = []
    reports_by_id = {report["generalId"]: report for report in person_reports}
    for general_id, report in reports_by_id.items():
        packets = list(metrics["packetsByGeneral"].get(general_id) or [])
        packets = sorted(packets, key=lambda packet: packet_priority(packet, report), reverse=True)[:per_person]
        for packet in packets:
            source_ref = str(packet.get("sourceRef") or "")
            candidate = packet_candidate(
                packet,
                general_id,
                str(report.get("name") or general_id),
                metrics["relationshipsBySource"].get(source_ref) or [],
            )
            candidate["boostFocusGeneralId"] = general_id
            candidate["boostPriorityScore"] = round(packet_priority(packet, report), 2)
            candidate["boostReason"] = report.get("recommendedActions") or []
            queue.append(candidate)
    return sorted(queue, key=lambda item: (float(item.get("boostPriorityScore") or 0.0), item.get("boostFocusGeneralId") or ""), reverse=True)


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Core Person Completion Estimate",
        "",
        f"- Round ID: `{report['roundId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Core Count: `{len(report['people'])}`",
        f"- Average Completion: `{report['averageCompletionPercent']:.2f}%`",
        f"- Boost Queue Count: `{report['boostQueueCount']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        "",
        "## Formula",
        "",
        "Per-person completion = weighted source presence, profile foundation, angle seed coverage, source event packets, relationship evidence, preview validation, and ready events. Review-only artifacts are capped and do not count as canonical publish.",
        "",
        "| Rank | General | Completion | Core Score | Mentions | Seeds | Packets | RelEvidence | Preview | Ready | Top Actions |",
        "|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---|",
    ]
    for person in report["people"]:
        counts = person["observedCounts"]
        lines.append(
            f"| {person['rank']} | `{person['name']}` (`{person['generalId']}`) | {person['completionPercent']:.2f}% | "
            f"{person['coreScore']:.2f} | {counts['mentionCount']} | {counts['seedSlotCount']} | "
            f"{counts['sourceEventPacketCount']} | {counts['relationshipEvidenceCount']} | "
            f"{json.dumps(counts['previewAnswerCounts'], ensure_ascii=False)} | {counts['readyEventCount']} | "
            f"{', '.join(person['recommendedActions'])} |"
        )
    lines.extend(["", "## Component Scores", ""])
    for person in report["people"]:
        lines.append(f"### {person['rank']}. {person['name']} `{person['generalId']}`")
        for key, value in person["weightedPoints"].items():
            lines.append(f"- `{key}`: `{value:.2f}/{COMPONENT_WEIGHTS[key]:.1f}` raw=`{person['rawScores'][key]:.4f}`")
        lines.append("")
    lines.extend(["## Boost Queue", ""])
    lines.append(f"- Candidate path: `{report['outputs']['boostQueuePath']}`")
    lines.append("- Recommended next command pattern: `generate_event_review_choices.py --candidates <boostQueuePath> --general-id <core-general-id> --top 12 --overwrite`, then run `enrich_event_review_context.py` with `agent-reviewer` and 30s step timeout.")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    apply_scoring_policy(
        load_core_person_completion_policy(
            args.governance_root,
            core_person_completion_policy=args.core_person_completion_policy,
        )
    )
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    json_path = output_root / f"{args.round_id}.json"
    md_path = output_root / f"{args.round_id}.md"
    boost_queue_path = output_root / f"{args.round_id}-core10-boost-queue.jsonl"
    if not args.overwrite and any(path.exists() for path in [json_path, md_path, boost_queue_path]):
        raise FileExistsError("Core person completion outputs already exist. Re-run with --overwrite.")

    metrics = collect_metrics(args)
    core_people = select_core_people(args, metrics)
    person_reports = build_person_reports(core_people, metrics)
    boost_queue = build_boost_queue(person_reports, metrics, args.boost_per_person)
    average_completion = sum(person["completionPercent"] for person in person_reports) / max(1, len(person_reports))
    report = {
        "version": "1.0.0",
        "roundId": args.round_id,
        "generatedAt": utc_now(),
        "mode": "core-person-completion-estimate",
        "canonicalWrites": False,
        "inputs": {
            "observedMentionsPath": args.observed_mentions,
            "stableKnowledgePath": args.stable_knowledge,
            "eventQuestionSeedsPath": args.event_question_seeds,
            "sourceEventPacketsPath": args.source_event_packets,
            "relationshipEvidencePath": args.relationship_evidence,
            "readyEventsPath": args.ready_events,
            "roundsRoot": args.rounds_root,
        },
        "componentWeights": COMPONENT_WEIGHTS,
        "averageCompletionPercent": round(average_completion, 2),
        "people": person_reports,
        "boostQueueCount": len(boost_queue),
        "outputs": {
            "jsonPath": str(json_path),
            "markdownPath": str(md_path),
            "boostQueuePath": str(boost_queue_path),
        },
    }
    write_json(json_path, report)
    md_path.write_text(render_markdown(report), encoding="utf-8")
    boost_queue_path.write_text("".join(json.dumps(candidate, ensure_ascii=False) + "\n" for candidate in boost_queue), encoding="utf-8")
    print(f"[estimate_core_person_completion] wrote {json_path}")
    print(f"[estimate_core_person_completion] wrote {md_path}")
    print(f"[estimate_core_person_completion] wrote {boost_queue_path}")
    print(f"[estimate_core_person_completion] average={average_completion:.2f}% boostQueue={len(boost_queue)} canonicalWrites=false")


if __name__ == "__main__":
    main()
