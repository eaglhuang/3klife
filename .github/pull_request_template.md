# Pull Request

## 概要

<!-- 這個 PR 解決了什麼問題？請連結相關 Issue（e.g., Closes #123）-->

**關聯 Issue**: #

## 變更類型

請勾選適用的類型（可複選）：

- [ ] `fix` — Bug 修復（不破壞現有功能）
- [ ] `feat` — 新功能（不破壞現有功能）
- [ ] `breaking` — 破壞性變更（需要 RFC Accepted）
- [ ] `docs` — 文件更新
- [ ] `chore` — 建置流程、工具鏈、依賴更新
- [ ] `perf` — 效能改善
- [ ] `refactor` — 重構（無行為變更）

## 變更摘要

<!-- 
列出主要改動：
- 新增了什麼
- 修改了什麼
- 刪除了什麼
-->

## 測試方式

```bash
# 請說明如何驗證此 PR 的正確性
npm test
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## Checklist

**提交前請確認以下事項：**

### 基本要求
- [ ] 本 PR 對應一個 Issue 或 RFC
- [ ] Commit 訊息遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] CHANGELOG.md 已更新（在正確的版本 section 下）
- [ ] 所有 CI gate 通過

### 程式碼品質
- [ ] 新增/修改的功能有對應的測試
- [ ] 沒有引入新的 lint 錯誤
- [ ] 沒有使用 `--no-verify` 繞過 pre-commit hook

### 文件
- [ ] 若有公開 API 變更，已更新 docs/
- [ ] 若為新功能，已更新 README 或相關文件

### 特殊情況
- [ ] **破壞性變更**：已有對應的 RFC（狀態：Accepted），並附上 migration guide
- [ ] **安全相關**：已通知 Security Lead
- [ ] **新增外部依賴**：已評估 supply chain 風險，觸發 `needs-security-review`

---

## 審查者備注

<!-- 請提醒審查者特別注意的地方 -->
