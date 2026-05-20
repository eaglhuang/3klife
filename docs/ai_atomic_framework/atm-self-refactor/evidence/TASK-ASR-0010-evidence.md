---
doc_id: doc_evidence_asr_0010
task_id: TASK-ASR-0010
layer: L3-follow
status: done
completed_at: 2026-05-20T03:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 69fe931
---

# Evidence — TASK-ASR-0010 — wrappers generator + parity validator 接 SSoT

## 完成摘要

WRAPPER_DEDUP_PLAN.md Step 2 + Step 3 完成。

| 項目 | 說明 |
|------|------|
| 新增 | `scripts/generate-wrappers.ts` |
| 修改 | `scripts/validate-script-parity.ts`（scriptRoutes 改接 SSoT） |
| 修改 | `package.json`（加 `generate:wrappers` script） |
| Upstream commit | 69fe931 |

## 驗收結果

| 測試 | 指令 | 結果 |
|------|------|------|
| TypeScript typecheck | `npm run typecheck` | 0 errors |
| Generator byte-equal | `npm run generate:wrappers` + `git diff` | 0 changes（14 個 wrapper 完全相同）|
| Parity validator | `npm run validate:script-parity` | ok (7 POSIX + 7 PowerShell wrappers, init install, hello-world smoke) |

## Byte-equal 驗證細節

Generator 第一版有 bug：TypeScript 字串 `"..\\..\\..."` 輸出為 `"..\..\..."` 而原始 ps1 是 `"..\..\.."`（多了一個點）。修正後 `"..\\..\\.."` 才是正確的。

修正後 `git diff --stat templates/root-drop/.atm/scripts/` 無輸出 → 完全 byte-equal ✓

## 設計說明

**舊的問題：**
`validate-script-parity.ts` 的 `scriptRoutes` 是硬編碼，跟 `wrappers.json` 是兩個獨立的事實來源。如果 wrappers.json 更新了，validator 不會自動感知到變化。

**新的設計：**
```
wrappers.json（SSoT）
    ├─ scripts/generate-wrappers.ts 讀取 → 生成 14 個 .sh / .ps1
    └─ scripts/validate-script-parity.ts 讀取 → scriptRoutes 動態建立
```

現在 `wrappers.json` 是真正的唯一事實來源。新增/修改 wrapper 只需改 wrappers.json，generator 和 validator 都會跟著更新。

## Invariant 結果

| Invariant | 結果 |
|-----------|------|
| I3 Release wire format | unchanged（generator byte-equal 驗證） |
