# AGR Next Implementation Dispatch Pack

> 更新日期：2026-06-11  
> 依據：`agr-adoption-review.md`（No-Ship，harness gate 已就緒）  
> 規劃卡：`TASK-CID-0039`

## Pack Intent

這份 pack 不是正式派工本身，而是給 Captain 下一輪 **runtime implementation wave** 的 inbox-ready 藍圖。  
目標是把 M1–M3 的 AGR runtime 拆成可平行、可驗收、最小 patch 邊界的工作包；每一包完成後都必須重跑 `validate-agr-benchmark`，且 false-safe regression 必須維持 0。

## Adoption Gate Recap

| 項目 | 結論 |
|---|---|
| Production AGR rollout | **No-Ship** |
| Harness gate | **採納**（`scripts/validate-agr-benchmark.ts`） |
| 下一輪工作性質 | Target-repo runtime implementation，不是 planning mirror |

## Suggested Worker Split

| Wave | Worker | Task Cards | Repo | 說明 |
|---|---|---|---|---|
| W1 | `001` | `TASK-CID-0028`, `0029`, `0030` | AI-Atomic-Framework | Layer 1 SDK + broker refinement + adapter `enclose()` preflight |
| W2 | `002` | `TASK-CID-0031`, `0032`, `0033` | AI-Atomic-Framework | Layer 2 threshold + ADR read-set + symbol canonicalization manifest |
| W3 | `003` | `TASK-CID-0034`, `0035`, `0036` | AI-Atomic-Framework | Mid-execution registry + steward orchestration + tasks/next integration |
| W4 | `008` | harness follow-up only | AI-Atomic-Framework | 將 benchmark runner 從 simulation 切到 live `agr.ts` / ADR runtime |

### Sequencing Rules

1. `W1` 完成前，`W2` 不可改 `packages/core/src/broker/agr.ts` 的 Layer 2 本體。
2. `W2` 的 `0032` 完成前，`W3` 不可宣稱 ADR 已接入 claim/closeout。
3. 任一 wave 完成後必須跑：
   - `node --strip-types scripts/validate-agr-benchmark.ts --mode validate`
   - `npm run typecheck`
   - `npm run validate:cli`
4. 全部 W1–W3 完成後，重開 `TASK-CID-0038` 等級的 ship re-review；不得跳過。

## Smallest Patch Boundaries

### W1 / Layer 1

| 檔案邊界 | 允許變更 | 禁止 |
|---|---|---|
| `packages/plugin-sdk/src/atomization-planning.ts` | `EnclosingUnit`, `VirtualAtom`, optional `enclose()` | 改 public CLI |
| `packages/core/src/broker/agr.ts` | Layer 1 refinement only | Layer 2 decomposition |
| `packages/core/src/broker/compose.ts` | 接 virtual atom refinement hook | 改 shared-surface blocker 順序 |
| `packages/language-js/**`, `packages/language-python/**` | `enclose()` capability + tests | 順手重構 adapter discovery |

### W2 / Policy + ADR

| 檔案邊界 | 允許變更 | 禁止 |
|---|---|---|
| `packages/core/src/broker/agr.ts` | Layer 2 threshold trigger only | 直接改檔案內容 |
| `packages/core/src/broker/policy.ts` | `θ_count`, `θ_density` | 隱藏式 magic number |
| `packages/core/src/broker/types.ts` | optional `readAtoms` | breaking existing intent schema |
| `packages/core/src/broker/decision.ts` | ADR precedence wiring | 弱化 shared-surface blockers |

### W3 / Runtime Integration

| 檔案邊界 | 允許變更 | 禁止 |
|---|---|---|
| `packages/core/src/broker/registry.ts` | in-use / mid-execution registration | 第二條寫入 bypass |
| `packages/core/src/broker/steward.ts` | AGR-aware orchestration | 非 steward 路徑直接寫檔 |
| `packages/cli/src/commands/tasks.ts`, `next.ts` | AGR-aware claim/close hooks | 手改 `.atm/history/**` |

## Captain-Ready Dispatch Templates

### D1 — `001` / Layer 1 Runtime

- **source_task_id**: `TASK-CID-0028` → `0030`
- **target_repo**: `AI-Atomic-Framework`
- **acceptance**:
  - `compose-same-atom-cid-blocked` 在 live Layer 1 下變 `parallel-safe`
  - adapter 無 `enclose()` 時行為與 AGR-off 一致
- **validators**: `validate-agr-benchmark`, `typecheck`, `validate:cli`

### D2 — `002` / Layer 2 + ADR

- **source_task_id**: `TASK-CID-0031` → `0033`
- **target_repo**: `AI-Atomic-Framework`
- **acceptance**:
  - `registry-read-write-dependency` 在 `layer2Adr` live path 下為 `serial`
  - `registry-shared-surface-blocked` 仍全 mode blocked
- **validators**: 同上 + `validate-broker-compose`

### D3 — `003` / Steward + Governance Integration

- **source_task_id**: `TASK-CID-0034` → `0036`
- **target_repo**: `AI-Atomic-Framework`
- **acceptance**:
  - mid-execution registration 可被測試證明
  - `tasks` / `next` claim path 不手動繞過 broker
- **validators**: 同上 + `validate-brokered-write`

## Preflight Questions（Captain 開卡前必答）

1. `discoverAtomCandidates()` 是否已能提供足夠 line range 給 `enclose()`？若否，W1 需先縮成 line-range 補強卡。
2. 目前 JS / Python adapter 是否已有 `enclose()`？若無，W1 需包含最小 adapter 實作，而非只寫 broker stub。
3. `team-lane.ts` / steward allowed_files 是否與 CID 硬化主線衝突？開卡前必須交叉檢查。
4. 既有 `validate-agr-benchmark` 哪些 scenario 仍靠 simulation？每個 wave 完成後要列出「已切 live / 仍 simulation」清單。
5. 是否有人類 waiver 要求提前 pilot？若有，必須在 `agr-adoption-review.md` 增列 waiver，不可只在聊天同意。

## Explicit Non-Goals

- 不在本 pack 內開 adopter repo rollout。
- 不把 planning mirror 更新當成 runtime 完成證據。
- 不因 harness PASS 就推翻 No-Ship 結論。

## Ready-for-Inbox Checklist

- [x] Worker split 已定義
- [x] Patch 邊界已列出
- [x] Preflight questions 已列出
- [x] 與 `agr-adoption-review.md` recommendation 一致
- [ ] Captain 已將 D1/D2/D3 轉成正式 mailbox dispatch（待 Captain 動作）
