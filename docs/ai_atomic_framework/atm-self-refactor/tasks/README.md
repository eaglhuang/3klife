---
doc_id: doc_index_asr_0001
owner: atm-core
status: internal-mirror
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
last_updated: 2026-05-20T02:10:00+08:00
---

# ATM 自我治理拆分 Task Cards

本目錄收錄 `ATM 自我治理拆分計畫書.md` 對應的 3KLife 內部任務鏡像。把 `atm-tech-debt-refactor/` 留下的 7 份 SPLIT_PLAN.md 真正執行成程式碼。

---

## 追蹤狀態

| 欄位 | 說明 |
|---|---|
| public_tracking | 固定為 false，內部鏡像 |
| tracking_scope | internal-mirror |
| upstream_tracking | not-needed（內部重構） |
| public_surface_risk | 必填，所有卡均為 none / 已驗證 |

## 拆卡進度

| 狀態 | 數量 |
|------|------|
| 已拆 | 14 |
| 進行中 | 0 |
| 完成 | 14 |
| Deferred (future cards) | 1+ |

---

## 索引

| Task ID | 標題 | Layer | 狀態 | 阻擋者 | Invariant Risk | Upstream Commit |
|---------|------|-------|------|--------|----------------|-----------------|
| [TASK-ASR-0001](./TASK-ASR-0001-upgrade-path-helpers.task.md) | upgrade.ts 抽出 path-helpers | L1 | done | — | — | 85f2db1 |
| [TASK-ASR-0002](./TASK-ASR-0002-upgrade-next-action-hint.task.md) | upgrade.ts 抽出 next-action-hint | L1 | done | TASK-ASR-0001 | — | f9d286a |
| [TASK-ASR-0003](./TASK-ASR-0003-upgrade-canary.task.md) | upgrade.ts 抽出 canary helpers | L1 | done | TASK-ASR-0001 | — | 41c8c96 |
| [TASK-ASR-0004](./TASK-ASR-0004-command-specs-common.task.md) | command-specs 抽出 _common | L2 | done | — | I1 (snapshot) | 48dd41b |
| [TASK-ASR-0005](./TASK-ASR-0005-map-generator-normalize-fields.task.md) | map-generator 抽出 normalize-fields + errors | L2 | done | — | I2 | fcd4184 |
| [TASK-ASR-0006](./TASK-ASR-0006-map-generator-normalize-lineage.task.md) | map-generator 抽出 normalize-lineage | L2 | done | TASK-ASR-0005 | I2 | 525381e |
| [TASK-ASR-0007](./TASK-ASR-0007-propose-failure-reason.task.md) | propose 抽出 failure-reason | L3 | done | — | I2 | 6823fe7 |
| [TASK-ASR-0008](./TASK-ASR-0008-integrations-core-charter-block.task.md) | integrations-core 抽出 charter-block | L3 | done | — | I5 | b54120c |
| [TASK-ASR-0009](./TASK-ASR-0009-root-drop-wrappers-manifest.task.md) | root-drop wrappers.json SSoT | L3 | done | — | I3 | 947849f |
| [TASK-ASR-0010](./TASK-ASR-0010-root-drop-wrappers-generator.task.md) | root-drop wrappers generator + validator 接 SSoT | L3-follow | done | TASK-ASR-0009 | I3 | 69fe931 |
| [TASK-ASR-0011](./TASK-ASR-0011-command-specs-per-file-split.task.md) | command-specs 39 spec per-file split | L2-complete | done | TASK-ASR-0004 | I1 | 779f74e |
| [TASK-ASR-0012](./TASK-ASR-0012-propose-full-split.task.md) | propose.ts 完整拆分 normalize-input + gates | L3-complete | done | TASK-ASR-0007 | I2 | c46e690 |
| [TASK-ASR-0013](./TASK-ASR-0013-integrations-core-full-split.task.md) | integrations-core 完整 compiler/manifest/verify split | L3-complete | done | TASK-ASR-0008 | I5 | 613dd73 |
| [TASK-ASR-0014](./TASK-ASR-0014-upgrade-full-split.task.md) | upgrade.ts 完整拆分（experimental/safe-upgrade/scan/proposal） | L3-complete | done | TASK-ASR-0001~0003 | I1 | 13fea94 |

---

## Layer 退出條件

| Layer | 主題 | 退出條件 | 對應卡數 | 狀態 |
|-------|------|---------|---------|------|
| L1 | Pure helpers | validate:cli 全綠，upgrade.ts 行數下降 | 3 | ✅ 完成 |
| L2 | Module-level | validate:quick 全綠，map-generator 行數下降 | 3 | ✅ 完成 |
| L3 | Public-surface | 最低耦合切片，各自的 invariant validator 全綠 | 3 | ✅ 完成 |

## Invariant 對照表

| Invariant | 說明 | 受影響卡片 | 結果 |
|-----------|------|-----------|------|
| I1 Public CLI surface | atm.mjs <command> --json、help snapshot | 0004 | unchanged |
| I2 Schema / manifest | upgrade proposal JSON shape | 0005, 0006, 0007 | unchanged |
| I3 Release wire format | root-drop wrapper byte format | 0009 | unchanged |
| I5 Manifest hash | integration install manifest | 0008 | unchanged |

---

## 拆卡 SOP

1. 從索引選一張 open 卡。
2. 上鎖（`task-lock.js lock`），更新 frontmatter `status: in-progress`。
3. 編輯 upstream 檔案抽出函式到新檔。
4. 跑對應的驗證器（layer 1: `validate:cli`，layer 2: `validate:quick`，layer 3: 對應 invariant validator）。
5. AI-Atomic-Framework 單獨 commit 一次。
6. 寫 evidence 到 `../evidence/`。
7. 解鎖並更新 task card `status: done`。
8. 3KLife 一起 commit 任務卡 + evidence。

## Future Cards (Deferred)

| Future Card | 描述 | Blocked on |
|------------|------|-----------|
| ~~TASK-ASR-0012~~ | ~~propose.ts 完整拆分~~ | ✅ done (c46e690, 995→443 行) |
| ~~TASK-ASR-0013~~ | ~~integrations-core 完整 compiler/manifest/verify split~~ | ✅ done (613dd73, 707→79 行) |
| ~~TASK-ASR-0010~~ | ~~root-drop wrappers generator 與 parity validator~~ | ✅ done (69fe931) |
| ~~TASK-ASR-0014~~ | ~~upgrade.ts safe-upgrade / scan / proposal split~~ | ✅ done (13fea94, 1203→114 行) |
| ~~TASK-ASR-0011~~ | ~~command-specs per-file split~~ | ✅ done (779f74e, 39 specs) |
| TASK-ASR-00XX | plugin-governance-local bootstrap/prompt/budget split | manifest hash + install-uninstall roundtrip |

詳見 `../evidence/LAYER-3-summary.md` 中 Future cards 段落。
