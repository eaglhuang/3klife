# PROG-2-0019 Needs-Fill Ready Event Promotion Audit

Generated at: 2026-05-29T15:10:51.339Z

## Scope

- Task: PROG-2-0019 source-event-packet ready-event promotion.
- Input: 21 needs-etl-fill sidecar runtime profiles exported from merged base ready-events + promoted source-event-packet candidates.
- Goal: verify whether conservative upstream promotion raises ready-event coverage for the needs-fill batch without crossing into downstream scene projection rules.

## Summary

- Total audited generals: 21
- Missing runtime artifacts: 0
- Band counts: playable-with-audit-risks=11, needs-etl-fill=10
- Average readyEventCount: 16.1
- Average relationshipCount: 7.05

## Main Findings

- The needs-fill sidecar export is complete: all 21 requested runtime profile folders are present.
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
| deng-ai | 鄧艾 | needs-etl-fill | 4 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-zhen | 曹真 | needs-etl-fill | 6 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-xun | 陸遜 | needs-etl-fill | 6 | 0 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| guan-xing | 關興 | needs-etl-fill | 7 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| lu-meng | 呂蒙 | needs-etl-fill | 7 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| fa-zheng | 法正 | needs-etl-fill | 8 | 2 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Candidate Pool Risks

| generalId | name | candidateOnlyTargets | aliasOnlyTraces | actions |
| --- | --- | --- | --- | --- |
| lu-meng | 呂蒙 | 36 | 44 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| cao-pi | 曹丕 | 35 | 34 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-chao | 馬超 | 30 | 39 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-dai | 馬岱 | 31 | 38 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| xu-zhu | 許褚 | 32 | 37 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| yuan-shao | 袁紹 | 30 | 38 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Duplicate Amplification Risks

| generalId | name | duplicateGroups | crossLayerOverlap | actions |
| --- | --- | --- | --- | --- |
| liu-zhang | 劉璋 | 0 | 6 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| sima-yi | 司馬懿 | 0 | 6 | audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| sun-qian | 孫乾 | 0 | 6 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-chao | 馬超 | 0 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| ma-dai | 馬岱 | 0 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |
| pang-tong | 龐統 | 0 | 5 | review_relationship_edges, audit_interaction_candidate_pool, dedupe_angle_sources_before_scene_director |

## Full Matrix Location

- Machine-readable full matrix: `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0019-needs-fill-readiness-audit.json`.
- Keep the Markdown report as a decision summary; use the JSON for exact per-general metrics and regression diffs.

## Next Work Order

1. Continue with the remaining 10 needs-etl-fill profiles by enriching relationship-backed location and event boundaries, not by changing downstream scene logic.
2. Keep alias-only and candidate-only traces as upstream audit backlog until stronger relationship-backed evidence is available.
3. Use this audit output as the first PROG-2-0019 needs-fill regression report after each upstream promotion refresh.
