# AGR Adoption Review and Risk Ledger

> 更新日期：2026-06-11  
> 依據：`TASK-CID-0037` benchmark harness（`AI-Atomic-Framework` / `scripts/validate-agr-benchmark.ts`）  
> 審查卡：`TASK-CID-0038`

## Executive Summary

**建議：暫不上線（No-Ship），但 benchmark gate 可採納為後續 rollout 前置關卡。**

`TASK-CID-0037` 已在 target repo 交付 12 個 deterministic benchmark scenarios、catch-rate harness，以及 false-safe regression hard-fail gate。Harness 本體驗證通過，但目前 **Layer 1 / Layer 2 + ADR 仍以 harness-side simulation 評估**，正式 broker AGR runtime（`TASK-CID-0031`、`0032`、`0035`）尚未落地。在 live runtime 完成前，不應把 AGR 視為可廣泛採用的 production governance。

## Benchmark Evidence

| 指標 | 結果 |
|---|---|
| Scenario 數量 | 12 |
| Mode 比較次數 | 34（`agrOff` / `layer1` / `layer2Adr`） |
| Harness 驗證 | `node --strip-types scripts/validate-agr-benchmark.ts --mode validate` → PASS |
| False-safe regression gate | 0 筆超出預期 permissive 的失敗 |
| Validator catch-rate（fixture 樣本） | 2 / 15 broker-permissive 案例由 validator 攔下 |

### 關鍵量化觀察

1. **AGR-off 已知 false-safe**：`registry-read-write-dependency` 顯示 write-set disjoint 時，現行 broker 仍可能給 `parallel-safe`；Layer 2 + ADR 預期應改為 `serial`。
2. **Layer 1 可改善 coarse CID 衝突**：`compose-same-atom-cid-blocked` 在 AGR-off 為 `blocked-cid-conflict`，Layer 1 refinement 後為 `parallel-safe`。
3. **不可精化的衝突仍應維持 blocked**：`compose-same-atom-cid-unresolvable`、`layer2-threshold-not-met` 在三種 mode 下皆維持 blocked。
4. **Shared surface 不可被 AGR 洗成 parallel-safe**：`registry-shared-surface-blocked` 全 mode blocked。
5. **Validator 仍是第二道防線**：`validator-catch-typecheck-failure` 記錄 broker parallel-safe 但 validator fail 的樣本。

## Risk Ledger

| ID | 風險 | 嚴重度 | 狀態 | 緩解 |
|---|---|---|---|---|
| R-AGR-001 | Layer 1 / Layer 2 runtime 尚未存在，benchmark 目前含 simulation | 高 | Open | 完成 `TASK-CID-0028`–`0035` 後改接 live `packages/core/src/broker/agr.ts` 與 ADR decision |
| R-AGR-002 | AGR-off read/write dependency false-safe | 高 | Documented | `TASK-CID-0032` ADR + harness scenario `registry-read-write-dependency` |
| R-AGR-003 | Validator catch-rate 樣本仍偏合成 fixture | 中 | Accepted | 後續補真實歷史案例，保留合成樣本比例揭露 |
| R-AGR-004 | Layer 2 threshold 未觸發時仍可能 blocked | 中 | Expected | 維持 `layer2-threshold-not-met` 回歸 |
| R-AGR-005 | Shared-surface blocker 被 AGR 意外放寬 | 高 | Mitigated in harness | `registry-shared-surface-blocked` 為 hard expectation |

## Blockers

- `packages/core/src/broker/agr.ts` 尚未存在，Layer 1 / Layer 2 無 live runtime。
- `WriteIntent` / broker decision 尚未正式承載 read-set ADR contract（`TASK-CID-0032`）。
- AGR-aware neutral writer / steward orchestration（`TASK-CID-0035`）尚未接線。

## Waivers

- 無 production rollout waiver。
- 允許 **harness-only adoption**：可把 `validate-agr-benchmark` 納入 framework `standard` validator profile，作為後續 AGR runtime PR 的 regression gate。

## Deferred Items

- 將 harness Layer 1 / Layer 2 評估從 fixture simulation 切換到 live AGR runtime。
- 擴充 benchmark 真實歷史樣本（目前以 broker fixture + 合成 registry/validator 案例為主）。
- 在 live runtime 就緒後重算 catch-rate 與 ship review。

## Rollout Recommendation

| 階段 | 建議 | 理由 |
|---|---|---|
| 現在 | **No-Ship** | Runtime 未落地；量化證據只證明 gate 設計可行，不足以證明 production AGR 安全 |
| M1–M3 完成後 | **Staged re-review** | 以同一 harness 對 live runtime 重跑；false-safe regression 必須維持 0 |
| M4 通過後 | **Conditional pilot** | 僅限 framework repo 內部 brokered-write path；adopter repo 需另開 adoption card |

## Conclusion

AGR 不應在現階段進入 broader implementation rollout。`TASK-CID-0037` harness 已可作為下一輪實作的驗收基礎；待 `TASK-CID-0031`、`0032`、`0035` 完成並通過 live benchmark 後，再重新開啟 ship 討論。
