from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from repo_layout import resolve_repo_root
from sanguo_governance_loader import SanguoGovernanceError, default_governance_root, load_external_evidence_scoring_policy

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-evidence-seeds-v3-r1")
DEFAULT_SEEDS_JSONL = DEFAULT_OUTPUT_ROOT / "external-evidence-seeds.jsonl"
DEFAULT_GOVERNANCE_ROOT = default_governance_root()

SOURCE_LAYER_SCORE: dict[str, float] = {}

ANGLE_SPECIFICITY_SCORE: dict[str, float] = {}

EXTRACTION_RELIABILITY_SCORE: dict[str, float] = {}
EXTERNAL_EVIDENCE_SCORING_POLICY: dict[str, Any] = {}
_EXTERNAL_EVIDENCE_SCORING_POLICY_LOADED = False


def apply_external_evidence_scoring_governance(
    governance_root: str | Path | None = None,
    external_evidence_scoring_policy: str | Path | None = None,
) -> None:
    global EXTERNAL_EVIDENCE_SCORING_POLICY, _EXTERNAL_EVIDENCE_SCORING_POLICY_LOADED
    global SOURCE_LAYER_SCORE, ANGLE_SPECIFICITY_SCORE, EXTRACTION_RELIABILITY_SCORE
    policy = load_external_evidence_scoring_policy(governance_root, external_evidence_scoring_policy=external_evidence_scoring_policy)
    EXTERNAL_EVIDENCE_SCORING_POLICY = dict(policy)
    SOURCE_LAYER_SCORE = {str(key): float(value) for key, value in (policy.get("sourceLayerScore") or {}).items()}
    ANGLE_SPECIFICITY_SCORE = {str(key): float(value) for key, value in (policy.get("angleSpecificityScore") or {}).items()}
    EXTRACTION_RELIABILITY_SCORE = {str(key): float(value) for key, value in (policy.get("extractionReliabilityScore") or {}).items()}
    _EXTERNAL_EVIDENCE_SCORING_POLICY_LOADED = True


def ensure_external_evidence_scoring_governance_loaded() -> None:
    if not _EXTERNAL_EVIDENCE_SCORING_POLICY_LOADED:
        apply_external_evidence_scoring_governance()


def scoring_fallbacks() -> dict[str, Any]:
    ensure_external_evidence_scoring_governance_loaded()
    fallbacks = EXTERNAL_EVIDENCE_SCORING_POLICY.get("scoreFallbacks")
    return fallbacks if isinstance(fallbacks, dict) else {}


def raw_seed_score_weights() -> dict[str, float]:
    ensure_external_evidence_scoring_governance_loaded()
    weights = EXTERNAL_EVIDENCE_SCORING_POLICY.get("rawSeedScoreWeights")
    if isinstance(weights, dict) and weights:
        return {str(key): float(value) for key, value in weights.items()}
    return {}


def site_reliability_policy() -> dict[str, Any]:
    ensure_external_evidence_scoring_governance_loaded()
    policy = EXTERNAL_EVIDENCE_SCORING_POLICY.get("siteReliability")
    return policy if isinstance(policy, dict) else {}


def promotion_policy() -> dict[str, Any]:
    ensure_external_evidence_scoring_governance_loaded()
    policy = EXTERNAL_EVIDENCE_SCORING_POLICY.get("promotionTargets")
    return policy if isinstance(policy, dict) else {}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    if not path.exists():
        return
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        text = line.strip()
        if not text:
            continue
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL at {repo_relative(path)}:{line_number}: {exc}") from exc
        if isinstance(value, dict):
            yield value


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            count += 1
    return count


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def person_key(seed: dict[str, Any]) -> str:
    return str(seed.get("generalId") or seed.get("candidatePersonId") or "").strip()


def source_family(seed: dict[str, Any]) -> str:
    return str(seed.get("sourceFamily") or seed.get("sourceId") or "").strip()


def source_id(seed: dict[str, Any]) -> str:
    return str(seed.get("sourceId") or seed.get("sourceFamily") or "unknown-source").strip()


def angle_type(seed: dict[str, Any]) -> str:
    return str(seed.get("angleType") or "worldbuilding_note").strip()


