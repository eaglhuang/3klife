---
doc_id: doc_agentskill_0065
name: task-card-required-adjustment
description: 任務卡的必要調整。Use when ATM task cards contain proposal-style notes or dated additive acceptance sections such as 識別/行為/狀態機提案、不重啟驗收、ATM 演進規劃書 v2、連鎖影響、治理補丁, and those notes must be re-analyzed into the formal task-card sections.
---

# 任務卡的必要調整

Use this skill when an ATM task card has important requirements trapped in `notes` or dated patch headings instead of the formal task format.

## Target

Target files are usually:

- `docs/agent-briefs/tasks/ATM-*.md`

Trigger examples:

- `notes: |` contains `識別/行為/狀態機提案`、`schema-additive`、`不重啟驗收`、`caller-count`、`連鎖影響`、`治理補丁`
- A body heading like `### 2026-05-07 識別/行為提案追加（不重啟驗收）`
- Additive requirements from `ATM 演進規劃書 v2 附錄 A/B/C`

## Required Workflow

1. Read the full task card as UTF-8.
2. Extract all semantic additions from frontmatter `notes`, dated body headings, acceptance bullets, and planning references.
3. If unclear, search narrowly in `docs/ai_atomic_framework/` for the task id and key terms. Do not bulk-read large planning docs.
4. Treat proposal notes as required task content. They are not optional comments.
5. Rewrite the whole card’s formal sections so a future agent can execute the card without reading historical notes.
6. Before opening any follow-up, search existing ATM cards for the same function or acceptance. Prefer updating an existing `open` / `in-progress` card over creating a new card.
7. If the target card is already `status: done`, do not rewrite that done card. If no existing open card covers the same function, open a new follow-up task card in the same `phase` / milestone and make the done card a dependency or source reference.
8. Preserve frontmatter identity and lifecycle fields unless the user explicitly asks to change task status. For normalization work, do not mark the target task `in-progress` just because you are editing the card text.
9. Preserve historical `notes` for audit unless they are duplicated in a way that confuses execution. It is fine for notes to mention the original proposal once the formal sections contain the real requirement.
10. Remove or fold dated patch headings inside the formal body when they are the only place requirements appear. The body should read as one coherent task, not a chain of appendices.
11. Run encoding validation on every touched task card.

## Existing Card Check

Before creating a follow-up, run a narrow duplicate search:

```bash
rg -n "<key term>|<behavior id>|<source task id>|<artifact name>" docs/agent-briefs/tasks -g "ATM-*.md"
```

Consider it already opened when an existing `open` or `in-progress` card covers the same feature, artifact, behavior id, schema field, validation gate, or case-study scope. In that case:

- Do not create a new task id.
- Normalize the existing open card’s formal sections instead.
- Add the done source card id to `INPUT_CONTRACT` / related notes when useful, without changing the done card.
- If the existing open card is owned by another active agent and editing would collide, leave a concise note in your handoff instead of opening a duplicate.

## Done Card Policy

If frontmatter says `status: done`, treat the original card as a closed audit record.

- Do not rewrite the completed card body, frontmatter, notes, or validation history.
- First check whether an existing open card already covers the same function.
- Only open a new follow-up card in the same `phase` / milestone when no existing card covers the same function.
- Put the done card id in `depends` and mention it as a source card in `INPUT_CONTRACT`.
- The follow-up card must carry the normalized requirements that would otherwise have been folded into the done card.
- Use the next available id in the same milestone sequence, after confirming no existing card already covers the function.
- If several done cards in the same milestone need the same normalization pass and no existing open cards cover them, one aggregate follow-up is acceptable when it lists every source card explicitly.

## Formal Sections To Fill

Every adjusted card must have meaningful content in:

- `## 問題描述`
- `## INPUT_CONTRACT`
- `## OUTPUT_CONTRACT` or `## OUTPUT_CONTRACT (acceptance)`
- `## 交付物`
- `## VALIDATION_CMD`
- `## ROLLBACK_HINT`
- `## 執行步驟`

Use the original purpose of the card as the spine. Merge the additive notes into the relevant section:

- Preconditions, dependency gates, allowed input sources -> `INPUT_CONTRACT`
- Required behavior, schema additions, acceptance criteria, mode differences -> `OUTPUT_CONTRACT`
- Files, fixtures, schemas, adapters, docs, tracking updates -> `交付物`
- Concrete commands and local encoding check -> `VALIDATION_CMD`
- Safe revert strategy and compatibility boundary -> `ROLLBACK_HINT`
- Ordered implementation recipe -> `執行步驟`

## ATM-Specific Judgment

- Keep `schema-additive` requirements explicit and avoid destructive schema changes.
- If a card says `不重啟驗收`, fold the added acceptance into the contract without resetting status or completion history.
- If a card mentions `callerCount` / caller-count, connect it to lifecycle police zero-caller sweep input.
- If a card mentions `behavior.*`, use the exact behavior id in acceptance and validation hints.
- If a card mentions maps, distinguish atom evidence under `atomic_workbench/atoms/` from map evidence under `atomic_workbench/maps/`.
- If a card mentions host-only or adopter-private fields, specify where those fields are isolated and how neutrality/schema validation catches leaks.
- If a card is a shadow adapter, make read-only, parity, and no-mutation constraints explicit.

## Validation

After edits, run:

```bash
npm.cmd run check:encoding:touched -- --files <task-card.md>
```

If `npm.ps1` is blocked by PowerShell execution policy, use `npm.cmd`.

For batch work, run encoding check with all touched task cards at the end as well. Also run a search for leftover dated body headings:

```bash
rg -n "^### 2026-.*(識別/行為|不重啟驗收|連鎖影響|治理補丁)" docs/agent-briefs/tasks -g "ATM-*.md"
```

Remaining matches should either be intentionally preserved audit context or still need normalization.

## Batch Strategy

1. Normalize one representative card first.
2. Write or update this skill from that concrete example.
3. Process the remaining cards using this skill.
4. For `status: done` cards, create same-milestone follow-up cards instead of editing the completed card.
5. Keep diffs small per card: rewrite formal sections, avoid unrelated status or owner churn.
6. Re-run encoding validation and summarize which cards were adjusted or converted into follow-up cards.
