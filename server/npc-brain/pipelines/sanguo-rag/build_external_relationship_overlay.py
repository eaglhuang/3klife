from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from relationship_type_refinement import refine_relationship_type
from repo_layout import pipeline_config_path, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-relationship-overlay")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
ALLOWED_SOURCE_LAYERS = {"history", "romance", "encyclopedia", "worldbuilding", "folklore"}
PRIMARY_TEXT_SOURCE_CLASSES = {"primary-text-site"}
PRIMARY_TEXT_TRUST_TIERS = {"primary-text", "primary-text-transcription"}
LAYER_PRIMARY_TEXT_CAP_MULTIPLIER = {
    "history": 1.75,
    "romance": 1.50,
}
LAYER_BASE_CONFIDENCE = {
    "history": 0.80,
    "romance": 0.74,
    "encyclopedia": 0.60,
    "worldbuilding": 0.56,
    "folklore": 0.54,
}
LAYER_MAX_CONFIDENCE = {
    "history": 0.88,
    "romance": 0.82,
    "encyclopedia": 0.70,
    "worldbuilding": 0.64,
    "folklore": 0.62,
}
LAYER_SOURCE_EDGE_CAP = {
    "history": 320,
    "romance": 260,
    "encyclopedia": 140,
    "worldbuilding": 90,
    "folklore": 70,
}
ALLOWED_REPARSE_CLAIM_TYPES = {
    "event",
    "title",
    "trait",
    "activity",
    "habit",
    "role",
    "dialogue_seed",
    "worldbuilding_note",
    "source_conflict",
}
RELATIONSHIP_REPARSE_CUE_TERMS = [
    "妻",
    "夫",
    "嫁",
    "娶",
    "父",
    "母",
    "子",
    "女",
    "兄",
    "弟",
    "姊",
    "妹",
    "師",
    "徒",
    "主",
    "臣",
    "將",
    "令",
    "命",
    "敵",
    "仇",
    "戰",
    "攻",
    "殺",
    "盟",
    "誓",
    "同盟",
    "投降",
    "背叛",
    "降",
    "薦",
    "拜",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    search_roots = [REPO_ROOT, REPO_ROOT.parent, REPO_ROOT.parent.parent]
    for root in search_roots:
        candidate = (root / path).resolve()
        if candidate.exists():
            return candidate
    return (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_source_policy_index(path: Path) -> dict[str, dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    index: dict[str, dict[str, Any]] = {}
    if not isinstance(rows, list):
        return index
    for row in rows:
        if not isinstance(row, dict):
            continue
        source_id = str(row.get("sourceId") or "").strip()
        if source_id:
            index[source_id] = row
    return index


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
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    return len(rows)


def parse_chapter_no(locator: str, source_refs: list[str]) -> int | None:
    for text in [locator, *(source_refs or [])]:
        value = str(text or "").strip()
        if not value:
            continue
        match = re.search(r"(\d{1,3})#p\d+", value)
        if match:
            return int(match.group(1))
        match = re.search(r"(?:第)?(\d{1,3})(?:回|章)", value)
        if match:
            return int(match.group(1))
    return None


def load_alias_mapping(path: Path) -> list[tuple[str, str]]:
    payload = read_json(path)
    entries = payload.get("entries") if isinstance(payload, dict) else []
    pairs: list[tuple[str, str]] = []
    if not isinstance(entries, list):
        return pairs
    for row in entries:
        if not isinstance(row, dict):
            continue
        alias = str(row.get("alias") or "").strip()
        if len(alias) < 2:
            continue
        general_ids = row.get("generalIds") or []
        if not isinstance(general_ids, list) or len(general_ids) != 1:
            continue
        general_id = str(general_ids[0] or "").strip()
        if not general_id:
            continue
        status = str(row.get("status") or "").strip()
        if status not in {"high-confidence", "medium-confidence"}:
            continue
        review_status_by_general = row.get("reviewStatusByGeneral") if isinstance(row.get("reviewStatusByGeneral"), dict) else {}
        review_status = str(review_status_by_general.get(general_id) or "")
        if review_status and review_status not in {"accepted", "auto-accepted"}:
            continue
        pairs.append((alias, general_id))
    pairs.sort(key=lambda item: (-len(item[0]), item[0]))
    return pairs


def stable_hash(*parts: Any, length: int = 16) -> str:
    joined = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:length]


def find_participants(text: str, alias_pairs: list[tuple[str, str]], max_people: int) -> list[str]:
    compact = re.sub(r"\s+", "", text or "")
    hits: list[tuple[int, str]] = []
    for alias, general_id in alias_pairs:
        pos = compact.find(alias)
        if pos < 0:
            continue
        hits.append((pos, general_id))
    hits.sort(key=lambda item: (item[0], item[1]))
    result: list[str] = []
    for _pos, general_id in hits:
        if general_id not in result:
            result.append(general_id)
        if len(result) >= max(max_people, 2):
            break
    return result


def normalize_partner_token(token: str) -> str:
    text = re.sub(r"[^\u4e00-\u9fff·]", "", str(token or ""))
    for prefix in ("曹魏", "蜀漢", "孫吳", "東吳", "西晉"):
        if text.startswith(prefix) and len(text) > len(prefix):
            text = text[len(prefix) :]
            break
    if len(text) < 2 or len(text) > 8:
        return ""
    return text


def infer_partner_ids_from_quote(
    quote: str,
    *,
    alias_pairs: list[tuple[str, str]],
    existing_people: set[str],
    max_new_people: int,
) -> list[str]:
    compact = re.sub(r"\s+", "", quote or "")
    if not compact:
        return []
    alias_map: dict[str, str] = {}
    for alias, general_id in alias_pairs:
        if alias not in alias_map:
            alias_map[alias] = general_id
    patterns = [
        r"嫁(?P<name>[\u4e00-\u9fff·]{2,8})",
        r"(?P<name>[\u4e00-\u9fff·]{2,8})之(?:女|子|妻|夫|母|父|兄|弟)",
        r"與(?P<name>[\u4e00-\u9fff·]{2,8})(?:婚|為婚|結婚)",
    ]
    inferred: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, compact):
            token = normalize_partner_token(match.group("name"))
            if not token:
                continue
            partner_id = alias_map.get(token)
            if not partner_id:
                partner_id = f"shadow:relationship-hint:{token}:{stable_hash(token)}"
            if partner_id in existing_people or partner_id in inferred:
                continue
            inferred.append(partner_id)
            if len(inferred) >= max(max_new_people, 1):
                return inferred
    return inferred


def list_like_text(text: str, participant_count: int) -> bool:
    compact = str(text or "")
    delimiter_count = compact.count("、") + compact.count("，") + compact.count(",") + compact.count("・") + compact.count("/")
    return participant_count >= 5 or delimiter_count >= 8


def base_confidence_for_layer(source_layer: str) -> float:
    layer = source_layer.lower().strip()
    return float(LAYER_BASE_CONFIDENCE.get(layer, 0.58))


def max_confidence_for_layer(source_layer: str) -> float:
    layer = source_layer.lower().strip()
    return float(LAYER_MAX_CONFIDENCE.get(layer, 0.66))


def source_edge_cap_for_layer(source_layer: str) -> int:
    layer = source_layer.lower().strip()
    return int(LAYER_SOURCE_EDGE_CAP.get(layer, 100))


def source_edge_cap_for_profile(
    *,
    source_layer: str,
    source_class: str,
    trust_tier: str,
) -> int:
    layer = source_layer.lower().strip()
    base_cap = max(source_edge_cap_for_layer(layer), 1)
    normalized_class = source_class.lower().strip()
    normalized_tier = trust_tier.lower().strip()
    is_primary_text = normalized_class in PRIMARY_TEXT_SOURCE_CLASSES or normalized_tier in PRIMARY_TEXT_TRUST_TIERS
    multiplier = LAYER_PRIMARY_TEXT_CAP_MULTIPLIER.get(layer, 1.0)
    if is_primary_text and multiplier > 1.0:
        base_cap = int(round(base_cap * multiplier))
    return max(base_cap, 1)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def edge_pair_key(from_id: str, to_id: str) -> str:
    left = str(from_id or "").strip()
    right = str(to_id or "").strip()
    if not left or not right:
        return ""
    return "|".join(sorted((left, right)))


def load_internal_pair_keys(paths: list[Path]) -> set[str]:
    keys: set[str] = set()
    for path in paths:
        for row in read_jsonl(path):
            from_id = str(row.get("fromId") or "").strip()
            to_id = str(row.get("toId") or "").strip()
            key = edge_pair_key(from_id, to_id)
            if key:
                keys.add(key)
    return keys


def cross_family_count(card: dict[str, Any]) -> int:
    families = {str(item or "").strip() for item in (card.get("crossSiteSourceFamilies") or [])}
    families.discard("")
    return len(families)


def has_quote_locator_hash(card: dict[str, Any]) -> bool:
    quote = str(card.get("quote") or card.get("translatedTraditionalText") or "").strip()
    return len(quote) >= 8 and bool(card.get("locator")) and bool(card.get("textHash"))


def cross_family_gate(
    card: dict[str, Any],
    *,
    min_cross_family: int,
    min_cross_family_non_history: int,
) -> tuple[bool, int, int]:
    layer = str(card.get("sourceLayer") or "").strip().lower()
    count = cross_family_count(card)
    threshold = min_cross_family if layer == "history" else min_cross_family_non_history
    threshold = max(threshold, 1)
    return count >= threshold, count, threshold


def should_pass_card_base_gate(card: dict[str, Any]) -> tuple[bool, str]:
    claim_type = str(card.get("claimType") or "").strip().lower()
    quote = str(card.get("quote") or card.get("translatedTraditionalText") or "").strip()
    if claim_type != "relationship":
        if claim_type not in ALLOWED_REPARSE_CLAIM_TYPES:
            return False, "claimType-not-relationship"
        compact = re.sub(r"\s+", "", quote)
        if not any(term in compact for term in RELATIONSHIP_REPARSE_CUE_TERMS):
            return False, "reparse-missing-relationship-cue"
    source_layer = str(card.get("sourceLayer") or "").strip().lower()
    if source_layer not in ALLOWED_SOURCE_LAYERS:
        return False, "source-layer-not-allowed"
    if len(quote) < 8:
        return False, "short-quote"
    if not (card.get("locator") or card.get("textHash")):
        return False, "missing-locator-hash"
    if claim_type == "relationship":
        return True, "ok"
    return True, f"ok-reparse:{claim_type}"


def trust_signals_for_edge(
    *,
    card: dict[str, Any],
    edge: dict[str, Any],
    internal_pair_keys: set[str],
    min_cross_family: int,
    min_cross_family_non_history: int,
) -> list[str]:
    signals: list[str] = []
    cross_ok, _cross_count, _threshold = cross_family_gate(
        card,
        min_cross_family=min_cross_family,
        min_cross_family_non_history=min_cross_family_non_history,
    )
    if cross_ok:
        signals.append("cross-source")
    if has_quote_locator_hash(card):
        signals.append("quote+locator+hash")

    pair_key = edge_pair_key(str(edge.get("fromId") or ""), str(edge.get("toId") or ""))
    if pair_key and pair_key in internal_pair_keys:
        signals.append("internal-external")
    return signals


def apply_signal_boost(edge: dict[str, Any], *, source_layer: str, signals: list[str]) -> dict[str, Any]:
    boosted = dict(edge)
    boost = 0.0
    if "cross-source" in signals:
        boost += 0.02
    if "quote+locator+hash" in signals:
        boost += 0.02
    if "internal-external" in signals:
        boost += 0.03

    base = float(boosted.get("edgeConfidence") or 0.0)
    next_conf = clamp(base + boost, 0.45, max_confidence_for_layer(source_layer))
    boosted["edgeConfidence"] = round(next_conf, 2)
    boosted["edgeStrength"] = round(clamp(next_conf - 0.12, 0.35, 0.90), 2)
    boosted["confidenceSignals"] = list(signals)
    boosted["confidenceGate"] = "passed"
    boosted["sidecarOnly"] = False
    return boosted


def build_sidecar_row(
    *,
    card: dict[str, Any],
    edge: dict[str, Any],
    reason: str,
    signals: list[str],
    min_cross_family: int,
    min_cross_family_non_history: int,
    internal_pair_keys: set[str],
) -> dict[str, Any]:
    cross_ok, cross_count, threshold = cross_family_gate(
        card,
        min_cross_family=min_cross_family,
        min_cross_family_non_history=min_cross_family_non_history,
    )
    from_id = str(edge.get("fromId") or "").strip()
    to_id = str(edge.get("toId") or "").strip()
    return {
        "mode": "external-relationship-sidecar",
        "sidecarReason": reason,
        "edgeId": edge.get("edgeId"),
        "fromId": from_id,
        "toId": to_id,
        "type": edge.get("type"),
        "sourcePolicyId": edge.get("sourcePolicyId") or card.get("sourcePolicyId") or card.get("sourceId"),
        "sourceEvidenceId": edge.get("sourceEvidenceId") or card.get("evidenceId"),
        "sourceLayer": str(card.get("sourceLayer") or ""),
        "crossFamilyCount": cross_count,
        "crossFamilyThreshold": threshold,
        "crossSourcePassed": cross_ok,
        "hasQuoteLocatorHash": has_quote_locator_hash(card),
        "internalExternalMatched": edge_pair_key(from_id, to_id) in internal_pair_keys,
        "confidenceSignals": list(signals),
        "quote": str(card.get("quote") or card.get("translatedTraditionalText") or "")[:220],
        "locator": card.get("locator"),
        "textHash": card.get("textHash"),
        "canonicalWrites": False,
    }


def edges_from_card(
    card: dict[str, Any],
    *,
    alias_pairs: list[tuple[str, str]],
    max_participants_per_card: int,
    source_policy_index: dict[str, dict[str, Any]],
    allow_shadow_partner_fallback: bool,
) -> tuple[list[dict[str, Any]], str]:
    quote = str(card.get("quote") or card.get("translatedTraditionalText") or "").strip()
    anchors = [str(item).strip() for item in (card.get("generalIds") or []) if str(item).strip() and not str(item).startswith("shadow:")]
    anchors = list(dict.fromkeys(anchors))
    participants = find_participants(quote, alias_pairs, max_people=max_participants_per_card)
    for anchor in anchors:
        if anchor not in participants:
            participants.insert(0, anchor)
    claim_type = str(card.get("claimType") or "").strip().lower()
    if allow_shadow_partner_fallback and len(participants) < 2 and claim_type == "relationship":
        inferred_people = infer_partner_ids_from_quote(
            quote,
            alias_pairs=alias_pairs,
            existing_people=set(participants),
            max_new_people=max(max_participants_per_card - len(participants), 1),
        )
        participants.extend(inferred_people)
    participants = list(dict.fromkeys(participants))
    if len(anchors) == 0:
        return [], "no-anchor-general"
    if len(participants) < 2:
        return [], "not-enough-participants"
    if list_like_text(quote, len(participants)) and str(card.get("sourceLayer") or "").lower() in {"encyclopedia", "worldbuilding"}:
        return [], "list-like-noise"

    source_id = str(card.get("sourcePolicyId") or card.get("sourceId") or "unknown-source").strip()
    source_policy = source_policy_index.get(source_id, {})
    source_layer = str(card.get("sourceLayer") or source_policy.get("sourceLayer") or "")
    source_class = str(card.get("sourceClass") or source_policy.get("sourceClass") or "").strip().lower()
    trust_tier = str(card.get("trustTier") or source_policy.get("trustTier") or "").strip().lower()
    cross_count = len(list(card.get("crossSiteSourceFamilies") or []))
    base_conf = base_confidence_for_layer(source_layer)
    if cross_count >= 5:
        base_conf += 0.04
    elif cross_count >= 4:
        base_conf += 0.03
    elif cross_count >= 3:
        base_conf += 0.02
    elif cross_count >= 2:
        base_conf += 0.01
    if card.get("locator") and card.get("textHash"):
        base_conf += 0.01
    if list_like_text(quote, len(participants)):
        base_conf -= 0.08
    base_conf = clamp(base_conf, 0.45, max_confidence_for_layer(source_layer))

    evidence_id = str(card.get("evidenceId") or "")
    locator = str(card.get("locator") or "").strip()
    chapter_no = parse_chapter_no(locator, list(card.get("sourceRefs") or []))
    source_ref = f"ext-card:{source_id}:{evidence_id}"
    edges: list[dict[str, Any]] = []
    for anchor in anchors:
        others = [person for person in participants if person != anchor]
        others = others[: max(max_participants_per_card - 1, 1)]
        for other in others:
            edge = {
                "chapterNo": chapter_no,
                "fromId": anchor,
                "toId": other,
                "type": "relationship_external",
                "originalType": "relationship_external",
                "evidenceRefs": [source_ref],
                "sourceQuote": quote[:220],
                "evidenceText": quote[:220],
                "matchedAliases": [],
                "pattern": "external-relationship-card-gate",
                "edgeConfidence": round(base_conf, 2),
                "edgeStrength": round(clamp(base_conf - 0.12, 0.35, 0.90), 2),
                "reviewStatus": "source-grounded-review" if base_conf < 0.8 else "source-grounded-strong",
                "sourceLayer": f"external-{source_layer or 'unknown'}",
                "sourceLayerRaw": source_layer or "unknown",
                "sourceClass": source_class or "unknown",
                "trustTier": trust_tier or "unknown",
                "sourcePolicyId": source_id,
                "sourceEvidenceId": evidence_id,
                "sourceFamily": card.get("sourceFamily") or source_policy.get("sourceFamily"),
                "locator": card.get("locator"),
                "url": card.get("url"),
                "pageTitle": card.get("pageTitle"),
                "crossSiteMatchCount": int(card.get("crossSiteMatchCount") or 0),
                "crossSiteSourceFamilies": list(card.get("crossSiteSourceFamilies") or []),
                "textHash": card.get("textHash"),
                "canonicalWrites": False,
            }
            refined_type, reasons = refine_relationship_type(edge, quote)
            edge["type"] = refined_type
            edge["refinementReasons"] = reasons
            edge["edgeId"] = f"rel.external.{source_id}.{evidence_id}.{anchor}.{refined_type}.{other}"
            edges.append(edge)
    return edges, "ok"


def dedupe_edges(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for row in rows:
        refs = row.get("evidenceRefs") or []
        ref0 = str(refs[0] if refs else "")
        key = (str(row.get("fromId") or ""), str(row.get("toId") or ""), str(row.get("type") or ""), ref0)
        existing = by_key.get(key)
        if existing is None:
            by_key[key] = row
            continue
        if float(row.get("edgeConfidence") or 0.0) > float(existing.get("edgeConfidence") or 0.0):
            by_key[key] = row
    deduped = list(by_key.values())
    deduped.sort(key=lambda row: (row.get("chapterNo") is None, row.get("chapterNo") or 10**9, str((row.get("evidenceRefs") or [""])[0]), str(row.get("fromId") or ""), str(row.get("type") or ""), str(row.get("toId") or "")))
    return deduped


def apply_source_caps(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int], dict[str, int]]:
    by_source: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        source_id = str(row.get("sourcePolicyId") or "unknown-source").strip()
        by_source.setdefault(source_id, []).append(row)

    kept: list[dict[str, Any]] = []
    trimmed_counts: dict[str, int] = {}
    cap_by_source: dict[str, int] = {}
    for source_id, source_rows in by_source.items():
        source_rows.sort(
            key=lambda row: (
                -float(row.get("edgeConfidence") or 0.0),
                -int(row.get("crossSiteMatchCount") or 0),
                str(row.get("type") or ""),
                str(row.get("fromId") or ""),
                str(row.get("toId") or ""),
            )
        )
        layer = str(source_rows[0].get("sourceLayerRaw") or source_rows[0].get("sourceLayer") or "")
        if layer.startswith("external-"):
            layer = layer[len("external-") :]
        source_class = str(source_rows[0].get("sourceClass") or "").strip()
        trust_tier = str(source_rows[0].get("trustTier") or "").strip()
        cap = source_edge_cap_for_profile(
            source_layer=layer,
            source_class=source_class,
            trust_tier=trust_tier,
        )
        cap_by_source[source_id] = cap
        selected = source_rows[:cap]
        kept.extend(selected)
        trimmed = max(len(source_rows) - len(selected), 0)
        if trimmed > 0:
            trimmed_counts[source_id] = trimmed

    kept.sort(key=lambda row: (str(row.get("sourcePolicyId") or ""), -float(row.get("edgeConfidence") or 0.0), str(row.get("fromId") or ""), str(row.get("toId") or ""), str(row.get("type") or "")))
    return kept, dict(sorted(trimmed_counts.items())), dict(sorted(cap_by_source.items()))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build strict relationship-edge overlay from global candidate evidence cards.")
    parser.add_argument("--candidate-evidence-cards", action="append", default=[])
    parser.add_argument("--internal-relationship-evidence", action="append", default=[])
    parser.add_argument("--alias-map", default=str(DEFAULT_ALIAS_MAP))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--min-cross-family", type=int, default=2)
    parser.add_argument("--min-cross-family-non-history", type=int, default=3)
    parser.add_argument("--max-participants-per-card", type=int, default=4)
    parser.add_argument("--allow-shadow-partner-fallback", action="store_true")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    jsonl_path = output_root / "source-grounded-relationship-edges.external.jsonl"
    sidecar_jsonl_path = output_root / "source-grounded-relationship-edges.sidecar.jsonl"
    summary_path = output_root / "external-relationship-overlay-summary.json"
    md_path = output_root / "external-relationship-overlay-summary.zh-TW.md"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise FileExistsError(f"output already exists: {repo_relative(output_root)}")
    output_root.mkdir(parents=True, exist_ok=True)

    alias_pairs = load_alias_mapping(resolve_path(args.alias_map))
    source_policy_index = load_source_policy_index(resolve_path(args.source_config))
    internal_pair_keys = load_internal_pair_keys([resolve_path(path_text) for path_text in args.internal_relationship_evidence])
    card_rows: list[dict[str, Any]] = []
    for path_text in args.candidate_evidence_cards:
        card_rows.extend(read_jsonl(resolve_path(path_text)))

    gate_reasons = Counter()
    gate_accept_reparse = Counter()
    transform_reasons = Counter()
    trust_gate_reasons = Counter()
    signal_counts = Counter()
    edge_rows: list[dict[str, Any]] = []
    sidecar_rows: list[dict[str, Any]] = []
    for card in card_rows:
        passed, reason = should_pass_card_base_gate(card)
        if not passed:
            gate_reasons[reason] += 1
            continue
        if reason.startswith("ok-reparse:"):
            gate_accept_reparse[reason.split(":", 1)[1]] += 1
        rows, transform_reason = edges_from_card(
            card,
            alias_pairs=alias_pairs,
            max_participants_per_card=max(args.max_participants_per_card, 2),
            source_policy_index=source_policy_index,
            allow_shadow_partner_fallback=bool(args.allow_shadow_partner_fallback),
        )
        if not rows:
            transform_reasons[transform_reason] += 1
            continue
        source_layer = str(card.get("sourceLayer") or "").strip().lower()
        for edge in rows:
            signals = trust_signals_for_edge(
                card=card,
                edge=edge,
                internal_pair_keys=internal_pair_keys,
                min_cross_family=max(args.min_cross_family, 1),
                min_cross_family_non_history=max(args.min_cross_family_non_history, max(args.min_cross_family, 1)),
            )
            if not signals:
                trust_gate_reasons["no-trust-signal"] += 1
                sidecar_rows.append(
                    build_sidecar_row(
                        card=card,
                        edge=edge,
                        reason="no-trust-signal",
                        signals=signals,
                        min_cross_family=max(args.min_cross_family, 1),
                        min_cross_family_non_history=max(args.min_cross_family_non_history, max(args.min_cross_family, 1)),
                        internal_pair_keys=internal_pair_keys,
                    )
                )
                continue
            for signal in signals:
                signal_counts[signal] += 1
            edge_rows.append(apply_signal_boost(edge, source_layer=source_layer, signals=signals))

    deduped_rows = dedupe_edges(edge_rows)
    capped_rows, capped_trimmed_counts, source_caps = apply_source_caps(deduped_rows)
    write_jsonl(jsonl_path, capped_rows)
    write_jsonl(sidecar_jsonl_path, sidecar_rows)

    type_counts = Counter(str(row.get("type") or "") for row in capped_rows)
    source_policy_counts = Counter(str(row.get("sourcePolicyId") or "") for row in capped_rows)
    source_layer_counts = Counter(str(row.get("sourceLayer") or "") for row in capped_rows)
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "external-relationship-overlay",
        "canonicalWrites": False,
        "inputs": {
            "candidateEvidenceCards": [repo_relative(resolve_path(path)) for path in args.candidate_evidence_cards],
            "internalRelationshipEvidence": [repo_relative(resolve_path(path)) for path in args.internal_relationship_evidence],
            "aliasMapPath": repo_relative(resolve_path(args.alias_map)),
            "sourceConfigPath": repo_relative(resolve_path(args.source_config)),
            "minCrossFamily": max(args.min_cross_family, 1),
            "minCrossFamilyNonHistory": max(args.min_cross_family_non_history, max(args.min_cross_family, 1)),
            "maxParticipantsPerCard": max(args.max_participants_per_card, 2),
            "allowShadowPartnerFallback": bool(args.allow_shadow_partner_fallback),
        },
        "outputs": {
            "relationshipEdgesJsonlPath": repo_relative(jsonl_path),
            "sidecarJsonlPath": repo_relative(sidecar_jsonl_path),
            "summaryJsonPath": repo_relative(summary_path),
            "summaryMarkdownPath": repo_relative(md_path),
        },
        "metrics": {
            "cardInputCount": len(card_rows),
            "internalRelationshipPairCount": len(internal_pair_keys),
            "edgeRawCount": len(edge_rows),
            "edgeCountBeforeSourceCap": len(deduped_rows),
            "edgeCount": len(capped_rows),
            "sidecarEdgeCount": len(sidecar_rows),
            "uniqueSourcePolicyCount": len(source_policy_counts),
            "sourceCapTrimmedCount": max(len(deduped_rows) - len(capped_rows), 0),
            "sourceCapTrimmedBySource": capped_trimmed_counts,
            "sourceCapBySource": source_caps,
            "gateRejectCounts": dict(sorted(gate_reasons.items())),
            "gateAcceptReparseByClaimType": dict(sorted(gate_accept_reparse.items())),
            "transformRejectCounts": dict(sorted(transform_reasons.items())),
            "trustGateRejectCounts": dict(sorted(trust_gate_reasons.items())),
            "confidenceSignalCounts": dict(sorted(signal_counts.items())),
            "relationshipTypeCounts": dict(sorted(type_counts.items())),
            "sourcePolicyCounts": dict(sorted(source_policy_counts.items())),
            "sourceLayerCounts": dict(sorted(source_layer_counts.items())),
        },
    }
    write_json(summary_path, summary)
    lines = [
        "# External Relationship Overlay Summary",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Card Input: `{summary['metrics']['cardInputCount']}`",
        f"- Raw Edges: `{summary['metrics']['edgeRawCount']}`",
        f"- Before Source Cap: `{summary['metrics']['edgeCountBeforeSourceCap']}`",
        f"- Final Edges: `{summary['metrics']['edgeCount']}`",
        f"- Sidecar-Only Edges: `{summary['metrics']['sidecarEdgeCount']}`",
        f"- Source-Cap Trimmed: `{summary['metrics']['sourceCapTrimmedCount']}`",
        "",
        "## Gate Rejects",
        "",
    ]
    for key, value in summary["metrics"]["gateRejectCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Gate Accept Reparse By ClaimType", ""])
    for key, value in summary["metrics"]["gateAcceptReparseByClaimType"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Transform Rejects", ""])
    for key, value in summary["metrics"]["transformRejectCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Trust Gate Rejects", ""])
    for key, value in summary["metrics"]["trustGateRejectCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Confidence Signals", ""])
    for key, value in summary["metrics"]["confidenceSignalCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Relationship Types", ""])
    for key, value in summary["metrics"]["relationshipTypeCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Cap Trimmed By Source", ""])
    for key, value in summary["metrics"]["sourceCapTrimmedBySource"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Cap By Source", ""])
    for key, value in summary["metrics"]["sourceCapBySource"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"[build_external_relationship_overlay] wrote {jsonl_path}")
    print(f"[build_external_relationship_overlay] wrote {sidecar_jsonl_path}")
    print(f"[build_external_relationship_overlay] wrote {summary_path}")
    print(f"[build_external_relationship_overlay] wrote {md_path}")
    print(
        "[build_external_relationship_overlay] "
        f"cards={len(card_rows)} edges={len(capped_rows)} canonicalWrites=false"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
