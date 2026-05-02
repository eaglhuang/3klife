# Sanguo Knowledge Completion Estimate

- Round ID: `abab-route-live-a1-merged`
- Generated At: `2026-05-02T04:54:29+00:00`
- Overall Estimate: `58.24%`
- Canonical Writes: `False`

## Formula

Overall = sum(componentScore * componentWeight), weights sum to 100.

| Component | Weight | Raw Score | Weighted Points |
|---|---:|---:|---:|
| `sourceResolution` | 6.0 | 0.9650 | 5.79 |
| `personFoundation` | 12.0 | 0.7530 | 9.04 |
| `relationshipGraph` | 22.0 | 0.4076 | 8.97 |
| `eventQuestionCoverage` | 32.0 | 0.4619 | 14.78 |
| `taxonomyAngles` | 13.0 | 0.7579 | 9.85 |
| `reviewValidation` | 6.0 | 0.3588 | 2.15 |
| `femalePriority` | 5.0 | 0.7333 | 3.67 |
| `pipelineReliability` | 4.0 | 0.9980 | 3.99 |

## Targets

- `people`: `601`
- `angleFamilies`: `11`
- `eventQuestionSlots`: `6611`
- `relationshipEdges`: `1803`
- `femaleProfiles`: `36`

## Observed Counts

- `resolvedMentionCount`: `20718`
- `unresolvedMentionCount`: `109`
- `reviewPendingMentionCount`: `642`
- `identitySeedCount`: `601`
- `basicProfileCoverageCounts`: `{"identity-only": 6, "observed-only": 360, "plain-rich": 235}`
- `relationshipEdgeCount`: `39`
- `sourceGroundedRelationshipEvidenceCount`: `422`
- `sourceGroundedRelationshipEvidenceUnits`: `259.4`
- `sourceGroundedRelationshipTypeCounts`: `{"alliance_oath": 1, "betrayal_surrender": 27, "enemy_rival": 135, "mentor_student": 23, "parent_child": 15, "patron_client": 35, "protects": 14, "ruler_subject": 126, "sibling": 6, "spouse": 28, "sworn_sibling": 12}`
- `plainRelationshipProposalCount`: `322`
- `readyEventCount`: `193`
- `sourceGroundedEventQuestionSeedCount`: `2631`
- `sourceGroundedEventQuestionSeedUnits`: `759.85`
- `sourceGroundedEventPacketCount`: `1601`
- `sourceGroundedEventPacketUnits`: `586.38`
- `genericBattleCandidateCount`: `24`
- `femaleInteractionCandidateCount`: `90`
- `previewAcceptedA`: `1295`
- `previewReviewB`: `2104`
- `previewTotalAnswers`: `3399`
- `sampledGeneralCount`: `28`
- `sampledFemaleGeneralCount`: `12`
- `sourceGroundedAngleFamilies`: `["activity_seed", "affect_story", "aptitude_talent", "battle", "decision_weight", "faction_timeline", "female_interaction", "item_equipment", "location_context", "relationship", "work_role"]`
- `sidecarAngleFamilies`: `["activity_seed", "affect_story", "aptitude_talent", "decision_weight", "faction_timeline", "female_interaction", "location_context", "relationship", "work_role"]`

## Included Preview Rounds

