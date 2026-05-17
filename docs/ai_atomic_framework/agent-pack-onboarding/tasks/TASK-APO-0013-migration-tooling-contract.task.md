---
doc_id: doc_other_0166
task_id: TASK-APO-0013
title: Migration tooling contract + fixture 庫 + migration guide 模板
milestone: M8
status: open
blocked_by: [TASK-APO-0012]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/migrate.ts
  - packages/cli/src/migration/**
  - scripts/validate-migration-fixtures.ts
  - scripts/validators.config.json
  - docs/migrations/**
  - tests/migrations/**
  - fixtures/migrations/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 重寫既有 upgrade plan / rollback（屬 TASK-APO-0012 範疇）
  - 提供具體 0.x → 1.0 migration 內容（本卡只定契約與工具）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0013 — Migration Tooling Contract

## 背景

`upstream-versioning-policy.md` §5 規定 breaking change 必附 migration guide。目前 ATM 沒有 codemod、fixture 庫、guide 模板。本卡建立可重用契約。

## 目標

1. `atm migrate` 子命令（`plan` / `apply` / `verify`）與 codemod 註冊機制。
2. 多階段遷移鏈：N → N+1 → N+2 可串接執行。
3. Migration guide 模板（`docs/migrations/TEMPLATE.md`）含：什麼壞了、為何壞、人工步驟、自動 codemod、回滾、fixture 引用。
4. `fixtures/migrations/<from>-to-<to>/` 結構規範，含 before / after / expected-diff。
5. `scripts/validate-migration-fixtures.ts` 加入 standard profile：每個帶 `breaking: true` 的 changelog 條目必須有對應 fixture + guide。

## 驗收

- [ ] `atm migrate plan --from 0.x --to 0.y --json` 可列出將執行的 codemod、影響檔案、user-modified flag。
- [ ] codemod 在 fixture before/ 套用後與 after/ 完全一致。
- [ ] validate-migration-fixtures.ts 失敗時錯誤訊息可機器解析。
- [ ] guide 模板被至少一份範例 migration（fixture-only 即可）使用以證明可行。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-migration-fixtures.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者改善計畫開立 migration tooling 後續卡 | 阻塞: TASK-APO-0012
