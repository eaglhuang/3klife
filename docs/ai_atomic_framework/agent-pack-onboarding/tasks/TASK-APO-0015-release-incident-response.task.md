---
doc_id: doc_other_0168
task_id: TASK-APO-0015
title: Release incident response + known-bad-versions 黑名單
milestone: M8
status: open
blocked_by: [TASK-APO-0014]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - known-bad-versions.json
  - schemas/governance/known-bad-versions.schema.json
  - scripts/validate-known-bad-versions.ts
  - scripts/validators.config.json
  - packages/cli/src/startup-known-bad.ts
  - packages/cli/src/commands/doctor.ts
  - docs/INCIDENT_RESPONSE.md
  - tests/known-bad/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 安全揭露程序（屬 TASK-APO-0018）
  - dist-tag 切換（屬 TASK-APO-0019）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0015 — Release Incident Response

## 背景

`upstream-versioning-policy.md` 新增 §4.7 Known-bad Versions 要求：當已發佈版本被發現有資料毀損、安全 / 授權問題時可即時阻擋。

## 目標

1. `known-bad-versions.json` schema：version range / reason / replacementVersion / severity / addedAt。
2. release workflow 與 CLI bundle 同步該檔；CLI 啟動時對自身版本檢查。
3. CLI 進入 deny-write 模式並提示 replacement；read-only doctor 仍可診斷。
4. `docs/INCIDENT_RESPONSE.md` SOP：何時新增條目、回滾協議、與 npm `npm deprecate` 的關係。
5. `scripts/validate-known-bad-versions.ts` 校驗 schema 與 semver range 合法性。

## 驗收

- [ ] `known-bad-versions.json` fixture 中標記目前 CLI 版本 → CLI 拒絕寫入動作。
- [ ] CLI 顯示 replacement version + reason summary。
- [ ] validate-known-bad-versions.ts 失敗訊息可機器解析。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-known-bad-versions.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 release incident response 後續卡 | 阻塞: TASK-APO-0014
