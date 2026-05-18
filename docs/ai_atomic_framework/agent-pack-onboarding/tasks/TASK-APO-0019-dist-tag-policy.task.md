---
doc_id: doc_other_0172
task_id: TASK-APO-0019
title: Dist-tag 政策 — latest / next / beta / lts 對應 + create-atm 預設
milestone: M8
status: done
started_at: 2026-05-18T10:23:46+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-18T10:34:15+08:00
completed_by_agent: vs-insiders-gpt-5.4
commit: c81da68 (AI-Atomic-Framework main)
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
  - docs/DIST_TAGS.md
  - .github/workflows/release-npm.yml
  - packages/cli/src/commands/welcome.ts
  - packages/create-atm/src/**
  - scripts/validate-dist-tag.ts
  - scripts/validators.config.json
  - tests/dist-tag/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 變更 SemVer 本體規則（屬 upstream-versioning-policy §3.1）
  - 重做 release workflow 全貌（僅補 tag 行為）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0019 — Dist-tag Policy

## 背景

`upstream-versioning-policy.md` §8 / 新增 §8.5 規範 dist-tag 對應與 pre-release 規則。本卡實作 release workflow 與 `create-atm` 選擇邏輯。

## 目標

1. `docs/DIST_TAGS.md`：tag 對應表（`latest` = stable+lts、`next` = beta、`beta` = experimental、`lts` = lts tier）。
2. release workflow 依 chart tier 自動選 dist-tag；alpha / beta 不可 promote 為 `latest`。
3. `create-atm` 預設拉 `latest`，可 `--tag next/beta/lts` 切換；welcome 顯示目前 tag + tier。
4. `scripts/validate-dist-tag.ts` 校驗 published tag 與 package version pre-release 段一致。

## 驗收

- [x] release dry-run 對 beta 版本不會誤打 `latest` tag。
- [x] `create-atm --tag next` fixture 安裝出 beta 版本。
- [x] validate-dist-tag.ts 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-dist-tag.ts --mode validate
```

## Notes

2026-05-18 | 狀態: done | 驗證: `dist-tag-policy.test.ts` PASS；`validate-dist-tag --mode validate` PASS；`validate-release-trust --mode validate` PASS；`run-validators.ts standard --filter dist-tag` PASS；`validate:standard` 中新增 dist-tag gate PASS，但既有 `multi-agent-confidence` generated matrix stale 仍使整體 profile exit 1 | 變更: 新增 `docs/DIST_TAGS.md`、release workflow dist-tag resolver / `--tag "$NPM_DIST_TAG"` publish、`create-atm --tag latest/next/beta/lts` 選擇紀錄、welcome distTag 顯示、validate-dist-tag 與 fixture；為完成 CLI/help 驗證同步更新 command registry 與 help snapshots；upstream commit c81da68 | 阻塞: none
