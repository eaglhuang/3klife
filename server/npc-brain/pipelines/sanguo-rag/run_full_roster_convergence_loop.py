from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, pipeline_root, resolve_npc_brain_root, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
NPC_BRAIN_ROOT = resolve_npc_brain_root(REPO_ROOT)

DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_LANE_POLICY_CONFIG = pipeline_config_path(REPO_ROOT, "full-roster-lane-policy.json")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_ROUND_JSON_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OBSERVED_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
PROFILE_CHOICES = ("all", "female-priority", "history-romance")
DEFAULT_PRECISION_POLICY = {
    "laneAllowlist": ["deterministic-repair", "skill-preview", "human-review", "seed-to-card"],
    "laneWeights": {
        "deterministic-repair": 0.35,
        "skill-preview": 0.35,
        "human-review": 0.20,
        "seed-to-card": 0.10,
    },
    "maxPerCluster": 2,
    "minPerLane": 1,
    "genericCandidateBucketSize": 3,
}
AUTO_RETIRED_VERDICTS = {"auto-retired", "auto-retired-reject", "auto-retired-low-roi"}
TRANSIENT_HTTP_STATUS = {408, 425, 429, 500, 502, 503, 504, 520, 522, 524}
TRANSIENT_REASON_KEYWORDS = (
    "timeout",
    "timed out",
    "gateway timeout",
    "gateway time-out",
    "connection reset",
    "connection refused",
    "socket hang up",
    "econnreset",
    "econnrefused",
    "etimedout",
    "eai_again",
    "network error",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def resolve_existing_path(path_text: str | Path, *, fallback_roots: list[Path] | None = None) -> Path:
    base_path = Path(path_text)
    if base_path.is_absolute():
        return base_path

    path_variants = [base_path]
    base_parts = list(base_path.parts)
    if len(base_parts) >= 2 and [part.lower() for part in base_parts[:2]] == ["server", "npc-brain"]:
        stripped = Path(*base_parts[2:])
        if str(stripped):
            path_variants.append(stripped)

    search_roots = [
        REPO_ROOT,
        NPC_BRAIN_ROOT,
        REPO_ROOT.parent,
        NPC_BRAIN_ROOT.parent,
        REPO_ROOT.parent.parent,
        NPC_BRAIN_ROOT.parent.parent,
    ]
    if fallback_roots:
        search_roots.extend(fallback_roots)

    candidates: list[Path] = []
    seen = set()
    for root in search_roots:
        for relative_path in path_variants:
            candidate = (root / relative_path).resolve()
            if candidate not in seen:
                seen.add(candidate)
                candidates.append(candidate)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0] if candidates else resolve_path(base_path)


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


def stable_hash(*parts: Any, length: int = 16) -> str:
    joined = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:length]


def merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_lane_policy(config_path: str | Path | None) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if config_path:
        path = resolve_existing_path(config_path)
        if path.exists():
            loaded = read_json(path)
            if isinstance(loaded, dict):
                payload = loaded
    defaults = payload.get("defaults") if isinstance(payload.get("defaults"), dict) else {}
    return {
        "version": str(payload.get("version") or "1.0.0"),
        "defaults": defaults,
        "profiles": payload.get("profiles") if isinstance(payload.get("profiles"), dict) else {},
    }


def profile_lane_policy(lane_policy: dict[str, Any], profile: str) -> dict[str, Any]:
    defaults = lane_policy.get("defaults") if isinstance(lane_policy.get("defaults"), dict) else {}
    profiles = lane_policy.get("profiles") if isinstance(lane_policy.get("profiles"), dict) else {}
    profile_payload = profiles.get(profile) if isinstance(profiles.get(profile), dict) else {}
    merged = merge_dict(defaults, profile_payload)
    precision = merged.get("precisionSelection") if isinstance(merged.get("precisionSelection"), dict) else {}
    merged["precisionSelection"] = merge_dict(DEFAULT_PRECISION_POLICY, precision)
    return merged


def compact_text(value: Any) -> str:
    text = str(value or "").strip()
    return " ".join(text.split())


def command_text(command: list[str]) -> str:
    return " ".join(command)


