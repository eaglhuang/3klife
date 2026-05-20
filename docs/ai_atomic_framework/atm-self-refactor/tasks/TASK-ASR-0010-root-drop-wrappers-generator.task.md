---
doc_id: doc_other_asr_0010
task_id: TASK-ASR-0010
title: root-drop wrappers generator + parity validator 接 SSoT
layer: L3-follow
status: done
blocked_by: [TASK-ASR-0009]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:script-parity
public_tracking: false
allowed_files:
  - scripts/generate-wrappers.ts
  - scripts/validate-script-parity.ts
  - templates/root-drop/.atm/scripts/sh/*.sh
  - templates/root-drop/.atm/scripts/ps/*.ps1
created_at: 2026-05-20T03:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
started_at: 2026-05-20T03:00:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-20T03:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 69fe931
---

# TASK-ASR-0010 — root-drop wrappers generator + parity validator 接 SSoT

## 目標

WRAPPER_DEDUP_PLAN.md Step 2 + Step 3。把 `wrappers.json` SSoT（已在 TASK-ASR-0009 建立）真正接上系統：

1. **Generator**（`scripts/generate-wrappers.ts`）：讀 wrappers.json，重新生成全部 14 個 wrapper 檔案（7×.sh + 7×.ps1）
2. **Validator 接 SSoT**（修改 `scripts/validate-script-parity.ts`）：把 `scriptRoutes` 硬編碼改為從 wrappers.json 動態讀取

## 背景

目前狀況：
- `wrappers.json` 是 SSoT，記了 7 個 wrapper 的完整調用合約
- `validate-script-parity.ts` 裡的 `scriptRoutes` 是**手動硬編碼**，跟 wrappers.json **獨立**
- 沒有 generator，14 個 wrapper 都是手動維護的

執行後狀況：
- `validate-script-parity.ts` 的 `scriptRoutes` 改為**從 wrappers.json 讀取**（唯一事實來源）
- 新增 `scripts/generate-wrappers.ts`：根據 wrappers.json 生成 14 個 wrapper
- `npm run generate:wrappers` 可重新生成；`npm run validate:script-parity` 驗證無漂移

## 驗收條件

- [x] `npm run validate:script-parity` ok，路由從 wrappers.json 動態讀取
- [x] `npm run generate:wrappers` 可生成 14 個 wrapper，內容與現有檔案 byte-equal
- [x] I3 release wire format 不變（14 個 wrapper 內容完全相同）

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I3 Release wire | 14 個 wrapper 的調用合約 | generator 輸出必須與現有檔案 byte-equal |