def source_layer_score(seed: dict[str, Any]) -> float:
    ensure_external_evidence_scoring_governance_loaded()
    layer = str(seed.get("sourceLayer") or "").strip().lower()
    family = source_family(seed).lower()
    trust_tier = str(seed.get("trustTier") or "").strip().lower()
    if "sanguoyanyi" in family or "romance" in family:
        return SOURCE_LAYER_SCORE["romance"]
    if any(token in family for token in ("sanguozhi", "houhanshu", "zizhitongjian")):
        return SOURCE_LAYER_SCORE["history"]
    if "primary" in trust_tier:
        return SOURCE_LAYER_SCORE["history"]
    if layer in SOURCE_LAYER_SCORE:
        return SOURCE_LAYER_SCORE[layer]
    fallbacks = scoring_fallbacks()
    if "secondary" in trust_tier or "research" in trust_tier:
        return SOURCE_LAYER_SCORE[str(fallbacks.get("sourceLayerSecondaryOrResearch") or "research")]
    if "game" in family or "koei" in family or "musou" in family:
        return SOURCE_LAYER_SCORE[str(fallbacks.get("sourceLayerGameFamily") or "game")]
    return SOURCE_LAYER_SCORE[str(fallbacks.get("sourceLayerDefault") or "worldbuilding")]


def person_match_score(seed: dict[str, Any]) -> float:
    if seed.get("generalId"):
        return 100.0
    if seed.get("candidatePersonId"):
        return 75.0
    return 0.0


def text_support_score(seed: dict[str, Any]) -> float:
    has_quote = bool(seed.get("hasQuote") or seed.get("quote"))
    has_locator = bool(seed.get("hasLocator") or seed.get("locator"))
    has_hash = bool(seed.get("textHash"))
    has_text = bool(str(seed.get("seedText") or "").strip())
    if has_quote and has_locator and has_hash:
        return 100.0
    if has_quote and has_hash:
        return 82.0
    if has_quote and has_locator:
        return 78.0
    if has_text:
        return 64.0
    return 25.0


def freshness_score(seed: dict[str, Any]) -> float:
    ensure_external_evidence_scoring_governance_loaded()
    status = str(seed.get("sourceLiveStatus") or "").strip()
    score_by_status = EXTERNAL_EVIDENCE_SCORING_POLICY.get("freshnessScore") if isinstance(EXTERNAL_EVIDENCE_SCORING_POLICY.get("freshnessScore"), dict) else {}
    if status in score_by_status:
        return float(score_by_status[status])
    return float(score_by_status.get("default", 80.0))


def cross_site_groups(seeds: list[dict[str, Any]]) -> dict[tuple[str, str], set[str]]:
    groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    for seed in seeds:
        person = person_key(seed)
        angle = angle_type(seed)
        family = source_family(seed)
        if person and angle and family:
            groups[(person, angle)].add(family)
    return groups


