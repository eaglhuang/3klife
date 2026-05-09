from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


DEFAULT_CHAPTERS_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
DEFAULT_ALIAS_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary")
DEFAULT_OBSERVED_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions")
DEFAULT_DECISION_PATH = Path("server/npc-brain/pipelines/sanguo-rag/config/unresolved-triage-decisions.json")
DEFAULT_MANUAL_ROSTER_PATH = Path("server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json")
DEFAULT_ALIAS_OVERRIDE_PATH = Path("server/npc-brain/pipelines/sanguo-rag/config/general-alias-overrides.json")
DEFAULT_CHOICES_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop")
DEFAULT_POSTGRES_IMPORTER = Path("server/npc-brain/pipelines/sanguo-rag/import_resolution_seed_to_postgres.py")
DEFAULT_PG_DSN_ENV = "SANGUO_RAG_PG_DSN"
ROMANCE_CHARACTER_LIST_RAW_URL = "https://zh.wikipedia.org/w/index.php?title=%E4%B8%89%E5%9B%BD%E6%BC%94%E4%B9%89%E8%A7%92%E8%89%B2%E5%88%97%E8%A1%A8&action=raw"
DEFAULT_ROMANCE_CHARACTER_CACHE_PATH = DEFAULT_CHOICES_ROOT / "romance-character-list-cache.json"
DECORATIVE_WRAPPER_CHARS = "【】[]()（）「」『』《》〈〉"
ROMANCE_LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
COMPOUND_NOISE_SUFFIXES = set("兵軍卒士眾隊陣船糧草馬")
COMPOUND_TITLE_OR_PLACE_SUFFIXES = set("王侯公帝君州郡縣城國關寨河山水海")
OPTION_RANK_ORDER = {"A": 0, "B": 1, "C": 2, "D": 3}
CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}
PIPELINE_PYTHON_CACHE: str | None = None


