<!-- doc_id: doc_other_0117 -->
# Legacy 大挑戰啟動條件與首戰清單（H2U 首勝版）

## Summary

- 第一個 Legacy pilot 固定選 `H2U / html-to-ucuf`，目標固定是先拿首勝。
- 首戰範圍固定鎖在 `normalizeCssColor` 既有證據鏈，不直接開 `parseFragmentList`、map evolution，也不做 runtime apply。
- 進入首戰前，四個 gate 必須全綠：
  - `validate:atm-milestone`
  - `validate:h2u-evolution-pilot -- --strict`
  - `validate-html-to-ucuf-rule-guard --strict`
  - worktree isolation（本輪 pilot 與其他 dirty lane 分離）

## Canonical Targets

- Legacy helper 鎖定：
  - `tools_node/lib/dom-to-ui/draft-builder.js`
- Canonical evidence 鎖定：
  - `fixtures/case-studies/normalize-css-color/v1.0.json`
  - `fixtures/case-studies/normalize-css-color/v1.1.json`
  - `fixtures/case-studies/normalize-css-color/proposal.json`
  - `fixtures/case-studies/normalize-css-color/decision-approve.json`

## First-Wave Execution Contract

1. `behavior.atomize`
   - 確認 lineage、`legacy://` parent refs、registry entry、hash/usage evidence 可重播。
2. `behavior.infect`（dry-run only）
   - 僅允許 inject plan + rollback plan 證據，不允許 runtime patch apply。
3. `behavior.evolve`
   - 固定驗證 `v1.0 -> v1.1` 的 proposal / gate / approve 決策鏈完整成立。

## Out Of Scope（First Wave）

- 不做 `parseCssLength` / `parseFragmentList` 第一波實作。
- 不做 `ATM-4-0008` 型 map-level evolution 擴張。
- 不做 H2U 全流程重構。
- 不做任何直接套用到 legacy runtime 的 patch。
- 不把 `sanguo-rag` 或 Cocos runtime 主流程拉進首戰。

## Next Fixed Order

1. `H2U normalizeCssColor`
2. `H2U parseCssLength`
3. `H2U parseFragmentList / map helpers`
4. `sanguo-rag`

## Launch Validation

單一入口：

```bash
npm.cmd run validate:legacy-h2u-launch -- --strict
```

若需要在本 lane 暫時容許特定 dirty prefix，可加上：

```bash
npm.cmd run validate:legacy-h2u-launch -- --strict --allow-dirty-prefix <path-prefix>
```

## Completion Definition（First Win）

- `normalizeCssColor` 的 atom / inject-plan / rollback-plan / proposal / decision 可完整重播。
- validator 全綠，沒有未分類 blocker。
- 里程碑可直接敘述為「Legacy 首戰模板已打通」，但不得宣稱「legacy runtime 已完成替換」。
