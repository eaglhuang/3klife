from __future__ import annotations

import argparse
import glob
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from relationship_type_refinement import refine_relationship_type, relationship_type_family
from repo_layout import pipeline_config_path


def resolve_workspace_root(anchor_file: str | Path) -> Path:
    anchor = Path(anchor_file).resolve()
    start = anchor if anchor.is_dir() else anchor.parent
    for candidate in [start, *start.parents]:
        if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists():
            return candidate
    raise FileNotFoundError("Could not resolve workspace root")


REPO_ROOT = resolve_workspace_root(__file__)
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_ALIAS_MAP_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_STABLE_BOOTSTRAP_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json"
)
DEFAULT_SOURCE_CONFIG_PATH = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-claim-graph")
DEFAULT_RELATIONSHIP_EDGE_PATTERNS = [
    "artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl",
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/*staged-relationship-evidence.jsonl",
    "artifacts/data-pipeline/sanguo-rag/extracted/external-relationship-overlay/source-grounded-relationship-edges.external.jsonl",
    "local/codex-smoke/knowledge-growth/external-relationship-overlay/source-grounded-relationship-edges.external.jsonl",
]
DEFAULT_EXTERNAL_EVIDENCE_CARD_PATTERNS = [
    "artifacts/data-pipeline/sanguo-rag/extracted/external-evidence/**/external-evidence-cards.jsonl",
    "local/codex-smoke/knowledge-growth/**/external-evidence/external-evidence-cards.jsonl",
]

HISTORY_SOURCE_FAMILIES = {"sanguozhi", "houhanshu", "zizhitongjian"}
ROMANCE_SOURCE_FAMILIES = {"sanguoyanyi", "romance-mao-hant"}
PROMOTABLE_HISTORY_TYPES = {
    "alliance_oath",
    "betrayal_surrender",
    "enemy_rival",
    "mentor_student",
    "parent_child",
    "patron_client",
    "ruler_subject",
    "sibling",
    "spouse",
    "sworn_sibling",
}
STABLE_BASELINE_LAYERS = {"stable-bootstrap-seed"}
PROFILE_BASELINE_LAYERS = {"stable-history-profile-baseline", "generals-parent-summary"}
INTERNAL_ROMANCE_LAYERS = {"mao-hant-observed-mentions"}
EXTERNAL_HISTORY_LAYERS = {"external-history"}
EXTERNAL_ROMANCE_LAYERS = {"external-romance"}
A_HISTORY_GRADES = {"A-history", "A-history-cross-source"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build relationship claim graph with source family, quote, locator, hash, and promotion audit."
    )
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH))
    parser.add_argument("--alias-map", default=str(DEFAULT_ALIAS_MAP_PATH))
    parser.add_argument("--stable-bootstrap", default=str(DEFAULT_STABLE_BOOTSTRAP_PATH))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG_PATH))
    parser.add_argument("--relationship-edge", action="append", default=[])
    parser.add_argument("--relationship-edge-pattern", action="append", default=[])
    parser.add_argument("--external-evidence-card", action="append", default=[])
    parser.add_argument("--external-evidence-card-pattern", action="append", default=[])
    parser.add_argument("--no-default-external-evidence-cards", action="store_true")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1):
        text = line.strip()
        if not text:
            continue
        value = json.loads(text)
        if isinstance(value, dict):
            value.setdefault("_sourceFile", repo_relative(path))
            value.setdefault("_sourceLine", line_no)
            rows.append(value)
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    return len(rows)


def stable_hash(*parts: Any, length: int = 18) -> str:
    joined = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:length]


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or ""))


def relationship_pair_key(from_id: str, to_id: str) -> str:
    left = str(from_id or "").strip()
    right = str(to_id or "").strip()
    return "|".join(sorted((left, right))) if left and right else ""


def claim_key(row: dict[str, Any]) -> tuple[str, str, str, str]:
    refs = row.get("evidenceRefs") or []
    ref0 = str(refs[0] if refs else row.get("sourceEvidenceId") or row.get("sourceRef") or "")
    return (
        str(row.get("fromId") or ""),
        str(row.get("toId") or ""),
        str(row.get("type") or ""),
        ref0,
    )


