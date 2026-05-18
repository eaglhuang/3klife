<!-- doc_id: doc_other_0229 -->
<!--
title: 3KLife ATM 採用三角策略規劃書（取代雙軌規劃書）
author: claude_code_sonnet4.6
revised_by: codex
created: 2026-05-18
revised: 2026-05-18
status: ready-for-task-execution
supersedes: 3KLife ATM 引導驗收與框架孵化雙軌規劃書
related:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/tasks/README.md
  - C:/Users/User/3KLife/README.md
  - C:/Users/User/3KLife/docs/keep.summary.md
  - C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md
  - C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
  - C:/Users/User/3klife-npc-brain/README.md
  - https://github.com/eaglhuang/3klife-npc-brain
-->

# 3KLife ATM 採用三角策略規劃書

## 0. 核心結論

本規劃書採用「三角策略」取代原本的雙軌規劃。它的目的不是讓 3KLife 從 ATM 開發中退場，而是避免把三種責任混在同一個 repo 裡驗收：

| 角色 | Repo | 職責 |
|---|---|---|
| ATM 上游真相來源 | AI-Atomic-Framework | 維護 official CLI、core、agent-pack、release、validator 與 adopter sentinel |
| ATM 研發試驗場 | 3KLife | 保留 local fork、客製治理、Cocos 與高複雜度實驗，產生可畢業的實驗證據 |
| official onboarding 驗收場 | 3klife-npc-brain | 驗證乾淨、非 Node monorepo、Python 服務型專案是否能採用 official ATM |

最重要的決策是：

1. 不清空 3KLife 的 `.atm/`、`.atm-temp/` 或 `tools_node/atomic-framework/`。
2. 不把 3KLife 當作 clean adopter 驗收場。
3. 不讓 npc-brain 使用 3KLife local fork 或非官方 patch。
4. 不另開第二套 adopter CI；必須擴充 AI-Atomic-Framework 既有 `adopter-sentinel`。
5. 不在 baseline freeze 前執行 M1 lab dry run。
6. 3KLife 的實驗成果必須透過去 3KLife 化、evidence 化、deterministic validator 化與 neutrality scan 才能 upstream。

本計畫目前已拆分成 `TASK-APO-0025` 到 `TASK-APO-0034`，任務卡位於 `docs/ai_atomic_framework/agent-pack-onboarding/tasks/`。

---

## 1. 最新狀態分析

### 1.1 已確認事實

| 項目 | 最新狀態 |
|---|---|
| npc-brain 本機 clone | `C:/Users/User/3klife-npc-brain` 存在 |
| npc-brain branch | `main` |
| 歷史觀測 commit | `030aff7f` |
| Codex 複核觀測 HEAD | `842a6a9d Refine primary text relationship types` |
| baseline freeze | 尚未完成 |
| ATM L1 污染 | 無 `.atm/`、無 `atm.mjs`、無 `tools_node/atomic-framework/` |
| ATM L2 shaped governance 污染 | 未發現 ATM-shaped artifacts |
| Host governance 軟性繼承 | README 仍有 3KLife `doc_id` 慣例與三國 / Cocos 語意 |
| 技術棧 | Python service，`requirements.txt`，FastAPI / LangGraph / Qdrant / Docker dev |
| 中文路徑 | 有 `文件/` 與中文檔名 |
| 風險最高項 | npc-brain main 持續前進，驗收 baseline 尚未凍結 |

### 1.2 必須補正的計畫問題

| 問題 | 補正方式 | 對應任務卡 |
|---|---|---|
| 修訂紀錄混在正文，讓計畫看起來像聊天紀錄 | 移除 0.1 / 0.2，把重要結論併入正式章節 | TASK-APO-0025 |
| baseline 仍未凍結，M1 若直接跑會失去可重現性 | M1 前必須先完成 branch / tag freeze | TASK-APO-0026 |
| eligibility evidence 不應放在 3KLife 或 upstream protected docs | 放在 npc-brain 驗收 branch 的 adopter-local docs | TASK-APO-0026 |
| lab dry run 沒有 evidence schema 與 command transcript 規格 | M1 建立 disposable lab runbook 與 evidence | TASK-APO-0027 |
| evidence triage 分類不足 | 新增 `host-governance-overlap` 與 upstream/adopter-local 分流 | TASK-APO-0028 |
| upstream blocker repair 可能變成專案特化 patch | 僅允許修 official ATM contract，不 hard-code npc-brain | TASK-APO-0029 |
| 持續驗收可能長出第二套 CI | 擴充 existing adopter sentinel，不新增 competing workflow | TASK-APO-0031 |
| 3KLife 實驗成果沒有畢業流程 | 建立 experiment graduation SOP | TASK-APO-0033 |

---

