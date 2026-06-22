# Same-Owner BLOCK 論文唯一完整包

## 可直接給論文 AI 的正文版本

在 POS2 正向案例之外，我們另外完成了一筆對照性的負向 field case，用以證明 ATM 在同 owner map、同檔、且 proposal bounded region 真正重疊時，會於 live write 之前 fail-closed，而非讓兩個寫手同時落到 working tree。此案例使用 `packages/cli/src/commands/broker.ts` 作為共享檔案，兩側 actor 分別為 `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5` 與 `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47`，共同宣告同一 owner atom `atm.broker.classify-explicit-mutation-request`，且 bounded region 皆鎖定於 `classifyExplicitMutationRequest` 的 `841-878` 行。A 側先以 proposal-first admission 取得 `provisional-write-lease`；B 側隨後進場時，broker 未允許第二寫手進入 composer 或 apply，而是直接將其 admission state 標為 `blocked-before-write`，其 register verdict 為 `blocked-active-lease`。

更重要的是，broker 並未停留在單純的阻擋，而是在重新仲裁後對 A 側形成有效的 `blocked-cid-conflict` 解讀，並明確指出衝突來源同時包含 atom ID、atom CID 與 file-range 三個層面。此 rerouting 同步產生 `decompositionRequest`，建議將該 coarse owner atom 進一步提煉為聚焦子原子 `atm.broker.classify-explicit-mutation-request.focus.841-878`。因此，這筆負向案例不只證明 ATM 會在真正重疊的 same-owner bounded region 上 fail-closed，也證明 broker 已能把 blocked overlap 轉化為後續可治理的 atom-map refinement suggestion，而不是僅留下不可行的硬衝突。

## Artifact 對照

- archive root:
  [BLOCK-same-owner-overlap-2026-06-22](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/README.md)
- blocked register decision:
  [blocked-register-b-decision.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/blocked-register-b-decision.json)
- broker status snapshot:
  [broker-status-snapshot.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/broker-status-snapshot.json)
- registry snapshot:
  [write-broker.registry.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/write-broker.registry.json)
- team run:
  [team-0a7e6f1a47d0.json](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/team-0a7e6f1a47d0.json)
- split suggestion / curator loop:
  [split-suggestion-review-chain-zh.md](C:/Users/User/3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/split-suggestion-review-chain-zh.md)

## 論文寫法提醒

- 不要把這筆寫成「第二寫手直接得到純粹的 `blocked-cid-conflict`」。
- 正確寫法是：
  - B 側 admission state = `blocked-before-write`
  - B 側 register verdict = `blocked-active-lease`
  - A 側經 rearbitration 後的 effective decision = `blocked-cid-conflict`
- split suggestion 已存在，但目前應標為 **prototype-backed governance loop**，不是 fully automatic atom-map mutation。
