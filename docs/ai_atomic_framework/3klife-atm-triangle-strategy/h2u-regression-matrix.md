---
doc_id: doc_other_0082
title: H2U regression matrix
phase: ATM-4
audience: downstream-adopter
purpose: baseline / regression / known-gap contract
---

# H2U Regression Matrix

這份文件只定義 3KLife / html-to-ucuf 的 regression baseline 與 known gap plugin contract，不回寫 ATM core。

## Scope

- Freeze 現有 legacy evidence，保留可重跑的 baseline。
- 所有 known gap 都要結構化，不能只寫成備註。
- regression matrix 只描述可比較的 fixture、artifact、score / verdict 與 delta。
- 如果某個 gap 變成永久白名單，應移回 `tools_node/lib/html-to-ucuf/rule-registry.json`，不是留在這份文件裡。

## Baseline Sources

- [gacha-ds3 verdict](../../artifacts/skill-test-html-to-ucuf/gacha-ds3/gacha-ds3.html-cocos-verdict.json)
- [character-ds3-main verdict](../../artifacts/cocos-editor-final-gate/character-ds3-main-current/character-ds3-main.html-cocos-verdict.json)
- [gacha-banner visual review](../../artifacts/skill-test-html-to-ucuf/gacha-banner.visual-review.json)
- [gacha-banner accuracy](../../artifacts/skill-test-html-to-ucuf/gacha-banner.accuracy.json)

## Regression Matrix

| Fixture | Source package | Baseline evidence | Current state | Score / verdict | Known gap refs | Note |
|---|---|---|---|---|---|---|
| `gacha-ds3` | `Design System 3/ui_kits/gacha/index.html` | `../../artifacts/skill-test-html-to-ucuf/gacha-ds3/gacha-ds3.html-cocos-verdict.json` | formal final gate snapshot | `adjustedScore=0.5567134452160494`, `verdict=fail` | `KG-002`, `KG-004` | radial assetization boundary remains visible |
| `character-ds3-main` | `Design System 3/ui_kits/character/index.html` | `../../artifacts/cocos-editor-final-gate/character-ds3-main-current/character-ds3-main.html-cocos-verdict.json` | broad legacy baseline | `adjustedScore=0.23423032407407407`, `verdict=fail` | `KG-001`, `KG-003` | good for semantic / layout regression tracking |
| `gacha-banner` | `tests/fixtures/dom-to-ui/gacha-banner.html` | `../../artifacts/skill-test-html-to-ucuf/gacha-banner.visual-review.json` + `../../artifacts/skill-test-html-to-ucuf/gacha-banner.accuracy.json` | browser-preview regression input | `verdict=manual-required`, `accuracy=pass` | `KG-AT4-001` | button-state-layer review still needs a task-scoped gap record |

## Known Gap Plugin Input

A minimal task-scoped gap record looks like this:

```json
{
  "id": "KG-AT4-001",
  "fixtureId": "gacha-banner",
  "knownGapType": "temporary-tool-gap",
  "scoreImpactPolicy": "requireApproval",
  "mustHaveTaskId": true,
  "expiresAt": "2026-06-30",
  "ownerBucket": "runtime-interaction",
  "evidencePath": "../../artifacts/skill-test-html-to-ucuf/gacha-banner.visual-review.json"
}
```

Field notes:

- `knownGapType` follows the H2U known-gap taxonomy: `runtime-limitation | assetization-required | temporary-tool-gap | accepted-design-drift`.
- `scoreImpactPolicy` keeps the gap explicit instead of treating it as a silent pass.
- `mustHaveTaskId` stays `true`; known gaps are task-scoped, not free-floating.
- `expiresAt` is required so the gap cannot become a permanent white list by accident.
- `ownerBucket` is the resolver bucket that should own the next fix.
- `evidencePath` points at the artifact that proves the gap exists.

## Repro Rules

- Never hand-edit score numbers inside the baseline files.
- Keep known gaps time-boxed.
- Promote stable permanent gaps to the rule registry, not the baseline fixture pack.
- If a row changes, preserve the old row as historical evidence and add a new baseline entry instead of overwriting the past.

## Output Contract

- `tools_node/atomic-framework/fixtures/legacy-baseline`
- `artifacts/atm-4-0002/baseline-summary.md`
- This doc