def run_command(
    command: list[str],
    *,
    dry_run: bool,
    env_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    if dry_run:
        return {
            "command": command_text(command),
            "returnCode": 0,
            "dryRun": True,
            "stdout": "",
            "stderr": "",
        }
    env = os.environ.copy()
    if env_overrides:
        env.update({str(key): str(value) for key, value in env_overrides.items() if value is not None})
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    return {
        "command": command_text(command),
        "returnCode": result.returncode,
        "dryRun": False,
        "stdout": (result.stdout or "").strip()[-8000:],
        "stderr": (result.stderr or "").strip()[-8000:],
    }


def normalize_status(value: Any) -> str:
    return str(value or "").strip().lower()


def source_rows_from_config(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        return []
    return [row for row in rows if isinstance(row, dict)]


def sanity_check_source_config(path: Path, rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        raise ValueError(f"source config has no sources: {path}")
    raw_text = path.read_text(encoding="utf-8-sig")
    if "\ufffd" in raw_text:
        raise ValueError(f"source config contains replacement char U+FFFD: {path}")

    allowed_status = {"approved", "manual_quote"}
    invalid_status_rows: list[str] = []
    missing_required_rows: list[str] = []
    for row in rows:
        sid = str(row.get("sourceId") or "").strip()
        status = normalize_status(row.get("status"))
        adapter = str(row.get("adapterType") or "").strip().lower()
        if not sid:
            missing_required_rows.append("<missing-sourceId>")
            continue
        if status not in allowed_status:
            invalid_status_rows.append(f"{sid}:{status}")
        if adapter != "manual_quote":
            for required_key in ("baseUrl", "sourceFamily", "sourceLayer"):
                if not str(row.get(required_key) or "").strip():
                    missing_required_rows.append(f"{sid}:{required_key}")

    if invalid_status_rows:
        raise ValueError(
            "external-evidence-sources.json 只允許 approved/manual_quote。"
            f" invalid={', '.join(invalid_status_rows)}"
        )
    if missing_required_rows:
        raise ValueError(f"source config missing required fields: {', '.join(missing_required_rows)}")

    status_counts = Counter(normalize_status(row.get("status")) for row in rows)
    return {
        "sourceCount": len(rows),
        "statusCounts": dict(sorted(status_counts.items())),
        "canonicalWrites": False,
    }


def approved_sources(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [row for row in rows if normalize_status(row.get("status")) in {"approved", "manual_quote"}]


def source_class(row: dict[str, Any]) -> str:
    value = str(row.get("sourceClass") or "").strip()
    if value:
        return value
    adapter = str(row.get("adapterType") or "").strip()
    if adapter in {"wikisource", "ctext", "gutenberg_text", "scan_pdf"}:
        return "primary-text-site"
    if "character" in str(row.get("sourceFamily") or ""):
        return "high-yield-character-site"
    return "community-worldbuilding-site"


def sample_size_for_source(row: dict[str, Any]) -> int:
    cls = source_class(row)
    harvest_policy = row.get("harvestPolicy") if isinstance(row.get("harvestPolicy"), dict) else {}
    max_pages = int(harvest_policy.get("maxPages") or 0)
    if cls == "high-yield-character-site":
        return min(max_pages, 30) if max_pages > 0 else 30
    if cls == "primary-text-site":
        return min(max_pages, 30) if max_pages > 0 else 30
    return min(max_pages, 20) if max_pages > 0 else 20


def external_verdict_bucket(verdict: Any) -> str:
    text = str(verdict or "").strip().lower()
    if text in AUTO_RETIRED_VERDICTS:
        return "reject"
    if text in {"approve", "reject", "manual-only"}:
        return text
    return "reject"


def parse_http_status_token(value: Any) -> int | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    if text.startswith("httpstatus="):
        text = text.split("=", 1)[1].strip()
    try:
        status = int(text)
    except (TypeError, ValueError):
        return None
    return status if status > 0 else None


def is_transient_network_reject(prior_row: dict[str, Any]) -> bool:
    status = parse_http_status_token(prior_row.get("stage1HttpStatus"))
    if status in TRANSIENT_HTTP_STATUS:
        return True

    failure_reasons = prior_row.get("stage1FailureReasons")
    stage2_reasons = prior_row.get("stage2FailureReasons")
    stage3_reasons = prior_row.get("stage3FailureReasons")
    reason_text = compact_text(prior_row.get("stage1Reason")).lower()
    live_status = compact_text(prior_row.get("stage1LiveStatus")).lower()

    # Backward compatibility: old summaries may not carry stage1/stage2 fields.
    summary_path_text = str(prior_row.get("summaryJsonPath") or "").strip()
    if summary_path_text and (status is None or not failure_reasons or not reason_text or not live_status):
        summary_payload = read_json(resolve_existing_path(summary_path_text))
        if isinstance(summary_payload, dict):
            stage1_payload = summary_payload.get("stage1Precheck")
            if isinstance(stage1_payload, dict):
                if status is None:
                    status = parse_http_status_token(stage1_payload.get("httpStatus"))
                if not reason_text:
                    reason_text = compact_text(stage1_payload.get("reason")).lower()
                if not live_status:
                    live_status = compact_text(stage1_payload.get("liveStatus")).lower()
            if not failure_reasons and isinstance(summary_payload.get("stage1FailureReasons"), list):
                failure_reasons = summary_payload.get("stage1FailureReasons")
            if not stage2_reasons and isinstance(summary_payload.get("stage2FailureReasons"), list):
                stage2_reasons = summary_payload.get("stage2FailureReasons")
            if not stage3_reasons and isinstance(summary_payload.get("stage3FailureReasons"), list):
                stage3_reasons = summary_payload.get("stage3FailureReasons")

    if status in TRANSIENT_HTTP_STATUS:
        return True

    if isinstance(failure_reasons, list):
        for token in failure_reasons:
            parsed = parse_http_status_token(token)
            if parsed in TRANSIENT_HTTP_STATUS:
                return True

    combined_parts = [reason_text, live_status]
    if isinstance(failure_reasons, list):
        combined_parts.extend(compact_text(token).lower() for token in failure_reasons)
    if isinstance(stage2_reasons, list):
        combined_parts.extend(compact_text(token).lower() for token in stage2_reasons)
    if isinstance(stage3_reasons, list):
        combined_parts.extend(compact_text(token).lower() for token in stage3_reasons)
    combined_text = " ".join(part for part in combined_parts if part)
    return any(keyword in combined_text for keyword in TRANSIENT_REASON_KEYWORDS)


def previous_source_results_from_manifest(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    summary_path_text = baseline_path(manifest, "externalSummaryPath")
    if not summary_path_text:
        return {}
    summary_path = resolve_existing_path(summary_path_text)
    payload = read_json(summary_path)
    rows = payload.get("sourceResults") if isinstance(payload, dict) else []
    out: dict[str, dict[str, Any]] = {}
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        sid = str(row.get("sourceId") or "").strip()
        if sid:
            out[sid] = row
    return out


def float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def low_roi_for_source(
    *,
    source_class_text: str,
    prior_row: dict[str, Any],
    min_seed_page_high_yield: float,
    min_card_page_high_yield: float,
    min_seed_page_community: float,
    min_card_page_community: float,
    min_primary_cards: int,
    min_primary_seeds: int,
) -> bool:
    fetched_pages = int(prior_row.get("fetchedPageCount") or 0)
    seed_count = int(prior_row.get("seedCount") or 0)
    card_count = int(prior_row.get("candidateCardCount") or 0)
    seed_per_page = float_or_none(prior_row.get("seedPerPage"))
    card_per_page = float_or_none(prior_row.get("candidateCardPerPage"))

    if fetched_pages <= 0 and seed_count <= 0 and card_count <= 0:
        return True

    sclass = str(source_class_text or "").strip().lower()
    if sclass == "primary-text-site":
        return card_count < max(min_primary_cards, 0) and seed_count < max(min_primary_seeds, 0)
    if sclass == "high-yield-character-site":
        if seed_per_page is None and card_per_page is None:
            return seed_count <= 0 and card_count <= 0
        seed_low = seed_per_page is not None and seed_per_page < min_seed_page_high_yield
        card_low = card_per_page is not None and card_per_page < min_card_page_high_yield
        return seed_low or card_low
    # community-worldbuilding-site
    if seed_per_page is None and card_per_page is None:
        return seed_count <= 0 and card_count <= 0
    seed_low = seed_per_page is not None and seed_per_page < min_seed_page_community
    card_low = card_per_page is not None and card_per_page < min_card_page_community
    return seed_low or card_low


def apply_source_roi_policy(
    *,
    sources: list[dict[str, Any]],
    prior_results: dict[str, dict[str, Any]],
    enable_roi_policy: bool,
    auto_retire_reject: bool,
    downsample_low_roi: bool,
    low_roi_sample_factor: float,
    min_seed_page_high_yield: float,
    min_card_page_high_yield: float,
    min_seed_page_community: float,
    min_card_page_community: float,
    min_primary_cards: int,
    min_primary_seeds: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    prepared: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []
    for source in sources:
        row = dict(source)
        sid = str(row.get("sourceId") or "").strip()
        adapter = str(row.get("adapterType") or "").strip().lower()
        sclass = source_class(row)
        base_sample = sample_size_for_source(row)
        decision: dict[str, Any] = {
            "sourceId": sid,
            "sourceClass": sclass,
            "baseSampleSize": base_sample,
            "action": "keep",
            "sampleSize": base_sample,
            "reason": "default",
            "fromPriorSummary": bool(sid and sid in prior_results),
        }

        if adapter == "manual_quote":
            row["__sampleSizeOverride"] = 0
            row["__roiPolicyAction"] = "manual-keep"
            row["__roiPolicyReason"] = "manual_quote source"
            decision["action"] = "manual-keep"
            decision["sampleSize"] = 0
            decision["reason"] = "manual_quote source"
            prepared.append(row)
            decisions.append(decision)
            continue

        prior = prior_results.get(sid) if sid else None
        if not enable_roi_policy or prior is None:
            row["__sampleSizeOverride"] = base_sample
            row["__roiPolicyAction"] = "keep"
            row["__roiPolicyReason"] = "default"
            prepared.append(row)
            decisions.append(decision)
            continue

        prior_verdict_raw = str(prior.get("finalVerdict") or "").strip().lower()
        if prior_verdict_raw in AUTO_RETIRED_VERDICTS and sclass == "primary-text-site":
            row["__sampleSizeOverride"] = base_sample
            row["__roiPolicyAction"] = "retry-stale-auto-retire"
            row["__roiPolicyReason"] = "prior auto-retired verdict is treated as stale for primary-text; retry allowed"
            decision["action"] = "retry-stale-auto-retire"
            decision["sampleSize"] = base_sample
            decision["reason"] = "prior auto-retired verdict is treated as stale for primary-text; retry allowed"
            prepared.append(row)
            decisions.append(decision)
            continue

        prior_verdict = external_verdict_bucket(prior.get("finalVerdict"))
        prior_transient_reject = is_transient_network_reject(prior)
        if auto_retire_reject and prior_verdict == "reject" and not prior_transient_reject:
            row["__skipRoi"] = True
            row["__sampleSizeOverride"] = 0
            row["__roiPolicyAction"] = "auto-retired-reject"
            row["__roiPolicyReason"] = f"prior verdict={prior.get('finalVerdict')}"
            decision["action"] = "auto-retired-reject"
            decision["sampleSize"] = 0
            decision["reason"] = f"prior verdict={prior.get('finalVerdict')}"
            prepared.append(row)
            decisions.append(decision)
            continue
        if auto_retire_reject and prior_verdict == "reject" and prior_transient_reject:
            row["__sampleSizeOverride"] = base_sample
            row["__roiPolicyAction"] = "retry-transient-reject"
            row["__roiPolicyReason"] = "prior reject appears transient network failure; retry allowed"
            decision["action"] = "retry-transient-reject"
            decision["sampleSize"] = base_sample
            decision["reason"] = "prior reject appears transient network failure; retry allowed"
            prepared.append(row)
            decisions.append(decision)
            continue

        low_roi = low_roi_for_source(
            source_class_text=sclass,
            prior_row=prior,
            min_seed_page_high_yield=min_seed_page_high_yield,
            min_card_page_high_yield=min_card_page_high_yield,
            min_seed_page_community=min_seed_page_community,
            min_card_page_community=min_card_page_community,
            min_primary_cards=min_primary_cards,
            min_primary_seeds=min_primary_seeds,
        )
        if downsample_low_roi and low_roi and base_sample > 0:
            scaled = int(round(base_sample * max(min(low_roi_sample_factor, 1.0), 0.05)))
            sample_override = min(base_sample, max(scaled, 1))
            row["__sampleSizeOverride"] = sample_override
            row["__roiPolicyAction"] = "downsample-low-roi"
            row["__roiPolicyReason"] = (
                f"prior seed/page={prior.get('seedPerPage')} card/page={prior.get('candidateCardPerPage')} "
                f"seed={prior.get('seedCount')} card={prior.get('candidateCardCount')}"
            )
            decision["action"] = "downsample-low-roi"
            decision["sampleSize"] = sample_override
            decision["reason"] = (
                f"prior seed/page={prior.get('seedPerPage')} card/page={prior.get('candidateCardPerPage')} "
                f"seed={prior.get('seedCount')} card={prior.get('candidateCardCount')}"
            )
        else:
            row["__sampleSizeOverride"] = base_sample
            row["__roiPolicyAction"] = "keep"
            row["__roiPolicyReason"] = "roi ok or policy disabled"
            decision["action"] = "keep"
            decision["sampleSize"] = base_sample
            decision["reason"] = "roi ok or policy disabled"
        prepared.append(row)
        decisions.append(decision)
    return prepared, decisions


def read_baseline_manifest(path_text: str | None) -> dict[str, Any]:
    if not path_text:
        return {}
    path = resolve_existing_path(path_text)
    if not path.exists():
        raise FileNotFoundError(f"baseline manifest not found: {path}")
    payload = read_json(path)
    return payload if isinstance(payload, dict) else {}


def baseline_path(manifest: dict[str, Any], *keys: str) -> str | None:
    paths = manifest.get("paths") if isinstance(manifest.get("paths"), dict) else manifest
    if not isinstance(paths, dict):
        return None
    for key in keys:
        value = paths.get(key)
        if value:
            return str(value)
    return None


def load_roster_names(path: Path) -> dict[str, str]:
    payload = read_json(path)
    if not isinstance(payload, list):
        return {}
    names: dict[str, str] = {}
    for row in payload:
        if not isinstance(row, dict):
            continue
        general_id = str(row.get("id") or "").strip()
        if general_id:
            names[general_id] = str(row.get("name") or general_id)
    return names


def collect_generic_clues(path: Path) -> dict[str, list[dict[str, Any]]]:
    by_general: dict[str, list[dict[str, Any]]] = {}
    for row in read_jsonl(path):
        participants = [str(item or "").strip() for item in (row.get("generalIds") or []) if str(item or "").strip()]
        clue = {
            "eventKey": str(row.get("eventKey") or row.get("candidateId") or "").strip(),
            "sourceQuote": str(row.get("sourceQuote") or "").strip(),
            "summary": str(row.get("summary") or "").strip(),
            "sourceRefs": list(row.get("sourceRefs") or []),
            "missingFields": list(row.get("missingFields") or []),
            "location": row.get("location"),
            "relationshipEdges": list(row.get("relationshipEdges") or []),
            "participants": participants,
        }
        for raw_id in row.get("generalIds") or []:
            general_id = str(raw_id or "").strip()
            if general_id:
                by_general.setdefault(general_id, []).append(clue)
    return by_general


def merge_cards(paths: list[Path]) -> list[dict[str, Any]]:
    def card_score(row: dict[str, Any]) -> tuple[int, int, int, int, int, int, int, int]:
        general_count = sum(1 for raw_id in (row.get("generalIds") or []) if str(raw_id or "").strip())
        family_count = sum(1 for item in (row.get("crossSiteSourceFamilies") or []) if str(item or "").strip())
        quote_length = len(str(row.get("quote") or row.get("translatedTraditionalText") or "").strip())
        non_empty_fields = sum(1 for value in row.values() if value not in (None, "", [], {}, ()))
        return (
            1 if str(row.get("claimType") or "").strip().lower() == "relationship" else 0,
            general_count,
            family_count,
            1 if row.get("locator") else 0,
            1 if row.get("textHash") else 0,
            1 if (row.get("sourcePolicyId") or row.get("sourceId")) else 0,
            quote_length,
            non_empty_fields,
        )

    merged: dict[str, dict[str, Any]] = {}
    for path in paths:
        for row in read_jsonl(path):
            key = str(row.get("evidenceId") or stable_hash(row))
            existing = merged.get(key)
            if existing is None or card_score(row) > card_score(existing):
                merged[key] = row
    rows = list(merged.values())
    rows.sort(key=lambda row: (str(row.get("sourcePolicyId") or row.get("sourceFamily") or ""), str(row.get("evidenceId") or "")))
    return rows


def existing_paths(paths: list[Path]) -> list[Path]:
    output: list[Path] = []
    seen: set[Path] = set()
    for path in paths:
        if not isinstance(path, Path) or not path.exists():
            continue
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        output.append(path)
    return output


def ranking_source_key(path: Path) -> str:
    payload = read_json(path)
    if isinstance(payload, dict):
        site_reliability = payload.get("siteReliability")
        if isinstance(site_reliability, list):
            for row in site_reliability:
                if not isinstance(row, dict):
                    continue
                source_id = str(row.get("sourceId") or "").strip()
                if source_id:
                    return source_id
        ranked_rows = payload.get("rankedSeeds")
        if isinstance(ranked_rows, list):
            for row in ranked_rows[:5]:
                if not isinstance(row, dict):
                    continue
                source_id = str(row.get("sourceId") or row.get("sourceFamily") or "").strip()
                if source_id:
                    return source_id
    return f"path:{path.resolve()}"


def merge_ranking_paths(*groups: list[Path]) -> list[Path]:
    by_source: dict[str, Path] = {}
    for paths in groups:
        for path in paths:
            if not isinstance(path, Path) or not path.exists():
                continue
            by_source[ranking_source_key(path)] = path
    return existing_paths(list(by_source.values()))


def collect_external_artifacts_from_manifest(manifest: dict[str, Any]) -> dict[str, list[Path]]:
    card_paths: list[Path] = []
    ranking_paths: list[Path] = []

    for key in ("externalCardsPath", "globalCandidateCardsPath"):
        path_text = baseline_path(manifest, key)
        if not path_text:
            continue
        candidate = resolve_existing_path(path_text)
        if candidate.exists():
            card_paths.append(candidate)

    for key in ("globalSeedRankingPath", "globalSeedRankingJsonPath"):
        path_text = baseline_path(manifest, key)
        if not path_text:
            continue
        candidate = resolve_existing_path(path_text)
        if candidate.exists():
            ranking_paths.append(candidate)

    summary_path_text = baseline_path(manifest, "externalSummaryPath")
    if summary_path_text:
        summary_path = resolve_existing_path(summary_path_text)
        summary_payload = read_json(summary_path)
        source_rows = summary_payload.get("sourceResults") if isinstance(summary_payload, dict) else []
        if isinstance(source_rows, list):
            for row in source_rows:
                if not isinstance(row, dict):
                    continue
                summary_json_text = str(row.get("summaryJsonPath") or "").strip()
                if not summary_json_text:
                    continue
                try:
                    benchmark_payload = read_json(resolve_existing_path(summary_json_text))
                except Exception:
                    continue
                stage3 = benchmark_payload.get("stage3Yield") if isinstance(benchmark_payload, dict) else {}
                outputs = stage3.get("outputs") if isinstance(stage3, dict) else {}
                if not isinstance(outputs, dict):
                    continue
                ranking_json_text = str(outputs.get("rankingJson") or "").strip()
                if ranking_json_text:
                    ranking_candidate = resolve_existing_path(ranking_json_text)
                    if ranking_candidate.exists():
                        ranking_paths.append(ranking_candidate)
                candidate_summary_text = str(outputs.get("candidateSummary") or "").strip()
                if candidate_summary_text:
                    candidate_summary_path = resolve_existing_path(candidate_summary_text)
                    candidate_cards_path = candidate_summary_path.with_name("candidate-evidence-cards.jsonl")
                    if candidate_cards_path.exists():
                        card_paths.append(candidate_cards_path)

    return {
        "cardPaths": existing_paths(card_paths),
        "rankingPaths": merge_ranking_paths(ranking_paths),
    }


def collect_round_json_paths_from_progress_payload(progress_payload: dict[str, Any]) -> list[Path]:
    round_paths: list[Path] = []
    if not isinstance(progress_payload, dict):
        return []

    inputs = progress_payload.get("inputs") if isinstance(progress_payload.get("inputs"), dict) else {}
    round_json_values = inputs.get("roundJsonPaths") if isinstance(inputs, dict) else []
    if isinstance(round_json_values, list):
        for value in round_json_values:
            path_text = str(value or "").strip()
            if not path_text:
                continue
            candidate = resolve_existing_path(path_text)
            if candidate.exists():
                round_paths.append(candidate)

    completion = progress_payload.get("completion") if isinstance(progress_payload.get("completion"), dict) else {}
    round_summary = completion.get("roundSummary") if isinstance(completion, dict) else {}
    included_rounds = round_summary.get("includedRounds") if isinstance(round_summary, dict) else []
    if isinstance(included_rounds, list):
        for row in included_rounds:
            if not isinstance(row, dict):
                continue
            path_text = str(row.get("path") or "").strip()
            if not path_text:
                continue
            candidate = resolve_existing_path(path_text)
            if candidate.exists():
                round_paths.append(candidate)
    return existing_paths(round_paths)


def collect_round_json_paths_from_root(round_json_root: Path, *, limit: int = 6) -> list[Path]:
    if limit <= 0 or not round_json_root.exists() or not round_json_root.is_dir():
        return []
    candidates = sorted(
        round_json_root.glob("*.batch.json"),
        key=lambda path: path.stat().st_mtime if path.exists() else 0.0,
        reverse=True,
    )
    return existing_paths(candidates[:limit])


def collect_round_json_paths_from_manifest(
    manifest: dict[str, Any],
    *,
    _visited_manifest_paths: set[Path] | None = None,
    _visited_progress_paths: set[Path] | None = None,
) -> list[Path]:
    if not isinstance(manifest, dict):
        return []

    visited_manifest_paths = _visited_manifest_paths if _visited_manifest_paths is not None else set()
    visited_progress_paths = _visited_progress_paths if _visited_progress_paths is not None else set()
    round_paths: list[Path] = []

    manifest_paths = manifest.get("paths") if isinstance(manifest.get("paths"), dict) else {}
    direct_round_jsons = manifest_paths.get("roundJsonPaths") if isinstance(manifest_paths, dict) else []
    if isinstance(direct_round_jsons, list):
        for value in direct_round_jsons:
            path_text = str(value or "").strip()
            if not path_text:
                continue
            candidate = resolve_existing_path(path_text)
            if candidate.exists():
                round_paths.append(candidate)

    progress_path_text = baseline_path(manifest, "progressPath", "progressJsonPath")
    if progress_path_text:
        progress_path = resolve_existing_path(progress_path_text)
        resolved_progress_path = progress_path.resolve()
        if progress_path.exists() and resolved_progress_path not in visited_progress_paths:
            visited_progress_paths.add(resolved_progress_path)
            round_paths.extend(collect_round_json_paths_from_progress_payload(read_json(progress_path)))

    nested_manifest_values: list[str] = []
    for value in [
        manifest.get("initialBaselineManifest"),
        manifest.get("finalThreeLaneBaselineManifest"),
        manifest_paths.get("precisionBaselineManifestPath") if isinstance(manifest_paths, dict) else None,
        manifest_paths.get("threeLaneFinalBaselineManifest") if isinstance(manifest_paths, dict) else None,
    ]:
        path_text = str(value or "").strip()
        if path_text:
            nested_manifest_values.append(path_text)

    for manifest_text in nested_manifest_values:
        manifest_path = resolve_existing_path(manifest_text)
        resolved_manifest_path = manifest_path.resolve()
        if not manifest_path.exists() or resolved_manifest_path in visited_manifest_paths:
            continue
        visited_manifest_paths.add(resolved_manifest_path)
        nested_manifest = read_baseline_manifest(str(manifest_path))
        round_paths.extend(
            collect_round_json_paths_from_manifest(
                nested_manifest,
                _visited_manifest_paths=visited_manifest_paths,
                _visited_progress_paths=visited_progress_paths,
            )
        )

    return existing_paths(round_paths)


def merge_external_artifacts(
    base: dict[str, list[Path]] | None,
    extra: dict[str, list[Path]] | None,
) -> dict[str, list[Path]]:
    base = base or {}
    extra = extra or {}
    return {
        "cardPaths": existing_paths([*(base.get("cardPaths") or []), *(extra.get("cardPaths") or [])]),
        "rankingPaths": merge_ranking_paths(base.get("rankingPaths") or [], extra.get("rankingPaths") or []),
    }


def merge_relationship_edges(paths: list[Path]) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for path in paths:
        for row in read_jsonl(path):
            refs = row.get("evidenceRefs") or []
            ref0 = str(refs[0] if refs else "")
            key = (
                str(row.get("fromId") or ""),
                str(row.get("toId") or ""),
                str(row.get("type") or ""),
                ref0,
            )
            existing = merged.get(key)
            if existing is None:
                merged[key] = row
                continue
            if float(row.get("edgeConfidence") or 0.0) > float(existing.get("edgeConfidence") or 0.0):
                merged[key] = row
    rows = list(merged.values())
    rows.sort(
        key=lambda row: (
            row.get("chapterNo") is None,
            row.get("chapterNo") if row.get("chapterNo") is not None else 10**9,
            str((row.get("evidenceRefs") or [""])[0]),
            str(row.get("fromId") or ""),
            str(row.get("type") or ""),
            str(row.get("toId") or ""),
        )
    )
    return rows


def merge_seed_rows(paths: list[Path]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for path in paths:
        for row in read_jsonl(path):
            source_id = str(row.get("sourceId") or row.get("sourceFamily") or "").strip()
            person_id = str(row.get("generalId") or row.get("candidatePersonId") or "").strip()
            angle = str(row.get("angleType") or "").strip()
            seed_text = str(row.get("seedText") or row.get("quote") or "").strip()
            seed_id = str(row.get("seedId") or stable_hash(source_id, person_id, angle, seed_text))
            normalized = dict(row)
            normalized["seedId"] = seed_id
            merged[seed_id] = normalized
    rows = list(merged.values())
    rows.sort(
        key=lambda row: (
            str(row.get("sourceId") or row.get("sourceFamily") or ""),
            str(row.get("generalId") or row.get("candidatePersonId") or ""),
            str(row.get("angleType") or ""),
            str(row.get("seedId") or ""),
        )
    )
    return rows


def collect_manual_source_metrics(
    *,
    manual_source_ids: set[str],
    card_paths: list[Path],
    ranking_paths: list[Path],
    injection_root: Path,
) -> dict[str, dict[str, Any]]:
    metrics: dict[str, dict[str, Any]] = {
        sid: {
            "seedRows": {},
            "cardIds": set(),
            "canonicalPeople": set(),
            "shadowPeople": set(),
            "manualSeedJsonlPath": None,
            "manualSeedInjected": False,
        }
        for sid in manual_source_ids
    }
    if not metrics:
        return {}

    for card_path in card_paths:
        for row in read_jsonl(card_path):
            source_id = str(row.get("sourcePolicyId") or row.get("sourceId") or "").strip()
            if source_id not in metrics:
                continue
            bucket = metrics[source_id]
            evidence_id = str(row.get("evidenceId") or "").strip()
            if not evidence_id:
                evidence_id = f"card:auto:{stable_hash(source_id, row.get('generalIds'), row.get('quote'), row.get('locator'))}"
            bucket["cardIds"].add(evidence_id)
            general_ids = row.get("generalIds") or []
            if not isinstance(general_ids, list):
                continue
            for raw_general_id in general_ids:
                general_id = str(raw_general_id or "").strip()
                if not general_id:
                    continue
                if general_id.startswith("shadow:"):
                    bucket["shadowPeople"].add(general_id)
                else:
                    bucket["canonicalPeople"].add(general_id)

    for ranking_path in ranking_paths:
        payload = read_json(ranking_path)
        ranked = payload.get("rankedSeeds") if isinstance(payload, dict) else []
        if not isinstance(ranked, list):
            continue
        for row in ranked:
            if not isinstance(row, dict):
                continue
            source_id = str(row.get("sourceId") or "").strip()
            if source_id not in metrics:
                continue
            bucket = metrics[source_id]
            seed_id = str(row.get("seedId") or "").strip()
            if not seed_id:
                seed_id = f"seed:auto:{stable_hash(source_id, row.get('generalId'), row.get('candidatePersonId'), row.get('seedText'))}"
            normalized = dict(row)
            normalized["seedId"] = seed_id
            bucket["seedRows"][seed_id] = normalized
            general_id = str(normalized.get("generalId") or "").strip()
            candidate_person_id = str(normalized.get("candidatePersonId") or "").strip()
            if general_id:
                bucket["canonicalPeople"].add(general_id)
            elif candidate_person_id:
                bucket["shadowPeople"].add(candidate_person_id)

    injection_root.mkdir(parents=True, exist_ok=True)
    summarized: dict[str, dict[str, Any]] = {}
    for sid, bucket in metrics.items():
        rows = list(bucket["seedRows"].values())
        rows.sort(
            key=lambda row: (
                str(row.get("sourceId") or ""),
                str(row.get("generalId") or row.get("candidatePersonId") or ""),
                str(row.get("angleType") or ""),
                str(row.get("seedId") or ""),
            )
        )
        manual_seed_path: Path | None = None
        if rows:
            manual_seed_path = injection_root / f"{sid}.jsonl"
            write_jsonl(manual_seed_path, rows)
        summarized[sid] = {
            "seedCount": len(rows),
            "candidateCardCount": len(bucket["cardIds"]),
            "canonicalPeople": len(bucket["canonicalPeople"]),
            "shadowPeople": len(bucket["shadowPeople"]),
            "manualSeedJsonlPath": repo_relative(manual_seed_path) if manual_seed_path else None,
            "manualSeedInjected": bool(rows),
        }
    return summarized


def build_seed_to_card_priority_allowlist(
    *,
    scoreboard_path: Path,
    limit: int,
    output_path: Path,
    extra_person_ids: list[str] | None = None,
) -> tuple[list[str], str]:
    payload = read_json(scoreboard_path)
    rows = payload.get("rows") if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        rows = []
    explicit_ids = [str(person_id or "").strip() for person_id in (extra_person_ids or [])]
    explicit_ids = [person_id for person_id in explicit_ids if person_id]
    if limit <= 0 and not explicit_ids:
        return [], "disabled(limit<=0)"

    candidates: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        if str(row.get("nextLane") or "").strip() != "seed-to-card":
            continue
        person_id = str(row.get("generalId") or row.get("candidatePersonId") or "").strip()
        if not person_id:
            continue
        candidates.append(row)

    candidates.sort(
        key=lambda row: (
            -float(row.get("priorityScore") or 0.0),
            -float(row.get("worldbuildingUsabilityScore") or 0.0),
            -float(row.get("historicalTrustScore") or 0.0),
            -int(row.get("seedCount") or 0),
            -int(row.get("cardCount") or 0),
            str(row.get("generalId") or row.get("candidatePersonId") or ""),
        )
    )
    selected_ids: list[str] = []
    for person_id in explicit_ids:
        if person_id not in selected_ids:
            selected_ids.append(person_id)
    effective_limit = max(int(limit), len(selected_ids))
    for row in candidates:
        person_id = str(row.get("generalId") or row.get("candidatePersonId") or "").strip()
        if not person_id or person_id in selected_ids:
            continue
        selected_ids.append(person_id)
        if len(selected_ids) >= effective_limit:
            break

    if not selected_ids:
        return [], "no-seed-to-card-candidates"

    write_json(output_path, {"personIds": selected_ids, "count": len(selected_ids), "canonicalWrites": False})
    if explicit_ids:
        return selected_ids, f"ok+explicit({len(explicit_ids)})"
    return selected_ids, "ok"


def run_global_seed_pipeline(
    *,
    round_root: Path,
    round_id: str,
    scoreboard_path: Path | None,
    seed_paths: list[Path],
    seed_to_card_priority_limit: int,
    seed_to_card_priority_extra_ids: list[str] | None,
    seed_to_card_min_score: float,
    dry_run: bool,
    overwrite: bool,
) -> dict[str, Any]:
    pipeline_root = round_root / "external-evidence" / "global-standard-pipeline"
    merged_seed_path = pipeline_root / "merged-manual-evidence-seeds.jsonl"
    harvested_seed_path = pipeline_root / "external-evidence-seeds.jsonl"
    ranking_path = pipeline_root / "external-evidence-seed-ranking.json"
    candidate_cards_path = pipeline_root / "candidate-evidence-cards.jsonl"
    candidate_summary_path = pipeline_root / "candidate-evidence-card-summary.json"
    allowlist_path = pipeline_root / "seed-to-card-priority-person-allowlist.json"

    if not scoreboard_path or not scoreboard_path.exists():
        return {
            "enabled": False,
            "reason": "missing-scoreboard-json",
            "seedInputCount": len(seed_paths),
            "seedInputPaths": [repo_relative(path) for path in seed_paths],
            "mergedSeedPath": None,
            "harvestedSeedPath": None,
            "rankingPath": None,
            "candidateCardsPath": None,
            "candidateSummaryPath": None,
            "harvestCommand": None,
            "scoreCommand": None,
            "promoteCommand": None,
            "seedToCardPriorityLimit": int(seed_to_card_priority_limit),
            "seedToCardMinScore": float(seed_to_card_min_score),
            "seedToCardPrioritySelectedCount": 0,
            "seedToCardPriorityAllowlistPath": None,
            "seedToCardPriorityReason": "missing-scoreboard-json",
        }

    seed_rows = merge_seed_rows(seed_paths)
    if not seed_rows:
        return {
            "enabled": False,
            "reason": "no-seed-input",
            "seedInputCount": 0,
            "seedInputPaths": [repo_relative(path) for path in seed_paths],
            "mergedSeedPath": None,
            "harvestedSeedPath": None,
            "rankingPath": None,
            "candidateCardsPath": None,
            "candidateSummaryPath": None,
            "harvestCommand": None,
            "scoreCommand": None,
            "promoteCommand": None,
            "seedToCardPriorityLimit": int(seed_to_card_priority_limit),
            "seedToCardMinScore": float(seed_to_card_min_score),
            "seedToCardPrioritySelectedCount": 0,
            "seedToCardPriorityAllowlistPath": None,
            "seedToCardPriorityReason": "no-seed-input",
        }

    write_jsonl(merged_seed_path, seed_rows)

    allowlist_ids, allowlist_reason = build_seed_to_card_priority_allowlist(
        scoreboard_path=scoreboard_path,
        limit=int(seed_to_card_priority_limit),
        output_path=allowlist_path,
        extra_person_ids=seed_to_card_priority_extra_ids,
    )

    harvest_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "harvest_external_evidence_seeds.py").resolve()),
        "--no-default-external-evidence-cards",
        "--manual-seeds-jsonl",
        repo_relative(merged_seed_path),
        "--scoreboard-json",
        repo_relative(scoreboard_path),
        "--output-root",
        repo_relative(pipeline_root),
    ]
    if overwrite:
        harvest_command.append("--overwrite")
    harvest_result = run_command(harvest_command, dry_run=dry_run)

    score_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "score_external_evidence_seeds.py").resolve()),
        "--seeds-jsonl",
        repo_relative(harvested_seed_path),
        "--output-root",
        repo_relative(pipeline_root),
    ]
    if overwrite:
        score_command.append("--overwrite")
    score_result = run_command(score_command, dry_run=dry_run)

    promote_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "promote_seed_to_evidence_card.py").resolve()),
        "--ranking-json",
        repo_relative(ranking_path),
        "--output-root",
        repo_relative(pipeline_root),
        "--min-score",
        str(float(seed_to_card_min_score)),
    ]
    if allowlist_ids:
        promote_command.extend(["--person-allowlist-json", repo_relative(allowlist_path)])
    if overwrite:
        promote_command.append("--overwrite")
    promote_result = run_command(promote_command, dry_run=dry_run)

    return {
        "enabled": True,
        "reason": None,
        "seedInputCount": len(seed_rows),
        "seedInputPaths": [repo_relative(path) for path in seed_paths],
        "mergedSeedPath": repo_relative(merged_seed_path),
        "harvestedSeedPath": repo_relative(harvested_seed_path),
        "rankingPath": repo_relative(ranking_path),
        "candidateCardsPath": repo_relative(candidate_cards_path),
        "candidateSummaryPath": repo_relative(candidate_summary_path),
        "harvestCommand": harvest_result,
        "scoreCommand": score_result,
        "promoteCommand": promote_result,
        "seedToCardPriorityLimit": int(seed_to_card_priority_limit),
        "seedToCardMinScore": float(seed_to_card_min_score),
        "seedToCardPrioritySelectedCount": len(allowlist_ids),
        "seedToCardPriorityAllowlistPath": repo_relative(allowlist_path) if allowlist_ids else None,
        "seedToCardPriorityReason": allowlist_reason,
    }


