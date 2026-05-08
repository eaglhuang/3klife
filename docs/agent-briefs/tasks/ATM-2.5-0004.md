---
doc_id: doc_task_0359
id: ATM-2.5-0004
priority: P1
phase: ATM-2.5
created: 2026-05-08
created_by_agent: codex-gpt-5
owner: codex-gpt-5
status: open
type: implementation
depends:
  - ATM-2.5-0001
  - ATM-2.5-0002
  - ATM-2.5-0003
  - ATM-2-0020
  - ATM-2-0021
  - ATM-2-0022
notes: "2026-05-08 | 狀態: open | 驗證: pending | 變更: 依任務卡必要調整與去重規則，承接 done 卡 ATM-2.5-0002 未完成的 evolution sandbox acceptance；已確認沒有既有同功能 open 卡 | 阻塞: 等 ATM-2-0020/0021/0022 完成"
---
# [ATM-2.5-0004] Alpha1 evolution sandbox fixture

> **任務開卡** — 承接 ATM-2.5-0002 的 v2 追加 acceptance，建立 alpha1 evolution sandbox fixture，不污染 alpha0 birth fixture
> **定位**：ATM-2.5 / alpha1 evolution sandbox
> **前置依賴**：ATM-2.5-0001, ATM-2.5-0002, ATM-2.5-0003 已完成；ATM-2-0020 / ATM-2-0021 / ATM-2-0022 提供 evolution proposal 與 rollback contract

## 問題描述

`ATM-2.5-0002` 已完成 alpha0 sandbox birth pipeline，且不能再被重寫；但 v2 補丁明確要求 evolution sandbox fixture 改由 alpha1 新卡承接。本卡只建立獨立 alpha1 evolution sandbox，驗證 upgrade proposal / review / rollback dry-run，不把 evolution 能力塞回 alpha0 release blocker。

## INPUT_CONTRACT

- ATM-2.5-0002 source card is done and must not be rewritten
- alpha0 sandbox fixture remains birth-pipeline only
- evolution flow uses alpha1 proposal / review / rollback contracts
- no 3KLife/Cocos/html-to-ucuf private assumptions in upstream fixture

## OUTPUT_CONTRACT

- [ ] 新增獨立 alpha1 evolution sandbox，不修改 ATM-2.5-0002 的 alpha0 fixture
- [ ] sandbox 覆蓋 upgrade --propose dry-run、human review decision 與 rollback proof
- [ ] alpha0 deterministic 4 criteria 仍是 release blocker；evolution sandbox 只解鎖 alpha1 readiness
- [ ] fixture / expected output / report 都有 deterministic validation

## 交付物

- [ ] alpha1 evolution sandbox fixture。
- [ ] upgrade --propose dry-run script。
- [ ] expected proposal / review / rollback outputs。
- [ ] alpha0 fixture isolation note。
- [ ] validation report。

## VALIDATION_CMD

```bash
npm.cmd run check:encoding:touched -- --files docs/agent-briefs/tasks/ATM-2.5-0004.md
npm run validate:self-hosting-alpha
npm run validate:evolution-sandbox
npm test
npm run typecheck
npm run lint
```

## ROLLBACK_HINT

```bash
刪除 alpha1 evolution sandbox fixture、expected outputs 與 validation wiring；不得改寫 ATM-2.5-0001/0002/0003 的 done card 或 alpha0 fixture。
```

## 執行步驟

1. 確認 alpha0 sandbox 現況與 v2 補丁語意
2. 設計獨立 alpha1 evolution sandbox 目錄與 expected outputs
3. 串接 upgrade proposal / review / rollback dry-run
4. 補 deterministic validator 與 report
5. 跑 validation 並同步 task shard

*由 codex-gpt-5 透過 task-card-opener 開立 | 2026-05-08*
