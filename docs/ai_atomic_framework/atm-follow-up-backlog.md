# ATM 後續待辦清單

> 狀態摘要：目前治理核心已完成版本治理、sidecar/backfill closeout、any-boundary 守門與 stability closeout；剩下的是 repo-wide 型別收斂、manifest open-card 收尾，以及把幾個運作規則文件化。

## Current Status

- repo-wide `: any` / `as any` 仍約有 **901** 處，主要集中在 extension tooling、tests、UI core helpers。
- `framework-function-atomization-manifest.md` 目前還有 **8 個 `open-card`**。
- `validate-registry-version-governance`、`validate-registry-sidecar-convergence`、`validate-registry-backfill-sweep`、`validate-atm-any-boundaries`、`validate-atm-stability-closeout` 都已經是可用的治理入口。

## Must Do Next

### 1. 收斂 repo-wide `any`

先不要追求一次清零，優先修治理關鍵路徑，避免型別洞繼續往 core 傳。

優先順序建議：

1. `extensions/cocos-mcp-server/source/tools/prefab-tools.ts`
2. `extensions/cocos-mcp-server/source/panels/tool-manager/index.ts`
3. `extensions/cocos-mcp-server/source/tools/component-tools.ts`
4. `extensions/cocos-mcp-server/source/tools/node-tools.ts`
5. `extensions/cocos-mcp-server/source/scene.ts`
6. `tests/*`
7. `assets/scripts/ui/core/*`

原則：

- 核心治理面盡量只用 `unknown + schema guard`
- 與外部 runtime / editor bridge 相接的地方，先隔離再收型別
- 測試與工具層可以保留少量動態型別，但不要滲入 registry / rollback / adapter bridge

建議驗證：

```bash
node tools_node/validate-atm-any-boundaries.js --strict
node tools_node/compute-gate.js --profile quick
```

### 2. 版本治理再收斂

目前已經有 `currentVersion / versions[]`、version governance report、backfill sweep、sidecar convergence，但還需要把「怎麼審、怎麼對齊、什麼時候 apply」講清楚。

建議補強的內容：

- `currentVersion` / `versions[]` 的正式操作規則
- dry-run 與 apply 的使用時機
- batch alignment 與 rollback-proof 的關係
- 哪些情況要人工 review，不建議自動套用

建議驗證：

```bash
node tools_node/validate-registry-version-governance.js --strict
node tools_node/validate-registry-sidecar-convergence.js --strict
```

### 3. 收尾 manifest 的 `open-card` surfaces

目前還保留 8 條 open-card，這些不一定都要立刻關掉，但至少要逐條決定是：

- 要補 task card
- 要補 validator
- 要保留為明確的公開缺口

現存主題：

- Test runner / report schema
- Police plugin API / rule guards
- Adapter API / Plugin SDK
- Evidence / artifact log store
- Evolution proposal / review / rollback
- Atom identity / behavior / state machine
- Atomization / infection adapter contract
- Public lifecycle / semver / PEV docs

建議驗證：

```bash
node tools_node/validate-framework-atomization-coverage.js --manifest docs/ai_atomic_framework/framework-function-atomization-manifest.md --fixture tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json --strict
```

## Should Do Later

### 4. 將 backfill sweep 的 advisory warning 文件化

目前 `validate-registry-backfill-sweep` 在 sandbox 中會遇到 nested spawn 的 advisory warning，但不影響 blocker 判定。

建議做法：

- 在文件中註明這是 sandbox / nested spawn 的限制
- 若要在可 spawn 的環境驗證，補跑一次
- 不要把 advisory warning 誤判成治理失敗

### 5. 補一份版本治理操作手冊

這份 backlog 之後，最好再補一份短文件，讓維護者知道：

- 新版本怎麼進 `versions[]`
- 什麼時候更新 `currentVersion`
- 哪些情況要先 dry-run
- 哪些情況應該留給人工 review

## Done

- `validate-registry-version-governance`
- `validate-registry-sidecar-convergence`
- `validate-registry-backfill-sweep`
- `validate-atm-any-boundaries`
- `validate-atm-stability-closeout`
- registry helper 已經統一到 `.ts` 入口

