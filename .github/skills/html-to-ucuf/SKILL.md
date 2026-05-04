---
doc_id: doc_agentskill_0036
name: html-to-ucuf
description: "HTML -> UCUF (Cocos Creator UI) conversion skill. Use for turning a complete HTML source package with ui-design-tokens.json and colors_and_type.css into Cocos usable layout/skin/screen JSON, then validating with Plan 4.1 regression closure: rule guard, visual fidelity risk, runtime interaction smoke, and Cocos Editor screenshot final gate."
argument-hint: "Formal runs need --source-dir, --main-html, --screen-id, --bundle, --editor-screenshot, --capture-protocol, and --capture-report. --input, --skip-editor-compare, --no-runtime-sync, and --no-per-tab-replay are debug only."
---

# HTML-to-UCUF Skill

This skill converts HTML into UCUF JSON for Cocos Creator UI. The current execution spec is `docs/html_skill_plan4.md`.

Authority order:

- Plan 2 (`docs/html_skill_plan2.md`): historical evidence only.
- Plan 3 (`docs/html_skill_plan3.md`): latest rule source.
- Plan 4 (`docs/html_skill_plan4.md`): current execution spec and regression closure.

Unity 對照：這條流程相當於 UI Toolkit importer + Prefab/Scene sync + Play Mode interaction smoke + Game View final compare；不要把 debug 輸出當成正式通過。

## Formal Entry

Formal runs must start from a source package.

```bash
node tools_node/run-html-to-ucuf-workflow.js \
  --source-dir <source-package-dir> \
  --main-html <relative-html> \
  --screen-id <screen-id> \
  --bundle <bundle> \
  --editor-screenshot <cocos-editor-screenshot.png> \
  --capture-protocol <final-capture-protocol.json> \
  --capture-report <capture-report.json>
```

Required source package files:

- `ui-design-tokens.json`
- `colors_and_type.css`
- main HTML

Formal flow also requires:

- final replay from source-derived output.
- per-tab replay fragments for tabbed sources.
- runtime sync into `assets/resources/ui-spec`.
- Plan 4.1 rule guard pass.
- runtime interaction smoke when interaction sidecars exist.
- visual fidelity risk pass for semantic, background, and composite fidelity.
- Cocos Editor final gate pass, using a formal capture report whose `actualScreenId` matches the converted `screenId`.

## Debug Only

These switches always mean `debugOnly=true` and cannot produce a formal pass verdict:

- `--input`
- `--skip-editor-compare`
- `--no-runtime-sync`
- `--no-per-tab-replay`
- `--editor-screenshot` without the formal source package
- `--capture-protocol` without the formal source package
- missing `--capture-report` or a capture report from a legacy product preview target

## Required Flow

1. Resolve the source package and inject source CSS/tokens.
2. Render or annotate HTML only if needed for conversion.
3. Generate raw layout/skin from the current HTML source package.
4. Optimize layout and auto-fix skin without falling back to old skins.
5. Run final replay from the source-derived output.
6. Replay each tab and write fragment JSON for tabbed sources.
7. Sync final layout/skin/screen into `assets/resources/ui-spec`.
8. Run Plan 4.1 rule guard.
9. Run visual fidelity risk checks for semantic, background, and composite fidelity.
10. Run runtime interaction smoke when interaction sidecars exist.
11. Capture Cocos through the formal route: `node tools_node/capture-ui-screens.js --formal-screen-id <screen-id> --uiVersion <workflow-uiVersion> --maxWidth 0`.
12. Run HTML source vs Cocos Editor screenshot final gate with `--capture-report`.
13. Write workflow summary with `debugOnly`, `ruleGuard`, `visualFidelityRisk`, `interactionRuntime`, `runtimeAuthority`, `finalCapture`, and `nextFixes`.

## Non-Negotiable Rules

- `H2U-P4-001`: formal entry must use source package.
- `H2U-P4-002`: formal pass requires Cocos Editor final gate.
- `H2U-P4-003`: formal pass requires runtime sync.
- `H2U-P4-004`: tabbed source requires per-tab replay fragments.
- `H2U-P4-005`: core logic cannot hardcode one screen fixture.
- `H2U-P4-006`: strict replay cannot repair by copying raw sidecars into final.
- `H2U-P4-007`: formal readiness cannot use `<screenId>-default` skin fallback.
- `H2U-P4-008`: final gates must read synced final runtime JSON.
- `H2U-P4-009`: formal flow requires source CSS/tokens.
- `H2U-P4-010`: tab routing must be data-driven.
- `H2U-P4-011`: `svg-radar-chart` needs full source SVG geometry.
- `H2U-P4-012`: draft-builder rules must be registered by stage/ruleId.
- `H2U-P4-013`: this skill must keep Plan 4 as current execution spec.
- `H2U-P4-014`: semantic classifier must be token-aware; no bare substring regex for `story`.
- `H2U-P4-015`: `story-strip` must come from explicit attribute, contract, or multi-signal evidence.
- `H2U-P4-016`: gradient and image backgrounds cannot silently downgrade to flat color.
- `H2U-P4-017`: radial gradients must preserve geometry or become blocker/assetization-required.
- `H2U-P4-018`: interaction sidecars must be executed in Preview runtime, not just synced as JSON.
- `H2U-P4-019`: visual risk in primary zones blocks formal pass even when CSS coverage is high.
- `H2U-P4-020`: formal runtime sync cannot use raw sidecar fallback to fake final authority.
- `H2U-P4-021`: final capture `expectedScreenId` and `actualScreenId` must match the converted screen.
- `H2U-P4-022`: final capture must include runtime version and runtime spec hashes.
- `H2U-P4-023`: legacy product preview targets cannot be used as formal HTML-to-UCUF gates.
- `H2U-P4-024`: source package resolver must support shared parent token/CSS roots.

## Validation Commands

```bash
node --check tools_node/run-html-to-ucuf-workflow.js
node --check tools_node/render-html-tab-fragments.js
node --check tools_node/validate-html-to-ucuf-rule-guard.js
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness,background-layer-preservation,formal-visual-risk-path,runtime-interaction-smoke-path
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --capture-report <capture-report.json> --expected-screen-id <screen-id>
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
```

## Notes For Agents

- Do not resurrect Phase B tools as the main path. `generate-tab-childpanels.js`, `runtime-screen-diff.js`, and `cutover-screen-variant.js` are not the formal Plan 4 flow.
- DS3 may be used as a fixture, but core converter/workflow/validator code must stay screen-agnostic.
- If the score is low, keep testing the converted JSON from the current HTML source package. Do not switch to default skins or old runtime files to make the gate easier.
- If final gate reports a low score, inspect `captureAuthority` first. A legacy `GachaMain`/product route mismatch is a blocker, not a converter fidelity result.
- Keep `history-not-story`, `radial-slide-background`, and `interaction-carousel` style regressions as fixtures.
- When adding logic to `draft-builder.js`, first attach it to the Plan 4 stage registry and add a self-test tag.
- Add short Traditional Chinese comments at classifier, background fallback, runtime binding, and formal gate boundaries to explain why old fallback paths stay blocked.
