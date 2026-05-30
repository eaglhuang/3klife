---
id: "TASK-AAO-0095"
title: "tasks.ts wave 3-A parse-options cluster split"
owner: "antigravity-gemini-3.5-flash"
priority: "P1"
status: "in-progress"
type: "refactor"
phase: "M2"
created: "2026-05-30"
created_by_agent: "GitHubCopilot"
related_cards: []
depends:
  - TASK-AAO-0077
notes: "2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無"
---

# TASK-AAO-0095 tasks.ts wave 3-A parse-options cluster split

## 摘要
- tasks.ts 已達 5305 行，wave 3 啟動。本卡（3-A）切出 parse-options cluster (~600 行純解析函數)。

## 驗證條件
- parse-options cluster successfully extracted to task-option-parsers.ts
- tasks.ts backward compatibility maintained
- atom map updated

## 交付物
- packages/cli/src/commands/tasks.ts
- packages/cli/src/commands/tasks/task-option-parsers.ts
- packages/cli/src/commands/tasks/task-option-parsers.test.ts
- atomic_workbench/atomization-coverage/path-to-atom-map.json

## 相關聯任務卡
- 無

## 備註
- 2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無
