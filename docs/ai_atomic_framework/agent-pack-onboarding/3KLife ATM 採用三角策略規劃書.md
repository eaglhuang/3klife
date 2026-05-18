<!-- doc_id: doc_other_0229 -->
<!--
title: 3KLife ATM 採用三角策略規劃書（取代雙軌規劃書）
author: claude_code_sonnet4.6
revised_by:
  - codex
  - claude_code_opus4.7
  - codex-review
created: 2026-05-18
revised: 2026-05-18
status: proposed-revised
supersedes: 3KLife ATM 引導驗收與框架孵化雙軌規劃書
related:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
  - C:/Users/User/3KLife/README.md
  - C:/Users/User/3KLife/docs/keep.summary.md
  - C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md
  - C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
  - C:/Users/User/3klife-npc-brain/README.md
  - https://github.com/eaglhuang/3klife-npc-brain
-->

# 3KLife ATM 採用三角策略規劃書

## 0. 本版核心結論

本規劃書採用「三角策略」取代原本的雙軌規劃。核心判斷如下：

1. 3KLife 不應被清空成乾淨 adopter。它是 ATM 生成過程中的母專案、研發試驗場與高複雜度治理樣本，強行刪除 `.atm/`、`.atm-temp/` 或 `tools_node/atomic-framework/` 會損失研發脈絡。
2. ATM official onboarding 仍然需要乾淨 adopter 驗收場。這個角色不適合由 3KLife 擔任，應由另一個低成本、真實、未被 ATM 歷史污染的 repo 承接。
3. `eaglhuang/3klife-npc-brain` 已被確認可作為候選驗收場，但 main branch 仍在快速前進，因此不能把任一時刻的 `main` HEAD 當成驗收 baseline；必須先完成 M0 baseline freeze。
4. AI-Atomic-Framework 仍是唯一 ATM upstream truth source。所有修補必須回到 upstream，不得在 npc-brain 或 3KLife 私下維護非官方 patch。
5. 持續驗收不應另建第二套 CI 真相。AI-Atomic-Framework 已有 `scripts/adopter-sentinel.ts` 與 `.github/workflows/adopter-sentinel.yml`，npc-brain 驗收應擴充既有 sentinel，而不是新增互相競爭的 workflow。
6. 3KLife 仍然可以繼續開發 ATM 框架相關能力，但定位是「實驗孵化」。任何成果要回 upstream，必須經過去 3KLife 化、evidence 化、deterministic validator 化與 neutrality scan。

本計畫的精神不是把 3KLife 排除在 ATM 開發之外，而是把兩件事分清楚：

```text
測試 ATM first-touch official onboarding -> 使用乾淨 adopter
開發與孵化 ATM 複雜治理能力 -> 保留 3KLife 試驗場
```

這兩個目標可以併行，但不應由同一個 repo 同時承擔。

---

## 0.1 本版修訂紀錄（claude_code_opus4.7 / 2026-05-18）

本版補入下列新事實，並據此修正若干假設：

1. npc-brain 已 clone 到本機路徑 `C:/Users/User/3klife-npc-brain`，branch `main`，當時觀測 commit `030aff7f`。
2. 經實際檢查，npc-brain 確認無 `.atm/`、無 `atm.mjs`、無 `tools_node/atomic-framework/`，符合 ATM 乾淨 adopter 的硬性條件。
3. 但 README 仍使用 3KLife `doc_id` 慣例（首行 `<!-- doc_id: doc_server_service_0001 -->`），代表 npc-brain 雖然在 ATM 層面乾淨，卻仍有 3KLife governance 軟性繼承痕跡。這是「乾淨 adopter」定義必須補的灰色地帶。
4. 實際大小 7.6 MB，不是原本估計的 1.6 MB。整體仍小，但已超過 GitHub raw API report 的數字（可能是含 git history 與 data 目錄差異）。
5. npc-brain 處於高強度開發：近期 commit 包含 Sanguo governance、PostgreSQL migration、vector rollout、relationship type refinement。R1 風險（驗收基線飄移）確定為「高」而非中。
6. npc-brain 正在脫離 3KLife（owner 已宣告），但 README 仍提「三國章回、Cocos / Dev Toolbar、玩家-武將互動」，脫離工作尚未完成。

上述新事實已寫入 §3.3、§4.4、§6 M0、§7.1、§9 R1/R10 與 §11。

---

## 0.2 Codex 複核補正（2026-05-18）

本次重新讀取最新版文件並核對磁碟狀態後，發現下列需要補正的地方：

1. **baseline 仍未真正凍結**
   文件先前記錄的 npc-brain commit `030aff7f` 已不是本機 `main` 最新 HEAD；重新核對時 HEAD 已前進到 `842a6a9d`。這不是單純文字錯誤，而是證明 R1「驗收基線飄移」已經發生。後續文件不得再使用「最新 commit」描述 baseline，只能使用「觀測 commit」或「已凍結 baseline commit」。

