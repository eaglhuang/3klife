---
doc_id: doc_index_asr_0001
owner: atm-core
status: internal-mirror
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
---

# ATM 自我治理拆分 Task Cards

本目錄收錄 `ATM 自我治理拆分計畫書.md` 對應的 3KLife 內部任務鏡像。把 `atm-tech-debt-refactor/` 留下的 7 份 SPLIT_PLAN.md 真正執行成程式碼。

---

## 追蹤狀態

| 欄位 | 說明 |
|---|---|
| public_tracking | 固定為 false，內部鏡像 |
| tracking_scope | internal-mirror |
| upstream_tracking | linked-pr 或 not-needed（內部重構通常 not-needed） |
| public_surface_risk | 必填，多數為 none |

## 拆卡進度

| 狀態 | 數量 |
|------|------|
| 已拆 | 3 |
| 進行中 | 0 |
| 完成 | 3 |

---

## 索引

| Task ID | 標題 | Layer | 狀態 | 阻擋者 | Invariant Risk | Upstream Tracking |
|---------|------|-------|------|--------|----------------|------------------|
| [TASK-ASR-0001](./TASK-ASR-0001-upgrade-path-helpers.task.md) | upgrade.ts 抽出 path-helpers | L1 | done | — | — | not-needed |
| [TASK-ASR-0002](./TASK-ASR-0002-upgrade-next-action-hint.task.md) | upgrade.ts 抽出 next-action-hint | L1 | done | TASK-ASR-0001 | — | not-needed |
| [TASK-ASR-0003](./TASK-ASR-0003-upgrade-canary.task.md) | upgrade.ts 抽出 canary helpers | L1 | done | TASK-ASR-0001 | — | not-needed |

---

## Layer 退出條件

| Layer | 主題 | 退出條件 | 對應卡數 |
|-------|------|---------|---------|
| L1 | Pure helpers | 三張卡都通過 validate:cli，upgrade.ts 行數下降 ~110 行 | 3（0001-0003） |
| L2 | Module-level | map-generator / command-specs / plugin-governance-local 拆分完成 | 計畫中 |
| L3 | Public-surface | upgrade safe-upgrade / propose / integrations-core / wrapper dedup | 計畫中 |

## Invariant 對照表

| Invariant | 說明 | 受影響卡片 |
|-----------|------|-----------|
| I1 Public CLI surface | atm.mjs <command> --json、exit code | （L1 無影響） |
| I2 Schema / manifest | schemaVersion、AJV | （L1 無影響） |
| I3 Release wire format | root-drop、onefile、npm | （L1 無影響） |

---

## 拆卡 SOP

1. 從索引選一張 open 卡。
2. 上鎖（`task-lock.js lock`），更新 frontmatter `status: in-progress`。
3. 編輯 `packages/cli/src/commands/upgrade.ts` 抽出函式到新檔。
4. 跑 `npm run validate:cli`（必要時 `validate:standard`）。
5. AI-Atomic-Framework 單獨 commit 一次。
6. 寫 evidence 到 `../evidence/TASK-ASR-XXXX-evidence.md`。
7. 解鎖並更新 task card `status: done`。
8. 3KLife 一起 commit 任務卡 + evidence。