def python_can_import_pydantic(python_path: str) -> bool:
    try:
        result = subprocess.run(
            [python_path, "-c", "import pydantic"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return False
    return result.returncode == 0


def resolve_pipeline_python() -> str:
    global PIPELINE_PYTHON_CACHE
    if PIPELINE_PYTHON_CACHE:
        return PIPELINE_PYTHON_CACHE

    candidates: list[str] = []
    env_python = os.environ.get("SANGUO_RAG_PYTHON")
    if env_python:
        candidates.append(env_python)
    candidates.extend(
        [
            sys.executable,
            str(Path.home() / ".venv/3klife-etl/bin/python"),
            "server/npc-brain/.venv/bin/python",
            ".venv/bin/python",
        ]
    )

    for python_path in candidates:
        if python_can_import_pydantic(python_path):
            if python_path != sys.executable:
                print(f"[resolution_loop] using pipeline python: {python_path}")
            PIPELINE_PYTHON_CACHE = python_path
            return python_path

    raise RuntimeError(
        "No Python interpreter with pydantic found. Activate the ETL venv or set SANGUO_RAG_PYTHON. "
        "Expected example: ~/.venv/3klife-etl/bin/python"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Sanguo mention resolution loop and emit human triage MCQs.")
    parser.add_argument("--chapters-root", default=str(DEFAULT_CHAPTERS_ROOT), help="Mao corpus chapter markdown root")
    parser.add_argument("--alias-output-root", default=str(DEFAULT_ALIAS_OUTPUT_ROOT), help="Alias dictionary output root")
    parser.add_argument("--observed-output-root", default=str(DEFAULT_OBSERVED_OUTPUT_ROOT), help="Observed mentions output root")
    parser.add_argument("--triage-decisions", default=str(DEFAULT_DECISION_PATH), help="Human triage decision JSON")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="Manual roster seed JSON used when auto-applying answers")
    parser.add_argument("--alias-overrides", default=str(DEFAULT_ALIAS_OVERRIDE_PATH), help="Curated alias override JSON used as secondary recommendation evidence")
    parser.add_argument("--choices-root", default=str(DEFAULT_CHOICES_ROOT), help="Output directory for generated MCQ files")
    parser.add_argument("--top", type=int, default=30, help="Number of unresolved labels to turn into MCQs")
    parser.add_argument(
        "--collect-sink",
        choices=("json", "postgres"),
        default="json",
        help="Sink mode for collect_observed_mentions. `json` keeps legacy output; `postgres` writes mentions incrementally to PostgreSQL.",
    )
    parser.add_argument(
        "--top-source",
        choices=("auto", "summary", "postgres"),
        default="auto",
        help="Source of unresolved top-N labels: summary JSON, postgres query, or auto fallback.",
    )
    parser.add_argument(
        "--pg-dsn",
        default="",
        help=f"PostgreSQL DSN. If omitted, read from env {DEFAULT_PG_DSN_ENV}.",
    )
    parser.add_argument("--max-iterations", type=int, default=1, help="Number of automatic loop iterations to run")
    parser.add_argument("--apply-answers", action="store_true", help="Apply any existing answered MCQs before rebuilding the loop")
    parser.add_argument(
        "--auto-fill-suggestions",
        action="store_true",
        help="Conservatively fill blank answers from existing suggestedAnswer before apply/rebuild",
    )
    parser.add_argument(
        "--auto-review-uncertain",
        action="store_true",
        help="Fill remaining non-high-confidence suggestions as C review-pending to clear the unclassified queue",
    )
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_label(value: str) -> str:
    cleaned = value.strip().strip(DECORATIVE_WRAPPER_CHARS)
    cleaned = re.sub(r"[\s　]+", "", cleaned)
    cleaned = re.sub(r"[·•‧・]", "", cleaned)
    return cleaned.strip().lower()


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 3KLife-Copilot/1.0"})
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8")


def unique_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        normalized = normalize_label(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(value.strip())
    return ordered


def extract_romance_names_from_first_cell(first_cell: str) -> list[str]:
    candidates: list[str] = []
    for target, label in ROMANCE_LINK_RE.findall(first_cell):
        display = str(label or target).strip()
        canonical = str(target).strip()
        if display:
            candidates.append(display)
        if canonical:
            candidates.append(canonical)
    if candidates:
        return unique_preserving_order(candidates)
    fallback = re.split(r"[（(，、/；:：\s]", first_cell, maxsplit=1)[0].strip()
    if fallback and re.search(r"[\u3400-\u9fff\U00020000-\U0002A6DF]", fallback):
        return unique_preserving_order([fallback])
    return []


def build_romance_character_index(raw_text: str) -> dict:
    names_by_normalized: dict[str, list[str]] = {}
    row_count = 0
    row_cells: list[str] = []

    def flush_row(cells: list[str]) -> None:
        nonlocal row_count
        if not cells:
            return
        first_cell = cells[0].strip()
        if not first_cell:
            return
        names = extract_romance_names_from_first_cell(first_cell)
        if not names:
            return
        row_count += 1
        for name in names:
            normalized = normalize_label(name)
            if not normalized:
                continue
            names_by_normalized.setdefault(normalized, [])
            if name not in names_by_normalized[normalized]:
                names_by_normalized[normalized].append(name)

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if line == "|-":
            flush_row(row_cells)
            row_cells = []
            continue
        if line == "|}":
            flush_row(row_cells)
            row_cells = []
            continue
        if line.startswith("|") and not line.startswith("|-"):
            row_cells.append(line[1:].strip())

    flush_row(row_cells)
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "sourceUrl": ROMANCE_CHARACTER_LIST_RAW_URL,
        "entryCount": len(names_by_normalized),
        "rowCount": row_count,
        "namesByNormalized": names_by_normalized,
    }


def load_romance_character_index(cache_path: Path) -> dict:
    cached_payload = read_json(cache_path) if cache_path.exists() else None
    try:
        raw_text = fetch_text(ROMANCE_CHARACTER_LIST_RAW_URL)
        payload = build_romance_character_index(raw_text)
        payload["loadedFrom"] = "live"
        write_json(cache_path, payload)
        print(
            "[resolution_loop] "
            f"romance-character-index loadedFrom=live entries={payload['entryCount']} cache={cache_path}"
        )
        return payload
    except Exception as error:
        if cached_payload:
            payload = dict(cached_payload)
            payload["loadedFrom"] = "cache"
            payload["lastFetchError"] = str(error)
            print(
                "[resolution_loop] "
                f"romance-character-index loadedFrom=cache entries={payload.get('entryCount', 0)} reason={error}"
            )
            return payload
        print(f"[resolution_loop] romance-character-index unavailable: {error}")
        return {
            "version": "1.0.0",
            "generatedAt": utc_now(),
            "sourceUrl": ROMANCE_CHARACTER_LIST_RAW_URL,
            "entryCount": 0,
            "rowCount": 0,
            "namesByNormalized": {},
            "loadedFrom": "unavailable",
            "lastFetchError": str(error),
        }


def load_curated_person_index(manual_roster_path: Path, alias_override_path: Path) -> dict:
    records_by_normalized: dict[str, list[dict]] = {}
    seen_keys: set[tuple[str, str, str]] = set()
    match_count = 0

    def add_match(matched_label: str, general_id: str, person_record: dict, source: str) -> None:
        nonlocal match_count
        normalized = normalize_label(matched_label)
        if not normalized or not general_id:
            return
        dedupe_key = (normalized, general_id, matched_label.strip())
        if dedupe_key in seen_keys:
            return
        seen_keys.add(dedupe_key)
        records_by_normalized.setdefault(normalized, []).append(
            {
                "matchedLabel": matched_label.strip(),
                "generalId": general_id,
                "source": source,
                "personRecord": sanitize_person_record(matched_label, person_record),
            }
        )
        match_count += 1

    if manual_roster_path.exists():
        manual_roster = read_json(manual_roster_path)
        for entry in manual_roster.get("entries") or []:
            general_id = str(entry.get("generalId") or "").strip()
            if not general_id:
                continue
            base_label = str(entry.get("name") or "").strip()
            person_record = sanitize_person_record(base_label or general_id, entry)
            labels = unique_preserving_order(([base_label] if base_label else []) + list(person_record.get("alias") or []))
            for matched_label in labels:
                add_match(matched_label, general_id, person_record, "manual-roster")

    if alias_override_path.exists():
        alias_overrides = read_json(alias_override_path)
        for entry in alias_overrides.get("entries") or []:
            general_id = str(entry.get("generalId") or "").strip()
            if not general_id:
                continue
            aliases = unique_preserving_order(
                [str(alias).strip() for alias in list(entry.get("add") or []) if str(alias).strip()]
            )
            for matched_label in aliases:
                add_match(
                    matched_label,
                    general_id,
                    {
                        "generalId": general_id,
                        "name": matched_label,
                        "alias": aliases,
                    },
                    "alias-overrides",
                )

    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "loadedFrom": "local",
        "entryCount": match_count,
        "labelCount": len(records_by_normalized),
        "manualRosterPath": str(manual_roster_path),
        "aliasOverridePath": str(alias_override_path),
        "recordsByNormalized": records_by_normalized,
    }


def run_step(args: list[str]) -> None:
    print("[resolution_loop] $", " ".join(args))
    subprocess.run(args, check=True)


def resolve_pg_dsn(pg_dsn_arg: str) -> str:
    if pg_dsn_arg.strip():
        return pg_dsn_arg.strip()
    return os.environ.get(DEFAULT_PG_DSN_ENV, "").strip()


def import_psycopg():
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is not installed. Run `pip install \"psycopg[binary]>=3.2,<4\"` "
            "in the active pipeline Python environment."
        ) from exc
    return psycopg


