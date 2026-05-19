<!-- doc_id: doc_other_0229 -->
<!--
title: 3KLife ATM 採用三角策略規劃書
author: claude_code_sonnet4.6
revised_by: codex
created: 2026-05-18
revised: 2026-05-18
status: ready-for-task-execution
scope: 3KLife local governance, npc-brain adopter validation, AI-Atomic-Framework upstream evidence
supersedes: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
related:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/3klife-atm-triangle-strategy/tasks/README.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/3klife-atm-triangle-strategy/AI-Atomic-Framework docs public-language audit.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
  - C:/Users/User/AI-Atomic-Framework/docs/ATOM_EVOLUTION_PLAN.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/3klife-atm-triangle-strategy/ATOM_EVOLUTION_PLAN.zh-TW.md
  - C:/Users/User/AI-Atomic-Framework/docs/MAP_REPLACEMENT_PROTOCOL.md
  - C:/Users/User/AI-Atomic-Framework/docs/governance/behavior-taxonomy.md
  - C:/Users/User/3klife-npc-brain/README.md
-->

# 3KLife ATM 採用三角策略規劃書

## 0. 定位修正

本計畫已從 `agent-pack-onboarding/` 搬出，改放在獨立目錄：

`docs/ai_atomic_framework/3klife-atm-triangle-strategy/`

原因很單純：三角策略不是「ATM 引導工程計畫書」底下的一批任務，而是 3KLife、npc-brain 與 AI-Atomic-Framework 三個 repo 之間的治理實驗架構。它會引用 agent-pack onboarding，但不應被收納成 onboarding 子題。

新的任務卡序列改為 `TASK-ATS-*`，其中 `ATS` 代表 ATM Triangle Strategy。舊 `TASK-APO-0025` 到 `TASK-APO-0034` 停用並從 agent-pack-onboarding 目錄移除，避免任務語意混線。

## 1. 核心結論

3KLife 不需要，也不應該，為了測試 ATM 初始化而切斷自己與 ATM framework 研發的關係。

合理路線是三角策略：

| 角色 | Repo | 責任 | 不該做的事 |
|---|---|---|---|
| ATM 上游真相來源 | AI-Atomic-Framework | 維護 official CLI、core、behavior、map、evolution、validator、release gate | 放入 3KLife 專案私有規格或中文內部任務卡 |
| ATM 研發與治理試驗場 | 3KLife | 保留 local fork、dogfood ATM、產生可畢業的 evidence | 假裝自己是 clean adopter，或清空現有 `.atm/` 造成開發脈絡斷裂 |
| official adopter 驗收場 | 3klife-npc-brain | 用乾淨 Python service repo 驗證 ATM 正式導入、十種原子行為、legacy strangler、Atomic Map 與 evolution | 使用 3KLife local fork、私有 patch 或手工偷渡流程 |

結論：測試 ATM 引導功能與繼續開發 ATM 框架沒有衝突，但必須分 repo、分 evidence、分 gate。

## 2. 這份計畫要驗證什麼

npc-brain 不能只驗證 ATM 的入場導覽。它應該成為 ATM 對外 adopter 的最小真實戰場，覆蓋下列四層能力。

| 層級 | 驗證主題 | 成功標準 |
|---|---|---|
| L1 | official onboarding | 既有 repo 可先走 official install/adopt，再進入 README-only 單一入口，完成初始化、verify、evidence output |
| L2 | 十種原子行為 | `split`、`merge`、`compose`、`dedup-merge`、`sweep`、`evolve`、`expire`、`polymorphize`、`infect`、`atomize` 都有 dry-run / fixture / report |
| L3 | Legacy Python strangler | 可對 npc-brain 的 legacy Python 腳本做 `infect` + `atomize`，產生可審查 proposal，不直接破壞原始腳本 |
| L4 | Atomic Map / Evolution | 可用大型功能拆解計畫產生 canonical Atomic Map，並用 evidence-driven evolution 產生可審查升級提案 |

## 3. 原子行為驗證矩陣

