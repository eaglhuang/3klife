from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SOURCES_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/external-evidence")
SUPPORTED_ADAPTERS = {"ctext", "wikisource", "gutenberg_text", "scan_pdf", "manual_quote", "static_html"}
TRUST_TIER_SCORES = {
    "primary-text": 95,
    "primary-text-transcription": 85,
    "transcription": 80,
    "scan-verified": 75,
    "secondary": 60,
    "folklore": 35,
    "blocked": 0,
}


@dataclass(frozen=True)
class SourcePolicy:
    id: str
    status: str
    adapter_type: str
    source_family: str
    source_layer: str
    trust_tier: str
    base_url: str
    single_source_max_grade: str
    claim_scopes: tuple[str, ...]
    notes: str
    manual_evidence: tuple[dict[str, Any], ...]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build normalized external evidence cards from approved source policies.")
    parser.add_argument("--sources-config", default=str(DEFAULT_SOURCES_CONFIG), help="External source policy config JSON path.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for evidence artifacts.")
    parser.add_argument("--approved-only", action="store_true", help="Include only status=approved sources.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs.")
    parser.add_argument("--dry-run", action="store_true", help="Compute and emit summaries without remote fetch steps.")
    return parser.parse_args()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(row, ensure_ascii=False) for row in rows]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def ensure_overwrite(paths: list[Path], overwrite: bool) -> None:
    existing = [path for path in paths if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def sha256_text(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_general_ids(raw: Any) -> list[str]:
    if isinstance(raw, list):
        values = [normalize_text(item) for item in raw]
        return [item for item in values if item]
    text = normalize_text(raw)
    return [text] if text else []


def normalize_policy(raw: dict[str, Any]) -> SourcePolicy:
    claim_scopes = tuple(str(item).strip() for item in (raw.get("claimScopes") or []) if str(item).strip())
    evidence_seeds = raw.get("manualEvidence") or raw.get("evidenceSeeds") or raw.get("seedEvidence") or raw.get("manualQuotes") or []
    if not isinstance(evidence_seeds, list):
        evidence_seeds = []
    return SourcePolicy(
        id=normalize_text(raw.get("id")),
        status=normalize_text(raw.get("status") or "suggested").lower(),
        adapter_type=normalize_text(raw.get("adapterType")).lower(),
        source_family=normalize_text(raw.get("sourceFamily")),
        source_layer=normalize_text(raw.get("sourceLayer")),
        trust_tier=normalize_text(raw.get("trustTier")),
        base_url=normalize_text(raw.get("baseUrl")),
        single_source_max_grade=normalize_text(raw.get("singleSourceMaxGrade") or "B"),
        claim_scopes=claim_scopes,
        notes=normalize_text(raw.get("notes")),
        manual_evidence=tuple(item for item in evidence_seeds if isinstance(item, dict)),
    )


def load_source_policies(path: Path) -> list[SourcePolicy]:
    payload = read_json(path)
    if isinstance(payload, dict):
        raw_sources = payload.get("sources") or []
    elif isinstance(payload, list):
        raw_sources = payload
    else:
        raw_sources = []
    normalized = [normalize_policy(item) for item in raw_sources if isinstance(item, dict)]
    return [item for item in normalized if item.id]


def build_card(policy: SourcePolicy, seed: dict[str, Any], sequence: int) -> dict[str, Any] | None:
    quote = normalize_text(seed.get("quote"))
    locator = normalize_text(seed.get("locator"))
    general_ids = normalize_general_ids(seed.get("generalIds"))
    if not quote or not general_ids:
        return None
    claim_type = normalize_text(seed.get("claimType")) or (policy.claim_scopes[0] if policy.claim_scopes else "event")
    source_url = normalize_text(seed.get("url")) or policy.base_url
    evidence_key = f"{policy.id}:{locator or ('seq-' + str(sequence))}:{quote[:80]}"
    evidence_id = "external:" + hashlib.sha1(evidence_key.encode("utf-8")).hexdigest()[:20]
    text_hash = sha256_text(f"{locator}||{quote}")
    trust_strength = TRUST_TIER_SCORES.get(policy.trust_tier, 50)
    return {
        "evidenceId": evidence_id,
        "sourcePolicyId": policy.id,
        "sourceFamily": policy.source_family,
        "sourceLayer": policy.source_layer,
        "trustTier": policy.trust_tier,
        "singleSourceMaxGrade": policy.single_source_max_grade or "B",
        "url": source_url,
        "locator": locator,
        "quote": quote,
        "textHash": text_hash,
        "claimType": claim_type,
        "claimScopes": list(policy.claim_scopes),
        "generalIds": general_ids,
        "trustStrengthScore": trust_strength,
        "canonicalWrites": False,
    }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# External Evidence Summary",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Dry Run: `{summary['dryRun']}`",
        f"- Sources Config: `{summary['inputs']['sourcesConfigPath']}`",
        f"- Source Policies: `{summary['sourcePolicyCount']}`",
        f"- Approved Policies: `{summary['approvedPolicyCount']}`",
        f"- Evidence Cards: `{summary['newEvidenceCardCount']}`",
        "",
        "## Layer Counts",
        "",
    ]
    for key, value in sorted((summary.get("countsByLayer") or {}).items()):
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Results", "", "| Source | Status | Adapter | Cards | Note |", "|---|---|---|---:|---|"])
    for item in summary.get("sourceResults") or []:
        lines.append(
            "| `{source}` | `{status}` | `{adapter}` | `{cards}` | {note} |".format(
                source=item.get("sourceId"),
                status=item.get("resultStatus"),
                adapter=item.get("adapterType"),
                cards=item.get("cardCount"),
                note=item.get("reason") or "-",
            )
        )
    lines.extend(
        [
            "",
            "## Output",
            "",
            f"- Cards JSONL: `{summary['outputs']['cardsPath']}`",
            f"- Summary JSON: `{summary['outputs']['summaryJsonPath']}`",
            f"- Summary Markdown: `{summary['outputs']['summaryMarkdownPath']}`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    sources_config_path = resolve_path(args.sources_config)
    output_root = resolve_path(args.output_root)
    cards_path = output_root / "external-evidence-cards.jsonl"
    summary_json_path = output_root / "external-evidence-summary.json"
    summary_markdown_path = output_root / "external-evidence-summary.zh-TW.md"
    ensure_overwrite([cards_path, summary_json_path, summary_markdown_path], args.overwrite)

    policies = load_source_policies(sources_config_path)
    cards: list[dict[str, Any]] = []
    source_results: list[dict[str, Any]] = []
    counts_by_layer: Counter[str] = Counter()
    counts_by_family: Counter[str] = Counter()
    counts_by_trust_tier: Counter[str] = Counter()
    approved_count = 0

    for policy in policies:
        if args.approved_only and policy.status != "approved":
            source_results.append(
                {
                    "sourceId": policy.id,
                    "status": policy.status,
                    "adapterType": policy.adapter_type,
                    "resultStatus": "skipped",
                    "cardCount": 0,
                    "reason": "status-not-approved",
                }
            )
            continue
        if policy.status == "approved":
            approved_count += 1
        if policy.adapter_type not in SUPPORTED_ADAPTERS:
            source_results.append(
                {
                    "sourceId": policy.id,
                    "status": policy.status,
                    "adapterType": policy.adapter_type,
                    "resultStatus": "skipped",
                    "cardCount": 0,
                    "reason": "unsupported-adapter",
                }
            )
            continue
        if not policy.manual_evidence:
            source_results.append(
                {
                    "sourceId": policy.id,
                    "status": policy.status,
                    "adapterType": policy.adapter_type,
                    "resultStatus": "pending-fetch",
                    "cardCount": 0,
                    "reason": "no-manual-evidence-seed",
                }
            )
            continue

        source_card_count = 0
        for index, seed in enumerate(policy.manual_evidence, start=1):
            card = build_card(policy, seed, index)
            if card is None:
                continue
            cards.append(card)
            source_card_count += 1
            counts_by_layer[card["sourceLayer"]] += 1
            counts_by_family[card["sourceFamily"]] += 1
            counts_by_trust_tier[card["trustTier"]] += 1
        source_results.append(
            {
                "sourceId": policy.id,
                "status": policy.status,
                "adapterType": policy.adapter_type,
                "resultStatus": "built" if source_card_count else "empty",
                "cardCount": source_card_count,
                "reason": "" if source_card_count else "manual-evidence-invalid-or-empty",
            }
        )

    output_root.mkdir(parents=True, exist_ok=True)
    write_jsonl(cards_path, cards)
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "external-evidence-cards",
        "canonicalWrites": False,
        "dryRun": bool(args.dry_run),
        "inputs": {
            "sourcesConfigPath": repo_relative(sources_config_path),
            "approvedOnly": bool(args.approved_only),
        },
        "outputs": {
            "cardsPath": repo_relative(cards_path),
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_markdown_path),
        },
        "sourcePolicyCount": len(policies),
        "approvedPolicyCount": approved_count,
        "newEvidenceCardCount": len(cards),
        "countsByLayer": dict(sorted(counts_by_layer.items())),
        "countsByFamily": dict(sorted(counts_by_family.items())),
        "countsByTrustTier": dict(sorted(counts_by_trust_tier.items())),
        "sourceResults": source_results,
    }
    write_json(summary_json_path, summary)
    summary_markdown_path.write_text(render_markdown(summary), encoding="utf-8")

    print(f"[build_external_evidence_cards] wrote {cards_path}")
    print(f"[build_external_evidence_cards] wrote {summary_json_path}")
    print(f"[build_external_evidence_cards] sources={len(policies)} cards={len(cards)} canonicalWrites=false")


if __name__ == "__main__":
    main()
