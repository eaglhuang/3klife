---
doc_id: doc_other_1791
title: ATM Error Governance System Plan
status: active
family_dir: error-governance
series: ERR
prefix: TASK-ERR
createdByCommand: atm plan doc create
---

# ATM Error Governance System Plan

## Purpose

This document is the source plan for the registered ERR planning family. The family uses task prefix TASK-ERR and owns ATM error-code governance work that should not consume ATM-GOV numbering.

## Current Source of Truth

The current canonical ErrorCode registry remains:

- docs/governance/error-code-registry.json

Creating the ERR family does not move that registry. A future governed migration may move it only if the migration updates registry readers, npm run generate:error-codes, generated docs/ERROR_CODES.md, tests, and every emitter/import path in one verified change.

## Rules

1. New, renamed, retired, or redefined ATM_* ErrorCodes must route through atm-error-code-resolver.
2. ErrorCode fields required by plans or task cards are baseline governance fields for the original task, not a reason to open an extra GOV card.
3. Open TASK-ERR work only when error governance itself is the primary subject.
4. Any future registry move must prove content/digest stability and generated-output parity.

## Initial Candidate Work

- Registry migration blueprint for docs/governance/error-code-registry.json.
- ErrorCode baseline fields for plan and task-card templates.
- ErrorCode reference analyzer for plans, task cards, backlog, and registry references.

## Card Creation

All ERR cards must be created by CLI:

node atm.mjs plan card create --series ERR --title TITLE --write --json

Do not hand-write TASK-ERR task cards.
