from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from relationship_type_refinement import apply_relationship_type_refinement_rules, refine_relationship_type
from sanguo_governance_loader import SanguoGovernanceError, default_governance_root, load_relationship_evidence_extraction_rules


DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence")

DIRECT_PAIR_CONFRONT_TERMS: list[str] = []
DIRECTED_CONFRONT_TERMS: list[str] = []
COMMAND_TERMS: list[str] = []
PROTECT_TERMS: list[str] = []
ALLY_TERMS: list[str] = []
FALSE_POSITIVE_TERMS: list[str] = []
SINGLE_CHAR_ALIAS_ALLOWLIST: dict[str, list[str]] = {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract source-grounded relationship evidence edges from observed mentions.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance root")
    parser.add_argument("--relationship-evidence-cue-rules", default=None, help="Override rule-relationship-evidence-extraction-cues.jsonl path")
    parser.add_argument("--relationship-type-refinement-rules", default=None, help="Override rule-relationship-type-refinement.jsonl path")
    parser.add_argument("--max-scene-participants", type=int, default=8)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_observed_mentions(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    return payload.get("data") if isinstance(payload, dict) else payload


def normalize_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def build_aliases(stable: dict[str, Any]) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = {}
    for identity in stable.get("identitySeeds") or []:
        general_id = str(identity.get("generalId") or "").strip()
        labels = [identity.get("name")] + list(identity.get("aliases") or [])
        cleaned = []
        for label in labels:
            text = str(label or "").strip()
            if len(text) >= 2:
                cleaned.append(text)
        cleaned.extend(SINGLE_CHAR_ALIAS_ALLOWLIST.get(general_id) or [])
        if general_id and cleaned:
            aliases[general_id] = sorted(set(cleaned), key=len, reverse=True)
    return aliases


def row_general_ids(row: dict[str, Any], max_scene_participants: int) -> list[str]:
    ids = sorted({
        str(general_id).strip()
        for general_id in list(row.get("matchedGeneralIds") or []) + list(row.get("sceneParticipants") or [])
        if str(general_id or "").strip() and not str(general_id).startswith("romance-person-")
    })
    if len(ids) > max_scene_participants:
        matched = [
            str(general_id).strip()
            for general_id in row.get("matchedGeneralIds") or []
            if str(general_id or "").strip() and not str(general_id).startswith("romance-person-")
        ]
        return sorted(set(matched))
    return ids


def regex_any(patterns: list[str]) -> str:
    return "(?:" + "|".join(re.escape(term) for term in patterns) + ")"


def gap(max_chars: int) -> str:
    return rf"[^，。；：！？「」『』]{{0,{max_chars}}}"


def compact_edge_key(edge: dict[str, Any]) -> tuple[str, str, str, str]:
    return (edge["fromId"], edge["toId"], edge["type"], edge["evidenceRefs"][0])


def add_edge(edges: list[dict[str, Any]], seen: set[tuple[str, str, str, str]], edge: dict[str, Any]) -> None:
    key = compact_edge_key(edge)
    if key in seen:
        return
    seen.add(key)
    edges.append(edge)


def make_edge(
    *,
    source_ref: str,
    chapter_no: int | None,
    from_id: str,
    to_id: str,
    relation_type: str,
    confidence: float,
    pattern: str,
    evidence_text: str,
    aliases: tuple[str, str],
) -> dict[str, Any]:
    edge = {
        "chapterNo": chapter_no,
        "fromId": from_id,
        "toId": to_id,
        "type": relation_type,
        "originalType": relation_type,
        "evidenceRefs": [source_ref],
        "evidenceText": evidence_text[:220],
        "matchedAliases": list(aliases),
        "pattern": pattern,
        "edgeConfidence": round(confidence, 2),
        "edgeStrength": round(min(0.9, max(0.35, confidence - 0.12)), 2),
        "reviewStatus": "source-grounded-review" if confidence < 0.8 else "source-grounded-strong",
        "sourceLayer": "mao-hant-observed-mentions",
    }
    refined_type, reasons = refine_relationship_type(edge, evidence_text)
    edge["type"] = refined_type
    edge["refinementReasons"] = reasons
    edge["edgeId"] = f"rel.{source_ref}.{from_id}.{refined_type}.{to_id}".replace("#", "-")
    return edge


def find_pair_edges(row: dict[str, Any], ids: list[str], aliases: dict[str, list[str]]) -> list[dict[str, Any]]:
    text = normalize_text(row.get("textSnippet"))
    source_ref = str(row.get("sourceRef") or "").strip()
    if not text or not source_ref or any(term in text for term in FALSE_POSITIVE_TERMS):
        return []

    edges: list[dict[str, Any]] = []
    chapter_no = row.get("chapterNo") if isinstance(row.get("chapterNo"), int) else None
    direct_pair_terms = regex_any(DIRECT_PAIR_CONFRONT_TERMS)
    directed_terms = regex_any(DIRECTED_CONFRONT_TERMS)
    command_terms = regex_any(COMMAND_TERMS)
    protect_terms = regex_any(PROTECT_TERMS)
    ally_terms = regex_any(ALLY_TERMS)

    for index, left_id in enumerate(ids):
        for right_id in ids[index + 1:]:
            for left_alias in aliases.get(left_id, [])[:6]:
                if left_alias not in text:
                    continue
                for right_alias in aliases.get(right_id, [])[:6]:
                    if right_alias not in text:
                        continue
                    left = re.escape(left_alias)
                    right = re.escape(right_alias)
                    checks = [
                        (left_id, right_id, "confronts", 0.84, "direct-pair-confront", left + gap(18) + r"(?:與|和|同|共)" + right + gap(20) + direct_pair_terms),
                        (right_id, left_id, "confronts", 0.84, "direct-pair-confront", right + gap(18) + r"(?:與|和|同|共)" + left + gap(20) + direct_pair_terms),
                        (left_id, right_id, "confronts", 0.74, "directed-confront", left + gap(16) + directed_terms + gap(16) + right),
                        (right_id, left_id, "confronts", 0.74, "directed-confront", right + gap(16) + directed_terms + gap(16) + left),
                        (left_id, right_id, "commands", 0.66, "direct-command", left + gap(6) + command_terms + right),
                        (right_id, left_id, "commands", 0.66, "direct-command", right + gap(6) + command_terms + left),
                        (left_id, right_id, "protects", 0.74, "direct-protects", left + gap(10) + protect_terms + r"(?:著|住|了)?" + right),
                        (right_id, left_id, "protects", 0.74, "direct-protects", right + gap(10) + protect_terms + r"(?:著|住|了)?" + left),
                        (left_id, right_id, "allies", 0.66, "allies", left + gap(18) + ally_terms + gap(18) + right),
                        (right_id, left_id, "allies", 0.66, "allies", right + gap(18) + ally_terms + gap(18) + left),
                    ]
                    for from_id, to_id, relation_type, confidence, pattern, expression in checks:
                        if re.search(expression, text):
                            edges.append(make_edge(
                                source_ref=source_ref,
                                chapter_no=chapter_no,
                                from_id=from_id,
                                to_id=to_id,
                                relation_type=relation_type,
                                confidence=confidence,
                                pattern=pattern,
                                evidence_text=text,
                                aliases=(left_alias, right_alias),
                            ))
                            return edges
    return edges


def extract_edges(rows: list[dict[str, Any]], aliases: dict[str, list[str]], max_scene_participants: int) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for row in rows:
        if row.get("matchStatus") != "resolved":
            continue
        ids = row_general_ids(row, max_scene_participants)
        if len(ids) < 2:
            continue
        for edge in find_pair_edges(row, ids, aliases):
            add_edge(edges, seen, edge)
    return sorted(edges, key=lambda edge: (edge.get("chapterNo") or 0, edge["evidenceRefs"][0], edge["fromId"], edge["type"], edge["toId"]))


def summarize_edges(edges: list[dict[str, Any]], inputs: dict[str, str]) -> dict[str, Any]:
    type_counts = Counter(edge["type"] for edge in edges)
    pattern_counts = Counter(edge["pattern"] for edge in edges)
    status_counts = Counter(edge["reviewStatus"] for edge in edges)
    general_ids = sorted({edge["fromId"] for edge in edges} | {edge["toId"] for edge in edges})
    high_confidence = sum(1 for edge in edges if float(edge.get("edgeConfidence") or 0) >= 0.8)
    medium_confidence = sum(1 for edge in edges if 0.7 <= float(edge.get("edgeConfidence") or 0) < 0.8)
    low_confidence = len(edges) - high_confidence - medium_confidence
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "source-grounded-relationship-evidence",
        "canonicalWrites": False,
        "inputs": inputs,
        "edgeCount": len(edges),
        "coveredGeneralCount": len(general_ids),
        "coveredGeneralIds": general_ids,
        "highConfidenceEdgeCount": high_confidence,
        "mediumConfidenceEdgeCount": medium_confidence,
        "lowConfidenceEdgeCount": low_confidence,
        "relationshipTypeCounts": dict(sorted(type_counts.items())),
        "patternCounts": dict(sorted(pattern_counts.items())),
        "reviewStatusCounts": dict(sorted(status_counts.items())),
    }


def render_markdown(summary: dict[str, Any], examples: list[dict[str, Any]]) -> str:
    lines = [
        "# Source-Grounded Relationship Evidence",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Canonical Writes: `{summary['canonicalWrites']}`",
        f"- Edge Count: `{summary['edgeCount']}`",
        f"- Covered Generals: `{summary['coveredGeneralCount']}`",
        f"- High / Medium / Low Confidence: `{summary['highConfidenceEdgeCount']}` / `{summary['mediumConfidenceEdgeCount']}` / `{summary['lowConfidenceEdgeCount']}`",
        "",
        "## Relationship Types",
        "",
    ]
    for relation_type, count in summary["relationshipTypeCounts"].items():
        lines.append(f"- `{relation_type}`: `{count}`")
    lines.extend(["", "## Patterns", ""])
    for pattern, count in summary["patternCounts"].items():
        lines.append(f"- `{pattern}`: `{count}`")
    lines.extend(["", "## Examples", ""])
    for edge in examples[:20]:
        lines.append(
            f"- `{edge['evidenceRefs'][0]}` `{edge['fromId']}` -`{edge['type']}`-> `{edge['toId']}` "
            f"confidence=`{edge['edgeConfidence']}` pattern=`{edge['pattern']}` text=`{edge['evidenceText'][:90]}`"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    try:
        apply_relationship_evidence_extraction_rules(args.governance_root, args.relationship_evidence_cue_rules)
        apply_relationship_type_refinement_rules(args.governance_root, args.relationship_type_refinement_rules)
    except SanguoGovernanceError as exc:
        print(f"[extract_relationship_evidence] governance error: {exc}")
        raise SystemExit(2) from None
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_root / "source-grounded-relationship-edges.jsonl"
    summary_path = output_root / "relationship-evidence-summary.json"
    md_path = output_root / "relationship-evidence-review.md"
    if not args.overwrite and any(path.exists() for path in (jsonl_path, summary_path, md_path)):
        raise FileExistsError("Relationship evidence outputs already exist. Re-run with --overwrite.")

    stable = read_json(Path(args.stable_knowledge))
    aliases = build_aliases(stable)
    rows = read_observed_mentions(Path(args.observed_mentions))
    edges = extract_edges(rows, aliases, args.max_scene_participants)
    jsonl_path.write_text("".join(json.dumps(edge, ensure_ascii=False) + "\n" for edge in edges), encoding="utf-8")
    summary = summarize_edges(edges, {
        "observedMentionsPath": args.observed_mentions,
        "stableKnowledgePath": args.stable_knowledge,
    })
    write_json(summary_path, summary)
    md_path.write_text(render_markdown(summary, edges), encoding="utf-8")
    print(f"[extract_relationship_evidence] wrote {jsonl_path}")
    print(f"[extract_relationship_evidence] wrote {summary_path}")
    print(f"[extract_relationship_evidence] wrote {md_path}")
    print(
        f"[extract_relationship_evidence] edges={summary['edgeCount']} "
        f"high={summary['highConfidenceEdgeCount']} medium={summary['mediumConfidenceEdgeCount']} low={summary['lowConfidenceEdgeCount']}"
    )


if __name__ == "__main__":
    main()