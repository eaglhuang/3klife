---
doc_id: doc_evidence_asr_layer2
layer: L2
status: done
completed_at: 2026-05-20T01:40:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

# Evidence — Layer 2（Module-level splits）完成總結

## 範圍

Layer 2 涵蓋 3 張卡，分別動到 command-specs 與 map-generator：

| Task | Commit | 拆出檔案 | 抽走行數 |
|------|--------|---------|---------|
| TASK-ASR-0004 | 48dd41b | `command-specs/_common.ts` | -5 行（重組到 import） |
| TASK-ASR-0005 | fcd4184 | `map-generator/errors.ts` + `map-generator/normalize-fields.ts` | -74 行 |
| TASK-ASR-0006 | 525381e | `map-generator/normalize-lineage.ts` | -68 行 |

## 量化成果

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| `map-generator.ts` 行數 | 607 | ~470 (~−137 / −22.6%) | — |
| `command-specs.ts` 行數 | 713 | 708 | -5 |
| 新模組數 | 0 | 4 | +4 |
| 任何 I-invariant 違反 | 0 | 0 | 0 |

## 驗證

每張卡 commit 前都跑過：

```bash
npm run typecheck       # 0 errors (pre-existing review.ts 6 errors unrelated)
npm run validate:quick  # ok (4/4)
```

## 設計收穫

1. **errors.ts 是必要的副產品**：把 per-field normalizer 抽出來時，發現 `createGeneratorError` factory 與 `GeneratorError` type 是必須共享的。直接建一個小檔，後續其他 normalizer module 都能 import。
2. **Set 常數要跟著用它的函式走**：`memberRoles` / `edgeKinds` / `replacementModes` 三個 Set 只被 lineage 用，所以放進 `normalize-lineage.ts`，不該留在 top-level scope。
3. **command-specs split 還沒做完**：Layer 2 只完成 `_common.ts`。完整的「28 spec 各自一檔」拆分仍是 future 卡，需要更系統化的工具（如 codegen）。

## Layer 3 預備

下一階段（Layer 3，high risk）建議只做最低耦合切片：

1. `propose.ts` — 抽 `failure-reason.ts`（最小、最隔離）
2. `integrations-core` — 抽 `compiler/charter-block.ts`（單一函式 + private helper）
3. `root-drop` — 只建 `wrappers.json` SSoT（generator + validator 留 future）

完整的高風險拆分（upgrade safe-upgrade / propose analysis / integrations-core 三模組）仍是 future work，需要 acceptance gate 完整就位才能動。
