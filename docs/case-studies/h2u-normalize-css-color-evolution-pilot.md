<!-- doc_id: doc_task_0365 -->

## 2026-05-11 Local Workbench Ownership

- Canonical owner: `3KLife` adopter-local workbench.
- Source of truth: `atomic-registry.json`.
- Canonical atom root: `atomic_workbench/atoms/ATM-CORE-0005`.
- Upstream `AI-Atomic-Framework` is tooling/schema only for this project-derived H2U atom.

# H2U normalizeCssColor v1.0 到 v1.1 Evolution Pilot

## 目標

`ATM-4-0007` 以 `normalizeCssColor` 做第一條 `behavior.evolve` 演化閉環 dry-run：  
`proposal -> automatedGates -> human review -> evidence chain`

## Pilot 範圍

- 基線 fixture：`fixtures/case-studies/normalize-css-color/v1.0.json`
- 候選 fixture：`fixtures/case-studies/normalize-css-color/v1.1.json`
- upgrade proposal：`fixtures/case-studies/normalize-css-color/proposal.json`
- human review approve：`fixtures/case-studies/normalize-css-color/decision-approve.json`

## 關鍵結果

1. proposal 使用 `behaviorId: behavior.evolve`，且 `decompositionDecision: atom-bump`。
2. `automatedGates.allPassed=true`，`blockedGateNames=[]`，符合進入 review queue 的前置條件。
3. approve decision 與 proposal linkage 完整一致：
   `proposalId` / `atomId` / `queueRecord.status=approved`。
4. decision hash 鏈採固定快照雜湊：
   `sha256:0153f0d11d39f24dfcf6f288fe94ec88d73e1f4efc0b7e8e34d1fc984646d9bf`。

## 驗證指令

```bash
node tools_node/validate-h2u-evolution-pilot.js --strict
```

## 備註

- 此 pilot 是 evidence-first 的 dry-run fixture，不直接修改 registry currentVersion。
- 若後續要從 dry-run 轉為 apply-run，應重用同一份 proposal/decision contract，不改欄位語義。
