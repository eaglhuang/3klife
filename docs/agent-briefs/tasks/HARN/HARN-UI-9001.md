---
scopePaths:
  - assets/scripts/ui/components/GeneralDetailComposite.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts.meta
  - tools_node/capture-ui-screens.js
  - tools_node/lib/ui-capture-diagnostics.js
  - tests/ucuf/architectureGovernance.test.ts
  - tests/ucuf/fixtures/architectureEngineStubs.ts
  - tests/ucuf/generalDetailChromePresenter.test.ts
  - docs/agent-briefs/tasks/HARN/HARN-UI-9001.md
  - docs/ui-quality-tasks/HARN-UI-9001.json
  - docs/ui-quality-todo.json
  - docs/agent-briefs/tasks_index.md
deliverables:
  - assets/scripts/ui/components/GeneralDetailComposite.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts
  - assets/scripts/ui/components/character-ds3/GeneralDetailChromePresenter.ts.meta
  - tools_node/capture-ui-screens.js
  - tools_node/lib/ui-capture-diagnostics.js
  - tests/ucuf/architectureGovernance.test.ts
  - tests/ucuf/fixtures/architectureEngineStubs.ts
  - tests/ucuf/generalDetailChromePresenter.test.ts
validators:
  - "node node_modules/ts-node/dist/bin.js --project tsconfig.test.json tests/ucuf/generalDetailChromePresenter.test.ts --verify-extraction-ceilings"
  - "npm run test:ucuf:governance"
  - "npm run test:ucuf"
  - "node tools_node/validate-ui-specs.js --strict --check-content-contract"
  - "node tools_node/compute-gate.js --profile standard --agent-feedback"
  - "node tools_node/check-general-detail-lobby-flow-smoke.js"
  - "git diff --check"
id: HARN-UI-9001
priority: P1
phase: M6
created: 2026-10-20
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: refactor
depends: []
notes: "2026-10-20 | 狀態: planned | 驗證: pending | 變更: task-card-opener 產生 HARN rich brief | 阻塞: none"
---
# [HARN-UI-9001] 人物頁 chrome 與擷取診斷拆分

> **Harness rollout 開卡** — 在最新 master 基準交付已保存的行為不變抽取。正式 PROG-2-0150 退役驗收卡不變。
> **定位**：M6
> **前置依賴**：無

## 問題描述

待補：說明這張卡要修正或補齊的核心問題。

## INPUT_CONTRACT

- 先正常上鎖與認領並提交 started 欄位
- 來源三個舊檔與保存快照基準相同
- 規劃文件為 scope 與 closeback 資料而非產品 deliverables

## OUTPUT_CONTRACT

- [ ] 保留人物頁掛載與可見性及事件 owner
- [ ] 完整保留既有測試斷言與診斷 schema
- [ ] 舊檔交付行數上限 696/1453/334 且新模組不超過600行
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
