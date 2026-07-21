---
doc_id: doc_other_2147
title: ATM Temporary Governance Quarantine Plan
status: active
family_dir: temporary-governance
series: TMP
prefix: TASK-TMP
createdByCommand: atm plan doc create
---

# ATM Temporary Governance Quarantine Plan

## Purpose

This document is the source plan for the registered TMP planning family. TMP is for temporary governance quarantine, cleanup, numbering repair, relocation, and residue disposition that should not pollute stable families such as ATM-GOV, TEAM, or ERR.

## Boundary

TMP is not a junk drawer. Every TASK-TMP card must state:

1. Why the work is temporary.
2. Whether the artifact will be deleted, merged, migrated to a formal family, or abandoned.
3. Why it does not change the formal product model, ErrorCode contract, or GOV plan alignment.

## Appropriate Uses

- Repair misnumbered, duplicate, or misplaced task cards.
- Quarantine planning artifacts awaiting owner decision.
- Create one-time relocation, re-import, registry repair, or residue cleanup cards.
- Collect cross-agent dirty WIP or orphan planning files before formal disposition.

## Forbidden Uses

- Do not use TMP to bypass formal series review.
- Do not place ErrorCode governance in TMP; that belongs to ERR.
- Do not leave long-lived product work in TMP.
- Do not hand-write TASK-TMP task cards.

## Card Creation

All TMP cards must be created by CLI:

node atm.mjs plan card create --series TMP --title TITLE --write --json

Every TMP card must include an exit condition.

## Active One-Time Repairs

| Task | Purpose | Exit condition |
|---|---|---|
| `TASK-TMP-0004` | Before ATM Plan 3.0 census, migrate backlog rows `ATM-BUG-2026-07-20-213` through `ATM-BUG-2026-07-21-218` from projection-only text into canonical item shards. | Six schema-valid item files exist, two projection rebuilds are deterministic, and no temporary conversion artifact remains. |