def build_external_summary(
    *,
    run_id: str,
    source_results: list[dict[str, Any]],
    merged_cards: list[dict[str, Any]],
    cards_path: Path,
    json_path: Path,
    md_path: Path,
    roi_md_path: Path,
) -> dict[str, Any]:
    by_layer = Counter(str(row.get("sourceLayer") or "") for row in merged_cards if str(row.get("sourceLayer") or "").strip())
    by_family = Counter(str(row.get("sourceFamily") or "") for row in merged_cards if str(row.get("sourceFamily") or "").strip())
    by_tier = Counter(str(row.get("trustTier") or "") for row in merged_cards if str(row.get("trustTier") or "").strip())
    verdict_counter = Counter(external_verdict_bucket(row.get("finalVerdict")) for row in source_results)
    roi_action_counter = Counter(str(row.get("roiPolicyAction") or "keep") for row in source_results)
    auto_retired_count = sum(
        1 for row in source_results if str(row.get("finalVerdict") or "").strip().lower() in AUTO_RETIRED_VERDICTS
    )
    summary = {
        "version": "2.1.0",
        "generatedAt": utc_now(),
        "mode": "external-evidence-convergence-summary",
        "canonicalWrites": False,
        "runId": run_id,
        "outputs": {
            "cardsPath": repo_relative(cards_path),
            "summaryJsonPath": repo_relative(json_path),
            "summaryMarkdownPath": repo_relative(md_path),
            "roiMarkdownPath": repo_relative(roi_md_path),
        },
        "sourceCount": len(source_results),
        "approveCount": verdict_counter.get("approve", 0),
        "rejectCount": verdict_counter.get("reject", 0),
        "manualOnlyCount": verdict_counter.get("manual-only", 0),
        "autoRetiredCount": auto_retired_count,
        "manualEvidenceCountTotal": sum(int(row.get("manualEvidenceCount") or 0) for row in source_results),
        "newEvidenceCardCount": len(merged_cards),
        "countsByLayer": dict(sorted(by_layer.items())),
        "countsByFamily": dict(sorted(by_family.items())),
        "countsByTrustTier": dict(sorted(by_tier.items())),
        "roiActionCounts": dict(sorted(roi_action_counter.items())),
        "sourceResults": source_results,
    }
    lines = [
        "# External Evidence Summary",
        "",
        f"- Run ID: `{run_id}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Source Count: `{summary['sourceCount']}`",
        f"- Approve/Reject/Manual: `{summary['approveCount']}/{summary['rejectCount']}/{summary['manualOnlyCount']}`",
        f"- Auto Retired: `{summary['autoRetiredCount']}`",
        f"- Candidate Cards: `{summary['newEvidenceCardCount']}`",
        "",
        "## Source Verdicts",
        "",
        "| Source | Class | ROI Action | Verdict | Stage1 | Stage2 | Stage3 | ManualEvidence | Seeds | Cards |",
        "|---|---|---|---|---|---|---|---:|---:|---:|",
    ]
    for row in source_results:
        lines.append(
            "| `{sid}` | `{sclass}` | `{roi}` | `{verdict}` | `{s1}` | `{s2}` | `{s3}` | `{manual}` | `{seeds}` | `{cards}` |".format(
                sid=row.get("sourceId"),
                sclass=row.get("sourceClass"),
                roi=row.get("roiPolicyAction") or "keep",
                verdict=row.get("finalVerdict"),
                s1=row.get("stage1Passed"),
                s2=row.get("stage2Passed"),
                s3=row.get("stage3Passed"),
                manual=row.get("manualEvidenceCount") or 0,
                seeds=row.get("seedCount") or 0,
                cards=row.get("candidateCardCount") or 0,
            )
        )
    lines.extend(
        [
            "",
            "## Source ROI",
            "",
            "| Source | ROI Action | Sample Pages | Fetched Pages | ManualEvidence | Seed/Page | Card/Page | Canonical People | Shadow People |",
            "|---|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for row in source_results:
        lines.append(
            "| `{sid}` | `{roi}` | `{sample}` | `{fetched}` | `{manual}` | `{seed_page}` | `{card_page}` | `{canon}` | `{shadow}` |".format(
                sid=row.get("sourceId"),
                roi=row.get("roiPolicyAction") or "keep",
                sample=row.get("samplePageCount") or 0,
                fetched=row.get("fetchedPageCount") or 0,
                manual=row.get("manualEvidenceCount") or 0,
                seed_page=row.get("seedPerPage") if row.get("seedPerPage") is not None else "-",
                card_page=row.get("candidateCardPerPage") if row.get("candidateCardPerPage") is not None else "-",
                canon=row.get("canonicalPeople") or 0,
                shadow=row.get("shadowPeople") or 0,
            )
        )
    lines.append("")
    write_json(json_path, summary)
    md_text = "\n".join(lines)
    md_path.write_text(md_text, encoding="utf-8")
    roi_md_path.write_text(md_text, encoding="utf-8")
    return summary


def build_rule_proposals(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lane_counts = Counter(str(row.get("nextLane") or "evidence-discovery") for row in rows)
    missing_location = sum(1 for row in rows if "location" in (row.get("missingFields") or []))
    missing_relationship = sum(1 for row in rows if "relationshipEdges" in (row.get("missingFields") or []))
    proposals: list[dict[str, Any]] = [
        {
            "proposalId": "rule:deterministic-location-repair",
            "proposalType": "deterministic-repair",
            "summary": "補強 location 決定型修補規則，先跑 deterministic repair 再進 skill preview。",
            "expectedImpact": f"預估可消化缺 location 個案約 {missing_location} 筆。",
        },
        {
            "proposalId": "rule:relationship-edge-repair",
            "proposalType": "deterministic-repair",
            "summary": "對 relationshipEdges 缺漏加強 pattern 與 gate，降低 B/C 殘差。",
            "expectedImpact": f"預估可消化缺 relationshipEdges 個案約 {missing_relationship} 筆。",
        },
        {
            "proposalId": "rule:evidence-discovery-priority",
            "proposalType": "evidence-discovery",
            "summary": "對 evidence-discovery lane 套用高 ROI 來源優先與女性優先 profile。",
            "expectedImpact": f"目前 evidence-discovery lane 約 {lane_counts.get('evidence-discovery', 0)} 筆。",
        },
    ]
    if lane_counts.get("human-review", 0) > 0:
        proposals.append(
            {
                "proposalId": "rule:human-gate-clustering",
                "proposalType": "review-policy",
                "summary": "人工題目先做 cluster 去重（sourceRefs + location + participants + summary hash）。",
                "expectedImpact": f"目前 human-review lane 約 {lane_counts.get('human-review', 0)} 筆。",
            }
        )
    return proposals


def render_rule_proposals_md(proposals: list[dict[str, Any]]) -> str:
    lines = [
        "# Rule Proposals",
        "",
        "以下提案為本輪自動歸納，需先跑 sandbox/regression 再決定是否併入 extractor。",
        "",
        "| Proposal ID | Type | Summary | Expected Impact |",
        "|---|---|---|---|",
    ]
    for row in proposals:
        lines.append(
            "| `{pid}` | `{ptype}` | {summary} | {impact} |".format(
                pid=row.get("proposalId"),
                ptype=row.get("proposalType"),
                summary=str(row.get("summary") or "").replace("|", "\\|"),
                impact=str(row.get("expectedImpact") or "").replace("|", "\\|"),
            )
        )
    lines.append("")
    return "\n".join(lines)


def build_residual_signature(rows: list[dict[str, Any]]) -> str:
    items = sorted(
        (
            str(row.get("generalId") or ""),
            str(row.get("reviewGrade") or ""),
            str(row.get("nextLane") or ""),
            ",".join(str(field) for field in sorted(row.get("missingFields") or [])),
        )
        for row in rows
        if str(row.get("reviewGrade") or "") != "A"
    )
    return stable_hash(json.dumps(items, ensure_ascii=False, sort_keys=True))


def int_or_none(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def extract_precision_location_metrics(summary_payload: dict[str, Any]) -> dict[str, Any]:
    location_gap_before: int | None = None
    location_gap_after: int | None = None
    location_gap_delta: int | None = None

    location_stats = summary_payload.get("locationGapStats")
    if isinstance(location_stats, dict):
        location_gap_before = int_or_none(location_stats.get("firstRoundAfterA"))
        location_gap_after = int_or_none(location_stats.get("lastRoundAfterAorB"))
        location_gap_delta = int_or_none(location_stats.get("delta"))

    rounds = [row for row in (summary_payload.get("rounds") or []) if isinstance(row, dict)]
    if rounds and (location_gap_before is None or location_gap_after is None):
        first_counts = rounds[0].get("rootCauseCountsAfterRound")
        last_counts = rounds[-1].get("rootCauseCountsAfterReview") or rounds[-1].get("rootCauseCountsAfterRound")
        if isinstance(first_counts, dict):
            location_gap_before = int_or_none(first_counts.get("location gap"))
        if isinstance(last_counts, dict):
            location_gap_after = int_or_none(last_counts.get("location gap"))
        if location_gap_before is not None and location_gap_after is not None:
            location_gap_delta = int(location_gap_after - location_gap_before)

    auto_review_decision_count = 0
    review_decision_applied_count = 0
    for row in rounds:
        auto_review = row.get("autoReviewDecision")
        if isinstance(auto_review, dict):
            auto_review_decision_count += int(auto_review.get("decisionCount") or 0)
        review_apply = row.get("reviewDecisionApplication")
        if isinstance(review_apply, dict):
            review_decision_applied_count += int(review_apply.get("updatedQuestionCount") or 0)

    return {
        "bReviewCount": int(summary_payload.get("bReviewCount") or 0),
        "totalDeltaOverallPercent": float_or_none(summary_payload.get("totalDeltaOverallPercent")),
        "locationGapBefore": location_gap_before,
        "locationGapAfter": location_gap_after,
        "locationGapDelta": location_gap_delta,
        "locationGapImproved": bool(location_gap_delta is not None and location_gap_delta < 0),
        "autoReviewDecisionCount": auto_review_decision_count,
        "reviewDecisionAppliedCount": review_decision_applied_count,
    }


def decide_precision_carry_forward(
    *,
    candidate_path: Path | None,
    metrics: dict[str, Any],
    guard_enabled: bool,
    min_delta: float,
    require_location_improvement: bool,
) -> dict[str, Any]:
    decision = {
        "candidatePath": repo_relative(candidate_path) if candidate_path else None,
        "guardEnabled": bool(guard_enabled),
        "minDeltaRequired": float(min_delta),
        "requireLocationImprovement": bool(require_location_improvement),
        "bReviewCount": int(metrics.get("bReviewCount") or 0),
        "totalDeltaOverallPercent": metrics.get("totalDeltaOverallPercent"),
        "locationGapBefore": metrics.get("locationGapBefore"),
        "locationGapAfter": metrics.get("locationGapAfter"),
        "locationGapDelta": metrics.get("locationGapDelta"),
        "locationGapImproved": bool(metrics.get("locationGapImproved")),
        "applied": False,
        "reason": "not-evaluated",
    }
    if not candidate_path:
        decision["reason"] = "missing-carry-events"
        return decision

    if not guard_enabled:
        decision["applied"] = True
        decision["reason"] = "guard-disabled"
        return decision

    if int(metrics.get("bReviewCount") or 0) <= 0:
        decision["reason"] = "no-b-review-merge"
        return decision

    delta_value = float_or_none(metrics.get("totalDeltaOverallPercent"))
    delta_ok = bool(delta_value is not None and delta_value >= float(min_delta))
    location_improved = bool(metrics.get("locationGapImproved"))
    location_delta_known = metrics.get("locationGapDelta") is not None

    if require_location_improvement:
        if location_delta_known and not location_improved:
            decision["reason"] = "location-gap-not-improved"
            return decision
        if not location_delta_known and not delta_ok:
            decision["reason"] = "location-gap-unknown-and-delta-below-threshold"
            return decision
        decision["applied"] = True
        decision["reason"] = "location-gap-improved" if location_improved else "delta-threshold-pass"
        return decision

    if not (location_improved or delta_ok):
        decision["reason"] = "no-positive-carry-signal"
        return decision

    decision["applied"] = True
    decision["reason"] = "location-gap-improved" if location_improved else "delta-threshold-pass"
    return decision


def run_runtime_readiness(
    *,
    run_root: Path,
    rows: list[dict[str, Any]],
    runtime_mode: str,
    dry_run: bool,
    overwrite: bool,
) -> dict[str, Any]:
    if runtime_mode == "off":
        return {
            "enabled": False,
            "mode": runtime_mode,
            "command": None,
            "returnCode": 0,
            "summaryPath": None,
            "statusCounts": {},
            "failCount": 0,
            "warnCount": 0,
        }

    touched = [str(row.get("generalId") or "").strip() for row in rows if row.get("rosterState") == "canonical"]
    touched = [gid for gid in touched if gid]
    selected = touched[:30] if runtime_mode == "touched" else touched[:80]

    matrix = run_runtime_readiness_matrix_once(
        output_root=run_root / "runtime-readiness",
        general_ids=selected,
        dry_run=dry_run,
        overwrite=overwrite,
    )
    return {
        "enabled": True,
        "mode": runtime_mode,
        "command": matrix.get("command"),
        "returnCode": matrix.get("returnCode"),
        "summaryPath": matrix.get("summaryPath"),
        "statusCounts": dict(matrix.get("statusCounts") or {}),
        "failCount": int(matrix.get("failCount") or 0),
        "warnCount": int(matrix.get("warnCount") or 0),
        "selectedGeneralIds": selected,
        "failGeneralIds": list(matrix.get("failGeneralIds") or []),
        "rows": matrix.get("rows") if isinstance(matrix.get("rows"), list) else [],
    }


def run_runtime_readiness_matrix_once(
    *,
    output_root: Path,
    general_ids: list[str],
    dry_run: bool,
    overwrite: bool,
    env_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_runtime_readiness_matrix.py").resolve()),
        "--output-root",
        repo_relative(output_root),
    ]
    for general_id in general_ids:
        command.extend(["--general-id", str(general_id)])
    if overwrite:
        command.append("--overwrite")
    result = run_command(command, dry_run=dry_run, env_overrides=env_overrides)
    payload = read_json(output_root / "multi-general-readiness.json")
    summary = payload.get("summary") if isinstance(payload, dict) else {}
    rows = payload.get("rows") if isinstance(payload, dict) else []
    row_items = rows if isinstance(rows, list) else []
    fail_general_ids = sorted(
        {
            str(row.get("generalId") or "").strip()
            for row in row_items
            if isinstance(row, dict) and str(row.get("status") or "").strip().lower() == "fail"
        }
    )
    fail_count = int((summary or {}).get("failCount") or 0)
    warn_count = int((summary or {}).get("warnCount") or 0)
    status_counts = dict((summary or {}).get("statusCounts") or {})
    return_code = int(result.get("returnCode") or 0)
    if not dry_run and return_code != 0 and not row_items:
        fallback_ids = [str(gid or "").strip() for gid in general_ids if str(gid or "").strip()]
        fail_general_ids = sorted(set(fallback_ids))
        fail_count = max(fail_count, len(fail_general_ids) if fail_general_ids else 1)
        status_counts["fail"] = fail_count
    return {
        "command": result,
        "returnCode": return_code,
        "summaryPath": repo_relative(output_root / "multi-general-readiness.json"),
        "statusCounts": status_counts,
        "failCount": fail_count,
        "warnCount": warn_count,
        "failGeneralIds": fail_general_ids,
        "rows": row_items,
    }


def runtime_packet_strength(packet: dict[str, Any]) -> int:
    rank = {"strong": 3, "rich": 2, "thin": 1}
    return rank.get(str(packet.get("packetStrength") or "").strip().lower(), 0)


def synth_summary_from_packet(general_id: str, packet: dict[str, Any]) -> str:
    text = compact_text((packet.get("examples") or [None])[0])
    if text:
        return text[:160]
    source_ref = compact_text(packet.get("sourceRef"))
    return f"{general_id} synthetic runtime event from {source_ref or 'source packet'}"


def build_runtime_ref_blitz_synthetic_events(
    *,
    round_id: str,
    output_path: Path,
    fail_general_ids: list[str],
    source_event_packets_path: Path,
    max_events_per_general: int,
) -> dict[str, Any]:
    packets = read_jsonl(source_event_packets_path)
    fail_set = {str(gid or "").strip() for gid in fail_general_ids if str(gid or "").strip()}
    grouped: dict[str, list[dict[str, Any]]] = {gid: [] for gid in fail_set}
    for packet in packets:
        general_ids = [str(gid or "").strip() for gid in (packet.get("generalIds") or []) if str(gid or "").strip()]
        if not general_ids:
            continue
        matched = [gid for gid in general_ids if gid in fail_set]
        if not matched:
            continue
        for gid in matched:
            grouped.setdefault(gid, []).append(packet)

    rows: list[dict[str, Any]] = []
    no_packet_generals: list[str] = []
    created_per_general: dict[str, int] = {}
    max_per_general = max(max_events_per_general, 1)
    for general_id in sorted(fail_set):
        candidates = grouped.get(general_id) or []
        if not candidates:
            no_packet_generals.append(general_id)
            created_per_general[general_id] = 0
            continue
        ranked = sorted(
            candidates,
            key=lambda packet: (
                runtime_packet_strength(packet),
                len(packet.get("angleFamilies") or []),
                len(packet.get("generalIds") or []),
                len(compact_text((packet.get("examples") or [None])[0])),
            ),
            reverse=True,
        )
        used_source_refs: set[str] = set()
        created = 0
        for packet in ranked:
            source_ref = compact_text(packet.get("sourceRef"))
            if not source_ref or source_ref in used_source_refs:
                continue
            used_source_refs.add(source_ref)
            created += 1
            chapter_no = packet.get("chapterNo")
            summary = synth_summary_from_packet(general_id, packet)
            packet_general_ids = [str(gid or "").strip() for gid in (packet.get("generalIds") or []) if str(gid or "").strip()]
            participant_ids = sorted({general_id, *packet_general_ids})
            confidence = 0.76 if runtime_packet_strength(packet) >= 2 else 0.70
            event_key = f"synth-{general_id}-{created:02d}"
            event_id = f"synth-event.{general_id}.{created:02d}.{stable_hash(round_id, general_id, source_ref, summary, length=8)}"
            rows.append(
                {
                    "eventId": event_id,
                    "eventKey": event_key,
                    "generalIds": participant_ids,
                    "sourceRefs": [source_ref],
                    "chapterNo": chapter_no if isinstance(chapter_no, int) else None,
                    "location": None,
                    "summary": summary,
                    "sourceQuote": summary,
                    "confidence": confidence,
                    "eventType": "runtime-ref-blitz-synthetic",
                    "reviewStatus": "ready",
                    "canonicalWrites": False,
                }
            )
            if created >= max_per_general:
                break
        created_per_general[general_id] = created
    write_jsonl(output_path, rows)
    return {
        "eventPath": repo_relative(output_path),
        "eventCount": len(rows),
        "noPacketGenerals": no_packet_generals,
        "createdPerGeneral": created_per_general,
    }


def export_runtime_profiles_for_generals(
    *,
    general_ids: list[str],
    stable_knowledge_path: Path,
    relationship_evidence_path: Path,
    source_event_packets_path: Path,
    events_path: Path,
    core_report_path: Path,
    output_root: Path,
    dry_run: bool,
    overwrite: bool,
) -> dict[str, Any]:
    command_results: list[dict[str, Any]] = []
    success_general_ids: list[str] = []
    failed_general_ids: list[str] = []
    for general_id in general_ids:
        command = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "export_general_runtime_profile.py").resolve()),
            "--general-id",
            general_id,
            "--stable-knowledge",
            repo_relative(stable_knowledge_path),
            "--source-event-packets",
            repo_relative(source_event_packets_path),
            "--events",
            repo_relative(events_path),
            "--relationship-evidence",
            repo_relative(relationship_evidence_path),
            "--core-report",
            repo_relative(core_report_path),
            "--output-root",
            repo_relative(output_root),
        ]
        if overwrite:
            command.append("--overwrite")
        result = run_command(command, dry_run=dry_run)
        command_results.append({"generalId": general_id, "result": result})
        if int(result.get("returnCode") or 0) == 0:
            success_general_ids.append(general_id)
        else:
            failed_general_ids.append(general_id)
    return {
        "commandResults": command_results,
        "successGeneralIds": success_general_ids,
        "failedGeneralIds": failed_general_ids,
        "runtimeProfileRoot": repo_relative(output_root),
    }


def run_runtime_readiness_with_ref_blitz(
    *,
    run_root: Path,
    round_id: str,
    rows: list[dict[str, Any]],
    runtime_mode: str,
    dry_run: bool,
    overwrite: bool,
    enable_ref_blitz: bool,
    max_events_per_general: int,
    stable_knowledge_path: Path,
    relationship_evidence_path: Path,
    source_event_packets_path: Path,
    core_report_path: Path,
) -> dict[str, Any]:
    primary = run_runtime_readiness(
        run_root=run_root,
        rows=rows,
        runtime_mode=runtime_mode,
        dry_run=dry_run,
        overwrite=overwrite,
    )
    primary["primarySummaryPath"] = primary.get("summaryPath")
    primary["primaryFailCount"] = int(primary.get("failCount") or 0)
    primary["refBlitzApplied"] = False
    primary["refBlitzReason"] = "disabled"

    if runtime_mode == "off":
        primary["refBlitzReason"] = "runtime-off"
        return primary
    if not enable_ref_blitz:
        return primary
    if dry_run:
        primary["refBlitzReason"] = "dry-run"
        return primary

    fail_general_ids = [str(gid or "").strip() for gid in (primary.get("failGeneralIds") or []) if str(gid or "").strip()]
    fail_general_ids = sorted(set(fail_general_ids))
    if not fail_general_ids:
        primary["refBlitzReason"] = "no-fail-generals"
        return primary

    blitz_root = run_root / "runtime-readiness-ref-blitz"
    blitz_root.mkdir(parents=True, exist_ok=True)
    synthetic_events_path = blitz_root / "synthetic-events.from-packets.jsonl"
    synthetic_events = build_runtime_ref_blitz_synthetic_events(
        round_id=round_id,
        output_path=synthetic_events_path,
        fail_general_ids=fail_general_ids,
        source_event_packets_path=source_event_packets_path,
        max_events_per_general=max_events_per_general,
    )
    if int(synthetic_events.get("eventCount") or 0) <= 0:
        primary["refBlitzReason"] = "no-synthetic-events"
        primary["refBlitzSyntheticEventsPath"] = synthetic_events.get("eventPath")
        primary["refBlitzNoPacketGenerals"] = synthetic_events.get("noPacketGenerals") or []
        return primary

    runtime_profile_root = blitz_root / "runtime-profiles"
    exported = export_runtime_profiles_for_generals(
        general_ids=fail_general_ids,
        stable_knowledge_path=stable_knowledge_path,
        relationship_evidence_path=relationship_evidence_path,
        source_event_packets_path=source_event_packets_path,
        events_path=synthetic_events_path,
        core_report_path=core_report_path,
        output_root=runtime_profile_root,
        dry_run=dry_run,
        overwrite=True,
    )
    exported_generals = [str(gid or "").strip() for gid in (exported.get("successGeneralIds") or []) if str(gid or "").strip()]
    if not exported_generals:
        primary["refBlitzReason"] = "runtime-profile-export-failed"
        primary["refBlitzSyntheticEventsPath"] = synthetic_events.get("eventPath")
        primary["refBlitzExport"] = exported
        return primary

    rerun = run_runtime_readiness_matrix_once(
        output_root=blitz_root / "runtime-readiness-rerun",
        general_ids=exported_generals,
        dry_run=dry_run,
        overwrite=True,
        env_overrides={"NPC_RUNTIME_PROFILE_ROOT": str(runtime_profile_root.resolve())},
    )
    rerun_fail = [str(gid or "").strip() for gid in (rerun.get("failGeneralIds") or []) if str(gid or "").strip()]
    unresolved_fail = sorted(set(rerun_fail))
    resolved_fail = sorted(set(fail_general_ids) - set(unresolved_fail))

    merged_status = dict(primary.get("statusCounts") or {})
    base_pass = int((primary.get("statusCounts") or {}).get("pass") or 0)
    base_warn = int((primary.get("statusCounts") or {}).get("warn") or 0)
    merged_status["pass"] = base_pass + len(resolved_fail)
    if base_warn > 0:
        merged_status["warn"] = base_warn
    else:
        merged_status.pop("warn", None)
    if unresolved_fail:
        merged_status["fail"] = len(unresolved_fail)
    else:
        merged_status.pop("fail", None)

    primary["statusCounts"] = merged_status
    primary["failCount"] = len(unresolved_fail)
    primary["warnCount"] = int(rerun.get("warnCount") or 0)
    primary["summaryPath"] = rerun.get("summaryPath")
    primary["failGeneralIds"] = unresolved_fail
    primary["returnCode"] = rerun.get("returnCode")
    primary["refBlitzApplied"] = True
    primary["refBlitzReason"] = "applied"
    primary["refBlitzFailGeneralCount"] = len(fail_general_ids)
    primary["refBlitzResolvedCount"] = len(resolved_fail)
    primary["refBlitzUnresolvedCount"] = len(unresolved_fail)
    primary["refBlitzRerunSummaryPath"] = rerun.get("summaryPath")
    primary["refBlitzRuntimeProfileRoot"] = repo_relative(runtime_profile_root)
    primary["refBlitzSyntheticEventsPath"] = synthetic_events.get("eventPath")
    primary["refBlitzSyntheticEventCount"] = int(synthetic_events.get("eventCount") or 0)
    primary["refBlitzNoPacketGenerals"] = synthetic_events.get("noPacketGenerals") or []
    primary["refBlitzCreatedPerGeneral"] = synthetic_events.get("createdPerGeneral") or {}
    primary["refBlitzExport"] = exported
    primary["refBlitzRerun"] = rerun
    return primary


def select_best_clue(clues: list[dict[str, Any]]) -> dict[str, Any]:
    if not clues:
        return {}
    ranked = sorted(
        clues,
        key=lambda clue: (
            -len(clue.get("sourceRefs") or []),
            -len(compact_text(clue.get("summary"))),
            -len(compact_text(clue.get("sourceQuote"))),
        ),
    )
    return ranked[0] if ranked else {}


def clue_participants(general_id: str, clue: dict[str, Any]) -> list[str]:
    participants: set[str] = {str(general_id or "").strip()}
    for raw in clue.get("participants") or []:
        person = str(raw or "").strip()
        if person:
            participants.add(person)
    for edge in clue.get("relationshipEdges") or []:
        if not isinstance(edge, dict):
            continue
        for key in ("fromId", "toId", "generalId"):
            person = str(edge.get(key) or "").strip()
            if person:
                participants.add(person)
    participants.discard("")
    return sorted(participants)


def human_cluster_key(general_id: str, clue: dict[str, Any]) -> str:
    source_refs = sorted({str(ref or "").strip() for ref in (clue.get("sourceRefs") or []) if str(ref or "").strip()})
    location = compact_text(clue.get("location"))
    participants = clue_participants(general_id, clue)
    summary_seed = compact_text(clue.get("summary")) or compact_text(clue.get("sourceQuote"))
    summary_hash = stable_hash(summary_seed, length=12) if summary_seed else "no-summary"
    return "|".join(
        [
            ",".join(source_refs) or "no-ref",
            location or "no-location",
            ",".join(participants) or "no-participant",
            summary_hash,
        ]
    )


def human_meta_cluster_key(item: dict[str, Any]) -> str:
    row = item.get("representativeRow") if isinstance(item.get("representativeRow"), dict) else {}
    location = compact_text(item.get("location"))
    participants = sorted(str(person or "").strip() for person in (item.get("participants") or []) if str(person or "").strip())
    summary_hash = str(item.get("summaryHash") or "no-summary")
    missing_fields = sorted(str(field or "").strip() for field in (row.get("missingFields") or []) if str(field or "").strip())
    seed = [
        location or "no-location",
        ",".join(participants) or "no-participant",
        summary_hash or "no-summary",
        ",".join(missing_fields) or "no-missing",
    ]
    return "|".join(seed)


def merge_human_cluster_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        groups.setdefault(human_meta_cluster_key(item), []).append(item)

    merged: list[dict[str, Any]] = []
    for meta_key, members in groups.items():
        members.sort(
            key=lambda item: (
                -float((item.get("representativeRow") or {}).get("priorityScore") or 0.0),
                -int(item.get("clusterSize") or 1),
                str((item.get("representativeRow") or {}).get("generalId") or ""),
            )
        )
        representative = members[0]
        representative_row = representative.get("representativeRow") if isinstance(representative.get("representativeRow"), dict) else {}
        merged.append(
            {
                "clusterKey": f"meta:{stable_hash(meta_key, length=12)}",
                "metaClusterKey": meta_key,
                "clusterSize": sum(int(item.get("clusterSize") or 1) for item in members),
                "clusterGeneralIds": sorted(
                    {
                        str(gid or "").strip()
                        for item in members
                        for gid in (item.get("clusterGeneralIds") or [])
                        if str(gid or "").strip()
                    }
                ),
                "representativeRow": representative_row,
                "representativeClue": representative.get("representativeClue") or {},
                "sourceRefs": sorted(
                    {
                        str(ref or "").strip()
                        for item in members
                        for ref in (item.get("sourceRefs") or [])
                        if str(ref or "").strip()
                    }
                ),
                "participants": sorted(
                    {
                        str(person or "").strip()
                        for item in members
                        for person in (item.get("participants") or [])
                        if str(person or "").strip()
                    }
                ),
                "location": representative.get("location"),
                "summaryHash": representative.get("summaryHash"),
                "strictClusterKeys": [str(item.get("clusterKey") or "") for item in members if str(item.get("clusterKey") or "")],
            }
        )

    merged.sort(
        key=lambda item: (
            -float((item.get("representativeRow") or {}).get("priorityScore") or 0.0),
            -int(item.get("clusterSize") or 0),
            str((item.get("representativeRow") or {}).get("generalId") or ""),
        )
    )
    return merged


def cluster_human_review_rows(
    pending_rows: list[dict[str, Any]],
    generic_clues: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    clusters: dict[str, list[dict[str, Any]]] = {}
    for row in pending_rows:
        general_id = str(row.get("generalId") or "").strip()
        clues = generic_clues.get(general_id) or []
        clue = select_best_clue(clues)
        key = human_cluster_key(general_id, clue)
        clusters.setdefault(key, []).append({"row": row, "clue": clue, "generalId": general_id})

    strict_items: list[dict[str, Any]] = []
    for key, members in clusters.items():
        members.sort(
            key=lambda item: (
                -float(item["row"].get("priorityScore") or 0.0),
                -int(item["row"].get("genericCandidateCount") or 0),
                str(item["generalId"]),
            )
        )
        representative = members[0]
        clue = representative.get("clue") if isinstance(representative.get("clue"), dict) else {}
        source_refs = sorted(
            {
                str(ref or "").strip()
                for member in members
                for ref in ((member.get("clue") or {}).get("sourceRefs") or [])
                if str(ref or "").strip()
            }
        )
        participants = sorted(
            {
                person
                for member in members
                for person in clue_participants(str(member.get("generalId") or ""), member.get("clue") or {})
                if person
            }
        )
        location = compact_text(clue.get("location"))
        summary_seed = compact_text(clue.get("summary")) or compact_text(clue.get("sourceQuote"))
        strict_items.append(
            {
                "clusterKey": key,
                "clusterSize": len(members),
                "clusterGeneralIds": [str(member.get("generalId") or "") for member in members],
                "representativeRow": representative.get("row") or {},
                "representativeClue": clue,
                "sourceRefs": source_refs,
                "participants": participants,
                "location": location,
                "summaryHash": stable_hash(summary_seed, length=12) if summary_seed else "no-summary",
            }
        )
    return merge_human_cluster_items(strict_items)


def build_human_review_batch(
    *,
    run_root: Path,
    run_id: str,
    rows: list[dict[str, Any]],
    generic_clues: dict[str, list[dict[str, Any]]],
    threshold: int,
) -> dict[str, Any] | None:
    pending_rows = [row for row in rows if str(row.get("nextLane") or "") == "human-review"]
    clustered_items = cluster_human_review_rows(pending_rows, generic_clues)
    if len(clustered_items) < threshold:
        return None
    batch_items = clustered_items[: max(threshold, 20)]
    questions: list[dict[str, Any]] = []

    for index, item in enumerate(batch_items, 1):
        row = item.get("representativeRow") if isinstance(item.get("representativeRow"), dict) else {}
        clue = item.get("representativeClue") if isinstance(item.get("representativeClue"), dict) else {}
        general_id = str(row.get("generalId") or "")
        questions.append(
            {
                "questionId": f"{run_id}-q{index:03d}",
                "generalId": general_id,
                "displayName": row.get("displayName"),
                "status": row.get("readinessStatus"),
                "questionIntentZhTw": "這題在確認事件是否可先進 staging（A）或需要補證（B/C/D）。",
                "sourceQuote": clue.get("sourceQuote") or "",
                "summaryZhTw": clue.get("summary") or "",
                "sourceRefs": list(item.get("sourceRefs") or clue.get("sourceRefs") or []),
                "eventKey": clue.get("eventKey"),
                "missingFields": list(row.get("missingFields") or []),
                "clusterKey": item.get("clusterKey"),
                "clusterSize": int(item.get("clusterSize") or 1),
                "clusterGeneralIds": list(item.get("clusterGeneralIds") or [general_id]),
                "clusterParticipants": list(item.get("participants") or []),
                "clusterLocation": item.get("location"),
                "clusterSummaryHash": item.get("summaryHash"),
                "recommendedAnswer": "B" if row.get("missingFields") else "A",
                "allowedAnswers": [
                    {"code": "A", "zhTw": "證據足夠，先進 staged ready-eval（仍不 canonical write）。"},
                    {"code": "B", "zhTw": "資訊不足，先回 deterministic repair / skill preview 補證。"},
                    {"code": "C", "zhTw": "疑似衝突或邊界不穩，送 residual dossier。"},
                    {"code": "D", "zhTw": "暫緩，待下一輪 evidence discovery。"},
                ],
                "answer": None,
                "canonicalWrites": False,
            }
        )

    payload = {
        "version": "1.1.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-human-review-batch",
        "canonicalWrites": False,
        "runId": run_id,
        "threshold": threshold,
        "pendingRowCount": len(pending_rows),
        "clusteredPendingCount": len(clustered_items),
        "clusterPolicy": "strict(sourceRefs+location+participants+summary hash) -> meta(location+participants+summary hash+missingFields)",
        "questionCount": len(questions),
        "questions": questions,
    }
    json_path = run_root / "human-review-batch.todo.json"
    md_path = run_root / "human-review-batch.zh-TW.md"
    write_json(json_path, payload)
    lines = [
        "# Human Review Batch",
        "",
        f"- Run ID: `{run_id}`",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Threshold: `{threshold}`",
        f"- Pending Rows: `{payload['pendingRowCount']}`",
        f"- Clustered Pending: `{payload['clusteredPendingCount']}`",
        f"- Questions: `{len(questions)}`",
        f"- Cluster Policy: `{payload['clusterPolicy']}`",
        "",
    ]
    for question in questions:
        lines.extend(
            [
                f"## `{question['questionId']}` / `{question['generalId']}` {question.get('displayName') or ''}",
                f"- 題目在問什麼：{question.get('questionIntentZhTw')}",
                f"- 建議答案：`{question.get('recommendedAnswer')}`",
                f"- 原文線索：{question.get('sourceQuote') or '-'}",
                f"- 中文摘要：{question.get('summaryZhTw') or '-'}",
                f"- 來源編號：`{', '.join(question.get('sourceRefs') or []) or '-'}`",
                f"- 缺欄位：`{', '.join(question.get('missingFields') or []) or '-'}`",
                f"- Cluster 規模：`{question.get('clusterSize')}`（武將：`{', '.join(question.get('clusterGeneralIds') or []) or '-'}`）",
                f"- Cluster 參與者：`{', '.join(question.get('clusterParticipants') or []) or '-'}`；地點：`{question.get('clusterLocation') or '-'}`",
                f"- Cluster 指紋：`{question.get('clusterSummaryHash') or '-'}` / `{question.get('clusterKey') or '-'}`",
                "- A/B/C/D 說明：",
            ]
        )
        for answer in question.get("allowedAnswers") or []:
            lines.append(f"- {answer.get('code')}: {answer.get('zhTw')}")
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return {
        "jsonPath": repo_relative(json_path),
        "markdownPath": repo_relative(md_path),
        "questionCount": len(questions),
        "pendingRowCount": len(pending_rows),
        "clusteredPendingCount": len(clustered_items),
    }


def run_external_benchmarks(
    *,
    run_root: Path,
    round_id: str,
    sources: list[dict[str, Any]],
    source_config_path: Path,
    scoreboard_path: Path | None,
    dry_run: bool,
    overwrite: bool,
) -> tuple[list[dict[str, Any]], list[Path], list[Path], list[Path], list[Path]]:
    source_results: list[dict[str, Any]] = []
    card_paths: list[Path] = []
    ranking_paths: list[Path] = []
    harvested_seed_paths: list[Path] = []
    manual_seed_paths: list[Path] = []
    manual_source_ids: set[str] = set()
    benchmark_root = run_root / "source-benchmarks"
    benchmark_root.mkdir(parents=True, exist_ok=True)

    for source in sources:
        sid = str(source.get("sourceId") or "").strip()
        if not sid:
            continue
        sclass = source_class(source)
        adapter = str(source.get("adapterType") or "").strip().lower()
        status = normalize_status(source.get("status"))
        roi_action = str(source.get("__roiPolicyAction") or "keep")
        roi_reason = str(source.get("__roiPolicyReason") or "")
        sample_override = int(source.get("__sampleSizeOverride") or sample_size_for_source(source))
        if bool(source.get("__skipRoi")):
            source_results.append(
                {
                    "sourceId": sid,
                    "sourceClass": sclass,
                    "adapterType": adapter,
                    "finalVerdict": roi_action or "auto-retired-low-roi",
                    "stage1Passed": False,
                    "stage2Passed": None,
                    "stage3Passed": None,
                    "samplePageCount": sample_override,
                    "fetchedPageCount": 0,
                    "seedCount": 0,
                    "candidateCardCount": 0,
                    "seedPerPage": None,
                    "candidateCardPerPage": None,
                    "canonicalPeople": 0,
                    "shadowPeople": 0,
                    "manualEvidenceCount": int(source.get("manualEvidenceCount") or 0),
                    "manualSeedJsonlPath": None,
                    "manualSeedInjected": False,
                    "summaryJsonPath": None,
                    "stage1FailureReasons": [],
                    "stage1HttpStatus": None,
                    "stage1LiveStatus": "",
                    "stage1Reason": "",
                    "stage2FailureReasons": [],
                    "stage3FailureReasons": [],
                    "roiPolicyAction": roi_action,
                    "roiPolicyReason": roi_reason,
                }
            )
            continue
        if adapter == "manual_quote" or status == "manual_quote":
            manual_source_ids.add(sid)
            source_results.append(
                {
                    "sourceId": sid,
                    "sourceClass": sclass,
                    "adapterType": adapter,
                    "finalVerdict": "manual-only",
                    "stage1Passed": True,
                    "stage2Passed": None,
                    "stage3Passed": None,
                    "samplePageCount": 0,
                    "fetchedPageCount": 0,
                    "seedCount": 0,
                    "candidateCardCount": 0,
                    "seedPerPage": None,
                    "candidateCardPerPage": None,
                    "canonicalPeople": 0,
                    "shadowPeople": 0,
                    "manualEvidenceCount": int(source.get("manualEvidenceCount") or 0),
                    "manualSeedJsonlPath": None,
                    "manualSeedInjected": False,
                    "summaryJsonPath": None,
                    "stage1FailureReasons": [],
                    "stage1HttpStatus": None,
                    "stage1LiveStatus": "",
                    "stage1Reason": "",
                    "stage2FailureReasons": [],
                    "stage3FailureReasons": [],
                    "roiPolicyAction": roi_action,
                    "roiPolicyReason": roi_reason,
                }
            )
            continue

        benchmark_run_id = f"{round_id}-{sid}"
        command = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "benchmark_external_source.py").resolve()),
            "--source-id",
            sid,
            "--source-class",
            sclass,
            "--sample-size",
            str(max(sample_override, 1)),
            "--run-id",
            benchmark_run_id,
            "--output-root",
            repo_relative(benchmark_root),
            "--source-config",
            repo_relative(source_config_path),
        ]
        if scoreboard_path and scoreboard_path.exists():
            command.extend(["--scoreboard-json", repo_relative(scoreboard_path)])
        if overwrite:
            command.append("--overwrite")
        result = run_command(command, dry_run=dry_run)

        summary_path = benchmark_root / benchmark_run_id / "benchmark-summary.json"
        summary = read_json(summary_path)
        stage1 = summary.get("stage1Precheck") if isinstance(summary, dict) and isinstance(summary.get("stage1Precheck"), dict) else {}
        stage2 = summary.get("stage2Harvest") if isinstance(summary, dict) else {}
        stage3 = summary.get("stage3Yield") if isinstance(summary, dict) else {}
        outputs = stage3.get("outputs") if isinstance(stage3, dict) else {}
        ranking_path = resolve_existing_path(outputs.get("rankingJson")) if outputs and outputs.get("rankingJson") else None
        cards_path = benchmark_root / benchmark_run_id / "standard-pipeline" / "candidate-evidence-cards.jsonl"
        harvested_seed_path = benchmark_root / benchmark_run_id / "extracted-seeds" / "manual-evidence-seeds.jsonl"
        if ranking_path and ranking_path.exists():
            ranking_paths.append(ranking_path)
        if cards_path.exists():
            card_paths.append(cards_path)
        if harvested_seed_path.exists():
            harvested_seed_paths.append(harvested_seed_path)

        source_results.append(
            {
                "sourceId": sid,
                "sourceClass": sclass,
                "adapterType": adapter,
                "command": result.get("command"),
                "returnCode": result.get("returnCode"),
                "summaryJsonPath": repo_relative(summary_path),
                "finalVerdict": summary.get("finalVerdict") if isinstance(summary, dict) else "reject",
                "stage1Passed": summary.get("stage1Passed") if isinstance(summary, dict) else False,
                "stage1FailureReasons": summary.get("stage1FailureReasons") if isinstance(summary, dict) else [],
                "stage1HttpStatus": stage1.get("httpStatus") if isinstance(stage1, dict) else None,
                "stage1LiveStatus": stage1.get("liveStatus") if isinstance(stage1, dict) else "",
                "stage1Reason": stage1.get("reason") if isinstance(stage1, dict) else "",
                "stage2Passed": summary.get("stage2Passed") if isinstance(summary, dict) else False,
                "stage2FailureReasons": summary.get("stage2FailureReasons") if isinstance(summary, dict) else [],
                "stage3Passed": summary.get("stage3Passed") if isinstance(summary, dict) else False,
                "stage3FailureReasons": summary.get("stage3FailureReasons") if isinstance(summary, dict) else [],
                "samplePageCount": (stage2 or {}).get("samplePageCount") if isinstance(stage2, dict) else 0,
                "fetchedPageCount": (stage2 or {}).get("fetchedPageCount") if isinstance(stage2, dict) else 0,
                "seedCount": (stage3 or {}).get("seedCount") if isinstance(stage3, dict) else 0,
                "candidateCardCount": (stage3 or {}).get("candidateCardCount") if isinstance(stage3, dict) else 0,
                "seedPerPage": (stage3 or {}).get("seedPerPage") if isinstance(stage3, dict) else None,
                "candidateCardPerPage": (stage3 or {}).get("candidateCardPerPage") if isinstance(stage3, dict) else None,
                "canonicalPeople": (stage3 or {}).get("canonicalPeople") if isinstance(stage3, dict) else 0,
                "shadowPeople": (stage3 or {}).get("shadowPeople") if isinstance(stage3, dict) else 0,
                "manualEvidenceCount": int(source.get("manualEvidenceCount") or 0),
                "manualSeedJsonlPath": None,
                "manualSeedInjected": False,
                "roiPolicyAction": roi_action,
                "roiPolicyReason": roi_reason,
            }
        )

    if manual_source_ids:
        manual_metrics = collect_manual_source_metrics(
            manual_source_ids=manual_source_ids,
            card_paths=card_paths,
            ranking_paths=ranking_paths,
            injection_root=benchmark_root / "manual-seed-injections",
        )
        for row in source_results:
            sid = str(row.get("sourceId") or "").strip()
            if sid not in manual_metrics:
                continue
            stats = manual_metrics[sid]
            row["seedCount"] = int(stats.get("seedCount") or 0)
            row["candidateCardCount"] = int(stats.get("candidateCardCount") or 0)
            row["canonicalPeople"] = int(stats.get("canonicalPeople") or 0)
            row["shadowPeople"] = int(stats.get("shadowPeople") or 0)
            row["manualSeedJsonlPath"] = stats.get("manualSeedJsonlPath")
            row["manualSeedInjected"] = bool(stats.get("manualSeedInjected"))
            manual_seed_path_text = str(stats.get("manualSeedJsonlPath") or "").strip()
            if manual_seed_path_text:
                manual_seed_path = resolve_existing_path(manual_seed_path_text)
                if manual_seed_path.exists():
                    manual_seed_paths.append(manual_seed_path)

    return source_results, card_paths, ranking_paths, harvested_seed_paths, manual_seed_paths


