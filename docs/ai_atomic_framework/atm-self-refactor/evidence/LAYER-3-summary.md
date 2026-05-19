---
doc_id: doc_evidence_asr_layer3
layer: L3
status: done
completed_at: 2026-05-20T02:10:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

# Evidence — Layer 3（High-risk splits, minimal slices）完成總結

## 範圍

Layer 3 只做「每份 SPLIT_PLAN.md 中最低耦合、最不可能破壞 invariant」的一張切片，完整高風險拆分留到 future。

| Task | Commit | 拆出 / 新增 | Invariant |
|------|--------|------------|-----------|
| TASK-ASR-0007 | 6823fe7 | `propose/failure-reason.ts` | I2 (schema additive) |
| TASK-ASR-0008 | b54120c | `compiler/charter-block.ts` | I5 (manifest hash) |
| TASK-ASR-0009 | 947849f | `wrappers.json` SSoT (no generator) | I3 (release wire) |

## 量化成果

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| `propose.ts` 行數 | 942 | ~918 (-24) | — |
| `integrations-core/index.ts` 行數 | 696 | ~620 (-76, +5 import shim) | — |
| 新模組數 | 0 | 3 | +3 |
| 任何 I-invariant 違反 | 0 | 0 | 0 |

## 驗證

| Card | Validator 跑過 | 結果 |
|------|---------------|------|
| ASR-0007 | `validate:quick` | ok 4/4 |
| ASR-0008 | `validate-integration-adapter`（I5 直接 gate） | ok |
| ASR-0009 | `validate-script-parity`（I3 直接 gate） | ok 7+7 |

## 設計收穫

1. **Layer 3 拆分策略 ≠ Layer 1**：Layer 1 是「能抽就抽」，Layer 3 必須先定義「最小可拆切片」。每份 SPLIT_PLAN 列了完整 target layout，但實際只抽其中**單一最隔離函式**，把高風險主體留到 future。

2. **薄 wrapper 是降低風險的關鍵**：ASR-0008 沒有把 `renderCharterInvariantsBlock` 完全搬走，而是在 `index.ts` 留一個 thin wrapper 維持 default-arg 行為（`= integrationsCoreRepoRoot`）。這樣外部 caller 不會被預設參數消失打到。

3. **SSoT manifest 不等於 dedup**：ASR-0009 只建立 `wrappers.json`，沒寫 generator、沒接 build pipeline。這是「先把契約寫死、之後再寫工具讀它」的漸進法 — 不會增加破壞 I3 的風險。

4. **發現 wrapper 比預期複雜**：寫 manifest 時才發現每個 wrapper 都有自己的 extraArgs（`--bucket CORE --dry-run`、`--why blocked`、`summarize` 等），不是 SPLIT_PLAN 假設的「只有 subcommand」。這提醒我們：planning 階段要**先看實際 artifact**，不能只看抽象描述。

## Future cards (deferred — needs full acceptance gate)

| Future Card | 描述 | 需要 |
|------------|------|-----|
| TASK-ASR-00XX | propose.ts 完整 analysis/gates/output split | upgrade JSON snapshot diff fixture |
| TASK-ASR-00XX | integrations-core 完整 compiler/manifest/verify split | manifest hash regression fixture |
| TASK-ASR-00XX | wrappers generator 與 parity validator | byte-equal generator output gate |
| TASK-ASR-00XX | upgrade.ts safe-upgrade / scan / proposal split | upgrade JSON envelope diff per action |
| TASK-ASR-00XX | command-specs 28 spec per-file split | help snapshot fixture per command |
| TASK-ASR-00XX | plugin-governance-local bootstrap/prompt/budget split | manifest hash + install-uninstall roundtrip |

這些 future 卡的 acceptance gate 都需要先建 fixture / diff 工具才能安全執行。
