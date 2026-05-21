<!-- doc_id: doc_other_0169 -->
# Map Replacement Protocol v2 — Implementation Handoff

**Status**: 任務卡 M11~M27 已全部規劃完成（17 張卡 + v2 計畫書 + 災難恢復設計）。
**Next step**: 跨 session 逐張實作。本文件記錄目前狀態與下一步可執行的具體指令。

---

## 1. 當前已完成事項（2026-05-21）

### 規劃層（在 3KLife repo）

- ✅ v2 計畫書（`拆解大型功能優化原子map計畫書v2.md`）— 含穩定性章節 §8
- ✅ 17 張任務卡（TASK-MRP-0011 ~ 0027）
- ✅ M22 / M24 已標記為 opt-in 預設關閉
- ✅ Rescue Police（M26）與 Disaster Recovery CLI（M27）已設計
- ✅ 全部護欄與回滾策略（4-level rollback）已寫入

### 治理層（在 npc-brain repo）

- ✅ Pending rollout-ready review 已完成 inspection：
  `guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance`
  （patch / rollback proof / human approval 都到位，等待人類最終 closeout）

### 實作層（在 AI-Atomic-Framework repo）

- ❌ **尚未開始**。原因：
  1. AI-Atomic-Framework repo 沒裝 Claude Code integration
  2. 每個原子要走完整 ATM governance flow（dry-run proposal → human review → apply → evidence → close）
  3. 17 張卡 × 每張平均 5+ atom = 數十個 governance cycle，單一 session 無法完成

---

## 2. 下一步啟動指令（依序）

### Step 1：在 AI-Atomic-Framework 安裝 Claude Code integration

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs integration add claude-code --json
node atm.mjs integration verify claude-code --json
```

### Step 2：選定首張要實作的任務卡

依 v2 §4 的新優先順序：

```
🥇 M11 Fingerprint 監控（純監控，無 mutation 風險，最安全起點）
🥈 M18 Atom Capsule（後續救援基石）
🥉 M21 Map Capsule
4  M26 Rescue Police（必須在 M22/M24 前）
5  M27 Disaster Recovery CLI
```

### Step 3：每張任務卡的標準工作流（以 M11 為例）

```bash
# 在 AI-Atomic-Framework
node atm.mjs start --goal "Implement TASK-MRP-0011 semantic fingerprint monitor per spec" --json
node atm.mjs next --json   # 取得當前 segment 與下一步指令

# 對每個要原子化的函數：
node atm.mjs upgrade --propose --behavior behavior.atomize --dry-run --target "<file>#<symbol>" --json
node atm.mjs review approve <proposalId> --reason "..." --json

