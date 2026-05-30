# PROG-2-0019 Front6 Ready Event Promotion Audit

Generated at: 2026-05-29T15:10:09.003Z

## Scope

- Task: PROG-2-0019 source-event-packet ready-event promotion.
- Input: front6 sidecar runtime profiles exported from merged base ready-events + promoted source-event-packet candidates.
- Goal: verify whether conservative upstream promotion raises ready-event coverage without changing downstream scene eligibility rules.

## Summary

- Total audited generals: 6
- Missing runtime artifacts: 0
- Band counts: needs-etl-fill=4, playable-with-audit-risks=2
- Average readyEventCount: 16.5
- Average relationshipCount: 11.5

## Main Findings

- The front6 sidecar export is complete: all 6 requested runtime profile folders are present.
- Readiness is uneven: profiles with zero or very low readyEventCount are the next ETL fill targets before they can support richer web play.
- Interaction candidates need a separate gate from relationship edges: angleTargetLinks can surface candidate-only targets that are not anchored relationships.
- The Liu Bei / Sun Shang Xiang duplication pattern is systemic enough to audit: duplicate target/source angle groups and storyBeat/sourceHighlight overlap are measurable across profiles.

## R2 Implementation Note

- Export layer: `angleTargetLinks` now dedupes by `targetId + sourceRef + sourceType`; multiple angles are retained in `angleFamilies`.
- Server layer: scene-director runtime source collection lets `storyBeats` cover same-ref `sourceHighlights`, and alias-only mentions no longer create fresh Top12 interaction targets by themselves.
- Regression: Liu Bei / Sun Shang Xiang sourceHighlight expansion now reports `duplicate_groups=0`, with two source refs (`055#p6`, `055#p9`) preserving 9 angle families each.

## Needs ETL Fill First

| generalId | name | band | readyEvents | relationships | actions |
| --- | --- | --- | --- | --- | --- |
| cao-zhen | 曹真 | needs-etl-fill | 3 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| deng-ai | 鄧艾 | needs-etl-fill | 3 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | needs-etl-fill | 3 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-xun | 陸遜 | needs-etl-fill | 4 | 0 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Candidate Pool Risks

| generalId | name | candidateOnlyTargets | aliasOnlyTraces | actions |
| --- | --- | --- | --- | --- |
| ma-chao | 馬超 | 25 | 39 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-xun | 陸遜 | 25 | 32 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| deng-ai | 鄧艾 | 16 | 34 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-bu | 呂布 | 24 | 25 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | 14 | 30 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-zhen | 曹真 | 10 | 23 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Duplicate Amplification Risks

| generalId | name | duplicateGroups | crossLayerOverlap | actions |
| --- | --- | --- | --- | --- |
| lu-bu | 呂布 | 0 | 4 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-xun | 陸遜 | 0 | 4 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-zhen | 曹真 | 0 | 3 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| deng-ai | 鄧艾 | 0 | 3 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | 0 | 3 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-chao | 馬超 | 0 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Full Matrix Location

- Machine-readable full matrix: `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-front6-readiness-audit.json`.
- Keep the Markdown report as a decision summary; use the JSON for exact per-general metrics and regression diffs.

## Next Work Order

1. Extend the same promotion bridge to the remaining needs-etl-fill batch and keep all outputs canonicalWrites=false.
2. For the remaining needs-etl-fill profiles, fill relationship-backed location/event details before touching downstream scene rules.
3. Keep candidate-only targets and alias-only traces as audit items, not automatic scene anchors.
4. Use this audit output as the first PROG-2-0019 front-batch regression report after each upstream promotion refresh.