def sync_resolution_seed_to_postgres(
    pg_dsn: str,
    observed_path: Path,
    alias_output_root: Path,
    decision_path: Path,
) -> bool:
    if not pg_dsn:
        print("[resolution_loop] postgres sync skipped: PG DSN not set")
        return False
    if not DEFAULT_POSTGRES_IMPORTER.exists():
        print(
            "[resolution_loop] postgres sync skipped: importer not found at "
            f"{DEFAULT_POSTGRES_IMPORTER}"
        )
        return False
    run_step(
        [
            resolve_pipeline_python(),
            str(DEFAULT_POSTGRES_IMPORTER),
            "--pg-dsn",
            pg_dsn,
            "--observed-mentions",
            str(observed_path),
            "--alias-map",
            str(alias_output_root / "formal-mention-map.json"),
            "--triage-decisions",
            str(decision_path),
        ]
    )
    return True


def query_unresolved_from_postgres(pg_dsn: str, top: int) -> list[dict]:
    if top <= 0:
        return []
    if not pg_dsn:
        raise RuntimeError("PostgreSQL DSN is empty.")

    psycopg = import_psycopg()
    query = """
        WITH unresolved AS (
            SELECT m.*
            FROM sanguo_rag.observed_mentions AS m
            LEFT JOIN sanguo_rag.triage_label_decisions AS d
              ON d.normalized = m.normalized
            WHERE m.match_status = 'unresolved'
              AND COALESCE(d.decision, '') NOT IN ('noise', 'ambiguous', 'person')
        ),
        ranked AS (
            SELECT
              normalized,
              MIN(label) AS label,
              MIN(mention_type) AS mention_type,
              COUNT(*)::INTEGER AS mention_count
            FROM unresolved
            GROUP BY normalized
            ORDER BY mention_count DESC, normalized
            LIMIT %s
        )
        SELECT
          r.label,
          r.normalized,
          r.mention_type,
          r.mention_count,
          COALESCE(
            (
              SELECT ARRAY(
                SELECT DISTINCT u.source_ref
                FROM unresolved AS u
                WHERE u.normalized = r.normalized
                ORDER BY u.source_ref
                LIMIT 3
              )
            ),
            ARRAY[]::TEXT[]
          ) AS source_refs,
          COALESCE(
            (
              SELECT ARRAY(
                SELECT DISTINCT u.text_snippet
                FROM unresolved AS u
                WHERE u.normalized = r.normalized
                  AND u.text_snippet <> ''
                LIMIT 3
              )
            ),
            ARRAY[]::TEXT[]
          ) AS sample_snippets
        FROM ranked AS r
        ORDER BY r.mention_count DESC, r.normalized;
    """

    rows: list[dict] = []
    with psycopg.connect(pg_dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (top,))
            for label, normalized, mention_type, mention_count, source_refs, sample_snippets in cursor.fetchall():
                rows.append(
                    {
                        "label": str(label or normalized or ""),
                        "normalized": str(normalized or ""),
                        "mentionType": str(mention_type or "unknown"),
                        "count": int(mention_count or 0),
                        "sourceRefs": list(source_refs or []),
                        "sampleSnippets": list(sample_snippets or []),
                    }
                )
    return rows


def describe_json_artifact(path: Path, expected_key: str | None = None) -> None:
    if not path.exists():
        print(f"[resolution_loop] artifact missing: {path}")
        return
    try:
        payload = read_json(path)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        print(f"[resolution_loop] artifact unreadable: {path} ({exc})")
        return
    if expected_key and not (isinstance(payload, dict) and expected_key in payload):
        print(f"[resolution_loop] artifact unexpected schema: {path} missing {expected_key}")
        return
    if isinstance(payload, dict):
        count = len(payload.get(expected_key) or []) if expected_key else len(payload)
        print(f"[resolution_loop] artifact ok: {path} {expected_key or 'keys'}={count}")
        return
    print(f"[resolution_loop] artifact unexpected type: {path}")


def summarize_answer_states(path: Path) -> tuple[int, int]:
    if not path.exists():
        return 0, 0
    payload = read_json(path)
    filled = 0
    actionable = 0
    for entry in payload.get("answers") or []:
        answer = str(entry.get("answer") or "").strip().upper()
        if not answer:
            continue
        filled += 1
        if answer not in {"D", "DEFER"}:
            actionable += 1
    return filled, actionable


