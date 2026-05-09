---
doc_id: doc_task_0359
id: ATM-2.5-0004
priority: P1
phase: ATM-2.5
created: 2026-05-08
created_by_agent: codex-gpt-5
owner: codex-gpt-5
status: done
type: implementation
depends:
  - ATM-2.5-0001
  - ATM-2.5-0002
  - ATM-2.5-0003
  - ATM-2-0020
  - ATM-2-0021
  - ATM-2-0022
  - ATM-2-0027
started_at: 2026-05-09T08:15:08.1875634+08:00
started_by_agent: codex-gpt-5.5
completed_at: "2026-05-09T09:41:39.6950660+08:00"
completed_by_agent: codex-gpt-5.5
notes: "2026-05-09 | 狀態: done | 驗證: brief / task-store / milestone sync pass | 變更: 收斂 ATM-2-0022 x ATM-2-0027 rollback/status compatibility regression 與 alpha1 evolution sandbox fixture tracking | 阻塞: none"
---
# [ATM-2.5-0004] Alpha1 evolution sandbox fixture

> **任務開卡** — 本卡現在承接 `ATM-2-0022 x ATM-2-0027` 的 rollback / status compatibility regression，仍以 alpha1 evolution sandbox fixture 為載體，不碰 alpha0 birth fixture。
> **定位**：ATM-2.5 / alpha1 evolution sandbox
> **依賴卡**：ATM-2.5-0001、ATM-2.5-0002、ATM-2.5-0003、ATM-2-0020、ATM-2-0021、ATM-2-0022、ATM-2-0027

## 任務說明

`ATM-2.5-0002` 已完成 alpha0 sandbox birth pipeline，且不能再被重寫；本卡負責把 alpha1 evolution sandbox fixture 的剩餘 acceptance 收斂成可驗證的 compatibility regression，確保 rollback 與 status machine 的交叉行為不會把 alpha0 fixture 汙染掉。

## INPUT_CONTRACT

- `ATM-2.5-0002` source card is done and must not be rewritten
- alpha0 sandbox fixture remains birth-pipeline only
- evolution flow uses alpha1 proposal / review / rollback contracts
- `ATM-2-0022` 與 `ATM-2-0027` 都必須已完成，才能作為 compatibility regression 的來源
- no 3KLife/Cocos/html-to-ucuf private assumptions in upstream fixture

## OUTPUT_CONTRACT

- alpha1 evolution sandbox fixture 必須覆蓋 `ATM-2-0022 x ATM-2-0027` rollback / status compatibility regression
- atom / map 兩路徑都要驗證 approve / reject / rollback 三種結果，並檢查 `statusReverted` / `semanticFingerprintReverted` 對稱性
- deterministic regression report 必須可重跑，且 `ATM-4-0007` 只重用這批結果，不自建 M1 compatibility rule
- fixture / expected output / report 都要有 deterministic validation

## 產出

- alpha1 evolution sandbox fixture
- upgrade --propose dry-run script
- expected proposal / review / rollback outputs
- alpha0 fixture isolation note
- compatibility regression report
- validation report

## VALIDATION_CMD

```bash
npm.cmd run check:encoding:touched -- --files docs/agent-briefs/tasks/ATM/ATM-2.5-0004.md
npm run validate:self-hosting-alpha
npm run validate:evolution-sandbox
npm test
npm run typecheck
npm run lint
```

## ROLLBACK_HINT

```bash
刪除 alpha1 evolution sandbox fixture、expected outputs 與 validation wiring；不得改寫 ATM-2.5-0001/0002/0003 的 done card 或 alpha0 fixture。若 compatibility regression 失敗，只回退這張 open card 的新增 acceptance。
```

## 執行順序

1. 確認 alpha0 sandbox 現況與 v2 補丁語意
2. 設計獨立 alpha1 evolution sandbox 目錄與 expected outputs
3. 串接 upgrade proposal / review / rollback dry-run
4. 補 deterministic validator 與 report
5. 跑 validation 並同步 task shard
