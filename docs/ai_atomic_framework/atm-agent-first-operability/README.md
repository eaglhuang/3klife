<!-- doc_id: doc_index_1004 -->
# ATM Agent-First 可操作性系列

AAO 是 `ATM Agent-First Operability` 的縮寫，用來承接 ATM repo 在 Agent 實際操作時的可讀性、可修性與 drift guard 類問題。  
這不是 `TASK-ASA-*` 的續號，也不是第二套 ATM runtime queue；它是 3KLife 端的規劃與追蹤入口。

## 分工原則

- ASA：處理 ATM 框架 100% 自我原子化，聚焦 ownership / evidence / release atomization。
- AAO：處理 Agent UX、CLI surface、validator failure、context slimming、docs drift。
- ATD：保留既有技術債主題，例如 `TASK-ATD-0023` 的 `any` debt budget 與 `TASK-ATD-0032` 的 root-drop sandbox E2E。

## 入口

- 主計畫書：[`ATM Agent-First 可操作性優化計畫書.md`](./ATM%20Agent-First%20可操作性優化計畫書.md)
- 任務索引：[`tasks/README.md`](./tasks/README.md)

## 使用方式

先看主計畫書確認這一系列要解的問題，再從任務索引依賴順序逐張執行。  
真正的 upstream 變更仍應落在 `AI-Atomic-Framework`，AAO 檔案只保存規劃、橋接與驗收標準。