def autofill_answer_suggestions(choices_root: Path, auto_review_uncertain: bool = False) -> tuple[int, int]:
    answers_path = choices_root / "unresolved-triage-answers.todo.json"
    if not answers_path.exists():
        print(f"[resolution_loop] auto-fill skipped: answers file not found at {answers_path}")
        return 0, 0

    payload = read_json(answers_path)
    auto_filled = 0
    actionable = 0
    for entry in payload.get("answers") or []:
        answer = str(entry.get("answer") or "").strip().upper()
        if answer:
            continue
        suggested_answer = str(entry.get("suggestedAnswer") or "").strip().upper()
        confidence = str(entry.get("suggestionConfidence") or "low").strip().lower()
        confidence_rank = CONFIDENCE_RANK.get(confidence, -1)
        if auto_review_uncertain and confidence_rank < CONFIDENCE_RANK["high"]:
            entry["answer"] = "C"
            entry["autoReviewedUncertainSuggestion"] = suggested_answer or "blank"
            auto_filled += 1
            actionable += 1
            continue
        if suggested_answer not in {"A", "B", "C"}:
            continue
        if confidence_rank < CONFIDENCE_RANK["high"]:
            continue
        entry["answer"] = suggested_answer
        entry["autoFilledFromSuggestion"] = True
        if suggested_answer == "A":
            record = entry.get("personRecord") or {}
            if not record.get("generalId") or not record.get("faction"):
                entry["autoFilledPersonLabelOnly"] = True
        auto_filled += 1
        actionable += 1

    if auto_filled == 0:
        print("[resolution_loop] auto-fill skipped: no eligible suggestions found")
        return 0, 0

    write_json(answers_path, payload)
    print(f"[resolution_loop] auto-fill wrote {answers_path} filled={auto_filled} actionable={actionable}")
    return auto_filled, actionable


def apply_answer_file(choices_root: Path, decision_path: Path, manual_roster_path: Path) -> tuple[int, int]:
    answers_path = choices_root / "unresolved-triage-answers.todo.json"
    filled, actionable = summarize_answer_states(answers_path)
    if not answers_path.exists():
        print(f"[resolution_loop] auto-apply skipped: answers file not found at {answers_path}")
        return filled, actionable
    if actionable == 0:
        print(f"[resolution_loop] auto-apply skipped: filled={filled} actionable={actionable}")
        return filled, actionable
    run_step(
        [
            resolve_pipeline_python(),
            "server/npc-brain/pipelines/sanguo-rag/apply_triage_answers.py",
            "--answers",
            str(answers_path),
            "--decisions",
            str(decision_path),
            "--manual-roster",
            str(manual_roster_path),
        ]
    )
    return filled, actionable


def build_alias_dict(alias_output_root: Path, observed_path: Path, retry_without_observed: bool = False) -> None:
    args = [
        resolve_pipeline_python(),
        "server/npc-brain/pipelines/sanguo-rag/build_alias_dict.py",
        "--overwrite",
        "--output-root",
        str(alias_output_root),
        "--observed-mentions",
        str(observed_path),
    ]
    try:
        run_step(args)
    except subprocess.CalledProcessError:
        if not retry_without_observed:
            raise
        fallback_path = observed_path.with_name("__missing_observed_mentions_for_bootstrap__.json")
        print(
            "[resolution_loop] warning: build_alias_dict failed while reading observed stats; "
            f"retrying without observed stats via {fallback_path}"
        )
        run_step([
            *args[:-1],
            str(fallback_path),
        ])


def collect_observed_mentions(
    chapters_root: Path,
    alias_output_root: Path,
    observed_output_root: Path,
    decision_path: Path,
    top: int,
    collect_sink: str,
    pg_dsn: str,
) -> None:
    args = [
        resolve_pipeline_python(),
        "server/npc-brain/pipelines/sanguo-rag/collect_observed_mentions.py",
        "--chapters-root",
        str(chapters_root),
        "--formal-map",
        str(alias_output_root / "formal-mention-map.json"),
        "--output-root",
        str(observed_output_root),
        "--triage-decisions",
        str(decision_path),
        "--sink",
        collect_sink,
        "--collect-cjk-candidates",
        "--candidate-mode",
        "conservative",
        "--top",
        str(top),
        "--overwrite",
    ]
    if collect_sink == "postgres" and pg_dsn:
        args.extend(["--pg-dsn", pg_dsn])
    run_step(args)


def make_question(index: int, entry: dict) -> dict:
    label = entry.get("label") or entry.get("normalized") or ""
    return {
        "id": f"Q{index:03d}",
        "label": label,
        "normalized": entry.get("normalized", ""),
        "count": entry.get("count", 0),
        "mentionType": entry.get("mentionType", "unknown"),
        "sourceRefs": entry.get("sourceRefs", []),
        "sampleSnippets": entry.get("sampleSnippets", []),
        "options": [
            {
                "key": "A",
                "decision": "person",
                "meaning": "確定是人物；請補 generalId/faction 後移入 manual-roster-seeds.json 或 personRecords。",
            },
            {
                "key": "B",
                "decision": "noise",
                "meaning": "確定不是人物；加入 noiseLabels，之後不再算 unresolved。",
            },
            {
                "key": "C",
                "decision": "ambiguous",
                "meaning": "暫時保留人工複核；加入 ambiguousLabels，之後分流為 review-pending。",
            },
            {
                "key": "D",
                "decision": "defer",
                "meaning": "本輪不裁決；下一輪仍維持 unresolved。",
            },
        ],
        "answer": "",
        "personRecord": {
            "generalId": "",
            "name": label,
            "faction": "",
            "title": f"【{label}】" if label else "",
            "alias": [],
        },
    }


def sanitize_person_record(label: str, record: dict | None) -> dict:
    raw = record or {}
    return {
        "generalId": str(raw.get("generalId") or "").strip(),
        "name": str(raw.get("name") or label).strip(),
        "faction": str(raw.get("faction") or "").strip(),
        "title": str(raw.get("title") or (f"【{label}】" if label else "")).strip(),
        "alias": [str(alias).strip() for alias in list(raw.get("alias") or []) if str(alias).strip()],
    }


def merge_person_records(label: str, primary: dict | None, secondary: dict | None) -> dict:
    merged = sanitize_person_record(label, primary)
    fallback = sanitize_person_record(label, secondary)
    for key in ("generalId", "name", "faction", "title"):
        if not merged.get(key) and fallback.get(key):
            merged[key] = fallback[key]
    seen_aliases = {normalize_label(alias) for alias in merged.get("alias") or [] if normalize_label(alias)}
    for alias in fallback.get("alias") or []:
        normalized = normalize_label(alias)
        if not normalized or normalized in seen_aliases:
            continue
        merged.setdefault("alias", []).append(alias)
        seen_aliases.add(normalized)
    return merged