| 行為 | npc-brain 測試焦點 | 對應任務 |
|---|---|---|
| `split` | 將大型 Python helper 或 service function 拆成較小 governed atoms | TASK-ATS-0004 |
| `merge` | 合併等價或高度重疊 atoms，保留 lineage 與 rollback proof | TASK-ATS-0004 |
| `compose` | 把多個 atoms 組成可驗證流程，必要時升成 Atomic Map | TASK-ATS-0004 / TASK-ATS-0006 |
| `dedup-merge` | 用 fingerprint / equivalence evidence 去重，不靠名稱猜測 | TASK-ATS-0004 |
| `sweep` | 掃描 stale、orphan、expired candidate，產 report 而非沉默刪除 | TASK-ATS-0004 / TASK-ATS-0007 |
| `evolve` | 從 evidence pattern 產生 UpgradeProposal draft，不直接 mutate registry | TASK-ATS-0007 |
| `expire` | 驗證 TTL / deprecated / expired transition 與 rollback boundary | TASK-ATS-0004 / TASK-ATS-0007 |
| `polymorphize` | 找出可參數化或 template 化的 atom family，產 impact report | TASK-ATS-0007 |
| `infect` | 將已治理 atom 的變更傳播到 legacy Python 依賴面，必須 dry-run + review | TASK-ATS-0005 |
| `atomize` | 從 legacy Python 腳本抽出新的 governed atom，附 source URI / evidence | TASK-ATS-0005 |

## 4. 里程碑與任務優先序

任務卡代號依執行優先序重新排列。數字越小，越早做。

| 順序 | 任務卡 | 里程碑 | 為什麼先做 |
|---|---|---|---|
| 1 | TASK-ATS-0001 | 文件邊界與 public-language gate | 先把計畫與任務卡搬離錯誤目錄，並確認 AI-Atomic public docs 不帶中文內部文件 |
| 2 | TASK-ATS-0002 | npc-brain baseline 與 fixture inventory | 沒有 frozen baseline，就無法判定後續 ATM 行為是改善還是污染 |
| 3 | TASK-ATS-0003 | official onboarding smoke | 先證明既有 repo 的 official adopt 路線可把 npc-brain 轉成 README-only 單一入口，後續行為測試才有共同起點 |
| 4 | TASK-ATS-0004 | 原子行為核心套件 | 先測 split / merge / compose / dedup-merge / sweep / expire 這些低耦合核心行為 |
| 5 | TASK-ATS-0005 | Legacy Python infect + atomize | 使用者特別指定的高價值能力，需在真實 Python 腳本上驗證 |
| 6 | TASK-ATS-0006 | Atomic Map 大功能拆解驗證 | 對接 `拆解大型功能優化原子map計畫書` 與 `create-map --from-plan` |
| 7 | TASK-ATS-0007 | Atom evolution / polymorphize 驗證 | 對接 `ATOM_EVOLUTION_PLAN.md`，驗證 evidence-driven proposal path |
| 8 | TASK-ATS-0008 | adopter sentinel 與 evidence routing | 把 npc-brain 的結果回流 upstream，不另造第二套 CI |
| 9 | TASK-ATS-0009 | upstream blocker repair batch | 只修 official ATM 通用問題，不把 npc-brain 特例寫死 |
| 10 | TASK-ATS-0010 | 3KLife 畢業與 release gate | 將可泛化成果 upstream，3KLife 保留研發試驗身份 |

## 5. 里程碑細節

### M0：文件邊界與 public-language gate

產出：新目錄、新任務序列、AI-Atomic docs 中文掃描報告。

驗收：

- `agent-pack-onboarding/` 只保留 ATM 引導工程與 `TASK-APO-0000` 到 `TASK-APO-0024`。
- 三角策略計畫書與任務卡位於 `3klife-atm-triangle-strategy/`。
- AI-Atomic-Framework `docs/**/*.md` 已掃描，中文文件有處置建議。

### M1：npc-brain baseline 與 fixture inventory

產出：baseline commit、branch、fixture 清單、legacy Python 腳本候選。

驗收：

- frozen baseline 可重跑。
- 候選腳本至少包含 parser / service helper / workflow 或 ETL 類腳本。
- 每個候選都有 source URI、風險、預期 atom 行為。

### 治理轉換期開發凍結規則

這裡的「凍結」是 `governance transition freeze`，不是全面 `code freeze`。它的目的，是在 npc-brain 正式切入 ATM 長期治理之前，先把驗證基準、onboarding 證據與第一批原子行為證據穩住，避免一邊導入治理、一邊大幅改動核心流程，讓目標一直漂移。

