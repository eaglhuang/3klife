---
doc_id: doc_other_0152
task_id: TASK-APO-0001
title: 對齊 ATM ARCHITECTURE / README cross-link
milestone: M1
status: done
blocked_by: [TASK-APO-0000]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - README.md
  - docs/ARCHITECTURE.md
  - docs/AGENT_PACK_ONBOARDING.md
  - docs/multi-agent-compatibility-matrix.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不新增 CLI 行為
  - 不修改 adapter 安裝邏輯
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
started_at: 2026-05-17T22:40:29.9784044+08:00
started_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0001 — 對齊 ATM ARCHITECTURE / README cross-link

## 目標

在 AI-Atomic-Framework 的公開文件面建立 Agent Pack / Onboarding 的英文入口，讓開源使用者能理解這是 first-touch 與 agent entry enforcement 能力，而不是 3KLife 私有流程。

## 前置依賴

- TASK-APO-0000

## 輸入

- 計畫書 §0、§17、§18。
- 既有 `README.md`、`docs/ARCHITECTURE.md`。

## 輸出

1. `README.md` 增加 Agent Pack / Onboarding 入口連結。
2. `docs/ARCHITECTURE.md` 增加 Agent Operating Layer / Onboarding 邊界說明。
3. 若新增 `docs/AGENT_PACK_ONBOARDING.md`，內容需是英文、adopter-neutral，不包含 3KLife 內部任務卡。

## 驗收條件

- [ ] README 有公開入口連結。
- [ ] ARCHITECTURE 有 Agent Operating Layer / Onboarding 段落。
- [ ] 公開文件不引用 3KLife 私有路徑或中文任務卡。
- [ ] 文件通過 product-charter / neutrality 檢查。

## 影響檔案

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/AGENT_PACK_ONBOARDING.md`（可選新增）

## 驗證方式

```bash
cmd /c npm run validate:neutrality
cmd /c npm run validate:standard
```

## 回滾策略

移除新增文件與 README / ARCHITECTURE cross-link。

## Checklist

- [x] README cross-link
- [x] ARCHITECTURE 補章
- [x] adopter-neutral 掃描通過
- [ ] standard gate 通過

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M1 開卡，尚未接手實作 | 阻塞: TASK-APO-0000
2026-05-17 | 狀態: done | 驗證: neutrality ok (6 checks) | 變更: README cross-link + ARCHITECTURE Agent Pack Onboarding Surface 均已於 TASK-APO-0000 commit 79189c2 完成；本次在 docs/multi-agent-compatibility-matrix.md 補 AGENT_PACK_ONBOARDING.md 入口連結；by vs-insiders-gpt-5.4 | 阻塞: validate:standard 因 tests/cli-fixtures/help-snapshots/upgrade.json 缺少 MRP 時期新增的 4 個 options，屬預存問題，與本任務無關