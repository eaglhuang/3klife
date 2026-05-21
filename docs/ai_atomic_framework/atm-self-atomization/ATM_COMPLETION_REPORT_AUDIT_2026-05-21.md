<!-- doc_id: doc_other_1006 -->
# ATM Self-Atomization Completion Claim Audit

## 結論

Copilot 產生的 completion report 不可作為 ATM completion evidence。保留該報告作為原始宣稱，但任務狀態必須回到可驗證的治理狀態。

## 稽核判定

- TASK-ASA-0001：保留 done。
- TASK-ASA-0002：降級為 partial，因為 script 已存在，但 `node atm.mjs atomize inventory --repo . --json` 回傳 `ATM_CLI_UNKNOWN_COMMAND`，尚未接入 ATM CLI contract。
- TASK-ASA-0003 到 TASK-ASA-0016：維持 planned/reopened。
- ATM commit `8a0d825`：只視為 draft evidence，不作為完成證據。

## 重跑結果

- `node atm.mjs atomize inventory --repo . --json`：failed，`ATM_CLI_UNKNOWN_COMMAND`。
- `node atm.mjs validate atomization-coverage --repo . --json`：failed，`validate does not support option --repo`。
- `node atm.mjs doctor --json`：failed，`ATM_DOCTOR_GIT_EVIDENCE_MISSING` for commit `8a0d825`。

## 修正原則

不建議直接 git revert，因為錯誤完成宣稱本身是重要治理 evidence。正確處理方式是新增稽核修正提交，標記 report superseded，並把任務卡狀態降級到真實可驗證狀態。
