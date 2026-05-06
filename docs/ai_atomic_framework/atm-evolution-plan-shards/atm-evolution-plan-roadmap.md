# ATM 框架演進執行規劃書 — 新增任務與依賴重排（§4–§5）

> 這是 `ATM框架演進執行規劃書.md` 的「新增任務與依賴重排（§4–§5）」分片。完整索引見 `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`。

## 4. 新增任務規劃

以下 11 張演化任務卡已實際開卡並寫入 `docs/tasks/tasks-atm/*`；doc_id 已登錄於 `doc_task_0317` ~ `doc_task_0327`。附錄 B 另新增 4 張 Atomic Map 任務卡（`doc_task_0328` ~ `doc_task_0331`）。

| 建議卡號 | 名稱 | 階段 | 依賴 | 預期產出 |
|---|---|---|---|---|
| ATM-2-0014 | Registry Version History v0.1 | alpha1-prep | ATM-2-0004, ATM-2-0013 | registry `currentVersion` / `versions[]` schema、migration fixture、舊 registry 相容測試。 |
| ATM-2-0015 | Hash Drift / Version Diff Report | alpha1-prep | ATM-2-0014 | `hash-diff-report.schema.json`、spec/code/test hash delta、drift reason 欄位。 |
| ATM-2-0016 | Test Report Quality Metrics Extension | alpha1-prep | ATM-2-0003, ATM-2-0009 | latency / errorRate / coverage / edgeCaseCount 指標 schema 與 fixtures。 |
| ATM-2-0017 | Regression Matrix Compare Gate | alpha1-prep | ATM-2-0005, ATM-2-0016 | vOld fixtures against vNew code、coverage delta、quality comparison report。 |
| ATM-2-0018 | BuildAgentPrompt bootstrap atom（000003） | alpha0+ | ATM-2-0001, ATM-2-0002, ATM-2-0005 | 從 spec 產生受控 AI prompt，含 forbidden rules、allowed files、evidence contract。 |
| ATM-2-0019 | ExecuteAgentTask effect node dry-run（000004） | alpha0+ | ATM-2-0018, ATM-2-0006 | effect node contract、dry-run executor、artifact/log capture，不直接 apply patch。 |
| ATM-2-0020 | ProposeAtomicUpgrade（000012） | alpha1 | ATM-2-0015, ATM-2-0016, ATM-2-0017 | `upgrade-proposal.schema.json`、CLI `atm upgrade --propose --dry-run`。 |
| ATM-2-0021 | HumanReviewGate（000013） | alpha1 | ATM-2-0020, ATM-2-0008 | `.atm/reports/upgrade-proposals.json`、approve/reject schema、decision log。 |
| ATM-2-0022 | Rollback Registry Pointer & Proof | alpha1 | ATM-2-0014, ATM-2-0021 | `atm rollback --plan`、rollback proof、currentVersion pointer 更新規則。 |
| ATM-3-0014 | 3KLife UsageEvidence shadow adapter | alpha1 | ATM-3-0001, ATM-2-0009, ATM-2-0016 | 只讀 artifacts / compute-gate / logs，產 usage-feedback evidence，不改既有 CLI。 |
| ATM-4-0007 | H2U atom v1.0→v1.1 evolution pilot | alpha1 | ATM-4-0003, ATM-2-0020, ATM-2-0021 | 以 normalizeCssColor 做首次 upgrade proposal + human review dry-run。 |

---

## 5. 依賴關係與階段重排

### 5.1 alpha0 最短可驗證路徑

1. `ATM-2-0005`：Police + ValidateAtomicOutput + 最小 Regression check。
2. `ATM-2-0012`：neutralityScanner atom，使用 `atomic_workbench/atoms/<Atomic ID>/` canonical folder。
3. `ATM-2.5-0001`：self-host-alpha verify CLI。
4. `ATM-2.5-0002`：空白 sandbox repo 跑完整 alpha0 deterministic gate。

建議補依賴：`ATM-2.5-0001` 應明確依賴 `ATM-2-0007` 的最小 WorkItem / ScopeLock schema，或在 `ATM-2-0005` 驗收中明確說明 alpha0 governance evidence 來源。

### 5.2 alpha0 後、Adapter 前的核心原子補洞

Adapter 接入前應補齊核心 000001-000010 的缺口：

| 原子 | 狀態 / 任務 | 排序建議 |
|---|---|---|
| 000001 ParseAtomicSpec | ATM-2-0001 done | 不變動。 |
| 000002 GenerateAtomicScaffold | ATM-2-0002 done | 不變動。 |
| 000003 BuildAgentPrompt | 新卡 ATM-2-0018 | alpha0 pass 後優先補。 |
| 000004 ExecuteAgentTask | 新卡 ATM-2-0019 | 必須 dry-run / effect node。 |
| 000005 RunAtomicTest | ATM-2-0003 done | metrics 由 ATM-2-0016 follow-up。 |
| 000006 ValidateAtomicOutput | ATM-2-0005 open | alpha0 critical。 |
| 000007 ComputeAtomicHash | ATM-2-0004 done | diff report 由 ATM-2-0015 follow-up。 |
| 000008 UpdateAtomicRegistry | ATM-2-0004 done | versions[] 由 ATM-2-0014 follow-up。 |
| 000009 InjectAtomicIntoLegacy | ATM-4-0005 / ATM-3 adapter | alpha0 後，只允許 dry-run。 |
| 000010 RunRegressionMatrix | ATM-2-0005 + ATM-2-0017 | alpha0 最小不退轉，alpha1 品質比較。 |

### 5.3 alpha1 演化閉環

alpha1 的第一條完整演化鏈建議為：

`ATM-2-0014 → ATM-2-0015 → ATM-2-0016 → ATM-2-0017 → ATM-2-0020 → ATM-2-0021 → ATM-2-0022 → ATM-3-0014 → ATM-4-0007`

此鏈條刻意放在 alpha0 之後，避免演化能力反向阻塞空白 repo hello-world 自舉。

---