def pick_curated_person_record(label: str, curated_hits: list[dict]) -> dict:
    general_ids = unique_preserving_order(
        [str(hit.get("generalId") or "").strip() for hit in curated_hits if str(hit.get("generalId") or "").strip()]
    )
    if len(general_ids) != 1:
        return sanitize_person_record(label, {})
    ranked_hits = sorted(
        curated_hits,
        key=lambda hit: (
            1 if str((hit.get("personRecord") or {}).get("faction") or "").strip() else 0,
            1 if str(hit.get("source") or "") == "manual-roster" else 0,
            len((hit.get("personRecord") or {}).get("alias") or []),
        ),
        reverse=True,
    )
    return sanitize_person_record(label, ranked_hits[0].get("personRecord") or {})


def load_existing_answers(path: Path) -> tuple[dict[str, dict], list[dict]]:
    if not path.exists():
        return {}, []
    payload = read_json(path)
    existing_answers = list(payload.get("answers") or [])
    answers_by_normalized: dict[str, dict] = {}
    for entry in existing_answers:
        label = str(entry.get("label") or "").strip()
        normalized = str(entry.get("normalized") or normalize_label(label))
        if not normalized:
            continue
        previous = answers_by_normalized.get(normalized)
        current_answer = str(entry.get("answer") or "").strip()
        previous_answer = str(previous.get("answer") or "").strip() if previous else ""
        if previous is None or (current_answer and not previous_answer):
            answers_by_normalized[normalized] = entry
    return answers_by_normalized, existing_answers


def build_answer_suggestion(question: dict) -> dict:
    recommendation = question.get("recommendation") or {}
    return {
        "suggestedAnswer": str(recommendation.get("recommendedAnswer") or "").strip(),
        "suggestedDecision": str(recommendation.get("recommendedDecision") or "").strip(),
        "suggestionConfidence": str(recommendation.get("confidence") or "").strip(),
        "suggestionReasons": list(recommendation.get("reasons") or [])[:3],
    }


def make_answer_entry(question: dict, existing_entry: dict | None = None) -> dict:
    label = str(question.get("label") or "").strip()
    normalized = str(question.get("normalized") or normalize_label(label))
    person_record = sanitize_person_record(label, question.get("personRecord") or {})
    answer = ""
    if existing_entry:
        answer = str(existing_entry.get("answer") or "").strip()
        person_record = merge_person_records(label, existing_entry.get("personRecord") or {}, person_record)
    entry = {
        "id": question["id"],
        "label": label,
        "normalized": normalized,
        "answer": answer,
        "personRecord": person_record,
    }
    entry.update(build_answer_suggestion(question))
    return entry


def make_carried_answer_entry(entry: dict) -> dict | None:
    answer = str(entry.get("answer") or "").strip()
    label = str(entry.get("label") or "").strip()
    normalized = str(entry.get("normalized") or normalize_label(label))
    if not answer or not normalized:
        return None
    return {
        "id": str(entry.get("id") or ""),
        "label": label or normalized,
        "normalized": normalized,
        "answer": answer,
        "personRecord": sanitize_person_record(label or normalized, entry.get("personRecord") or {}),
        "carriedForward": True,
        "suggestedAnswer": str(entry.get("suggestedAnswer") or "").strip(),
        "suggestedDecision": str(entry.get("suggestedDecision") or "").strip(),
        "suggestionConfidence": str(entry.get("suggestionConfidence") or "").strip(),
        "suggestionReasons": list(entry.get("suggestionReasons") or [])[:3],
    }


def collect_following_compounds(label: str, snippets: list[str]) -> tuple[list[str], list[str]]:
    if not label:
        return [], []
    suffixes: list[str] = []
    compounds: list[str] = []
    pattern = re.compile(re.escape(label) + r"([\u3400-\u9fff\U00020000-\U0002A6DF])")
    for snippet in snippets:
        for match in pattern.finditer(str(snippet)):
            suffix = str(match.group(1) or "").strip()
            if not suffix:
                continue
            suffixes.append(suffix)
            compounds.append(f"{label}{suffix}")
    return suffixes, compounds


