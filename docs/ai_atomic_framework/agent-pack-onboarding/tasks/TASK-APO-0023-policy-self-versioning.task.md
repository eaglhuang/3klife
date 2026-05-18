---
doc_id: doc_other_0176
task_id: TASK-APO-0023
title: Policy self-versioning + auto matrix PR
milestone: M10
status: in-progress
started_at: 2026-05-18T11:01:40+08:00
started_by_agent: vs-insiders-gpt-5.4
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - docs/ai_atomic_framework/upstream-versioning-policy.md
  - .github/workflows/auto-matrix-pr.yml
  - scripts/generate-matrix-pr.ts
  - scripts/validate-policy-self-version.ts
  - scripts/validators.config.json
  - tests/policy-version/**
  - README.md
  - CONTRIBUTING.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 改寫整份政策內容（僅加 self-versioning 機制）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0023 — Policy Self-Versioning + Auto Matrix PR

## 背景

`upstream-versioning-policy.md` 規劃新增 §11 Policy Self-Versioning：政策文件本身需有 `policy_version` 與 `framework_version_range`，並由 release workflow 自動產 matrix diff PR。

## 目標

1. 政策文件 frontmatter 加 `policy_version: 0.1` 與 `framework_version_range: ">=0.1.0 <1.0.0"`。
2. `scripts/validate-policy-self-version.ts`：校驗 policy_version semver + framework_version_range 與當前 framework 重疊。
3. `.github/workflows/auto-matrix-pr.yml`：release tag 觸發，由 `scripts/generate-matrix-pr.ts` 計算新 compatibility-matrix.json diff，自動開 PR 給人類審核。
4. README / contributing 更新 policy 修改流程：先 bump `policy_version`，再回寫對應文件。

## 驗收

- [ ] policy_version 為非法 semver 時 validate-policy-self-version.ts 失敗。
- [ ] auto-matrix-pr workflow 在 fixture release 後產出可機器解析 diff PR。
- [ ] validator 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-policy-self-version.ts --mode validate
```

## Notes

2026-05-18 | 狀態: in-progress | 驗證: pending | 變更: vs-insiders-gpt-5.4 接手實作 policy self-versioning + auto matrix PR；補入 README.md / CONTRIBUTING.md scope 以滿足本卡目標 4 | 阻塞: none
