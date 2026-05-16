from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root
from sanguo_governance_loader import default_governance_root, load_stable_bootstrap_governance


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_ALIAS_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/alias-review-report.json")
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OBSERVED_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
DEFAULT_EVENTS_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json")
DEFAULT_8BOOK_MANIFEST_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/plaintext-source-candidates/8book-baihua-sanguo-source-manifest.json"
)
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap")
DEFAULT_RELATIONSHIP_CLAIM_GRAPH_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/relationship-claim-graph/a-canon-relationship-claims.jsonl"
)
DEFAULT_GOVERNANCE_ROOT = default_governance_root()
STABLE_BOOTSTRAP_SOURCE_LAYER = ""
HISTORY_PROFILE_BASELINE_SOURCE_LAYER = ""
A_CANON_RELATIONSHIP_GRADES: set[str] = set()

HISTORY_PROFILE_AUTHORITY_TERMS: tuple[str, ...] = ()
HISTORY_PROFILE_TRANSIENT_TERMS: tuple[str, ...] = ()
HAN_VARIANT_TRANSLATION = str.maketrans(
    {
        "刘": "劉",
        "关": "關",
        "张": "張",
        "赵": "趙",
        "孙": "孫",
        "权": "權",
        "诸": "諸",
        "葛": "葛",
        "禅": "禪",
        "韦": "韋",
        "庞": "龐",
        "马": "馬",
        "黄": "黃",
        "颜": "顏",
        "吕": "呂",
        "陆": "陸",
        "逊": "遜",
        "献": "獻",
        "汉": "漢",
        "魏": "魏",
        "吴": "吳",
        "蜀": "蜀",
    }
)


COMMON_RELATION_LABELS: set[str] = set()

BASIC_PROFILE_SOURCE_FIELDS: list[str] = []


HARD_RELATIONSHIP_SPECS: list[dict[str, Any]] = []


FACTION_TIMELINE_SPECS: list[dict[str, Any]] = []


EVENT_LOCATION_SEEDS: list[dict[str, Any]] = []


SOCIAL_ROLE_SEEDS: list[dict[str, Any]] = []


TIME_SCOPED_ALIAS_HINTS: list[dict[str, Any]] = []


KNOWN_FEMALE_NAMES: set[str] = set()


FEMALE_PROFILE_OVERRIDES: dict[str, dict[str, Any]] = {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build conservative stable knowledge bootstrap seeds for Sanguo RAG review gates.")
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance data root")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual-roster-seeds.json path")
    parser.add_argument("--alias-report", default=str(DEFAULT_ALIAS_REPORT_PATH), help="alias-review-report.json path")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH), help="observed-mentions.json path")
    parser.add_argument("--observed-summary", default=str(DEFAULT_OBSERVED_SUMMARY_PATH), help="observed-label-summary.json path")
    parser.add_argument("--events-summary", default=str(DEFAULT_EVENTS_SUMMARY_PATH), help="events-summary.json path")
    parser.add_argument("--8book-manifest", default=str(DEFAULT_8BOOK_MANIFEST_PATH), help="8book source manifest path")
    parser.add_argument(
        "--relationship-claim-graph",
        default=str(DEFAULT_RELATIONSHIP_CLAIM_GRAPH_PATH),
        help="A-canon relationship claim graph JSONL path",
    )
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs")
    return parser.parse_args()


BASIC_PROFILE_CUE_RULES: dict[str, Any] = {}


def apply_stable_bootstrap_governance(governance_root: str | Path | None) -> None:
    bundle = load_stable_bootstrap_governance(governance_root)
    policy = bundle["policy"]
    globals()["STABLE_BOOTSTRAP_SOURCE_LAYER"] = str(policy.get("stableBootstrapSourceLayer") or "")
    globals()["HISTORY_PROFILE_BASELINE_SOURCE_LAYER"] = str(policy.get("historyProfileBaselineSourceLayer") or "")
    globals()["A_CANON_RELATIONSHIP_GRADES"] = {
        str(item) for item in (policy.get("aCanonRelationshipGrades") or []) if str(item).strip()
    }
    globals()["HISTORY_PROFILE_AUTHORITY_TERMS"] = tuple(
        str(item) for item in (policy.get("historyProfileAuthorityTerms") or []) if str(item)
    )
    globals()["HISTORY_PROFILE_TRANSIENT_TERMS"] = tuple(
        str(item) for item in (policy.get("historyProfileTransientTerms") or []) if str(item)
    )
    globals()["BASIC_PROFILE_SOURCE_FIELDS"] = [
        str(item) for item in (policy.get("basicProfileSourceFields") or []) if str(item).strip()
    ]
    globals()["HARD_RELATIONSHIP_SPECS"] = bundle["hardRelationshipSpecs"]
    globals()["FACTION_TIMELINE_SPECS"] = bundle["factionTimelineSpecs"]
    globals()["EVENT_LOCATION_SEEDS"] = bundle["eventLocationSeeds"]
    globals()["SOCIAL_ROLE_SEEDS"] = bundle["socialRoleSeeds"]
    globals()["TIME_SCOPED_ALIAS_HINTS"] = bundle["timeScopedAliasHints"]
    globals()["KNOWN_FEMALE_NAMES"] = set(bundle["knownFemaleNames"])
    globals()["COMMON_RELATION_LABELS"] = set(bundle["commonRelationLabels"])
    globals()["FEMALE_PROFILE_OVERRIDES"] = bundle["femaleProfileOverrides"]
    globals()["BASIC_PROFILE_CUE_RULES"] = bundle["basicProfileCueRules"]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        text = line.strip()
        if not text:
            continue
        value = json.loads(text)
        if isinstance(value, dict):
            rows.append(value)
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def bounded_unique(values: list[str], limit: int) -> list[str]:
    result: list[str] = []
    for value in values:
        item = str(value or "").strip()
        if item and item not in result:
            result.append(item)
        if len(result) >= limit:
            break
    return result


def person_plain_text(person: dict[str, Any]) -> str:
    story_text = " / ".join(str(cell.get("text") or "") for cell in person.get("storyStripCells") or [])
    return "\n".join(
        str(part or "")
        for part in [
            person.get("title"),
            person.get("role"),
            person.get("source"),
            person.get("notes"),
            person.get("historicalAnecdote"),
            person.get("parentsSummary"),
            person.get("ancestorsSummary"),
            story_text,
        ]
    )


