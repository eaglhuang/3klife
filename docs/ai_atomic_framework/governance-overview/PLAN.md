# Plan: ATM 框架治理機制完整解釋文件 (zh-TW)

## Context

使用者需要一份綜合性文件，能完全解釋「ATM 框架如何治理其他專案 repo」，包含：
- 原理設計的深度
- 多種角度的分析
- 所有原子行為在其中扮演的角色

探索結果摘要：
- ATM 是「meta-governance 框架」，透過顯式 push-based sync 將單檔 runner (`atm.mjs`, 3.1MB) 部署到 adopter repos
- 核心治理循環有七階：`ORIENT → NEXT → LOCK → EXECUTE → EVIDENCE → HANDOFF → CLOSURE`
- 註冊中的原子目前有 5 個 (4 CORE + 1 FIXTURE)，行為家族 5 群共 11 個
- 7 條 Charter Invariants 是治理的不可變紅線
- 近 5 commits 都是治理硬化 (queue scope、closure provenance、git-head cross-check、closure contract、fresh evidence)

**合規性註記**：INV-ATM-007 要求 `docs/governance/` 公開框架文件為英文。本計畫將 zh-TW 全景文件落在 `docs/zh-TW/governance-overview.md`（locale 前綴），並在文首聲明「英文權威來源在 `docs/governance/`」，避開 invariant 違反。

決策確認（已詢問使用者）：
- 讀者：Adopter 維運者 + 框架貢獻者
- 語言/格式：zh-TW，單一 governance-overview.md
- 覆蓋面：完整全景
- 重生機制：關鍵章節由腳本生成

---

## 1. 目標產出

**主文件**：`docs/zh-TW/governance-overview.md`
- 預估規模：1800 ~ 2400 行（單檔，含表格、圖、程式片段）
- 結構：15 章（見下方大綱）
- 含 5 個由腳本注入的「可重生區塊」(comment-delimited)

**重生器**：`scripts/render-governance-overview.mjs`
- Node 腳本，讀取治理來源（atomic-registry / charter-invariants / behavior-taxonomy / git log），渲染至主文件指定區塊
- 冪等：僅覆寫 `<!-- atm:gen:KEY -->...<!-- atm:gen:KEY:end -->` 之間內容，敘事段落不動
- 退出碼語意：0 = 同步；2 = 區塊內容已更新；非 0 = 來源缺失

**選用副產物**：`docs/zh-TW/README.md`（locale 索引，視首版完成後是否多檔再決定）

---

## 2. 主文件章節大綱

