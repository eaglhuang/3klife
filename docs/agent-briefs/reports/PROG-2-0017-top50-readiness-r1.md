<!-- doc_id: doc_other_1328 -->
# PROG-2-0017 Top50 Readiness Audit R1

Generated at: 2026-05-29T10:05:13.641Z

## Scope

- Task: PROG-2-0017 relationship edge / interaction target / readiness audit.
- Input: runtime-general-profiles Top50 export artifacts.
- Goal: identify whether Top50 characters are playable in web through grounded persona cards, relationship events, and scene-director-safe interaction candidates.

## Summary

- Total audited generals: 50
- Missing runtime artifacts: 0
- Band counts: playable-with-audit-risks=29, needs-etl-fill=21
- Average readyEventCount: 11.7
- Average relationshipCount: 6.36

## Main Findings

- The Top50 export itself is complete: all 50 runtime profile folders are present when using the current artifact set.
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
| cao-zhen | 曹真 | needs-etl-fill | 0 | 3 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| deng-ai | 鄧艾 | needs-etl-fill | 0 | 3 | promote_more_ready_events, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | needs-etl-fill | 0 | 1 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-bu | 呂布 | needs-etl-fill | 0 | 16 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-xun | 陸遜 | needs-etl-fill | 0 | 0 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-chao | 馬超 | needs-etl-fill | 0 | 5 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Candidate Pool Risks

| generalId | name | candidateOnlyTargets | aliasOnlyTraces | actions |
| --- | --- | --- | --- | --- |
| cao-hong | 曹洪 | 45 | 48 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| zhao-yun | 趙雲 | 38 | 53 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| sun-quan | 孫權 | 29 | 53 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-cao | 曹操 | 29 | 50 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| le-jin | 樂進 | 30 | 44 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| liu-bei | 劉備 | 34 | 39 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Duplicate Amplification Risks

| generalId | name | duplicateGroups | crossLayerOverlap | actions |
| --- | --- | --- | --- | --- |
| wei-yan | 魏延 | 85 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| zhao-yun | 趙雲 | 90 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| zhuge-liang | 諸葛亮 | 81 | 4 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| liu-bei | 劉備 | 91 | 3 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| sun-quan | 孫權 | 80 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-ren | 曹仁 | 96 | 3 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Full Matrix Location

- Machine-readable full matrix: `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0017-top50-readiness-audit-r1.json`.
- Keep the Markdown report as a decision summary; use the JSON for exact per-general metrics and regression diffs.

## Next Work Order

1. Promote ready events for zero-event or one-event profiles before polishing web display.
2. Split scene-director candidate selection into relationship-backed targets and mention-only targets.
3. Add export/server dedupe keyed by targetId + sourceRef + sourceType before prompt/evidence assembly.
4. Use this audit output as the first PROG-2-0017 regression report after each Top50 ETL refresh.