def build_recommendation(question: dict, romance_index: dict, curated_index: dict) -> dict:
    options = {str(item.get("key") or ""): item for item in question.get("options") or []}
    scores = {"A": 0, "B": 0, "C": 0, "D": 1}
    reasons: list[str] = []
    evidence: list[dict] = []

    label = str(question.get("label") or "").strip()
    normalized = str(question.get("normalized") or normalize_label(label))
    names_by_normalized = romance_index.get("namesByNormalized") or {}
    romance_hits = list(names_by_normalized.get(normalized) or [])
    curated_records_by_normalized = curated_index.get("recordsByNormalized") or {}
    curated_hits = list(curated_records_by_normalized.get(normalized) or [])
    curated_general_ids = unique_preserving_order(
        [str(hit.get("generalId") or "").strip() for hit in curated_hits if str(hit.get("generalId") or "").strip()]
    )
    curated_matched_labels = unique_preserving_order(
        [str(hit.get("matchedLabel") or "").strip() for hit in curated_hits if str(hit.get("matchedLabel") or "").strip()]
    )
    curated_person_record = pick_curated_person_record(label, curated_hits)
    if romance_hits:
        scores["A"] += 8
        reasons.append(f"命中《三國演義角色列表》：{romance_hits[0]}")
        evidence.append(
            {
                "type": "romance-character-list-hit",
                "source": "romance-character-list",
                "matchedLabels": romance_hits,
                "weight": 8,
            }
        )

    if curated_hits:
        weight = 7 if any(str((hit.get("personRecord") or {}).get("faction") or "").strip() for hit in curated_hits) else 6
        scores["A"] += weight
        reasons.append(f"命中本地人物白名單：{curated_matched_labels[0]} -> {curated_general_ids[0]}")
        evidence.append(
            {
                "type": "curated-person-hit",
                "source": "curated-person-index",
                "matchedLabels": curated_matched_labels,
                "matchedGeneralIds": curated_general_ids,
                "weight": weight,
            }
        )
        if len(curated_general_ids) > 1:
            scores["C"] += 6
            reasons.append("本地人物白名單對應到多個 generalId，建議人工確認")
            evidence.append(
                {
                    "type": "curated-person-conflict",
                    "source": "curated-person-index",
                    "matchedLabels": curated_matched_labels,
                    "matchedGeneralIds": curated_general_ids,
                    "weight": 6,
                }
            )

    suffixes, compounds = collect_following_compounds(label, question.get("sampleSnippets") or [])
    noise_compounds = [compound for compound, suffix in zip(compounds, suffixes) if suffix in COMPOUND_NOISE_SUFFIXES]
    if noise_compounds:
        weight = 6 if len(noise_compounds) >= 2 else 4
        scores["B"] += weight
        reasons.append(f"片段常出現「{noise_compounds[0]}」這類兵種/物資複合詞")
        evidence.append(
            {
                "type": "compound-noise",
                "source": "sample-snippets",
                "matchedLabels": unique_preserving_order(noise_compounds),
                "weight": weight,
            }
        )

    title_or_place_compounds = [compound for compound, suffix in zip(compounds, suffixes) if suffix in COMPOUND_TITLE_OR_PLACE_SUFFIXES]
    if title_or_place_compounds and not romance_hits:
        weight = 5 if len(label) <= 2 else 3
        scores["B"] += weight
        reasons.append(f"片段常把它接成「{title_or_place_compounds[0]}」，較像稱號/地名片段")
        evidence.append(
            {
                "type": "compound-title-or-place",
                "source": "sample-snippets",
                "matchedLabels": unique_preserving_order(title_or_place_compounds),
                "weight": weight,
            }
        )

    person_signal_labels = unique_preserving_order(romance_hits + curated_matched_labels)
    if person_signal_labels and (noise_compounds or title_or_place_compounds):
        scores["C"] += 5
        reasons.append("人物來源命中，但片段也有複合詞斷詞訊號，建議人工再看一次")
        evidence.append(
            {
                "type": "conflict-signal",
                "source": "hybrid",
                "matchedLabels": unique_preserving_order(person_signal_labels + noise_compounds + title_or_place_compounds),
                "weight": 5,
            }
        )

    ranked = sorted(scores.items(), key=lambda item: (-item[1], OPTION_RANK_ORDER[item[0]]))
    recommended_key = ranked[0][0]
    top_score = ranked[0][1]
    second_score = ranked[1][1]

    if top_score <= 1:
        recommended_key = "D"
        confidence = "low"
        if romance_index.get("loadedFrom") == "unavailable":
            reasons.append("本輪未能取得角色列表來源，暫無足夠外部人物命中訊號")
        else:
            reasons.append("目前只有 corpus 片段，沒有足夠高信號證據")
    elif top_score == second_score and top_score > 1:
        recommended_key = "C"
        confidence = "low"
        reasons.insert(0, "正反訊號接近，先建議走 ambiguous")
    elif top_score - second_score >= 4:
        confidence = "high"
    elif top_score - second_score >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    ranked_options = [
        {
            "key": key,
            "decision": str(options.get(key, {}).get("decision") or ""),
            "score": score,
        }
        for key, score in ranked
    ]
    recommended_option = options.get(recommended_key, {})
    return {
        "recommendedAnswer": recommended_key,
        "recommendedDecision": str(recommended_option.get("decision") or ""),
        "confidence": confidence,
        "scoreByOption": scores,
        "rankedOptions": ranked_options,
        "romanceCharacterHits": romance_hits,
        "curatedPersonHits": [
            {
                "matchedLabel": str(hit.get("matchedLabel") or "").strip(),
                "generalId": str(hit.get("generalId") or "").strip(),
                "source": str(hit.get("source") or "").strip(),
            }
            for hit in curated_hits
        ],
        "recommendedPersonRecord": (
            curated_person_record
            if recommended_key == "A" and str(curated_person_record.get("generalId") or "").strip()
            else {}
        ),
        "evidence": evidence,
        "reasons": unique_preserving_order(reasons),
    }