- `baihua-r2-basic-profile-prompt`: `{'A': 23, 'B': 76}` from ``
- `core-guanyu-boost-r1`: `{'A': 34, 'B': 14}` from `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/current-guanyu-core10-core10-boost-queue.jsonl`
- `repair-review-r1`: `{'A': 20, 'B': 10}` from `artifacts/data-pipeline/sanguo-rag/extracted/backlog-repair-tasks/repair-review-r1-repair-review-candidates.jsonl`
- `round-001-adapter-fast-smoke`: `{'B': 1}` from ``
- `round-001-adapter-hints-smoke`: `{'B': 1}` from ``
- `round-001-llm-smoke`: `{'B': 1}` from ``
- `round-001-relationship-location-optimized`: `{'A': 2, 'B': 3}` from ``
- `round-001-relationship-location`: `{'A': 7}` from ``
- `round-002-fast-proposals`: `{'B': 6}` from ``
- `round-002-hints-gate`: `{'A': 4, 'B': 4}` from ``
- `round-003-agent-reviewer`: `{'A': 2, 'B': 11}` from ``
- `round-004-agent-reviewer-wide`: `{'A': 2, 'B': 11}` from ``
- `round-005-agent-reviewer-deep`: `{'A': 5, 'B': 16}` from ``
- `round-006-agent-reviewer-tight-gate`: `{'A': 4, 'B': 17}` from ``
- `round-007-agent-reviewer-transfer-filter`: `{'A': 4, 'B': 17}` from ``
- `round-008-agent-reviewer-window-1`: `{'A': 2, 'B': 19}` from ``
- `round-009-agent-reviewer-window-3`: `{'A': 4, 'B': 17}` from ``
- `round-010-agent-reviewer-window-4`: `{'A': 4, 'B': 17}` from ``
- `round-011-agent-reviewer-location-priority`: `{'A': 9, 'B': 12}` from ``
- `round-012-agent-reviewer-directed-command`: `{'A': 7, 'B': 14}` from ``
- `round-013-agent-reviewer-edge-aware-location`: `{'A': 7, 'B': 14}` from ``
- `round-014-agent-reviewer-alias-fill`: `{'A': 13, 'B': 8}` from ``
- `round-015-agent-reviewer-alias-gated`: `{'A': 11, 'B': 10}` from ``
- `round-016-agent-reviewer-directed-command-v2`: `{'A': 12, 'B': 9}` from ``
- `round-017-agent-reviewer-command-filter-v3`: `{'A': 11, 'B': 10}` from ``
- `round-018-agent-reviewer-siege-gate-v4`: `{'A': 11, 'B': 10}` from ``
- `round-019-agent-reviewer-normalized-gates`: `{'A': 11, 'B': 10}` from ``
- `round-020-agent-reviewer-allied-pursuit-gate`: `{'A': 11, 'B': 10}` from ``
- `round-021-agent-reviewer-wiki-courtesy-aliases`: `{'A': 12, 'B': 9}` from ``
- `round-022-agent-reviewer-wiki-courtesy-pursuit-gate`: `{'A': 11, 'B': 10}` from ``
- `round-023-agent-reviewer-wiki-courtesy-stability`: `{'A': 11, 'B': 10}` from ``
- `round-024-courtesy-upstream-cohort-0`: `{'A': 22, 'B': 28}` from ``
- `round-025-courtesy-upstream-cohort-5`: `{'A': 24, 'B': 20}` from ``
- `round-026-courtesy-upstream-cohort-10`: `{'A': 12, 'B': 6}` from ``
- `round-027-peer-deployment-gate`: `{'A': 51, 'B': 61}` from ``
- `round-028-command-fp-gate`: `{'A': 42, 'B': 70}` from ``
- `round-029-direct-confrontation-pattern`: `{'A': 44, 'B': 68}` from ``
- `round-030-command-edge-cleanup`: `{'A': 42, 'B': 70}` from ``
- `round-031-location-and-ally-guard`: `{'A': 46, 'B': 66}` from ``
- `round-032-snapshot-and-report-gate`: `{'A': 46, 'B': 66}` from ``
- `round-033-copyfile-snapshot`: `{'A': 46, 'B': 66}` from ``
- `round-034-positioning-command-gate`: `{'A': 45, 'B': 67}` from ``
- `round-035-expanded-top20-audit`: `{'A': 63, 'B': 87}` from ``
- `round-036-expanded-top20-fp-gates`: `{'A': 56, 'B': 94}` from ``
- `round-037-rescue-truce-peer-gates`: `{'A': 53, 'B': 97}` from ``
- `round-038-review-only-summary-gate`: `{'A': 50, 'B': 100}` from ``
- `round-039-cohort15-top20-audit`: `{}` from ``
- `round-040-top30-depth-audit`: `{'A': 54, 'B': 108}` from ``
- `round-041-top30-envoy-defection-gates`: `{'A': 52, 'B': 110}` from ``
- `round-042-rescue-request-gates`: `{'A': 51, 'B': 111}` from ``
- `round-043-top40-depth-audit`: `{'A': 51, 'B': 111}` from ``
- `round-044-positive-battle-faction-gates`: `{'A': 21, 'B': 141}` from ``
- `round-045-balanced-positive-faction-gates`: `{'A': 31, 'B': 131}` from ``
- `wenyan-preview-next-female-focus-r2`: `{'A': 21}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl`
- `wenyan-preview-next-female-focus-r3`: `{'A': 21}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl`
- `wenyan-preview-next-female-focus`: `{'A': 19, 'B': 2}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl`
- `wenyan-preview-next-female-live`: `{'A': 11, 'B': 7}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl`
- `wenyan-preview-next-generic-focus-rank-r1`: `{'A': 9, 'B': 7}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-next-generic-focus-rank-r2`: `{'A': 12, 'B': 4}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-next-generic-focus-rank-r3`: `{'A': 11, 'B': 5}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-next-generic-focus-rank-r4`: `{'A': 13, 'B': 3}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-next-generic-live-r2`: `{'A': 7, 'B': 9}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-next-generic-live`: `{'A': 7, 'B': 9}` from `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `wenyan-preview-r1-agent-offset-0`: `{'A': 5, 'B': 1}` from ``
- `wenyan-preview-r2-agent-offset-5`: `{'B': 2}` from ``
- `wenyan-preview-r3-agent-offset-10`: `{'A': 1}` from ``
- `abab-route-live-a1`: `{'A': 2}` from `scratch/abab-route-live/abab-route-live/repair-review/backlog-repair-tasks/abab-route-live-a1-repair-review-candidates.jsonl`

## Component Formulae

- `overall`: sum(componentScore * componentWeight), weights sum to 100
- `sourceResolution`: resolvedMentions / (resolvedMentions + unresolvedMentions + reviewPendingMentions)
- `personFoundation`: 0.25*identityCoverage + 0.45*basicProfileDepth + 0.20*roleCoverage + 0.10*missingCoverageScore
- `relationshipGraph`: 0.75*((readyRelationshipEdges + weightedSourceGroundedRelationshipEvidence + 0.25*plainRelationshipProposals) / targetRelationshipEdges) + 0.25*(relationshipTypeCount / 11); evidence weights: confidence>=0.8 => 0.70, >=0.7 => 0.45, >=0.6 => 0.20
- `eventQuestionCoverage`: (readyEvents + 0.75*previewA + 0.25*previewB + 0.15*candidates + weightedSourceGroundedQuestionSeeds + weightedSourceEventPackets) / targetEventQuestionSlots; seed slots are capped at 0.35 units each; source event packets are capped at 0.40 units each
- `taxonomyAngles`: 0.20*allObservedAngleBreadth + 0.35*sourceGroundedAngleBreadth + 0.45*eventQuestionCoverage
- `reviewValidation`: 0.65*previewARate + 0.25*sampledGeneralCoverage + 0.10*reviewReliability
- `femalePriority`: 0.35*femaleProfileCoverage + 0.35*femaleValidatedCoverage + 0.30*femalePreviewARate
- `pipelineReliability`: stable/events artifacts present plus latest preview no-error/no-timeout reliability
