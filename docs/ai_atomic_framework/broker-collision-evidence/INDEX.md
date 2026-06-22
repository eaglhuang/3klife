# Broker Collision Evidence Index

本索引是 3KLife 端的 paper-citable evidence SSOT。凡論文、handoff、review 要引用 broker collision / merge / block / split-suggestion 證據時，優先從此索引定位對應 archive，再進入各 run 目錄讀其 `README.md` 與權威 JSON。

## Primary Cases

| Case | Type | Core claim | Authoritative archive |
| --- | --- | --- | --- |
| B-12 | field negative / honest hybrid | 兩邊 admission 皆 `parallel-safe`，真正 fail-closed 發生在 apply-phase active-intent arbitration | [B-12-field-2026-06-20](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/README.md) |
| POS2 | field positive / same-owner bounded merge | 同 owner map、同檔、disjoint bounded regions 可在 proposal-first admission 後路由到 composer/steward 並成功 apply | [POS2-same-owner-bounded-2026-06-22](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/POS2-same-owner-bounded-2026-06-22/README.md) |
| BLOCK | field negative / same-owner overlap block | 同 owner map、同檔、同 bounded region 會在 live write 前被擋下，並產生 split suggestion | [BLOCK-same-owner-overlap-2026-06-22](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/README.md) |
| Close-Orch | layered positive | 正式 atom map + broker 第二層 segmentation 對同檔不同函式可形成正向 merge 證據 | [close-orchestration-layered-merge-evidence.md](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/close-orchestration-layered-merge-evidence.md) |
| Integration | layered reinforcement | 補上 atom map 後，broker 第二層 segmentation 仍有增益 | [integration-layered-merge-evidence.md](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/integration-layered-merge-evidence.md) |

## Same-Owner Pair

### Positive: POS2

- archive: [POS2-same-owner-bounded-2026-06-22](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/POS2-same-owner-bounded-2026-06-22/README.md)
- hot file: `packages/cli/src/commands/broker.ts`
- owner atom: `atm.broker.classify-explicit-mutation-request` + `atm.broker.parse-broker-args`
- shape: same file, proposal-first, disjoint bounded regions
- result: `deterministic-composer` -> steward apply -> validator pass

### Negative: BLOCK

- archive: [BLOCK-same-owner-overlap-2026-06-22](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/README.md)
- hot file: `packages/cli/src/commands/broker.ts`
- owner atom: `atm.broker.classify-explicit-mutation-request`
- bounded region: `841-878`
- result:
  - second writer admission state = `blocked-before-write`
  - second writer register verdict = `blocked-active-lease`
  - rearbitrated first-writer effective decision = `blocked-cid-conflict`
  - split suggestion emitted = `atm.broker.classify-explicit-mutation-request.focus.841-878`

## Split Suggestion Loop

BLOCK archive 內已補齊 prototype-backed governance loop：

- [split-suggestion-curator-report.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/split-suggestion-curator-report.json)
- [split-suggestion-review-queue.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/split-suggestion-review-queue.json)
- [split-suggestion-review-approved-queue.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/split-suggestion-review-approved-queue.json)
- [split-suggestion-review-chain-zh.md](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/split-suggestion-review-chain-zh.md)

注意：這一輪 split suggestion 是 **focused-child prototype**，不是 full automatic before/focus/after tri-split。論文應將其寫成 human-reviewable refinement loop，而非 fully automatic map mutation。