def render_choices_markdown(choices: dict) -> str:
    romance_source = ((choices.get("evidenceSources") or {}).get("romanceCharacterList") or {})
    curated_source = ((choices.get("evidenceSources") or {}).get("curatedPersonIndex") or {})
    lines = [
        "# Sanguo RAG Unresolved Triage Choices",
        "",
        f"Generated at: {choices['generatedAt']}",
        f"Decision file: `{choices['decisionPath']}`",
        f"Unresolved top source: `{choices.get('unresolvedTopSource', 'summary')}`",
        "",
        "請對每題選 A/B/C/D；只有 A 需要補 generalId/faction，B/C 可以直接回填到 decision JSON。",
        "",
    ]
    if romance_source:
        lines.append(
            "- Evidence source: "
            f"《三國演義角色列表》({romance_source.get('loadedFrom', 'unknown')}, entries={romance_source.get('entryCount', 0)})"
        )
    if curated_source:
        lines.append(
            "- Evidence source: "
            f"本地人物白名單({curated_source.get('loadedFrom', 'unknown')}, labels={curated_source.get('labelCount', 0)}, entries={curated_source.get('entryCount', 0)})"
        )
    if romance_source or curated_source:
        lines.append("")
    for question in choices["questions"]:
        lines.append(f"## {question['id']} {question['label']} ({question['count']} 次, {question['mentionType']})")
        lines.append("")
        lines.append("- A person：確定是人物，補 manual roster seed")
        lines.append("- B noise：確定不是人物，排除出 unresolved")
        lines.append("- C ambiguous：保留複核，但不再卡 unresolved")
        lines.append("- D defer：暫不裁決，下一輪繼續出題")
        lines.append(f"- Answer：`{question['id']}=`（填 A/B/C/D；若 A 請在 JSON 的 personRecord 補 generalId/faction）")
        recommendation = question.get("recommendation") or {}
        if recommendation:
            ranked_text = ", ".join(
                f"{item['key']}={item['score']}" for item in recommendation.get("rankedOptions") or []
            )
            lines.append(
                "- Suggestion: "
                f"{recommendation.get('recommendedAnswer', 'D')} {recommendation.get('recommendedDecision', '')} "
                f"({recommendation.get('confidence', 'low')}; {ranked_text})"
            )
            suggested_person = recommendation.get("recommendedPersonRecord") or {}
            if recommendation.get("recommendedAnswer") == "A" and suggested_person:
                lines.append(
                    "- Prefill: "
                    f"generalId={suggested_person.get('generalId', '')} faction={suggested_person.get('faction', '') or '?'}"
                )
            for reason in list(recommendation.get("reasons") or [])[:2]:
                lines.append(f"- Reason: {reason}")
        lines.append("")
        for snippet in question.get("sampleSnippets", []):
            lines.append(f"> {snippet}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def resolve_unresolved_top_labels(
    summary: dict,
    summary_path: Path,
    top: int,
    top_source: str,
    pg_dsn: str,
) -> tuple[list[dict], str]:
    summary_unresolved = list(summary.get("topUnresolvedLabels") or [])[:top]
    if top_source == "summary":
        return summary_unresolved, "summary"

    if top_source in {"auto", "postgres"}:
        try:
            postgres_unresolved = query_unresolved_from_postgres(pg_dsn, top)
            if postgres_unresolved:
                return postgres_unresolved, "postgres"
            if top_source == "postgres":
                print("[resolution_loop] postgres unresolved query returned 0 rows")
                return [], "postgres"
            print(
                "[resolution_loop] postgres unresolved query returned 0 rows; "
                f"fallback to summary {summary_path}"
            )
        except Exception as exc:
            if top_source == "postgres":
                raise
            print(
                "[resolution_loop] postgres unresolved query failed; "
                f"fallback to summary {summary_path} ({exc})"
            )

    return summary_unresolved, "summary"


def generate_choices(
    summary_path: Path,
    decision_path: Path,
    choices_root: Path,
    top: int,
    manual_roster_path: Path,
    alias_override_path: Path,
    top_source: str,
    pg_dsn: str,
) -> tuple[Path, Path, dict, dict]:
    summary = read_json(summary_path)
    unresolved, resolved_top_source = resolve_unresolved_top_labels(
        summary,
        summary_path,
        top,
        top_source,
        pg_dsn,
    )
    romance_cache_path = DEFAULT_ROMANCE_CHARACTER_CACHE_PATH if choices_root == DEFAULT_CHOICES_ROOT else choices_root / "romance-character-list-cache.json"
    romance_index = load_romance_character_index(romance_cache_path)
    curated_index = load_curated_person_index(manual_roster_path, alias_override_path)
    choices = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "summaryPath": str(summary_path),
        "unresolvedTopSource": resolved_top_source,
        "decisionPath": str(decision_path),
        "totalMentions": summary.get("totalMentions", 0),
        "resolvedMentionCount": summary.get("resolvedMentionCount", 0),
        "unresolvedMentionCount": summary.get("unresolvedMentionCount", 0),
        "excludedMentionCount": summary.get("excludedMentionCount", 0),
        "reviewPendingMentionCount": summary.get("reviewPendingMentionCount", 0),
        "questions": [make_question(index, entry) for index, entry in enumerate(unresolved, start=1)],
        "evidenceSources": {
            "romanceCharacterList": {
                "sourceUrl": romance_index.get("sourceUrl", ROMANCE_CHARACTER_LIST_RAW_URL),
                "loadedFrom": romance_index.get("loadedFrom", "unknown"),
                "entryCount": romance_index.get("entryCount", 0),
                "cachePath": str(romance_cache_path),
            },
            "curatedPersonIndex": {
                "loadedFrom": curated_index.get("loadedFrom", "unknown"),
                "entryCount": curated_index.get("entryCount", 0),
                "labelCount": curated_index.get("labelCount", 0),
                "manualRosterPath": curated_index.get("manualRosterPath", str(manual_roster_path)),
                "aliasOverridePath": curated_index.get("aliasOverridePath", str(alias_override_path)),
            }
        },
    }
    for question in choices["questions"]:
        recommendation = build_recommendation(question, romance_index, curated_index)
        question["recommendation"] = recommendation
        if recommendation.get("recommendedAnswer") == "A":
            question["personRecord"] = merge_person_records(
                str(question.get("label") or ""),
                question.get("personRecord") or {},
                recommendation.get("recommendedPersonRecord") or {},
            )
    answers_path = choices_root / "unresolved-triage-answers.todo.json"
    existing_by_normalized, existing_answers = load_existing_answers(answers_path)
    current_normalized: set[str] = set()
    answer_entries: list[dict] = []
    preserved_active_answers = 0
    for question in choices["questions"]:
        normalized = str(question.get("normalized") or normalize_label(str(question.get("label") or "")))
        answer_entry = make_answer_entry(question, existing_by_normalized.get(normalized))
        if answer_entry["answer"]:
            preserved_active_answers += 1
        answer_entries.append(answer_entry)
        if normalized:
            current_normalized.add(normalized)

    carried_forward_answers = 0
    carried_seen: set[str] = set()
    for existing_entry in existing_answers:
        normalized = str(existing_entry.get("normalized") or normalize_label(str(existing_entry.get("label") or "")))
        if not normalized or normalized in current_normalized or normalized in carried_seen:
            continue
        carried_entry = make_carried_answer_entry(existing_entry)
        if carried_entry is None:
            continue
        answer_entries.append(carried_entry)
        carried_seen.add(normalized)
        carried_forward_answers += 1

    answers = {
        "version": "1.0.0",
        "sourceChoicesPath": str(choices_root / "unresolved-triage-choices.json"),
        "preservedActiveAnswerCount": preserved_active_answers,
        "carriedForwardAnsweredCount": carried_forward_answers,
        "answers": answer_entries,
    }
    json_path = choices_root / "unresolved-triage-choices.json"
    markdown_path = choices_root / "unresolved-triage-choices.md"
    write_json(json_path, choices)
    write_json(answers_path, answers)
    markdown_path.write_text(render_choices_markdown(choices), encoding="utf-8")
    return json_path, markdown_path, choices, answers


