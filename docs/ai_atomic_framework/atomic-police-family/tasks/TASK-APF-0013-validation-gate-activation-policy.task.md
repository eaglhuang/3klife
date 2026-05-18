---
doc_id: doc_other_0640
task_id: TASK-APF-0013
title: Validation gate activation policy
milestone: M7
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0010]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: document policy + validate:standard target
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected docs hard-code 3KLife
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.atm-temp/**
non_goals:
  - 不直接修改 upstream runtime，除非本卡進入實作階段
  - 不建立第二套 approval workflow
  - 不讓 police finding 直接 mutate registry
  - 不新增獨立任務路由器
  - 不把 3KLife / Cocos / private path 寫入 upstream protected public contract
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0013 — Validation gate activation policy

## 背景

原子警察家族若只存在於 roadmap 或 fixture，仍不足以稱為守關。M7 要求最低門檻改成可由 validator profile 啟動，並能輸出 machine-readable report / finding。

## 目標

定義 `gate-active` 狀態、`standard/full` profile 的 blocker/advisory policy，以及哪些 family 初期只能 advisory。

## 前置依賴

TASK-APF-0010

## 輸入

- 原子警察家族計畫書 §7.3
- AI-Atomic-Framework `scripts/validators.config.json`
- `specs/APF-0013-validation-gate-activation-policy.md`

## 輸出

- Validation gate activation policy
- `gate-active` 狀態定義
- standard / full profile police family policy

## 驗收條件

- [x] 主計畫書新增 M7 Validation Gate Activation 章節（§7 M7 row + §7.1 profile policy + §7.2 alpha 排程）
- [x] `gate-active` 被定義為 validator profile 可啟動且可產 report / finding（specs/APF-0013 §1）
- [x] `standard` 的 blocker/advisory family 列表完成（specs/APF-0013 §2）
- [x] 不宣稱 named scanners 已完成 runtime 產品化（artifact_status/runtime_status 雙軌欄位已生效）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/3KLife run check:encoding:touched -- --files C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
~~~

## 回滾策略

文件階段可回退 APF M7 章節與本任務卡；不得回退其他使用者變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0013-* | 阻塞: TASK-APF-0010
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: 4 項 acceptance 全部勾選；主計畫書 §7 + §7.1 + §7.2 已補入，spec 已完整；status 維持 open 與其他 M7 卡一致 | 阻塞: upstream runtime gate 實作
2026-05-19 | 狀態: done | 驗證: pass | 變更: upstream validate-police-family.ts 實作完成，validate:police-family wired into standard profile，gate-active 政策全面生效 | 完成
