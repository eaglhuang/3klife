---
doc_id: doc_other_1327
task_id: TASK-AAO-0000
title: AAO 文件區初始化與 ASA 橋接索引
milestone: M0
status: done
artifact_status: spec-done
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: 2026-05-25T09:00:00+08:00
started_by_agent: codex
completed_at: 2026-05-25T09:30:00+08:00
completed_by_agent: codex
blocked_by: []
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-self-atomization/tasks/README.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - unrelated 3KLife docs outside ai_atomic_framework
non_goals:
  - 不修改 AI-Atomic-Framework 程式碼
  - 不匯入 AI-Atomic-Framework/.atm/history/tasks
  - 不重排 TASK-ASA-* 編號
doc_refs:
  - doc_other_0028
  - doc_other_0032
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-25T03-37-06-570Z-migrate-legacy-ledger-06082a39a406
lastTransitionAt: 2026-05-25T03:37:06.570Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-25T03:37:06.570Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:2ab4acaaf42b9fa4af4bab55c2e76085cb03ab890023b6e5ba9b4ff088266296
---

# TASK-AAO-0000 — AAO 文件區初始化與 ASA 橋接索引

## 目標

建立 AAO 主題線的全部規劃文件，並在 ASA 主計畫與任務索引補上明確橋接。

## 背景

AAO 是 ASA 的 follow-up 系列，不是續號任務。  
因此第一張卡必須先把文件區、索引與橋接規則建好，避免之後的任務範圍混線。

## 阻塞

無。

## 參考

- `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`
- `docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md`
- `docs/ai_atomic_framework/atm-self-atomization/tasks/README.md`

## 交付物

- AAO 主計畫書
- AAO README
- AAO tasks README
- `TASK-AAO-0000` 到 `TASK-AAO-0008`
- ASA 主計畫中的 AAO 橋接段落
- ASA 任務索引中的 AAO follow-up 段落

## 驗收條件

- [x] AAO 目錄與 `tasks/` 目錄存在
- [x] 任務索引能完整列出 `TASK-AAO-0000` 到 `TASK-AAO-0008`
- [x] ASA 主計畫與 tasks README 都能連到 AAO 系列
- [x] 本卡維持 docs-only，不產生 upstream code mutation

## 作用範圍

- `docs/ai_atomic_framework/atm-agent-first-operability/**`
- `docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md`
- `docs/ai_atomic_framework/atm-self-atomization/tasks/README.md`

## 驗證命令

```bash
node tools_node/doc-id-registry.js --assign <new-file>
node tools_node/doc-id-registry.js --verify
npm run check:encoding:touched -- --files <files...>
git diff --check
```

## 回滾方式

回滾這次 docs-only commit，或只移除 AAO 目錄與 ASA 橋接段落。

## Notes

2026-05-25 | 狀態: done | 驗證: pending | 變更: 建立 AAO 文件區與橋接索引 | 阻塞: none