2. **M0 應新增 hard gate：baseline freeze before M1**
   在 `atm-validation-base` branch 或等價 tag 尚未建立前，不得進入 M1 disposable lab dry run。否則 M1 evidence 會追著 main 變動跑，失去可重現性。

3. **`ADOPTER_ELIGIBILITY.md` 應明確放在 npc-brain 驗收 branch**
   這份 eligibility report 是 adopter-side evidence，不應寫回 AI-Atomic-Framework protected docs，也不應放在 3KLife 主遊戲 repo 內。建議路徑為 npc-brain 的 `docs/atm-adoption/ADOPTER_ELIGIBILITY.md`，或同等 adopter-local 文件位置。

4. **doc-id registry 路徑必須對齊實際檔名**
   `doc_other_0229` 的 registry entry 必須指向本檔實際路徑 `docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md`，不能指向暫名 `plan.md`。否則 doc-id resolver 會產生 dangling path。

5. **提交範圍必須隔離**
   本規劃書與其 doc-id registry entry 可同一 commit；其他已存在的工作樹修改（例如 agent identity 偵測）若非本計畫直接產物，不應混入同一 commit。

---

## 1. 與 ATM 引導工程計畫書的對齊

本規劃書以 `ATM引導工程計畫書.md` 為核心依據，特別對齊以下原則：

- CLI 是權威，模板與 agent entry files 只負責導路。
- SSoT 單向渲染，ATMChart、entry files 與 manifest 必須可由 CLI 重建與驗證。
- Agent Pack 是產品語言，Integration Adapter 是實作語言。
- official onboarding 必須可選安裝、可強制驗證、可乾淨卸載。
- public ATM framework surface 必須 adopter-neutral，不可把 3KLife、npc-brain 或任何私有 repo 語意寫成官方契約。
- first-touch flow 必須能用 deterministic command 重新執行與產生 evidence。
- safe upgrade 必須先 plan、再 backup、再 apply、再 verify、最後才 rollback；不得在工具尚未成熟前把 rollback 當成早期 adoption 的硬阻塞條件。

因此，本規劃書不是要把 3KLife 特化流程搬進 ATM，而是建立一個三角工作法：

```text
AI-Atomic-Framework -> 上游真相來源
3KLife -> 研發試驗場
3klife-npc-brain -> official onboarding 驗收場候選
```

---

## 2. 為什麼換掉雙軌規劃書

原雙軌規劃書嘗試讓 3KLife 同時扮演「ATM 研發試驗場」與「ATM 正式 adopter 驗收場」。這會遇到三個根本矛盾：

1. 驗收純度不足
   3KLife 已含 `tools_node/atomic-framework/` 的本地 fork、客製 `.atm/`、adapter、registry 與歷史 governance 資產。它不是乾淨 adopter。若先清乾淨才能驗收，就等於破壞研發試驗場。

2. 驗收前提依賴尚未完成的框架能力
   原計畫要求 `atm doctor` 能辨識 adopter vs upstream、能妥善處理各種歷史污染狀態。但這種診斷能力本身就是 ATM 需要演進的功能，不能反過來作為第一輪 official onboarding 的前置條件。

3. 客製資產處理沒有安全答案
   3KLife 的 `.atm/compatibility-matrix.json`、`encoding-guard-profile.json`、`context-budget-policy.json`、`encoding-guard-validator.js` 等資產，有些是實驗成果，有些是歷史相容層。若 official onboarding 直接覆蓋，會破壞研究資料；若全數保留，又無法驗收乾淨採用。

三角策略的解法是：不要在 3KLife 身上同時測「乾淨採用」與「框架研發」。3KLife 保留實驗自由，乾淨採用另找驗收場。

---

## 3. Repo 角色定位

### 3.1 AI-Atomic-Framework：ATM 上游真相來源

路徑：

```text
C:/Users/User/AI-Atomic-Framework
```

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

路徑：

```text
C:/Users/User/3KLife
```

狀態：

- 保留現狀。
- 不為了 clean adopter 驗收刪除 `.atm/`、`.atm-temp/` 或 `tools_node/atomic-framework/`。
- 不在本計畫第一階段重新跑 official onboarding。

保留：

- `tools_node/atomic-framework/`
- `tools_node/adapters/atm-3klife/`
- 客製 `.atm/`
- `atomic_workbench/`
- `atomic-registry.json`
- 既有任務卡、doc-id、encoding guard、context budget、Cocos workflow 等治理經驗

允許：

- 自由實驗 governance policy。
- 測試高複雜度 Cocos / UI / task shard / doc registry 場景。
- 孵化 adapter、validator、doctor diagnosis、context budget、encoding guard 等能力。

禁止：

- 自稱 ATM upstream。
- 把 3KLife local fork 當成 official ATM release。
- 被引用為 clean adopter demo。
- 直接把 3KLife 私有流程 hard-code 到 AI-Atomic-Framework。

### 3.3 3klife-npc-brain：official onboarding 驗收場候選

