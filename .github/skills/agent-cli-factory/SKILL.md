---
doc_id: doc_agentskill_0102
name: agent-cli-factory
description: 'Agent-native CLI 二度封裝工作流。USE FOR: 需要把高頻網站/API/SaaS/外部資料查詢封裝成專案內可重跑 CLI、使用 Printing Press CLI Factory、降低 Browser/Playwright/MCP token 成本、或讓其他 Agent 以純文字/JSON 快速查資料。'
argument-hint: '說明資料來源、查詢目標、輸出欄位、是否可 live fetch、是否需要 Printing Press、預期 artifacts 路徑。'
---

# Agent CLI Factory

把「Agent 需要反覆查的外部資料」做成 repo-local CLI，再讓其他 Agent 透過 skill 使用。

Unity 對照：這不是讓 Agent 每次手動開 Inspector 找資料，而是做成 `AssetPostprocessor` / import pipeline；資料來源一變，重新跑 CLI 就能得到同樣格式的匯入結果。

## When to Use

- 同一個網站/API/SaaS 查詢會被多個 Agent 或多輪任務重複使用。
- Browser / Playwright / MCP 讀取成本太高，但結果本質上是文字或結構化資料。
- 外部資料需要 cache、source citation、hash、diff、品質驗證。
- 要接 `general-data-pipeline`、`sanguo-rag-resolution-loop`、`3kweb-check` 這類資料流程。
- 使用者提到 Printing Press、CLI Factory、agent-native CLI、把網站/API 變 CLI。

## Do Not Use

- 一次性的簡單查詢，直接 web search 或人工貼資料更快。
- 需要視覺判讀、登入互動、拖曳點擊的流程；先用 Browser/Playwright，穩定後才封裝。
- 來源授權、robots、TOS、版權或個資風險不清楚時，不可自動批量抓取。
- 不要讓 CLI 直接覆蓋 canonical 遊戲資料，例如 `generals.json`；只能輸出 artifacts 或中間檔，人工確認後再入庫。

## CLI Contract

每個給 Agent 用的 CLI 至少支援：

```text
--help
--json
--compact
--dry-run
--limit <n>
--cache-dir <path>
--output <path>
--self-test
```

輸出規則：

- `--compact` 只輸出高價值欄位，避免把整頁 HTML、長 API payload 或大量原文塞回 context。
- `--json` 必須是穩定 schema；失敗時也輸出 `{ "ok": false, "error": {...} }`。
- 每筆外部資料都要能追到 `sourceRef` / `url` / `locator` / `quote` / `hash` 中至少三種。
- cache 放 `local/agent-cli-cache/<cli-name>/`；任務產物放 `artifacts/data-pipeline/<cli-name>/<run-id>/`。

Exit code：

```text
0 = success
2 = no data / no match
3 = source validation failed
4 = network/auth/rate-limit blocked
5 = output contract error
7 = unsafe write blocked
```

## Standard Workflow

1. 先判斷是否值得做 CLI  
   若不是高頻、可重跑、可驗證的查詢，不要過度工程化。

2. 先找既有工具  
   搜尋 `tools_node/`、`server/npc-brain/pipelines/`、`.github/skills/`、`.agents/skills/` 是否已有可用 CLI 或 skill。已有就包薄一層，不要重做。

3. 選擇實作路線  
   - Printing Press 已安裝且任務是網站/API/SaaS 包裝：優先用 Printing Press 產生 CLI。
   - Printing Press 不可用或任務很小：用專案既有 Node/Python 寫 repo-local CLI。
   - 需要登入或視覺流程：先用 Browser/Playwright 探索，再把穩定 API 或 HTML parser 收斂成 CLI。

4. 建立 CLI  
   建議路徑：
   - Node 小工具：`tools_node/agent-clis/<cli-name>.js`
   - Python 資料管線：`server/npc-brain/pipelines/<domain>/<cli-name>.py`
   - Printing Press / Go 產物：`tools/agent-clis/<cli-name>/`

5. 建立或更新 skill  
   若 CLI 會被重複使用，新增同名或領域名 skill，內容只保留「何時使用、標準命令、產出物、驗證方式」。不要把完整 API 文件貼進 skill。

6. 驗證  
   至少跑：

```bash
node tools_node/skills-manager.js validate
npm run check:encoding:touched -- --files <changed-files>
```

若修改 TypeScript 或 runtime 程式，再接 `compute-gate`。

## Printing Press Path

如果使用 Printing Press：

1. 先確認工具存在，不要擅自安裝：

```powershell
Get-Command printing-press -ErrorAction SilentlyContinue
```

2. 若缺 Go / `printing-press` / npm package，需要網路或全域安裝時，先向使用者確認。

3. 給 CLI Factory 的 prompt 必須包含：

```text
資料來源：
核心查詢：
compact 輸出欄位：
是否允許 live fetch：
cache 與 artifacts 路徑：
source citation 欄位：
禁止直接寫入 canonical 檔案：
self-test / smoke test：
```

4. 產物回 repo 前，要補上本專案 CLI contract；Printing Press 生成的預設命令若太肥，另做 project wrapper。

## 3KLife Recommended Uses

優先候選：

- `3klife-sanguo-source`：三國人物外部來源查詢、來源引用、quote/hash、候選欄位輸出。
- `3klife-koei-stats`：光榮數值參考資料轉成中間 JSON，僅供設計校準，不直接入庫。
- `3klife-source-health`：網站來源健康檢查、seed coverage、缺證據武將建議。
- `3klife-doc-query`：大型 docs/shards 的本機查詢與摘要，不把大檔塞進 context。

## Safety Checklist

- 不提交 API key、cookie、session、個資。
- 不繞過 paywall，不做高頻壓測，不忽略 robots/TOS 風險。
- 預設 read-only；任何寫入都必須先 `--dry-run`，且只寫 artifacts/local。
- canonical 變更需使用對應資料管線 skill 與人工審核。
- final 回報要列出 CLI 路徑、主要命令、驗證結果、剩餘風險。