def apply_cross_site_counts(seeds: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups = cross_site_groups(seeds)
    scored: list[dict[str, Any]] = []
    for seed in seeds:
        person = person_key(seed)
        angle = angle_type(seed)
        families = groups.get((person, angle), set())
        row = dict(seed)
        row["crossSiteMatchCount"] = max(0, len(families) - 1)
        row["crossSiteSourceFamilies"] = sorted(families)
        scored.append(row)
    return scored


def raw_seed_score(seed: dict[str, Any]) -> tuple[float, dict[str, float]]:
    ensure_external_evidence_scoring_governance_loaded()
    cross_count = int(seed.get("crossSiteMatchCount") or 0)
    breakdown = {
        "personMatchScore": person_match_score(seed),
        "angleSpecificityScore": ANGLE_SPECIFICITY_SCORE.get(angle_type(seed), float(scoring_fallbacks().get("angleSpecificityScore", 68.0))),
        "sourceLayerScore": source_layer_score(seed),
        "textSupportScore": text_support_score(seed),
        "extractionReliabilityScore": EXTRACTION_RELIABILITY_SCORE.get(str(seed.get("extractionMethod") or "").strip(), float(scoring_fallbacks().get("extractionReliabilityScore", 65.0))),
        "crossSiteSignalScore": clamp(cross_count * float((EXTERNAL_EVIDENCE_SCORING_POLICY.get("crossSiteSignal") or {}).get("perMatchScore", 45.0))),
        "freshnessAndReachabilityScore": freshness_score(seed),
    }
    weights = raw_seed_score_weights()
    score = sum(breakdown[key] * float(weights.get(key, 0.0)) for key in breakdown)
    return clamp(score), breakdown


def promotion_target(seed: dict[str, Any], score: float) -> str:
    ensure_external_evidence_scoring_governance_loaded()
    policy = promotion_policy()
    has_quote = bool(seed.get("hasQuote") or seed.get("quote"))
    has_locator_or_hash = bool(seed.get("hasLocator") or seed.get("locator") or seed.get("textHash"))
    cross_count = int(seed.get("crossSiteMatchCount") or 0)
    candidate_card = policy.get("candidateCard") if isinstance(policy.get("candidateCard"), dict) else {}
    if score >= float(candidate_card.get("minScore", 70.0)) and has_quote and has_locator_or_hash:
        return "candidate-card"
    source_conflict = policy.get("sourceConflict") if isinstance(policy.get("sourceConflict"), dict) else {}
    human_review = policy.get("humanReview") if isinstance(policy.get("humanReview"), dict) else {}
    if angle_type(seed) == str(source_conflict.get("angleType") or "source_conflict") or (score >= float(human_review.get("minScore", 80.0)) and not has_locator_or_hash):
        return str(source_conflict.get("target") or "human-review")
    preview = policy.get("preview") if isinstance(policy.get("preview"), dict) else {}
    if score >= float(preview.get("minScore", 55.0)) or cross_count > 0:
        return "preview"
    return str(policy.get("default") or "seed-only")


def site_multiplier(source_rows: list[dict[str, Any]]) -> tuple[float, dict[str, float]]:
    ensure_external_evidence_scoring_governance_loaded()
    policy = site_reliability_policy()
    total = max(len(source_rows), 1)
    broken_statuses = set(str(item) for item in policy.get("brokenLiveStatuses") or ["http-error", "timeout", "fetch-error", "url-error"])
    accepted_seed_rate = sum(1 for row in source_rows if row.get("_rawSeedScore", 0.0) >= float(policy.get("acceptedSeedMinRawScore", 60.0))) / total
    card_promotion_rate = sum(1 for row in source_rows if row.get("_candidateCardReady")) / total
    cross_site_agreement_rate = sum(1 for row in source_rows if int(row.get("crossSiteMatchCount") or 0) > 0) / total
    conflict_rate = sum(1 for row in source_rows if angle_type(row) == "source_conflict") / total
    stale_or_broken_rate = sum(1 for row in source_rows if str(row.get("sourceLiveStatus") or "") in broken_statuses) / total
    multiplier = (
        float(policy.get("baseMultiplier", 0.70))
        + accepted_seed_rate * float(policy.get("acceptedSeedWeight", 0.15))
        + card_promotion_rate * float(policy.get("cardPromotionWeight", 0.10))
        + cross_site_agreement_rate * float(policy.get("crossSiteAgreementWeight", 0.10))
        - conflict_rate * float(policy.get("conflictPenaltyWeight", 0.15))
        - stale_or_broken_rate * float(policy.get("staleOrBrokenPenaltyWeight", 0.05))
    )
    metrics = {
        "acceptedSeedRate": round(accepted_seed_rate, 4),
        "cardPromotionRate": round(card_promotion_rate, 4),
        "crossSiteAgreementRate": round(cross_site_agreement_rate, 4),
        "conflictRate": round(conflict_rate, 4),
        "staleOrBrokenRate": round(stale_or_broken_rate, 4),
    }
    return round(clamp(multiplier, float(policy.get("minMultiplier", 0.70)), float(policy.get("maxMultiplier", 1.20))), 4), metrics


def score_seeds(seeds: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with_cross = apply_cross_site_counts(seeds)
    pre_scored: list[dict[str, Any]] = []
    for seed in with_cross:
        raw_score, breakdown = raw_seed_score(seed)
        row = dict(seed)
        row["_rawSeedScore"] = raw_score
        row["_candidateCardReady"] = bool((seed.get("hasQuote") or seed.get("quote")) and (seed.get("hasLocator") or seed.get("locator") or seed.get("textHash")))
        row["seedConfidenceBreakdown"] = {key: round(value, 2) for key, value in breakdown.items()}
        pre_scored.append(row)

    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in pre_scored:
        by_source[source_id(row)].append(row)

    site_rows: list[dict[str, Any]] = []
    multipliers: dict[str, float] = {}
    for sid, rows in sorted(by_source.items()):
        multiplier, metrics = site_multiplier(rows)
        multipliers[sid] = multiplier
        site_rows.append(
            {
                "sourceId": sid,
                "sourceFamily": source_family(rows[0]) if rows else sid,
                "seedCount": len(rows),
                "siteReliabilityMultiplier": multiplier,
                **metrics,
            }
        )

    final_rows: list[dict[str, Any]] = []
    for row in pre_scored:
        multiplier = multipliers.get(source_id(row), 1.0)
        score = clamp(float(row["_rawSeedScore"]) * multiplier)
        clean = {key: value for key, value in row.items() if not key.startswith("_")}
        clean["siteReliabilityMultiplier"] = multiplier
        clean["seedConfidenceScore"] = round(score, 2)
        clean["promotionTarget"] = promotion_target(clean, score)
        clean["canonicalWrites"] = False
        final_rows.append(clean)

    final_rows.sort(key=lambda row: (-float(row.get("seedConfidenceScore") or 0.0), person_key(row), angle_type(row), source_id(row)))
    return final_rows, site_rows


def person_ranking(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        person = person_key(row)
        if person:
            grouped[person].append(row)
    ranking: list[dict[str, Any]] = []
    for person, person_rows in grouped.items():
        scores = [float(row.get("seedConfidenceScore") or 0.0) for row in person_rows]
        families = {source_family(row) for row in person_rows if source_family(row)}
        ranking.append(
            {
                "personId": person,
                "seedCount": len(person_rows),
                "avgSeedConfidenceScore": round(sum(scores) / len(scores), 2),
                "maxSeedConfidenceScore": round(max(scores), 2),
                "distinctSourceFamilyCount": len(families),
                "candidateCardCount": sum(1 for row in person_rows if row.get("promotionTarget") == "candidate-card"),
                "previewCount": sum(1 for row in person_rows if row.get("promotionTarget") == "preview"),
            }
        )
    ranking.sort(key=lambda row: (-row["candidateCardCount"], -row["avgSeedConfidenceScore"], row["personId"]))
    return ranking


def cross_site_report(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[(person_key(row), angle_type(row))].append(row)
    report: list[dict[str, Any]] = []
    for (person, angle), group_rows in groups.items():
        families = sorted({source_family(row) for row in group_rows if source_family(row)})
        if len(families) < 2:
            continue
        report.append(
            {
                "personId": person,
                "angleType": angle,
                "sourceFamilies": families,
                "seedCount": len(group_rows),
                "maxSeedConfidenceScore": round(max(float(row.get("seedConfidenceScore") or 0.0) for row in group_rows), 2),
            }
        )
    report.sort(key=lambda row: (-row["seedCount"], -row["maxSeedConfidenceScore"], row["personId"], row["angleType"]))
    return report


def render_markdown(summary: dict[str, Any]) -> str:
    metrics = summary["metrics"]
    lines = [
        "# 外部證據 Seed 排行榜 v3",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Seed Count: `{metrics['seedCount']}`",
        f"- Candidate Card Ready: `{metrics['candidateCardCount']}`",
        f"- Preview Queue: `{metrics['previewCount']}`",
        f"- Human Review Queue: `{metrics['humanReviewCount']}`",
        f"- Cross-site Groups: `{metrics['crossSiteGroupCount']}`",
        "",
        "## 怎麼讀",
        "",
        "`EvidenceSeed` 是低門檻線索，不等於正式證據。分數高代表它值得被 preview skill 補證或升成 candidate card；只有 candidate card 也仍然只是 B/A gate 的輸入，不會自動寫 canonical。",
        "",
        "## Top Seeds",
        "",
        "| Rank | Person | Angle | Source | Score | Cross-site | Next | Seed Text |",
        "| --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ]
    for index, row in enumerate(summary["rankedSeeds"][:30], 1):
        text = str(row.get("translatedTraditionalText") or row.get("seedText") or row.get("quote") or "").replace("\n", " ").replace("|", "\\|")
        if len(text) > 80:
            text = text[:77] + "..."
        lines.append(
            "| {rank} | `{person}` | `{angle}` | `{source}` | {score:.2f} | {cross} | `{target}` | {text} |".format(
                rank=index,
                person=person_key(row),
                angle=angle_type(row),
                source=source_id(row),
                score=float(row.get("seedConfidenceScore") or 0.0),
                cross=int(row.get("crossSiteMatchCount") or 0),
                target=row.get("promotionTarget"),
                text=text,
            )
        )

    lines.extend(["", "## 人物排行", "", "| Person | Seeds | Avg Score | Max Score | Families | Candidate Cards | Preview |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"])
    for row in summary["personRanking"][:30]:
        lines.append(
            f"| `{row['personId']}` | {row['seedCount']} | {row['avgSeedConfidenceScore']:.2f} | {row['maxSeedConfidenceScore']:.2f} | {row['distinctSourceFamilyCount']} | {row['candidateCardCount']} | {row['previewCount']} |"
        )

    lines.extend(["", "## 網站 ROI / Multiplier", "", "| Source | Seeds | Multiplier | Accepted Rate | Card Rate | Cross-site Rate | Broken Rate |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"])
    for row in summary["siteReliability"]:
        lines.append(
            f"| `{row['sourceId']}` | {row['seedCount']} | {row['siteReliabilityMultiplier']:.2f} | {row['acceptedSeedRate']:.2f} | {row['cardPromotionRate']:.2f} | {row['crossSiteAgreementRate']:.2f} | {row['staleOrBrokenRate']:.2f} |"
        )

    lines.extend(["", "## 跨站互證群", "", "| Person | Angle | Families | Seeds | Max Score |", "| --- | --- | --- | ---: | ---: |"])
    for row in summary["crossSiteGroups"][:30]:
        lines.append(
            f"| `{row['personId']}` | `{row['angleType']}` | {', '.join(row['sourceFamilies'])} | {row['seedCount']} | {row['maxSeedConfidenceScore']:.2f} |"
        )
    if not summary["crossSiteGroups"]:
        lines.append("| _none_ | _none_ | _none_ | 0 | 0.00 |")
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score EvidenceSeed rows and produce ranking/report artifacts.")
    parser.add_argument("--seeds-jsonl", default=str(DEFAULT_SEEDS_JSONL), help="Input external-evidence-seeds.jsonl.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory.")
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance root")
    parser.add_argument("--external-evidence-scoring-policy", default=None, help="Override policy-external-evidence-scoring.json path")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        apply_external_evidence_scoring_governance(args.governance_root, args.external_evidence_scoring_policy)
    except SanguoGovernanceError as exc:
        print(f"[score_external_evidence_seeds] governance error: {exc}")
        return 2
    seeds_path = resolve_path(args.seeds_jsonl)
    output_root = resolve_path(args.output_root)
    ranking_path = output_root / "external-evidence-seed-ranking.json"
    scored_jsonl_path = output_root / "external-evidence-seeds.scored.jsonl"
    markdown_path = output_root / "external-evidence-seed-ranking.zh-TW.md"
    if (ranking_path.exists() or scored_jsonl_path.exists() or markdown_path.exists()) and not args.overwrite:
        raise SystemExit(f"Ranking outputs already exist under {repo_relative(output_root)}")

    seeds = list(iter_jsonl(seeds_path))
    scored_rows, site_rows = score_seeds(seeds)
    person_rows = person_ranking(scored_rows)
    cross_rows = cross_site_report(scored_rows)
    target_counts = Counter(str(row.get("promotionTarget") or "seed-only") for row in scored_rows)
    summary = {
        "version": "3.0.0",
        "generatedAt": utc_now(),
        "mode": "external-evidence-seed-scoring",
        "canonicalWrites": False,
        "inputs": {"seedsJsonl": repo_relative(seeds_path)},
        "outputs": {
            "rankingJson": repo_relative(ranking_path),
            "scoredSeedsJsonl": repo_relative(scored_jsonl_path),
            "rankingMarkdown": repo_relative(markdown_path),
        },
        "metrics": {
            "seedCount": len(scored_rows),
            "candidateCardCount": target_counts.get("candidate-card", 0),
            "previewCount": target_counts.get("preview", 0),
            "humanReviewCount": target_counts.get("human-review", 0),
            "seedOnlyCount": target_counts.get("seed-only", 0),
            "crossSiteGroupCount": len(cross_rows),
            "sourceCount": len(site_rows),
        },
        "siteReliability": site_rows,
        "personRanking": person_rows,
        "crossSiteGroups": cross_rows,
        "rankedSeeds": scored_rows,
    }
    write_json(ranking_path, summary)
    write_jsonl(scored_jsonl_path, scored_rows)
    markdown_path.write_text(render_markdown(summary), encoding="utf-8")
    print(json.dumps({key: summary[key] for key in ("version", "generatedAt", "mode", "canonicalWrites", "metrics", "outputs")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
