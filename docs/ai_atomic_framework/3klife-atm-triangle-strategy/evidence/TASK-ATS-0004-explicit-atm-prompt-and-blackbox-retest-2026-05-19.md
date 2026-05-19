# TASK-ATS-0004 Evidence: Explicit ATM Prompt / Natural Black-Box Reassessment

Date: 2026-05-19
Status: in_progress

## Result

This test is not a full black-box success because the user explicitly said "use ATM".
It is accepted as an explicit ATM prompt smoke pass.

## Passed

- Explicit ATM Prompt Compliance
- Blocker Awareness
- Graceful Fallback
- Return To User Intent
- ATM-Style Reasoning

## Not Yet Passed

- Natural Black-Box Skill Trigger
- Deterministic Candidate Ranking
- Source Inventory Artifact
- Police Artifact
- Python-Only Adopter Neutrality retest on npc-brain

## Upstream Fixes Implemented

- Added canonical English `atm-governance-router` skill.
- Added `legacy-candidate-ranking` intent.
- Added guided fallback contract fields: `missingDocs[]`, `fallbackSources[]`, `continuedOriginalRequest`.
- Added `atm candidates rank --include "pipelines/**/*.py" --json`.
- Connected candidate ranking to source inventory and police-family evidence.
- Added Guidance Drift Police advisory report and skill-miss learning hint.
- Downgraded Python-only `package-json-missing` from release blocker to advisory.

## Required Retest

Explicit ATM prompt:
```text
請用 ATM 幫我看看目前這個 repo 裡，哪些 Python 資料管線最亂、最值得先整理，先幫我排一下優先順序。
```

Natural black-box prompt:
```text
請幫我看看目前這個 repo 裡，哪些 Python 資料管線最亂、最值得先整理，先幫我排一下優先順序。
```

Both should produce or cite ATM guidance result, candidate ranking artifact, source inventory artifact, police artifact, and a recommended split / atomize / infect route.