# 人類審查（必要 gate）：產出 human-review.<proposalId>.approve.json
# 然後產出 actual-patch-evidence
# 然後產出 rollback-ready-proof
# 最後：
node atm.mjs review rollout-ready <proposalId> --json
node atm.mjs evidence add --task TASK-MRP-0011 --json
node atm.mjs tasks close --task TASK-MRP-0011 --evidence <path> --json
```

---

## 3. 任務卡狀態追蹤表

| 任務卡 | 規劃 | 護欄設計 | 回滾策略 | opt-in | 實作 | 備註 |
|--------|------|---------|---------|--------|------|------|
| M11 Fingerprint | ✅ | ✅ | ✅ | n/a | ✅ | 純監控、已完成，無漂移 |
| M12 Edge Contract | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M11 |
| M13 Progression Auto | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M12, M20 |
| M14 Memoization Cache | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M12 |
| M15 Telemetry Dashboard | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M11, M12 |
| M16 behavior.reshape | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M15, M17 |
| M17 behavior.retire | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M10（已 done） |
| M18 Atom Capsule | ✅ | ✅ | ✅ | n/a | ✅ | **救援基石**，CID+Registry+L1/L2 完成 |
| M19 Mermaid Auto-gen | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M11 |
| M20 Shadow A/B | ✅ | ✅ | ✅ | n/a | ❌ | 依賴 M4, M10 |
| M21 Map Capsule | ✅ | ✅ | ✅ | n/a | ✅ | map:cid Merkle tree + Registry 完成 |
| **M22 Daemon** | ✅ | ✅ | ✅ | **✅** | ✅ | 🔴 高風險，預設 OFF，triple-gate + kill switch 完成 |
| M23 atm do | ✅ | ✅ | ✅ | n/a | ✅ | 中風險，do/complete/status 完成 |
| **M24 Guide Cache** | ✅ | ✅ | ✅ | **✅** | ✅ | 🔴 最高風險，預設 OFF，dirty bypass + checksum 完成 |
| M25 Diff-evidence | ✅ | ✅ | ✅ | n/a | ✅ | 中風險，evidence diff 完成 |
| M26 Rescue Police | ✅ | ✅ | ✅ | n/a | ✅ | **救援核心**，INV-001~010 全部完成 |
| M27 Disaster Recovery | ✅ | ✅ | ✅ | n/a | ✅ | **救援工具**，7 subcommands 完成 |

---

## 4. 跨 repo 結構

```
C:\Users\User\
├── 3klife-npc-brain\        ← Python pipeline，使用 ATM 治理（host repo）
│   └── pipelines/sanguo-rag/run_full_roster_convergence_loop.py
│   └── ATM-MAP-0001 已 active
│
├── 3KLife\                  ← 主遊戲 repo，任務卡規劃文件的家
│   └── docs/ai_atomic_framework/map-replacement-protocol/
│       ├── 拆解大型功能優化原子map計畫書v2.md
│       ├── tasks/TASK-MRP-0011~0027.task.md
│       └── IMPLEMENTATION-HANDOFF.md（本文件）
│
└── AI-Atomic-Framework\     ← ATM 框架本身（upstream），實作目的地
    └── packages/core/src/   ← 所有 M11~M27 的代碼會落在這
```

---

## 5. 治理絕對規則（給未來實作的 AI / 人類）

1. **不可繞過 ATM**：所有 `packages/core/src/**` 改動必須經 `node atm.mjs start --goal "..."` 啟動 guidance session
2. **不可直接 commit**：每個改動必須有 `actual-patch-evidence` + `rollback-ready-proof`
3. **不可跳過 human review**：所有 dry-run proposal 必須有 human-review JSON
4. **不可繞過 Rescue Police**：若 INV-RESCUE-* 任一失敗，立即停手並走 M27 救援流程
5. **不可預設啟用 M22 / M24**：必須使用者明確 `daemon enable` / `cache enable`

---

## 6. 已知缺口與 TODO 清單

| 任務卡 | TODO | 原因 |
|--------|------|------|
| M11 | 待選 `chokidar` 或 `node:fs.watch` | Windows fs.watch 已知有 bug，但 chokidar 是額外依賴 |
| M14 | cache 入侵測試 fixture | 確保 polymorph atom 不會被誤觸 memoization |
| M18 | brotli 跨平台一致性測試 | Windows / Linux brotli 版本可能輸出不同 |
| M22 | systemd / launchd 整合 phase 2 設計 | 先做 attached daemon，OS-level 之後再做 |
| M24 | git submodule 場景的 commit hash 處理 | submodule 改動是否算 cache invalidation |
| M26 | INV-RESCUE-008 cache 自我驗證循環風險 | rescue police 自己用 cache → 死循環 |
| M27 | factory-reset 對 ATM-MAP-0001（已 active）的處理 | 需要特殊保護，避免誤砍生產中的 active map |

每張任務卡的 Checklist 區段也保留了完整 TODO 清單。

---

## 7. 本次 session 治理 evidence

- Candidate ranking report：`.atm/history/reports/candidates/candidate-ranking-2026-05-20T16-14-25-699Z.json`
- Source inventory report：`.atm/history/reports/candidates/candidate-ranking-2026-05-20T16-14-25-699Z.source-inventory.json`
- Police-family report：`.atm/history/reports/candidates/candidate-ranking-2026-05-20T16-14-25-699Z.police-family.json`
- Guidance-drift-police report：`.atm/history/reports/candidates/candidate-ranking-2026-05-20T16-14-25-699Z.guidance-drift-police.json`

---

*最後更新：2026-05-21 | 撰寫者：claude-opus-4-7*
