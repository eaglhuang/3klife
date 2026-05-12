from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

from repo_layout import pipeline_config_path, pipeline_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)

DEFAULT_OBSERVED_MENTIONS = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json"
)
DEFAULT_ALIAS_MAP = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json"
)
DEFAULT_TRIAGE_DECISIONS = pipeline_config_path(REPO_ROOT, "unresolved-triage-decisions.json")
DEFAULT_SCHEMA_SQL = pipeline_root(REPO_ROOT) / "sql/postgres_schema.sql"
DEFAULT_PG_DSN_ENV = "SANGUO_RAG_PG_DSN"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import observed mentions / alias map / triage decisions into PostgreSQL."
    )
    parser.add_argument(
        "--pg-dsn",
        default="",
        help=f"PostgreSQL DSN. If omitted, read from env {DEFAULT_PG_DSN_ENV}.",
    )
    parser.add_argument(
        "--observed-mentions",
        default=str(DEFAULT_OBSERVED_MENTIONS),
        help="Path to observed-mentions.json",
    )
    parser.add_argument(
        "--alias-map",
        default=str(DEFAULT_ALIAS_MAP),
        help="Path to formal-mention-map.json",
    )
    parser.add_argument(
        "--triage-decisions",
        default=str(DEFAULT_TRIAGE_DECISIONS),
        help="Path to unresolved-triage-decisions.json",
    )
    parser.add_argument(
        "--schema-sql",
        default=str(DEFAULT_SCHEMA_SQL),
        help="Path to PostgreSQL schema SQL file",
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Do not truncate existing tables before insert/upsert.",
    )
    return parser.parse_args()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_label(value: str) -> str:
    cleaned = re.sub(r"\s+", "", str(value or "")).strip().lower()
    return cleaned


def resolve_pg_dsn(cli_dsn: str) -> str:
    if cli_dsn.strip():
        return cli_dsn.strip()
    env_dsn = os.environ.get(DEFAULT_PG_DSN_ENV, "").strip()
    if env_dsn:
        return env_dsn
    raise RuntimeError(
        f"PostgreSQL DSN is required. Pass --pg-dsn or set {DEFAULT_PG_DSN_ENV}."
    )


def import_psycopg():
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is not installed. Run `pip install \"psycopg[binary]>=3.2,<4\"` "
            "in the same Python environment."
        ) from exc
    return psycopg, Jsonb


def ensure_inputs_exist(paths: list[Path]) -> None:
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        joined = ", ".join(missing)
        raise FileNotFoundError(f"Missing required input file(s): {joined}")


def build_triage_rows(payload: dict) -> list[tuple[str, str, str]]:
    rows_by_normalized: dict[str, tuple[str, str, str]] = {}
    for decision, key in (("noise", "noiseLabels"), ("ambiguous", "ambiguousLabels"), ("person", "personLabels")):
        for label in payload.get(key) or []:
            label_text = str(label or "").strip()
            normalized = normalize_label(label_text)
            if not normalized:
                continue
            rows_by_normalized[normalized] = (normalized, label_text or normalized, decision)
    return [rows_by_normalized[key] for key in sorted(rows_by_normalized)]


def load_observed_rows(payload: dict) -> list[tuple]:
    data = payload.get("data") or []
    rows: list[tuple] = []
    for item in data:
        rows.append(
            (
                str(item.get("label") or ""),
                str(item.get("normalized") or normalize_label(item.get("label") or "")),
                str(item.get("mentionType") or "unknown"),
                str(item.get("matchStatus") or "unresolved"),
                list(item.get("matchedGeneralIds") or []),
                str(item.get("sourceRef") or ""),
                item.get("chapterNo"),
                int(item.get("paragraphIndex") or 0),
                int(item.get("startOffset") or 0),
                int(item.get("endOffset") or 0),
                str(item.get("textSnippet") or ""),
                list(item.get("sceneParticipants") or []),
            )
        )
    return rows


def load_alias_rows(payload: dict) -> list[tuple]:
    entries = payload.get("entries") or []
    rows: list[tuple] = []
    for item in entries:
        normalized = str(item.get("normalized") or normalize_label(item.get("alias") or ""))
        if not normalized:
            continue
        rows.append(
            (
                normalized,
                str(item.get("alias") or normalized),
                list(item.get("generalIds") or []),
                str(item.get("status") or "high-confidence"),
                item.get("sourcesByGeneral") or {},
                item.get("aliasSourceByGeneral") or {},
                item.get("aliasTypeByGeneral") or {},
                item.get("reviewStatusByGeneral") or {},
            )
        )
    return rows


