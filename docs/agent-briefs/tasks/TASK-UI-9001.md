---
scopePaths:
  - docs/ai_atomic_framework/atm-backlog-shards/**
  - assets/scripts/ui/components/GeneralDetailComposite.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts.meta
  - tools_node/capture-ui-screens.js
  - tools_node/lib/ui-capture-diagnostics.js
  - tests/ucuf/architectureGovernance.test.ts
  - tests/ucuf/fixtures/architectureEngineStubs.ts
  - tests/ucuf/generalDetailChromePresenter.test.ts
  - docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md
  - docs/agent-briefs/tasks/TASK-UI-9001.md
  - docs/ui-quality-tasks/TASK-UI-9001.json
  - docs/ui-quality-todo.json
  - docs/agent-briefs/tasks_index.md
deliverables:
  - docs/ai_atomic_framework/atm-backlog-shards/**
  - assets/scripts/ui/components/GeneralDetailComposite.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts.meta
  - tools_node/capture-ui-screens.js
  - tools_node/lib/ui-capture-diagnostics.js
  - tests/ucuf/architectureGovernance.test.ts
  - tests/ucuf/fixtures/architectureEngineStubs.ts
  - tests/ucuf/generalDetailChromePresenter.test.ts
  - docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md
validators:
  - "node node_modules/ts-node/dist/bin.js --project tsconfig.test.json tests/ucuf/generalDetailChromePresenter.test.ts --verify-extraction-ceilings"
  - "npm run test:ucuf:governance"
  - "npm run test:ucuf"
  - "node tools_node/validate-ui-specs.js --strict --check-content-contract"
  - "node tools_node/compute-gate.js --profile standard --agent-feedback"
  - "node tools_node/check-general-detail-lobby-flow-smoke.js"
  - "git diff --check"
id: TASK-UI-9001
title: "人物頁 chrome 與擷取診斷拆分"
priority: P1
phase: M6
created: 2026-10-21
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: in-progress
amendment_epoch: 1
started_at: 2026-10-20T23:27:18.111Z
started_by_agent: codex-gpt-6
type: refactor
depends: []
notes: "2026-10-21 | 狀態: in-progress | 驗證: pending | 變更: 獨立維護卡已接手；正常增加問題清單分片範圍 | 阻塞: none"
---
# [TASK-UI-9001] 人物頁 chrome 與擷取診斷拆分

TaskID: TASK-UI-9001

## Context Map

- Primary：GeneralDetailComposite 保留生命週期；GeneralDetailChromePresenter 接手既有外觀與 child factories；capture-ui-screens 與 ui-capture-diagnostics 保留診斷格式及實機擷取路徑。
- Secondary：沿用既有 ChildPanel、portrait utilities 與 browser-capture-core；不修改它們，也不修改 PM 驗收卡。
- Test Coverage：architectureGovernance 保留原斷言；architectureEngineStubs 抽出原 fixture；generalDetailChromePresenter 測試實際模組與行數上限。
- Patterns to Follow：對照未修改基準逐方法抽取，事件 owner、可見性、快取與 fail-fast 行為保持一致；只在 capture 呼叫端允許硬體渲染。

> **Harness rollout 開卡** — 在最新 master 基準交付已保存的行為不變抽取。正式 PROG-2-0150 退役驗收卡不變。
> **定位**：M6
> **前置依賴**：無

## 問題描述

現有母頁與擷取工具過大，阻擋後續人物上下文修正。本卡抽取既有 chrome、診斷與測試 fixture，保留遊戲行為及斷言；僅讓擷取呼叫端使用硬體渲染，不修改遊戲載入 timeout。將本次治理流程問題的實證補回共用問題紀錄。

## INPUT_CONTRACT

- 先正常上鎖與認領並提交 started 欄位
- 來源三個舊檔與保存快照基準相同
- 規劃文件為 scope 與 closeback 資料而非產品 deliverables

## OUTPUT_CONTRACT

- [ ] 保留人物頁掛載與可見性及事件 owner
- [ ] 完整保留既有測試斷言與診斷 schema
- [ ] 交付上限：GeneralDetailComposite.ts 696 行、capture-ui-screens.js 1453 行、architectureGovernance.test.ts 334 行；新模組各不超過600行
- [ ] 擷取呼叫保留其餘 browser args 並允許硬體渲染

## VALIDATION_CMD

```bash
node node_modules/ts-node/dist/bin.js --project tsconfig.test.json tests/ucuf/generalDetailChromePresenter.test.ts --verify-extraction-ceilings
npm run test:ucuf:governance
npm run test:ucuf
node tools_node/validate-ui-specs.js --strict --check-content-contract
node tools_node/compute-gate.js --profile standard --agent-feedback
node tools_node/check-general-detail-lobby-flow-smoke.js
git diff --check
```

## ROLLBACK_HINT

```bash
以正常 Git revert 回復本卡正式交付；保留來源快照供復原。
```

## 執行步驟

1. 比對基準與已保存快照
2. 認領並提交開始欄位
3. 恢復八個來源檔且檢查雜湊
4. 執行七個驗證與 Cocos 擷取
5. 正常 pre-close dry-run close write

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-20*