remote repo：

```text
https://github.com/eaglhuang/3klife-npc-brain
```

本機 clone：

```text
C:/Users/User/3klife-npc-brain
```

baseline 觀測（2026-05-18 由 claude_code_opus4.7 與 codex-review 確認）：

- branch: `main`
- historical observed commit: `030aff7f Merge branch 'main' of https://github.com/eaglhuang/3klife-npc-brain`
- codex-review observed HEAD: `842a6a9d Refine primary text relationship types`
- baseline status: **尚未凍結**；`030aff7f` 與 `842a6a9d` 都只能視為觀測點，不能視為 official ATM adoption baseline，直到 `atm-validation-base` branch 或 tag 建立為止
- size: 7.6 MB（不是原本估計的 1.6 MB）
- stack: Python（無 `package.json` / `pyproject.toml` / `setup.py`，僅 `requirements.txt`），FastAPI、LangGraph、Qdrant、Docker dev
- 中文路徑：`文件/` 目錄、`說明文件拆分規劃.md`
- ATM 污染：無 `.atm/`、無 `atm.mjs`、無 `tools_node/atomic-framework/` —— **ATM 層面確認乾淨**
- 但 3KLife governance 軟性繼承：README 首行 `<!-- doc_id: doc_server_service_0001 -->` 為 3KLife doc-id-registry 慣例
- 脫離 3KLife 進度：owner 宣告正在獨立化，但 README 仍包含「三國章回、玩家、Cocos / Dev Toolbar、Smoke Tests」等 3KLife 語意 —— 脫離未完成
- 開發活躍度：高（近期 commit 包含 Sanguo governance、PostgreSQL migration、vector rollout、relationship refinement）

定位：

- 候選 ATM 乾淨 adopter（硬條件已通過）。
- 候選跨語言 adopter（Python 服務型，非 Node monorepo）。
- 候選 official onboarding 驗收場。

允許：

- 跑官方 ATM distribution。
- 產生 first-touch evidence。
- 作為 adopter-sentinel 的外部驗收 profile。

禁止：

- 安裝 3KLife local fork。
- 修改 `.atm/` 內 framework 檔案來讓驗收過關。
- 把 npc-brain 特化需求寫回 ATM protected public docs。
- 在 npc-brain 持續高強度業務開發中直接 commit `.atm/` 進 main（容易引發合併衝突）。

---

## 4. 驗收邊界

### 4.1 npc-brain 驗收範圍

npc-brain 驗收只回答一個問題：

```text
一個真實、低成本、非 TypeScript monorepo 的乾淨專案，能否順利採用 official ATM onboarding？
```

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

### 4.2 npc-brain 不驗收的範圍

npc-brain 不負責驗證：

- Cocos Creator workflow。
- 3KLife UI / asset pipeline。
- 3KLife 任務卡與 doc-id shard 系統。
- TypeScript monorepo 多 package 場景。
- 複雜 governance bundle 客製。
- 3KLife local fork 的相容性。

這些仍由 3KLife 試驗場或 AI-Atomic-Framework 自我驗證負責。

### 4.3 3KLife 是否仍能開發 ATM

可以，而且應該保留這個角色。

但需要分清：

```text
3KLife 裡的 ATM 能力 -> experimental evidence
AI-Atomic-Framework 裡的 ATM 能力 -> official contract
```

3KLife 可以繼續產生 ATM 相關能力，但不能直接等同 upstream。它必須透過 M7 的實驗畢業流程回到 AI-Atomic-Framework。

### 4.4 「乾淨 adopter」的定義邊界（本版新增）

npc-brain 的觀察讓我們必須補一個過去沒寫清楚的定義：什麼叫「乾淨 adopter」？

採三層判定：

| 層級 | 判定條件 | npc-brain 現況 |
|------|---------|--------------|
| L1 ATM 框架污染 | 是否含 `.atm/`、`atm.mjs`、`tools_node/atomic-framework/` 等 ATM 官方檔案或私有 fork | ✅ 乾淨 |
| L2 ATM-shaped 治理污染 | 是否含 governance bundle、scope lock、work item 等 ATM-shaped artifacts | ✅ 乾淨 |
| L3 Host 母專案 governance 軟性繼承 | 是否使用 host 母專案的 doc-id、registry、encoding guard、task shard 等慣例 | ⚠️ 部分繼承（README 用 3KLife doc_id 慣例） |

**判定原則：**

- L1 必須乾淨：official onboarding 不能跑在已有 ATM 痕跡的 repo 上。
- L2 必須乾淨：避免 ATM-shaped 雙真相。
- L3 可以容忍：host 母專案的 governance 慣例屬於 adopter-local，ATM onboarding 應該能在「上面已有其他 governance 慣例」的 repo 共存。若不能，這本身就是 ATM 設計缺陷。

**換句話說：**