## 2. 與 ATM 引導工程計畫書的對齊

本計畫是 `ATM引導工程計畫書.md` 的 adopter 驗收與框架孵化執行分支，必須遵守以下原則：

- CLI 是權威，模板與 agent entry files 只負責導路。
- SSoT 單向渲染，ATMChart、entry files 與 manifest 必須可由 CLI 重建與驗證。
- Agent Pack 是產品語言，Integration Adapter 是實作語言。
- official onboarding 必須可選安裝、可強制驗證、可乾淨卸載。
- public ATM framework surface 必須 adopter-neutral，不可把 3KLife、npc-brain 或任何私有 repo 語意寫成官方契約。
- first-touch flow 必須能用 deterministic command 重新執行與產生 evidence。
- safe upgrade 必須先 plan、再 backup、再 apply、再 verify、最後才 rollback；不得在 tooling 未成熟前把 rollback 當早期 adoption 的硬阻塞條件。

---

## 3. Repo 角色定位

### 3.1 AI-Atomic-Framework：ATM 上游真相來源

路徑：`C:/Users/User/AI-Atomic-Framework`

職責：

- 維護 ATM CLI、core、agent-pack、adapter、release、validator 與 official onboarding。
- 接收 adopter evidence，修正 upstream bug。
- 接收 3KLife 實驗成果，但必須經過中立化與正式 review。
- 維持 public surface adopter-neutral。

禁止：

- 寫入 3KLife-specific 或 npc-brain-specific 邏輯。
- 為了單一 repo 便利破壞 official onboarding contract。
- 建立第二套與 `atm next --json`、ATMChart、InstallManifest 競爭的流程真相。

### 3.2 3KLife：ATM 研發試驗場

路徑：`C:/Users/User/3KLife`

定位：

- 保留現狀，不為了 clean adopter 驗收刪除 `.atm/`、`.atm-temp/` 或 `tools_node/atomic-framework/`。
- 允許自由實驗 governance policy、adapter、doctor diagnosis、encoding guard、context budget、Cocos / UI / task shard 場景。
- 不自稱 ATM upstream，不把 local fork 當 official release，不被引用為 clean adopter demo。

3KLife 可以繼續開發 ATM 框架相關能力，但所有成果進入 upstream 前必須經過 `TASK-APO-0033` 定義的畢業流程。

### 3.3 3klife-npc-brain：official onboarding 驗收場

remote repo：`https://github.com/eaglhuang/3klife-npc-brain`

本機 clone：`C:/Users/User/3klife-npc-brain`

定位：

- 候選 ATM 乾淨 adopter。
- 候選跨語言 adopter。
- 候選 official onboarding 驗收場。

允許：

- 跑 official ATM distribution。
- 產生 first-touch evidence。
- 作為 adopter-sentinel 的 external profile。

禁止：

- 安裝 3KLife local fork。
- 修改 `.atm/` 內 framework 檔案來讓驗收過關。
- 把 npc-brain 特化需求寫回 ATM protected public docs。
- 在高強度業務開發中的 `main` 直接 commit `.atm/`。

---

## 4. 乾淨 adopter 定義

npc-brain 的狀態顯示「乾淨 adopter」不能只用是否來自 3KLife 生態判斷，而要分層：

| 層級 | 判定條件 | npc-brain 現況 | 驗收結論 |
|---|---|---|---|
| L1 ATM 框架污染 | 是否含 `.atm/`、`atm.mjs`、`tools_node/atomic-framework/` | 未發現 | 必須乾淨，已通過 |
| L2 ATM-shaped 治理污染 | 是否已有 ATM-shaped governance bundle、scope lock、work item 等 | 未發現 | 必須乾淨，已通過 |
| L3 Host governance 軟性繼承 | 是否保留母專案 doc-id、domain terms、文件慣例 | README 有 3KLife `doc_id` 與三國 / Cocos 語意 | 可容忍，屬 adopter-local overlap |

判定原則：

- L1 / L2 不乾淨，不能當 official onboarding 驗收場。
- L3 可以容忍，因為真實 adopter 很可能已有自己的 governance 慣例。
- 若 ATM onboarding 要求刪除或覆蓋 L3 host 慣例，這是 ATM adopter-neutral bug。

---

## 5. 驗收邊界

### 5.1 npc-brain 驗收範圍

npc-brain 只回答：一個真實、低成本、非 TypeScript monorepo 的 Python 服務型 repo，能否順利採用 official ATM onboarding？

必測能力：

