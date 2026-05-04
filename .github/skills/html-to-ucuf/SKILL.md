---
doc_id: doc_agentskill_0036
name: html-to-ucuf
description: "HTML -> UCUF (Cocos Creator UI) conversion skill. Use for turning a complete HTML source package with ui-design-tokens.json and colors_and_type.css into Cocos usable layout/skin/screen JSON, then validating with Plan5 final fidelity gates: stale-rule audit, rule guard, visual fidelity risk, runtime interaction smoke, Cocos Editor final gate, and 95% regression matrix."
argument-hint: "Formal runs need --source-dir, --main-html, --screen-id, --bundle, --editor-screenshot, --capture-protocol, and --capture-report. --input, --skip-editor-compare, --no-runtime-sync, and --no-per-tab-replay are debug only."
---

# HTML-to-UCUF Skill

This skill converts HTML into UCUF JSON for Cocos Creator UI. The current execution spec is `docs/html_skill_plan5.md`.

Authority order:

- Plan 2 (`docs/html_skill_plan2.md`): historical evidence only.
- Plan 3 (`docs/html_skill_plan3.md`): historical transition source.
- Plan 4 (`docs/html_skill_plan4.md`): prior execution evidence and Plan 4.1 regression closure.
- Plan 5 (`docs/html_skill_plan5.md`): current execution spec for final fidelity, stale-rule cleanup, and 95% Cocos final gate closure.

## Rule Source

- `tools_node/lib/html-to-ucuf/rule-registry.json` is the single machine-readable rule source of truth.
- `tools_node/lib/html-to-ucuf/rule-checkers.js` contains rule checker implementations.
- `docs/html_skill_plan4.md` and `docs/html_skill_plan5.md` are version deltas and decision records, not the formal rule registry.

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
- Plan5 stale-rule and final-fidelity requirements.
- Plan 4.1 rule guard pass.
- runtime interaction smoke when interaction sidecars exist.
- visual fidelity risk pass for semantic, background, and composite fidelity.
- Cocos Editor final gate pass, using a formal capture report whose `actualScreenId` matches the converted `screenId` and whose adjusted score is at least `0.95`.
- If Cocos final gate fails, workflow summary must include blocker taxonomy and non-empty `nextFixes`.

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
9. Run Plan5 stale-rule checks when touching workflow/converter/runtime/final-gate logic.
10. Run visual fidelity risk checks for semantic, background, and composite fidelity.
11. Run runtime interaction smoke when interaction sidecars exist.
12. Capture Cocos through the formal route: `node tools_node/capture-ui-screens.js --formal-screen-id <screen-id> --uiVersion <workflow-uiVersion> --maxWidth 0`.
13. Run HTML source vs Cocos Editor screenshot final gate with `--capture-report` and `0.95` threshold.
14. If the final gate score is below `0.95`, classify the failure as CSS extraction, runtime renderer, capture authority, spec authority, or assetization-required, and emit non-empty `nextFixes`.
15. Write workflow summary with `debugOnly`, `ruleGuard`, `visualFidelityRisk`, `interactionRuntime`, `runtimeAuthority`, `finalCapture`, `finalFidelity`, `blockerTaxonomy`, and `nextFixes`.

## Governance Summary

- Formal runs still require source package entry, runtime sync, strict rule guard, interaction smoke when needed, and Cocos Editor final gate.
- Core converter/runtime/validator logic must stay screen-agnostic; fixture-specific behavior belongs in tests, not in production flow.
- When Cocos final gate is below `0.95`, the workflow must fail and emit actionable `nextFixes`; high browser coverage plus low Cocos score must also emit blocker taxonomy.
- Unsupported CSS, degraded visual fallback, capture authority drift, and runtime authority drift must surface as blockers or tracked advisories from the rule registry, not as silent pass paths.
- Read the exact rule metadata from `tools_node/lib/html-to-ucuf/rule-registry.json`; do not duplicate the full rule body in this skill document.

## Validation Commands

```bash
node --check tools_node/run-html-to-ucuf-workflow.js
node --check tools_node/render-html-tab-fragments.js
node --check tools_node/validate-html-to-ucuf-rule-guard.js
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness,background-layer-preservation,formal-visual-risk-path,runtime-interaction-smoke-path
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --capture-report <capture-report.json> --expected-screen-id <screen-id>
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-rule-guard.json
node tools_node/compare-html-to-cocos-editor.js --help
node tools_node/check-context-budget.js --changed --emit-keep-note
```

## Notes For Agents

- Do not resurrect Phase B tools as the main path. `generate-tab-childpanels.js`, `runtime-screen-diff.js`, and `cutover-screen-variant.js` are not the formal Plan5 flow.
- DS3 may be used as a fixture, but core converter/workflow/validator code must stay screen-agnostic.
- If the score is low, keep testing the converted JSON from the current HTML source package. Do not switch to default skins or old runtime files to make the gate easier.
- If browser coverage is high but Cocos final gate is low, treat the run as a Plan5 diagnostic failure until `blockerTaxonomy` and `nextFixes` identify the next tool/runtime fix.
- If final gate reports a low score, inspect `captureAuthority` first. A legacy `GachaMain`/product route mismatch is a blocker, not a converter fidelity result.
- Keep `history-not-story`, `radial-slide-background`, and `interaction-carousel` style regressions as fixtures.
- When adding logic to `draft-builder.js`, first attach it to the registry-backed `draftBuilderStageRules` mapping and add a self-test tag.
- Add short Traditional Chinese comments at classifier, background fallback, runtime binding, and formal gate boundaries to explain why old fallback paths stay blocked.