- npc-brain L1 + L2 乾淨 → 適合作為驗收場。
- npc-brain L3 殘留 3KLife doc-id 慣例 → 是「ATM 必須 adopter-neutral」的好測試案例，不是 disqualifier。
- 若 ATM onboarding 把 3KLife `doc_id` 慣例覆蓋或要求 npc-brain 改文件首行才能 onboarding，那是 ATM 違反 adopter-neutral 原則的 bug。

---

## 5. 優先序總覽

### P0：先確立安全邊界

- 不清空 3KLife。
- 不重灌 3KLife。
- 不把 3KLife 當 clean adopter。
- 不新增第二套 adopter CI。
- 不把 rollback 當早期驗收硬門檻。

### P1：先驗證 npc-brain 是否真的適合

- M0 資格確認。
- M1 lab first-touch dry run。
- M2 evidence triage。

### P2：修上游，不修 adopter 假象

- M3 upstream blocker repair。
- M4 candidate official onboarding branch。

### P3：建立持續驗收與回流

- M5 擴充 adopter sentinel。
- M6 evidence 回流 SOP。

### P4：讓 3KLife 研發成果可畢業

- M7 3KLife experiment graduation SOP。
- M8 release gate promotion。

---

## 6. 里程碑

### M0：Adopter Qualification Gate

目的：

確認 npc-brain 是否真的適合當 official onboarding 驗收場。

**進度狀態（claude_code_opus4.7 / 2026-05-18）：部分完成**

| 子任務 | 狀態 | 結果 |
|--------|------|------|
| 確認 repo access | ✅ | clone 到 `C:/Users/User/3klife-npc-brain` |
| 釘定 baseline commit hash | ❌ | 尚未完成。先前觀測 `030aff7f`，重查時 `main` 已前進到 `842a6a9d`，證明不能把 moving HEAD 當 baseline |
| 檢查 `.atm/` / `atm.mjs` / ATM wrapper / 3KLife local fork | ✅ | 全部缺席，L1+L2 乾淨 |
| 檢查技術棧 / 大小 / 中文路徑 | ✅ | Python + FastAPI + LangGraph + Qdrant，7.6 MB，含 `文件/` 中文目錄 |
| 檢查 3KLife governance 軟性繼承（L3） | ✅ | README 用 3KLife doc_id 慣例，符合 §4.4 容忍範圍 |
| 確認 owner 同意使用為驗收場 | ✅ | owner 已宣告 |
| 確認 npc-brain 脫離 3KLife 完成度 | ❌ | README 仍引用 3KLife 語意（三國章回、Cocos、玩家-武將）；脫離工作進行中 |
| 評估高活躍開發對驗收基線的影響 | ❌ | 近期 commit 顯示 PostgreSQL migration、vector rollout 等大改正在進行 |

剩餘動作（M0 殘留）：

- **立即決定 baseline commit**：建議以目前重查的 `842a6a9d` 或 owner 明確指定的 commit 為準；決定後開 `atm-validation-base` branch 並 push 到 remote（避免 main 持續 push 造成驗收基線飄移）。
- 在 `atm-validation-base` 建立前，**不得啟動 M1**。M1 只能跑在 branch / tag / exact commit 上，不能跑在 moving `main`。
- 詢問 owner 預計何時完成 npc-brain 脫離 3KLife（影響 R10 評估）。
- 評估是否需要等脫離完成後再做 M1，或先在當前 baseline 做一次 dry run 蒐集 evidence。
- 撰寫 `ADOPTER_ELIGIBILITY.md`，明確記錄上表的判定結果；建議放在 npc-brain `docs/atm-adoption/ADOPTER_ELIGIBILITY.md`，不要放進 AI-Atomic-Framework protected docs 或 3KLife 主遊戲 repo。

輸出：

```text
docs/atm-adoption/ADOPTER_ELIGIBILITY.md
atm-validation-base branch（推回 remote）
```

通過條件：

- repo 可取得 ✅
- baseline commit 固定（branch fork 或 tag），且 M1 不使用 moving main
- L1+L2 ATM 污染為零 ✅
- L3 host governance 軟性繼承在 §4.4 容忍範圍 ✅
- 可在 disposable lab 中重複 clone / reset

失敗處理：

- 若 npc-brain 脫離 3KLife 工作將大幅改變結構（例如重排 `app/` 目錄、改 doc-id 系統），M1 dry run 結果可能無法重複，應暫緩 M1，改用 synthetic Python adopter fixture。
- 不因 M0 失敗而回頭清空 3KLife。

預估工期：

```text
原 0.5 天；目前已用約 0.2 天，剩餘 0.3 天用於 baseline freeze + ADOPTER_ELIGIBILITY.md 撰寫
```

### M1：Disposable Lab First-Touch

目的：

在不污染 npc-brain 正式 repo 的情況下，測試 official ATM first-touch。

建議 lab 路徑：

```text
C:/tmp/npc-brain-atm-lab
```

動作：

