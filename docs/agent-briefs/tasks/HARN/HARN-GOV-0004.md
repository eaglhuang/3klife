---
doc_id: doc_task_0221
id: HARN-GOV-0004
priority: P2
phase: M0
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: Antigravity
status: done
started_at: "2026-05-04T21:09:00Z"
started_by_agent: Antigravity
completed_at: "2026-05-04T21:12:00Z"
completed_by_agent: Antigravity
notes: "2026-05-04 | 狀態: done | 驗證: passed | 變更: compute-gate-config.json 新增 dead-code gate，整合 scan-deprecated-refs.js | 阻塞: none"
---
# [HARN-GOV-0004] 整合死碼偵測至 compute-gate 自動化流程

> **Harness rollout 開卡** — 目前死碼掃描（export 未被引用、dead import 等）僅有手動執行腳本，未整合至 compute-gate 形成自動攔截。為避免技術債復燃，需要將死碼偵測升格為正式閘門。
> **定位**：Phase G+1 / Governance
> **前置依賴**：無

## 問題描述

待補：說明這張卡要修正或補齊的核心問題。

## INPUT_CONTRACT

- compute-gate.js 已就位
- import-boundary gate 通過
- scan-deprecated-refs.js 已實作

## OUTPUT_CONTRACT

- [x] 新增 dead-code gate（已寫入 compute-gate-config.json，id: dead-code，priority: 11）
- [x] 整合 scan-deprecated-refs.js --strict 掃描邏輯
- [x] compute-gate --gates dead-code 通過且違規數=0

## HARNESS_EVIDENCE

- compute-gate --gates dead-code：✅ 1/1 通過，0 _deprecated/ 引用
- compute-gate --profile standard：✅ 7/7 通過（含新 dead-code gate）
- scan-deprecated-refs.js：✅ 掃描 266 個 .ts 檔案，無任何引用
- handoff diff status：done

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates dead-code
```

## ROLLBACK_HINT

```bash
git checkout tools_node/compute-gate.js
```

## 執行步驟

1. 審查現有 scan-deprecated-refs.js 輸出格式
2. 定義死碼判斷規則 JSON
3. 在 compute-gate.js 新增 dead-code gate runner
4. 設定初始白名單
5. 驗證無誤報
6. 更新 CI 文件

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-04*
