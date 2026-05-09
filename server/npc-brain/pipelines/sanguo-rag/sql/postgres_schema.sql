CREATE SCHEMA IF NOT EXISTS sanguo_rag;

CREATE TABLE IF NOT EXISTS sanguo_rag.observed_mentions (
  mention_id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  normalized TEXT NOT NULL,
  mention_type TEXT NOT NULL,
  match_status TEXT NOT NULL,
  matched_general_ids TEXT[] NOT NULL DEFAULT '{}',
  source_ref TEXT NOT NULL DEFAULT '',
  chapter_no INTEGER,
  paragraph_index INTEGER NOT NULL DEFAULT 0,
  start_offset INTEGER NOT NULL DEFAULT 0,
  end_offset INTEGER NOT NULL DEFAULT 0,
  text_snippet TEXT NOT NULL DEFAULT '',
  scene_participants TEXT[] NOT NULL DEFAULT '{}',
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observed_mentions_status_normalized
  ON sanguo_rag.observed_mentions (match_status, normalized);

CREATE INDEX IF NOT EXISTS idx_observed_mentions_source_ref
  ON sanguo_rag.observed_mentions (source_ref);

CREATE TABLE IF NOT EXISTS sanguo_rag.alias_map_entries (
  normalized TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  general_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  sources_by_general JSONB NOT NULL DEFAULT '{}'::jsonb,
  alias_source_by_general JSONB NOT NULL DEFAULT '{}'::jsonb,
  alias_type_by_general JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status_by_general JSONB NOT NULL DEFAULT '{}'::jsonb,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alias_map_entries_status
  ON sanguo_rag.alias_map_entries (status);

CREATE TABLE IF NOT EXISTS sanguo_rag.triage_label_decisions (
  normalized TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('noise', 'ambiguous', 'person')),
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_label_decisions_decision
  ON sanguo_rag.triage_label_decisions (decision);

CREATE OR REPLACE VIEW sanguo_rag.unresolved_label_summary AS
SELECT
  m.normalized,
  MIN(m.label) AS label,
  MIN(m.mention_type) AS mention_type,
  COUNT(*)::INTEGER AS mention_count
FROM sanguo_rag.observed_mentions AS m
LEFT JOIN sanguo_rag.triage_label_decisions AS d
  ON d.normalized = m.normalized
WHERE m.match_status = 'unresolved'
  AND COALESCE(d.decision, '') NOT IN ('noise', 'ambiguous', 'person')
GROUP BY m.normalized;