- clone M0 釘定 commit。
- 使用 AI-Atomic-Framework 的官方 ATM distribution 或 root-drop。
- 執行 bootstrap、atm-chart render、welcome、next、doctor、verify。
- 記錄所有 stdout、stderr、exit code、寫入檔案、摩擦點。

建議命令：

```bash
node atm.mjs bootstrap --json
node atm.mjs atm-chart render --json
node atm.mjs welcome --json
node atm.mjs next --json
node atm.mjs atm-chart verify --json
node atm.mjs atm-chart verify --version-check
node atm.mjs doctor --json
```

輸出：

```text
evidence/YYYY-MM-DD-npc-brain-first-touch.md
```

通過條件：

- first-touch 可重複執行。
- 失敗點可被歸類，不是模糊手動修補。
- 不需使用 3KLife local fork。

預估工期：

```text
1 天
```

### M2：Evidence Triage

目的：

把 M1 發現的問題分類，避免一遇到問題就亂修。

分類：

- Blocker：乾淨 repo 無法完成 official onboarding。
- P1：onboarding 可完成，但 doctor、verify 或 welcome 有錯誤或誤判。
- P2：體驗差，但不阻擋 adoption。
- Adopter-local：只與 npc-brain 設定有關，不應改 ATM core。
- Out-of-scope：屬於 Cocos、3KLife 或複雜治理場景。

輸出：

```text
upstream issue list
known limitations
M3 blocker repair list
```

通過條件：

- 每個問題都有 owner、嚴重度、重現命令與預期結果。
- Blocker 與 adopter-local 問題分清楚。

預估工期：

```text
1 天
```

### M3：Upstream Blocker Repair

目的：

只修阻擋 official onboarding 的 upstream 問題。

可修範圍：

- AI-Atomic-Framework CLI。
- `atm welcome`。
- `atm next --json`。
- `atm-chart render / verify`。
- `doctor` diagnostics。
- root-drop / create-atm distribution。
- adopter-sentinel fixture。

禁止：

- 為 npc-brain hard-code。
- 為 3KLife hard-code。
- 在 adopter repo 私下 patch official ATM。

輸出：

```text
AI-Atomic-Framework issue / PR
updated validator
updated evidence
release candidate or fixed commit
```

通過條件：

- M1 的 Blocker 已修正或降級為 known limitation。
- 修補通過 AI-Atomic-Framework 既有 validation profile。

預估工期：

```text
2 到 5 天，依 evidence 量調整
```

### M4：Candidate Official Onboarding Branch

目的：

在 npc-brain 建立 official onboarding 候選分支，但不急著 merge main。

建議 branch：

```text
atm-validation-base
```

動作：

- 從 M0 baseline commit 建 branch。
- 使用 M3 修補後的 official ATM。
- 執行 official onboarding。
- 產生 `VERIFICATION.md`。
- 決定 `.atm/` commit policy。

`.atm/` commit policy 建議：

- `.atm/memory/atm-chart.md` 可 commit，作為 agent 可讀規則摘要。
- `.atm/agent-pack/*.manifest.json` 可 commit，作為 freshness evidence。
- `.atm/runtime/*` 原則上不 commit，除非是明確需要保留的 adoption lineage。
- cache、temp、machine-local path、timestamp-heavy evidence 不 commit。

驗收命令：

```bash
node atm.mjs welcome --json
node atm.mjs next --json
node atm.mjs atm-chart verify --json
node atm.mjs atm-chart verify --version-check
node atm.mjs doctor --json
node atm.mjs upgrade plan --json
```

注意：

- `upgrade plan` 可列為 M4 檢查。
- `upgrade apply` 與 `upgrade rollback` 不作為 M4 硬阻塞，延後到 M8 或 migration tooling 成熟後再升級為 release gate。

輸出：

```text
atm-validation-base branch
VERIFICATION.md
.atm commit policy
candidate baseline commit
```

預估工期：

```text
1 天
```

### M5：Adopter Sentinel Integration

目的：

把 npc-brain 驗收納入 AI-Atomic-Framework 的既有 adopter sentinel，而不是新增第二套 CI 真相。

既有基礎：

```text
C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml
```

建議作法：

- 新增 synthetic Python adopter fixture，作為公開、可重現、PR-blocking 的最低驗收。
- 新增 optional external npc-brain profile，需 repo access 或 GitHub secret。
- private repo 不可用時，external profile 應 skip，不應讓所有 upstream PR 無條件失敗。
- 初期 external npc-brain profile 採 advisory 或 scheduled 模式。
- 穩定多輪後，再考慮升級為 release-blocking。

輸出：

```text
updated scripts/adopter-sentinel.ts
updated adopter-sentinel workflow if needed
sentinel evidence summary
```

通過條件：

- synthetic fixture 可在 PR 上穩定通過。
- external npc-brain 缺少 secret 時能清楚 skip。
- 失敗時能開 issue 或產生可追溯 evidence。

預估工期：

```text
1 到 2 天
```

### M6：Evidence Feedback SOP

目的：