def apply_schema(cursor, schema_sql_path: Path) -> None:
    schema_sql = schema_sql_path.read_text(encoding="utf-8")
    cursor.execute(schema_sql)


def main() -> None:
    args = parse_args()
    pg_dsn = resolve_pg_dsn(args.pg_dsn)

    observed_path = Path(args.observed_mentions)
    alias_map_path = Path(args.alias_map)
    triage_path = Path(args.triage_decisions)
    schema_sql_path = Path(args.schema_sql)

    ensure_inputs_exist([observed_path, alias_map_path, triage_path, schema_sql_path])

    observed_payload = read_json(observed_path)
    alias_payload = read_json(alias_map_path)
    triage_payload = read_json(triage_path)

    observed_rows = load_observed_rows(observed_payload)
    alias_rows = load_alias_rows(alias_payload)
    triage_rows = build_triage_rows(triage_payload)

    psycopg, Jsonb = import_psycopg()

    with psycopg.connect(pg_dsn) as connection:
        with connection.cursor() as cursor:
            apply_schema(cursor, schema_sql_path)

            if not args.keep_existing:
                cursor.execute(
                    """
                    TRUNCATE TABLE
                      sanguo_rag.observed_mentions,
                      sanguo_rag.alias_map_entries,
                      sanguo_rag.triage_label_decisions
                    RESTART IDENTITY;
                    """
                )

            if observed_rows:
                cursor.executemany(
                    """
                    INSERT INTO sanguo_rag.observed_mentions (
                      label, normalized, mention_type, match_status,
                      matched_general_ids, source_ref, chapter_no, paragraph_index,
                      start_offset, end_offset, text_snippet, scene_participants
                    ) VALUES (
                      %s, %s, %s, %s,
                      %s, %s, %s, %s,
                      %s, %s, %s, %s
                    );
                    """,
                    observed_rows,
                )

            if alias_rows:
                cursor.executemany(
                    """
                    INSERT INTO sanguo_rag.alias_map_entries (
                      normalized, alias, general_ids, status,
                      sources_by_general, alias_source_by_general, alias_type_by_general, review_status_by_general
                    ) VALUES (
                      %s, %s, %s, %s,
                      %s, %s, %s, %s
                    )
                    ON CONFLICT (normalized) DO UPDATE
                    SET
                      alias = EXCLUDED.alias,
                      general_ids = EXCLUDED.general_ids,
                      status = EXCLUDED.status,
                      sources_by_general = EXCLUDED.sources_by_general,
                      alias_source_by_general = EXCLUDED.alias_source_by_general,
                      alias_type_by_general = EXCLUDED.alias_type_by_general,
                      review_status_by_general = EXCLUDED.review_status_by_general,
                      inserted_at = NOW();
                    """,
                    [
                        (
                            normalized,
                            alias,
                            general_ids,
                            status,
                            Jsonb(sources_by_general),
                            Jsonb(alias_source_by_general),
                            Jsonb(alias_type_by_general),
                            Jsonb(review_status_by_general),
                        )
                        for (
                            normalized,
                            alias,
                            general_ids,
                            status,
                            sources_by_general,
                            alias_source_by_general,
                            alias_type_by_general,
                            review_status_by_general,
                        ) in alias_rows
                    ],
                )

            if triage_rows:
                cursor.executemany(
                    """
                    INSERT INTO sanguo_rag.triage_label_decisions (
                      normalized, label, decision
                    ) VALUES (
                      %s, %s, %s
                    )
                    ON CONFLICT (normalized) DO UPDATE
                    SET
                      label = EXCLUDED.label,
                      decision = EXCLUDED.decision,
                      inserted_at = NOW();
                    """,
                    triage_rows,
                )

        connection.commit()

    print(
        "[pg-import] completed "
        f"observed_mentions={len(observed_rows)} "
        f"alias_map_entries={len(alias_rows)} "
        f"triage_decisions={len(triage_rows)}"
    )


if __name__ == "__main__":
    main()
