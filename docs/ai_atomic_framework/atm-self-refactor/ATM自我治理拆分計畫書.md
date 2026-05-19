---
doc_id: doc_plan_asr_0001
owner: atm-core
status: active
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
---

# ATM 自我治理拆分計畫書（ATM Self-Refactor）

本計畫書承接 `../atm-tech-debt-refactor/` 留下的 7 份 SPLIT_PLAN.md，把每一份「拆分計畫」轉成一張可追蹤、可上鎖、可保留 evidence 的 atomic task card。

## 核心原則

1. **內部追蹤鏡像**：所有 `TASK-ASR-*`（ATM Self-Refactor）卡只存在於 3KLife，不污染 AI-Atomic-Framework 開源 repo。
2. **dogfood ATM**：用 ATM 自己的原子任務模型來治理 ATM 自己的重構，每張卡符合 atomic work item 的定義。
3. **層序執行**：按 Layer 1（低風險工具函式） → Layer 2（中度模組）→ Layer 3（高風險主流程）順序進行。
4. **每張卡單獨提交**：每張卡完成後跑 `validate:cli` 通過，然後 commit AI-Atomic-Framework；3KLife 任務卡狀態同步更新。

## 任務卡序列（按執行順序）

### Layer 1 — Pure helpers, no I-invariant risk

| Task ID | 標的檔案 | 拆出的函式 | 對應 SPLIT_PLAN |
|---------|---------|----------|----------------|
| TASK-ASR-0001 | `packages/cli/src/commands/upgrade.ts` | path-helpers（safeReadJson, sha256File, resolveRepositoryPath, normalizeRepositoryRelativePath） | upgrade/SPLIT_PLAN.md |
| TASK-ASR-0002 | `packages/cli/src/commands/upgrade.ts` | next-action-hint（buildUpgradeNextActionHint） | upgrade/SPLIT_PLAN.md |
| TASK-ASR-0003 | `packages/cli/src/commands/upgrade.ts` | canary helpers（parseCanaryPercent, resolveCanarySelection, shouldApplyUpgradeFile） | upgrade/SPLIT_PLAN.md |

### Layer 2 — Medium-risk module-level splits（後續）

預定：map-generator、command-specs、plugin-governance-local exports。

### Layer 3 — High-risk public-surface splits（最後）

預定：upgrade.ts safe-upgrade / scan / proposal、propose.ts、integrations-core、root-drop wrapper dedup。

## 上鎖規則

每張 TASK-ASR-* 卡接手前都要：

```bash
node tools_node/task-lock.js check TASK-ASR-XXXX
node tools_node/task-lock.js lock TASK-ASR-XXXX ClaudeCode_<model-name>
```

完成後解鎖並更新 frontmatter `status: done`。

## 與 ATD 系列的差異

- **ATD（atm-tech-debt-refactor）**：寫了拆分計畫書 + acceptance gate，但沒有實際拆程式碼。
- **ASR（atm-self-refactor）**：把 ATD 留下的計畫書當成 contract，實際執行拆分並 commit。

## 邊界

不在本計畫書內：
- 不調整 public CLI surface（I1）
- 不改變 schema / manifest 結構（I2、I5）
- 不污染 AI-Atomic-Framework 上游 repo 的 task-tracking 路徑
