# Captain Dispatch: Framework Sync Candidates And Task Recommendations

Created: 2026-07-02
Owner: Project Captain
Status: planning
Planning repo: 3KLife
Target repo: AI-Atomic-Framework
Closure authority: target_repo

## 結論

本輪從 `ReportDemo` 計畫書抽出的機制，適合往 framework repo 同步的，不是產品案例本身，而是三類可重用治理 contract：

1. 隊長自動決策邊界
2. human / ADR gate 的 runtime 顯式欄位
3. 治理越權阻擋理由的結構化輸出

若要排下一波工作，建議把 `TASK-TEAM-0031~0035` 視為已完成的 Team runtime 地基，接著把這批新治理規則主要落到 `TASK-SKL-0008~0012`，而不是回頭重開 runtime 基礎卡。

## 候選同步清單

### A. 必須同步的共用治理規則

這些內容已經適合升格為 framework repo 可共用規則：

- `decisionClass`
  - 建議值：`auto-execution`、`human-signoff-required`、`adr-required`、`blocked`
- `decisionReason`
- `requiresHumanSignoff`
- `requiresAdr`
- `violationStatus`
- `escalationTarget`
- `reviewerIndependenceResult`
- `validatorVerdict`

這批欄位適合落在：

- Team runtime state
- Team CLI / status / validate 輸出
- observability event schema
- closure / route gate 判斷輸入

### B. 必須同步的 Captain 規則

這些規則不應只留在 planning repo：

- Captain 只能自動決定低風險、可回復、已有規則的執行細節
- 遇到資安、稽核、正式資料、權限模型、供應商選型、架構取捨、正式切換時，必須停下交給 human / ADR
- task brief / task card 在 dispatch 前至少要有：
  - `scopePaths`
  - `deliverables`
  - `validators`
  - `outOfScope`
  - `nonGoals`
  - rollback expectation
  - reviewer / validator assignment
  - human sign-off / ADR gate

### C. 必須同步的阻擋語意

建議升格成 framework 共用的 blocked / rework / escalated reason：

- `scope-violation`
- `evidence-missing`
- `validator-failed`
- `reviewer-independence-missing`
- `human-signoff-required`
- `adr-required`
- `broker-conflict-blocked`
- `policy-downgrade-request`

## 不建議直接同步的部分

這些內容先留在 adopter / planning 層即可：

- `ReportDemo` 的業務案例、下載閘道、浮水印範例本身
- 特定產品領域的 Security / Audit / QA 表格
- 以產品案例命名的 milestone 故事線

原因：這些是很好的設計靈感，但不是 framework 的 vendor-neutral / domain-neutral contract。

## 既有 Team 卡片如何定位

### 已完成，作為能力底座

- `TASK-TEAM-0031`
  - Team runtime mode / adapter contract 已就位
- `TASK-TEAM-0032`
  - editor-subagent bridge contract 已就位
- `TASK-TEAM-0033`
  - reviewer / validator 正式 rework route 已就位
- `TASK-TEAM-0034`
  - artifact handoff / bounded retry contract 已就位
- `TASK-TEAM-0035`
  - Node.js reference worker adapter + broker-only fallback 已就位

隊長判讀：
這五張卡已經把「怎麼跑」的底盤建立起來，現在缺的是「什麼情況必須停下、升級、簽核」的治理欄位與 role-skill-pack 對應。

## 派工主線建議

### 第一優先：`TASK-SKL-0008`

Title: `Team role skill-pack and capability boundary contract`

建議目標：

- 把 Captain / Coordinator、Implementer、Reviewer、Validator、Evidence Collector 的能力邊界寫成正式 contract
- 把 human / ADR gate、reviewer independence、forbidden permissions 納入 role pack
- 明確宣告非 Coordinator 不得擁有 lifecycle authority

為什麼先做：

- 這張卡最直接承接本輪新整理的規則
- 若不先固定 role boundary，後面的 routing / manifest / pilot 都會漂移

建議 dispatch lane：