| # | 章節 | 來源 / 證據 | 是否含可重生區塊 |
|---|------|-------------|------------------|
| 0 | 前言：本文件定位、locale 聲明、英文權威來源指引 | 人工 | – |
| 1 | 框架定位：ATM 解決什麼問題；framework mode vs adopter mode 的本質差異 | `docs/governance/downstream-adopter-governance-mapping.md`、`packages/cli/src/commands/doctor.ts` | – |
| 2 | 概念詞彙表：atom / behavior / closure / evidence / gate / lock / charter / adopter / framework-mode | 散佈於 docs/governance/* 及 packages/core/src/* | – |
| 3 | 架構鳥瞰：從 ATM 源 repo → build → onefile → sync → adopter 檔案系統的全景圖 | `packages/cli/src/commands/internal-release.ts`、`release/atm-onefile/atm.mjs` | – |
| 4 | 治理生命週期七階：ORIENT / NEXT / LOCK / EXECUTE / EVIDENCE / HANDOFF / CLOSURE，每階含 CLI 指令、輸入輸出契約、典型 artifact | `packages/cli/src/commands/{orient,next,lock,evidence,tasks,handoff}.ts` | – |
| 5 | **可重生**：所有原子總表（id / logicalName / status / hashLock prefix / specPath） | `atomic-registry.json` | ✅ `atm:gen:registry` |
| 6 | 五原子深度剖析：ATM-CORE-0001/0003/0004/0005、ATM-FIXTURE-0001 各自一節，含「目的 / 輸入輸出 / 在生命週期哪一階觸發 / 與其他原子的關係 / 失效後果」 | `specs/*.json`、`atomic_workbench/atoms/*/atom.spec.json` | – |
| 7 | **可重生**：行為類別總覽（Split / Merge / Evolution / Lifecycle / Propagation 五家族 11 條） | `docs/governance/behavior-taxonomy.md` | ✅ `atm:gen:behaviors` |
| 8 | **可重生**：七大 Charter Invariants 完整解釋（每條：規則文、執行模式、典型違反場景、由哪個原子或 doctor 偵測） | `.atm/charter/charter-invariants.json`、`.atm/charter/atomic-charter.md` | ✅ `atm:gen:invariants` |
| 9 | 跨倉部署機制：build → onefile → `internal-release sync` → adopter 檔案系統落點 + `.atm/runtime/pinned-runner.json` 中繼資料 | `packages/cli/src/commands/internal-release.ts`、`schemas/runtime/pinned-runner.schema.json`（若存在） | – |
| 10 | 證據與閉合契約：closure packet schema、evidence freshness、git-head cross-check 的審計鏈 | `schemas/governance/closure-packet.schema.json`、`docs/governance/evidence-gates.md` | – |
| 11 | 多角度分析（五視角）：(a) 控制流 (b) 資料流 (c) 信任邊界 (d) 故障與復原 (e) 演化與治理增量 | 綜合上述來源 | – |
| 12 | 原子 × 生命週期角色矩陣：5 原子 × 7 階段表格，標示「主導 / 協同 / 偵測 / 不介入」 | 人工綜合，引用第 6 章 | – |
| 13 | 故障場景與復原：鎖洩漏、證據失效、closure packet 對不上 git HEAD、neutrality scanner 命中、註冊衝突（5 個案例） | `docs/governance/redteam-drift-defects.md`、recent commits | – |
| 14 | **可重生**：演化軌跡 — 近 N 個 governance hardening commits 摘要 | `git log` | ✅ `atm:gen:recent-commits` |
| 15 | 附錄：schemas 索引、檔案路徑速查、CLI 指令 cheat sheet | 多源 | ✅ `atm:gen:cli-cheatsheet` (從 `atm --help` 抓) |

---

## 3. 多角度分析的五視角（第 11 章內容定義）

| 視角 | 核心問題 | 主要敘事素材 |
|------|---------|--------------|
| 控制流 | 一個 agent 從接到 prompt 到 closure，會經過哪些決策節點？哪裡會被阻擋？ | `next.ts` 路由邏輯、`doctor.ts` 的 guard 順序 |
| 資料流 | 證據怎麼從 runtime 沉澱到 history 再進入 closure packet？hash 如何串接？ | `evidence.ts`、`closure-packet.schema.json`、`pinned-runner.json` |
| 信任邊界 | 框架 repo 與 adopter 各自能改什麼？哪裡是可審計的提交，哪裡是運行時狀態？ | `internal-release.ts` 的同步範圍、`.atm/` 子目錄職責 |
| 故障/復原 | 當某個 invariant 被踩、或 closure 證據與 git HEAD 不符時，系統如何拒絕並引導 agent 修復？ | recent commits `5885aa3`/`85b92ce`、`doctor.ts` 的修復建議 |
| 演化/治理增量 | INV 要修改怎麼辦？charter waiver 流程；近 5 commits 揭露的硬化方向 | `atomic-charter.md` §4、charter-invariants.json schema 演進 |

---

## 4. 可重生章節：腳本契約

`scripts/render-governance-overview.mjs` 介面：

```
node scripts/render-governance-overview.mjs [--check] [--write] [--target <path>]
```

行為：
- 預設目標：`docs/zh-TW/governance-overview.md`
- 五個區塊各自獨立渲染函式：`renderRegistry()`, `renderBehaviors()`, `renderInvariants()`, `renderRecentCommits()`, `renderCliCheatsheet()`
- 區塊格式（範例）：
  ```markdown
  <!-- atm:gen:registry -->
  | atomId | logicalName | status | specPath | hashLock |
  | ------ | ----------- | ------ | -------- | -------- |
  | ATM-CORE-0001 | atom.core-seed | active | specs/atom-seed-spec.json | sha256:aac4866b… |
  ...
  <!-- atm:gen:registry:end -->
  ```
- `--check` 模式：渲染到記憶體，與檔案內容 diff；若不一致退出 2（CI 可用）
- `--write` 模式：直接覆寫區塊
- 區塊外的敘事段落絕不變動

需重用既有工具：
- `packages/core/src/registry/registry.ts` 的 parse / canonicalization（避免重寫 hash 規則）
- 已存在的 JSON schema validator（若有），避免重複 schema 邏輯

---

## 5. 待修改 / 新建的關鍵檔案

| 檔案 | 動作 | 說明 |
|------|------|------|
| `docs/zh-TW/governance-overview.md` | 新建 | 主文件，含 5 個可重生區塊 |
| `scripts/render-governance-overview.mjs` | 新建 | 重生器 |
| `docs/zh-TW/README.md` | 視需要新建 | locale 索引，列出本檔與未來中文擴充 |
| `package.json` | 編輯 | 新增 `scripts.docs:gen-zh` 指令對應重生器（如專案已有類似 scripts 慣例） |
| `.atm/runtime/no-touch.json` 之類的 no-touch 設定 | 確認 | 若有 no-touch 規則需確認本檔路徑未被排除 |

不變動既有 `docs/governance/` 任何英文檔案，避免 INV-ATM-007 與既有審計鏈衝突。

---

## 6. 引用既有素材的策略

**直接引用（連結 + 一行摘要）**：
- `docs/governance/governance-bundle-schema.md` — bundle 結構定義
- `docs/governance/downstream-adopter-governance-mapping.md` — adopter mapping 哲學
- `docs/governance/evidence-gates.md` — gate 規則
- `docs/governance/task-claim-lease-model.md` — 鎖與 lease 模型
- `docs/governance/git-governance-contract.md` — git 治理契約
- `docs/governance/behavior-taxonomy.md` — 行為家族（會由重生器掃描）

**重述（用中文整理 + 引出原文連結）**：
- charter §1 ~ §5 的結構與授權階層
- closure packet schema 主要欄位語意
- internal-release sync 的 skip/exclude 與備份策略

**不重述**（避免冗餘）：
- schema 細節（直接連到 JSON Schema）
- 各 skill 內部步驟（連到 `.claude/skills/atm-*/SKILL.md`）

---

## 7. 驗證計畫

文件交付前的端到端校驗：

1. **路徑校驗**：文件內所有 `路徑/檔案.md` 與 `path/file.ts` 可被 `Read` 工具讀取（不存在的引用會被腳本標出）。
2. **原子表一致性**：重生器產出的原子表與 `node atm.mjs registry list --json`（若 CLI 有此指令；否則直接讀 `atomic-registry.json`）一致。
3. **Invariants 表一致性**：重生器產出的 invariants 表與 `.atm/charter/charter-invariants.json` 條目數量與 ID 完全一致。
4. **重生器冪等**：執行 `node scripts/render-governance-overview.mjs --write` 兩次，第二次必須無變動（git status 乾淨）。
5. **重生器偵測力**：手動改動可重生區塊內容後執行 `--check`，必須以退出碼 2 失敗。
6. **跨倉部署敘事**：第 9 章描述的步驟與 `internal-release.ts` 程式碼路徑逐行對照（人工 trace，不執行同步）。
7. **合規性**：文件首段聲明 locale 與英文權威來源，不在 `docs/governance/` 下新建 zh-TW 內容（INV-ATM-007）。
8. **敘事可讀性**：以 adopter 維運者視角通讀一次，可確認「我的 repo 收到 atm.mjs 後接下來會發生什麼」的問題能在第 4、9 章獲得完整答案。

---

## 8. 風險與權衡

| 風險 | 緩解 |
|------|------|
| 註冊表只有 5 個原子，文件談「所有原子角色」會偏短；未來新增原子若不重生，文件會 drift | 第 5 章設為可重生區塊；第 6 章敘事使用「家族」與「成長軌跡」語氣，避免每個原子寫死過多細節 |
| zh-TW 文件可能被誤認為框架公開規範 | 文首明示 locale 副本身份；指向 `docs/governance/` 為英文權威 |
| 多角度分析與既有 docs/governance/* 重疊 | 五視角設定為「合成 + 對照」而非「重複」；每節指向原文連結 |
| 重生器若提前實作會擴大 PR 範圍 | 建議分兩階段交付：階段一純文件（手動填可重生區塊內容），階段二補腳本與 CI hook |

---

## 9. 交付順序建議

1. 先寫主文件骨架（前言、章節大綱、空的可重生區塊佔位符），讓使用者預覽結構。
2. 補完 1~4 章（定位、詞彙、鳥瞰、生命週期）—— 這是讀者最先接觸的部分。
3. 補完 5~8 章（原子表、原子剖析、行為、invariants）—— 是「原子角色」的核心交付。
4. 補完 9~10 章（跨倉部署、證據契約）。
5. 補完 11~13 章（多角度、矩陣、故障）。
6. 補完 14~15 章與附錄。
7. 撰寫重生器並驗證冪等。
8. 跑驗證計畫 1~8 條，逐項打勾。

每階段結束都應該是一個可獨立 review 的 commit。