- `node atm.mjs bootstrap --json`
- `node atm.mjs atm-chart render --json`
- `node atm.mjs atm-chart verify --json`
- `node atm.mjs atm-chart verify --version-check`
- `node atm.mjs welcome --json`
- `node atm.mjs next --json`
- `node atm.mjs doctor --json`
- clean uninstall 或 remove flow 不破壞 host repo
- `.atm/` 不與 Python venv、`__pycache__`、Docker、中文路徑衝突
- ATM 能與 3KLife `doc_id` 這類 host-local 文件慣例共存

### 5.2 npc-brain 不驗收的範圍

npc-brain 不負責驗證：

- Cocos Creator workflow。
- 3KLife UI / asset pipeline。
- 3KLife 任務卡與 doc-id shard 系統。
- TypeScript monorepo 多 package 場景。
- 複雜 governance bundle 客製。
- 3KLife local fork 的相容性。

---

## 6. 里程碑與任務卡

| 里程碑 | 任務卡 | 名稱 | 狀態 | 完成定義 |
|---|---|---|---|---|
| M0 | TASK-APO-0025 | Plan normalization and task split | done | 本文件移除修訂紀錄、重整里程碑、建立 0025-0034 任務卡 |
| M1 | TASK-APO-0026 | npc-brain baseline freeze and eligibility | open | 固定 `atm-validation-base` branch/tag，完成 adopter eligibility report |
| M2 | TASK-APO-0027 | Disposable lab first-touch evidence | open | 在 `C:/tmp/npc-brain-atm-lab` 跑 official ATM first-touch 並產生 evidence |
| M3 | TASK-APO-0028 | Evidence triage and upstream routing | open | 將 M2 evidence 分成 blocker / P1 / P2 / adopter-local / host-governance-overlap |
| M4 | TASK-APO-0029 | Upstream blocker repair batch | open | 只修阻擋 onboarding 的 upstream bug，不 hard-code adopter |
| M5 | TASK-APO-0030 | Candidate official onboarding branch | open | 在 npc-brain candidate branch 產生可 review 的 `.atm` policy 與 verification |
| M6 | TASK-APO-0031 | Existing adopter sentinel integration | open | 擴充 existing `adopter-sentinel`，新增 synthetic Python 與 optional npc-brain profile |
| M7 | TASK-APO-0032 | Adopter evidence feedback SOP | open | 建立 evidence schema、issue labels、case-study / protected-doc 邊界 |
| M8 | TASK-APO-0033 | 3KLife experiment graduation SOP | open | 定義 3KLife 實驗成果如何中立化、驗證化後 upstream |
| M9 | TASK-APO-0034 | Release gate promotion | open | 在 sentinel 穩定後，將部分 adopter validation 升級為 release gate |

### 6.1 依賴圖

```text
TASK-APO-0025
  -> TASK-APO-0026
      -> TASK-APO-0027
          -> TASK-APO-0028
              -> TASK-APO-0029
                  -> TASK-APO-0030
                      -> TASK-APO-0031
                          -> TASK-APO-0034

TASK-APO-0028 -> TASK-APO-0032
TASK-APO-0025 -> TASK-APO-0033
TASK-APO-0033 -> TASK-APO-0029
```

### 6.2 執行節奏

第一輪只做 M1-M3，目標是取得乾淨 evidence，不急著改 upstream：

1. freeze baseline。
2. 建 eligibility report。
3. 在 disposable lab 跑 first-touch。
4. triage evidence。

第二輪才做 M4-M6，目標是讓 upstream 修補與 sentinel 接住 evidence。

第三輪做 M7-M9，目標是建立長期 SOP 與 release gate。

---

## 7. 風險登記簿

| 風險 | 機率 | 衝擊 | 緩解 | 任務卡 |
|---|---|---|---|---|
| npc-brain main 快速前進，baseline 飄移 | 高 | 高 | M1 前 freeze branch/tag；所有 evidence 標明 baseline commit | TASK-APO-0026 |
| private repo 導致 CI 不穩 | 高 | 中 | external profile advisory，缺 secret 時 skip；PR-blocking 只用 synthetic fixture | TASK-APO-0031 |
| Python adopter 抗拒 Node | 低到中 | 中 | eligibility report 寫清 Node requirement；必要時評估 onefile/root-drop | TASK-APO-0026 |
| M2 發現大量 upstream bug | 中 | 中 | triage 分級，Blocker 先修，P2 轉 known limitation | TASK-APO-0028 |
| `.atm/` 與 venv / Docker / 中文路徑衝突 | 中 | 高 | lab evidence 必測；必要時補 doctor warning，不 hard-code npc-brain | TASK-APO-0027 |
| L3 host governance 被誤判為污染 | 中 | 中 | 新增 `host-governance-overlap` 分類，禁止覆蓋 adopter-local 慣例 | TASK-APO-0028 |
| CI 形成第二套真相 | 中 | 高 | 擴充 existing `adopter-sentinel`，不新增 competing workflow | TASK-APO-0031 |
| 3KLife 實驗長期無法 upstream | 中 | 高 | 建立 graduation SOP 與 neutralization checklist | TASK-APO-0033 |
| 過早要求 rollback 造成假性阻塞 | 中 | 中 | M5 只要求 `upgrade plan`，rollback 延到 M9 release gate | TASK-APO-0034 |

