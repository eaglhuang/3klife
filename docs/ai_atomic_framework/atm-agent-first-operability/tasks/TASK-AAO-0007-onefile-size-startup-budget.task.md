---
doc_id: doc_other_1325
task_id: TASK-AAO-0007
title: onefile size / startup budget
milestone: M3
status: open
blocked_by:
  - TASK-AAO-0001
  - TASK-ASA-0014
  - TASK-ATD-0025
  - TASK-ATD-0032
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - scripts/build-onefile-release.ts
  - scripts/validate-onefile-release.ts
  - scripts/validate-cli.ts
  - release/**
  - docs/release-*.md
  - docs/SELF_HOSTING_ALPHA.md
forbidden_files:
  - default bundler swap
  - root-drop contract rewrite
  - unrelated npm packaging redesign
non_goals:
  - 不預設更換 bundler
  - 不改寫 root-drop distribution contract
  - 不重開 root-drop sandbox E2E
doc_refs:
  - doc_other_0028
  - doc_other_0035
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0007 — onefile size / startup budget

## 目標

為 onefile 發行物建立大小、啟動時間與 cache extraction 成本的 budget 與報表。

## 背景

`release/atm-onefile/atm.mjs` 的體積偏大是事實，但它同時是正式 distribution artifact。  
AAO 的第一步不是推倒重來，而是先把成本量化並接上 release parity 與 sandbox E2E。

## 阻塞

- `TASK-AAO-0001`
- `TASK-ASA-0014`
- `TASK-ATD-0025`
- `TASK-ATD-0032`

## 參考

- `release/atm-onefile/atm.mjs`
- `scripts/build-onefile-release.ts`
- `scripts/validate-onefile-release.ts`

## 交付物

- size / startup / extraction budget 定義
- release validator 輸出欄位
- 超標處理與報警策略

## 驗收條件

- [ ] onefile 報表至少輸出大小、hash、startup time
- [ ] 超過 baseline 時能提供原因與建議下一步
- [ ] 設計與 `TASK-ATD-0025` release parity gate 相容
- [ ] 不以 bundler replacement 作為預設方案

## 作用範圍

- `scripts/build-onefile-release.ts`
- `scripts/validate-onefile-release.ts`
- `scripts/validate-cli.ts`
- `release/**`
- `docs/release-*.md`
- `docs/SELF_HOSTING_ALPHA.md`

## 驗證命令

```bash
npm run validate:onefile-release
npm run validate:root-drop-release
node atm.mjs doctor --json
```

## 回滾方式

若 budget 過早卡住 release，先回退 hard gate，只保留報表與告警。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待建立 onefile size / startup budget | 阻塞: TASK-AAO-0001, TASK-ASA-0014, TASK-ATD-0025, TASK-ATD-0032

