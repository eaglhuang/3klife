# AI Atomic Framework — RFC 與社群貢獻流程

> **doc_id**: doc_atm_rfc_0001  
> **版本**: 1.0.0  
> **建立日期**: 2026-05-11  
> **負責方**: ATM Maintainer Team  

---

## 概覽

本文件定義 AI Atomic Framework（ATM）生態系的社群貢獻規則，涵蓋：

1. Issue 回報流程
2. RFC（Request for Comments）提案流程
3. Pull Request 審查規則
4. Release Owner 與 Maintainer Quorum
5. 安全性 / 來源性 / 套件命名類 RFC 的 Escalation Path

---

## 1. Issue 回報

### 1.1 基本分類

| Issue 類型 | 何時使用 | Template |
|-----------|---------|----------|
| **Bug Report** | 行為與文件/規格不符 | `bug_report.md` |
| **Feature Request** | 希望新增功能，但尚未達到需要 RFC 的門檻 | `feature_request.md` |
| **RFC（正式提案）** | 需要設計決策、影響 API / 跨 package boundary | `rfc.md` |
| **Security Vulnerability** | 安全漏洞 | **不得公開**，直接寄 security@atm-project（見第5節）|

### 1.2 Label 規範

所有 Issue 必須貼至少一個下列 label：

- `area:core` / `area:plugin` / `area:adapter` / `area:cli` / `area:docs`
- `type:bug` / `type:feat` / `type:rfc` / `type:chore`
- `priority:P0` – `priority:P3`（P0 = 生產阻斷）

---

## 2. RFC 提案流程

RFC 用於需要廣泛討論的設計決策，例如：

- 新增 core 公開 API
- 變更 plugin SDK 合約（破壞性變更）
- 新增跨語言 adapter 驗收標準
- 修改 atom 生命週期狀態機

### 2.1 RFC 生命週期

```
草稿 (Draft) → 審查中 (Under Review) → 最終評論期 (Final Comment Period, FCP)
     → 已接受 (Accepted) / 已拒絕 (Rejected) → 實作中 (Implementing) → 完成 (Closed)
```

### 2.2 提案步驟

1. **開 Issue** 使用 `rfc.md` template，標題格式：`[RFC] <簡短描述>`
2. **填寫設計文件**（見 template 欄位）
3. **至少等待 7 天**讓社群留言
4. **Maintainer 審查**：需 2 名 Maintainer 同意進入 FCP（Final Comment Period）
5. **FCP 期間 14 天**，無重大反對則進入 Accepted

### 2.3 快速通道（Fast Track）

符合下列條件可申請 Fast Track（FCP 縮短為 7 天）：

- 僅影響單一 package 內部
- 有完整 backward-compatibility 分析
- 已附上 proof-of-concept 實作

---

## 3. Pull Request 審查規則

### 3.1 PR 最低要求

| 項目 | 要求 |
|-----|-----|
| 測試覆蓋 | 新功能/修復必須附測試，coverage 不得低於原有水準 |
| 文件更新 | 若涉及公開 API 變更，必須同步更新 docs/ |
| Changelog | 所有 PR 必須在 CHANGELOG.md 新增 entry |
| CI 通過 | 所有 CI gate 必須 green |
| Commit 格式 | Conventional Commits（`feat:`, `fix:`, `docs:`, `chore:`）|

### 3.2 Review 人數要求

| PR 類型 | 最少 Approvals | 備註 |
|--------|--------------|-----|
| 文件修正 / chore | 1 Maintainer | |
| Bug fix | 1 Maintainer | 若影響 core 需 2 |
| 新功能 | 2 Maintainers | 需先有對應 Issue |
| 破壞性變更 | 2 Maintainers + RFC Accepted | RFC 必須先完成 FCP |
| Security fix | 2 Maintainers + Security Lead | 走 private channel |

### 3.3 禁止事項

- 不得自我 approve 自己的 PR
- 不得 merge 有 `needs-revision` label 的 PR
- 禁止 `--no-verify` 繞過 pre-commit hook

---

## 4. Release Owner 與 Maintainer Quorum

### 4.1 角色定義

| 角色 | 職責 | 人數要求 |
|-----|-----|--------|
| **Release Owner** | 負責執行 release 流程、打 tag、發佈 npm | 1 人（輪值制） |
| **Maintainer** | PR review、RFC FCP 投票、安全問題處理 | 至少 3 人 |
| **Contributor** | 提交 PR、開 Issue | 無限制 |

### 4.2 Release Quorum 規則

正式 release（minor 或 major）需要：

- **Release Owner**（1人）確認 changelog 完整
- **至少 2 名 Maintainer**投票同意
- CI 全綠
- 上一個 release 的 open regressions 已清空或降至 P2 以下

Patch release 只需：

- Release Owner 確認
- **1 名 Maintainer** 同意即可

### 4.3 Release 流程

```bash
# 1. 確認 milestone 已關閉，changelog 已更新
node tools_node/sync-atm-stabilization-milestone.js --check --strict

# 2. 版本 bump（遵循 semver）
npm version patch|minor|major --workspace=packages/core

# 3. 跑完整 gate
node tools_node/compute-gate.js --profile standard --agent-feedback

# 4. 打 tag 並推送
git tag v<version>
git push origin v<version>

# 5. 發佈（Release Owner 執行）
npm publish --workspace=packages/core --access=public
```

---

## 5. 安全性 / 來源性 / 套件命名類 RFC — Escalation Path

### 5.1 安全漏洞

**不得在公開 Issue 揭露安全漏洞。** 

流程：

1. 寄件至 `security@atm-project`（或 repo 的 Security Advisories 功能）
2. Security Lead（Maintainer 中指定者）在 **48 小時內**確認收到
3. 評估 CVSS 分數，決定修復優先級
4. 修復完成後，在 security advisory 中公開，同時在 CHANGELOG 標記

### 5.2 Supply Chain / 來源性（Provenance）問題

涉及 supply chain 安全的 RFC（例如：新增外部依賴、修改 publish 流程）需走 **強制審查通道**：

- 自動觸發 `needs-security-review` label
- 需額外取得 Security Lead 的 Approval
- FCP 期間不縮短（即使符合 Fast Track 條件）

### 5.3 套件命名衝突

若發現 npm 命名衝突或 typosquatting 風險：

1. 立即開 P0 Issue，tag `type:security` + `area:cli`
2. Release Owner 暫停相關套件的新 publish
3. 與 npm security team 聯繫釐清

---

## 6. 衝突解決

若 Maintainer 之間對 RFC 或 PR 無法達成共識：

1. 列出各方立場於 Issue 留言
2. 召開同步討論（Issue 留言中公告時間）
3. 若仍無共識，由 **Release Owner + 多數 Maintainer（>50%）投票**決定
4. 投票結果記錄於 Issue，並 lock 討論串

---

*本文件由 ATM-6-0002 任務建立，vs-insiders-gpt-5.3-codex 執行 | 2026-05-11*