#### 凍結的對象

在 `TASK-ATS-0003` 到 `TASK-ATS-0005` 完成前，應暫停以下高變動開發：

- 大型 ETL / workflow 結構重寫。
- 會改變 artifact schema、輸出目錄、governance root、fixture contract 的變更。
- `pipelines/sanguo-rag/*.py` 這類核心腳本的大型重構。
- 未經 ATM proposal / dry-run review 的 legacy Python 大拆小與直接落地修改。

#### 允許繼續的工作

以下工作可以持續進行，且應優先支援三角策略驗證：

- 文件、規劃書、evidence、fixture inventory 與 validator 補強。
- baseline 清理、乾淨 checkout / worktree 建立、驗證腳本整理。
- 不改治理邊界的小型 bugfix。
- 只產生 proposal、report、dry-run patch，不直接改寫 legacy Python 主流程。

#### 執行模式

npc-brain 在治理轉換期應視為雙軌運作，而不是單一路徑：

- `baseline-clean`：固定在可重現的乾淨 checkout，用來跑 `TASK-ATS-0003` 到 `TASK-ATS-0005` 的官方 onboarding、原子行為與 strangler 試點驗證。
- `active-dev`：若確實有必要繼續開發，必須在另一個 branch、worktree 或 clone 進行，不得把尚未審查的開發狀態直接混入 baseline 驗證證據。

目前 `main@036d264e7fd56a969e9ef182d9ea3ac96df60fcb` 是 baseline 參考點；本地 dirty working tree 代表「不能當作乾淨驗證基準」，不代表「不能繼續開發」。

#### 解凍條件

只有在以下三個關卡通過後，npc-brain 才應回到「以 ATM 為主流程的常態開發」：

- `TASK-ATS-0003` 通過：official onboarding smoke 可重現。
- `TASK-ATS-0004` 通過：第一批核心原子行為在 npc-brain fixture 上得到 deterministic output。
- `TASK-ATS-0005` 通過：完成第一個 legacy Python `infect + atomize` 試點，且結果經 review 接受。

在這三項完成之前，開發不是禁止，而是必須服從 baseline 保護與證據優先。

### M2：official onboarding smoke

產出：乾淨分支上的 ATM official onboarding transcript、adopt/install transcript、README-only 進場 transcript。

驗收：

- 既有 repo 先走 official install/adopt route，例如 `atm init --adopt default` 或等價 official package route。
- install/adopt 步驟必須負責把 host repo 變成可 README-only 啟動的狀態，不得要求一般使用者手動從 framework repo 複製 `atm.mjs`、`root-drop` 或 `onefile` artifact。
- adopt 完成後，agent 可以只靠官方單一入口 `Read README.md if present, then run "node atm.mjs next --json" from the repository root and execute exactly the returned next action.` 啟動。
- 不引用 3KLife local fork。
- 不手工建立 `.atm` 內部檔繞過 CLI。
- 失敗時產生 machine-readable blocker report。

### M3：原子行為核心套件

產出：六個核心行為的 dry-run fixture 與 expected report。

驗收：

- `split`、`merge`、`compose`、`dedup-merge`、`sweep`、`expire` 都可在 npc-brain fixture 上得到 deterministic output。
- 任何會刪除或合併 legacy surface 的行為都只能產 proposal，不得直接 apply。

### M4：Legacy Python infect + atomize

產出：legacy Python strangler pilot。

驗收：

- `atomize` 能從 legacy Python 抽出 governed atom 草案。
- `infect` 能把治理變更傳播到 downstream 依賴面，並產生 dry-run patch。
- review 前不得修改原始 Python 腳本。

### M5：Atomic Map 大功能拆解驗證

產出：decomposition plan、canonical map、map integration report、equivalence evidence。

驗收：