讓 adopter 驗收失敗能以固定格式回流 upstream，而不是散落在聊天紀錄或人工筆記。

Evidence 欄位建議：

```yaml
schemaVersion: atm.adopterEvidence.v0.1
adopterProfile: npc-brain
repoVisibility: private-or-public
targetCommit: <commit>
frameworkCommit: <commit>
atmVersion: <version>
os: <os>
nodeVersion: <version>
hostStack: python-service
command: <command>
exitCode: <code>
expected: <summary>
actual: <summary>
writes: []
severity: blocker-or-warning
classification: upstream-or-adopter-local-or-out-of-scope
neutralityRisk: low-or-medium-or-high
```

Label 建議：

- `adopter-sentinel`
- `adopter-evidence`
- `first-touch`
- `python-adopter`
- `onboarding-regression`

注意：

- upstream protected docs 不應依賴 npc-brain 專有語意。
- 若需要保留 npc-brain 名稱，應放在 adopter case study、issue、internal planning doc 或外部驗收記錄，不寫入 ATM public contract。

輸出：

```text
docs/adopter-evidence-sop.md 或等價 runbook
issue template
evidence example
```

預估工期：

```text
0.5 到 1 天
```

### M7：3KLife Experiment Graduation SOP

目的：

定義 3KLife 的 ATM 實驗成果如何安全畢業到 AI-Atomic-Framework。

畢業流程：

```text
3KLife 實驗
-> evidence 穩定
-> 去 3KLife 化
-> upstream RFC
-> AI-Atomic-Framework 實作
-> synthetic fixture 驗證
-> npc-brain adopter sentinel 驗證
-> release note
```

畢業門檻：

- 不包含 3KLife 專用路徑。
- 不依賴 Cocos Creator。
- 不依賴 3KLife task shard 或 doc-id registry。
- 可用 ATM CLI contract 表達。
- 有 deterministic validator。
- 有 migration 或 compatibility 說明。
- 通過 neutrality scan。

可畢業案例：

- encoding guard 的通用化。
- context budget policy 的通用化。
- adopter-local workbench localization。
- doctor 對歷史 ATM 污染狀態的診斷。
- governance bundle 與 host task system 的中立 mapping。

不可直接畢業案例：

- 3KLife UI pipeline 特定流程。
- Cocos Editor workflow。
- 3KLife 專用任務卡欄位。
- 只適用於遊戲規格文件的 doc shard 規則。

輸出：

```text
3KLife experiment graduation SOP
upstream RFC template
neutralization checklist
```

預估工期：

```text
1 天
```

### M8：Release Gate Promotion

目的：

等 M5 sentinel 穩定後，再把外部 adopter 驗收提升為 release gate。

前置條件：

- synthetic Python fixture 已穩定通過。
- npc-brain external profile 已連續多輪成功。
- private repo access / secret / skip policy 穩定。
- upgrade apply / rollback tooling 已有足夠 fixture 證明。
- known limitations 不含 release blocker。

升級內容：

- release 前必跑 synthetic adopter sentinel。
- external npc-brain profile 可視成熟度成為 release-blocking。
- rollback test 從 optional 變成 release gate。
- deprecation / long-tail compatibility evidence 納入 release checklist。

輸出：

```text
release gate policy update
sentinel stability report
rollback fixture evidence
```

預估工期：

```text
延後執行，不納入第一輪 adoption 工期
```

---

## 7. 驗收 Checklist

### 7.1 M1 Lab 驗收

必須證明：

- 可在 disposable lab 重複 clone / reset。
- official ATM 不依賴 3KLife local fork。
- bootstrap、render、welcome、next、doctor 至少能產生 deterministic result。
- 失敗時有清楚 exit code 與 evidence。
- 中文路徑與 UTF-8 檔名不造成 mojibake 或 crash。
- 即使 host repo 已有 3KLife `doc_id` 慣例（如 npc-brain README 首行 `<!-- doc_id: doc_server_service_0001 -->`），ATM onboarding 仍能 adopter-neutral 共存，不要求覆蓋、不要求刪除（驗證 §4.4 L3 容忍原則）。
- 在沒有 `package.json` / `pyproject.toml` 的純 Python repo（僅 `requirements.txt`）下，`atm doctor` 能正確識別 host stack 而不誤判為 missing manifest。

### 7.2 M4 Candidate Branch 驗收

必須證明：

- `welcome --json` 回傳可讀 orientation。
- `next --json` 回傳可執行 next action。
- `atm-chart verify --json` 通過 freshness check。
- `atm-chart verify --version-check` 通過 compatibility check，或清楚指出 unsupported / deprecated 原因。
- `doctor --json` 回傳 `ok: true`，或只剩明確標記的 known limitation。
- `.atm/` commit policy 已決定。
- clean uninstall 或 remove flow 不破壞 host repo。

### 7.3 M5 Sentinel 驗收

必須證明：