def precision_row_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        -float(row.get("priorityScore") or 0.0),
        -float(row.get("worldbuildingUsabilityScore") or 0.0),
        -float(row.get("historicalTrustScore") or 0.0),
        -int(row.get("genericCandidateCount") or 0),
        str(row.get("generalId") or ""),
    )


def precision_cluster_key(row: dict[str, Any], generic_bucket_size: int) -> str:
    lane = str(row.get("nextLane") or "unknown")
    grade = str(row.get("reviewGrade") or "D")
    missing = sorted(str(field).strip() for field in (row.get("missingFields") or []) if str(field).strip())
    missing_key = ",".join(missing) if missing else "none"
    bucket = max(generic_bucket_size, 1)
    generic_count = int(row.get("genericCandidateCount") or 0)
    bucket_index = generic_count // bucket
    lower = bucket_index * bucket
    upper = lower + bucket - 1
    return f"{lane}|{grade}|missing:{missing_key}|generic:{lower}-{upper}"


def allocate_precision_lane_targets(
    *,
    lane_candidates: dict[str, list[dict[str, Any]]],
    allowlist: list[str],
    lane_weights: dict[str, float],
    total: int,
    min_per_lane: int,
) -> dict[str, int]:
    active_lanes = [lane for lane in allowlist if lane_candidates.get(lane)]
    targets = {lane: 0 for lane in active_lanes}
    remaining = max(total, 0)
    minimum = max(min_per_lane, 0)

    for lane in active_lanes:
        if remaining <= 0:
            break
        capacity = len(lane_candidates.get(lane) or [])
        grant = min(minimum, capacity, remaining)
        targets[lane] = grant
        remaining -= grant

    if remaining <= 0:
        return targets

    weighted_lanes = [lane for lane in active_lanes if targets[lane] < len(lane_candidates.get(lane) or [])]
    if not weighted_lanes:
        return targets

    weights = {lane: max(float(lane_weights.get(lane, 0.0) or 0.0), 0.0) for lane in weighted_lanes}
    total_weight = sum(weights.values())
    if total_weight <= 0:
        weights = {lane: 1.0 for lane in weighted_lanes}
        total_weight = float(len(weighted_lanes))

    extra_alloc: dict[str, int] = {lane: 0 for lane in weighted_lanes}
    remainders: list[tuple[float, str]] = []
    assigned = 0
    for lane in weighted_lanes:
        share = remaining * (weights[lane] / total_weight)
        base = int(share)
        capacity_left = max(len(lane_candidates.get(lane) or []) - targets[lane], 0)
        grant = min(base, capacity_left)
        extra_alloc[lane] = grant
        assigned += grant
        remainders.append((share - base, lane))

    remaining_extra = max(remaining - assigned, 0)
    for _, lane in sorted(remainders, key=lambda item: (-item[0], item[1])):
        if remaining_extra <= 0:
            break
        capacity_left = len(lane_candidates.get(lane) or []) - targets[lane] - extra_alloc[lane]
        if capacity_left <= 0:
            continue
        extra_alloc[lane] += 1
        remaining_extra -= 1

    for lane, grant in extra_alloc.items():
        targets[lane] += grant
    return targets