- 使用 `create-map --from-plan` 或等價 official surface。
- 產物不是散落 atoms，而是 replacement-capable canonical Atomic Map。
- 對齊 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`。

### M6：Atom evolution / polymorphize 驗證

產出：evidence-driven evolution dry-run proposal。

驗收：

- 對齊 `C:/Users/User/AI-Atomic-Framework/docs/ATOM_EVOLUTION_PLAN.md`。
- `evolve` 只產 UpgradeProposal draft，不直接改 registry。
- `polymorphize` 產 impact report，並與 Atomic Map propagation gate 接上。

### M7：adopter sentinel 與 evidence routing

產出：npc-brain adopter sentinel case。

驗收：

- 擴充 AI-Atomic-Framework 既有 sentinel，不另開 3KLife 私有 CI。
- evidence 依 `upstream-blocker`、`adopter-local`、`host-governance-overlap` 分流。

### M8：upstream blocker repair batch

產出：一批可 upstream 的修補 PR / patch。

驗收：

- 修補必須 repo-neutral。
- 不出現 `3KLife` / `npc-brain` hard-code。
- 對 public docs 有英文說明或英文摘要。

### M9：3KLife 畢業與 release gate

產出：3KLife local experiment graduation SOP 與 ATM release gate checklist。

驗收：

- 3KLife 的實驗成果可以轉成 upstream RFC、fixture、validator 或 docs patch。
- 仍需留在 3KLife 的內容標為 local governance，不污染 AI-Atomic public surface。


## 5.1 2026-05-19 測試狀態更新

本次測試屬於 TASK-ATS-0003 / M2 official onboarding smoke 的自然語言黑箱測試。使用者沒有提示 `AGENTS.md`、`README.md`、`atm.mjs` 或 ATM 規則，只下普通需求：「請幫我看看目前專案的資料管線進度已經進行到哪裡了？」

判定結果：M2 進行中，讀取型 onboarding smoke partial pass。

已通過：
- Agent 自行做前置檢查，讀取 README / 專案入口資訊。
- Agent 自行執行 `node atm.mjs next --json`。
- Agent 照 ATM 回傳結果執行 `node atm.mjs atm-chart render --cwd . --json`。
- Agent 完成 onboarding refresh 後，有回到使用者原始需求，整理資料管線進度。
- 使用者截圖顯示資料管線已被整理為可讀摘要，包含目前約在「內容擴充 + residual 修補 + canonical 發布前治理」階段、pipelineReliability=100%、ready_events 數量偏低等重點。

尚未完全通過：
- ATM 治理提示存在感偏弱；Agent 有走 ATM route，但使用者不一定清楚「系統已加入 ATM 治理」這件事。
- 目前 npc-brain root `AGENTS.md` / README 仍是較早版入口文案，尚未包含最新 `ATM_USER_NOTICE` / `evidence.userNotice` 顯示規則。
- `.atm/`、`AGENTS.md`、`atm.mjs`、README 仍是 adopter onboarding 變更，尚未視為正式完成狀態。

下一步測試：
- 完成 TASK-ATS-0003B：使用最新版 pinned runner 重新 refresh npc-brain，確認 root README / AGENTS 入口文案包含 user notice 顯示規則。
- 再開一個全新 Codex 對話，只下自然語言需求，不提示 ATM，驗證是否同時做到：顯示 ATM welcome/user notice、執行 ATM next route、回到使用者原始任務。
- 若 TASK-ATS-0003B 通過，TASK-ATS-0003 可關閉，進入 TASK-ATS-0004 atom behavior core suite。

大幅修改 npc-brain 管線的解凍條件：
- TASK-ATS-0003 完成，表示 onboarding route 可以穩定接手自然語言需求。
- TASK-ATS-0004 至少完成 minimum dry-run suite，確認 split / merge / compose / dedup-merge / sweep / expire 在 npc-brain fixture 上不會直接破壞 legacy surface。
- 針對真正會動到 legacy Python 管線的工作，需等 TASK-ATS-0005 的 infect + atomize dry-run proposal 產出並人工 review 後再進入大幅修改。

因此目前可以做的是：read-only 分析、fixture/evidence 補強、小型非破壞性修補；還不建議直接大幅改寫 `pipelines/sanguo-rag/*.py`。
## 6. AI-Atomic docs 中文文件處置結論

本輪掃描 `C:/Users/User/AI-Atomic-Framework/docs/**/*.md` 共 35 份 Markdown。只有 1 份含中文內容：

| 文件 | 中文量 | 建議 |
|---|---:|---|
| `docs/ATOM_EVOLUTION_PLAN.md` | 3559 CJK chars | 中文詳版已保存到 `docs/ai_atomic_framework/3klife-atm-triangle-strategy/ATOM_EVOLUTION_PLAN.zh-TW.md`；AI-Atomic 端改成英文 public design note |

這個結果代表 AI-Atomic public docs 的整體方向是健康的。真正需要處理的是 `ATOM_EVOLUTION_PLAN.md`：它目前內容是 upstream 設計計畫，但語言仍像 3KLife 內部工作文件。若 AI-Atomic 要對外開源，應改成英文 public design note；中文長版已在 3KLife 保存為母專案治理脈絡，AI-Atomic 端只保留英文對外版本。

## 7. 與 ATM 精神的吻合度

調整後的計畫更吻合 ATM 精神，原因如下：

| ATM 精神 | 本計畫落點 |
|---|---|
| 原子化不是口號，要有 behavior evidence | npc-brain 明確覆蓋十種原子行為 |
| 治理行為必須 proposal-first | infect / atomize / evolve / map replacement 都要求 dry-run + review |
| 大功能不能只拆成零散 atoms | M5 強制 canonical Atomic Map |
| 進化不能直接突變 registry | M6 對齊 ATOM_EVOLUTION_PLAN 的 evidence-driven proposal path |
| upstream 必須 adopter-neutral | M7 / M8 明確禁止 3KLife / npc-brain hard-code |
| 內部母專案可以保留完整脈絡 | 中文詳版與 local governance 留在 3KLife |

## 8. 不採用的方案

| 方案 | 不採用原因 |
|---|---|
| 清空 3KLife `.atm/` 後重跑初始化 | 會破壞 3KLife 作為 ATM 母專案與研發試驗場的連續性 |
| 把 3KLife 當 clean adopter | 3KLife 已有 local fork、Cocos governance、doc-id 與大量 ATM dogfooding 歷史，不乾淨 |
| 全面停止 npc-brain 所有開發 | 會把治理導入期需要的文件、fixture、validator 與小型修補一併凍住；本計畫採「治理轉換期凍結」，不是全面停工 |
| 要求使用者手動複製 `release/atm-onefile/atm.mjs` 到 host repo | 這只是工程驗證手段，不是 adopter UX；正式路線應由 official install/adopt 自動完成 runtime 物化，再進入 README-only 模式 |
| 只測 onboarding | 無法證明 ATM 的原子行為、map replacement 與 evolution 能用於真實 legacy strangler |
| 將三角策略留在 agent-pack-onboarding | 語意錯位，會讓後續任務卡、doc-id 與責任邊界混線 |

## 9. 驗證命令

本計畫落地後至少跑：

```powershell
npm run check:encoding:touched -- --files <touched-files>
git diff --check
```

若要驗證 M2 的 adopter 路線，應優先驗證「先 official adopt，再 README-only」：

```powershell
node atm.mjs init --adopt default --cwd <npc-brain-repo> --dry-run --json
node atm.mjs next --cwd <npc-brain-repo> --json
```

M2 通過後，host repo 的正式 agent 入口才應收斂成：

```text
Read README.md if present, then run "node atm.mjs next --json" from the repository root and execute exactly the returned next action.
```

若要驗證 AI-Atomic docs public-language gate，可在 AI-Atomic-Framework 執行 CJK 掃描腳本，期望只剩 `docs/ATOM_EVOLUTION_PLAN.md` 或其英文化替代進度。
<!-- TASK-ATS-0004-2026-05-19-REASSESSMENT:START -->
## 5.2 2026-05-19 TASK-ATS-0004 驗收結案：跨編輯器黑箱治理鏈通過

### 結論

2026-05-19 補充驗收顯示，Copilot、Codex、Claude Code、Google Antigravity 都已能在自然語句下先回到 ATM `next` / `guide` / `candidates rank` 治理鏈，再用 candidate ranking、source inventory、police-family、guidance-drift-police artifact 回答 Python 管線優先序問題。因此 TASK-ATS-0004 正式完成。

### TASK-ATS-0004 子驗收狀態

| 子項 | 狀態 | 判定 |
|---|---|---|
| TASK-ATS-0004A Explicit ATM Prompt Smoke | pass | 顯式要求用 ATM 時，Agent 會進入 guidance session。 |
| TASK-ATS-0004B Natural Prompt Auto Skill Trigger | pass | Copilot、Codex、Claude Code、Antigravity 在自然黑箱 prompt 下都能先走 ATM 路由。 |
| TASK-ATS-0004C Python Pipeline Ranking Quality | pass | Python pipeline 排序已由 `atm candidates rank` artifact 直接支撐。 |
| TASK-ATS-0004D Candidate Ranking Artifact | pass | 多編輯器最終回答都能引用 candidate ranking report。 |
| TASK-ATS-0004E Source Inventory + Police Evidence | pass | source inventory、police-family、guidance-drift-police artifact 已進入最終回答證據鏈。 |
| TASK-ATS-0004F Python-Only Blocker Neutrality | pass | Python-only adopter 的 `package-json-missing` 已降為 advisory，不再阻擋候選排序與 dry-run proposal。 |

### 後續移轉

1. TASK-ATS-0005 轉為 `in_progress`。
2. 第一支 legacy Python pilot 選擇 `pipelines/sanguo-rag/sanguo_governance_loader.py`。
3. 2026-05-19 已產出 guidance session `guidance-20260519125514-b1f15ab8ab`，並產生 `behavior.split` guided dry-run proposal `guided-legacy-split-guidance-20260519125514-b1f15ab8ab`，等待 human review 後再決定是否進一步做 atomize / infect。
4. 另開 upstream 任務 `ATM-GOV-0111 Antigravity Integration Adapter`，把已通過的 Antigravity 行為正式產品化。
<!-- TASK-ATS-0004-2026-05-19-REASSESSMENT:END -->

<!-- TASK-ATS-0005-0007-2026-05-19-PROGRESSION:START -->
## 5.3 2026-05-19 TASK-ATS-0005 ~ TASK-ATS-0007 推進更新

### 結論

- `TASK-ATS-0005` 已可視為完成：ATM 已在 `3klife-npc-brain` 真實 Python host 上，對 `pipelines/sanguo-rag/sanguo_governance_loader.py#default_governance_root` 同時產出 `atomize` 與 `infect` 的 guided dry-run proposal，且未直接修改 host Python 原始碼。
- `TASK-ATS-0006` 已進入主戰場：目標不再是 helper，而是高價值大功能 `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`。已建立正式 decomposition plan，並用官方 `create-map --from-plan` surface materialize 出 canonical map `ATM-MAP-0001`。
- `TASK-ATS-0007` 已從等待狀態進入 rollout 驗收：`ATM-MAP-0001` 已通過 map integration test，replacement lane 已從 `draft -> shadow -> canary`，而 `active` transition 的正式 blocker 也已被 ATM 機器可讀地捕捉。

