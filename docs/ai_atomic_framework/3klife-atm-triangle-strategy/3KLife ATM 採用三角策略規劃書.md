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
| L1 | official onboarding | 不依賴 3KLife local fork，可從官方入口完成初始化、verify、evidence output |
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
| 3 | TASK-ATS-0003 | official onboarding smoke | 先證明官方入口能跑，後續行為測試才有共同起點 |
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

### M2：official onboarding smoke

產出：乾淨分支上的 ATM official onboarding transcript。

驗收：

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
| 只測 onboarding | 無法證明 ATM 的原子行為、map replacement 與 evolution 能用於真實 legacy strangler |
| 將三角策略留在 agent-pack-onboarding | 語意錯位，會讓後續任務卡、doc-id 與責任邊界混線 |

## 9. 驗證命令

本計畫落地後至少跑：

```powershell
npm run check:encoding:touched -- --files <touched-files>
git diff --check
```

若要驗證 AI-Atomic docs public-language gate，可在 AI-Atomic-Framework 執行 CJK 掃描腳本，期望只剩 `docs/ATOM_EVOLUTION_PLAN.md` 或其英文化替代進度。