def select_from_lane_with_clusters(
    *,
    rows: list[dict[str, Any]],
    target: int,
    max_per_cluster: int,
    generic_bucket_size: int,
    selected_ids: set[str],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    if target <= 0 or not rows:
        return [], {}
    cluster_cap = max(max_per_cluster, 1)
    clusters: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        key = precision_cluster_key(row, generic_bucket_size)
        clusters.setdefault(key, []).append(row)
    for cluster_rows in clusters.values():
        cluster_rows.sort(key=precision_row_sort_key)
    ordered_keys = sorted(
        clusters.keys(),
        key=lambda key: (
            precision_row_sort_key(clusters[key][0]) if clusters.get(key) else (0, 0, 0, 0, ""),
            key,
        ),
    )
    indices = {key: 0 for key in ordered_keys}
    cluster_counts = {key: 0 for key in ordered_keys}
    chosen: list[dict[str, Any]] = []

    # Pass 1: honor per-cluster cap.
    while len(chosen) < target:
        progressed = False
        for key in ordered_keys:
            if len(chosen) >= target:
                break
            if cluster_counts[key] >= cluster_cap:
                continue
            members = clusters.get(key) or []
            while indices[key] < len(members):
                row = members[indices[key]]
                indices[key] += 1
                gid = str(row.get("generalId") or "").strip()
                if not gid or gid in selected_ids:
                    continue
                chosen.append(row)
                selected_ids.add(gid)
                cluster_counts[key] += 1
                progressed = True
                break
        if not progressed:
            break

    # Pass 2: relax cap if lane quota still not met.
    if len(chosen) < target:
        for key in ordered_keys:
            members = clusters.get(key) or []
            while len(chosen) < target and indices[key] < len(members):
                row = members[indices[key]]
                indices[key] += 1
                gid = str(row.get("generalId") or "").strip()
                if not gid or gid in selected_ids:
                    continue
                chosen.append(row)
                selected_ids.add(gid)
                cluster_counts[key] += 1
            if len(chosen) >= target:
                break

    non_zero_clusters = {key: count for key, count in cluster_counts.items() if count > 0}
    return chosen, non_zero_clusters


def select_precision_rows(
    *,
    scoreboard_rows: list[dict[str, Any]],
    precision_policy: dict[str, Any],
    top_n: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    limit = max(int(top_n or 0), 1)
    allowlist = [str(item).strip() for item in (precision_policy.get("laneAllowlist") or []) if str(item).strip()]
    if not allowlist:
        allowlist = list(DEFAULT_PRECISION_POLICY["laneAllowlist"])
    lane_weights = precision_policy.get("laneWeights") if isinstance(precision_policy.get("laneWeights"), dict) else {}
    max_per_cluster = int(precision_policy.get("maxPerCluster") or DEFAULT_PRECISION_POLICY["maxPerCluster"])
    min_per_lane = int(precision_policy.get("minPerLane") or DEFAULT_PRECISION_POLICY["minPerLane"])
    generic_bucket_size = int(
        precision_policy.get("genericCandidateBucketSize") or DEFAULT_PRECISION_POLICY["genericCandidateBucketSize"]
    )
    generic_bucket_size = max(generic_bucket_size, 1)

    candidates = [
        row
        for row in scoreboard_rows
        if str(row.get("rosterState") or "") == "canonical" and str(row.get("nextLane") or "") in set(allowlist)
    ]
    candidates.sort(key=precision_row_sort_key)

    lane_candidates: dict[str, list[dict[str, Any]]] = {lane: [] for lane in allowlist}
    for row in candidates:
        lane = str(row.get("nextLane") or "")
        lane_candidates.setdefault(lane, []).append(row)
    for lane_rows in lane_candidates.values():
        lane_rows.sort(key=precision_row_sort_key)

    lane_targets = allocate_precision_lane_targets(
        lane_candidates=lane_candidates,
        allowlist=allowlist,
        lane_weights={str(key): float(value or 0.0) for key, value in lane_weights.items()},
        total=limit,
        min_per_lane=min_per_lane,
    )
    selected_ids: set[str] = set()
    selected_rows: list[dict[str, Any]] = []
    lane_selected_counts: dict[str, int] = {}
    lane_cluster_counts: dict[str, dict[str, int]] = {}

    for lane in allowlist:
        lane_rows = lane_candidates.get(lane) or []
        target = int(lane_targets.get(lane) or 0)
        chosen, cluster_counts = select_from_lane_with_clusters(
            rows=lane_rows,
            target=target,
            max_per_cluster=max_per_cluster,
            generic_bucket_size=generic_bucket_size,
            selected_ids=selected_ids,
        )
        selected_rows.extend(chosen)
        lane_selected_counts[lane] = len(chosen)
        lane_cluster_counts[lane] = cluster_counts

    if len(selected_rows) < limit:
        for row in candidates:
            if len(selected_rows) >= limit:
                break
            gid = str(row.get("generalId") or "").strip()
            if not gid or gid in selected_ids:
                continue
            selected_ids.add(gid)
            selected_rows.append(row)
            lane = str(row.get("nextLane") or "")
            lane_selected_counts[lane] = int(lane_selected_counts.get(lane) or 0) + 1

    selected_rows.sort(key=precision_row_sort_key)
    selected_rows = selected_rows[:limit]
    metadata = {
        "candidateCount": len(candidates),
        "selectedCount": len(selected_rows),
        "laneTargets": lane_targets,
        "laneSelectedCounts": lane_selected_counts,
        "clusterSelectedCounts": lane_cluster_counts,
        "precisionPolicy": {
            "laneAllowlist": allowlist,
            "laneWeights": {str(key): float(value or 0.0) for key, value in lane_weights.items()},
            "maxPerCluster": max_per_cluster,
            "minPerLane": min_per_lane,
            "genericCandidateBucketSize": generic_bucket_size,
        },
    }
    return selected_rows, metadata


def run_precision_lane(
    *,
    args: argparse.Namespace,
    run_root: Path,
    round_id: str,
    scoreboard_rows: list[dict[str, Any]],
    scoreboard_json_path: Path | None,
    progress_json_path: Path | None,
    relationship_json_path: Path | None,
    events_path: Path,
    baseline_manifest: dict[str, Any],
    lane_profile_policy: dict[str, Any],
    dry_run: bool,
) -> dict[str, Any] | None:
    if not args.run_precision_lane:
        return None

    precision_policy = (
        lane_profile_policy.get("precisionSelection")
        if isinstance(lane_profile_policy.get("precisionSelection"), dict)
        else DEFAULT_PRECISION_POLICY
    )
    selected_rows, selection_meta = select_precision_rows(
        scoreboard_rows=scoreboard_rows,
        precision_policy=precision_policy,
        top_n=max(args.precision_top_generals, 1),
    )
    selected = [str(row.get("generalId") or "").strip() for row in selected_rows]
    selected = [gid for gid in selected if gid]
    explicit_general_ids = [str(gid or "").strip() for gid in (args.precision_general_id or [])]
    for explicit_general_id in explicit_general_ids:
        if explicit_general_id and explicit_general_id not in selected:
            selected.append(explicit_general_id)
    selection_meta["explicitGeneralIds"] = [gid for gid in explicit_general_ids if gid]
    selection_meta["effectiveSelectedCount"] = len(selected)
    if not selected:
        return {
            "command": None,
            "summaryPath": None,
            "baselineManifestPath": None,
            "selectedGeneralIds": [],
            "selection": selection_meta,
            "summary": {},
        }

    precision_root = run_root / "precision-lane"
    precision_run_id = f"{round_id}-precision"
    top_generals_for_command = max(len(selected), 1)
    if args.precision_scoreboard_bridge and args.precision_bridge_global:
        top_generals_for_command = max(top_generals_for_command, max(int(args.precision_bridge_max_generals), 1))

    command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "run_progress_advancement_loop.py").resolve()),
        "--run-id",
        precision_run_id,
        "--output-root",
        repo_relative(precision_root),
        "--profile",
        "precision",
        "--top-generals",
        str(top_generals_for_command),
        "--top-per-general",
        str(max(args.precision_top_per_general, 1)),
        "--pending-review-limit",
        str(max(args.human_pending_threshold, 1)),
        "--runtime-readiness",
        "off",
        "--emit-ready-eval",
    ]
    if args.precision_auto_review_location_gap:
        command.append("--auto-review-location-gap")
    for root_cause in (args.precision_auto_review_root_cause or []):
        root_cause_text = str(root_cause or "").strip()
        if root_cause_text:
            command.extend(["--auto-review-root-cause", root_cause_text])
    auto_review_answer = str(args.precision_auto_review_answer or "").strip()
    if auto_review_answer:
        command.extend(["--auto-review-answer", auto_review_answer])
    if int(args.precision_auto_review_max_items or 0) > 0:
        command.extend(["--auto-review-max-items", str(int(args.precision_auto_review_max_items))])
    if progress_json_path and progress_json_path.exists():
        command.extend(["--base-progress", repo_relative(progress_json_path)])
    if relationship_json_path and relationship_json_path.exists():
        command.extend(["--base-relationship-evidence", repo_relative(relationship_json_path)])
    if events_path.exists():
        command.extend(["--base-events", repo_relative(events_path)])

    if args.precision_scoreboard_bridge:
        command.append("--scoreboard-repair-bridge")
        if scoreboard_json_path and scoreboard_json_path.exists():
            command.extend(["--scoreboard-json", repo_relative(scoreboard_json_path)])
        command.extend(["--bridge-fields", str(args.precision_bridge_fields or "location,relationshipEdges")])
        command.extend(["--bridge-max-generals", str(max(int(args.precision_bridge_max_generals), 1))])
        command.extend(["--bridge-max-per-general", str(max(int(args.precision_bridge_max_per_general), 1))])
    if not (args.precision_scoreboard_bridge and args.precision_bridge_global):
        for general_id in selected:
            command.extend(["--general-id", general_id])

    if args.precision_use_baseline_manifest:
        precision_baseline = baseline_path(
            baseline_manifest,
            "precisionBaselineManifestPath",
            "progressBaselineManifestPath",
            "baselineManifestPath",
        )
        if precision_baseline:
            baseline_resolved = resolve_existing_path(precision_baseline)
            if baseline_resolved.exists():
                command.extend(["--baseline-manifest", repo_relative(baseline_resolved)])

    if args.overwrite:
        command.append("--overwrite")
    result = run_command(command, dry_run=dry_run)
    summary_path = precision_root / precision_run_id / "progress-advancement-summary.json"
    baseline_path_out = precision_root / precision_run_id / "baseline-manifest.json"
    summary_payload = read_json(summary_path)
    return {
        "command": result,
        "summaryPath": repo_relative(summary_path),
        "baselineManifestPath": repo_relative(baseline_path_out),
        "selectedGeneralIds": selected,
        "selection": selection_meta,
        "summary": summary_payload if isinstance(summary_payload, dict) else {},
    }