- existing adopter sentinel 仍可執行。
- synthetic Python fixture 可在無 private secret 的情況下運作。
- external npc-brain profile 缺少 secret 時會 skip，而不是 false failure。
- 失敗 evidence 能回到 upstream issue 或 summary。

### 7.4 M8 Release Gate 驗收

必須證明：

- upgrade plan 不寫檔。
- upgrade apply 需要 explicit plan。
- rollback 使用實際 backup id。
- user-modified files 不被 silent overwrite。
- supported / deprecated / unsupported / unknown 四種 version lag 狀態都有 deterministic test。

---

## 8. 與雙軌規劃書的差異

### 雙軌規劃書問題

- 讓 3KLife 同時當試驗場與 clean adopter。
- 要求先處理 3KLife 歷史污染，才可以驗收 official onboarding。
- 容易誘導刪除或重置 3KLife `.atm/`。
- 需要尚未成熟的 adopter-vs-upstream detection。
- 客製資產保留與覆蓋政策不明。

### 三角策略修正

- 3KLife 純化為研發試驗場。
- npc-brain 或 synthetic fixture 承接 clean adopter 驗收。
- AI-Atomic-Framework 保持唯一 upstream truth。
- official onboarding 先在 disposable lab 驗證。
- 持續驗收整合到既有 adopter sentinel。
- 3KLife 實驗成果透過 graduation SOP 回 upstream。

---

## 9. 風險登記簿

### R1：npc-brain 驗收基線飄移

機率：高（已確認 — npc-brain 處於高活躍開發階段：Sanguo governance、PostgreSQL migration、vector rollout 都在同時推進）
衝擊：高
緩解：
- M0 殘留任務「立即開 `atm-validation-base` branch」必須優先完成，避免追 main。
- M1 / M4 一律以凍結的 baseline commit 為基準，禁止 rebase 到 main。
- 若文件或 evidence 提到 commit，必須標明是 `observed`、`baseline` 還是 `refreshed-baseline`，避免把 moving HEAD 誤寫成驗收真相。
- 每 2 週重新評估是否需要 refresh baseline（將 main 上的相容變更 cherry-pick 進 validation branch）。

### R2：private repo 導致 CI 不穩

機率：高
衝擊：中
緩解：external profile 初期 advisory；缺 secret 時 skip；PR-blocking 只使用 synthetic fixture。

### R3：Python adopter 抗拒 Node

機率：低到中
衝擊：中
緩解：在 `ADOPTER_ELIGIBILITY.md` 或 `BASELINE.md` 補 Python 友善 Node 安裝說明；必要時用 root-drop 或 onefile distribution 降低摩擦。

### R4：M1 發現大量 upstream bug

機率：中
衝擊：中
緩解：M2 triage；Blocker 先修，P2 轉 known limitation，不讓範圍膨脹。

### R5：`.atm/` 與 venv / Docker / 中文路徑衝突

機率：中
衝擊：中到高
緩解：M1 專門測；必要時補 `.dockerignore` 建議或 doctor warning，但不得 hard-code npc-brain。

### R6：npc-brain 無法覆蓋 Cocos 場景

機率：高
衝擊：低
緩解：接受此限制。Cocos 場景由 3KLife 試驗場負責，不混入 clean adopter 驗收。

### R7：3KLife 實驗長期無法 upstream

機率：中
衝擊：高
緩解：M7 建立 graduation SOP，要求 neutralization、validator 與 evidence。

### R8：CI 形成第二套真相

機率：中
衝擊：高
緩解：不得新增互相競爭的 adopter workflow；優先擴充 existing adopter sentinel。

### R9：過早要求 rollback 造成假性阻塞

機率：中
衝擊：中
緩解：M4 只要求 upgrade plan；rollback 延到 M8 release gate。

### R10：3KLife governance 軟性繼承造成 adopter-neutral 誤判（本版新增）

機率：中
衝擊：中
背景：npc-brain README 仍使用 3KLife `doc_id` 慣例（`doc_server_service_0001`），同時引用「三國章回、Cocos / Dev Toolbar、玩家-武將」等 3KLife 語意。若驗收過程把這些當成 ATM 應該「修掉」的東西，會出現兩種風險：
- 假性風險：ATM 把 host repo 既有 governance 當成污染要求覆蓋 → 違反 adopter-neutral。
- 真實風險：M1 dry run 找出來的問題分不清是 ATM bug 還是 3KLife 軟性繼承造成。
緩解：
- §4.4 已定義三層判定原則：L1 + L2 必須乾淨，L3 容忍。
- M2 evidence triage 新增分類 `host-governance-overlap`，與 `adopter-local`、`upstream` 分開。
- npc-brain 脫離 3KLife 完成前，所有 evidence 都必須標記是在「partial-decoupling」狀態下產生。

### R11：npc-brain 脫離 3KLife 未完成導致驗收混淆（本版新增）

