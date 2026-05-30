# PROG-2-0018 Front6 Mainline Injection Readiness Audit

Generated at: 2026-05-29T14:34:45.406Z

## Scope

- Task: PROG-2-0018 primary-canon / whitelist hard-relationship mainline injection.
- Input: sidecar runtime profiles exported from primary-canon relationship evidence and source-event-packets.
- Goal: verify whether the first needs-etl-fill batch gains grounded runtime relationships and ready-event coverage after the mainline input switch.

## Summary

- Total audited generals: 6
- Missing runtime artifacts: 0
- Band counts: needs-etl-fill=5, playable-with-audit-risks=1
- Average readyEventCount: 13.17
- Average relationshipCount: 11.5

## Main Findings

- The front6 sidecar export is complete: all 6 requested runtime profile folders are present when using the PROG-2-0018 sidecar artifact set.
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
| cao-zhen | 曹真 | needs-etl-fill | 0 | 5 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| deng-ai | 鄧艾 | needs-etl-fill | 0 | 2 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| fa-zheng | 法正 | needs-etl-fill | 0 | 2 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| lu-xun | 陸遜 | needs-etl-fill | 0 | 0 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| ma-chao | 馬超 | needs-etl-fill | 0 | 6 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |

## Candidate Pool Risks

| generalId | name | candidateOnlyTargets | aliasOnlyTraces | actions |
| --- | --- | --- | --- | --- |
| ma-chao | 馬超 | 23 | 39 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| lu-xun | 陸遜 | 24 | 32 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| deng-ai | 鄧艾 | 16 | 34 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| lu-bu | 呂布 | 24 | 25 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | 14 | 30 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |
| cao-zhen | 曹真 | 9 | 23 | promote_more_ready_events, review_relationship_edges, audit_interaction_candidate_pool |

## Duplicate Amplification Risks

| generalId | name | duplicateGroups | crossLayerOverlap | actions |
| --- | --- | --- | --- | --- |
| lu-bu | 呂布 | 0 | 4 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Full Matrix Location

- Machine-readable full matrix: `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0018-front6-readiness-audit.json`.
- Keep the Markdown report as a decision summary; use the JSON for exact per-general metrics and regression diffs.

## Next Work Order

1. Promote ready events for zero-event or one-event profiles before polishing web display.
2. Split scene-director candidate selection into relationship-backed targets and mention-only targets.
3. Add export/server dedupe keyed by targetId + sourceRef + sourceType before prompt/evidence assembly.
4. Use this audit output as the first PROG-2-0018 regression report after each Top50 ETL refresh.