def main() -> None:
    args = parse_args()
    chapters_root = Path(args.chapters_root)
    alias_output_root = Path(args.alias_output_root)
    observed_output_root = Path(args.observed_output_root)
    decision_path = Path(args.triage_decisions)
    manual_roster_path = Path(args.manual_roster)
    alias_override_path = Path(args.alias_overrides)
    choices_root = Path(args.choices_root)
    pg_dsn = resolve_pg_dsn(args.pg_dsn)
    observed_path = observed_output_root / "observed-mentions.json"
    summary_path = observed_output_root / "observed-label-summary.json"
    auto_apply_filled = 0
    auto_apply_actionable = 0
    auto_suggestion_filled = 0
    auto_suggestion_actionable = 0
    postgres_seed_synced = False

    if args.collect_sink == "postgres" and not pg_dsn:
        raise RuntimeError(
            f"--collect-sink=postgres requires --pg-dsn or env {DEFAULT_PG_DSN_ENV}."
        )

    if args.top_source == "postgres" and not pg_dsn:
        raise RuntimeError(
            f"--top-source=postgres requires --pg-dsn or env {DEFAULT_PG_DSN_ENV}."
        )

    if args.auto_fill_suggestions:
        auto_suggestion_filled, auto_suggestion_actionable = autofill_answer_suggestions(
            choices_root,
            auto_review_uncertain=args.auto_review_uncertain,
        )

    if args.apply_answers:
        auto_apply_filled, auto_apply_actionable = apply_answer_file(choices_root, decision_path, manual_roster_path)

    describe_json_artifact(observed_path, "data")
    describe_json_artifact(summary_path, "topUnresolvedLabels")

    for iteration in range(1, args.max_iterations + 1):
        print(f"[resolution_loop] iteration={iteration}")
        build_alias_dict(alias_output_root, observed_path, retry_without_observed=True)
        collect_observed_mentions(
            chapters_root,
            alias_output_root,
            observed_output_root,
            decision_path,
            args.top,
            args.collect_sink,
            pg_dsn,
        )
        build_alias_dict(alias_output_root, observed_path)

    if args.top_source in {"auto", "postgres"}:
        if args.collect_sink == "postgres":
            postgres_seed_synced = bool(pg_dsn)
            print("[resolution_loop] postgres seed sync skipped: collect sink already writes observed mentions + triage decisions")
        else:
            try:
                postgres_seed_synced = sync_resolution_seed_to_postgres(
                    pg_dsn,
                    observed_path,
                    alias_output_root,
                    decision_path,
                )
            except Exception as exc:
                if args.top_source == "postgres":
                    raise
                print(f"[resolution_loop] postgres sync failed; continue with summary fallback ({exc})")

    json_path, markdown_path, choices, answers = generate_choices(
        summary_path,
        decision_path,
        choices_root,
        args.top,
        manual_roster_path,
        alias_override_path,
        args.top_source,
        pg_dsn if postgres_seed_synced or args.top_source == "postgres" else "",
    )
    print(f"[resolution_loop] wrote {json_path}")
    print(f"[resolution_loop] wrote {markdown_path}")
    print(
        "[resolution_loop] "
        f"resolved={choices['resolvedMentionCount']} unresolved={choices['unresolvedMentionCount']} "
        f"excluded={choices['excludedMentionCount']} reviewPending={choices['reviewPendingMentionCount']} "
        f"topSource={choices.get('unresolvedTopSource', 'summary')} postgresSynced={postgres_seed_synced} "
        f"questions={len(choices['questions'])} preservedAnswers={answers['preservedActiveAnswerCount']} "
        f"carriedForward={answers['carriedForwardAnsweredCount']} autoSuggestionFilled={auto_suggestion_filled} "
        f"autoSuggestionActionable={auto_suggestion_actionable} autoApplyFilled={auto_apply_filled} "
        f"autoApplyActionable={auto_apply_actionable}"
    )


if __name__ == "__main__":
    main()