def load_source_policy_index(path: Path) -> dict[str, dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    index: dict[str, dict[str, Any]] = {}
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            source_id = str(row.get("sourceId") or "").strip()
            if source_id:
                index[source_id] = row
    return index


def build_alias_index(generals_path: Path, alias_map_path: Path) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = defaultdict(list)
    for row in read_json(generals_path) or []:
        if not isinstance(row, dict):
            continue
        general_id = str(row.get("id") or row.get("generalId") or "").strip()
        if not general_id:
            continue
        values = [row.get("name"), *(row.get("alias") or [])]
        for value in values:
            text = str(value or "").strip()
            if len(text) >= 2 and text not in aliases[general_id]:
                aliases[general_id].append(text)

    payload = read_json(alias_map_path)
    entries = payload.get("entries") if isinstance(payload, dict) else []
    if isinstance(entries, list):
        for row in entries:
            if not isinstance(row, dict):
                continue
            alias = str(row.get("alias") or "").strip()
            general_ids = row.get("generalIds") or []
            if len(alias) < 2 or not isinstance(general_ids, list) or len(general_ids) != 1:
                continue
            general_id = str(general_ids[0] or "").strip()
            if general_id and alias not in aliases[general_id]:
                aliases[general_id].append(alias)

    return {key: sorted(set(values), key=lambda item: (-len(item), item)) for key, values in aliases.items()}


def text_mentions_general(text: str, general_id: str, alias_index: dict[str, list[str]]) -> bool:
    compact = compact_text(text)
    if not compact:
        return False
    for alias in alias_index.get(general_id, []):
        if alias and alias in compact:
            return True
    return False


def edge_text(edge: dict[str, Any]) -> str:
    parts = [
        edge.get("sourceQuote"),
        edge.get("quote"),
        edge.get("evidenceText"),
        edge.get("summary"),
        *(edge.get("sourceQuotes") or []),
    ]
    result: list[str] = []
    seen: set[str] = set()
    for part in parts:
        text = str(part or "").strip()
        key = compact_text(text)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(text)
    return "".join(result)


def edge_has_direct_pair_signal(edge: dict[str, Any], alias_index: dict[str, list[str]]) -> bool:
    from_id = str(edge.get("fromId") or "").strip()
    to_id = str(edge.get("toId") or "").strip()
    if not from_id or not to_id:
        return False
    text = edge_text(edge)
    return text_mentions_general(text, from_id, alias_index) and text_mentions_general(text, to_id, alias_index)


def edge_requires_pair_relation_cue(edge: dict[str, Any]) -> bool:
    return (
        str(edge.get("pattern") or "") == "external-relationship-card-gate"
        or str(edge.get("originalType") or "") == "relationship_external"
    )


def compact_aliases(general_id: str, alias_index: dict[str, list[str]]) -> list[str]:
    aliases = [compact_text(item) for item in alias_index.get(general_id, [])]
    return [item for item in aliases if len(item) >= 2]


def edge_has_pair_relation_cue(
    edge: dict[str, Any],
    alias_index: dict[str, list[str]],
    rel_type: str,
) -> bool:
    from_id = str(edge.get("fromId") or "").strip()
    to_id = str(edge.get("toId") or "").strip()
    text = compact_text(edge_text(edge))
    if not from_id or not to_id or not text:
        return False
    from_aliases = compact_aliases(from_id, alias_index)
    to_aliases = compact_aliases(to_id, alias_index)
    if not from_aliases or not to_aliases:
        return False

    type_cues = {
        "enemy_rival": r"(戰|攻|伐|討|拒|敗|破|敵|圍|殺|官度)",
        "alliance_oath": r"(盟|會盟|同盟|結盟|約)",
        "betrayal_surrender": r"(降|叛|背|歸|投)",
        "mentor_student": r"(師|教|授|學|問計)",
        "parent_child": r"(父|母|子|女|生|養)",
        "patron_client": r"(主公|麾下|部下|投|歸|事|仕|從)",
        "ruler_subject": r"(主公|麾下|部下|臣|將|令|命|遣|拜|使|從|事|仕|歸)",
        "sibling": r"(兄|弟|姊|妹)",
        "spouse": r"(妻|夫|婦|夫人|娶|嫁|婚)",
        "sworn_sibling": r"(結義|義兄|義弟|誓|拜)",
    }
    cue = re.compile(type_cues.get(rel_type, r"(與|及|同|共|和)"))
    connectors = ("與", "及", "同", "共", "和", "、")

    def positions(token: str) -> list[int]:
        result: list[int] = []
        start = 0
        while len(result) < 4:
            pos = text.find(token, start)
            if pos < 0:
                break
            result.append(pos)
            start = pos + max(len(token), 1)
        return result

    for left in from_aliases:
        left_positions = positions(left)
        if not left_positions:
            continue
        for right in to_aliases:
            right_positions = positions(right)
            if not right_positions:
                continue
            for left_pos in left_positions:
                for right_pos in right_positions:
                    pair_start = min(left_pos, right_pos)
                    pair_end = max(left_pos + len(left), right_pos + len(right))
                    if pair_end - pair_start > 32:
                        continue
                    window = text[max(0, pair_start - 6) : min(len(text), pair_end + 10)]
                    between = text[pair_start:pair_end]
                    has_connector = any(connector in between for connector in connectors)
                    cue_in_window = bool(cue.search(window))
                    cue_in_between = bool(cue.search(between))
                    if has_connector and cue_in_window:
                        return True
                    if rel_type == "enemy_rival" and cue_in_between:
                        return True
                    if rel_type in {"parent_child", "spouse", "sibling", "sworn_sibling"} and cue_in_window:
                        return True
    return False


def override_broad_type_from_pair_cue(
    edge: dict[str, Any],
    alias_index: dict[str, list[str]],
    refined_type: str,
) -> tuple[str, list[str]]:
    if refined_type not in {"mentor_student", "patron_client", "relationship_external", "ruler_subject"}:
        return refined_type, []
    if edge_has_pair_relation_cue(edge, alias_index, "enemy_rival"):
        return "enemy_rival", ["pair_relation_war_cue_override"]
    return refined_type, []


def has_quote_locator_hash(row: dict[str, Any]) -> bool:
    quote = str(row.get("quote") or row.get("sourceQuote") or row.get("evidenceText") or "").strip()
    return len(quote) >= 8 and bool(row.get("locator")) and bool(row.get("textHash"))


def source_profile(edge: dict[str, Any], source_policy_index: dict[str, dict[str, Any]]) -> dict[str, str]:
    source_policy_id = str(edge.get("sourcePolicyId") or edge.get("sourceId") or "").strip()
    policy = source_policy_index.get(source_policy_id, {})
    raw_layer = str(edge.get("sourceLayerRaw") or policy.get("sourceLayer") or "").strip()
    source_layer = str(edge.get("sourceLayer") or "").strip()
    source_family = str(edge.get("sourceFamily") or policy.get("sourceFamily") or "").strip()
    trust_tier = str(edge.get("trustTier") or policy.get("trustTier") or "").strip()
    source_class = str(edge.get("sourceClass") or policy.get("sourceClass") or "").strip()

    if source_layer in STABLE_BASELINE_LAYERS:
        source_family = source_family or "stable-bootstrap"
        raw_layer = raw_layer or "baseline"
        trust_tier = trust_tier or "local-curated"
        source_class = source_class or "curated-baseline"
    elif source_layer in PROFILE_BASELINE_LAYERS:
        source_family = source_family or "structured-profile"
        raw_layer = raw_layer or "profile"
        trust_tier = trust_tier or "local-profile"
        source_class = source_class or "structured-profile"
    elif source_layer in INTERNAL_ROMANCE_LAYERS:
        source_family = source_family or "romance-mao-hant"
        raw_layer = raw_layer or "romance"
        trust_tier = trust_tier or "primary-text-transcription"
        source_class = source_class or "internal-primary-text"
    elif source_layer.startswith("external-") and raw_layer:
        source_family = source_family or str(policy.get("sourceFamily") or raw_layer)

    return {
        "sourcePolicyId": source_policy_id,
        "sourceLayer": source_layer,
        "sourceLayerRaw": raw_layer,
        "sourceFamily": source_family,
        "trustTier": trust_tier,
        "sourceClass": source_class,
    }


def grade_claim(
    edge: dict[str, Any],
    profile: dict[str, str],
    direct_pair: bool,
    pair_relation: bool,
    pair_relation_required: bool,
) -> tuple[str, list[str]]:
    trace: list[str] = []
    source_layer = profile["sourceLayer"]
    raw_layer = profile["sourceLayerRaw"]
    source_family = profile["sourceFamily"]
    refined_type = str(edge.get("type") or "")
    confidence_signals = {str(item) for item in (edge.get("confidenceSignals") or [])}
    cross_families = {str(item) for item in (edge.get("crossSiteSourceFamilies") or []) if str(item).strip()}
    quote_locator_hash = has_quote_locator_hash(edge)

    if source_layer in STABLE_BASELINE_LAYERS:
        trace.append("local-curated-stable-baseline")
        return "A-baseline", trace
    if source_layer in PROFILE_BASELINE_LAYERS:
        trace.append("structured-profile-only")
        return "B-history-profile-baseline", trace

    is_primary_history = source_family in HISTORY_SOURCE_FAMILIES
    is_history = raw_layer == "history" or is_primary_history
    is_romance = raw_layer == "romance" or source_family in ROMANCE_SOURCE_FAMILIES or source_layer in INTERNAL_ROMANCE_LAYERS
    if not direct_pair:
        trace.append("missing-direct-pair-signal")
        if is_history:
            return "C-history-needs-review", trace
        if is_romance:
            return "C-romance-needs-review", trace
        return "C-needs-review", trace

    trace.append("direct-pair-signal")
    if pair_relation_required:
        if pair_relation:
            trace.append("pair-relation-cue")
        else:
            trace.append("missing-pair-relation-cue")
    if is_history:
        if quote_locator_hash:
            trace.append("quote-locator-hash")
        if "cross-source" in confidence_signals or len(cross_families) >= 2:
            trace.append("cross-family-history")
        if is_primary_history and refined_type in PROMOTABLE_HISTORY_TYPES and quote_locator_hash and (
            "cross-source" in confidence_signals or "internal-external" in confidence_signals or len(cross_families) >= 2
        ) and (not pair_relation_required or pair_relation):
            return "A-history", trace
        return "B-history", trace

    if is_romance:
        if quote_locator_hash:
            trace.append("quote-locator-hash")
            return "A-romance", trace
        return "B-romance", trace

    return "B-secondary", trace


def normalize_edge_to_claim(
    edge: dict[str, Any],
    *,
    alias_index: dict[str, list[str]],
    source_policy_index: dict[str, dict[str, Any]],
    external_card_index: dict[tuple[str, str], dict[str, Any]],
    source_file: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    from_id = str(edge.get("fromId") or "").strip()
    to_id = str(edge.get("toId") or "").strip()
    if not from_id or not to_id or from_id == to_id:
        return None, {"reason": "invalid-endpoints", "edge": edge}

    normalized = enrich_edge_from_external_card(edge, external_card_index)
    refined_type, refinement_reasons = refine_relationship_type(normalized, edge_text(normalized))
    refined_type, override_reasons = override_broad_type_from_pair_cue(normalized, alias_index, refined_type)
    normalized["type"] = refined_type
    normalized["refinementReasons"] = list(
        dict.fromkeys([*(edge.get("refinementReasons") or []), *refinement_reasons, *override_reasons])
    )
    profile = source_profile(normalized, source_policy_index)
    direct_pair = edge_has_direct_pair_signal(normalized, alias_index)
    pair_relation_required = edge_requires_pair_relation_cue(normalized)
    pair_relation = True
    if pair_relation_required:
        pair_relation = edge_has_pair_relation_cue(normalized, alias_index, refined_type)
    if profile["sourceLayer"] in STABLE_BASELINE_LAYERS:
        direct_pair = True
        pair_relation = True
        pair_relation_required = False
    claim_grade, promotion_trace = grade_claim(
        normalized,
        profile,
        direct_pair,
        pair_relation,
        pair_relation_required,
    )

    if claim_grade.startswith("C-"):
        return None, {
            "reason": claim_grade,
            "fromId": from_id,
            "toId": to_id,
            "type": refined_type,
            "sourceFile": source_file,
            "evidenceRefs": list(normalized.get("evidenceRefs") or []),
            "sourceLayer": profile["sourceLayer"],
            "sourceFamily": profile["sourceFamily"],
            "promotionTrace": promotion_trace,
            "directPairSignal": direct_pair,
            "pairRelationSignal": pair_relation,
            "pairRelationRequired": pair_relation_required,
        }

    quote = str(normalized.get("quote") or normalized.get("sourceQuote") or normalized.get("evidenceText") or "").strip()
    evidence_refs = [str(item) for item in (normalized.get("evidenceRefs") or []) if str(item).strip()]
    claim_id = "relclaim." + stable_hash(
        from_id,
        to_id,
        refined_type,
        "|".join(evidence_refs),
        profile["sourcePolicyId"],
        normalized.get("sourceEvidenceId"),
    )
    claim = {
        "claimId": claim_id,
        "fromId": from_id,
        "toId": to_id,
        "type": refined_type,
        "typeFamily": relationship_type_family(refined_type),
        "claimGrade": claim_grade,
        "claimLayer": "history" if claim_grade.endswith("history") or "history" in claim_grade else "relationship",
        "directPairSignal": direct_pair,
        "pairRelationSignal": pair_relation,
        "pairRelationRequired": pair_relation_required,
        "sourcePolicyId": profile["sourcePolicyId"],
        "sourceEvidenceId": normalized.get("sourceEvidenceId") or normalized.get("evidenceId"),
        "sourceFamily": profile["sourceFamily"],
        "sourceLayer": profile["sourceLayer"],
        "sourceLayerRaw": profile["sourceLayerRaw"],
        "sourceClass": profile["sourceClass"],
        "trustTier": profile["trustTier"],
        "sourceClaimType": normalized.get("sourceClaimType"),
        "sourceClaimScopes": list(normalized.get("sourceClaimScopes") or []),
        "quote": quote[:260],
        "locator": normalized.get("locator"),
        "textHash": normalized.get("textHash"),
        "evidenceRefs": evidence_refs,
        "chapterNo": normalized.get("chapterNo"),
        "edgeConfidence": normalized.get("edgeConfidence") or normalized.get("confidence") or 0.0,
        "edgeStrength": normalized.get("edgeStrength"),
        "confidenceSignals": list(normalized.get("confidenceSignals") or []),
        "promotionTrace": promotion_trace,
        "refinementReasons": normalized["refinementReasons"],
        "sourceFile": source_file,
        "canonicalWrites": False,
    }
    return claim, None


def dedupe_claims(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    grade_rank = {
        "A-history": 90,
        "A-history-cross-source": 90,
        "A-baseline": 80,
        "A-romance": 70,
        "B-history": 60,
        "B-history-profile-baseline": 45,
        "B-romance": 40,
        "B-secondary": 30,
    }
    for row in rows:
        key = claim_key(row)
        existing = by_key.get(key)
        if existing is None:
            by_key[key] = row
            continue
        current_rank = grade_rank.get(str(row.get("claimGrade") or ""), 0)
        existing_rank = grade_rank.get(str(existing.get("claimGrade") or ""), 0)
        if (current_rank, float(row.get("edgeConfidence") or 0.0)) > (
            existing_rank,
            float(existing.get("edgeConfidence") or 0.0),
        ):
            by_key[key] = row
    rows = list(by_key.values())
    rows.sort(
        key=lambda row: (
            str(row.get("fromId") or ""),
            str(row.get("toId") or ""),
            str(row.get("type") or ""),
            str(row.get("claimGrade") or ""),
            str(row.get("claimId") or ""),
        )
    )
    return rows


def detect_conflicts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    conflicts: list[dict[str, Any]] = []
    by_pair: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = relationship_pair_key(str(row.get("fromId") or ""), str(row.get("toId") or ""))
        if key:
            by_pair[key].append(row)

    for pair_key, pair_rows in by_pair.items():
        strong_rows = [row for row in pair_rows if str(row.get("claimGrade") or "") in A_HISTORY_GRADES or row.get("claimGrade") == "A-baseline"]
        if not strong_rows:
            continue
        strong_families = {str(row.get("typeFamily") or "") for row in strong_rows}
        for row in pair_rows:
            if row in strong_rows:
                continue
            family = str(row.get("typeFamily") or "")
            if family and strong_families and family not in strong_families:
                conflicts.append(
                    {
                        "pairKey": pair_key,
                        "strongClaimIds": [item.get("claimId") for item in strong_rows],
                        "conflictingClaimId": row.get("claimId"),
                        "conflictingGrade": row.get("claimGrade"),
                        "conflictingType": row.get("type"),
                        "reason": "type-family-conflicts-with-strong-claim",
                    }
                )
    return conflicts


def default_relationship_edge_paths(extra_patterns: list[str], extra_paths: list[str]) -> list[Path]:
    paths: list[Path] = []
    for pattern in [*DEFAULT_RELATIONSHIP_EDGE_PATTERNS, *extra_patterns]:
        absolute_pattern = str(resolve_path(pattern))
        for match in glob.glob(absolute_pattern):
            path = Path(match)
            if path.is_file():
                paths.append(path)
    for path_text in extra_paths:
        path = resolve_path(path_text)
        if path.is_file():
            paths.append(path)
    deduped: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(path)
    return deduped


def default_external_evidence_card_paths(
    extra_patterns: list[str],
    extra_paths: list[str],
    *,
    include_defaults: bool,
) -> list[Path]:
    paths: list[Path] = []
    patterns = [*DEFAULT_EXTERNAL_EVIDENCE_CARD_PATTERNS, *extra_patterns] if include_defaults else list(extra_patterns)
    for pattern in patterns:
        absolute_pattern = str(resolve_path(pattern))
        for match in glob.glob(absolute_pattern, recursive=True):
            path = Path(match)
            if path.is_file():
                paths.append(path)
    for path_text in extra_paths:
        path = resolve_path(path_text)
        if path.is_file():
            paths.append(path)
    deduped: list[Path] = []
    seen: set[str] = set()
    for path in sorted(paths, key=lambda item: str(item).lower()):
        key = str(path.resolve()).lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(path)
    return deduped


def external_card_key(source_policy_id: Any, evidence_id: Any) -> tuple[str, str] | None:
    source_id = str(source_policy_id or "").strip()
    evidence = str(evidence_id or "").strip()
    if not source_id or not evidence:
        return None
    return source_id, evidence


def external_ref_key(ref: Any) -> tuple[str, str] | None:
    text = str(ref or "").strip()
    if not text.startswith("ext-card:"):
        return None
    parts = text.split(":", 2)
    if len(parts) != 3:
        return None
    return external_card_key(parts[1], parts[2])


def card_quality_score(card: dict[str, Any]) -> tuple[int, int, str]:
    quote = str(card.get("quote") or card.get("translatedTraditionalText") or "").strip()
    score = 0
    if card.get("locator"):
        score += 30
    if card.get("textHash"):
        score += 30
    if len(quote) >= 8:
        score += 20
    if card.get("url"):
        score += 10
    if card.get("pageTitle"):
        score += 5
    if card.get("sourceFamily"):
        score += 5
    return score, min(len(quote), 500), str(card.get("_sourceFile") or "")


def load_external_evidence_card_index(paths: list[Path]) -> dict[tuple[str, str], dict[str, Any]]:
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for path in paths:
        for card in read_jsonl(path):
            if not isinstance(card, dict):
                continue
            evidence_id = str(card.get("evidenceId") or "").strip()
            if not evidence_id:
                continue
            source_ids = [
                str(card.get("sourcePolicyId") or "").strip(),
                str(card.get("sourceId") or "").strip(),
            ]
            for source_id in source_ids:
                key = external_card_key(source_id, evidence_id)
                if not key:
                    continue
                existing = index.get(key)
                if existing is None or card_quality_score(card) > card_quality_score(existing):
                    index[key] = card
    return index


def lookup_external_card(edge: dict[str, Any], index: dict[tuple[str, str], dict[str, Any]]) -> dict[str, Any] | None:
    source_id = str(edge.get("sourcePolicyId") or edge.get("sourceId") or "").strip()
    evidence_id = str(edge.get("sourceEvidenceId") or edge.get("evidenceId") or "").strip()
    key = external_card_key(source_id, evidence_id)
    if key and key in index:
        return index[key]
    for ref in edge.get("evidenceRefs") or []:
        key = external_ref_key(ref)
        if key and key in index:
            return index[key]
    return None


def enrich_edge_from_external_card(
    edge: dict[str, Any],
    card_index: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    card = lookup_external_card(edge, card_index)
    if not card:
        return edge
    enriched = dict(edge)
    field_map = {
        "locator": "locator",
        "textHash": "textHash",
        "url": "url",
        "pageTitle": "pageTitle",
        "sourceFamily": "sourceFamily",
        "sourceClass": "sourceClass",
        "trustTier": "trustTier",
        "sourcePolicyId": "sourcePolicyId",
        "sourceEvidenceId": "evidenceId",
    }
    for edge_field, card_field in field_map.items():
        if not enriched.get(edge_field) and card.get(card_field):
            enriched[edge_field] = card.get(card_field)
    if not enriched.get("sourceLayerRaw") and card.get("sourceLayer"):
        enriched["sourceLayerRaw"] = card.get("sourceLayer")
    if card.get("claimType"):
        enriched.setdefault("sourceClaimType", card.get("claimType"))
    if card.get("claimScopes"):
        enriched.setdefault("sourceClaimScopes", list(card.get("claimScopes") or []))
    if not enriched.get("quote") and not enriched.get("sourceQuote"):
        quote = str(card.get("quote") or card.get("translatedTraditionalText") or "").strip()
        if quote:
            enriched["sourceQuote"] = quote
    if card.get("_sourceFile"):
        enriched["sourceCardFile"] = card.get("_sourceFile")
    return enriched


def can_promote_cross_source(row: dict[str, Any]) -> bool:
    grade = str(row.get("claimGrade") or "")
    source_family = str(row.get("sourceFamily") or "")
    rel_type = str(row.get("type") or "")
    return (
        grade == "B-history"
        and source_family in HISTORY_SOURCE_FAMILIES
        and rel_type in PROMOTABLE_HISTORY_TYPES
        and bool(row.get("directPairSignal"))
        and (not row.get("pairRelationRequired") or bool(row.get("pairRelationSignal")))
        and has_quote_locator_hash(row)
    )


def promote_cross_source_history_claims(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_group: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if not can_promote_cross_source(row):
            continue
        key = (
            str(row.get("fromId") or ""),
            str(row.get("toId") or ""),
            str(row.get("type") or ""),
        )
        by_group[key].append(row)

    promoted_ids: set[str] = set()
    promotions: list[dict[str, Any]] = []
    for key, group_rows in by_group.items():
        families = sorted({str(row.get("sourceFamily") or "") for row in group_rows if row.get("sourceFamily")})
        if len(families) < 2:
            continue
        claim_ids = [str(row.get("claimId") or "") for row in group_rows if row.get("claimId")]
        for row in group_rows:
            promoted_ids.add(str(row.get("claimId") or ""))
        promotions.append(
            {
                "groupKey": "|".join(key),
                "sourceFamilies": families,
                "claimIds": claim_ids,
            }
        )

    if not promoted_ids:
        return rows, promotions

    result: list[dict[str, Any]] = []
    for row in rows:
        claim_id = str(row.get("claimId") or "")
        if claim_id not in promoted_ids:
            result.append(row)
            continue
        updated = dict(row)
        group_key = (
            str(row.get("fromId") or ""),
            str(row.get("toId") or ""),
            str(row.get("type") or ""),
        )
        peers = by_group.get(group_key, [])
        families = sorted({str(peer.get("sourceFamily") or "") for peer in peers if peer.get("sourceFamily")})
        updated["claimGrade"] = "A-history-cross-source"
        updated["claimLayer"] = "history"
        updated["crossSourceFamilies"] = families
        updated["promotionPeerClaimIds"] = [
            str(peer.get("claimId") or "") for peer in peers if str(peer.get("claimId") or "") != claim_id
        ]
        trace = list(updated.get("promotionTrace") or [])
        trace.append("cross-source-history-promotion:" + ",".join(families))
        updated["promotionTrace"] = list(dict.fromkeys(trace))
        updated["edgeConfidence"] = round(max(float(updated.get("edgeConfidence") or 0.0), 0.9), 2)
        result.append(updated)
    return result, promotions


def stable_relationship_edges(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("relationshipEdges") if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        return []
    result: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        if str(row.get("sourceLayer") or "") not in STABLE_BASELINE_LAYERS:
            continue
        item = dict(row)
        item.setdefault("_sourceFile", repo_relative(path))
        result.append(item)
    return result


def render_markdown(summary: dict[str, Any], conflicts: list[dict[str, Any]]) -> str:
    lines = [
        "# Relationship Claim Graph Audit",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Claim Count: `{summary['metrics']['claimCount']}`",
        f"- A-History Claim Count: `{summary['metrics']['aHistoryClaimCount']}`",
        f"- A-Baseline Claim Count: `{summary['metrics']['aBaselineClaimCount']}`",
        f"- Cross-Source Promotion Count: `{summary['metrics']['crossSourcePromotionCount']}`",
        f"- Rejected Count: `{summary['metrics']['rejectedCount']}`",
        f"- Conflict Count: `{summary['metrics']['conflictCount']}`",
        "",
        "## Grade Counts",
        "",
    ]
    for key, value in summary["metrics"]["claimGradeCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Families", ""])
    for key, value in summary["metrics"]["sourceFamilyCounts"].items():
        lines.append(f"- `{key or 'unknown'}`: `{value}`")
    lines.extend(["", "## Inputs", ""])
    for path in summary["inputs"]["relationshipEdgePaths"]:
        lines.append(f"- `{path}`")
    if summary["inputs"].get("externalEvidenceCardPaths"):
        lines.extend(["", "## External Evidence Cards", ""])
        lines.append(f"- File Count: `{summary['metrics']['externalEvidenceCardFileCount']}`")
        lines.append(f"- Indexed Key Count: `{summary['metrics']['externalEvidenceCardKeyCount']}`")
        for path in summary["inputs"]["externalEvidenceCardPaths"][:40]:
            lines.append(f"- `{path}`")
        remaining = len(summary["inputs"]["externalEvidenceCardPaths"]) - 40
        if remaining > 0:
            lines.append(f"- `... {remaining} more`")
    lines.extend(["", "## Policy", ""])
    lines.append("- `A-history` requires a primary history source family, direct pair signal, quote, locator, textHash, and cross/internal trust signal.")
    lines.append("- `A-history-cross-source` requires the same ordered pair and refined relationship type from at least two history source families.")
    lines.append("- Profile-derived relationship baselines stay `B-history-profile-baseline`; they are not treated as final source truth.")
    lines.append("- Local curated hard relationships stay `A-baseline` until an external history claim with locator/hash confirms them.")
    if conflicts:
        lines.extend(["", "## Conflicts", ""])
        for item in conflicts[:80]:
            lines.append(
                f"- `{item['pairKey']}`: `{item['conflictingClaimId']}` conflicts with `{', '.join(item['strongClaimIds'])}`"
            )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise FileExistsError(f"output already exists: {repo_relative(output_root)}")
    output_root.mkdir(parents=True, exist_ok=True)

    alias_index = build_alias_index(resolve_path(args.generals), resolve_path(args.alias_map))
    source_policy_index = load_source_policy_index(resolve_path(args.source_config))
    relationship_paths = default_relationship_edge_paths(args.relationship_edge_pattern, args.relationship_edge)
    external_card_paths = default_external_evidence_card_paths(
        args.external_evidence_card_pattern,
        args.external_evidence_card,
        include_defaults=not args.no_default_external_evidence_cards,
    )
    external_card_index = load_external_evidence_card_index(external_card_paths)

    raw_edges: list[dict[str, Any]] = []
    stable_path = resolve_path(args.stable_bootstrap)
    raw_edges.extend(stable_relationship_edges(stable_path))
    for path in relationship_paths:
        raw_edges.extend(read_jsonl(path))

    claims: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for edge in raw_edges:
        source_file = str(edge.get("_sourceFile") or "unknown")
        claim, reject = normalize_edge_to_claim(
            edge,
            alias_index=alias_index,
            source_policy_index=source_policy_index,
            external_card_index=external_card_index,
            source_file=source_file,
        )
        if claim:
            claims.append(claim)
        if reject:
            rejected.append(reject)

    claims = dedupe_claims(claims)
    claims, cross_source_promotions = promote_cross_source_history_claims(claims)
    conflicts = detect_conflicts(claims)
    a_history = [row for row in claims if str(row.get("claimGrade") or "") in A_HISTORY_GRADES]
    a_baseline = [row for row in claims if row.get("claimGrade") == "A-baseline"]
    romance = [row for row in claims if "romance" in str(row.get("claimGrade") or "")]

    claim_grade_counts = Counter(str(row.get("claimGrade") or "unknown") for row in claims)
    source_family_counts = Counter(str(row.get("sourceFamily") or "") for row in claims)
    source_layer_counts = Counter(str(row.get("sourceLayer") or "") for row in claims)
    type_counts = Counter(str(row.get("type") or "") for row in claims)
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "relationship-claim-graph",
        "canonicalWrites": False,
        "inputs": {
            "generalsPath": repo_relative(resolve_path(args.generals)),
            "aliasMapPath": repo_relative(resolve_path(args.alias_map)),
            "stableBootstrapPath": repo_relative(stable_path),
            "sourceConfigPath": repo_relative(resolve_path(args.source_config)),
            "relationshipEdgePaths": [repo_relative(path) for path in relationship_paths],
            "externalEvidenceCardPaths": [repo_relative(path) for path in external_card_paths],
        },
        "outputs": {
            "relationshipClaims": repo_relative(output_root / "relationship-claims.jsonl"),
            "aHistoryRelationshipClaims": repo_relative(output_root / "a-history-relationship-claims.jsonl"),
            "aBaselineRelationshipClaims": repo_relative(output_root / "a-baseline-relationship-claims.jsonl"),
            "romanceRelationshipClaims": repo_relative(output_root / "romance-relationship-claims.jsonl"),
            "rejectedRelationshipClaims": repo_relative(output_root / "rejected-relationship-claims.jsonl"),
            "summary": repo_relative(output_root / "relationship-claim-summary.json"),
            "audit": repo_relative(output_root / "relationship-claim-audit.md"),
        },
        "metrics": {
            "rawEdgeCount": len(raw_edges),
            "externalEvidenceCardFileCount": len(external_card_paths),
            "externalEvidenceCardKeyCount": len(external_card_index),
            "claimCount": len(claims),
            "aHistoryClaimCount": len(a_history),
            "aBaselineClaimCount": len(a_baseline),
            "romanceClaimCount": len(romance),
            "rejectedCount": len(rejected),
            "conflictCount": len(conflicts),
            "crossSourcePromotionCount": len(cross_source_promotions),
            "claimGradeCounts": dict(sorted(claim_grade_counts.items())),
            "sourceFamilyCounts": dict(sorted(source_family_counts.items())),
            "sourceLayerCounts": dict(sorted(source_layer_counts.items())),
            "relationshipTypeCounts": dict(sorted(type_counts.items())),
        },
        "policy": {
            "aHistoryRule": "primary history source family + directPair + quote + locator + textHash + cross/internal trust signal; or strict same pair/type confirmed by two history source families",
            "profileBaselineRule": "profile-derived rows stay B-history-profile-baseline and are not consumed as final relationship truth",
            "stableBootstrapRule": "curated hard rows stay A-baseline until external history confirms them",
        },
        "crossSourcePromotions": cross_source_promotions[:250],
        "conflicts": conflicts[:250],
    }

    write_jsonl(output_root / "relationship-claims.jsonl", claims)
    write_jsonl(output_root / "a-history-relationship-claims.jsonl", a_history)
    write_jsonl(output_root / "a-baseline-relationship-claims.jsonl", a_baseline)
    write_jsonl(output_root / "romance-relationship-claims.jsonl", romance)
    write_jsonl(output_root / "rejected-relationship-claims.jsonl", rejected)
    write_json(output_root / "relationship-claim-summary.json", summary)
    (output_root / "relationship-claim-audit.md").write_text(render_markdown(summary, conflicts), encoding="utf-8")

    print(f"[build_relationship_claim_graph] wrote {output_root / 'relationship-claims.jsonl'}")
    print(f"[build_relationship_claim_graph] wrote {output_root / 'a-history-relationship-claims.jsonl'}")
    print(
        "[build_relationship_claim_graph] "
        f"claims={len(claims)} aHistory={len(a_history)} aBaseline={len(a_baseline)} rejected={len(rejected)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
