---
doc_id: doc_other_0161
task_id: TASK-APO-0010
title: 多 agent 矩陣自動生成
milestone: M5
status: done
blocked_by: [TASK-APO-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
started_at: 2026-05-17T23:44:15.5517787+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-17T23:48:46.3937263+08:00
completed_by_agent: vs-insiders-gpt-5.4
allowed_files:
  - scripts/render-agent-matrix.ts
  - scripts/validate-multi-agent-confidence.ts
  - scripts/validators.config.json
  - docs/multi-agent-compatibility-matrix.md
  - packages/agent-pack-*/**
  - tests/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不新增 agent pack package
  - 不手抄 matrix 作為真相來源
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0010 — 多 agent 矩陣自動生成

## 目標

由 agent-pack registry / package metadata 反向產生 `docs/multi-agent-compatibility-matrix.md`，禁止人類手抄矩陣漂移。

## 前置依賴

- TASK-APO-0006

## 輸入

- 計畫書 §8、§12.7、§15/M5。
- Multi-agent packs 的 manifest / metadata。

## 輸出

1. `scripts/render-agent-matrix.ts`。
2. 由 script 產出的 `docs/multi-agent-compatibility-matrix.md`。
3. CI 或 validator 比對 matrix sha256 / generated output。

## 驗收條件

- [x] `scripts/render-agent-matrix.ts` 從 agent-pack registry 自動生成 `docs/multi-agent-compatibility-matrix.md`。
- [x] CI 比對 matrix sha256，漂移即 block。
- [x] matrix 內容涵蓋 Claude Code、Cursor、Copilot、Gemini、Windsurf。
- [x] 手改 matrix 但未更新 source registry 時 validator 會失敗。

## 影響檔案

- `scripts/render-agent-matrix.ts`
- `scripts/validate-multi-agent-confidence.ts`
- `scripts/validators.config.json`
- `docs/multi-agent-compatibility-matrix.md`
- `packages/agent-pack-*/**`
- `tests/**`

## 驗證方式

```bash
cmd /c npm run validate:standard
```

## 回滾策略

移除 generator 與 validator；保留現有人工 matrix，但需在 notes 標記 drift risk。

## Checklist

- [x] generator
- [x] generated matrix
- [x] CI drift check
- [x] multi-agent coverage

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M5 開卡，尚未接手實作 | 阻塞: TASK-APO-0006
2026-05-17 | 狀態: done | 驗證: `node --experimental-strip-types c:/Users/User/AI-Atomic-Framework/scripts/render-agent-matrix.ts --check` pass；`node --experimental-strip-types c:/Users/User/AI-Atomic-Framework/scripts/validate-multi-agent-confidence.ts --mode validate` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:standard` pass；encoding touched / AI UTF-8 check pass；`node c:/Users/User/3KLife/tools_node/compute-gate.js --profile standard --agent-feedback` pass | 變更: upstream commit `d2c7e10 feat: generate multi-agent compatibility matrix`，新增 renderer、產出 generated compatibility matrix，並將 exact generated-output drift check 接入 standard validator | 阻塞: none