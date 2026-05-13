<!-- doc_id: doc_other_0131 -->
# HTML-to-UCUF Current Roadmap (Single Active Entry)

## 1) Scope Boundary (ATM vs H2U)

- ATM 只管流程治理：gate、task routing、evidence discipline。
- H2U 只管領域能力：html-to-ucuf 規則、Cocos fidelity、UI importer、domain validators。
- `validate-html-to-ucuf-rule-guard.js` 與 `dom-to-ui-self-test.js` 是 H2U permanent tools，不上吸 ATM core。

## 2) Fixed Daily Entry (Three-Layer Gate)

- Dev：`npm run atm:flow:dev`
- PR：`npm run atm:flow -- --mode pr --from-mode dev`
- Release：`npm run atm:flow -- --mode release --from-mode pr`

## 3) Current Truth (PROG-2-0010 / PROG-2-0007)

- `PROG-2-0010` 已完成 baseline 事實收斂：
  - 已有三個 fixture：`gacha-ds3`、`lobby-main-screen`、`battle-hud-screen`
  - 已有三份 formal `workflow-summary.json` 且 `debugOnly=false`
  - 已有 `artifacts/html-to-ucuf-regression/regression-summary.json`
  - 本卡目標是 baseline + `nextFixes`，不是本卡內達成 `>= 0.95`
- `PROG-2-0007` 角色改為 umbrella closeout（等待 follow-up slices），不再承擔 baseline 建立。

## 4) NextFix Buckets (Only Small Slices)

後續只開 `PROG-2-*` 小卡，不開 `H2U-REFACTOR-0007` 大改：

1. 非 gacha formal capture/metadata closure  
   收斂 `H2U-P4-021 / H2U-P4-022 / H2U-P4-004`，補齊 capture authority、runtimeVersion/specHash、tab replay 真相，不追分。

2. gacha assetization-owner closure  
   只處理 `manual-art-asset / assetization-owner`，走 family layer 與 runtime asset parity，不重寫 draft-builder 主幹。

3. regression routing closure  
   讓 `nextFixes` 在所有 fixture 都有一致 `ownerBucket / runtimeOwner`，先補派工語意，再進 95% closure。

## 5) Hard Prohibitions

- 不重寫 `draft-builder` 主幹。
- 不只繞著單一 gacha fixture 追分。
- 不把 debug summary 當 formal evidence。
- 不讓 H2U 領域規則滲入 ATM upstream core。

## 6) Historical Docs Location

所有舊版計畫與事故文件已封存到：

- `docs/html-to-ucuf/history/`

本文件是唯一 active spec 入口；Agent 不應再把舊 plan 當 current execution spec。
