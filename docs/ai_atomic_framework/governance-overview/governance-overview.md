# ATM 框架治理機制全景 (zh-TW)

> **Locale 聲明**：本文件為 zh-TW 副本，目的是讓中文讀者快速掌握 ATM 治理全景；它**不是**框架公開規範。  
> **英文權威來源**：`docs/governance/`（INV-ATM-007 規定公開框架文件須為英文）。  
> **本副本範圍**：原理與設計脈絡、原子角色說明、跨倉部署機制、多角度分析。  
> 若中英文敘述衝突，以英文版為準。

> **可重生章節**：本文有 5 個由同目錄下 `render-governance-overview.mjs` 自動更新的區塊（以 `<!-- atm:gen:KEY -->...<!-- atm:gen:KEY:end -->` 包裹）。修改可重生區塊外的敘事不會被覆寫；修改區塊內內容會被下次重生覆寫。
>
> 重生指令（從本目錄執行）：
>
> ```bash
> # 預設 --check 模式偵測 drift；exit 2 表示需要更新
> node render-governance-overview.mjs --framework-root <AI-Atomic-Framework path>
>
> # 寫入更新
> node render-governance-overview.mjs --write --framework-root <AI-Atomic-Framework path>
>
> # 或使用 env var
> ATM_FRAMEWORK_ROOT=<path> node render-governance-overview.mjs
> ```

---

## 目錄

