# SKILL: notes-label-repair

## 用途

修復任務卡 YAML frontmatter `notes:` 欄位中，因 Agent（如 `vs-code-gpt-5.4-mini` / `codex-gpt-5`）無法輸出中文字元而產生的 `??:` 標籤損壞。

**USE FOR**：
- 任務卡 `notes:` 欄位出現 `??: in-progress` / `??: pending` / `??: none` 等模式
- 批次修復多個任務卡的標籤
- 偵測哪些任務卡需要修復

**DO NOT USE FOR**：
- 值（label 後的文字）中的 `?` — 那是真正的資料損失，需手動補全
- 其他類型的 mojibake（如整行亂碼、Big5 位元誤讀等）

---

## 問題描述

部分 Agent 在終端輸出時無法顯示中文，會把 `狀態:` / `驗證:` / `變更:` / `阻塞:` 等 2 字標籤寫成 `??:`。

**標籤可以 100% 確定性還原**，因為格式是固定的 pipe-delimited 位置：

```
DATE | 狀態: VALUE | 驗證: VALUE | 變更: VALUE | 阻塞: VALUE
```

- Pipe 位置 1（DATE 後第 1 個 `|`）→ `狀態:`
- Pipe 位置 2 → `驗證:`
- Pipe 位置 3 → `變更:`
- Pipe 位置 4 → `阻塞:`

---

## 操作流程

### Step 1：Dry Run（先看哪些檔案需要修復）

```bash
node tools_node/repair-notes-labels.js
```

或指定目錄：

```bash
node tools_node/repair-notes-labels.js --dir docs/agent-briefs/tasks/ATM
```

### Step 2：執行修復

```bash
node tools_node/repair-notes-labels.js --write
```

### Step 3：驗證結果

隨機抽查幾個修復後的檔案，確認標籤已還原：

```bash
Select-String -Pattern "\?\?:" -Path "docs\agent-briefs\tasks\ATM\*.md"
```

如果輸出為空，代表 `??:` 已全部消除。

### Step 4：確認值內的 `?` 需要手動補全

修復後仍可能有值內的 `?`（代表損失的中文內容），例如：

```
狀態: done | 驗證: node scripts/validate.mjs pass | 變更: ?? map workbench ??? | 阻塞: none
```

這些 `?` 代表的中文無法自動還原，需根據上下文手動補全。

### Step 5：Git Commit

```bash
git -C <repo-root> add docs/agent-briefs/tasks/ATM/*.md
git -C <repo-root> commit -m "fix(notes): restore ??-label corruption in task card notes"
```

---

## 工具參數說明

`tools_node/repair-notes-labels.js`

| 參數 | 說明 |
|------|------|
| （無）| Dry run，只報告不修改 |
| `--write` | 實際寫入修復後的內容 |
| `--dir <path>` | 指定目錄（預設 `docs/agent-briefs/tasks`）|
| `--file <path>` | 只修復指定的單一檔案 |

---

## 限制

| 可修復 | 不可修復 |
|--------|---------|
| `??:` 標籤（狀態/驗證/變更/阻塞） | 值內的 `?`（損失的中文內容）|
| Word-wrap 跨行的 notes 行 | 整行亂碼（需用其他 encoding repair 工具）|
| 有 `| ??:` 模式的任何 .md 檔案 | 非 notes 欄位中的 `??:` |

---

## 技術說明

腳本使用「反向掃描定位」策略：

1. 掃描整個檔案原始字串（不逐行解析）
2. 找出所有 `YYYY-MM-DD |` note entry 起點
3. 對每個 `| ??:` 出現位置，找最近的 note entry 起點
4. 計算從起點到目標 `| ??:` 之間的 ` | ` 數量 → 確定 pipe 位置
5. 以正確標籤替換（替換前後字元長度相同，不影響後續位置計算）

此策略能正確處理 word-wrapped notes（一個 note entry 跨多個實體行的情況）。
