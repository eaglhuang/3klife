# ATM Bug and Optimization Backlog — 用途與維護

> 這是 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 的「用途與維護」分片。完整索引見 `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`。

# ATM Bug and Optimization Backlog

Created: 2026-06-14
Owner: ATM Captain
Status: active, long-term maintained

## Purpose

This document is the single long-term checklist for ATM bugs, friction, and governance optimizations found during active framework development. It is not a task ledger and does not replace ATM task cards. Each item records the observed problem, how to reproduce or recognize it, impact, and a possible optimization path.

Use this file when:

- A workflow feels confusing, too heavy, or easy for agents to misuse.
- A validator, CLI command, task card, or derived runner behavior reveals a product gap.
- Captain sequencing or delegation drifts from the stated plan.
- A repeated workaround should become a governed improvement card.

## Item Template

```md
- [ ] BUG-ATM-XXXX: Short title
  - Status:
  - Severity:
  - Encountered:
  - Reproduce / detect:
  - Impact:
  - Possible optimization:
  - Related tasks / commits:
```

## Maintenance Rules

- Keep this file as a checklist; do not close items silently.
- When an item becomes a real task card, add the task id under related tasks.
- When fixed, mark the checkbox and add the closing commit or evidence command.
- Do not use this backlog as authority to bypass ATM routing, task claim, evidence, or closure rules.