- `DOC-FILLER`
- `SCOPE-AUDIT`
- `JUDGE`

建議 deliverables：

- role pack contract 文件
- capability boundary matrix
- human / ADR gate 在角色層的附著點

### 第二優先：`TASK-SKL-0009`

Title: `Team role-routing matrix and playbook slices`

建議目標：

- 把哪些工作模式要走哪些角色順序寫成 routing matrix
- 把 advisory-only、parallel-safe、must-block 的 role lane 分開
- 把 Captain dispatch brief 的標準欄位切成 playbook slice

為什麼第二：

- `0008` 先定角色邊界，`0009` 才能定路由矩陣
- 這張卡最適合吸收本輪整理出的 Captain SOP 規則

建議 dispatch lane：

- `DOC-FILLER`
- `INVENTORY`
- `JUDGE`

建議 deliverables：

- role-routing matrix
- playbook slice 規格
- dispatch required fields 清單

### 第三優先：`TASK-SKL-0010`

Title: `Provider-neutral role skill-pack manifest`

建議目標：

- 將 `decisionClass`、`requiresHumanSignoff`、`requiresAdr`、`violationStatus` 這些欄位正式接進 provider-neutral manifest
- 確保 permission lease 仍然是 role-first，而不是 vendor-first
- 讓不同 provider / editor surface 都能承載同一套治理欄位

為什麼第三：

- 這張卡是把前兩張 contract 寫進可被 runtime / integration 消費的 manifest
- 很適合承接我們這次補進 `ATM 多廠商 Agent Runtime 與 Integration 藍圖.md` 的內容

建議 dispatch lane：

- `DOC-FILLER`
- `SCOPE-AUDIT`
- `EXEC-FAST`

### 第四優先：`TASK-SKL-0011`

Title: `Agent plus skill runtime pilot`

建議目標：

- 用一組小型 Team run 驗證：
  - Coordinator
  - Implementer
  - Reviewer / Validator
- 驗證新欄位能不能真的把流程送進：
  - `needs-rework`
  - `blocked`
  - `human-signoff-required`
  - `ready-for-close`

為什麼第四：

- pilot 要建立在 contract / routing / manifest 三者都先落地
- 不然很容易變成 prompt theater

建議 dispatch lane：

- `EXEC-FAST`
- `VALIDATOR`
- `JUDGE`

### 第五優先：`TASK-SKL-0012`

Title: `Team role growth and observability integration`

建議目標：

- 把 role friction 與 shared routing friction 分開觀測
- 讓 observability 能看到：
  - 哪個 role 被 human sign-off 擋下
  - 哪個 role 因 reviewer independence 不成立而降級成 advisory
  - 哪個 provider / runtime surface 最常命中 `blocked`

為什麼第五：

- 這是把前面 contract 實際觀測化
- 不是第一刀，但對長期調校很重要

建議 dispatch lane：

- `INVENTORY`
- `DOC-FILLER`
- `VALIDATOR`

## 建議派工順序

1. `TASK-SKL-0008`
2. `TASK-SKL-0009`
3. `TASK-SKL-0010`
4. `TASK-SKL-0011`
5. `TASK-SKL-0012`

## 隊長派工原則

- 不重開 `TASK-TEAM-0031~0035`，除非發現 framework 實作和 planning mirror 明顯漂移
- `TASK-TEAM-0031~0035` 主要作為 evidence base 與依賴引用
- 新派工主線以 `SKL` 系列承接「role + skill + governance boundary」層
- 若要新增 Team 卡，應是補 `governance boundary envelope` 或 `decision-class schema` 這類缺口，而不是再做一套平行 runtime

## 一句話隊長結論

下一波最值得推的是：先用 `TASK-SKL-0008~0010` 把角色邊界、路由矩陣、provider-neutral manifest 補成正式 contract，再用 `TASK-SKL-0011~0012` 做 pilot 與 observability 收口；`TASK-TEAM-0031~0035` 則作為已完成底盤引用，不建議回頭重做。