def load_observed_mentions(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = read_json(path)
    rows = payload.get("data") if isinstance(payload, dict) else payload
    return rows if isinstance(rows, list) else []


def build_observed_general_stats(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    for row in rows:
        general_ids = sorted(set((row.get("matchedGeneralIds") or []) + (row.get("sceneParticipants") or [])))
        if not general_ids:
            continue
        chapter_no = row.get("chapterNo")
        source_ref = str(row.get("sourceRef") or "").strip()
        label = str(row.get("label") or row.get("normalized") or "").strip()
        for general_id in general_ids:
            bucket = stats.setdefault(
                str(general_id),
                {"mentionCount": 0, "chapters": set(), "labels": Counter(), "sourceRefs": []},
            )
            bucket["mentionCount"] += 1
            if isinstance(chapter_no, int):
                bucket["chapters"].add(chapter_no)
            if label:
                bucket["labels"][label] += 1
            if source_ref and source_ref not in bucket["sourceRefs"] and len(bucket["sourceRefs"]) < 12:
                bucket["sourceRefs"].append(source_ref)

    normalized: dict[str, dict[str, Any]] = {}
    for general_id, bucket in stats.items():
        chapters = sorted(bucket["chapters"])
        normalized[general_id] = {
            "mentionCount": bucket["mentionCount"],
            "firstChapter": chapters[0] if chapters else None,
            "lastChapter": chapters[-1] if chapters else None,
            "chapterCount": len(chapters),
            "topLabels": [label for label, _count in bucket["labels"].most_common(8)],
            "sourceRefs": bucket["sourceRefs"],
        }
    return normalized


def ensure_output_root(path: Path, overwrite: bool) -> None:
    path.mkdir(parents=True, exist_ok=True)
    outputs = [path / "stable-knowledge-bootstrap.json", path / "stable-knowledge-bootstrap.md"]
    existing = [item for item in outputs if item.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def load_people(generals_path: Path, manual_roster_path: Path) -> list[dict[str, Any]]:
    people = []
    for raw in read_json(generals_path):
        record = dict(raw)
        record["generalId"] = record.get("id")
        record["sourceLayer"] = "generals"
        people.append(record)
    if manual_roster_path.exists():
        for raw in (read_json(manual_roster_path).get("entries") or []):
            record = dict(raw)
            record["id"] = record.get("generalId")
            record["sourceLayer"] = "manual-roster"
            people.append(record)
    return people


def build_name_index(people: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        labels = [name] + [str(alias).strip() for alias in (person.get("alias") or []) if str(alias).strip()]
        for label in labels:
            index.setdefault(label, person)
    return index


def resolve_name(name: str, index: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    person = index.get(name)
    if not person:
        return None
    return {
        "generalId": person.get("generalId") or person.get("id"),
        "name": person.get("name"),
        "baseFaction": person.get("faction"),
    }


def edge_key(edge: dict[str, Any]) -> tuple[str, str, str]:
    return (str(edge.get("fromId")), str(edge.get("toId")), str(edge.get("type")))


def add_edge(edges: list[dict[str, Any]], edge: dict[str, Any], seen: set[tuple[str, str, str]]) -> None:
    key = edge_key(edge)
    if key in seen:
        return
    seen.add(key)
    edges.append(edge)


def upsert_a_canon_edge(edges: list[dict[str, Any]], edge: dict[str, Any], seen: set[tuple[str, str, str]]) -> None:
    key = edge_key(edge)
    if key not in seen:
        add_edge(edges, edge, seen)
        return
    for index, current in enumerate(edges):
        if edge_key(current) == key:
            edges[index] = edge
            return


def build_relationship_edges(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    edges: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    symmetric_types = {"sworn_sibling", "sibling", "spouse"}

    for spec in HARD_RELATIONSHIP_SPECS:
        if spec.get("names"):
            names = spec["names"]
            resolved = [resolve_name(name, index) for name in names]
            if any(item is None for item in resolved):
                missing.append({"kind": "relationship", "spec": spec, "missingNames": [name for name, item in zip(names, resolved) if item is None]})
                continue
            for i, left in enumerate(resolved):
                for right in resolved[i + 1 :]:
                    for from_item, to_item in ((left, right), (right, left)):
                        add_edge(
                            edges,
                            {
                                "fromId": from_item["generalId"],
                                "toId": to_item["generalId"],
                                "type": spec["type"],
                                "evidenceRefs": spec.get("sourceRefs") or [],
                                "eventTags": spec.get("eventTags") or [],
                                "validFromChapter": spec.get("validFromChapter"),
                                "validToChapter": spec.get("validToChapter"),
                                "edgeConfidence": spec.get("confidence", 0.9),
                                "reviewStatus": spec.get("status", "ready"),
                                "sourceLayer": STABLE_BOOTSTRAP_SOURCE_LAYER,
                            },
                            seen,
                        )
            continue

        left = resolve_name(spec["fromName"], index)
        right = resolve_name(spec["toName"], index)
        if not left or not right:
            missing.append(
                {
                    "kind": "relationship",
                    "spec": spec,
                    "missingNames": [name for name, item in ((spec["fromName"], left), (spec["toName"], right)) if item is None],
                }
            )
            continue
        pairs = [(left, right)]
        if spec["type"] in symmetric_types:
            pairs.append((right, left))
        for from_item, to_item in pairs:
            add_edge(
                edges,
                {
                    "fromId": from_item["generalId"],
                    "toId": to_item["generalId"],
                    "type": spec["type"],
                    "evidenceRefs": spec.get("sourceRefs") or [],
                    "eventTags": spec.get("eventTags") or [],
                    "validFromChapter": spec.get("validFromChapter"),
                    "validToChapter": spec.get("validToChapter"),
                    "edgeConfidence": spec.get("confidence", 0.9),
                    "reviewStatus": spec.get("status", "ready"),
                    "sourceLayer": STABLE_BOOTSTRAP_SOURCE_LAYER,
                },
                seen,
            )
    return edges, missing


def build_parent_summary_edges(people: list[dict[str, Any]], index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    edges = []
    for child in people:
        child_id = str(child.get("generalId") or child.get("id") or "").strip()
        child_name = str(child.get("name") or "").strip()
        parents_summary = str(child.get("parentsSummary") or "").strip()
        if not child_id or not child_name or not parents_summary:
            continue
        match = re.search(r"父[:：]\s*([^\s／/、，,（(]+)", parents_summary)
        if not match:
            continue
        father_name = match.group(1).replace("氏", "").strip()
        if not father_name or father_name in {"不明", "未知"} or "🔒" in father_name:
            continue
        father = resolve_name(father_name, index)
        if not father or father.get("generalId") == child_id:
            continue
        edges.append(
            {
                "fromId": father["generalId"],
                "toId": child_id,
                "type": "parent_child",
                "evidenceRefs": [f"generals.parentsSummary:{child_id}"],
                "eventTags": ["parent_summary"],
                "edgeConfidence": 0.78,
                "reviewStatus": "ready",
                "sourceLayer": "generals-parent-summary",
            }
        )
    return edges


def normalize_history_text(text: str) -> str:
    return str(text or "").translate(HAN_VARIANT_TRANSLATION)


def compact_history_text(text: str) -> str:
    return re.sub(r"\s+", "", normalize_history_text(text))


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    rows: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        rows.append(value)
    return rows


def person_id(person: dict[str, Any]) -> str:
    return str(person.get("generalId") or person.get("id") or "").strip()


def person_labels(person: dict[str, Any]) -> list[str]:
    labels: list[str] = []
    for value in [person.get("name"), *(person.get("alias") or [])]:
        text = normalize_history_text(str(value or "").strip())
        if len(text) >= 2 and text not in labels:
            labels.append(text)
    return labels


def profile_relation_snippets(text: str, labels: list[str]) -> list[str]:
    compact = compact_history_text(text)
    if not compact or not labels:
        return []
    snippets: list[str] = []
    for label in labels:
        escaped = re.escape(label)
        patterns = [
            rf"{escaped}(?:的|之)?(?:麾下|重要親信|重要亲信|主要親信|主要亲信|親信|亲信|侍衛|侍卫|部下|幕僚|核心幕僚)",
            rf"(?:效忠|侍奉|追隨|追随|跟隨|跟随){escaped}",
            rf"(?:投奔|投靠|歸降|归降|歸順|归顺){escaped}",
            rf"(?:成為|成为){escaped}(?:的|之)?部將",
            rf"接受{escaped}(?:指揮|指挥)",
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, compact):
                left = max(0, match.start() - 16)
                right = min(len(compact), match.end() + 16)
                snippets.append(compact[left:right])
    return unique_strings(snippets)[:3]


def profile_relation_type(snippets: list[str]) -> str:
    text = " ".join(snippets)
    if any(term in text for term in ("投奔", "投靠", "歸降", "归降", "歸順", "归顺")):
        return "patron_client"
    return "ruler_subject"


def profile_relation_confidence(snippets: list[str]) -> float:
    text = " ".join(snippets)
    if any(term in text for term in ("麾下", "效忠", "親信", "亲信", "侍衛", "侍卫")):
        return 0.9
    if any(term in text for term in HISTORY_PROFILE_TRANSIENT_TERMS):
        return 0.82
    return 0.86


def build_history_profile_relationship_edges(
    people: list[dict[str, Any]],
    index: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    del index
    people_with_labels = [(person, person_id(person), person_labels(person)) for person in people]
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for subject, subject_id, _subject_labels in people_with_labels:
        if not subject_id:
            continue
        profile_text = str(subject.get("historicalAnecdote") or "").strip()
        if not profile_text:
            continue
        for target, target_id, target_labels in people_with_labels:
            if not target_id or target_id == subject_id or not target_labels:
                continue
            snippets = profile_relation_snippets(profile_text, target_labels)
            if not snippets:
                continue
            relation_type = profile_relation_type(snippets)
            edge = {
                "fromId": target_id,
                "toId": subject_id,
                "type": relation_type,
                "evidenceRefs": [f"generals.historicalAnecdote:{subject_id}"],
                "eventTags": ["history_profile_relationship"],
                "edgeConfidence": profile_relation_confidence(snippets),
                "reviewStatus": "ready",
                "sourceLayer": HISTORY_PROFILE_BASELINE_SOURCE_LAYER,
                "claimLayer": "history",
                "claimGrade": "B-history-profile-baseline",
                "sourceQuote": snippets[0],
            }
            add_edge(edges, edge, seen)
    return edges


def load_a_canon_claim_edges(path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not path.exists():
        return [], [{"kind": "relationship-claim-graph", "path": str(path), "status": "missing"}]

    edges: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for row in read_jsonl(path):
        grade = str(row.get("claimGrade") or "").strip()
        if grade not in A_CANON_RELATIONSHIP_GRADES:
            skipped.append({"kind": "relationship-claim-graph-row", "claimId": row.get("claimId"), "status": "non-a-canon", "claimGrade": grade})
            continue
        from_id = str(row.get("fromId") or "").strip()
        to_id = str(row.get("toId") or "").strip()
        rel_type = str(row.get("type") or "").strip()
        if not from_id or not to_id or not rel_type:
            skipped.append({"kind": "relationship-claim-graph-row", "claimId": row.get("claimId"), "status": "invalid-endpoints"})
            continue
        edges.append(
            {
                "fromId": from_id,
                "toId": to_id,
                "type": rel_type,
                "evidenceRefs": list(row.get("evidenceRefs") or []),
                "eventTags": ["relationship_claim_graph"],
                "edgeConfidence": row.get("edgeConfidence") or 0.95,
                "edgeStrength": row.get("edgeStrength") or 0.9,
                "reviewStatus": "ready",
                "sourceLayer": "claim-graph-a-romance" if grade == "A-romance" else "claim-graph-a-history",
                "claimLayer": "romance" if grade == "A-romance" else "history",
                "claimGrade": grade,
                "claimId": row.get("claimId"),
                "sourcePolicyId": row.get("sourcePolicyId"),
                "sourceEvidenceId": row.get("sourceEvidenceId"),
                "sourceFamily": row.get("sourceFamily"),
                "locator": row.get("locator"),
                "textHash": row.get("textHash"),
                "sourceQuote": row.get("quote"),
                "promotionTrace": list(row.get("promotionTrace") or []),
            }
        )
    return edges, skipped


def resolve_names(names: list[str], index: dict[str, dict[str, Any]]) -> tuple[list[str], list[str]]:
    ids: list[str] = []
    missing: list[str] = []
    for name in names:
        resolved = resolve_name(name, index)
        if resolved:
            ids.append(str(resolved["generalId"]))
        else:
            missing.append(name)
    return sorted(set(ids)), missing


def build_event_location_seeds(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    seeds = []
    missing = []
    for spec in EVENT_LOCATION_SEEDS:
        participant_ids, missing_names = resolve_names(spec.get("participantNames") or [], index)
        seed = {
            "eventTag": spec["eventTag"],
            "chapterRange": spec["chapterRange"],
            "locationNames": spec["locationNames"],
            "participantIds": participant_ids,
            "relationTypes": spec.get("relationTypes") or [],
            "confidence": spec.get("confidence", 0.8),
            "reviewStatus": "ready" if not missing_names else "needs-id-coverage",
            "sourceLayer": "stable-bootstrap-seed",
        }
        seeds.append(seed)
        if missing_names:
            missing.append({"kind": "event-location", "eventTag": spec["eventTag"], "missingNames": missing_names})
    return seeds, missing


def build_faction_timeline(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    timelines = []
    missing = []
    for spec in FACTION_TIMELINE_SPECS:
        resolved = resolve_name(spec["name"], index)
        if not resolved:
            missing.append({"kind": "faction-timeline", "missingName": spec["name"]})
            continue
        timelines.append(
            {
                "generalId": resolved["generalId"],
                "name": resolved["name"],
                "baseFaction": resolved.get("baseFaction"),
                "intervals": spec["intervals"],
                "reviewStatus": "review-only",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return timelines, missing


def build_social_roles(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    roles = []
    missing = []
    for spec in SOCIAL_ROLE_SEEDS:
        resolved = resolve_name(spec["name"], index)
        if not resolved:
            missing.append({"kind": "social-role", "missingName": spec["name"]})
            continue
        roles.append(
            {
                "generalId": resolved["generalId"],
                "name": resolved["name"],
                "roleActivityTags": spec["roleActivityTags"],
                "decisionWeightHints": spec.get("decisionWeightHints") or [],
                "confidence": 0.82,
                "reviewStatus": "ready-for-gate-hint",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return roles, missing


def build_identity_seeds(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seeds = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        aliases = []
        for alias in person.get("alias") or []:
            alias_text = str(alias).strip()
            if alias_text and alias_text != name and alias_text not in aliases:
                aliases.append(alias_text)
        title = str(person.get("title") or "").strip().strip("【】")
        if title and title != name and title not in aliases:
            aliases.append(title)
        anecdote = str(person.get("historicalAnecdote") or "")
        for pattern in (r"字([^，,。；;\s（）()]{1,4})", r"小字([^，,。；;\s（）()]{1,4})"):
            for match in re.finditer(pattern, anecdote):
                alias_text = match.group(1).strip("「」『』")
                if alias_text and alias_text != name and alias_text not in aliases:
                    aliases.append(alias_text)
        seeds.append(
            {
                "generalId": general_id,
                "name": name,
                "aliases": aliases[:12],
                "gender": person.get("gender"),
                "baseFaction": person.get("faction"),
                "title": person.get("title"),
                "sourceLayer": person.get("sourceLayer"),
                "reviewStatus": "identity-only",
            }
        )
    seeds.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return seeds


def append_unique(items: list[str], value: str) -> None:
    if value not in items:
        items.append(value)


def infer_role_tags_from_person(person: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    text = person_plain_text(person)
    role_tags: list[str] = []
    decision_hints: list[str] = []
    evidence_terms: list[str] = []

    def hit(tag: str, hint: str | None, *terms: str) -> None:
        hits = [term for term in terms if term and term in text]
        if not hits:
            return
        append_unique(role_tags, tag)
        if hint:
            append_unique(decision_hints, hint)
        evidence_terms.extend(hits)

    role = str(person.get("role") or "")
    try:
        int_stat = int(person.get("int") or (person.get("stats") or {}).get("int") or 0)
        pol_stat = int(person.get("pol") or (person.get("stats") or {}).get("pol") or 0)
    except (TypeError, ValueError):
        int_stat = 0
        pol_stat = 0
    for rule in BASIC_PROFILE_CUE_RULES.get("roleClassRules") or []:
        if role != str(rule.get("role") or ""):
            continue
        threshold_mode = str(rule.get("thresholdMode") or "all")
        min_int = int(rule.get("minInt") or 0)
        min_pol = int(rule.get("minPol") or 0)
        int_ok = int_stat >= min_int
        pol_ok = pol_stat >= min_pol
        if threshold_mode == "any":
            threshold_ok = int_ok or pol_ok
        else:
            threshold_ok = int_ok and pol_ok
        if not threshold_ok:
            continue
        for tag in rule.get("roleActivityTags") or []:
            append_unique(role_tags, str(tag))
        for hint in rule.get("decisionWeightHints") or []:
            append_unique(decision_hints, str(hint))

    for rule in BASIC_PROFILE_CUE_RULES.get("roleTagRules") or []:
        hit(
            str(rule.get("tag") or ""),
            str(rule.get("decisionHint")) if rule.get("decisionHint") is not None else None,
            *[str(term) for term in (rule.get("terms") or [])],
        )

    return role_tags[:6], decision_hints[:6], sorted(set(evidence_terms))[:12]


def build_auto_social_roles(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    roles = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        role_tags, decision_hints, evidence_terms = infer_role_tags_from_person(person)
        if not role_tags:
            continue
        seen.add(general_id)
        roles.append(
            {
                "generalId": general_id,
                "name": name,
                "roleActivityTags": role_tags,
                "decisionWeightHints": decision_hints,
                "evidenceTerms": evidence_terms,
                "confidence": 0.62,
                "reviewStatus": "plain-field-hint-only",
                "sourceLayer": "structured-plain-fields",
            }
        )
    roles.sort(key=lambda item: str(item.get("generalId") or ""))
    return roles


def build_plain_fact_proposals(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    proposals = []
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        role_tags, decision_hints, evidence_terms = infer_role_tags_from_person(person)
        if role_tags:
            proposals.append(
                {
                    "generalId": general_id,
                    "name": name,
                    "factType": "role_activity_tags",
                    "roleActivityTags": role_tags,
                    "decisionWeightHints": decision_hints,
                    "evidenceTerms": evidence_terms,
                    "sourceFields": ["role", "title", "source", "notes", "historicalAnecdote", "storyStripCells"],
                    "confidence": 0.58,
                    "reviewStatus": "plain-fact-proposal-only",
                }
            )
    proposals.sort(key=lambda item: (str(item.get("factType") or ""), str(item.get("generalId") or "")))
    return proposals


def infer_stat_tags(person: dict[str, Any]) -> tuple[list[str], list[str], list[str], list[str]]:
    aptitudes: list[str] = []
    decisions: list[str] = []
    personality: list[str] = []
    choices: list[str] = []

    def stat_value(key: str) -> int:
        raw = person.get(key)
        try:
            return int(raw)
        except (TypeError, ValueError):
            return 0

    def stat_hit(key: str, threshold: int, aptitude: str, decision: str, personality_tag: str, choice: str) -> None:
        if stat_value(key) < threshold:
            return
        append_unique(aptitudes, aptitude)
        append_unique(decisions, decision)
        append_unique(personality, personality_tag)
        append_unique(choices, choice)

    for rule in BASIC_PROFILE_CUE_RULES.get("statTagRules") or []:
        stat_hit(
            str(rule.get("statKey") or ""),
            int(rule.get("threshold") or 0),
            str(rule.get("aptitudeTag") or ""),
            str(rule.get("decisionHint") or ""),
            str(rule.get("personalityTag") or ""),
            str(rule.get("choiceHint") or ""),
        )

    return aptitudes[:8], decisions[:8], personality[:8], choices[:8]


def infer_affect_and_activity_tags(person: dict[str, Any]) -> tuple[list[str], list[str], list[str], list[str]]:
    text = person_plain_text(person)
    affect_tags: list[str] = []
    personality_tags: list[str] = []
    activity_hints: list[str] = []
    evidence_terms: list[str] = []
    targets = {
        "affect_tags": affect_tags,
        "personality_tags": personality_tags,
        "activity_hints": activity_hints,
    }

    def cue(tags: list[str], tag: str, *terms: str) -> None:
        hits = [term for term in terms if term and term in text]
        if not hits:
            return
        append_unique(tags, tag)
        evidence_terms.extend(hits)

    for rule in BASIC_PROFILE_CUE_RULES.get("affectActivityCueRules") or []:
        target = targets.get(str(rule.get("target") or ""))
        if target is None:
            continue
        cue(target, str(rule.get("tag") or ""), *[str(term) for term in (rule.get("terms") or [])])

    return affect_tags[:8], personality_tags[:8], activity_hints[:8], sorted(set(evidence_terms))[:16]


def build_basic_profile_seeds(people: list[dict[str, Any]], observed_stats: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        aliases = [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        role_tags, role_decision_hints, role_terms = infer_role_tags_from_person(person)
        stat_aptitudes, stat_decisions, stat_personality, choice_hints = infer_stat_tags(person)
        affect_tags, plain_personality, activity_hints, affect_terms = infer_affect_and_activity_tags(person)
        mention_stats = observed_stats.get(general_id, {})
        text = person_plain_text(person)
        coverage_level = "plain-rich" if len(text.strip()) >= 80 else "observed-only" if mention_stats else "identity-only"
        profiles.append(
            {
                "generalId": general_id,
                "name": name,
                "aliases": bounded_unique(aliases, 12),
                "gender": person.get("gender"),
                "baseFaction": person.get("faction"),
                "title": person.get("title"),
                "role": person.get("role"),
                "sourceLayer": person.get("sourceLayer"),
                "coverageLevel": coverage_level,
                "roleActivityTags": bounded_unique(role_tags, 8),
                "aptitudeTags": bounded_unique(stat_aptitudes, 8),
                "affectTags": bounded_unique(affect_tags, 8),
                "personalityTags": bounded_unique(plain_personality + stat_personality, 10),
                "activitySeedHints": bounded_unique(activity_hints, 10),
                "decisionWeightHints": bounded_unique(role_decision_hints + stat_decisions, 10),
                "choiceWeightHints": bounded_unique(choice_hints, 10),
                "plainEvidenceTerms": bounded_unique(role_terms + affect_terms, 20),
                "observedMentionStats": mention_stats,
                "sourceFields": BASIC_PROFILE_SOURCE_FIELDS,
                "reviewStatus": "plain-basic-profile-only",
            }
        )
    profiles.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return profiles


def relation_labels_for_people(people: list[dict[str, Any]]) -> list[tuple[str, str, str]]:
    labels: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        raw_labels = [name] + [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        for label in raw_labels:
            if len(label) < 2 or label in COMMON_RELATION_LABELS:
                continue
            key = (general_id, label)
            if key in seen:
                continue
            seen.add(key)
            labels.append((label, general_id, name))
    labels.sort(key=lambda item: (-len(item[0]), item[0]))
    return labels


def infer_plain_relationship(source_id: str, target_id: str, text: str, label: str, match_start: int) -> tuple[str, str, str, str, list[str]]:
    window = text[max(0, match_start - 16) : match_start + len(label) + 16]
    terms: list[str] = []

    def resolve_expr(expr: str) -> str:
        return target_id if expr == "target_id" else source_id

    for rule in BASIC_PROFILE_CUE_RULES.get("plainRelationshipRules") or []:
        hits = [str(term) for term in (rule.get("terms") or []) if str(term) and str(term) in window]
        if not hits:
            continue
        terms.extend(hits)
        return (
            resolve_expr(str(rule.get("fromExpr") or "source_id")),
            resolve_expr(str(rule.get("toExpr") or "target_id")),
            str(rule.get("proposedType") or "plain_association"),
            str(rule.get("reason") or "co_mention_plain_field"),
            sorted(set(terms))[:8],
        )
    return source_id, target_id, "plain_association", "co_mention_plain_field", sorted(set(terms))[:8]


def build_plain_relationship_proposals(people: list[dict[str, Any]], max_per_person: int = 8) -> list[dict[str, Any]]:
    labels = relation_labels_for_people(people)
    proposals: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for source in people:
        source_id = str(source.get("generalId") or source.get("id") or "").strip()
        source_name = str(source.get("name") or "").strip()
        if not source_id or not source_name:
            continue
        text = person_plain_text(source)
        if not text.strip():
            continue
        per_person_count = 0
        for label, target_id, target_name in labels:
            if target_id == source_id or label == source_name or label not in text:
                continue
            match_start = text.find(label)
            from_id, to_id, proposed_type, reason, evidence_terms = infer_plain_relationship(source_id, target_id, text, label, match_start)
            key = (from_id, to_id, proposed_type)
            if key in seen:
                continue
            seen.add(key)
            proposals.append(
                {
                    "fromId": from_id,
                    "toId": to_id,
                    "sourceGeneralId": source_id,
                    "sourceName": source_name,
                    "targetName": target_name,
                    "matchedLabel": label,
                    "proposedType": proposed_type,
                    "reason": reason,
                    "evidenceTerms": evidence_terms,
                    "confidence": 0.54 if proposed_type != "plain_association" else 0.42,
                    "sourceFields": BASIC_PROFILE_SOURCE_FIELDS,
                    "reviewStatus": "plain-relationship-proposal-only",
                    "sourceLayer": "structured-plain-fields",
                }
            )
            per_person_count += 1
            if per_person_count >= max_per_person:
                break
    proposals.sort(key=lambda item: (str(item.get("proposedType") or ""), str(item.get("fromId") or ""), str(item.get("toId") or "")))
    return proposals


def is_female_priority_person(person: dict[str, Any]) -> bool:
    name = str(person.get("name") or "").strip()
    aliases = {str(alias).strip() for alias in person.get("alias") or []}
    return person.get("gender") == "女" or name in KNOWN_FEMALE_NAMES or bool(aliases.intersection(KNOWN_FEMALE_NAMES))


def infer_female_profile(person: dict[str, Any]) -> dict[str, Any]:
    text = "\n".join(
        str(part or "")
        for part in [
            person.get("title"),
            person.get("role"),
            person.get("source"),
            person.get("notes"),
            person.get("historicalAnecdote"),
            " / ".join(str(cell.get("text") or "") for cell in person.get("storyStripCells") or []),
        ]
    )
    affect_tags: list[str] = []
    personality_tags: list[str] = []
    interaction_priorities: list[str] = []
    event_hooks: list[str] = []
    targets = {
        "affect_tags": affect_tags,
        "personality_tags": personality_tags,
        "interaction_priorities": interaction_priorities,
    }

    def cue(tag_list: list[str], tag: str, *terms: str) -> None:
        if any(term and term in text for term in terms):
            append_unique(tag_list, tag)

    for rule in BASIC_PROFILE_CUE_RULES.get("femaleProfileCueRules") or []:
        target = targets.get(str(rule.get("target") or ""))
        if target is None:
            continue
        cue(target, str(rule.get("tag") or ""), *[str(term) for term in (rule.get("terms") or [])])

    if not affect_tags:
        affect_tags = ["family_affection"]
    if not personality_tags:
        personality_tags = ["under-documented", "relationship-sensitive"]
    if not interaction_priorities:
        interaction_priorities = ["relationship_discovery", "low-source-personal_scene"]
    for term in BASIC_PROFILE_CUE_RULES.get("femaleProfileEventHookTerms") or []:
        term_text = str(term)
        if term_text and term_text in text:
            event_hooks.append(term_text)

    return {
        "archetype": "female_priority_profile",
        "affectTags": affect_tags[:8],
        "personalityTags": personality_tags[:8],
        "interactionPriorities": interaction_priorities[:8],
        "eventHooks": event_hooks[:8],
    }


def build_female_priority_profiles(people: list[dict[str, Any]], index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    profiles = []
    seen: set[str] = set()
    for person in people:
        if not is_female_priority_person(person):
            continue
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        inferred = infer_female_profile(person)
        override = FEMALE_PROFILE_OVERRIDES.get(name, {})
        focus_names = override.get("relationshipFocusNames") or []
        focus_ids, missing_focus_names = resolve_names(focus_names, index)
        aliases = [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        affect_tags = override.get("affectTags") or inferred["affectTags"]
        love_hate_tendency = {
            "loveAxes": [tag for tag in affect_tags if tag in {"romance_love", "family_affection", "friendship_loyalty", "mercy_compassion"}],
            "hateAxes": [tag for tag in affect_tags if tag in {"anger_revenge", "fear_shame", "grief_regret"}],
            "ambitionAxes": [tag for tag in affect_tags if tag in {"ambition_pride"}],
        }
        profile = {
            "generalId": general_id,
            "name": name,
            "aliases": aliases[:12],
            "gender": person.get("gender"),
            "genderCorrection": "female-priority-sidecar" if person.get("gender") != "女" else None,
            "baseFaction": person.get("faction"),
            "archetype": override.get("archetype") or inferred["archetype"],
            "affectTags": affect_tags,
            "loveHateTendency": love_hate_tendency,
            "personalityTags": override.get("personalityTags") or inferred["personalityTags"],
            "interactionPriorities": override.get("interactionPriorities") or inferred["interactionPriorities"],
            "relationshipFocusIds": focus_ids,
            "missingRelationshipFocusNames": missing_focus_names,
            "eventHooks": override.get("eventHooks") or inferred["eventHooks"],
            "profileNeeds": ["basicInfo", "emotion", "personality", "loveHate", "affectEvents", "interactionEvents"],
            "externalSourceNeeded": not bool(override),
            "sourceFields": ["gender", "alias", "title", "role", "historicalAnecdote", "storyStripCells"],
            "contentGapPolicy": "high-priority: allow future authorized external stories as sidecar proposals; never canonical without source gate",
            "reviewStatus": "female-priority-profile-only",
            "sourceLayer": "female-priority-bootstrap",
        }
        profiles.append(profile)
    profiles.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return profiles


def build_alias_hints(index: dict[str, dict[str, Any]], alias_report: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    hints = []
    missing = []
    collision_aliases = {row.get("alias") for row in (alias_report.get("collisions") or [])}
    for spec in TIME_SCOPED_ALIAS_HINTS:
        resolved_hints = []
        for hint in spec.get("hints") or []:
            resolved = resolve_name(hint["generalName"], index)
            co_mention_ids, missing_co_mentions = resolve_names(hint.get("coMentionNames") or [], index)
            if not resolved:
                missing.append({"kind": "time-scoped-alias", "alias": spec["alias"], "missingName": hint["generalName"]})
                continue
            resolved_hints.append(
                {
                    "generalId": resolved["generalId"],
                    "name": resolved["name"],
                    "chapterRange": hint.get("chapterRange"),
                    "coMentionIds": co_mention_ids,
                    "missingCoMentionNames": missing_co_mentions,
                    "confidence": hint.get("confidence", 0.65),
                }
            )
        hints.append(
            {
                "alias": spec["alias"],
                "isCurrentCollision": spec["alias"] in collision_aliases,
                "hints": resolved_hints,
                "negativeRule": spec.get("negativeRule"),
                "reviewStatus": "review-only-time-scoped",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return hints, missing


def summarize_counts(payload: dict[str, Any]) -> dict[str, Any]:
    edge_types = Counter(edge["type"] for edge in payload["relationshipEdges"])
    role_tags = Counter(tag for row in payload["socialRoleSeeds"] for tag in row.get("roleActivityTags") or [])
    auto_role_tags = Counter(tag for row in payload["autoSocialRoleSeeds"] for tag in row.get("roleActivityTags") or [])
    basic_coverage = Counter(row.get("coverageLevel") or "unknown" for row in payload["basicProfileSeeds"])
    plain_relation_types = Counter(row.get("proposedType") or "unknown" for row in payload["plainRelationshipProposals"])
    identity_factions = Counter(row.get("baseFaction") or "unknown" for row in payload["identitySeeds"])
    female_archetypes = Counter(row.get("archetype") or "unknown" for row in payload["femalePriorityProfiles"])
    return {
        "identitySeedCount": len(payload["identitySeeds"]),
        "identityFactionCounts": dict(sorted(identity_factions.items())),
        "basicProfileSeedCount": len(payload["basicProfileSeeds"]),
        "basicProfileCoverageCounts": dict(sorted(basic_coverage.items())),
        "femalePriorityProfileCount": len(payload["femalePriorityProfiles"]),
        "femaleArchetypeCounts": dict(sorted(female_archetypes.items())),
        "relationshipEdgeCount": len(payload["relationshipEdges"]),
        "relationshipTypeCounts": dict(sorted(edge_types.items())),
        "plainRelationshipProposalCount": len(payload["plainRelationshipProposals"]),
        "plainRelationshipProposalTypeCounts": dict(sorted(plain_relation_types.items())),
        "eventLocationSeedCount": len(payload["eventLocationSeeds"]),
        "factionTimelineCount": len(payload["factionTimelines"]),
        "socialRoleSeedCount": len(payload["socialRoleSeeds"]),
        "autoSocialRoleSeedCount": len(payload["autoSocialRoleSeeds"]),
        "roleTagCounts": dict(sorted(role_tags.items())),
        "autoRoleTagCounts": dict(sorted(auto_role_tags.items())),
        "plainFactProposalCount": len(payload["plainFactProposals"]),
        "timeScopedAliasHintCount": len(payload["timeScopedAliasHints"]),
        "missingCoverageCount": len(payload["missingCoverage"]),
    }


def render_markdown(payload: dict[str, Any]) -> str:
    summary = payload["summary"]
    lines = [
        "# Stable Knowledge Bootstrap",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- White Text Source Candidate: `{payload['sourceCandidates']['whiteTextManifestPath']}`",
        f"- White Text Status: `{payload['sourceCandidates']['whiteTextStatus']}`",
        "",
        "## Counts",
        "",
        f"- Identity seeds: `{summary['identitySeedCount']}`",
        f"- Basic profile seeds: `{summary['basicProfileSeedCount']}`",
        f"- Female priority profiles: `{summary['femalePriorityProfileCount']}`",
        f"- Relationship edges: `{summary['relationshipEdgeCount']}`",
        f"- Plain relationship proposals: `{summary['plainRelationshipProposalCount']}`",
        f"- Event-location seeds: `{summary['eventLocationSeedCount']}`",
        f"- Faction timelines: `{summary['factionTimelineCount']}`",
        f"- Social role seeds: `{summary['socialRoleSeedCount']}`",
        f"- Auto social role seeds: `{summary['autoSocialRoleSeedCount']}`",
        f"- Plain fact proposals: `{summary['plainFactProposalCount']}`",
        f"- Time-scoped alias hints: `{summary['timeScopedAliasHintCount']}`",
        f"- Missing coverage items: `{summary['missingCoverageCount']}`",
        "",
        "## Relationship Types",
        "",
        "| Type | Count |",
        "| --- | ---: |",
    ]
    for relation_type, count in summary["relationshipTypeCounts"].items():
        lines.append(f"| `{relation_type}` | {count} |")
    lines.extend(["", "## Plain Relationship Proposal Types", "", "| Type | Count |", "| --- | ---: |"])
    for relation_type, count in summary["plainRelationshipProposalTypeCounts"].items():
        lines.append(f"| `{relation_type}` | {count} |")
    lines.extend(
        [
            "",
            "## Gate Usage",
            "",
            "- 可作 A 升級輔助：`relationshipEdges`、`relationshipClaimGraph`、`eventLocationSeeds`、`timeScopedAliasHints`。",
            "- 僅作提示：`identitySeeds`、`basicProfileSeeds`、`femalePriorityProfiles`、`plainRelationshipProposals`、`factionTimelines`、`socialRoleSeeds`、`autoSocialRoleSeeds`、`plainFactProposals`、`B-history-profile-baseline` 目前是 review-only，避免把身份/女性互動 profile/白話欄位/君臣/陣營當永久關係。",
            "- 白話文只提供語意 sidecar；canonical 仍必須回到毛本文言 sourceRef gate。",
            "",
            "## Missing Coverage",
            "",
        ]
    )
    if not payload["missingCoverage"]:
        lines.append("- None")
    else:
        for item in payload["missingCoverage"][:30]:
            lines.append(f"- `{item.get('kind')}` {json.dumps(item, ensure_ascii=False)}")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    apply_stable_bootstrap_governance(args.governance_root)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)

    people = load_people(Path(args.generals), Path(args.manual_roster))
    name_index = build_name_index(people)
    alias_report = read_json(Path(args.alias_report)) if Path(args.alias_report).exists() else {}
    observed_summary = read_json(Path(args.observed_summary)) if Path(args.observed_summary).exists() else {}
    observed_mentions = load_observed_mentions(Path(args.observed_mentions))
    events_summary = read_json(Path(args.events_summary)) if Path(args.events_summary).exists() else {}
    manifest_path = Path(args.__dict__["8book_manifest"])
    white_manifest = read_json(manifest_path) if manifest_path.exists() else {}

    relationship_edges, missing_relationships = build_relationship_edges(name_index)
    seen_relationships = {edge_key(edge) for edge in relationship_edges}
    a_canon_edges, missing_claim_graph = load_a_canon_claim_edges(Path(args.relationship_claim_graph))
    for edge in a_canon_edges:
        upsert_a_canon_edge(relationship_edges, edge, seen_relationships)
    for edge in build_parent_summary_edges(people, name_index):
        add_edge(relationship_edges, edge, seen_relationships)
    for edge in build_history_profile_relationship_edges(people, name_index):
        add_edge(relationship_edges, edge, seen_relationships)
    event_location_seeds, missing_events = build_event_location_seeds(name_index)
    faction_timelines, missing_factions = build_faction_timeline(name_index)
    social_roles, missing_roles = build_social_roles(name_index)
    identity_seeds = build_identity_seeds(people)
    observed_general_stats = build_observed_general_stats(observed_mentions)
    basic_profile_seeds = build_basic_profile_seeds(people, observed_general_stats)
    female_priority_profiles = build_female_priority_profiles(people, name_index)
    auto_social_roles = build_auto_social_roles(people)
    plain_fact_proposals = build_plain_fact_proposals(people)
    plain_relationship_proposals = build_plain_relationship_proposals(people)
    alias_hints, missing_alias_hints = build_alias_hints(name_index, alias_report)

    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "inputs": {
            "generalsPath": args.generals,
            "manualRosterPath": args.manual_roster,
            "aliasReportPath": args.alias_report,
            "observedMentionsPath": args.observed_mentions,
            "observedSummaryPath": args.observed_summary,
            "eventsSummaryPath": args.events_summary,
            "relationshipClaimGraphPath": args.relationship_claim_graph,
        },
        "baseline": {
            "alias": {
                "totalGenerals": alias_report.get("totalGenerals"),
                "totalAliasEntries": alias_report.get("totalAliasEntries"),
                "highConfidenceAliasCount": alias_report.get("highConfidenceAliasCount"),
                "collisionCount": alias_report.get("collisionCount"),
            },
            "observed": {
                "totalMentions": observed_summary.get("totalMentions"),
                "resolvedMentionCount": observed_summary.get("resolvedMentionCount"),
                "unresolvedMentionCount": observed_summary.get("unresolvedMentionCount"),
                "reviewPendingMentionCount": observed_summary.get("reviewPendingMentionCount"),
            },
            "events": {
                "eventCount": events_summary.get("eventCount"),
                "readyEventCount": events_summary.get("readyEventCount"),
                "genericBattleCandidateCount": events_summary.get("genericBattleCandidateCount"),
                "femaleInteractionCandidateCount": events_summary.get("femaleInteractionCandidateCount"),
            },
        },
        "sourceCandidates": {
            "whiteTextManifestPath": str(manifest_path),
            "whiteTextSourceId": white_manifest.get("sourceId"),
            "whiteTextStatus": "manifest-only-no-fulltext-ingestion",
            "chapterCount": white_manifest.get("chapterCount"),
            "licenseNotes": white_manifest.get("licenseNotes") or [],
        },
        "identitySeeds": identity_seeds,
        "basicProfileSeeds": basic_profile_seeds,
        "femalePriorityProfiles": female_priority_profiles,
        "relationshipEdges": relationship_edges,
        "plainRelationshipProposals": plain_relationship_proposals,
        "eventLocationSeeds": event_location_seeds,
        "factionTimelines": faction_timelines,
        "socialRoleSeeds": social_roles,
        "autoSocialRoleSeeds": auto_social_roles,
        "plainFactProposals": plain_fact_proposals,
        "timeScopedAliasHints": alias_hints,
        "promotionPolicy": {
            "canHelpPromoteToA": [
                "candidate has allowed generalIds matching stable relationship edge endpoints",
                "candidate sourceRef chapter falls inside eventLocationSeed.chapterRange",
                "candidate location matches eventLocationSeed.locationNames",
                "candidate alias collision is resolved by timeScopedAliasHints chapterRange and coMentionIds",
            ],
            "mustRemainReviewOnly": [
                "relationship relies only on whiteText sidecar without Mao Hant sourceRef gate",
                "identitySeeds without a Mao Hant sourceRef gate",
                "basicProfileSeeds without a Mao Hant sourceRef gate",
                "femalePriorityProfiles without a Mao Hant sourceRef gate",
                "plainRelationshipProposals without a Mao Hant sourceRef gate",
                "ruler_subject or faction membership without chapter/event interval, except A-canon claim graph or curated hard baseline",
                "socialRoleSeeds or decisionWeightHints without a Mao Hant sourceRef gate",
                "autoSocialRoleSeeds or plainFactProposals without a Mao Hant sourceRef gate",
                "missing generalId coverage",
                "alias collision outside time-scoped hint range",
            ],
        },
        "missingCoverage": missing_relationships
        + missing_claim_graph
        + missing_events
        + missing_factions
        + missing_roles
        + missing_alias_hints,
    }
    payload["summary"] = summarize_counts(payload)

    write_json(output_root / "stable-knowledge-bootstrap.json", payload)
    (output_root / "stable-knowledge-bootstrap.md").write_text(render_markdown(payload), encoding="utf-8")
    print(f"[build_stable_knowledge_bootstrap] wrote {output_root / 'stable-knowledge-bootstrap.json'}")
    print(f"[build_stable_knowledge_bootstrap] wrote {output_root / 'stable-knowledge-bootstrap.md'}")
    print(
        "[build_stable_knowledge_bootstrap] "
        f"relationships={payload['summary']['relationshipEdgeCount']} "
        f"basicProfiles={payload['summary']['basicProfileSeedCount']} "
        f"plainRelationshipProposals={payload['summary']['plainRelationshipProposalCount']} "
        f"events={payload['summary']['eventLocationSeedCount']} "
        f"roles={payload['summary']['socialRoleSeedCount']} "
        f"missing={payload['summary']['missingCoverageCount']}"
    )


if __name__ == "__main__":
    main()
