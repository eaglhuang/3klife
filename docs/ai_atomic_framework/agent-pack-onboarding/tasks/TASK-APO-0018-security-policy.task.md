---
doc_id: doc_other_0171
task_id: TASK-APO-0018
title: Security policy — SECURITY.md + advisory branch + dependency scanning gate
milestone: M8
status: done
started_at: 2026-05-18T10:09:14+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-18T10:16:30+08:00
completed_by_agent: vs-insiders-gpt-5.4
commit: 6622e5a (AI-Atomic-Framework main)
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
lastTransitionId: 2026-05-21T10-29-44-169Z-migrate-legacy-ledger-7c2713d050ed
lastTransitionAt: 2026-05-21T10:29:44.169Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.169Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f0d32c242541f77ff5770e1f152db5e88d03c32004caf4a27fec673c2681ed15
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

- [x] dependency-scan workflow 對既有 fixture 通過。
- [x] validate-security-policy.ts 加入 standard profile。
- [x] SECURITY.md 通過內部 review checklist（揭露 / SLA / key fingerprint）。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-security-policy.ts --mode validate
```

## Notes

2026-05-18 | 狀態: done | 驗證: `validate-security-policy --mode validate` PASS；`run-validators.ts standard --filter security` PASS；`npm audit --omit=dev --audit-level=high` PASS；`validate:standard` 中新增 security gate PASS，但既有 `multi-agent-confidence` generated matrix stale 仍使整體 profile exit 1；`npm run typecheck` 仍有既有 core / rollout 型別錯誤，未指向本卡新增檔案 | 變更: 新增 root SECURITY.md、docs/SECURITY.md 維護者 SOP、Dependabot weekly npm PR 設定、dependency-scan workflow、validate-security-policy.ts，並納入 standard profile；upstream commit 6622e5a | 阻塞: none