def run_round(
    *,
    args: argparse.Namespace,
    run_root: Path,
    round_index: int,
    source_config_path: Path,
    generals_path: Path,
    events_path: Path,
    generic_candidates_path: Path,
    observed_mentions_path: Path,
    observed_summary_path: Path,
    sources: list[dict[str, Any]],
    lane_policy_config_path: Path,
    lane_profile_policy: dict[str, Any],
    source_roi_decisions: list[dict[str, Any]],
    baseline_manifest: dict[str, Any],
    carry_forward_external_artifacts: dict[str, list[Path]] | None,
    carry_forward_round_json_paths: list[Path] | None,
    previous_scoreboard_path: Path | None,
    dry_run: bool,
) -> dict[str, Any]:
    round_id = f"{args.run_id}-r{round_index}"
    round_root = run_root / round_id
    round_root.mkdir(parents=True, exist_ok=True)

    baseline_scoreboard_path = None
    baseline_progress_path = None
    baseline_relationship_path = None
    if baseline_manifest:
        from_baseline_scoreboard = baseline_path(baseline_manifest, "scoreboardJsonPath", "scorecardJsonPath")
        if from_baseline_scoreboard:
            candidate = resolve_existing_path(from_baseline_scoreboard)
            if candidate.exists():
                baseline_scoreboard_path = candidate
        from_baseline_progress = baseline_path(baseline_manifest, "progressPath", "progressJsonPath")
        if from_baseline_progress:
            candidate = resolve_existing_path(from_baseline_progress)
            if candidate.exists():
                baseline_progress_path = candidate
        from_baseline_relationship = baseline_path(baseline_manifest, "relationshipEvidencePath", "baseRelationshipEvidencePath")
        if from_baseline_relationship:
            candidate = resolve_existing_path(from_baseline_relationship)
            if candidate.exists():
                baseline_relationship_path = candidate

    effective_scoreboard_path = previous_scoreboard_path
    if not effective_scoreboard_path:
        from_baseline = baseline_path(baseline_manifest, "scoreboardJsonPath", "scorecardJsonPath")
        if from_baseline:
            candidate = resolve_existing_path(from_baseline)
            if candidate.exists():
                effective_scoreboard_path = candidate

    source_results, card_paths, ranking_paths, harvested_seed_paths, manual_seed_paths = run_external_benchmarks(
        run_root=round_root,
        round_id=round_id,
        sources=sources,
        source_config_path=source_config_path,
        scoreboard_path=effective_scoreboard_path,
        dry_run=dry_run,
        overwrite=args.overwrite,
    )

    external_root = round_root / "external-evidence"
    external_root.mkdir(parents=True, exist_ok=True)
    seed_input_paths = [*harvested_seed_paths, *manual_seed_paths]
    global_seed_pipeline = run_global_seed_pipeline(
        round_root=round_root,
        round_id=round_id,
        scoreboard_path=effective_scoreboard_path,
        seed_paths=seed_input_paths,
        seed_to_card_priority_limit=max(int(args.seed_to_card_priority_limit), 0),
        seed_to_card_priority_extra_ids=[
            *[str(item or "").strip() for item in (args.seed_to_card_priority_general_id or [])],
            *[str(item or "").strip() for item in (args.precision_general_id or [])],
        ],
        seed_to_card_min_score=float(args.seed_to_card_min_score),
        dry_run=dry_run,
        overwrite=args.overwrite,
    )
    global_ranking_path = (
        resolve_existing_path(global_seed_pipeline["rankingPath"]) if global_seed_pipeline.get("rankingPath") else None
    )
    global_cards_path = (
        resolve_existing_path(global_seed_pipeline["candidateCardsPath"])
        if global_seed_pipeline.get("candidateCardsPath")
        else None
    )

    carry_forward_card_paths = existing_paths(list((carry_forward_external_artifacts or {}).get("cardPaths") or []))
    carry_forward_ranking_paths = merge_ranking_paths(list((carry_forward_external_artifacts or {}).get("rankingPaths") or []))
    current_ranking_inputs = merge_ranking_paths(ranking_paths)
    ranking_inputs = merge_ranking_paths(
        carry_forward_ranking_paths,
        current_ranking_inputs,
        [global_ranking_path] if global_ranking_path and global_ranking_path.exists() else [],
    )

    current_card_paths = existing_paths(card_paths)
    card_inputs = [
        *carry_forward_card_paths,
        *current_card_paths,
        *([global_cards_path] if global_cards_path and global_cards_path.exists() else []),
    ]
    merged_cards = merge_cards(card_inputs) if card_inputs else []
    cards_path = external_root / "external-evidence-cards.jsonl"
    write_jsonl(cards_path, merged_cards)
    external_summary_path = external_root / "external-evidence-summary.json"
    external_summary_md_path = external_root / "external-evidence-summary.zh-TW.md"
    external_roi_md_path = external_root / "external-source-roi.zh-TW.md"
    external_summary = build_external_summary(
        run_id=round_id,
        source_results=source_results,
        merged_cards=merged_cards,
        cards_path=cards_path,
        json_path=external_summary_path,
        md_path=external_summary_md_path,
        roi_md_path=external_roi_md_path,
    )

    full_pilot_root = round_root / "full-pilot"
    pilot_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "run_etl_quality_pilot.py").resolve()),
        "--generals",
        repo_relative(generals_path),
        "--top",
        str(max(args.top, 1)),
        "--include-cold",
        str(max(args.include_cold, 0)),
        "--events",
        repo_relative(events_path),
        "--generic-candidates",
        repo_relative(generic_candidates_path),
        "--output-root",
        repo_relative(full_pilot_root),
    ]
    if args.overwrite:
        pilot_command.append("--overwrite")
    pilot_result = run_command(pilot_command, dry_run=dry_run)
    pilot_report_path = full_pilot_root / "etl-quality-pilot-report.json"
    review_queue_path = full_pilot_root / "review-queue.todo.json"
    review_queue = read_json(review_queue_path)
    pilot_pending_count = len((review_queue if isinstance(review_queue, dict) else {}).get("questions") or [])

    scoreboard_root = round_root / "scoreboard"
    scoreboard_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_full_roster_scoreboard.py").resolve()),
        "--generals",
        repo_relative(generals_path),
        "--events",
        repo_relative(events_path),
        "--generic-candidates",
        repo_relative(generic_candidates_path),
        "--pilot-report",
        repo_relative(pilot_report_path),
        "--output-root",
        repo_relative(scoreboard_root),
        "--profile",
        args.profile,
        "--lane-policy-config",
        repo_relative(lane_policy_config_path),
    ]
    for ranking_path in ranking_inputs:
        scoreboard_command.extend(["--seed-ranking-json", repo_relative(ranking_path)])
    scoreboard_command.extend(["--candidate-evidence-cards", repo_relative(cards_path)])
    if args.overwrite:
        scoreboard_command.append("--overwrite")
    scoreboard_result = run_command(scoreboard_command, dry_run=dry_run)
    scoreboard_json_path = scoreboard_root / "full-roster-scoreboard.json"
    scoreboard_payload = read_json(scoreboard_json_path)
    scoreboard_rows = list((scoreboard_payload if isinstance(scoreboard_payload, dict) else {}).get("rows") or [])
    scoreboard_metrics = (scoreboard_payload if isinstance(scoreboard_payload, dict) else {}).get("metrics") or {}

    observed_bridge_root = round_root / "observed-bridge"
    observed_overlay_root = observed_bridge_root / "external-overlay"
    observed_overlay_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_external_observed_overlay.py").resolve()),
        "--candidate-evidence-cards",
        repo_relative(cards_path),
        "--output-root",
        repo_relative(observed_overlay_root),
    ]
    for ranking_path in ranking_inputs:
        observed_overlay_command.extend(["--seed-ranking-json", repo_relative(ranking_path)])
    if args.overwrite:
        observed_overlay_command.append("--overwrite")
    observed_overlay_result = run_command(observed_overlay_command, dry_run=dry_run)
    overlay_observed_mentions_path = observed_overlay_root / "observed-mentions.json"
    overlay_observed_summary_path = observed_overlay_root / "observed-label-summary.json"

    merged_observed_root = observed_bridge_root / "merged"
    base_observed_mentions = observed_mentions_path
    base_observed_summary = observed_summary_path
    merge_observed_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "merge_observed_mentions_overlay.py").resolve()),
        "--base-observed-mentions",
        repo_relative(base_observed_mentions),
        "--base-observed-summary",
        repo_relative(base_observed_summary),
        "--overlay-observed-mentions",
        repo_relative(overlay_observed_mentions_path),
        "--overlay-observed-summary",
        repo_relative(overlay_observed_summary_path),
        "--output-root",
        repo_relative(merged_observed_root),
    ]
    if args.overwrite:
        merge_observed_command.append("--overwrite")
    merge_observed_result = run_command(merge_observed_command, dry_run=dry_run)
    merged_observed_mentions_path = merged_observed_root / "observed-mentions.json"
    merged_observed_summary_path = merged_observed_root / "observed-label-summary.json"
    effective_observed_mentions_path = merged_observed_mentions_path if merged_observed_mentions_path.exists() else base_observed_mentions
    effective_observed_summary_path = merged_observed_summary_path if merged_observed_summary_path.exists() else base_observed_summary

    stable_root = round_root / "stable-knowledge"
    stable_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_stable_knowledge_bootstrap.py").resolve()),
        "--generals",
        repo_relative(generals_path),
        "--observed-mentions",
        repo_relative(effective_observed_mentions_path),
        "--observed-summary",
        repo_relative(effective_observed_summary_path),
        "--output-root",
        repo_relative(stable_root),
    ]
    if args.overwrite:
        stable_command.append("--overwrite")
    stable_result = run_command(stable_command, dry_run=dry_run)
    stable_json_path = stable_root / "stable-knowledge-bootstrap.json"

    relationship_root = round_root / "relationship-evidence"
    relationship_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "extract_relationship_evidence.py").resolve()),
        "--observed-mentions",
        repo_relative(effective_observed_mentions_path),
        "--stable-knowledge",
        repo_relative(stable_json_path),
        "--output-root",
        repo_relative(relationship_root),
    ]
    if args.overwrite:
        relationship_command.append("--overwrite")
    relationship_result = run_command(relationship_command, dry_run=dry_run)
    relationship_json_path = relationship_root / "source-grounded-relationship-edges.jsonl"

    external_relationship_root = round_root / "external-relationship-overlay"
    external_relationship_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_external_relationship_overlay.py").resolve()),
        "--candidate-evidence-cards",
        repo_relative(cards_path),
        "--internal-relationship-evidence",
        repo_relative(relationship_json_path),
        "--source-config",
        repo_relative(source_config_path),
        "--output-root",
        repo_relative(external_relationship_root),
    ]
    if args.external_relationship_shadow_fallback:
        external_relationship_command.append("--allow-shadow-partner-fallback")
    if args.overwrite:
        external_relationship_command.append("--overwrite")
    external_relationship_result = run_command(external_relationship_command, dry_run=dry_run)
    external_relationship_json_path = external_relationship_root / "source-grounded-relationship-edges.external.jsonl"
    merged_relationship_json_path = relationship_root / "source-grounded-relationship-edges.merged.jsonl"
    merged_relationship_summary_path = relationship_root / "relationship-evidence-merge-summary.json"
    item_relationship_json_path: Path | None = None
    item_relationship_result: dict[str, Any] | None = None

    def write_relationship_merge_summary(*, item_path: Path | None = None) -> dict[str, Any]:
        base_relationship_rows = read_jsonl(relationship_json_path)
        external_relationship_rows = read_jsonl(external_relationship_json_path)
        item_relationship_rows = read_jsonl(item_path) if item_path and item_path.exists() else []
        merged_relationship_rows = merge_relationship_edges(
            [
                path
                for path in [relationship_json_path, external_relationship_json_path, item_path]
                if isinstance(path, Path) and path.exists()
            ]
        )
        write_jsonl(merged_relationship_json_path, merged_relationship_rows)
        input_row_count = len(base_relationship_rows) + len(external_relationship_rows) + len(item_relationship_rows)
        summary = {
            "version": "1.0.0",
            "generatedAt": utc_now(),
            "canonicalWrites": False,
            "inputs": {
                "baseRelationshipPath": repo_relative(relationship_json_path),
                "externalRelationshipPath": repo_relative(external_relationship_json_path),
                "itemRelationshipPath": repo_relative(item_path) if item_path and item_path.exists() else None,
            },
            "outputs": {
                "mergedRelationshipPath": repo_relative(merged_relationship_json_path),
                "summaryPath": repo_relative(merged_relationship_summary_path),
            },
            "metrics": {
                "baseEdgeCount": len(base_relationship_rows),
                "externalEdgeCount": len(external_relationship_rows),
                "itemEdgeCount": len(item_relationship_rows),
                "mergedEdgeCount": len(merged_relationship_rows),
                "dedupRemovedCount": input_row_count - len(merged_relationship_rows),
            },
        }
        write_json(merged_relationship_summary_path, summary)
        return summary

    merged_relationship_summary = write_relationship_merge_summary()
    effective_relationship_json_path = merged_relationship_json_path if merged_relationship_json_path.exists() else relationship_json_path

    event_seed_root = round_root / "event-question-seeds"
    event_seed_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_event_question_seed_bank.py").resolve()),
        "--observed-mentions",
        repo_relative(effective_observed_mentions_path),
        "--stable-knowledge",
        repo_relative(stable_json_path),
        "--relationship-evidence",
        repo_relative(effective_relationship_json_path),
        "--output-root",
        repo_relative(event_seed_root),
    ]
    if args.overwrite:
        event_seed_command.append("--overwrite")
    event_seed_result = run_command(event_seed_command, dry_run=dry_run)
    event_seed_json_path = event_seed_root / "event-question-seeds.jsonl"

    packet_root = round_root / "source-event-packets"
    packet_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_source_event_packets.py").resolve()),
        "--observed-mentions",
        repo_relative(effective_observed_mentions_path),
        "--stable-knowledge",
        repo_relative(stable_json_path),
        "--relationship-evidence",
        repo_relative(effective_relationship_json_path),
        "--output-root",
        repo_relative(packet_root),
    ]
    if args.overwrite:
        packet_command.append("--overwrite")
    packet_result = run_command(packet_command, dry_run=dry_run)
    packet_json_path = packet_root / "source-event-packets.jsonl"

    item_relationship_root = round_root / "item-relationship-overlay"
    item_relationship_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_item_relationship_overlay.py").resolve()),
        "--source-event-packets",
        repo_relative(packet_json_path),
        "--source-config",
        repo_relative(source_config_path),
        "--output-root",
        repo_relative(item_relationship_root),
    ]
    if args.overwrite:
        item_relationship_command.append("--overwrite")
    item_relationship_result = run_command(item_relationship_command, dry_run=dry_run)
    item_relationship_json_path = item_relationship_root / "person-item-relationship-edges.external.jsonl"

    if item_relationship_json_path.exists():
        merged_relationship_summary = write_relationship_merge_summary(item_path=item_relationship_json_path)

    estimate_root = round_root / "knowledge-progress"
    round_json_inputs = existing_paths(list(carry_forward_round_json_paths or []))
    events_summary_path = events_path.with_name("events-summary.json")
    female_candidates_path = generic_candidates_path.with_name("female-interaction-candidates.jsonl")
    estimate_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "estimate_knowledge_completion.py").resolve()),
        "--round-id",
        round_id,
        "--observed-summary",
        repo_relative(effective_observed_summary_path),
        "--stable-knowledge",
        repo_relative(stable_json_path),
        "--relationship-evidence",
        repo_relative(effective_relationship_json_path),
        "--event-question-seeds",
        repo_relative(event_seed_json_path),
        "--source-event-packets",
        repo_relative(packet_json_path),
        "--events-summary",
        repo_relative(events_summary_path),
        "--ready-events",
        repo_relative(events_path),
        "--generic-candidates",
        repo_relative(generic_candidates_path),
        "--female-candidates",
        repo_relative(female_candidates_path),
        "--output-root",
        repo_relative(estimate_root),
    ]
    for round_json_path in round_json_inputs:
        estimate_command.extend(["--round-json", repo_relative(round_json_path)])
    if args.overwrite:
        estimate_command.append("--overwrite")
    estimate_result = run_command(estimate_command, dry_run=dry_run)
    progress_json_path = estimate_root / f"{round_id}.json"
    progress_payload = read_json(progress_json_path)
    completion_payload = (progress_payload if isinstance(progress_payload, dict) else {}).get("completion")
    overall_percent = (completion_payload if isinstance(completion_payload, dict) else {}).get("overallPercent")
    if overall_percent is None and isinstance(progress_payload, dict):
        overall_percent = progress_payload.get("overallPercent")

    core_progress_root = round_root / "core-person-progress"
    rounds_root_path = generic_candidates_path.parent.parent / "knowledge-growth-rounds"
    core_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "estimate_core_person_completion.py").resolve()),
        "--round-id",
        round_id,
        "--observed-mentions",
        repo_relative(effective_observed_mentions_path),
        "--stable-knowledge",
        repo_relative(stable_json_path),
        "--event-question-seeds",
        repo_relative(event_seed_json_path),
        "--source-event-packets",
        repo_relative(packet_json_path),
        "--relationship-evidence",
        repo_relative(effective_relationship_json_path),
        "--ready-events",
        repo_relative(events_path),
        "--rounds-root",
        repo_relative(rounds_root_path),
        "--output-root",
        repo_relative(core_progress_root),
    ]
    if args.overwrite:
        core_command.append("--overwrite")
    core_result = run_command(core_command, dry_run=dry_run)
    core_progress_json_path = core_progress_root / f"{round_id}.json"

    scoreboard_refresh_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_full_roster_scoreboard.py").resolve()),
        "--generals",
        repo_relative(generals_path),
        "--events",
        repo_relative(events_path),
        "--generic-candidates",
        repo_relative(generic_candidates_path),
        "--pilot-report",
        repo_relative(pilot_report_path),
        "--relationship-evidence",
        repo_relative(effective_relationship_json_path),
        "--event-question-seeds",
        repo_relative(event_seed_json_path),
        "--output-root",
        repo_relative(scoreboard_root),
        "--profile",
        args.profile,
        "--lane-policy-config",
        repo_relative(lane_policy_config_path),
    ]
    for ranking_path in ranking_inputs:
        scoreboard_refresh_command.extend(["--seed-ranking-json", repo_relative(ranking_path)])
    scoreboard_refresh_command.extend(["--candidate-evidence-cards", repo_relative(cards_path)])
    if args.overwrite:
        scoreboard_refresh_command.append("--overwrite")
    scoreboard_refresh_result = run_command(scoreboard_refresh_command, dry_run=dry_run)
    if int(scoreboard_refresh_result.get("returnCode") or 0) == 0:
        scoreboard_result = scoreboard_refresh_result
    scoreboard_payload = read_json(scoreboard_json_path)
    scoreboard_rows = list((scoreboard_payload if isinstance(scoreboard_payload, dict) else {}).get("rows") or [])
    scoreboard_metrics = (scoreboard_payload if isinstance(scoreboard_payload, dict) else {}).get("metrics") or {}

    precision_result = run_precision_lane(
        args=args,
        run_root=round_root,
        round_id=round_id,
        scoreboard_rows=scoreboard_rows,
        scoreboard_json_path=scoreboard_json_path,
        progress_json_path=progress_json_path,
        relationship_json_path=effective_relationship_json_path,
        events_path=events_path,
        baseline_manifest=baseline_manifest,
        lane_profile_policy=lane_profile_policy,
        dry_run=dry_run,
    )
    precision_summary_payload = (precision_result or {}).get("summary") if isinstance((precision_result or {}).get("summary"), dict) else {}
    precision_metrics = (
        extract_precision_location_metrics(precision_summary_payload)
        if isinstance(precision_summary_payload, dict) and precision_summary_payload
        else {
            "bReviewCount": 0,
            "totalDeltaOverallPercent": None,
            "locationGapBefore": None,
            "locationGapAfter": None,
            "locationGapDelta": None,
            "locationGapImproved": False,
            "autoReviewDecisionCount": 0,
            "reviewDecisionAppliedCount": 0,
        }
    )
    precision_final_paths = (
        precision_summary_payload.get("finalBaselinePaths")
        if isinstance(precision_summary_payload.get("finalBaselinePaths"), dict)
        else {}
    )
    precision_carry_events_path: Path | None = None
    precision_carry_relationship_path: Path | None = None
    precision_carry_progress_path: Path | None = None
    for key in ("baseEvents", "readyEvents", "readyEventsPath"):
        value = str((precision_final_paths or {}).get(key) or "").strip()
        if not value:
            continue
        candidate = resolve_existing_path(value)
        if candidate.exists():
            precision_carry_events_path = candidate
            break
    for key in ("baseRelationshipEvidence", "relationshipEvidence", "relationshipEvidencePath"):
        value = str((precision_final_paths or {}).get(key) or "").strip()
        if not value:
            continue
        candidate = resolve_existing_path(value)
        if candidate.exists():
            precision_carry_relationship_path = candidate
            break
    for key in ("baseProgress", "progress", "progressPath"):
        value = str((precision_final_paths or {}).get(key) or "").strip()
        if not value:
            continue
        candidate = resolve_existing_path(value)
        if candidate.exists():
            precision_carry_progress_path = candidate
            break

    three_lane_summary_path: Path | None = None
    three_lane_summary_payload: dict[str, Any] = {}
    three_lane_result: dict[str, Any] | None = None
    if args.run_three_lane:
        three_lane_root = round_root / "three-lane"
        three_lane_run_id = f"{round_id}-three-lane"
        three_lane_command = [
            sys.executable,
            str((REPO_ROOT / PIPELINE_ROOT / "run_three_lane_progress_scheduler.py").resolve()),
            "--run-id",
            three_lane_run_id,
            "--output-root",
            repo_relative(three_lane_root),
            "--pending-review-limit",
            str(max(args.human_pending_threshold, 1)),
        ]
        baseline_for_three_lane = baseline_path(baseline_manifest, "finalThreeLaneBaselineManifest", "threeLaneFinalBaselineManifest")
        if baseline_for_three_lane:
            baseline_resolved = resolve_existing_path(baseline_for_three_lane)
            if baseline_resolved.exists():
                three_lane_command.extend(["--baseline-manifest", repo_relative(baseline_resolved)])
        if args.overwrite:
            three_lane_command.append("--overwrite")
        three_lane_result = run_command(three_lane_command, dry_run=dry_run)
        three_lane_summary_path = three_lane_root / three_lane_run_id / "three-lane-progress-summary.json"
        three_lane_summary_payload = read_json(three_lane_summary_path)

    runtime_payload = run_runtime_readiness_with_ref_blitz(
        run_root=round_root,
        round_id=round_id,
        rows=scoreboard_rows,
        runtime_mode=args.runtime_readiness,
        dry_run=dry_run,
        overwrite=args.overwrite,
        enable_ref_blitz=bool(args.runtime_ref_blitz),
        max_events_per_general=max(args.runtime_ref_blitz_max_events_per_general, 1),
        stable_knowledge_path=stable_json_path,
        relationship_evidence_path=effective_relationship_json_path,
        source_event_packets_path=packet_json_path,
        core_report_path=core_progress_json_path,
    )
    runtime_round_summary_root = round_root / "runtime-readiness"
    runtime_round_summary_path = runtime_round_summary_root / "runtime-readiness-summary.json"
    runtime_round_summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-runtime-readiness-summary",
        "canonicalWrites": False,
        "roundId": round_id,
        "runtimeMode": args.runtime_readiness,
        "summaryPath": repo_relative(runtime_round_summary_path),
        "primarySummaryPath": runtime_payload.get("primarySummaryPath"),
        "primaryFailCount": runtime_payload.get("primaryFailCount"),
        "statusCounts": runtime_payload.get("statusCounts"),
        "failCount": runtime_payload.get("failCount"),
        "warnCount": runtime_payload.get("warnCount"),
        "refBlitzApplied": runtime_payload.get("refBlitzApplied"),
        "refBlitzReason": runtime_payload.get("refBlitzReason"),
        "refBlitzFailGeneralCount": runtime_payload.get("refBlitzFailGeneralCount"),
        "refBlitzResolvedCount": runtime_payload.get("refBlitzResolvedCount"),
        "refBlitzUnresolvedCount": runtime_payload.get("refBlitzUnresolvedCount"),
        "refBlitzSyntheticEventCount": runtime_payload.get("refBlitzSyntheticEventCount"),
        "refBlitzRuntimeProfileRoot": runtime_payload.get("refBlitzRuntimeProfileRoot"),
        "refBlitzRerunSummaryPath": runtime_payload.get("refBlitzRerunSummaryPath"),
        "refBlitzSyntheticEventsPath": runtime_payload.get("refBlitzSyntheticEventsPath"),
        "refBlitzNoPacketGenerals": runtime_payload.get("refBlitzNoPacketGenerals"),
        "refBlitzCreatedPerGeneral": runtime_payload.get("refBlitzCreatedPerGeneral"),
        "refBlitzExport": runtime_payload.get("refBlitzExport"),
        "refBlitzRerun": runtime_payload.get("refBlitzRerun"),
        "selectedGeneralIds": runtime_payload.get("selectedGeneralIds"),
        "failGeneralIds": runtime_payload.get("failGeneralIds"),
        "rows": runtime_payload.get("rows"),
    }
    write_json(runtime_round_summary_path, runtime_round_summary)

    round_summary_root = round_root / "round-summaries"
    round_summary_command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "build_full_roster_round_summaries.py").resolve()),
        "--round-id",
        round_id,
        "--scoreboard-json",
        repo_relative(scoreboard_json_path),
        "--progress-json",
        repo_relative(progress_json_path),
        "--relationship-evidence-jsonl",
        repo_relative(effective_relationship_json_path),
        "--runtime-readiness-summary",
        repo_relative(runtime_round_summary_path),
        "--item-relationship-overlay-summary",
        repo_relative(item_relationship_root / "item-relationship-overlay-summary.json"),
        "--output-root",
        repo_relative(round_summary_root),
    ]
    if baseline_scoreboard_path:
        round_summary_command.extend(["--baseline-scoreboard-json", repo_relative(baseline_scoreboard_path)])
    if baseline_progress_path:
        round_summary_command.extend(["--baseline-progress-json", repo_relative(baseline_progress_path)])
    if baseline_relationship_path:
        round_summary_command.extend(["--baseline-relationship-evidence-jsonl", repo_relative(baseline_relationship_path)])
    if args.overwrite:
        round_summary_command.append("--overwrite")
    round_summary_result = run_command(round_summary_command, dry_run=dry_run)
    scoreboard_summary_json_path = round_summary_root / "full-roster-scoreboard-summary.json"
    scoreboard_summary_md_path = round_summary_root / "full-roster-scoreboard-summary.zh-TW.md"
    bottleneck_delta_json_path = round_summary_root / "full-roster-bottleneck-delta.json"
    bottleneck_delta_md_path = round_summary_root / "full-roster-bottleneck-delta.zh-TW.md"
    next_lane_summary_json_path = round_summary_root / "full-roster-next-lane-summary.json"
    next_lane_summary_md_path = round_summary_root / "full-roster-next-lane-summary.zh-TW.md"

    return {
        "roundIndex": round_index,
        "roundId": round_id,
        "roundRoot": repo_relative(round_root),
        "externalSummaryPath": repo_relative(external_summary_path),
        "externalSourceRoiPath": repo_relative(external_roi_md_path),
        "externalCardsPath": repo_relative(cards_path),
        "globalSeedRankingPath": global_seed_pipeline.get("rankingPath"),
        "globalCandidateCardsPath": global_seed_pipeline.get("candidateCardsPath"),
        "rankingInputPaths": [repo_relative(path) for path in ranking_inputs],
        "roundJsonPaths": [repo_relative(path) for path in round_json_inputs],
        "carryForwardExternalCardPathCount": len(carry_forward_card_paths),
        "carryForwardSeedRankingPathCount": len(carry_forward_ranking_paths),
        "carryForwardRoundJsonPathCount": len(round_json_inputs),
        "sourceRoiDecisions": source_roi_decisions,
        "overlayObservedMentionsPath": repo_relative(overlay_observed_mentions_path),
        "overlayObservedSummaryPath": repo_relative(overlay_observed_summary_path),
        "mergedObservedMentionsPath": repo_relative(effective_observed_mentions_path),
        "mergedObservedSummaryPath": repo_relative(effective_observed_summary_path),
        "pilotReportPath": repo_relative(pilot_report_path),
        "reviewQueuePath": repo_relative(review_queue_path),
        "scoreboardJsonPath": repo_relative(scoreboard_json_path),
        "scoreboardMarkdownPath": repo_relative(scoreboard_root / "full-roster-scoreboard.zh-TW.md"),
        "scorecardJsonPath": repo_relative(scoreboard_root / "full-roster-scorecard.json"),
        "scorecardMarkdownPath": repo_relative(scoreboard_root / "full-roster-scorecard.zh-TW.md"),
        "shadowRosterPath": repo_relative(scoreboard_root / "shadow-roster-index.json"),
        "stableKnowledgePath": repo_relative(stable_json_path),
        "relationshipEvidencePath": repo_relative(effective_relationship_json_path),
        "baseRelationshipEvidencePath": repo_relative(relationship_json_path),
        "externalRelationshipEvidencePath": repo_relative(external_relationship_json_path),
        "itemRelationshipEvidencePath": repo_relative(item_relationship_json_path) if item_relationship_json_path else None,
        "relationshipMergeSummaryPath": repo_relative(merged_relationship_summary_path),
        "eventQuestionSeedsPath": repo_relative(event_seed_json_path),
        "sourceEventPacketsPath": repo_relative(packet_json_path),
        "progressJsonPath": repo_relative(progress_json_path),
        "coreProgressJsonPath": repo_relative(core_progress_json_path),
        "baselineScoreboardJsonPath": repo_relative(baseline_scoreboard_path) if baseline_scoreboard_path else None,
        "baselineProgressJsonPath": repo_relative(baseline_progress_path) if baseline_progress_path else None,
        "baselineRelationshipEvidencePath": repo_relative(baseline_relationship_path) if baseline_relationship_path else None,
        "precisionSummaryPath": (precision_result or {}).get("summaryPath"),
        "precisionBaselineManifestPath": (precision_result or {}).get("baselineManifestPath"),
        "precisionGeneralIds": (precision_result or {}).get("selectedGeneralIds"),
        "precisionSelection": (precision_result or {}).get("selection"),
        "precisionMetrics": precision_metrics,
        "precisionCarryReadyEventsPath": repo_relative(precision_carry_events_path) if precision_carry_events_path else None,
        "precisionCarryRelationshipEvidencePath": (
            repo_relative(precision_carry_relationship_path) if precision_carry_relationship_path else None
        ),
        "precisionCarryProgressPath": repo_relative(precision_carry_progress_path) if precision_carry_progress_path else None,
        "threeLaneSummaryPath": repo_relative(three_lane_summary_path) if three_lane_summary_path else None,
        "threeLaneStopReason": (three_lane_summary_payload if isinstance(three_lane_summary_payload, dict) else {}).get("stopReason"),
        "threeLaneFinalBaselineManifest": (three_lane_summary_payload if isinstance(three_lane_summary_payload, dict) else {}).get("finalBaselineManifest"),
        "runtimeReadinessSummaryPath": runtime_payload.get("summaryPath"),
        "runtimeReadinessPrimarySummaryPath": runtime_payload.get("primarySummaryPath"),
        "runtimeRefBlitzApplied": runtime_payload.get("refBlitzApplied"),
        "runtimeRefBlitzReason": runtime_payload.get("refBlitzReason"),
        "runtimeRefBlitzFailGeneralCount": runtime_payload.get("refBlitzFailGeneralCount"),
        "runtimeRefBlitzResolvedCount": runtime_payload.get("refBlitzResolvedCount"),
        "runtimeRefBlitzSyntheticEventCount": runtime_payload.get("refBlitzSyntheticEventCount"),
        "runtimeRefBlitzRuntimeProfileRoot": runtime_payload.get("refBlitzRuntimeProfileRoot"),
        "runtimeRefBlitzRerunSummaryPath": runtime_payload.get("refBlitzRerunSummaryPath"),
        "runtimeReadinessRoundSummaryPath": repo_relative(runtime_round_summary_path),
        "scoreboardSummaryJsonPath": repo_relative(scoreboard_summary_json_path),
        "scoreboardSummaryMarkdownPath": repo_relative(scoreboard_summary_md_path),
        "bottleneckDeltaJsonPath": repo_relative(bottleneck_delta_json_path),
        "bottleneckDeltaMarkdownPath": repo_relative(bottleneck_delta_md_path),
        "nextLaneSummaryJsonPath": repo_relative(next_lane_summary_json_path),
        "nextLaneSummaryMarkdownPath": repo_relative(next_lane_summary_md_path),
        "roundSummaryRoot": repo_relative(round_summary_root),
        "runtimeReadinessFailCount": runtime_payload.get("failCount"),
        "pendingReviewCount": pilot_pending_count,
        "newEvidenceCardCount": int(external_summary.get("newEvidenceCardCount") or 0),
        "avgHistoricalTrustScore": (scoreboard_metrics or {}).get("avgHistoricalTrustScore"),
        "avgWorldbuildingUsabilityScore": (scoreboard_metrics or {}).get("avgWorldbuildingUsabilityScore"),
        "overallPercent": overall_percent,
        "residualSignature": build_residual_signature(scoreboard_rows),
        "commands": {
            "pilot": pilot_result,
            "globalSeedHarvest": global_seed_pipeline.get("harvestCommand"),
            "globalSeedScore": global_seed_pipeline.get("scoreCommand"),
            "globalSeedPromote": global_seed_pipeline.get("promoteCommand"),
            "overlayObserved": observed_overlay_result,
            "mergeObserved": merge_observed_result,
            "scoreboard": scoreboard_result,
            "stableKnowledge": stable_result,
            "relationshipEvidence": relationship_result,
            "externalRelationshipOverlay": external_relationship_result,
            "itemRelationshipOverlay": item_relationship_result,
            "eventQuestionSeeds": event_seed_result,
            "sourceEventPackets": packet_result,
            "estimateKnowledge": estimate_result,
            "estimateCorePerson": core_result,
            "precisionLane": (precision_result or {}).get("command"),
            "scoreboardRefresh": scoreboard_refresh_result,
            "threeLane": three_lane_result,
            "roundSummaries": round_summary_result,
        },
        "externalSummary": external_summary,
        "scoreboardRows": scoreboard_rows,
        "runtimeReadiness": runtime_payload,
    }


