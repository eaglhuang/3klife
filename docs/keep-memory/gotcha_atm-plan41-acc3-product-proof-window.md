---
name: gotcha-atm-plan41-acc3-product-proof-window
description: Plan 4.1 ACC-3 只算單一封印 product-proof window 的 commandRun 區間聯集，禁止跨歷史 burst 累加分母或把命令間空白當工作
type: gotcha
updated: 2026-08-23
repo: AI-Atomic-Framework
status: active
---

# Plan 4.1 ACC-3 只算封印 window 的 command 區間聯集

1. **一個 product-proof window，不是全歷史 scoped activity。** 本輪封印為 Cursor 第一筆 commandRun `2026-08-23T07:10:35.024Z` 到 Claude 最後一筆 `2026-08-23T07:16:40.204Z`。window 外舊 burst 不得進入 `shorterIntervalMs`。
2. **duration＝window 內真實 `[startedAt, finishedAt]` 聯集。** 命令之間的空白不算工作；重疊區間要去重。overlap＝兩位 editor 聯集的交集。
3. **requiredMs＝min(15 分鐘, 本 window 較短 scoped-union ×25%)。** ACC-3 只有 overlapMs ≥ requiredMs 且 distinct editors 時才 met。claim 時長不進 scoped 公式。
4. **npm test exit 1 仍是可歸因 scoped work，但 validator 必須保留 failure。** 不得把儀表標成全綠；final publication 仍等 ATM-GOV-0406 P1。
5. **禁止硬編碼估值。** 數字必須由 compiler 從 evidence 重算。