- [第 0 章 — 前言](#第-0-章--前言)
- [第 1 章 — 框架定位](#第-1-章--框架定位)
- [第 2 章 — 概念詞彙表](#第-2-章--概念詞彙表)
- [第 3 章 — 架構鳥瞰](#第-3-章--架構鳥瞰)
- [第 4 章 — 治理生命週期七階](#第-4-章--治理生命週期七階)
- [第 5 章 — 原子註冊總表（可重生）](#第-5-章--原子註冊總表可重生)
- [第 6 章 — 五原子深度剖析](#第-6-章--五原子深度剖析)
- [第 7 章 — 行為類別總覽（可重生）](#第-7-章--行為類別總覽可重生)
- [第 8 章 — Charter Invariants 完整解釋（可重生）](#第-8-章--charter-invariants-完整解釋可重生)
- [第 9 章 — 跨倉部署機制](#第-9-章--跨倉部署機制)
- [第 10 章 — 證據與閉合契約](#第-10-章--證據與閉合契約)
- [第 11 章 — 多角度分析（五視角）](#第-11-章--多角度分析五視角)
- [第 12 章 — 原子 × 生命週期角色矩陣](#第-12-章--原子--生命週期角色矩陣)
- [第 13 章 — 故障場景與復原](#第-13-章--故障場景與復原)
- [第 14 章 — 演化軌跡（可重生）](#第-14-章--演化軌跡可重生)
- [第 15 章 — 附錄](#第-15-章--附錄)

---

## 第 0 章 — 前言

### 0.1 為什麼需要這份文件

ATM（Atomic Framework）的源代碼分散在 `packages/core/`、`packages/cli/`、`packages/plugin-governance-local/`、`schemas/governance/`、`docs/governance/` 等多個倉位，並透過十個 skills 對外暴露操作介面。對於初次接觸的 adopter 維運者，需要花相當時間才能在源碼裡把「ATM 是怎麼治理我的 repo 的」這條故事線串起來。對於框架貢獻者，雖然熟悉局部機制，但跨領域的整體圖像（例如「鎖、證據、closure packet、charter invariants」如何在一次任務裡共同生效）也少有單一文件總覽。

本文件的目標：

1. 從**被治理方**（adopter repo）的視角，描述 ATM 進入 repo 後做了什麼、要求 agent 做什麼、何時拒絕、何時放行。
2. 從**框架方**（meta-framework）的視角，把核心契約（atoms / behaviors / charter / closure packet / evidence gates）的設計理由與相互關係寫清楚。
3. 把目前註冊中的所有原子按生命週期定位，避免「原子是抽象概念」的誤解 — 每個原子都有具體扮演角色的時機。
4. 提供五個分析視角（控制流、資料流、信任邊界、故障/復原、演化）作為深度閱讀的入口。

### 0.2 文件結構與閱讀路徑

- **走「為什麼」**：第 1 章 → 第 11 章（多角度分析）→ 第 13 章（故障案例）
- **走「怎麼用」**：第 3 章（鳥瞰）→ 第 4 章（生命週期）→ 第 9 章（跨倉部署）→ 第 15 章（CLI cheat sheet）
- **走「原子細節」**：第 5 章（原子表）→ 第 6 章（五原子剖析）→ 第 12 章（角色矩陣）
- **走「合規與紅線」**：第 8 章（invariants）→ 第 10 章（證據與閉合）→ 第 14 章（最新硬化）

### 0.3 文件版本

- 文件首版日期：2026-05-24（對應 `atomic-charter.md` charter version 2.0.0）
- 對應的框架根：由 `--framework-root` 或 `ATM_FRAMEWORK_ROOT` 指向的 `AI-Atomic-Framework` checkout（內建路徑列在 5 / 15 章原始來源旁）
- 對應的 commit 範圍：截至 `d0b630a`（push-guard legacy baseline cut）
- 對應的註冊原子：5 個 active（4 CORE + 1 FIXTURE），外加 2 個 draft 占位（無 atomId）

> **文件存放位置**：`<3KLife>/docs/ai_atomic_framework/governance-overview/governance-overview.md`。重生器與規劃文件並排存放。本文件描述的是 `AI-Atomic-Framework`，並非 3KLife 自身。

文件中所有指令格式以「`node atm.mjs <command>`」表示（即 adopter 安裝後的 onefile 入口）。在框架 repo 內部開發時，可改用 `node packages/cli/src/atm.mjs <command>`，行為一致。

---

## 第 1 章 — 框架定位

### 1.1 ATM 解決的問題

當一個 AI agent 進入未知的 repo、想完成一個任務（修 bug、加功能、重構、文檔整併）時，標準失敗模式是：

- 偷偷越過守則（例如 `--no-verify` 提交、跳過測試、繞過 review）。
- 在沒有鎖定 scope 的情況下並發編輯，導致兩個 agent 的修改互相覆寫。
- 完成任務後沒留下可重放的證據鏈，三天後沒人能審計這個變更是怎麼通過的。
- 把治理規則寫進 repo 自己的腳本與文件，每個 repo 規則不同、無法跨倉復用。

ATM 對這四個失敗模式的回應分別是：

| 失敗模式 | ATM 的回應 |
|----------|-----------|
| 越過守則 | `atm doctor` 把守則編碼為**檢查**，agent 必須先過守則才能往下走 |
| 並發編輯衝突 | `atm lock` 把「我要動哪些檔」變成可審計記錄，未鎖定的編輯會被 `lock-before-edit` 偵測 |
| 缺乏證據鏈 | `atm evidence` + `closure packet` 把每次任務的 stdout/stderr/exit code 與 git HEAD 雜湊串成可重放鏈條 |
| 規則無法跨倉 | 把治理規則上抽到 framework repo，adopter 只透過 `atm.mjs` onefile 與 `.atm/` 目錄與框架對話 |

ATM 不負責決定「測試應該怎麼寫」「PR 應該怎麼 review」「issue 怎麼追蹤」 — 這些屬於 adopter 自己的決策。ATM 只負責**讓 adopter 自己選擇的規則可以被一致地檢查與審計**。

### 1.2 兩種運行模式：framework mode vs adopter mode

ATM 的 runner（`atm.mjs`）有兩種運行情境：

**Framework mode**：在 framework 本身的 repo 內運行。這時 `doctor` 會檢測到 framework 簽名（presence of `packages/core/`、`atomic-registry.json`、`.atm/charter/atomic-charter.md` 等），並啟用 framework-development 規則。`tasks close` 寫出的 closure packet 會帶 `targetRepoIdentity.isFrameworkRepo: true`，要求 framework gate provenance（這是近期 `ae326ce` commit 加入的硬化）。

**Adopter mode**：在 adopter repo 內運行。`doctor` 不會看到 framework 簽名，因此 framework 專屬規則不啟用；但 INV-ATM-001（不可有第二個 registry）、INV-ATM-002（編輯前需鎖）、INV-ATM-003（提升需 schema 驗證）等通用 invariants 仍然生效。

兩種模式共用同一個 onefile binary，差別在 runtime 判斷。這個設計的好處是：框架自己的開發也走自己的治理流程（dogfooding），不會出現「框架治理規則只對 adopter 嚴格、對自己寬鬆」的雙標準。

### 1.3 為什麼是 meta-governance，不是 build system

ATM 不替代 npm、bazel、gradle、cargo。它不負責**怎麼建構**。

ATM 不替代 GitHub Actions、Jenkins、CircleCI。它不負責**怎麼跑 CI**。

ATM 不替代 Jira、Linear、Notion、GitHub Issues。它不負責**怎麼追蹤工單**（雖然提供 `externalRef` 欄位指向外部追蹤器）。

ATM 處於這些工具的「上一層」 — 它定義一套**治理契約**（哪些檔受鎖、哪些證據需要才能 close、哪些變更需要 charter waiver），讓上述工具的執行結果可以被綁進**同一條審計鏈**。

具體來說：你的測試還是用 Jest 跑，但通過後 `atm evidence add --kind test --artifacts report.json` 把它登記為 closure 證據。你的 PR 還是在 GitHub review，但合併前 `atm evidence verify --gate pr` 確認 review evidence 存在。

這個分工讓 ATM 可以跨多個 adopter repo 復用，而每個 adopter 仍能保留自己的工具棧。

### 1.4 設計取捨：什麼 ATM 故意不做

幾個刻意的設計取捨值得注意：

- **不自動發現 adopter**：framework 不維護 adopter 清單。Adopter 要 sync 必須顯式提供 `--repo <path>`，避免 framework 與下游耦合。
- **不裝 git hook 強制**：`docs/governance/no-hook-human-fallback.md` 說明 guards 預設只是 smoke check，不是 CI gate。Adopter 想要硬阻擋必須自己掛 branch protection。
- **不抽象化儲存**：核心契約只規定形狀（`scopeLock` 必須有 `files`、`evidence` 必須有 `kind`），不規定一定要寫到 `.atm/runtime/locks/`。`docs/governance/downstream-adopter-governance-mapping.md` 顯示 adopter 可以把這些 record 寫到自家既有的 docs/tasks 目錄。
- **不做雙向同步**：sync 是單向的（framework → adopter）。Adopter 對 framework 的回饋走 PR 與 issue，不走 runtime 通道。

這些「不做」反過來強化「ATM 是契約層、不是中介層」的定位。

### 1.5 與 ATM 對話的三種介面

Adopter 與 framework 對話有三條通道，每條通道目的不同：

| 通道 | 目的 | 例子 |
|------|------|------|
| **CLI** | Agent 與 framework 的執行時介面 | `node atm.mjs next --json` |
| **Skills** | LLM agent 與 framework 的語意介面（在 Claude Code 等 agent 環境） | `Skill atm-lock` 觸發鎖定流程 |
| **Schemas + Docs** | 框架契約的可審計介面（人類與工具皆可讀） | `schemas/governance/closure-packet.schema.json` |

三條通道在語意上對齊。CLI 的輸出符合 schema、skills 的指引最終轉成 CLI 呼叫、schemas 同時是 CLI 驗證的依據。Adopter 不必三條都用 — 例如純人類維運可以只透過 CLI；agent 環境會經 skills 包裝；CI 校驗會直接 lint schemas。

---

## 第 2 章 — 概念詞彙表

下表是貫穿全文的核心術語。每條附上首次出現的章節以便回查。

| 中文 | 英文 | 一句話定義 | 首次出現 |
|------|------|-----------|----------|
| 原子 | atom | 由 `atm.atomicSpec` schema 描述、有唯一 `ATM-{BUCKET}-{NNNN}` 編號、有 hash-locked 規格、有 evidence-required 驗證指令的最小治理單位 | §5 |
| 邏輯名稱 | logicalName | 原子的人類可讀命名（如 `atom.core-seed`），供文件與訊息使用；機器則用 atomId | §5 |
| 行為 | behavior | 對原子進行的治理操作（split / merge / evolve / expire / infect 等），定義於 behavior taxonomy；ID 形如 `behavior.evolve` | §7 |
| 註冊表 | atomic-registry | `atomic-registry.json` — 全 framework 唯一的原子身份與版本來源，受 INV-ATM-001 保護 | §5 |
| Charter | atomic charter | `.atm/charter/atomic-charter.md` — framework 最高治理權威，定義 7 條 invariants | §8 |
| Invariant | invariant | Charter 中不可變條款（INV-ATM-001 ~ INV-ATM-007），違反需 charter waiver 流程 | §8 |
| Scope Lock | scope lock | 編輯前必須持有的鎖記錄，宣告「這個 workItemId 暫時占有這些檔案」，schema：`atm.governanceScopeLock` | §4.3 |
| 證據 | evidence | 任務執行的可重放證明，類型有 `test` / `artifact` / `attestation` / `review` / `commit` / `waiver` 等 | §10 |
| 證據新鮮度 | evidence freshness | 證據必須在當前任務開啟後產生才算 fresh，避免重開任務用舊證據過 close gate（`85b92ce` 引入） | §10 |
| Gate | evidence gate | 證據檢查門檻，分為 `close` / `commit` / `pr` 三種，每種要求不同證據組合 | §10 |
| Closure Packet | closure packet | 任務 close 時寫出的最終封包，schema：`atm.closurePacket.v1`，含 commandRuns 雜湊、required gates、git HEAD 對照 | §10 |
| Closure Provenance | closure provenance | Closure packet 中對 framework gate 通過時的快照（`ae326ce` 引入） | §10 |
| Adopter | adopter | 安裝了 `atm.mjs` 並使用 ATM 治理的 repo，與 framework repo 區分 | §1 |
| Framework Mode | framework mode | Runner 偵測到 framework 簽名後啟用的內部規則集 | §1.2 |
| Doctor | doctor | `node atm.mjs doctor` — 跑一組健康檢查、列出失敗的守則 | §4.1 |
| Orient | orient | 對 repo 做初始掃描，輸出 `ProjectOrientationReport`，用於後續路由決策 | §4.1 |
| Next | next | Router 指令，依當前狀態回傳「agent 下一步該做什麼」 | §4.2 |
| Handoff | handoff | 任務交接摘要，把 context 從一個 agent session 傳給下一個 | §4.7 |
| Onefile Runner | onefile runner | `release/atm-onefile/atm.mjs`，3.1MB 自包含 Node script，是 framework 分發單位 | §3 |
| Pinned Runner | pinned runner | Adopter 端 `.atm/runtime/pinned-runner.json`，記錄當前 onefile 的雜湊與來源 commit | §9 |
| 註冊中性 | neutrality | 框架文件、原子描述不可含 adopter 專屬名稱（INV-ATM-007）；由 ATM-CORE-0003 自動掃描 | §6.2 |
| Charter Waiver | charter waiver | 違反 invariant 的合法路徑：以 `behavior.evolve` 提案 + HumanReviewDecision | §8 |
| Governance Bundle | governance bundle | 把 workItem / scopeLock / evidence / layout 等綁在一起的傳輸格式，schema：`atm.governanceBundle` | §10 |
| 任務直線鎖 | task direction lock | 鎖定當前任務的工作方向，防止偏軌（`387101b` 引入）| §13 |
| Push Guard | push guard | 提交安全控制，防止越界 push 到受保護分支（`f92013f` 引入）| §14 |

英文術語在原始檔案（特別是 schemas 與 source code 註解）為權威來源。中文翻譯僅供記憶與索引，遇歧義以英文為準。

---

## 第 3 章 — 架構鳥瞰

### 3.1 系統圖（從 framework repo 到 adopter 的全景）

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Framework Repo (AI-Atomic-Framework)               │
│                                                                     │
│  packages/core/         ← 契約定義（atoms、locks、evidence、guidance）│
│  packages/cli/          ← CLI 命令 (next/lock/evidence/orient/...)  │
│  packages/plugin-*/     ← 預設 adapter / behavior pack              │
│  schemas/governance/    ← JSON Schema 契約                          │
│  docs/governance/       ← 英文權威文件                              │
│  atomic-registry.json   ← 唯一原子註冊表 (INV-ATM-001)              │
│  .atm/charter/          ← Charter + 7 條 invariants                 │
│                                                                     │
│         │                                                           │
│         │ npm run build → strip-types bundle                        │
│         ▼                                                           │
│  release/atm-onefile/atm.mjs   (3.1 MB 自包含 runner)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          │ node atm.mjs internal-release sync --repo <adopter>
                          │     (顯式、push-based、不自動發現)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Adopter Repo                                   │
│                                                                     │
│  atm.mjs                       ← 從 framework 同步來的 runner       │
│  .atm/                                                              │
│    config.json                 ← bootstrap 設定                     │
│    charter/                    ← adopter 收到的 charter 副本        │
│    runtime/                                                         │
│      pinned-runner.json        ← 當前 runner 雜湊 + 來源 commit     │
│      locks/                    ← scope locks（編輯前必持有）        │
│      rules/                    ← rule guard 輸出                    │
│      state/                    ← 運行時狀態                         │
│    history/                                                         │
│      tasks/                    ← 任務 ledger                        │
│      evidence/                 ← 證據記錄                           │
│      reports/                  ← 驗證與 sync 報告                   │
│      handoff/                  ← context summary                    │
│    catalog/                                                         │
│      registry/                 ← adopter 的本地 atom 註冊（可選）   │
│                                                                     │
│         │                                                           │
│         │ agent 進入 repo 後第一條指令永遠是 `atm next`             │
│         ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  ATM 治理生命週期 (七階)                                  │      │
│  │  ORIENT → NEXT → LOCK → EXECUTE → EVIDENCE → HANDOFF →    │      │
│  │  CLOSURE → (loop)                                          │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 三條軸線

把鳥瞰圖換個角度，可以看到三條獨立但相關的軸線。

**身份軸**：原子（atomId）→ 行為（behaviorId）→ Charter invariants → Closure provenance。這條軸線管「是什麼」與「能做什麼」。

**狀態軸**：未鎖 → 已鎖 → 執行中 → 已驗證 → 已交接 → 已關閉。這條軸線管「任務走到哪了」。

**證據軸**：input artifacts → command runs (with stdout/stderr SHA256) → evidence records → closure packet → git HEAD pin。這條軸線管「我們有什麼可以證明」。

三條軸線在 closure packet 那一刻會合。Closure packet 必須同時記錄：

- 任務的 atomId / workItemId（身份軸）
- 任務的 closedAt / closedByActor（狀態軸）
- 任務的 commandRuns 與 evidence path（證據軸）

沒有任一軸線，treat-this-as-closed 就無法成立。

### 3.3 「為什麼一定要單檔 runner」

一個常見的問題：「為什麼不發布成 npm package、讓 adopter `npm install @ai-atomic-framework/cli`？」

幾個決策原因：

1. **避免 transitive dep hell**：onefile 是 strip-types bundle，無第三方 runtime 依賴。Adopter 升級 framework 不會與自己的 dep tree 衝突。
2. **可審計**：3.1MB 的單檔可整檔雜湊。Pinned-runner.json 紀錄當前 sha256，下次 sync 對比就知道有沒有變過。
3. **可內網分發**：onefile 可放在 git LFS / 內部 CDN，不需要 publish 到 npm registry。對企業內網場景友善。
4. **強制顯式 sync**：因為不是 dep，所以不會「跑 npm install 就靜默升級」。每次升級都是顯式 commit。

代價：每次升級 adopter 都得 commit 一個 3.1MB 二進位檔。但因為 onefile 是 deterministic build（理論上同樣輸入會產出 byte-identical 輸出），git 對它的 diff 很穩定。

### 3.4 與既有工具的關係

```
      Adopter 既有工具棧               ATM 對接點
      ──────────────────               ──────────
      Jest / Vitest / Mocha    →  evidence kind: test
      npm run build            →  evidence kind: artifact
      GitHub PR / GitLab MR    →  evidence kind: review
      git commit               →  evidence kind: commit
      Jira / Linear / GitHub   →  workItem.externalRef
      pre-commit hooks         →  atm guard --json (smoke check only)
      branch protection        →  推薦但 ATM 不強制
      CI yaml                  →  可呼叫 atm doctor / verify 作為一步
```

對接點都是「**輕度耦合**」 — adopter 只需在工具完成本職後加一行 `atm evidence add ...` 或 `atm guard ...`，即可把工具產出綁進 ATM 審計鏈。

---

## 第 4 章 — 治理生命週期七階

ATM 把一個 agent 從接到 prompt 到提交 closure 的完整流程切成七階。下表是速覽，後續小節展開每一階。

| # | 階段 | 主要 CLI | 主要產出 | 主要 invariant |
|---|------|---------|----------|---------------|
| 1 | ORIENT | `atm orient` / `atm doctor` | `ProjectOrientationReport` | INV-ATM-004（最高權威） |
| 2 | NEXT | `atm next --json` | `GuidanceNextAction` | — |
| 3 | LOCK | `atm lock acquire` | `ScopeLockRecord` | INV-ATM-002（編輯前需鎖） |
| 4 | EXECUTE | （工具自身） | 程式碼 / 文件 / 資產的變動 | INV-ATM-006（target-local 工作追蹤） |
| 5 | EVIDENCE | `atm evidence add` / `verify` | `EvidenceRecord[]` + `EvidenceGateResult` | INV-ATM-003（提升前需 schema 驗證） |
| 6 | HANDOFF | `atm handoff summarize` | `ContextSummary` | — |
| 7 | CLOSURE | `atm tasks close` | `ClosurePacket` | INV-ATM-005 / 006 / 007 |

關鍵設計：**每階都可被 doctor 偵測為「已完成」或「未完成」**。Agent 不能跳階。例如尚未 LOCK 就 EXECUTE 會被下一次 `atm next` 偵測到 `lock-before-edit` 失敗，引導回 LOCK。

### 4.1 ORIENT — 環境定位

```bash
node atm.mjs orient --cwd . --json
node atm.mjs doctor --cwd . --json
```

`orient` 的目標是回答「我在哪、這 repo 是什麼樣的」。它輸出的 `ProjectOrientationReport` 通常包含：

- **adapter status**：偵測到的 governance adapter（local-fs / git / 等）
- **no-touch zones**：禁止 ATM 自動寫入的路徑（adopter 可在 config 中宣告）
- **mutation policy**：對 `.atm/` 子目錄的寫入規則
- **governance files**：發現的 charter / registry / bundle 檔案
- **framework identity score**：判定是不是 framework repo 的分數（≥2 為 framework mode）

`doctor` 是 orient 的補集 — 它跑一連串守則檢查，每條檢查回傳 `{name, ok, reason?}`。常見檢查名包括：

- `lock-before-edit`：當前工作目錄是否有未鎖編輯
- `charter-integrity`：charter 與 invariants 的一致性
- `git-head-evidence`：closure packet 是否能對得上 git HEAD
- `registry-sole-source`：是否有第二個 registry 試圖出現
- `task-ledger-target-local`：framework 任務 ledger 是否留在 target-local

`doctor` 退出碼語意：0 = 全通過；非 0 = 至少一條失敗。失敗時退出物件會列出 `firstFailedCheck`，供下游決策。

### 4.2 NEXT — 路由決策

```bash
node atm.mjs next --json
node atm.mjs next --prompt "fix login bug" --json
node atm.mjs next --intent path/to/intent.json --json
```

`next` 是整個生命週期的**路由器**。它依下列順序決策：

1. 偵測 `cross-repo-target-required`（框架開發但未指定目標 repo）→ 引導補上目標
2. 解析 `--prompt` / `--intent` → 產出 `taskIntent`
3. 檢查 imported task queue → 是否有 prompt-scoped 任務需先處理
4. 讀 active guidance session → 若有，回傳該 session 的 nextAction
5. 跑 doctor → 若有失敗，把失敗轉成 nextAction（例如「執行 lock」）
6. Fallback：依 governance runtime 狀態回傳預設 bootstrap action

回傳的 `GuidanceNextAction` 結構大致是：

```json
{
  "status": "ready" | "blocked" | "needs-input",
  "command": "node atm.mjs lock acquire --workItem ...",
  "reason": "no scope lock for active workItem",
  "blockedBy": ["lock-before-edit"],
  "nextActionId": "ATM-NEXT-..."
}
```

Agent 收到後幾乎是「複製 `command` 字段、執行、再呼叫 `atm next`」的循環，直到 `status === "ready"` 且 command 是「結束」性質的指令（例如 `atm tasks close`）。

### 4.3 LOCK — 鎖定範圍

```bash
node atm.mjs lock check --workItem ATM-GOV-0104 --json
node atm.mjs lock acquire --workItem ATM-GOV-0104 --files src/foo.ts,src/bar.ts --json
node atm.mjs lock release --workItem ATM-GOV-0104 --json
```

`ScopeLockRecord` schema（`schemas/governance/scope-lock.schema.json`）必填欄位：

| 欄位 | 說明 |
|------|------|
| `schemaId` | 固定 `atm.governanceScopeLock` |
| `specVersion` | `0.1.0` 或 `0.2.0` |
| `workItemId` | 形如 `ATM-GOV-0104` |
| `lockedBy` | 持鎖者識別字串 |
| `lockedAt` | ISO date-time |
| `files` | 至少一個路徑、需 unique |
| `selectors` (v0.2.0) | 若鎖定的是 map members / edges / entrypoints，必填 |

`actorId`、`leaseId`、`heartbeatAt`、`ttlSeconds` 為可選欄位，支援 lease-based 鎖（會在 TTL 內定期 heartbeat，避免 agent crash 後鎖永久占用）。

INV-ATM-002 由 `doctor` 強制：未鎖編輯被偵測時，下一次 `atm next` 會回傳 `blocked`，要求先 release 衝突或 acquire 正確的鎖。

### 4.4 EXECUTE — 實際工作

ATM 不規定怎麼做工作 — 這階段交給 agent / 開發者使用各種工具（編輯器、CLI、IDE）。ATM 只在事後驗證：

- 編輯的檔案是否在鎖內？
- 是否誤觸 no-touch zone？
- 是否在執行過程中違反 INV-ATM-006（framework 任務的 ledger 寫到非 target-local 位置）？

這些檢查由下一階段（EVIDENCE / CLOSURE）的 doctor 守則來執行。

### 4.5 EVIDENCE — 證據沉澱

```bash
node atm.mjs evidence add --task ATM-GOV-0104 --actor codex-main \
    --kind test --summary "validator passed" --artifacts reports/governance.json --json
node atm.mjs evidence verify --task ATM-GOV-0104 --gate close --json
node atm.mjs evidence verify --task ATM-GOV-0104 --gate commit --json
node atm.mjs evidence verify --task ATM-GOV-0104 --gate pr --json
```

證據種類（kind）有：`test`、`artifact`、`attestation`、`review`、`commit`、`waiver`、`handoff`、`validation`、`metric`。

證據門檻（gate）規則：

| Gate | 規則 |
|------|------|
| `close` | 至少一筆非 waiver 證據 |
| `commit` | 至少一筆非 waiver 證據 + 至少一筆 verification 證據（test / artifact / attestation / commit） |
| `pr` | 至少一筆 `review` 證據 + 至少一筆 verification 證據 |

近期硬化（`85b92ce`）加入 **freshness** 概念：當任務被重開（reopened）時，先前的證據變成 `historical-reference`，不能再過 close gate。Adopter 必須收集新的證據才能再次 close。

### 4.6 HANDOFF — 交接摘要

```bash
node atm.mjs handoff summarize --task ATM-GOV-0104 --json
```

`ContextSummary` 包含當前任務的：

- 已完成 / 未完成步驟
- 已收集的證據摘要
- 仍有的 blockers
- 對接下來 agent 的提示（例如「下一步應該跑 `evidence verify --gate pr`」）

Handoff 主要是 LLM agent 之間（或同一 agent 跨 session）的上下文延續用。它本身不影響 closure 是否通過 — 但 closure packet 可以引用 handoff 路徑作為證據之一。

### 4.7 CLOSURE — 最終封閉

```bash
node atm.mjs tasks close --task ATM-GOV-0104 --actor codex-main --status done --json
```

Closure 是最嚴格的閘門。`tasks close --status done` 會：

1. 跑 `evidence verify --gate close`，若不通過直接拒絕。
2. 跑 `git-head-evidence` 守則，把 closure packet 內記錄的 commit / tree sha 與當前 git HEAD 對照（`5885aa3` 引入）。
3. 對 framework mode 任務，額外要求 framework gate provenance snapshot（`ae326ce` 引入）。
4. 對 reopened 任務，檢查所有證據都是 fresh（`85b92ce` 引入）。
5. 通過後寫出 `ClosurePacket` 到 `.atm/history/evidence/<taskId>/closure-packet.json`。

Closure packet 詳細結構見 §10。

### 4.8 為什麼七階、不多不少？

把生命週期拆成七階，有特定原因：

- ORIENT 與 NEXT 分開，是因為 orient 是「事實採集」、next 是「決策」。一份 orient report 可餵給不同決策器。
- LOCK 是獨立階段而非 EXECUTE 的開頭，是因為鎖是**可審計記錄**，必須單獨產出 artifact。
- EVIDENCE 與 CLOSURE 分開，是因為 evidence 可在執行中持續累積，CLOSURE 才是最終封閉動作。
- HANDOFF 是可選但獨立的階段，避免 closure 時夾帶大量 context 摘要而失焦。

實作上，後三階（EVIDENCE / HANDOFF / CLOSURE）共享同一個 evidence store，但 schema 不同。

---

## 第 5 章 — 原子註冊總表（可重生）

下表是當前 `atomic-registry.json` 的快照。修改原子需走 `atm-create` 與 INV-ATM-003 的 schema 驗證流程，不可直接編輯註冊表。

註冊表共 7 個 entry：5 個 `status: active` 的具名原子（本章主要對象），加 2 個 `status: draft` 的占位 entry（尚未分配 atomId / logicalName）。後者可能是正在進行中的 atomize 提案 — 它們不會出現在實際治理鏈中，但 renderer 為了忠實反映註冊表狀態仍會把它們渲染成「—」行。

<!-- atm:gen:registry -->
| atomId | logicalName | status | tier | specPath | hashLock (前 12 hex) |
| ------ | ----------- | ------ | ---- | -------- | -------------------- |
| ATM-CORE-0001 | atom.core-seed | active | governed | specs/atom-seed-spec.json | sha256:aac4866b7620 |
| ATM-CORE-0003 | atom.plugin-rule-guard.neutrality-scanner | active | governed | specs/neutrality-scanner.atom.json | sha256:c0ad6b7cc250 |
| ATM-CORE-0004 | atom.core-atom-generator | active | governed | atomic_workbench/atoms/ATM-CORE-0004/atom.spec.json | sha256:1060e14203d3 |
| ATM-FIXTURE-0001 | atom.fixture-generator-dogfood | active | standard | atomic_workbench/atoms/ATM-FIXTURE-0001/atom.spec.json | sha256:176400fc6677 |
| — | — | draft | standard | — | — |
| — | — | draft | standard | — | — |
| ATM-CORE-0005 | atom.core-atomic-spec-semantic-fingerprint | active | standard | atomic_workbench/atoms/ATM-CORE-0005/atom.spec.json | sha256:d7a08f9ad6e0 |

來源：`atomic-registry.json` (generatedAt: 2026-05-20T15:08:15.683Z)
<!-- atm:gen:registry:end -->

**說明欄位**：
- `tier` = `governed` 表示通過 INV-ATM-003 schema-validated promotion；其他 tier 預留給未來實驗性原子使用。
- `hashLock` 是規格內容的 sha256，搭配 canonicalization rule（`json-stable-v1`）確保跨平台 reproducible。
- `specPath` 指向原子的 source-of-record，註冊表本身不含規格內容只含指向。
- 完整欄位（owner、evidence、selfVerification、versions[]、semanticFingerprint）在 `atomic-registry.json` 內，本表只顯示常用 5 欄。

---

## 第 6 章 — 五原子深度剖析

本章對註冊中 5 個 active 原子作為治理單位的角色作完整描述（draft 占位 entry 不涵蓋）。閱讀順序建議：先 0001（身份基礎）→ 0004（如何造新原子）→ 0005（如何識別原子等價性）→ 0003（如何守邊界）→ FIXTURE-0001（自我驗證）。

### 6.1 ATM-CORE-0001 — atom.core-seed（種子自描述子）

**角色**：身份系統的根。它是 framework 中第一個被註冊、也是其他所有原子隱式參照的原子。

**輸入 / 輸出**：
- input: `seedSource`（file）
- outputs: `seedSpec`（file）+ `evidence`（evidence）

**規格摘錄**：
```
runtime: node >=20, local
adapter: standalone-seed
capabilities: filesystem, schema-validator, artifact-store, evidence-store
validation:
  - node packages/cli/src/atm.mjs spec --validate specs/atom-seed-spec.json
  - node scripts/validate-seed-spec.mjs --mode validate
```

**在生命週期哪一階觸發**：
- ORIENT：被 `orient` 引用為「framework 簽名」之一。Adopter 端不會偵測到 seed，因此 framework mode 不啟用。
- 任何階段：當需要分配新原子 ID 時（透過 ATM-CORE-0004），seed 提供 ID 序列基礎。

**與其他原子的關係**：
- 0001 是 0004 的依據：0004 在分配 ID 時，會檢查與 seed 的格式相容（`ATM-{BUCKET}-{NNNN}`，4 位數字、bucket 大寫）。
- 0001 被 0005 fingerprinted：0005 計算 spec 的 semantic fingerprint 時，0001 的 spec 是首批被計算與固化的對象。

**失效後果**：若 seed spec 雜湊改變且未經 charter waiver，`doctor` 的 `charter-integrity` 與 `registry-sole-source` 守則會回傳失敗。所有依賴 seed 的後續動作（新原子分配、註冊表寫入）都會被拒絕。

### 6.2 ATM-CORE-0003 — atom.plugin-rule-guard.neutrality-scanner（中性掃描器）

**角色**：邊界守門員。執行 INV-ATM-007 — 公開框架文件不可含 adopter 專屬名稱。

**輸入 / 輸出**：
- inputs: `repositoryRoot`（file）+ `neutralityPolicy`（file）
- outputs: `neutralityReport`（json）+ `evidence`（evidence）

**規格摘錄**：
```
runtime: node >=20, ci
adapter: local-fs-git
storage: git
validation:
  - npm run validate:neutrality
performance budget: maxDurationMs 1500（被設計為 CI fast-path）
tags: alpha0, neutrality, governance
```

**運作邏輯**：
- 讀 neutrality policy（一個 JSON 規則，列出禁止 token 與允許例外）。
- 掃 `docs/governance/` 與其他公開 surface 的 `.md` / `.json`。
- 若發現 adopter 專屬 token（例如某下游遊戲產品代號）、回傳 violation list。
- 對 violation 寫出 `neutralityReport`，可被 closure packet 引用。

**在生命週期哪一階觸發**：
- 主要是 CLOSURE 前的 `evidence verify --gate commit` / `--gate pr`，以及 PR 流程的 `npm run validate:neutrality` 步驟。
- ORIENT 也會輕量呼叫一次（不阻擋，只警示）。

**與其他原子的關係**：
- 對 0004 形成上游關卡：當 0004 要產出新原子並寫 spec 文件時，如 spec 引入 adopter token、會被 0003 攔下。
- 與 charter 緊密耦合：政策內容衍生自 INV-ATM-007，掃描器規則改動需走 charter waiver。

**失效後果**：若 0003 被禁用或繞過，framework repo 公開文件可能洩漏 adopter 私有資訊，違反開源中性承諾。`doctor` 的 `neutrality-scanner-active` 檢查確認此原子是否仍在守則組合中。

### 6.3 ATM-CORE-0004 — atom.core-atom-generator（原子生成器 / 供應介面）

**角色**：所有新原子的唯一誕生通道。對應 skill `atm-create`。

**輸入 / 輸出**：
- input: `request`（json） — 包含 `bucket`、`title`、`description`、`logicalNameHint` 等
- output: `result`（json） — 含分配的 atomId、scaffold 出的檔案清單、validation 結果

**規格摘錄**：
```
runtime: node >=20, local
adapter: local-fs
capabilities: filesystem, schema-validator, test-runner, evidence-store
compatibility: lifecycleMode: birth
validation:
  - node tests/core/atom-generator.test.mjs --self-check
performance budget: maxDurationMs 10000
tags: generated, provisioning
```

**運作步驟**（簡化）：
1. 接收請求、驗證 schema。
2. 在註冊表內找下一個可用 ID（依 bucket 排序）。
3. 在 `atomic_workbench/atoms/<atomId>/` 建立目錄與 4 個檔（spec / source / test / report 模板）。
4. 跑 spec validation。
5. 寫入註冊表（包含 `selfVerification` 的 spec/code/test 雜湊）。
6. 回傳整理過的 result。

**在生命週期哪一階觸發**：
- 任何階段，當任務範圍包含「需要新原子」時。
- INV-ATM-003 強制：直接編輯 `atomic-registry.json` 是禁止的，唯一合法路徑是透過 0004。

**與其他原子的關係**：
- 0001 提供 ID 格式與 namespace 基礎。
- 0005 在 0004 寫 spec 時被呼叫，計算 semanticFingerprint 並寫入註冊表記錄。
- 0003 對 0004 產出的 spec 與 markdown 進行中性掃描。
- FIXTURE-0001 是 0004 自身的 dogfood test fixture。

**失效後果**：若 0004 故障或被繞過，註冊表會 drift（出現未經 schema 驗證的條目）。`doctor` 的 `registry-sole-source` 守則會偵測 drift 並拒絕後續操作。

### 6.4 ATM-CORE-0005 — atom.core-atomic-spec-semantic-fingerprint（語意指紋）

**角色**：原子等價性與變更偵測的計算基礎。

**輸入 / 輸出**：
- input: `atomicSpecShape`（json）
- output: `semanticFingerprint`（text，形如 `sf:sha256:...`）

**規格摘錄**：
```
runtime: node >=24, local
migration strategy: additive（衍生自 atomize dry-run proposal）
validation:
  - node --experimental-strip-types atom.source.mjs --self-check
  - node --experimental-strip-types atom.test.ts
  - node --experimental-strip-types scripts/validate-core-spec-parser.ts --mode validate
mutabilityPolicy: mutable
deployScope: all-env
tags: atomize, semantic-fingerprint, readability-pilot
```

**設計目的**：兩個 spec 在格式上可能不同（例如欄位排序、whitespace），但語意等價。Semantic fingerprint 對 spec 做 canonicalization 後計算，等價 spec 會產生相同 fingerprint。

**用途**：
- 註冊表的 `semanticFingerprint` 欄位，標示「這個原子當前版本的語意身份」。
- 版本歷史中（`versions[]`）每個版本都有 fingerprint，可以快速找出哪兩個版本語意等價。
- `atm upgrade --scan` 在偵測升級候選時，用 fingerprint 對齊新舊版本。

**在生命週期哪一階觸發**：
- NEXT：當 next 需要決定「這個任務算不算等同於前一個」時。
- EVIDENCE：證據鏈中固化 fingerprint，下次 verify 時可確認 spec 未漂移。
- 0004 的 birth 流程：新原子寫入註冊表前計算 fingerprint。

**與其他原子的關係**：
- 0001 是它的首位「客戶」（為 seed 計算 fingerprint）。
- 0004 在每次生成原子時呼叫它。
- 0003 不直接呼叫它，但 0003 的 neutrality report 可以引用 spec fingerprint 作為證據錨點。

**失效後果**：若 0005 的演算法變更但未經 charter waiver，所有原子的 fingerprint 會 drift，註冊表記錄與計算結果不一致，`doctor` 會回傳 `fingerprint-mismatch`。

### 6.5 ATM-FIXTURE-0001 — atom.fixture-generator-dogfood（生成器自證 fixture）

**角色**：證明 0004 確實能產出合規原子的存在性測試。

**輸入 / 輸出**：
- input: `request`（json）
- output: `result`（json）

**規格摘錄**：
```
adapter: local-fs
validation:
  - node atomic_workbench/atoms/ATM-FIXTURE-0001/atom.source.mjs --self-check
performance budget: maxDurationMs 10000
tags: generated, provisioning
```

**設計目的**：FIXTURE-0001 是 ATM-CORE-0004 跑過一輪後產出的「示範產物」。它本身沒有獨立功能 — `--self-check` 只證明 0004 能完整走完 birth 流程。

**為什麼把它放進註冊表**：
- 註冊表的存在意義是審計，連 dogfood fixture 都正式記錄、可避免「我們真的能造原子嗎？」的不確定性。
- 若 0004 的演算法或介面變更導致它再也產不出 0001 等價的 fixture、fingerprint 會立刻 mismatch，問題在註冊表層面就被攔下。

**失效後果**：若 FIXTURE-0001 從註冊表中消失或 hashLock 對不上，意味著 0004 的 birth 流程已偏離原始 contract，需 charter waiver 才能繼續。

### 6.6 對「原子家族」的展望

目前 5 個 active 註冊原子分布：
- **Core/self-descriptor**：0001
- **Core/registry/fingerprint**：0005
- **Core/provisioning**：0004
- **Plugin/rule-guard**：0003
- **Fixture/test**：FIXTURE-0001

未來預期會擴展的方向（從 commit 軌跡與 docs 推斷）：
- `behavior.*` 行為當前在 `plugin-behavior-pack`，可能未來部分會 atomize 成獨立原子（split / merge / evolve / infect 各自獨立）。
- `closure-packet` 的產生器（目前在 `tasks close` 命令內部）可能 atomize 成 ATM-CORE-00NN 一員。
- `git-head-evidence` 守則（`5885aa3` commit）目前是 CLI 命令，未來可能上抽為原子以方便跨工具復用。

這些方向都需要走 0004 + 0003 + 0005 的合作流程才能進入註冊表。

---

## 第 7 章 — 行為類別總覽（可重生）

行為（behavior）是對原子做的事。ATM 把行為 ID 標準化、共享於 `plugin-behavior-pack`，避免出現「兩個 plugin 各自定義 `behavior.split` 但語意不同」的混淆。

<!-- atm:gen:behaviors -->
ATM keeps the public action ids stable, but the implementation surface is intentionally consolidated into `@ai-atomic-framework/plugin-behavior-pack`.

## Split Family

- `behavior.split`: split an existing governed atom into clearer bounded work without introducing legacy extraction semantics.
- `behavior.atomize`: extract a new atomic unit from broader or legacy material when decomposition creates a distinct managed atom.

## Merge Family

- `behavior.merge`: merge two governed atoms into one outcome.
- `behavior.dedup-merge`: merge while explicitly collapsing duplicates or overlap.
- `behavior.compose`: compose multiple governed units into a higher-level assembled result without claiming semantic deduplication.

## Evolution Family

- `behavior.evolve`: in-place governed evolution of one atom version to the next.
- `behavior.polymorphize`: keep the governed identity but shift to a variant or alternate presentation mode.

## Lifecycle Family

- `behavior.expire`: formally retire an atom from active use.
- `behavior.sweep`: clean up obsolete governed residue, references, or temporary byproducts.

## Propagation Family

- `behavior.infect`: propagate a governed change into downstream dependents under explicit review and neutrality controls.

## Taxonomy Rules

- Keep the existing action ids for compatibility.
- Add new implementation detail inside the consolidated behavior pack before creating any new publishable behavior package.
- Choose `atomize` only when a new independently governed unit is born; otherwise prefer `split`.
- Choose `dedup-merge` only when de-duplication is the reason for the merge; otherwise prefer `merge` or `compose`.
- Choose `polymorphize` only when the semantic identity stays intact while the variant changes; otherwise prefer `evolve`.
- Choose `sweep` for cleanup and residue management; choose `expire` for lifecycle closure.

來源：`docs/governance/behavior-taxonomy.md`
<!-- atm:gen:behaviors:end -->

### 7.1 為什麼要把行為集中

最初版本的 ATM 把每種行為實作成獨立 plugin package。實務中發現幾個問題：

- 行為間的不變式（例如「split 後兩個原子的 fingerprint 不可同時等於原始原子」）需要跨 plugin 強制，跨 package 邊界很難。
- Action ID 在不同 plugin 中重名容易出現語意漂移。
- Adopter 端對 behavior pack 的 audit surface 過於零散。

集中後（`plugin-behavior-pack`）：
- ID 仍然穩定，外部 API 不變。
- 內部實作共享 spec parser、registry handle、evidence emit。
- 跨家族 invariant 容易檢查（例如 split 不能同時 dedup-merge）。

### 7.2 與原子的關係

- 行為 ID 是「動詞」，原子 ID 是「名詞」。任何 governed 變更都是「對某些原子 ID 跑某個 behavior ID」。
- 每次跑行為都會產生 `UpgradeProposal`（schema 在 `schemas/governance/`）。Proposal 通過 INV-ATM-003 的自動 gate 才會 promote 到註冊表。
- 行為的 evidence 落點與一般任務一致（`.atm/history/evidence/`），但內容 schema 不同（會帶 behavior-specific 欄位例如 `decompositionPlan`、`mapEquivalenceReport`）。

### 7.3 行為與 charter waiver

當行為違反某條 invariant 時（例如 `behavior.evolve` 改動 charter §3 的 agent entry point），會觸發 `charterWaiver` 路徑：

1. Proposal 中加 `charterWaiver` block 並引用 invariant ID。
2. 走 `HumanReviewDecision` 流程取得人類批准。
3. 通過後才 promote，且 charterVersion major bump。

這個機制讓「無法繞過的紅線」與「可在審批下調整的紅線」分開：所有 invariant 在預設情況下不可變，但**可變但成本高**。

---

## 第 8 章 — Charter Invariants 完整解釋（可重生）

Charter 是 framework 的最高權威（高於 host project rules、高於 single-agent overlay）。Invariants 是 charter 中以機器可讀格式（`charter-invariants.json`）固化的不可變紅線。本章逐條解釋。

<!-- atm:gen:invariants -->
**Charter 版本**：2.0.0  
**最後修訂**：2026-05-19T00:00:00.000Z  
**Schema**：`atm.charterInvariants` / atm.invariants.v0.1  
**Invariants 數**：7

| ID | Title | Enforcement | Breaking | Tags |
|----|-------|-------------|----------|------|
| INV-ATM-001 | No second registry | gate | yes | registry, core-boundary |
| INV-ATM-002 | Lock before edit | doctor | no | lock, governance, default-guard |
| INV-ATM-003 | Schema-validated promotion only | gate | yes | upgrade, registry, schema |
| INV-ATM-004 | No competing highest authority | doctor | yes | charter, authority |
| INV-ATM-005 | Host rule amendments require waiver flow | waiver-required | no | charter, host-rules, waiver |
| INV-ATM-006 | Framework work tracking stays target-local | doctor | yes | framework-boundary, work-tracking, task-ledger |
| INV-ATM-007 | Public framework docs remain English-only | doctor | yes | documentation, open-source, public-surface, neutrality |

#### INV-ATM-001 — No second registry

> A host project must not create a second AtomicRegistry implementation outside of packages/core or introduce a parallel ID allocation, version tracking, or registry promotion path.

**Rationale**：A second registry would split the source of truth for atom identity and lifecycle, making cross-tool governance impossible.

#### INV-ATM-002 — Lock before edit

> No governed file mutation may occur without a valid ScopeLock recorded in .atm/locks/ for the current WorkItem. Agents must call atm lock before editing files.

**Rationale**：Scope locks are the primary contention signal that lets multiple agents or humans work in the same repository without stepping on each other.

#### INV-ATM-003 — Schema-validated promotion only

> An UpgradeProposal must pass all automatedGates (including JSON Schema validation) before promotion. Direct registry mutation that bypasses the UpgradeProposal path is forbidden.

**Rationale**：Schema validation gates are the deterministic backbone that makes ATM governance auditable and reproducible.

#### INV-ATM-004 — No competing highest authority

> No host project rule, profile, or configuration may declare itself to have authority equal to or higher than the AtomicCharter. Any rule that contradicts an invariant must go through a charter waiver proposal.

**Rationale**：A single authoritative charter is what makes ATM composable across different host projects with different conventions.

#### INV-ATM-005 — Host rule amendments require waiver flow

> When a host project rule conflicts with a charter invariant, the host must submit a behavior.evolve UpgradeProposal with a charterWaiver field and a linked HumanReviewDecision. Silent override is not permitted.

**Rationale**：Making conflict resolution explicit and auditable prevents silent governance drift across projects that adopt ATM.

#### INV-ATM-006 — Framework work tracking stays target-local

> The framework repository must not host downstream adopter planning queues or project-specific work tracking artifacts. ATM framework-development tasks may live in the framework repository only as ATM-managed .atm/history/tasks ledger records with CLI transition evidence.

**Rationale**：ATM should not absorb adopter project management, but framework-development needs target-local task evidence so AI agents cannot close framework work from a separate planning workspace without target repository authority.

#### INV-ATM-007 — Public framework docs remain English-only

> Public contributor-facing documentation in the framework repository must remain English-only and repository-neutral. Non-English planning notes, local experiments, or downstream operating guidance must live in the coordinating host workspace unless they are translated into neutral English framework documentation.

**Rationale**：ATM's framework repository is a public open-source surface. Keeping its contributor-facing documentation English-only and neutral preserves accessibility, reviewability, and downstream portability.

來源：`.atm/charter/charter-invariants.json` / `.atm/charter/atomic-charter.md`
<!-- atm:gen:invariants:end -->

### 8.1 三種 enforcement 機制

7 條 invariants 不是用同一機制執行 — 區分為三種：

**Gate（gate-enforced）**：違反就直接拒絕、退出碼非 0。INV-001 與 INV-003 屬此類。Gate 對應 schema validator 與 registry promote 流程，無法事後補救。

**Doctor（doctor-enforced）**：違反不會立即終止，但下次 `atm next` 或 `atm doctor` 會回傳失敗狀態，引導 agent 修復。INV-002、INV-004、INV-006、INV-007 屬此類。Doctor 是 advisory but persistent — 不修復就無法繼續往下走。

**Waiver-required**：違反需走 charter waiver 流程（`behavior.evolve` + `charterWaiver` + `HumanReviewDecision`）。INV-005 直接就是「描述 waiver 流程本身」的 invariant。

三種機制的選擇基於違反成本與修復難度。Gate 用於「違反代價不可逆」的場合（如註冊表 drift），doctor 用於「違反可修復但需引導」的場合，waiver 用於「合法但例外」的場合。

### 8.2 invariants 在不同模式下的差異

如 §1.2 所述，framework mode 與 adopter mode 共用同一個 onefile，但 invariant 的觸發點略有差異：

| Invariant | Framework mode | Adopter mode |
|-----------|---------------|--------------|
| INV-001 | 主要：保護 `atomic-registry.json` | 同左（adopter 可有 local registry 但不可第二 registry） |
| INV-002 | 嚴格 | 嚴格 |
| INV-003 | 嚴格 | 嚴格 |
| INV-004 | 嚴格 | 嚴格（但 adopter 自己的 profile 仍須臣服 charter） |
| INV-005 | 嚴格 | 主要在此 — adopter 與 framework rule 衝突需 waiver |
| INV-006 | 主要：framework 任務 ledger 必須留在 framework repo `.atm/` | adopter 自己的任務 ledger 走自己的儲存策略 |
| INV-007 | 主要：framework 公開文件必須英文 | adopter 可自由選擇語言（本文件即為例證） |

### 8.3 為什麼是 7 條、不是 17 條

ATM 對 invariant 數量有意保持簡短。原則是：

1. 每條 invariant 必須能被 doctor 或 gate 機器化檢查。語意模糊（「程式碼要好讀」）不適合做 invariant。
2. 每條 invariant 必須在實務中已經出現過違反案例。沒踩過的紅線不畫。
3. 違反成本必須足夠高、值得寫死。低成本的偏好走 docs / profile / overlay，不上 invariant。

從 commit 軌跡看，invariant 數量是漸增的（最初版本只有 4 條）。每次新增都伴隨 charter version bump 與 RFC 文件，避免 invariant 過度膨脹。

---

## 第 9 章 — 跨倉部署機制

本章描述 framework repo 如何把自己「投射」到 adopter repo。

### 9.1 部署單位：onefile runner

部署的核心 artifact 是 `release/atm-onefile/atm.mjs`，由 framework 端的 npm build 產生：

```
npm run build
  └─> node --strip-types ../../scripts/build-package-dist.ts --package packages/cli
      └─> 將 packages/cli + 依賴的 packages/core / packages/plugin-* bundle 成單檔
      └─> 寫入 release/atm-onefile/atm.mjs (約 3.1MB)
```

Onefile 是 strip-types 結果（TypeScript 移除 type 標註後的 JS），可直接被 Node ≥20 執行。它包含所有 CLI 命令、所有預設 plugin 實作、所有 schemas 內嵌資料。

### 9.2 部署指令：internal-release sync

```bash
node release/atm-onefile/atm.mjs internal-release sync \
    --repo /path/to/adopter-a \
    --repo /path/to/adopter-b \
    --skip adopter-b \
    --json
```

可用旗標（依 `internal-release.ts` parseInternalReleaseSyncOptions）：

| 旗標 | 預設 | 說明 |
|------|------|------|
| `--cwd` / `--framework-root` | `process.cwd()` | framework repo 根 |
| `--repo <path>` | — | adopter 路徑（可多次指定） |
| `--skip <name-or-path>` / `--exclude` | — | 跳過的 adopter（依 basename 或絕對路徑） |
| `--build` / `--no-build` | true | 是否在 sync 前先跑 npm run build |
| `--dry-run` | false | 只計算不寫入 |
| `--verify` / `--no-verify` | true | sync 後是否跑 doctor / framework-mode / tasks audit |
| `--allow-verify-failure` | false | verify 失敗時是否仍視為成功 |
| `--source <path>` | `release/atm-onefile/atm.mjs` | 自訂 source 路徑 |
| `--keep-temp` | false | 是否保留 adopter 端 scratch 目錄 |

### 9.3 對 adopter 的副作用

對每個目標 adopter，sync 會：

1. **Scratch guard 清理**：刪除 adopter 端的 `scratch/atm-build-repo` 與 `scratch/atm-upstream-patch`（除非 `--keep-temp`）。
2. **計算前一個 runner 的 sha256**（若存在）。
3. **備份既有 runner**（若存在）到 `.atm/history/reports/internal-release-sync/<runId>/atm.mjs.previous`。
4. **檢查 `.atm/config.json`**（若不存在則加 warning，但不阻止 sync）。
5. **複製新 runner** 到 adopter 的 `atm.mjs`。
6. **寫入 metadata** 到 `.atm/runtime/pinned-runner.json`：
   ```json
   {
     "schemaVersion": "atm.pinnedRunner.v0.1",
     "runnerPath": "atm.mjs",
     "metadataPath": ".atm/runtime/pinned-runner.json",
     "command": "node atm.mjs next --json",
     "status": "installed" | "replaced",
     "sourceKind": "internal-build-sync",
     "sourcePath": "<source 路徑>",
     "sha256": "<新 runner 雜湊>",
     "existingSha256": "<舊 runner 雜湊或 null>",
     "sizeBytes": <整數>,
     "frameworkVersion": "<framework version>",
     "sourceCommit": "<framework HEAD commit 或 null>",
     "generatedAt": "<ISO timestamp>"
   }
   ```
7. **跑 verification**（除非 `--no-verify` 或 `--dry-run`）：
   - `node atm.mjs doctor --json`
   - `node atm.mjs framework-mode status --json`
   - `node atm.mjs tasks audit --json`

每一步都會在最終 `SyncTargetReport` 中記錄。

### 9.4 為什麼不同步整個 .atm/？

部署只動兩個檔（`atm.mjs` + `.atm/runtime/pinned-runner.json`）。`.atm/` 其餘部分（locks / history / catalog / runtime/rules / runtime/state）完全屬於 adopter，不被 sync 覆蓋。

設計理由：
- `.atm/history/` 是 adopter 的審計鏈，覆寫 = 抹掉證據。
- `.atm/runtime/locks/` 是當前進行中的工作，覆寫 = 中斷現場。
- `.atm/catalog/` 是 adopter 的本地原子目錄，與 framework registry 雖共享格式但內容不同。

所以 sync 的精準範圍是：「**程式碼層**升級（runner 二進位）」與「**元資料層**標記（pinned-runner.json）」。**資料層**（adopter 的治理狀態）完全不動。

### 9.5 Skip / exclude 規則

`--skip` 比對邏輯（`internal-release.ts` 的 skip matcher）：

- 若 skip 值是絕對路徑：與 adopter 解析後的絕對路徑 case-insensitive 比對。
- 若 skip 值不含路徑分隔符：與 adopter 的 basename case-insensitive 比對。

例：`--skip my-game` 會跳過任何路徑結尾為 `my-game/` 的 adopter；`--skip /abs/path/to/repo` 只跳過該確切路徑。

被 skip 的 adopter 在報告中保留條目但 `skipped: true`、`skipReason: '<reason>'`，便於 audit。

### 9.6 為什麼是 push、不是 pull

ATM 不維護 adopter 清單，也不提供「adopter 主動拉取最新 framework」的機制（如 `npm update`）。每次升級必須由 framework 維運者（或自動化）顯式列出 `--repo`。

這個取捨的好處：
- Framework 不必知道誰在用它。
- 沒有「自動升級造成破壞」的風險。
- 每次升級在 framework repo 與 adopter repo 雙端都留下 commit / metadata 紀錄。

代價：升級需要操作者明確知道目標清單。實務上這個清單通常由公司內部的 deployment manifest 維護，不寫進 framework source（INV-ATM-004 / INV-ATM-006 隱含禁止）。

### 9.7 失敗模式與緩解

| 失敗 | 偵測 | 緩解 |
|------|------|------|
| Adopter 不存在 | `existsSync(repoPath)` 失敗 | 報告 `target repo does not exist`、跳過 |
| Scratch 清理失敗 | `scratchGuard.ok === false` | 報告 `target ATM scratch cleanup failed`、不繼續 sync 該 adopter |
| 既有 runner 與計畫的相同 | `existingSha256 === sourceSha256` | metadata 仍寫入但 status 顯示為相同雜湊；無破壞 |
| Verification 失敗 | `doctor` 或 `audit` 退出碼非 0 | 整個 adopter 標為 `ok: false`，除非 `--allow-verify-failure` |
| Backup 寫入失敗 | mkdir / copyFileSync 拋例外 | 例外冒泡至 CLI 層、整個 sync 失敗 |

所有失敗在最終 JSON 報告的 `failedTargets[]` 中列出，可作為下一輪修復的輸入。

---

## 第 10 章 — 證據與閉合契約

### 10.1 證據 schema

證據的根 schema 是 `schemas/governance/evidence.schema.json`，每筆證據需有：

```
evidenceKind: "validation" | "review" | "metric" | "handoff"
   ※ 上述 4 種是 governance-bundle 用的最小集合；
     evidence add CLI 還支援更細的 kind:
     test / artifact / attestation / review / commit / waiver / handoff / validation / metric
summary: string
artifactPaths: string[]   ※ repo-relative
```

「verification 證據」子集合（commit / pr gate 要的）是：
- `test`
- `artifact`
- `attestation`
- `commit`

詳細 typed payloads 見 `schemas/governance/evidence/*.schema.json`，包括 `usage-feedback`、`quality-baseline`、`quality-comparison`、`rollback-proof` 等。

### 10.2 Gate 規則的完整語意

```
Gate close:
  count(evidence where kind != "waiver") >= 1

Gate commit:
  count(evidence where kind != "waiver") >= 1
  AND
  count(evidence where kind in {test, artifact, attestation, commit}) >= 1

Gate pr:
  count(evidence where kind == "review") >= 1
  AND
  count(evidence where kind in {test, artifact, attestation, commit}) >= 1
```

`waiver` 證據是逃生口 — 在無法取得正常證據（例如緊急修復、需先 ship 後補測）時可放一筆 waiver 並由人類批准。但 waiver 不能用於滿足 close / commit / pr gate 的「verification」要求。

### 10.3 Freshness 規則（`85b92ce` 引入）

當任務從 `done` / `verified` 被重開（reopen）回到 `running`：

- 所有先前的證據被標記為 `historical-reference`。
- Close gate 計算時，只計入「重開時間之後」的證據。
- Doctor 的 `evidence-freshness` 守則檢查任一 active 證據是否 fresh，否則回報失敗。

設計動機：防止「先 close 一個任務、之後悄悄重開做更動、再用舊證據 close」的繞道行為。每次重開都會迫使重新證據沉澱。

### 10.4 Closure packet schema 詳解

完整 schema 在 `schemas/governance/closure-packet.schema.json`：

```json
{
  "schemaId": "atm.closurePacket.v1",
  "specVersion": "0.1.0",
  "taskId": "ATM-GOV-0104",
  "targetRepoIdentity": {
    "isFrameworkRepo": true,
    "score": 3,
    "root": "C:/Users/User/AI-Atomic-Framework",
    "name": "ai-atomic-framework",
    "signals": ["atomic-registry.json", "packages/core", ".atm/charter"]
  },
  "targetCommit": "b1e64dd...",
  "governedTreeSha": "abc123...",
  "closedByCommand": "atm tasks close",
  "commandRuns": [
    {
      "command": "node atm.mjs evidence verify --gate close",
      "cwd": "C:/Users/User/AI-Atomic-Framework",
      "exitCode": 0,
      "stdoutSha256": "sha256:...",
      "stderrSha256": "sha256:...",
      "runnerVersion": "0.1.0"
    }
  ],
  "requiredGates": ["close", "neutrality-scan", "git-head-evidence"],
  "evidencePath": ".atm/history/evidence/ATM-GOV-0104",
  "closedAt": "2026-05-24T12:00:00.000Z",
  "closedByActor": "codex-main"
}
```

關鍵欄位：

- **`targetRepoIdentity.isFrameworkRepo: true`**：本 schema v1 目前**強制**此值為 true，這意味本 schema 專為 framework mode closure 設計。Adopter mode closure 走另一條路徑（schema 預期擴展中）。
- **`targetRepoIdentity.score >= 2`**：必須至少有 2 個 framework signal 命中，避免誤判。
- **`targetCommit` / `governedTreeSha`**：git HEAD 與 governed-tree 雜湊，用於 `git-head-evidence` 守則。
- **`commandRuns[].stdoutSha256` / `stderrSha256`**：每筆命令輸出的雜湊，可重放比對。
- **`requiredGates[]`**：本次 closure 須通過的 gate 清單。實際通過的 gate 由 commandRuns 證明。

### 10.5 Closure provenance snapshot（`ae326ce` 引入）

近期 hardening 加入了 framework gate provenance：closure packet 內額外快照「該 gate 通過時 framework 的當下狀態」，包括：

- charter version
- registry generatedAt
- 主要 framework signal 雜湊

這讓「過去某個 closure 是在 framework 哪一版本下通過的」變成事後可查的事實。當 charter 升級導致先前的 closure 不再符合新規時，可透過 provenance 確認該 closure 在它通過時是合規的。

### 10.6 Git-head cross-check（`5885aa3` 引入）

`git-head-evidence` 守則的作用：

```
1. 讀 closure packet 的 targetCommit。
2. 跑 git rev-parse HEAD，取得當前 HEAD。
3. 若兩者不相等：
   - 檢查 HEAD 是否是 targetCommit 的後續（ancestor 關係）。
   - 若是：通過（後續變更不影響歷史 closure）。
   - 若否：失敗，且 doctor 引導修復（rebase / 重新 close）。
4. 跑 git ls-tree -r HEAD | sha256sum，比對 governedTreeSha。
   - 不相等：失敗（governed file 被未授權變更）。
```

這個守則的存在讓「closure packet 描述的狀態 vs 實際 repo 狀態」之間不能漂移。

### 10.7 證據與 closure 的因果鏈

從 evidence add 到 closure 的因果鏈：

```
evidence add ──► .atm/history/evidence/<taskId>/<recordId>.json
                  │
                  │ evidence verify --gate close 讀取
                  ▼
                check freshness, gate rules
                  │
                  │ 通過
                  ▼
              tasks close --task <taskId> 觸發
                  │
                  ▼
              收集 commandRuns（含 verify 自身）
                  │
                  ▼
              計算 targetRepoIdentity, targetCommit, governedTreeSha
                  │
                  ▼
              寫入 .atm/history/evidence/<taskId>/closure-packet.json
                  │
                  │ git commit 引用 closure packet 路徑
                  ▼
              audit-friendly：任何時間都可 replay 上述命令、雜湊比對
```

審計者只要：
1. 拿 closure packet。
2. 重跑 `commandRuns[]` 中每條命令。
3. 比對 stdout/stderr sha256。

如果都對得上，這個 closure 就是 byte-for-byte reproducible 的。

---

## 第 11 章 — 多角度分析（五視角）

本章從五個獨立視角審視同一套機制。每個視角解答一個核心問題，並指出視角間的張力。

### 11.1 控制流視角

**核心問題**：一個 agent 從 prompt 到 closure 會經過哪些決策節點？哪裡會被阻擋？

**主要決策節點**（依 `next.ts` 路由邏輯）：

```
┌──────────────────────────────────────────────────────────┐
│  agent.invocation                                        │
│  └─ node atm.mjs next [--prompt P | --intent I] --json   │
└──────────────────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │ inspectIntegration  │ ← 整合 plugin (claude-code, copilot, ...)
   │  Bootstrap?         │   bootstrap 是否完成？
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │ inspectRuntime      │ ← 偵測 governance adapter
   │  AdapterReadiness   │   是否準備好？
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │ resolveTaskIntent   │ ← --prompt 或 --intent
   │  (atm-task-intent-  │
   │  resolver)          │
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ earlyFrameworkStatus mode?  │
   │  ├─ cross-repo-target-      │ → blocked，要求補上目標 repo
   │  │  required                │
   │  └─ framework-* / adopter   │
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ --claim flag?               │ → 走 claimNextImportedTask
   │                             │
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ promptScopeResult / prompt  │ → 若 prompt 已被解析為 scoped 任務，回傳
   │  GuidanceNextResult         │
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ readActiveGuidanceSession   │ → 若有 active session，回傳該 session 的 nextAction
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ runDoctor                   │ → 若 doctor 失敗，把第一條失敗轉成 nextAction
   │  detectGovernanceRuntime    │
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ decideNextAction (fallback) │ → 依 governance runtime 預設動作
   └─────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────┐
   │ buildNextMessages + result  │
   └─────────────────────────────┘
```

**阻擋點**：

| 阻擋條件 | 失敗指示 | 修復路徑 |
|---------|---------|---------|
| 未 bootstrap | `integrationBootstrap.ok === false` | 跑 `atm bootstrap` |
| Adapter 未就緒 | `runtimeAdapterReadiness.ready === false` | 修 `.atm/config.json` |
| 缺 target repo（框架開發跨 repo 場景） | `frameworkStatus.mode === "cross-repo-target-required"` | 提供 `--target` |
| Doctor 守則失敗 | `doctorChecks[i].ok === false` | 依守則名稱修復（lock-before-edit / charter-integrity / ...） |
| Task queue blocked | `nextAction.status === "blocked"` | 依 blockedBy 修復 |

從控制流看，ATM 的設計哲學是「**讓 agent 不可能不知道下一步要做什麼**」。每個阻擋都會被翻譯成具體 CLI 指令字串，agent 只需執行即可推進。

### 11.2 資料流視角

**核心問題**：證據如何從 runtime 沉澱到 history 再進入 closure packet？雜湊如何串接？

```
┌────────────────────────┐
│  Source data (raw)     │
│  - npm test output     │
│  - build artifacts     │
│  - git diff            │
│  - reviewer's comment  │
└────────────────────────┘
            │
            │ adopter tool produces
            ▼
┌────────────────────────────────────┐
│  .atm/runtime/state/<task>/...     │  ← 暫存區（可被 sweep）
└────────────────────────────────────┘
            │
            │ atm evidence add
            ▼
┌────────────────────────────────────┐
│  .atm/history/evidence/<task>/     │  ← 永久 ledger
│   <evidenceId>.json                │
│   {                                │
│     evidenceKind, summary,         │
│     artifactPaths[],               │
│     createdAt, createdBy           │
│   }                                │
└────────────────────────────────────┘
            │
            │ atm evidence verify --gate close
            ▼
┌────────────────────────────────────┐
│  EvidenceGateResult                │  ← 計算結果（in-memory）
│   { passed, failures[],            │
│     applicableEvidence[] }         │
└────────────────────────────────────┘
            │
            │ atm tasks close
            ▼
┌────────────────────────────────────┐
│  Closure packet                    │  ← 最終封包
│   - commandRuns[] (含 verify 自身) │
│   - stdoutSha256, stderrSha256     │
│   - targetCommit, governedTreeSha  │
│   - evidencePath                   │
│   - requiredGates[]                │
└────────────────────────────────────┘
            │
            │ git commit reference
            ▼
┌────────────────────────────────────┐
│  Git history                       │
│   commit message 引用 closure path │
└────────────────────────────────────┘
```

**雜湊串接**：
- commandRuns[i].stdoutSha256 / stderrSha256：每筆命令輸出的雜湊
- targetCommit：包含 closure packet 的 commit（packet 路徑寫進 commit msg）
- governedTreeSha：git ls-tree 計算的子樹雜湊
- atomic-registry 中各原子的 hashLock：spec / code / test 雜湊

這些雜湊形成「**內外雙鏈**」：

- 內鏈（packet 自己內部）：commandRuns 之間透過 cwd 與 runnerVersion 串
- 外鏈（packet 與 repo 狀態）：targetCommit / governedTreeSha 把 packet 釘到 git 上

任何鏈中環節被竄改，下次 audit 都會偵測到不一致。

### 11.3 信任邊界視角

**核心問題**：framework 與 adopter 各自能改什麼？哪些是可審計提交、哪些是運行時狀態？

```
┌─────────────────────────────────────────────────────────┐
│ Framework repo (source of truth)                         │
│  ├─ packages/core/         ← FRAMEWORK 可改，adopter 不可│
│  ├─ packages/cli/          ← FRAMEWORK 可改             │
│  ├─ packages/plugin-*/     ← FRAMEWORK 可改             │
│  ├─ schemas/governance/    ← FRAMEWORK 可改（受 INV-003）│
│  ├─ docs/governance/       ← FRAMEWORK 可改（受 INV-007）│
│  ├─ atomic-registry.json   ← 只能透過 0004 改（INV-001/3）│
│  ├─ .atm/charter/          ← 改動需 charterVersion bump  │
│  └─ release/atm-onefile/   ← npm run build 的產出       │
└─────────────────────────────────────────────────────────┘
                    │
                    │ internal-release sync (push-based)
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Adopter repo                                             │
│  ├─ atm.mjs                ← FRAMEWORK 寫入（runner）   │
│  ├─ .atm/runtime/pinned-runner.json ← FRAMEWORK 寫入    │
│  ├─ .atm/charter/          ← FRAMEWORK 寫入（複製 charter）│
│  ├─ .atm/config.json       ← ADOPTER 自管               │
│  ├─ .atm/runtime/locks/    ← ADOPTER agent 寫入         │
│  ├─ .atm/runtime/rules/    ← ATM CLI 寫入（rule guard）  │
│  ├─ .atm/runtime/state/    ← ADOPTER agent 寫入         │
│  ├─ .atm/history/tasks/    ← ATM CLI 寫入（ledger）     │
│  ├─ .atm/history/evidence/ ← ATM CLI 寫入（永久）       │
│  ├─ .atm/history/reports/  ← ATM CLI 寫入               │
│  ├─ .atm/history/handoff/  ← ATM CLI 寫入               │
│  └─ .atm/catalog/          ← ADOPTER 自管（local atoms）│
│  其他應用程式碼            ← ADOPTER 自管               │
└─────────────────────────────────────────────────────────┘
```

**信任邊界三層**：

- **L1（不可變）**：framework 程式碼、schemas、charter。Adopter 完全不能寫入這些。
- **L2（runner 同步來）**：adopter 的 `atm.mjs` 與 `.atm/charter/`。由 framework 端 sync 寫入；adopter 不應手動編輯。
- **L3（adopter 自管）**：應用程式碼、`.atm/config.json`、`.atm/catalog/`。Adopter 完全擁有。
- **L4（CLI 寫入）**：`.atm/history/` 與 `.atm/runtime/` 的大多數子目錄。Adopter agent 透過 ATM CLI 間接寫入；不應手動編輯。

`d072e59`、`dc08110` 等近期 commit 加強了 L4 — `block manual ATM protected state edits` 守則會偵測手動編輯（透過 mtime / hash 對比），手動編輯會被視為 governance violation。

### 11.4 故障與復原視角

**核心問題**：當某條 invariant 被踩、closure 證據與 git HEAD 不符時，系統如何拒絕並引導 agent 修復？

**復原模式**：

ATM 沒有「災難自動恢復」的設計 — 它的故障處理策略是「**讓故障可見、引導人類或 agent 走可審計修復**」。

故障的可見性分三層：

- **CLI 退出碼**：每條命令失敗時退出碼非 0，CI 一律可偵測。
- **JSON evidence 欄位**：所有 CLI 都接受 `--json`，回傳結構化失敗物件。
- **Doctor 守則名稱**：失敗時回傳 `firstFailedCheck.name`，agent 可依名稱查表得知修復路徑。

**修復路徑表**（節選）：

| 守則名稱 | 失敗意義 | 修復步驟 |
|---------|---------|---------|
| `lock-before-edit` | 偵測到未鎖編輯 | `atm lock acquire --files <list>` 或 release 不該鎖的範圍 |
| `charter-integrity` | charter 與 invariants.json 不同步 | 對齊 charterVersion 與 lastAmendedAt |
| `registry-sole-source` | 偵測到第二 registry 嘗試出現 | 移除二級 registry 檔案 |
| `task-ledger-target-local` | framework 任務 ledger 寫到非 target-local | 移動 ledger 到 `.atm/history/tasks/` |
| `evidence-freshness` | 任務重開後仍用舊證據 | 重新收集 fresh evidence |
| `git-head-evidence` | closure packet 與 git HEAD 不符 | rebase 或重新 close |
| `neutrality-scanner-active` | 中性掃描器被禁用 | 啟用守則組合 |
| `framework-gate-provenance` | closure packet 缺 framework gate snapshot | 走 `tasks close` 重新封閉 |

**死鎖避免**：因為每條守則都有具體修復路徑，agent 不會卡在「不知道怎麼修」。

### 11.5 演化與治理增量視角

**核心問題**：INV 要修改怎麼辦？charter waiver 流程；近 5 commits 揭露的硬化方向。

**Charter 演化路徑**（charter.md §4）：

非 invariant 修改：
1. 編輯 charter.md 與 charter-invariants.json。
2. 更新 charterVersion（minor bump）與 lastAmendedAt。
3. 透過 `atm handoff summarize` commit 證據。

Invariant 修改或移除（breaking change）：
1. 開 `UpgradeProposal`（`behaviorId: "behavior.evolve"`）。
2. 加 `charterWaiver` block 引用 invariant ID。
3. 取得 `HumanReviewDecision`。
4. charterVersion major bump。

**近期硬化方向觀察**（從 commit message 推斷）：

- **`d0b630a`、`10b915d`、`f92013f`、`af03789`**（push guard / legacy baseline）：保護分支推送安全控制。把 git push 加入治理邊界。
- **`b1e64dd`**（queue scope hardening + static evidence gates）：任務佇列範圍進一步收緊，靜態（compile-time）證據門檻加上。
- **`ae326ce`**（framework gate provenance in closure events）：closure packet 內嵌 framework gate snapshot。
- **`5885aa3`**（git-head evidence cross-check）：closure packet 與 git HEAD 強制對齊。
- **`4c503b8`**（formalize framework closure contract）：closure packet 升格為一等契約。
- **`85b92ce`**（fresh closure evidence for reopened work）：證據新鮮度概念引入。
- **`d072e59`**（harden task claim lifecycle and lock cleanup）：task claim 生命週期加固。
- **`dc08110`**（block manual ATM protected state edits）：手動編輯 `.atm/` 保護狀態被攔下。

**演化方向總結**：所有近期變更都是**收緊**（更多 provenance、更多 check、更難繞道），而非**放寬**。這顯示 framework 目前處於「閉合契約」階段而非「擴展功能」階段。

**未來可能演化**（基於既有 docs 推測）：
- closure packet 從 v1 擴展到 v2，可能加入 adopter mode 變體。
- behavior 從 plugin-behavior-pack 中部分 atomize 成獨立原子。
- guard engine 從目前 thin profile 演化為可組合的中等複雜度（見 `docs/governance/guard-engine-thin-profile.md`）。

### 11.6 視角間的張力

五視角間有幾個值得注意的張力點：

- **控制流 vs 故障/復原**：控制流要求 agent 走完整七階；故障時可能需要跳階修復。ATM 的解法是把「跳階」也建模成 nextAction（例如直接跳到 evidence verify），不破壞線性敘事。
- **資料流 vs 信任邊界**：資料流希望雜湊鏈完整、容易計算；信任邊界要求 adopter 不能改 framework 寫入的檔案。實作上靠 `.atm/runtime/rules/` 守則檢查 mtime/hash drift。
- **演化 vs 控制流**：演化要求 charter 可變；控制流希望規則穩定。Charter waiver 流程是兩者的折衷點。

設計上的關鍵抉擇是「**契約 over 實作**」 — schemas / charter / invariants 是契約，CLI / plugins / runner 是實作。實作可演化、契約收緊。

---

## 第 12 章 — 原子 × 生命週期角色矩陣

下表標示每個原子在每個生命週期階段的角色。標記語意：

- **主導**（◎）：本階段以此原子為主要工具或產出物
- **協同**（○）：本階段會用到此原子，但非主角
- **偵測**（△）：本階段會以此原子作為檢查對象
- **不介入**（–）：本階段不直接涉及此原子

| 原子 \ 階段 | ORIENT | NEXT | LOCK | EXECUTE | EVIDENCE | HANDOFF | CLOSURE |
|------------|--------|------|------|---------|----------|---------|---------|
| ATM-CORE-0001（seed） | △ | – | – | – | △ | – | △ |
| ATM-CORE-0003（neutrality） | △ | – | – | △ | ◎ | – | △ |
| ATM-CORE-0004（generator） | – | ○ | ○ | ◎(if 造原子) | ○ | – | △ |
| ATM-CORE-0005（fingerprint） | – | ○ | – | ○(if 造原子) | ◎ | ○ | △ |
| ATM-FIXTURE-0001（dogfood） | – | – | – | – | △ | – | △ |

### 12.1 矩陣讀法說明

**ORIENT**：以「偵測（△）」為主 — 此階段的目的是清點 framework signals，0001（seed）與 0003（neutrality scanner active）是被檢查的對象，而非執行者。FIXTURE-0001 在此不被列出（其檢查在 EVIDENCE 階段才有意義）。

**NEXT**：路由決策中 0004 與 0005 是 helper（協同）— 例如當任務涉及新原子建立時，next 會 hint 「呼叫 0004」。

**LOCK**：原子層級的鎖（lockedBy / files）與原子本身沒有直接耦合 — 鎖的對象是檔案路徑，不是原子 ID。所以 0001 / 0003 / 0005 / FIXTURE-0001 在此階段不介入。0004 在此標記為「協同」，因為造原子時 lock 範圍會包含 0004 將寫入的 spec/source/test 檔。

**EXECUTE**：依任務性質而定。一般功能任務不直接觸碰原子；但「造新原子」類任務 0004 是主導、0005 協同。「修文件」類任務則 0003 在 execute 後會掃中性。

**EVIDENCE**：0005 是主導 — 證據要錨定原子身份，fingerprint 是錨點。0003 也是主導 — 證據通過 commit / pr gate 前必須過 neutrality scan。0001 / 0004 / FIXTURE-0001 為被檢查的對象。

**HANDOFF**：0005（fingerprint）協同 — 交接摘要會引用當前任務涉及原子的 fingerprint，避免 context 丟失。

**CLOSURE**：所有原子都被「偵測」— closure packet 內的 `targetRepoIdentity.signals` 會引用註冊表狀態與 charter 狀態，所有原子的 hashLock 都是被檢查的對象。

### 12.2 從矩陣看出的設計觀察

- 0005（fingerprint）是分布最廣的原子（NEXT / EXECUTE / EVIDENCE / HANDOFF / CLOSURE 都有角色），符合它「身份計算工具」的定位。
- 0001（seed）的角色集中在 ORIENT / EVIDENCE / CLOSURE — 都是「**檢查身份**」的場合，符合 self-descriptor 定位。
- 0003（neutrality）的角色集中在 EXECUTE / EVIDENCE — 都是「**檢查內容**」的場合，符合 rule-guard 定位。
- 0004（generator）只在涉及新原子的任務才主導，平日是 helper — 符合「provisioning facade」定位。
- FIXTURE-0001 只在 EVIDENCE / CLOSURE 階段被偵測 — 它的存在價值在於審計時可驗證「0004 確實能造出合規原子」。

矩陣本身可作為設計檢驗工具：若未來新增的原子在所有階段都是「不介入」，那它可能不該存在；若集中在某一階段「主導」，那它可能太狹義。

---

## 第 13 章 — 故障場景與復原

本章用 5 個具體場景說明「踩到守則時系統會發生什麼、人怎麼修」。每個場景對應一條或多條 invariant / 守則。

### 13.1 場景 A：未鎖編輯（INV-ATM-002）

**情境**：Agent 接到「修 src/login.ts 的 bug」prompt，直接編輯 src/login.ts 並 commit，沒呼叫 `atm lock acquire`。

**偵測**：下次 `atm next` 跑 doctor 時，`lock-before-edit` 守則檢查當前 working tree 對 last-locked-state 的 diff，發現 src/login.ts 有未授權變更。

**doctor 回應**：
```json
{
  "ok": false,
  "firstFailedCheck": "lock-before-edit",
  "evidence": {
    "unlockedFiles": ["src/login.ts"],
    "lastLockedAt": "2026-05-23T...",
    "suggestion": "node atm.mjs lock acquire --workItem <id> --files src/login.ts"
  }
}
```

**修復路徑**：
1. 確認當前任務 workItemId（若無，先 bootstrap 新任務）。
2. 跑 `atm lock acquire --workItem ... --files src/login.ts --reason "fix login bug"`。
3. 重新跑 `atm next`，此時應通過。
4. 接著走 EVIDENCE → CLOSURE。

**為什麼不直接 silent fix**：未鎖編輯可能是並發衝突的徵兆（另一個 agent 也在改同檔）。silent fix 會掩蓋衝突。

### 13.2 場景 B：證據新鮮度失效（INV-ATM-003 + freshness rule）

**情境**：任務 ATM-GOV-0099 之前 close 過、後來被 reopen 補一個小修。Agent 跑 `atm tasks close` 想直接收尾，沒補新證據。

**偵測**：`tasks close` 內部呼叫 `evidence verify --gate close`，後者跑 `evidence-freshness` 守則：

```
1. 讀 reopenedAt 時間戳。
2. 過濾出 createdAt > reopenedAt 的證據。
3. 若過濾後為空集合：失敗。
```

**回應**：
```json
{
  "ok": false,
  "gate": "close",
  "failure": "evidence-freshness",
  "evidence": {
    "reopenedAt": "2026-05-24T08:00:00Z",
    "applicableEvidenceCount": 0,
    "staleEvidenceCount": 3,
    "suggestion": "node atm.mjs evidence add --task ATM-GOV-0099 --kind test ..."
  }
}
```

**修復路徑**：
1. 跑 reopen 後的測試（npm test 或對應工具）。
2. 跑 `atm evidence add --task ATM-GOV-0099 --kind test --artifacts <report>`。
3. 重跑 `atm tasks close`。

**為什麼引入此守則**（commit `85b92ce`）：審計案例顯示 reopen 後用舊證據 close 會掩蓋實際變更未經驗證的事實。

### 13.3 場景 C：Closure packet 對不上 git HEAD（INV-ATM-003 + git-head-evidence）

**情境**：Agent 跑了 `atm tasks close`，但在 close 完成寫出 packet 後、又 commit 了一個不相關變更，HEAD 變化了。下一次 audit 試圖重放 closure。

**偵測**：`git-head-evidence` 守則 / `atm doctor --check git-head-evidence`：

```
1. 讀 closure-packet.targetCommit。
2. git rev-parse HEAD。
3. 若 HEAD !== targetCommit：
   a. 跑 git merge-base HEAD targetCommit。
   b. 若 merge-base === targetCommit：HEAD 是 targetCommit 後續，通過。
   c. 否則：失敗。
```

**回應**：兩種子場景：

- **HEAD 是 ancestor of targetCommit**（最罕見）：例如 hard-reset 回舊狀態。Doctor 拒絕、要求 forward 到 targetCommit 之後。
- **HEAD 與 targetCommit 在不同分支**：Doctor 要求 rebase 或重新 close。

**修復路徑**：
1. 若是無心之失：rebase 當前分支到包含 targetCommit 的 history。
2. 若是有意 diverge：重新跑 `atm tasks close`，產生新 packet 對應新 HEAD。

**為什麼引入此守則**（commit `5885aa3`）：closure packet 失去 git 錨點等於失去可重放性。

### 13.4 場景 D：Adopter token 洩漏到框架文件（INV-ATM-007）

**情境**：Framework 貢獻者寫一份新的 governance 文件，順手提到了某 adopter 的內部產品代號（例如 `bigfoot-game`）。

**偵測**：`npm run validate:neutrality` 跑 ATM-CORE-0003 中性掃描器：

```
1. 載入 neutralityPolicy（包含禁止 token 列表）。
2. 掃描 docs/governance/**/*.md。
3. 對每個 token 用 case-insensitive 全字比對。
4. 命中：回報 violation。
```

**回應**：
```json
{
  "ok": false,
  "violations": [
    {
      "file": "docs/governance/new-doc.md",
      "line": 42,
      "token": "bigfoot-game",
      "policyEntry": "adopter-internal-codename"
    }
  ]
}
```

**修復路徑**：
1. 把 token 替換為中性占位（`adopter-private-name` / `downstream-game-repo`）。
2. 重跑 validator。
3. 若該 token 應該被允許（誤判），把它加入 neutralityPolicy 的 exceptions（這個變更本身需走 charter waiver，因為 INV-ATM-007 是 doctor-enforced）。

**為什麼用 case-insensitive 全字**：避免 substring 誤判（例如 "test" 在 "testing" 中）；但 case-insensitive 是為了避免大小寫繞道。

### 13.5 場景 E：第二 registry 嘗試出現（INV-ATM-001）

**情境**：某個 plugin 為了「方便」在 `packages/plugin-experimental/` 下加了自己的 `local-registry.json`，自己分配實驗性原子 ID。

**偵測**：`registry-sole-source` 守則 / `atm doctor --check registry-sole-source`：

```
1. glob 整個 repo 找 `**/atomic-registry*.json` 與 `**/atom-registry*.json`。
2. 排除已知 testing fixture（whitelist）。
3. 若找到其他檔：失敗。
```

**回應**：
```json
{
  "ok": false,
  "extraRegistries": [
    "packages/plugin-experimental/local-registry.json"
  ],
  "rationale": "INV-ATM-001 forbids second registry implementations",
  "suggestion": "Merge experimental atoms into root atomic-registry.json via ATM-CORE-0004"
}
```

**修復路徑**：
1. 移除 `packages/plugin-experimental/local-registry.json`。
2. 若有正當需要實驗性原子：透過 `atm create` 走 0004 走正規路徑，並標記 tier 為 experimental（若 schema 已支援）。
3. 重跑 doctor。

**為什麼這條是 gate 而非 doctor**：INV-001 是 breaking change 級別（標 `breakingChange: true`）。第二 registry 一旦出現就會使整個 framework 的審計基礎崩塌，必須立即阻止而非「下次警告」。

### 13.6 故障處理的通用原則

從五個場景可歸納幾個通用原則：

1. **failure 結構化**：所有失敗都帶 `firstFailedCheck` / `failure.code` / `suggestion`，agent 不需猜測。
2. **修復路徑可執行**：`suggestion` 通常就是一條可直接執行的 CLI 命令。
3. **不靜默繞道**：每個守則有明確的「允許繞道」入口（waiver、charter amendment、whitelisting），但都需顯式走流程。
4. **守則是 idempotent**：重跑 doctor 不會改變 repo 狀態，只回報。修復是 agent 主動做的。
5. **重試友好**：修復後重跑同一條 CLI 通常會成功，不需 reset 整個任務。

---

## 第 14 章 — 演化軌跡（可重生）

本章追蹤近 N 個 governance hardening commits，看 framework 自己怎麼長大。

<!-- atm:gen:recent-commits -->
**範圍**：最近 15 個 AI-Atomic-Framework commit（含非 governance）

| Commit | 日期 | 訊息 |
|--------|------|------|
| 9b16b78 | 2026-06-03 | chore(TASK-AAO-0114): close task and record closure packet |
| 68cddc0 | 2026-06-03 | feat(TASK-AAO-0114): pre-close dirty/untracked evidence hygiene guard Phase 1 implementation |
| 4501c20 | 2026-06-03 | atm: sync TASK-TEAM-0019 ledger mirror from planning source |
| fbaaf86 | 2026-06-03 | atm: sync TASK-TEAM-0018 ledger mirror from planning source |
| 908456f | 2026-06-03 | atm: sync TASK-TEAM-0017 ledger mirror from planning source |
| f084c0d | 2026-06-03 | atm: sync TASK-TEAM-0016 ledger mirror from planning source |
| f3b6d6f | 2026-06-03 | atm: sync TASK-TEAM-0015 ledger mirror from planning source |
| 4660280 | 2026-06-03 | atm: sync TASK-TEAM-0014 ledger mirror from planning source |
| 59c8fe1 | 2026-06-03 | atm: sync TASK-TEAM-0013 ledger mirror from planning source |
| 102241d | 2026-06-03 | atm: sync TASK-TEAM-0012 ledger mirror from planning source |
| 2bb6a85 | 2026-06-03 | atm: sync TASK-TEAM-0011 ledger mirror from planning source |
| 7177db7 | 2026-06-03 | atm: sync TASK-TEAM-0010 ledger mirror from planning source |
| 1f0130b | 2026-06-03 | atm: sync TASK-TEAM-0009 ledger mirror from planning source |
| 27d86df | 2026-06-03 | atm: sync TASK-TEAM-0008 ledger mirror from planning source |
| d87abc6 | 2026-06-03 | atm: sync TASK-TEAM-0007 ledger mirror from planning source |

來源：`git log --format="%h|%ad|%s" --date=short -15`（執行於 framework-root）
<!-- atm:gen:recent-commits:end -->

### 14.1 從近期軌跡看的演化方向

把上述 commits 按主題分組：

**Closure contract 強化**（4c853b8 / 5885aa3 / ae326ce / 85b92ce / b1e64dd）：
- closure packet 升格為 schema v1 一等契約
- 內嵌 git-head cross-check
- 內嵌 framework gate provenance
- 引入 freshness 規則防止 reopen 繞道
- queue scope 與 static evidence gates 收緊

**Push 與 baseline 安全**（d0b630a / 10b915d / f92013f / af03789）：
- 加入 push guard，控制提交範圍
- 引入 legacy commit-range baseline cut，避免 legacy commits 污染當前治理範圍

**State protection 強化**（d072e59 / dc08110）：
- task claim 生命週期與 lock cleanup
- 阻擋手動編輯 `.atm/` protected state

**Docs 整理**（cff4a16 / 01d79e5 / fbc82b4）：
- 把 ATM retest keep notes 移出 framework repo（符合 INV-ATM-006）
- 記錄 ATM sync / retest SOP

**測試補強**（2590a19）：
- task direction governance 依 repo mode 分組

**演化敘事**：framework 進入「契約 hardening 期」 — 不大幅添新功能、而是把既有契約鎖緊，杜絕邊角 case 的繞道空間。對 adopter 維運者的影響是：升級 framework 後要重新審視自己有沒有依賴某個「灰色地帶」行為。

---

## 第 15 章 — 附錄

### 15.1 Schemas 索引

下表是 `schemas/governance/` 下與本文件最相關的 schema：

| Schema | 用途 | 在本文章節 |
|--------|------|-----------|
| `governance-bundle.schema.json` | 治理 bundle 根契約 | §3, §10 |
| `closure-packet.schema.json` | 任務閉合封包 | §10 |
| `scope-lock.schema.json` | 編輯範圍鎖 | §4.3 |
| `evidence.schema.json` | 證據根 schema | §10 |
| `evidence/*.schema.json` | typed evidence payloads | §10 |
| `work-item.schema.json` | 工作項目（任務）| §4 |
| `artifact.schema.json` | 產物記錄 | §10 |
| `log.schema.json` | 結構化日誌 | §10 |
| `run-report.schema.json` | 驗證 / 執行報告 | §10 |
| `context-summary.schema.json` | 交接摘要 | §4.6 |
| `default-guards.schema.json` | 預設守則組合 | §11.4 |
| `compatibility-matrix.schema.json` | 版本相容矩陣 | §6 |

完整列表在 `schemas/governance/` 目錄；本文件只列與七階生命週期直接相關的。

### 15.2 檔案路徑速查

**核心契約**：
- `atomic-registry.json` — 原子註冊表
- `.atm/charter/atomic-charter.md` — Charter 主檔
- `.atm/charter/charter-invariants.json` — Invariants 機器可讀格式

**核心程式碼**：
- `packages/core/src/registry/` — 註冊表 parse / canonicalization
- `packages/core/src/governance/` — scope-lock 等治理契約
- `packages/core/src/guidance/` — orientation / nextAction 計算
- `packages/core/src/manager/atom-generator.ts` — ATM-CORE-0004 實作
- `packages/cli/src/commands/next.ts` — next 路由
- `packages/cli/src/commands/lock.ts` — lock 命令
- `packages/cli/src/commands/evidence.ts` — evidence 命令
- `packages/cli/src/commands/tasks.ts` — tasks close 命令
- `packages/cli/src/commands/doctor.ts` — doctor 守則
- `packages/cli/src/commands/orient.ts` — orient 命令
- `packages/cli/src/commands/handoff.ts` — handoff 命令
- `packages/cli/src/commands/internal-release.ts` — sync 命令
- `packages/plugin-governance-local/src/` — 預設 governance adapter
- `packages/plugin-behavior-pack/src/` — 行為實作

**原子規格**：
- `specs/atom-seed-spec.json` — ATM-CORE-0001
- `specs/neutrality-scanner.atom.json` — ATM-CORE-0003
- `atomic_workbench/atoms/ATM-CORE-0004/atom.spec.json`
- `atomic_workbench/atoms/ATM-CORE-0005/atom.spec.json`
- `atomic_workbench/atoms/ATM-FIXTURE-0001/atom.spec.json`

**英文權威文件**：
- `docs/governance/governance-bundle-schema.md`
- `docs/governance/downstream-adopter-governance-mapping.md`
- `docs/governance/evidence-gates.md`
- `docs/governance/behavior-taxonomy.md`
- `docs/governance/task-claim-lease-model.md`
- `docs/governance/git-governance-contract.md`
- `docs/governance/no-hook-human-fallback.md`
- `docs/governance/guard-engine-thin-profile.md`
- `docs/governance/integration-plugin-matrix.md`
- `docs/governance/actor-identity-model.md`
- `docs/governance/redteam-drift-defects.md`

**Skills 定義（agent 介面）**：
- `.claude/skills/atm-create/SKILL.md`
- `.claude/skills/atm-evidence/SKILL.md`
- `.claude/skills/atm-governance-router/SKILL.md`
- `.claude/skills/atm-handoff/SKILL.md`
- `.claude/skills/atm-internal-build-sync/SKILL.md`
- `.claude/skills/atm-lock/SKILL.md`
- `.claude/skills/atm-next/SKILL.md`
- `.claude/skills/atm-orient/SKILL.md`
- `.claude/skills/atm-task-intent-resolver/SKILL.md`
- `.claude/skills/atm-upgrade-scan/SKILL.md`

### 15.3 CLI 指令 cheat sheet（可重生）

<!-- atm:gen:cli-cheatsheet -->
**部署 / 維運**
```bash
node release/atm-onefile/atm.mjs internal-release sync --repo <path> --json
node release/atm-onefile/atm.mjs internal-release sync --repo <path> --skip <name> --json
node release/atm-onefile/atm.mjs internal-release sync --repo <path> --dry-run --json
```

**ORIENT / NEXT**
```bash
node atm.mjs orient --cwd . --json
node atm.mjs doctor --cwd . --json
node atm.mjs next --json
node atm.mjs next --prompt "<description>" --json
node atm.mjs next --intent path/to/intent.json --json
```

**LOCK**
```bash
node atm.mjs lock check --workItem <id> --json
node atm.mjs lock acquire --workItem <id> --files <comma-separated> --reason "<text>" --json
node atm.mjs lock release --workItem <id> --json
```

**EVIDENCE**
```bash
node atm.mjs evidence add --task <id> --actor <actor> --kind test --summary "<text>" --artifacts <path> --json
node atm.mjs evidence verify --task <id> --gate close --json
node atm.mjs evidence verify --task <id> --gate commit --json
node atm.mjs evidence verify --task <id> --gate pr --json
```

**HANDOFF**
```bash
node atm.mjs handoff summarize --task <id> --json
```

**CLOSURE**
```bash
node atm.mjs tasks close --task <id> --actor <actor> --status done --json
node atm.mjs tasks audit --json
```

**原子操作**
```bash
node atm.mjs create --bucket CORE --title "<title>" --description "<text>" --json
node atm.mjs registry list --json
node atm.mjs spec --validate <path> --json
```

**Framework mode**
```bash
node atm.mjs framework-mode status --json
```

來源：`packages/cli/src/commands/`（於 framework-root）
<!-- atm:gen:cli-cheatsheet:end -->

### 15.4 名詞索引

英→中對照（按英文字母順序）：

- adopter → 採用者（指安裝 ATM 治理的下游 repo）
- atom → 原子
- behavior → 行為
- bootstrap → 初始化
- charter → 章程
- charter waiver → 章程豁免
- closure packet → 閉合封包
- doctor → 醫生（健康檢查命令名）
- evidence → 證據
- evidence freshness → 證據新鮮度
- evidence gate → 證據閘門
- framework → 框架
- framework mode → 框架模式
- governance bundle → 治理捆包
- handoff → 交接
- invariant → 不變式 / 紅線
- lock → 鎖
- onefile runner → 單檔執行器
- orient → 定位
- pinned runner → 釘版執行器
- registry → 註冊表
- scope lock → 範圍鎖
- semantic fingerprint → 語意指紋
- target-local → 目標本地（任務 ledger 必須留在 target repo）
- waiver → 豁免

### 15.5 進一步閱讀建議

按主題深入時的建議路徑：

- **想理解 schema 設計哲學** → 讀 `docs/governance/governance-bundle-schema.md` 與 `schemas/governance/closure-packet.schema.json`
- **想理解 adopter 怎麼映射既有工作流** → 讀 `docs/governance/downstream-adopter-governance-mapping.md`
- **想理解為什麼不裝 git hook** → 讀 `docs/governance/no-hook-human-fallback.md`
- **想理解 actor / 身份** → 讀 `docs/governance/actor-identity-model.md`
- **想理解 lock TTL 與 lease** → 讀 `docs/governance/task-claim-lease-model.md`
- **想理解 git 對接** → 讀 `docs/governance/git-governance-contract.md`
- **想理解 plugin 矩陣** → 讀 `docs/governance/integration-plugin-matrix.md`
- **想理解 guard engine 演化** → 讀 `docs/governance/guard-engine-thin-profile.md`
- **想理解過去踩過哪些坑** → 讀 `docs/governance/redteam-drift-defects.md`

### 15.6 反饋與修訂

本 zh-TW 文件由 framework 開發團隊維護。發現偏差或需要補充：

1. 確認偏差是「中文敘述問題」還是「英文權威來源問題」。
2. 若是中文敘述問題：PR 直接改本檔；可重生區塊請勿手動編輯（修改 source 後重跑 renderer）。
3. 若是英文權威問題：先改 `docs/governance/` 對應檔案，再用 renderer 更新本檔可重生區塊。

修訂歷史會體現在 git log；本文件本身不維護 changelog（與 INV-ATM-006 一致：避免雙重 ledger）。

---

> **文件結束。** 若你讀完仍有未解的問題，那很可能是：(a) 該問題的答案在英文權威文件、(b) 該問題對應的機制尚未實作、或 (c) 該問題暗示一個 framework 設計缺口值得提出 PR 討論。三種情況都是有價值的觀察。