機率：高
衝擊：中
背景：owner 宣告 npc-brain 正在獨立化，但 README 仍含 3KLife 語意。若驗收期間 owner 大幅重排目錄（如把 `app/` 改為 standalone Python package、改 doc-id 系統），M1 evidence 就會失效。
緩解：
- M0 殘留任務新增「詢問 owner 預計何時完成脫離」。
- 若脫離預計 < 2 週完成：M1 延後到脫離後。
- 若脫離預計 > 1 月或無明確時程：在當前 baseline 跑一次 M1 蒐集 evidence，但結果明確標記為 `pre-decoupling-baseline`，並承諾脫離後重做一次。

---

## 10. 開放議題

### Q1：npc-brain 是否真的符合乾淨 adopter 條件？

決策時機：

```text
M0
```

### Q2：npc-brain 的 `.atm/` 哪些檔案應 commit？

決策時機:

```text
M4
```

### Q3：external adopter sentinel 要不要 release-blocking？

決策時機：

```text
M8
```

### Q4：3KLife 的哪些實驗第一批適合畢業？

決策時機：

```text
M7
```

### Q5：Evidence 應存 adopter repo、upstream issue，還是 artifact？

決策時機：

```text
M6
```

### Q6：npc-brain 脫離 3KLife 是否應在 M1 前完成？（本版新增）

決策時機：

```text
M0 殘留任務 — 詢問 owner 時程後立即決定
```

選項：

- A：等脫離完成 → M1 結果穩定，但延後 ATM 上游 bug 發現時程。
- B：在當前 partial-decoupling baseline 跑 M1 → 早些拿到 evidence，但需明確標記為 `pre-decoupling-baseline`，脫離後需重做。
- C：兩階段並行 → M1 跑兩次，分別在 `pre-decoupling-baseline` 與 `post-decoupling-baseline` 上，比較差異也是有價值的 evidence。

預設建議：B（早拿 evidence + 明確標記）。

---

## 11. 立即執行順序

**已完成（claude_code_opus4.7 / 2026-05-18）：**

- ✅ M0 子任務：npc-brain clone、ATM 污染掃描、技術棧確認、L1+L2 乾淨判定。

**第一批剩餘動作（按順序執行）：**

1. **M0 殘留**：決定 baseline commit（建議使用目前重查的 `842a6a9d` 或 owner 指定 commit），開 `atm-validation-base` branch 並 push 到 remote。
2. **M0 殘留**：詢問 owner npc-brain 脫離 3KLife 預計時程（決定 Q6）。
3. **M0 殘留**：在 npc-brain 驗收 branch 撰寫 `docs/atm-adoption/ADOPTER_ELIGIBILITY.md`，記錄 §6 M0 表格內容。
4. 在 `C:/tmp/npc-brain-atm-lab` 執行 M1（除非 Q6 選 A 且 owner 預計 < 2 週脫離完成）。
5. 將 M1 evidence 做 M2 triage（新增 `host-governance-overlap` 分類）。
6. 只把 Blocker 與 §4.4 違規帶回 AI-Atomic-Framework 做 M3。
7. M3 穩定後才開 M4 official onboarding 候選分支。

明確暫緩：

- 不刪除 3KLife `.atm/`。
- 不刪除 3KLife `.atm-temp/`。
- 不停用 3KLife `tools_node/atomic-framework/`。
- 不直接把 `.atm/` commit 進 npc-brain `main`（branch 用 `atm-validation-base`，commit policy 在 M4 決定）。
- 不要求 npc-brain 改 README 的 `doc_id: doc_server_service_0001` 慣例（§4.4 L3 容忍）。
- 不新增第二套 adopter validation workflow。
- 不把 rollback 當 M4 硬阻塞。

---

## 12. 成功定義

本計畫成功時，應同時滿足：

1. 3KLife 保留 ATM 研發試驗場能力，未被 clean adopter 驗收破壞。
2. npc-brain 或 synthetic Python fixture 能提供真實 first-touch evidence。
3. AI-Atomic-Framework 的 official onboarding bug 能被 evidence 驅動修補。
4. adopter-sentinel 成為持續驗收入口，而不是旁生第二套 CI。
5. 3KLife 實驗成果有明確畢業路徑。
6. ATM public surface 仍保持 adopter-neutral。
7. clean uninstall、version compatibility、rule freshness 與 next action route 都有 deterministic 驗證。

---

## 13. 參考資料

- ATM 引導工程計畫書：`C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md`
- 3KLife README：`C:/Users/User/3KLife/README.md`
- 3KLife keep.summary：`C:/Users/User/3KLife/docs/keep.summary.md`
- ATM upstream onboarding 文件：`C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md`
- ATM upstream adopter sentinel：`C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts`
- ATM upstream adopter sentinel workflow：`C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml`
- ATM long-tail safeguards：`C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md`
- npc-brain remote repo：`https://github.com/eaglhuang/3klife-npc-brain`
- npc-brain 本機 clone：`C:/Users/User/3klife-npc-brain`
- npc-brain README（含 3KLife doc_id 慣例範例）：`C:/Users/User/3klife-npc-brain/README.md`
