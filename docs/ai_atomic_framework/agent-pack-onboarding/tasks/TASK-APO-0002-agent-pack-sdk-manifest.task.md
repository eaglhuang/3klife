---
doc_id: doc_other_0153
task_id: TASK-APO-0002
title: Agent Pack SDK 介面 + manifest schema
milestone: M2
status: done
blocked_by: [TASK-APO-0000]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/agent-pack-sdk/**
  - packages/cli/src/commands/agent-pack.ts
  - packages/cli/src/atm.ts
  - schemas/agent-pack/**
  - tests/agent-pack/**
  - scripts/validate-schemas.ts
forbidden_files:
  - packages/core/**
  - release/**
non_goals:
  - 不實作 Claude Code Pack 內容
  - 不新增 npm publish workflow
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
started_at: 2026-05-17T22:45:34.8969738+08:00
started_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0002 — Agent Pack SDK 介面 + manifest schema

## 目標

建立 Agent Pack 的產品層 SDK 與 manifest schema，讓各 agent entry files 都能由同一份 SSoT render context 產生、驗證與乾淨卸載。

## 前置依賴

- TASK-APO-0000

## 輸入

- 計畫書 §2.3、§3、§4、§15/M2。
- 既有 Integration Adapter Layer 與 install manifest pattern。

## 輸出

1. `packages/agent-pack-sdk/package.json` + `src/index.ts`。
2. `AgentPack` / `TargetFile` / `RenderContext` / `RenderedManifest` 型別。
3. `renderManifest()` 與 `hashFiles()` 純函數。
4. `schemas/agent-pack/manifest.schema.json`。
5. `atm agent-pack install|uninstall|diff|list` CLI skeleton。

## 驗收條件

- [ ] `packages/agent-pack-sdk/package.json` + `src/index.ts` 存在，匯出 `AgentPack` / `TargetFile` / `RenderContext` / `RenderedManifest` 型別。
- [ ] `packages/agent-pack-sdk/src/index.ts` 提供 `renderManifest()` 與 `hashFiles()` 純函數。
- [ ] `schemas/agent-pack/manifest.schema.json` 存在且通過 AJV 編譯。
- [ ] `packages/cli/src/commands/agent-pack.ts` 提供 `install` / `uninstall` / `diff` / `list` 四個 sub-action。
- [ ] `packages/cli/src/atm.ts` 註冊 `agent-pack` 命令。
- [ ] `tests/agent-pack/install-uninstall-roundtrip.test.ts` 至少 1 個 positive + 1 個 user-modified fixture。

## 影響檔案

- `packages/agent-pack-sdk/**`
- `packages/cli/src/commands/agent-pack.ts`
- `packages/cli/src/atm.ts`
- `schemas/agent-pack/manifest.schema.json`
- `tests/agent-pack/**`
- `scripts/validate-schemas.ts`

## 驗證方式

```bash
cmd /c npm run validate:schemas
cmd /c npm run validate:cli
cmd /c npm run validate:standard
```

## 回滾策略

移除 SDK package、schema entry、CLI command registration 與 tests。

## Checklist

- [x] SDK 型別
- [x] manifest schema
- [x] CLI skeleton
- [x] install / uninstall roundtrip tests
- [ ] standard gate 通過（pre-existing blocker：upgrade.json 缺 4 個 MRP 選項，與本卡無關）

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M2 開卡，尚未接手實作 | 阻塞: TASK-APO-0000
2026-05-18 | 狀態: done | 驗證: validate:schemas ok (51 schemas), validate:neutrality ok, roundtrip test ok (8 checks) | 變更: 新增 packages/agent-pack-sdk, schemas/agent-pack/manifest.schema.json, packages/cli/src/commands/agent-pack.ts, atm.ts 註冊, command-specs.ts, scripts/validate-schemas.ts, tests/agent-pack/install-uninstall-roundtrip.test.ts | 阻塞: standard gate 預存 upgrade.json fixture 缺陷（out of scope）