---

## 8. 驗證 Checklist

### 8.1 M1 baseline freeze

- `atm-validation-base` branch 或 tag 存在。
- eligibility report 記錄 exact commit、L1/L2/L3 判定、host stack、Node requirement。
- M1 之後任何 evidence 不使用 moving `main`。

### 8.2 M2 lab first-touch

- lab 路徑可重建。
- official ATM 不依賴 3KLife local fork。
- bootstrap、render、welcome、next、doctor、verify 皆有 exit code 與 output transcript。
- 中文路徑與 UTF-8 檔名沒有 mojibake。
- host-local `doc_id` 不被 ATM 覆蓋。

### 8.3 M6 sentinel

- existing sentinel 仍可跑。
- synthetic Python fixture 無 private secret 也能跑。
- external npc-brain 缺 secret 時 skip，不 false fail。
- scheduled/advisory failure 能產生 issue 或 summary。

### 8.4 M9 release gate

- release gate 不依賴 private repo 必然可用。
- `upgrade plan` 不寫檔。
- `upgrade apply` 需 explicit plan。
- rollback 只在 tooling fixture 成熟後升級為 gate。

---

## 9. 開放決策

| 決策 | 預設建議 | 決策時機 | 任務卡 |
|---|---|---|---|
| baseline commit 用目前 HEAD 還是 owner 指定 commit | owner 指定優先；若無指定，使用 freeze 當下 HEAD | M1 | TASK-APO-0026 |
| npc-brain 是否等完全脫離 3KLife 後再跑 M2 | 不等，先跑 pre-decoupling baseline，脫離後重跑 | M1 | TASK-APO-0027 |
| `.atm/` 哪些檔案 commit 到 npc-brain candidate branch | ATMChart / manifest 可 commit；runtime/cache 不 commit | M5 | TASK-APO-0030 |
| external npc-brain sentinel 是否 release-blocking | 初期 advisory，穩定後才升級 | M9 | TASK-APO-0034 |
| 3KLife 第一批可畢業實驗 | encoding guard / context budget / doctor diagnosis 優先 | M8 | TASK-APO-0033 |

---

## 10. 立即下一步

1. 執行 `TASK-APO-0026`：決定 baseline commit，建立 `atm-validation-base` branch/tag，撰寫 `docs/atm-adoption/ADOPTER_ELIGIBILITY.md`。
2. 執行 `TASK-APO-0027`：建立 disposable lab 並跑 first-touch evidence。
3. 執行 `TASK-APO-0028`：把 evidence 分級，產出 upstream issue / known limitation / adopter-local notes。

明確暫緩：

- 不刪除 3KLife `.atm/`。
- 不刪除 3KLife `.atm-temp/`。
- 不停用 3KLife `tools_node/atomic-framework/`。
- 不直接把 `.atm/` commit 進 npc-brain `main`。
- 不新增第二套 adopter validation workflow。
- 不把 rollback 當 M5 硬阻塞。

---

## 11. 成功定義

本計畫成功時，應同時滿足：

1. 3KLife 保留 ATM 研發試驗場能力，未被 clean adopter 驗收破壞。
2. npc-brain 或 synthetic Python fixture 能提供真實 first-touch evidence。
3. AI-Atomic-Framework 的 official onboarding bug 能被 evidence 驅動修補。
4. adopter-sentinel 成為持續驗收入口，而不是旁生第二套 CI。
5. 3KLife 實驗成果有明確畢業路徑。
6. ATM public surface 仍保持 adopter-neutral。
7. clean uninstall、version compatibility、rule freshness 與 next action route 都有 deterministic 驗證。

---

## 12. 參考資料

- ATM 引導工程計畫書：`C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md`
- ATM 引導工程 task cards：`C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/tasks/README.md`
- 3KLife README：`C:/Users/User/3KLife/README.md`
- 3KLife keep.summary：`C:/Users/User/3KLife/docs/keep.summary.md`
- ATM upstream onboarding 文件：`C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md`
- ATM upstream adopter sentinel：`C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts`
- ATM upstream adopter sentinel workflow：`C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml`
- ATM long-tail safeguards：`C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md`
- npc-brain remote repo：`https://github.com/eaglhuang/3klife-npc-brain`
- npc-brain 本機 clone：`C:/Users/User/3klife-npc-brain`
- npc-brain README：`C:/Users/User/3klife-npc-brain/README.md`