def render_summary_md(summary: dict[str, Any]) -> str:
    lines = [
        "# Full Roster Convergence Loop",
        "",
        f"- Run ID: `{summary.get('runId')}`",
        f"- Generated At: `{summary.get('generatedAt')}`",
        f"- canonicalWrites: `{summary.get('canonicalWrites')}`",
        f"- Dry Run: `{summary.get('dryRun')}`",
        f"- Rounds Executed: `{summary.get('roundsExecuted')}`",
        f"- Stop Reason: `{summary.get('stopReason')}`",
        f"- Next Action: {summary.get('nextAction')}",
        "",
        "## Rounds",
        "",
        "| Round | New Evidence | Pending | Avg H-Score | Avg W-Score | Overall % | Precision | Precision Carry | Three-Lane | Runtime Fail | Ref Blitz |",
        "|---|---:|---:|---:|---:|---:|---|---|---|---:|---|",
    ]
    for row in summary.get("rounds") or []:
        runtime_ref_blitz = "-"
        if row.get("runtimeRefBlitzApplied"):
            runtime_ref_blitz = "applied {resolved}->{unresolved}".format(
                resolved=row.get("runtimeRefBlitzResolvedCount") or 0,
                unresolved=row.get("runtimeReadinessFailCount") or 0,
            )
        elif row.get("runtimeRefBlitzReason"):
            runtime_ref_blitz = str(row.get("runtimeRefBlitzReason"))
        carry_decision = row.get("precisionCarryDecision") if isinstance(row.get("precisionCarryDecision"), dict) else {}
        carry_text = "-"
        if carry_decision:
            status = "apply" if carry_decision.get("applied") else "skip"
            carry_text = f"{status}:{carry_decision.get('reason') or '-'}"
        lines.append(
            "| `{rid}` | `{new}` | `{pending}` | `{h}` | `{w}` | `{overall}` | `{precision}` | `{carry}` | `{three}` | `{runtime_fail}` | {ref_blitz} |".format(
                rid=row.get("roundId"),
                new=row.get("newEvidenceCardCount"),
                pending=row.get("pendingReviewCount"),
                h=row.get("avgHistoricalTrustScore"),
                w=row.get("avgWorldbuildingUsabilityScore"),
                overall=row.get("overallPercent"),
                precision=row.get("precisionSummaryPath") or "-",
                carry=carry_text,
                three=row.get("threeLaneStopReason") or "-",
                runtime_fail=row.get("runtimeReadinessFailCount") or 0,
                ref_blitz=runtime_ref_blitz,
            )
        )
    lines.extend(
        [
            "",
            "## Output",
            "",
            f"- Baseline Manifest: `{summary.get('outputs', {}).get('baselineManifestPath')}`",
            f"- Rule Proposals: `{summary.get('outputs', {}).get('ruleProposalsMarkdownPath')}`",
            f"- Scoreboard Summary: `{summary.get('outputs', {}).get('scoreboardSummaryMarkdownPath')}`",
            f"- Bottleneck Delta: `{summary.get('outputs', {}).get('bottleneckDeltaMarkdownPath')}`",
            f"- Next Lane Summary: `{summary.get('outputs', {}).get('nextLaneSummaryMarkdownPath')}`",
            f"- Runtime Readiness Round Summary: `{summary.get('outputs', {}).get('runtimeReadinessRoundSummaryPath')}`",
            f"- Summary JSON: `{summary.get('outputs', {}).get('summaryJsonPath')}`",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run full roster convergence loop for Sanguo ETL/RAG external evidence highway.")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--lane-policy-config", default=str(DEFAULT_LANE_POLICY_CONFIG))
    parser.add_argument("--baseline-manifest", default=None)
    parser.add_argument("--carry-forward-manifest", action="append", default=[])
    parser.add_argument("--round-json", action="append", default=[])
    parser.add_argument("--round-json-root", default=str(DEFAULT_ROUND_JSON_ROOT))
    parser.add_argument("--round-json-fallback-limit", type=int, default=6)
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH))
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--observed-summary", default=str(DEFAULT_OBSERVED_SUMMARY_PATH))
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH))
    parser.add_argument("--generic-candidates", default=str(DEFAULT_GENERIC_CANDIDATES_PATH))
    parser.add_argument("--top", type=int, default=500)
    parser.add_argument("--include-cold", type=int, default=10)
    parser.add_argument("--profile", choices=PROFILE_CHOICES, default="all")
    parser.add_argument("--max-rounds", type=int, default=3)
    parser.add_argument("--human-pending-threshold", type=int, default=20)
    parser.add_argument("--no-new-evidence-patience", type=int, default=2)
    parser.add_argument("--score-delta-threshold", type=float, default=0.05)
    parser.add_argument("--score-delta-patience", type=int, default=2)
    parser.add_argument("--same-residual-repeat-limit", type=int, default=2)
    parser.add_argument("--failure-rate-limit", type=float, default=0.20)
    parser.add_argument("--max-wall-time-minutes", type=float, default=None)
    parser.add_argument("--enable-source-roi-policy", dest="enable_source_roi_policy", action="store_true")
    parser.add_argument("--disable-source-roi-policy", dest="enable_source_roi_policy", action="store_false")
    parser.set_defaults(enable_source_roi_policy=True)
    parser.add_argument("--source-roi-auto-retire-reject", dest="source_roi_auto_retire_reject", action="store_true")
    parser.add_argument("--no-source-roi-auto-retire-reject", dest="source_roi_auto_retire_reject", action="store_false")
    parser.set_defaults(source_roi_auto_retire_reject=True)
    parser.add_argument("--source-roi-downsample-low", dest="source_roi_downsample_low", action="store_true")
    parser.add_argument("--no-source-roi-downsample-low", dest="source_roi_downsample_low", action="store_false")
    parser.set_defaults(source_roi_downsample_low=True)
    parser.add_argument("--source-roi-low-sample-factor", type=float, default=0.35)
    parser.add_argument("--source-roi-min-seed-page-high-yield", type=float, default=1.0)
    parser.add_argument("--source-roi-min-card-page-high-yield", type=float, default=0.4)
    parser.add_argument("--source-roi-min-seed-page-community", type=float, default=0.8)
    parser.add_argument("--source-roi-min-card-page-community", type=float, default=0.2)
    parser.add_argument("--source-roi-min-primary-cards", type=int, default=20)
    parser.add_argument("--source-roi-min-primary-seeds", type=int, default=20)
    parser.add_argument("--run-precision-lane", dest="run_precision_lane", action="store_true")
    parser.add_argument("--no-precision-lane", dest="run_precision_lane", action="store_false")
    parser.set_defaults(run_precision_lane=True)
    parser.add_argument(
        "--seed-to-card-priority-limit",
        type=int,
        default=180,
        help="Only promote seed->card for top priority seed-to-card people from scoreboard (0 disables filtering).",
    )
    parser.add_argument("--seed-to-card-min-score", type=float, default=70.0)
    parser.add_argument("--seed-to-card-priority-general-id", action="append", default=[])
    parser.add_argument("--precision-top-generals", type=int, default=12)
    parser.add_argument("--precision-top-per-general", type=int, default=3)
    parser.add_argument("--precision-general-id", action="append", default=[])
    parser.add_argument(
        "--precision-auto-review-root-cause",
        action="append",
        default=[],
        help="Pass-through auto review root causes for precision lane progress loop.",
    )
    parser.add_argument(
        "--precision-auto-review-location-gap",
        dest="precision_auto_review_location_gap",
        action="store_true",
        help="Enable location-gap auto B decisions in precision lane (default on).",
    )
    parser.add_argument(
        "--no-precision-auto-review-location-gap",
        dest="precision_auto_review_location_gap",
        action="store_false",
        help="Disable location-gap auto B decisions in precision lane.",
    )
    parser.set_defaults(precision_auto_review_location_gap=True)
    parser.add_argument(
        "--precision-auto-review-answer",
        default="B",
        help="Answer code for precision auto review decisions (default B).",
    )
    parser.add_argument(
        "--precision-auto-review-max-items",
        type=int,
        default=0,
        help="Cap auto-generated review decisions in precision lane (0 means all matched).",
    )
    parser.add_argument(
        "--precision-carry-guard",
        dest="precision_carry_guard",
        action="store_true",
        help="Require positive precision merge signals before carrying precision ready-events into the next full round.",
    )
    parser.add_argument(
        "--no-precision-carry-guard",
        dest="precision_carry_guard",
        action="store_false",
        help="Always carry precision ready-events when present.",
    )
    parser.set_defaults(precision_carry_guard=True)
    parser.add_argument(
        "--precision-carry-min-delta",
        type=float,
        default=0.0,
        help="Minimum precision total delta (overall percent) required when location-gap trend is unavailable.",
    )
    parser.add_argument(
        "--precision-carry-require-location-improvement",
        dest="precision_carry_require_location_improvement",
        action="store_true",
        help="Carry precision ready-events only when location-gap residual trend improves (default on).",
    )
    parser.add_argument(
        "--no-precision-carry-require-location-improvement",
        dest="precision_carry_require_location_improvement",
        action="store_false",
        help="Allow carry-forward without location-gap improvement when other signals pass.",
    )
    parser.set_defaults(precision_carry_require_location_improvement=True)
    parser.add_argument(
        "--precision-scoreboard-bridge",
        dest="precision_scoreboard_bridge",
        action="store_true",
        help="Enable scoreboard repair bridge in precision lane.",
    )
    parser.add_argument(
        "--no-precision-scoreboard-bridge",
        dest="precision_scoreboard_bridge",
        action="store_false",
        help="Disable scoreboard repair bridge in precision lane.",
    )
    parser.set_defaults(precision_scoreboard_bridge=True)
    parser.add_argument(
        "--precision-bridge-fields",
        default="location,relationshipEdges",
        help="Comma-separated bridge fields for precision lane scoreboard bridge.",
    )
    parser.add_argument(
        "--precision-bridge-max-generals",
        type=int,
        default=220,
        help="Maximum bridged generals for precision lane scoreboard bridge.",
    )
    parser.add_argument(
        "--precision-bridge-max-per-general",
        type=int,
        default=2,
        help="Maximum bridged backlog rows per general in precision lane scoreboard bridge.",
    )
    parser.add_argument(
        "--precision-bridge-global",
        action="store_true",
        help="Run precision bridge globally instead of selected general IDs only.",
    )
    parser.add_argument(
        "--precision-use-baseline-manifest",
        action="store_true",
        help="Let precision lane reuse precisionBaselineManifestPath from baseline manifest (default off).",
    )
    parser.add_argument("--run-three-lane", action="store_true")
    parser.add_argument("--runtime-readiness", choices=["touched", "final", "off"], default="touched")
    parser.add_argument("--runtime-ref-blitz", dest="runtime_ref_blitz", action="store_true")
    parser.add_argument("--no-runtime-ref-blitz", dest="runtime_ref_blitz", action="store_false")
    parser.set_defaults(runtime_ref_blitz=True)
    parser.add_argument("--runtime-ref-blitz-max-events-per-general", type=int, default=12)
    parser.add_argument("--external-relationship-shadow-fallback", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.run_id = args.run_id or f"full-roster-convergence-{utc_stamp()}"
    run_root_base = resolve_existing_path(Path(args.output_root))
    run_root = run_root_base / args.run_id
    run_root.mkdir(parents=True, exist_ok=True)

    source_config_path = resolve_existing_path(args.source_config)
    lane_policy_config_path = resolve_existing_path(args.lane_policy_config)
    generals_path = resolve_existing_path(args.generals)
    events_path = resolve_existing_path(args.events)
    generic_candidates_path = resolve_existing_path(args.generic_candidates)
    observed_mentions_path = resolve_existing_path(args.observed_mentions)
    observed_summary_path = resolve_existing_path(args.observed_summary)
    lane_policy_payload = load_lane_policy(lane_policy_config_path)
    lane_profile_policy = profile_lane_policy(lane_policy_payload, args.profile)
    source_rows = source_rows_from_config(source_config_path)
    config_sanity = sanity_check_source_config(source_config_path, source_rows)
    approved_rows = approved_sources(source_rows)
    baseline_manifest = read_baseline_manifest(args.baseline_manifest)
    carry_forward_external_artifacts = collect_external_artifacts_from_manifest(baseline_manifest)
    carry_forward_round_json_paths = collect_round_json_paths_from_manifest(baseline_manifest)
    manual_round_json_paths = existing_paths([resolve_existing_path(path_text) for path_text in args.round_json])
    carry_forward_round_json_paths = existing_paths([*carry_forward_round_json_paths, *manual_round_json_paths])
    round_json_root_path = resolve_existing_path(args.round_json_root)
    for manifest_text in args.carry_forward_manifest:
        extra_manifest = read_baseline_manifest(manifest_text)
        carry_forward_external_artifacts = merge_external_artifacts(
            carry_forward_external_artifacts,
            collect_external_artifacts_from_manifest(extra_manifest),
        )
        carry_forward_round_json_paths = existing_paths(
            [*carry_forward_round_json_paths, *collect_round_json_paths_from_manifest(extra_manifest)]
        )
    fallback_round_json_paths: list[Path] = []
    if not carry_forward_round_json_paths:
        fallback_round_json_paths = collect_round_json_paths_from_root(
            round_json_root_path,
            limit=max(int(args.round_json_fallback_limit), 0),
        )
        carry_forward_round_json_paths = existing_paths([*carry_forward_round_json_paths, *fallback_round_json_paths])
    roster_names = load_roster_names(generals_path)
    generic_clues = collect_generic_clues(generic_candidates_path)

    rounds: list[dict[str, Any]] = []
    command_count = 0
    command_failures = 0
    stop_reason: str | None = None
    next_action = "run next convergence round"
    weak_delta_streak = 0
    zero_evidence_streak = 0
    repeat_residual_streak = 0
    previous_avg_world: float | None = None
    previous_signature: str | None = None
    previous_scoreboard_path: Path | None = None
    previous_a_map: dict[str, dict[str, Any]] = {}
    rumination_rows: list[dict[str, Any]] = []
    wall_clock_start = time.monotonic()
    human_batch_info: dict[str, Any] | None = None
    prior_source_results = previous_source_results_from_manifest(baseline_manifest)
    effective_events_path = events_path

    for round_index in range(1, max(args.max_rounds, 1) + 1):
        if args.max_wall_time_minutes is not None and args.max_wall_time_minutes > 0:
            elapsed_minutes = (time.monotonic() - wall_clock_start) / 60.0
            if elapsed_minutes >= args.max_wall_time_minutes:
                stop_reason = "max-wall-time-minutes"
                next_action = "wall time reached; inspect latest summary and resume from baseline manifest"
                break

        prepared_sources, source_roi_decisions = apply_source_roi_policy(
            sources=approved_rows,
            prior_results=prior_source_results,
            enable_roi_policy=bool(args.enable_source_roi_policy),
            auto_retire_reject=bool(args.source_roi_auto_retire_reject),
            downsample_low_roi=bool(args.source_roi_downsample_low),
            low_roi_sample_factor=float(args.source_roi_low_sample_factor),
            min_seed_page_high_yield=float(args.source_roi_min_seed_page_high_yield),
            min_card_page_high_yield=float(args.source_roi_min_card_page_high_yield),
            min_seed_page_community=float(args.source_roi_min_seed_page_community),
            min_card_page_community=float(args.source_roi_min_card_page_community),
            min_primary_cards=int(args.source_roi_min_primary_cards),
            min_primary_seeds=int(args.source_roi_min_primary_seeds),
        )

        round_events_input_path = effective_events_path
        round_info = run_round(
            args=args,
            run_root=run_root,
            round_index=round_index,
            source_config_path=source_config_path,
            generals_path=generals_path,
            events_path=effective_events_path,
            generic_candidates_path=generic_candidates_path,
            observed_mentions_path=observed_mentions_path,
            observed_summary_path=observed_summary_path,
            sources=prepared_sources,
            lane_policy_config_path=lane_policy_config_path,
            lane_profile_policy=lane_profile_policy,
            source_roi_decisions=source_roi_decisions,
            baseline_manifest=baseline_manifest,
            carry_forward_external_artifacts=carry_forward_external_artifacts,
            carry_forward_round_json_paths=carry_forward_round_json_paths,
            previous_scoreboard_path=previous_scoreboard_path,
            dry_run=args.dry_run,
        )
        round_snapshot = {key: value for key, value in round_info.items() if key not in {"externalSummary", "scoreboardRows", "runtimeReadiness"}}
        round_snapshot["eventsInputPath"] = repo_relative(round_events_input_path)
        precision_carry_events_text = str(round_info.get("precisionCarryReadyEventsPath") or "").strip()
        precision_carry_events_candidate: Path | None = None
        if precision_carry_events_text:
            candidate = resolve_existing_path(precision_carry_events_text)
            if candidate.exists():
                precision_carry_events_candidate = candidate
        precision_carry_decision = decide_precision_carry_forward(
            candidate_path=precision_carry_events_candidate,
            metrics=dict(round_info.get("precisionMetrics") or {}),
            guard_enabled=bool(args.precision_carry_guard),
            min_delta=float(args.precision_carry_min_delta),
            require_location_improvement=bool(args.precision_carry_require_location_improvement),
        )
        round_snapshot["precisionCarryDecision"] = precision_carry_decision
        if precision_carry_decision.get("applied") and precision_carry_events_candidate:
            effective_events_path = precision_carry_events_candidate
        round_snapshot["eventsOutputPath"] = repo_relative(effective_events_path)
        rounds.append(round_snapshot)
        carry_forward_external_artifacts = merge_external_artifacts(
            carry_forward_external_artifacts,
            collect_external_artifacts_from_manifest({"paths": round_info}),
        )
        carry_forward_round_json_paths = existing_paths(
            [*carry_forward_round_json_paths, *collect_round_json_paths_from_manifest({"paths": round_info})]
        )
        current_source_results = (round_info.get("externalSummary") or {}).get("sourceResults")
        if isinstance(current_source_results, list):
            prior_source_results = {
                str(row.get("sourceId") or "").strip(): row
                for row in current_source_results
                if isinstance(row, dict) and str(row.get("sourceId") or "").strip()
            }

        for command_key, result in (round_info.get("commands") or {}).items():
            if not result:
                continue
            command_count += 1
            if int(result.get("returnCode") or 0) != 0:
                command_failures += 1

        new_cards = int(round_info.get("newEvidenceCardCount") or 0)
        zero_evidence_streak = zero_evidence_streak + 1 if new_cards == 0 else 0

        current_world = round_info.get("avgWorldbuildingUsabilityScore")
        delta_world: float | None = None
        if previous_avg_world is not None and current_world is not None:
            try:
                delta_world = float(current_world) - float(previous_avg_world)
            except (TypeError, ValueError):
                delta_world = None
        previous_avg_world = float(current_world) if current_world is not None else previous_avg_world

        if delta_world is not None and delta_world < args.score_delta_threshold:
            weak_delta_streak += 1
        elif delta_world is not None:
            weak_delta_streak = 0

        signature = str(round_info.get("residualSignature") or "")
        if previous_signature and signature == previous_signature:
            repeat_residual_streak += 1
        else:
            repeat_residual_streak = 0
        previous_signature = signature

        round_rows = list(round_info.get("scoreboardRows") or [])
        current_a_map: dict[str, dict[str, Any]] = {
            str(row.get("generalId") or ""): row
            for row in round_rows
            if str(row.get("reviewGrade") or "") == "A"
        }
        for general_id, old_row in previous_a_map.items():
            current_row = next((row for row in round_rows if str(row.get("generalId") or "") == general_id), None)
            if current_row is None:
                rumination_rows.append(
                    {
                        "auditId": f"rumination:{args.run_id}:{general_id}:{len(rumination_rows) + 1}",
                        "generalId": general_id,
                        "result": "downgrade-to-b",
                        "oldHistoricalTrustScore": old_row.get("historicalTrustScore"),
                        "newHistoricalTrustScore": None,
                        "downgradeReason": "general missing from current scoreboard",
                        "canonicalWrites": False,
                    }
                )
                continue
            old_score = float(old_row.get("historicalTrustScore") or 0.0)
            new_score = float(current_row.get("historicalTrustScore") or 0.0)
            new_grade = str(current_row.get("reviewGrade") or "")
            if new_grade != "A" or new_score < 75.0:
                rumination_rows.append(
                    {
                        "auditId": f"rumination:{args.run_id}:{general_id}:{len(rumination_rows) + 1}",
                        "generalId": general_id,
                        "result": "downgrade-to-b",
                        "oldHistoricalTrustScore": round(old_score, 2),
                        "newHistoricalTrustScore": round(new_score, 2),
                        "downgradeReason": "grade dropped or historical trust below 75",
                        "canonicalWrites": False,
                    }
                )
        previous_a_map = current_a_map
        previous_scoreboard_path = resolve_existing_path(round_info["scoreboardJsonPath"])

        human_batch_info = build_human_review_batch(
            run_root=run_root,
            run_id=args.run_id,
            rows=round_rows,
            generic_clues=generic_clues,
            threshold=max(args.human_pending_threshold, 1),
        )
        if human_batch_info:
            stop_reason = "human-pending-threshold"
            next_action = "human review batch reached threshold; answer MCQ first, then resume with baseline manifest"
            break

        runtime_fail = int((round_info.get("runtimeReadiness") or {}).get("failCount") or 0)
        if runtime_fail > 0:
            stop_reason = "runtime-readiness-fail"
            next_action = "runtime readiness has fail rows; fix fail generals before promotion lane"
            break

        if zero_evidence_streak >= max(args.no_new_evidence_patience, 1):
            stop_reason = "no-new-evidence-patience"
            next_action = "no new evidence across consecutive rounds; switch to rule proposals and manual source expansion"
            break

        if weak_delta_streak >= max(args.score_delta_patience, 1):
            stop_reason = "score-delta-patience"
            next_action = "worldbuilding delta is weak repeatedly; prioritize deterministic rule proposals"
            break

        if repeat_residual_streak >= max(args.same_residual_repeat_limit, 1):
            stop_reason = "same-residual-repeat-limit"
            next_action = "same residual pattern repeated; export dossier and update extractor rules"
            break

        failure_rate = command_failures / max(command_count, 1)
        if failure_rate > args.failure_rate_limit:
            stop_reason = "failure-rate-limit"
            next_action = "command failure rate exceeded limit; inspect failed command stderr and retry"
            break

    if stop_reason is None:
        stop_reason = "max-rounds"
        next_action = "max rounds reached; review scoreboard and resume with baseline manifest if needed"

    latest_round = rounds[-1] if rounds else {}
    latest_scoreboard_payload = (
        read_json(resolve_existing_path(latest_round.get("scoreboardJsonPath")))
        if latest_round.get("scoreboardJsonPath")
        else {}
    )
    latest_rows = list((latest_scoreboard_payload if isinstance(latest_scoreboard_payload, dict) else {}).get("rows") or [])
    proposals = build_rule_proposals(latest_rows)

    rule_json_path = run_root / "rule-proposals.json"
    rule_md_path = run_root / "rule-proposals.zh-TW.md"
    rule_payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "canonicalWrites": False,
        "proposals": proposals,
    }
    write_json(rule_json_path, rule_payload)
    rule_md_path.write_text(render_rule_proposals_md(proposals), encoding="utf-8")

    rumination_path = run_root / "rumination-downgrade-ledger.jsonl"
    write_jsonl(rumination_path, rumination_rows)

    baseline_output_path = run_root / "baseline-manifest.output.json"
    summary_json_path = run_root / "full-roster-convergence-summary.json"
    summary_md_path = run_root / "full-roster-convergence-summary.md"

    final_three_lane_manifest = latest_round.get("threeLaneFinalBaselineManifest")
    final_paths = {
        "scoreboardJsonPath": latest_round.get("scoreboardJsonPath"),
        "scoreboardMarkdownPath": latest_round.get("scoreboardMarkdownPath"),
        "scorecardJsonPath": latest_round.get("scorecardJsonPath"),
        "scorecardMarkdownPath": latest_round.get("scorecardMarkdownPath"),
        "shadowRosterPath": latest_round.get("shadowRosterPath"),
        "externalSummaryPath": latest_round.get("externalSummaryPath"),
        "externalSourceRoiPath": latest_round.get("externalSourceRoiPath"),
        "externalCardsPath": latest_round.get("externalCardsPath"),
        "globalSeedRankingPath": latest_round.get("globalSeedRankingPath"),
        "globalCandidateCardsPath": latest_round.get("globalCandidateCardsPath"),
        "rankingInputPaths": latest_round.get("rankingInputPaths"),
        "roundJsonPaths": latest_round.get("roundJsonPaths"),
        "overlayObservedMentionsPath": latest_round.get("overlayObservedMentionsPath"),
        "overlayObservedSummaryPath": latest_round.get("overlayObservedSummaryPath"),
        "mergedObservedMentionsPath": latest_round.get("mergedObservedMentionsPath"),
        "mergedObservedSummaryPath": latest_round.get("mergedObservedSummaryPath"),
        "pilotReportPath": latest_round.get("pilotReportPath"),
        "reviewQueuePath": latest_round.get("reviewQueuePath"),
        "stableKnowledgePath": latest_round.get("stableKnowledgePath"),
        "relationshipEvidencePath": latest_round.get("relationshipEvidencePath"),
        "baseRelationshipEvidencePath": latest_round.get("baseRelationshipEvidencePath"),
        "externalRelationshipEvidencePath": latest_round.get("externalRelationshipEvidencePath"),
        "relationshipMergeSummaryPath": latest_round.get("relationshipMergeSummaryPath"),
        "eventQuestionSeedsPath": latest_round.get("eventQuestionSeedsPath"),
        "sourceEventPacketsPath": latest_round.get("sourceEventPacketsPath"),
        "progressPath": latest_round.get("progressJsonPath"),
        "coreProgressPath": latest_round.get("coreProgressJsonPath"),
        "precisionSummaryPath": latest_round.get("precisionSummaryPath"),
        "precisionBaselineManifestPath": latest_round.get("precisionBaselineManifestPath"),
        "precisionCarryReadyEventsPath": latest_round.get("precisionCarryReadyEventsPath"),
        "precisionCarryRelationshipEvidencePath": latest_round.get("precisionCarryRelationshipEvidencePath"),
        "precisionCarryProgressPath": latest_round.get("precisionCarryProgressPath"),
        "threeLaneSummaryPath": latest_round.get("threeLaneSummaryPath"),
        "threeLaneFinalBaselineManifest": final_three_lane_manifest,
        "runtimeReadinessSummaryPath": latest_round.get("runtimeReadinessSummaryPath"),
        "runtimeReadinessPrimarySummaryPath": latest_round.get("runtimeReadinessPrimarySummaryPath"),
        "runtimeReadinessRoundSummaryPath": latest_round.get("runtimeReadinessRoundSummaryPath"),
        "runtimeRefBlitzRuntimeProfileRoot": latest_round.get("runtimeRefBlitzRuntimeProfileRoot"),
        "runtimeRefBlitzRerunSummaryPath": latest_round.get("runtimeRefBlitzRerunSummaryPath"),
        "scoreboardSummaryJsonPath": latest_round.get("scoreboardSummaryJsonPath"),
        "scoreboardSummaryMarkdownPath": latest_round.get("scoreboardSummaryMarkdownPath"),
        "bottleneckDeltaJsonPath": latest_round.get("bottleneckDeltaJsonPath"),
        "bottleneckDeltaMarkdownPath": latest_round.get("bottleneckDeltaMarkdownPath"),
        "nextLaneSummaryJsonPath": latest_round.get("nextLaneSummaryJsonPath"),
        "nextLaneSummaryMarkdownPath": latest_round.get("nextLaneSummaryMarkdownPath"),
        "roundSummaryRoot": latest_round.get("roundSummaryRoot"),
        "ruleProposalsJsonPath": repo_relative(rule_json_path),
        "ruleProposalsMarkdownPath": repo_relative(rule_md_path),
        "ruminationLedgerPath": repo_relative(rumination_path),
        "humanReviewBatchJsonPath": (human_batch_info or {}).get("jsonPath"),
        "humanReviewBatchMarkdownPath": (human_batch_info or {}).get("markdownPath"),
    }
    baseline_payload = {
        "version": "2.1.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-convergence-loop",
        "canonicalWrites": False,
        "runId": args.run_id,
        "stopReason": stop_reason,
        "initialBaselineManifest": args.baseline_manifest,
        "finalThreeLaneBaselineManifest": final_three_lane_manifest,
        "paths": final_paths,
        "metrics": {
            "roundsExecuted": len(rounds),
            "latestPendingReviewCount": latest_round.get("pendingReviewCount"),
            "commandCount": command_count,
            "commandFailureCount": command_failures,
            "commandFailureRate": round(command_failures / max(command_count, 1), 4),
        },
        "runtimeReadinessFailCount": latest_round.get("runtimeReadinessFailCount"),
        "runtimeRefBlitzApplied": latest_round.get("runtimeRefBlitzApplied"),
        "runtimeRefBlitzReason": latest_round.get("runtimeRefBlitzReason"),
        "runtimeRefBlitzFailGeneralCount": latest_round.get("runtimeRefBlitzFailGeneralCount"),
        "runtimeRefBlitzResolvedCount": latest_round.get("runtimeRefBlitzResolvedCount"),
        "runtimeRefBlitzSyntheticEventCount": latest_round.get("runtimeRefBlitzSyntheticEventCount"),
        "runtimeRefBlitzRuntimeProfileRoot": latest_round.get("runtimeRefBlitzRuntimeProfileRoot"),
        "runtimeRefBlitzRerunSummaryPath": latest_round.get("runtimeRefBlitzRerunSummaryPath"),
    }
    write_json(baseline_output_path, baseline_payload)

    summary_payload = {
        "version": "2.1.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-convergence-loop",
        "canonicalWrites": False,
        "dryRun": bool(args.dry_run),
        "runId": args.run_id,
        "outputRoot": repo_relative(run_root),
        "roundsExecuted": len(rounds),
        "stopReason": stop_reason,
        "nextAction": next_action,
        "policy": {
            "maxRounds": args.max_rounds,
            "humanPendingLimit": args.human_pending_threshold,
            "newEvidencePatience": args.no_new_evidence_patience,
            "scoreDeltaThreshold": args.score_delta_threshold,
            "scoreDeltaPatience": args.score_delta_patience,
            "sameResidualRepeatLimit": args.same_residual_repeat_limit,
            "failureRateLimit": args.failure_rate_limit,
            "runtimeReadiness": args.runtime_readiness,
            "runtimeRefBlitz": bool(args.runtime_ref_blitz),
            "runtimeRefBlitzMaxEventsPerGeneral": int(args.runtime_ref_blitz_max_events_per_general),
            "runPrecisionLane": args.run_precision_lane,
            "precisionScoreboardBridge": bool(args.precision_scoreboard_bridge),
            "precisionBridgeGlobal": bool(args.precision_bridge_global),
            "precisionBridgeFields": str(args.precision_bridge_fields or "location,relationshipEdges"),
            "precisionBridgeMaxGenerals": int(args.precision_bridge_max_generals),
            "precisionBridgeMaxPerGeneral": int(args.precision_bridge_max_per_general),
            "precisionUseBaselineManifest": bool(args.precision_use_baseline_manifest),
            "precisionAutoReviewLocationGap": bool(args.precision_auto_review_location_gap),
            "precisionAutoReviewRootCauses": [str(item or "").strip() for item in (args.precision_auto_review_root_cause or []) if str(item or "").strip()],
            "precisionAutoReviewAnswer": str(args.precision_auto_review_answer or "B"),
            "precisionAutoReviewMaxItems": int(args.precision_auto_review_max_items),
            "precisionCarryGuard": bool(args.precision_carry_guard),
            "precisionCarryMinDelta": float(args.precision_carry_min_delta),
            "precisionCarryRequireLocationImprovement": bool(args.precision_carry_require_location_improvement),
            "seedToCardPriorityLimit": int(args.seed_to_card_priority_limit),
            "runThreeLane": args.run_three_lane,
            "sourceRoiPolicy": {
                "enabled": bool(args.enable_source_roi_policy),
                "autoRetireReject": bool(args.source_roi_auto_retire_reject),
                "downsampleLowRoi": bool(args.source_roi_downsample_low),
                "lowSampleFactor": float(args.source_roi_low_sample_factor),
                "minSeedPageHighYield": float(args.source_roi_min_seed_page_high_yield),
                "minCardPageHighYield": float(args.source_roi_min_card_page_high_yield),
                "minSeedPageCommunity": float(args.source_roi_min_seed_page_community),
                "minCardPageCommunity": float(args.source_roi_min_card_page_community),
                "minPrimaryCards": int(args.source_roi_min_primary_cards),
                "minPrimarySeeds": int(args.source_roi_min_primary_seeds),
            },
        },
        "inputs": {
            "sourcesConfigPath": repo_relative(source_config_path),
            "lanePolicyConfigPath": repo_relative(lane_policy_config_path),
            "lanePolicyVersion": str(lane_policy_payload.get("version") or "1.0.0"),
            "baselineManifestInput": args.baseline_manifest,
            "baseObservedMentionsPath": repo_relative(observed_mentions_path),
            "baseObservedSummaryPath": repo_relative(observed_summary_path),
            "top": args.top,
            "includeCold": args.include_cold,
            "profile": args.profile,
            "laneProfilePolicy": lane_profile_policy,
            "approvedSourceCount": len(approved_rows),
            "rosterCount": len(roster_names),
            "sourceConfigSanity": config_sanity,
            "seedToCardMinScore": float(args.seed_to_card_min_score),
            "seedToCardPriorityGeneralIds": [str(item or "").strip() for item in (args.seed_to_card_priority_general_id or []) if str(item or "").strip()],
            "precisionGeneralIds": [str(item or "").strip() for item in (args.precision_general_id or []) if str(item or "").strip()],
            "externalRelationshipShadowFallback": bool(args.external_relationship_shadow_fallback),
            "manualRoundJsonPaths": [repo_relative(path) for path in manual_round_json_paths],
            "carryForwardRoundJsonPaths": [repo_relative(path) for path in carry_forward_round_json_paths],
            "roundJsonRoot": repo_relative(round_json_root_path),
            "fallbackRoundJsonPaths": [repo_relative(path) for path in fallback_round_json_paths],
            "initialEventsPath": repo_relative(events_path),
            "finalEventsPath": repo_relative(effective_events_path),
        },
        "outputs": {
            "summaryJsonPath": repo_relative(summary_json_path),
            "summaryMarkdownPath": repo_relative(summary_md_path),
            "baselineManifestPath": repo_relative(baseline_output_path),
            "ruleProposalsJsonPath": repo_relative(rule_json_path),
            "ruleProposalsMarkdownPath": repo_relative(rule_md_path),
            "ruminationLedgerPath": repo_relative(rumination_path),
            "humanReviewBatchJsonPath": (human_batch_info or {}).get("jsonPath"),
            "humanReviewBatchMarkdownPath": (human_batch_info or {}).get("markdownPath"),
            "scoreboardSummaryJsonPath": latest_round.get("scoreboardSummaryJsonPath"),
            "scoreboardSummaryMarkdownPath": latest_round.get("scoreboardSummaryMarkdownPath"),
            "bottleneckDeltaJsonPath": latest_round.get("bottleneckDeltaJsonPath"),
            "bottleneckDeltaMarkdownPath": latest_round.get("bottleneckDeltaMarkdownPath"),
            "nextLaneSummaryJsonPath": latest_round.get("nextLaneSummaryJsonPath"),
            "nextLaneSummaryMarkdownPath": latest_round.get("nextLaneSummaryMarkdownPath"),
            "runtimeReadinessRoundSummaryPath": latest_round.get("runtimeReadinessRoundSummaryPath"),
            "roundSummaryRoot": latest_round.get("roundSummaryRoot"),
        },
        "rounds": rounds,
        "runtimeReadinessFailCount": latest_round.get("runtimeReadinessFailCount"),
        "runtimeRefBlitzApplied": latest_round.get("runtimeRefBlitzApplied"),
        "runtimeRefBlitzReason": latest_round.get("runtimeRefBlitzReason"),
        "runtimeRefBlitzFailGeneralCount": latest_round.get("runtimeRefBlitzFailGeneralCount"),
        "runtimeRefBlitzResolvedCount": latest_round.get("runtimeRefBlitzResolvedCount"),
        "runtimeRefBlitzSyntheticEventCount": latest_round.get("runtimeRefBlitzSyntheticEventCount"),
        "runtimeRefBlitzRuntimeProfileRoot": latest_round.get("runtimeRefBlitzRuntimeProfileRoot"),
        "runtimeRefBlitzRerunSummaryPath": latest_round.get("runtimeRefBlitzRerunSummaryPath"),
    }
    write_json(summary_json_path, summary_payload)
    summary_md_path.write_text(render_summary_md(summary_payload), encoding="utf-8")

    print(f"[run_full_roster_convergence_loop] wrote {summary_json_path}")
    print(f"[run_full_roster_convergence_loop] wrote {summary_md_path}")
    print(f"[run_full_roster_convergence_loop] wrote {baseline_output_path}")
    print(
        "[run_full_roster_convergence_loop] "
        f"runId={args.run_id} rounds={len(rounds)} stopReason={stop_reason} "
        f"approvedSources={len(approved_rows)} canonicalWrites=false"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