### TASK-ATS-0005 完成證據

- Guidance session: `guidance-20260519134240-815ea27a83`
- Leaf target: `pipelines/sanguo-rag/sanguo_governance_loader.py#default_governance_root`
- Atomize proposal: `guided-legacy-atomize-guidance-20260519134240-815ea27a83`
- Infect proposal: `guided-legacy-infect-guidance-20260519134240-815ea27a83`
- Queue path: `.atm/history/reports/upgrade-proposals.json`

### TASK-ATS-0006 目前證據

- High-value feature target: `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
- Decomposition plan: `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json`
- Canonical map: `ATM-MAP-0001`
- Workbench path: `atomic_workbench/maps/ATM-MAP-0001`
- Registry path: `atomic-registry.json`

### TASK-ATS-0007 目前證據

- Map integration report: `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`
- Lineage log: `atomic_workbench/maps/ATM-MAP-0001/lineage-log.json`
- Replacement lane progress: `draft -> shadow -> canary`
- `active` blocker:
  - `map-equivalence`
  - `propagation-report`
  - `review-advisory`
  - `human-review`

### 現在可以怎麼做

這代表 `3klife-npc-brain` 已經不是停留在「leaf-level dry-run 可不可用」的階段，而是正式進入：

1. 以大功能為對象的 Atomic Map 拆解；
2. 以 canonical map 為中心的 rollout/equivalence 驗收；
3. 用 machine-readable blocker 決定何時能從 `canary` 走到 `active`。

因此，後續若要開始第一支「受治理的大改 pilot」，應以 `ATM-MAP-0001` 為邊界，而不是直接粗暴重寫整支 `run_full_roster_convergence_loop.py`。
<!-- TASK-ATS-0005-0007-2026-05-19-PROGRESSION:END -->
