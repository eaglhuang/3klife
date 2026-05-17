---
doc_id: doc_other_0171
task_id: TASK-APO-0018
title: Security policy — SECURITY.md + advisory branch + dependency scanning gate
milestone: M8
status: open
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
  - SECURITY.md
  - docs/SECURITY.md
  - .github/workflows/dependency-scan.yml
  - .github/dependabot.yml
  - scripts/validate-security-policy.ts
  - scripts/validators.config.json
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 安全漏洞修補本身（依個案另開 task）
  - 撰寫具體 CVE 處理（屬 incident response 範疇）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0018 — Security Policy

## 背景

`upstream-versioning-policy.md` 新增 §3.6 Security Release Policy 要求：揭露管道、advisory branch、SLA、dependency scanning。本卡建立 baseline。

## 目標

1. `SECURITY.md`：揭露管道（私有 issue / email）、SLA（acknowledge ≤ 72h、fix target 依 severity）、PGP key。
2. `.github/dependabot.yml` 啟用 weekly scan + auto-PR。
3. `.github/workflows/dependency-scan.yml` 跑 `npm audit --omit=dev` + osv-scanner，高 / 重大 severity blocking。
4. advisory branch SOP：`security/<advisory-id>` 私有 branch + coordinated disclosure timeline。
5. `scripts/validate-security-policy.ts` 校驗 SECURITY.md 存在且含必要章節。

## 驗收

- [ ] dependency-scan workflow 對既有 fixture 通過。
- [ ] validate-security-policy.ts 加入 standard profile。
- [ ] SECURITY.md 通過內部 review checklist（揭露 / SLA / key fingerprint）。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-security-policy.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 security policy 後續卡 | 阻塞: none
