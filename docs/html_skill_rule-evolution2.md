<!-- doc_id: doc_other_0012 -->
# HTML Skill Rule Evolution 2

本檔是 HTML-to-UCUF v2 的 append-only 規則演進紀錄，對應 `docs/html_skill_plan2.md`。

v2 與舊版 `docs/html_skill_rule-evolution.md` 的差異是：本檔只收錄會影響 source package、CSS/token ingestion、HTML vs Cocos Editor visual gate、runtime scoring 與自我修正規則的事件。browser `sourceVsUcufPreview` 低分可以記錄，但不能單獨作為 production cutover 的通過依據。

## 寫入規則

1. 本檔只能 append，不可刪改既有 entry。
2. 每筆 entry 必須有穩定 suggestion id。
3. entry 必須標記 `status`：`candidate`、`accepted`、`rejected`、`applied`。
4. `accepted` / `applied` entry 必須有 reviewer 或等價審核來源。
5. 任何 `runtimeVsSource.score < 0.95` 或 `runtimeVsSource.score:null` 都必須產生 candidate。
6. 任何 linked CSS 未被 converter 攝取、source token 未被使用、unsupported CSS 造成大面積失真，都必須產生 candidate。
7. 可自動套用的規則必須標記 `safety: auto-applicable`；會改變視覺判準、waiver 或資產化策略者必須標記 `safety: reviewer-required`。
8. 下一輪 skill 只能自動套用 `status: accepted` 且 `safety: auto-applicable` 的規則，並且仍需重新跑完整 gate。

## Entry Template

```markdown
## Entry YYYY-MM-DD — <suggestion-id>

- suggestion id: `<suggestion-id>`
- status: `candidate|accepted|rejected|applied`
- safety: `auto-applicable|reviewer-required`
- reviewer: `(pending)`
- source package: `<source-dir>` / `<main-html>`
- screenId: `<screen-id>`
- source hashes: `html=<hash>` / `css=<hash>` / `tokens=<hash>`
- before: `<what failed; include runtimeVsSource score if available>`
- top offenders:
  - `<zone or selector>` — `<property/token/asset>` — `<impact>`
- proposed rule: `<parser / mapper / token / assetize / waiver / validation rule>`
- verification:
  - `<command>`
- impact: `<expected improvement and risk>`
```

## Entry 2026-04-28 — v2-source-package-and-editor-gate-baseline

- suggestion id: `v2-source-package-and-editor-gate-baseline-2026-04-28`
- status: `accepted`
- safety: `reviewer-required`
- reviewer: `user-requested-baseline`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `pending-tooling`
- before: 舊流程可取得 browser `sourceVsUcuf` 高分，但 `runtimeVsSource.score` 沒有實際計算；`runtime-screen-diff.js --runtime` 只把 runtime PNG 放進 board，score 仍為 null。
- top offenders:
  - `source package` — `ui-design-tokens.json` 未作為 converter authority — token 來源可能漂移。
  - `source package` — `colors_and_type.css` 只被 browser snapshot 看見，靜態 parser 未必攝取 — CSS variables / font / global type 可能丟失。
  - `runtime visual gate` — `sourceVsUcufPreview` 被誤當 final pass — Cocos Editor 實畫面差異被漏掉。
- proposed rule: v2 正式流程必須以 `--source-dir` 驗證三件套，並以 HTML source screenshot vs Cocos Editor screenshot 的 `runtimeVsSource.score >= 0.95` 作為最終通過條件。
- verification:
  - `node tools_node/run-ui-workflow.js --workflow html-to-ucuf --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --bundle lobby_ui --editor-screenshot <png>`
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/runtime-diff/character-ds3`
- impact: 建立 v2 正式 gate，避免 browser preview pass 被誤用為 Cocos runtime pass。實作前不得把此 entry 視為已完成工具能力。

## Entry 2026-04-28 — html-cocos-runtime-gap-fdebac96

- suggestion id: `html-cocos-runtime-gap-fdebac96`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3986082175925926`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m11-baseline`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-0f735d1d

- suggestion id: `html-cocos-runtime-gap-0f735d1d`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3478853202160494`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m13-transparent`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-6eba68cf

- suggestion id: `html-cocos-runtime-gap-6eba68cf`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3791295331790123`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m13-zone-aware`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-1af0c798

- suggestion id: `html-cocos-runtime-gap-1af0c798`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.09067949459876543`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m13-bg-zones`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-6a1ebe67

- suggestion id: `html-cocos-runtime-gap-6a1ebe67`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.11187355324074075`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m13-paint-right`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-f530a61c

- suggestion id: `html-cocos-runtime-gap-f530a61c`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3791295331790123`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/m13-final`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-8072ff72

- suggestion id: `html-cocos-runtime-gap-8072ff72`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3/design_handoff` / `character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:6d7d7f1f1560f7313eb573689d5d3cc9` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3791295331790123`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3/design_handoff" --main-html "character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-cf4ee754

- suggestion id: `html-cocos-runtime-gap-cf4ee754`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3/design_handoff` / `character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:6d7d7f1f1560f7313eb573689d5d3cc9` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3792192322530864`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3/design_handoff" --main-html "character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-2a016f82

- suggestion id: `html-cocos-runtime-gap-2a016f82`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3/design_handoff` / `character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:6d7d7f1f1560f7313eb573689d5d3cc9` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.3792192322530864`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3/design_handoff" --main-html "character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-1dab3c5a

- suggestion id: `html-cocos-runtime-gap-1dab3c5a`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3/design_handoff` / `character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:6d7d7f1f1560f7313eb573689d5d3cc9` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.37935185185185183`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3/design_handoff" --main-html "character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-1e329b84

- suggestion id: `html-cocos-runtime-gap-1e329b84`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.379345100308642`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-7dc7de71

- suggestion id: `html-cocos-runtime-gap-7dc7de71`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.4896836419753086`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-1e3d9197

- suggestion id: `html-cocos-runtime-gap-1e3d9197`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.478212287808642`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-b0b1474d

- suggestion id: `html-cocos-runtime-gap-b0b1474d`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.631430362654321`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-fe4e419f

- suggestion id: `html-cocos-runtime-gap-fe4e419f`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.07650414737654321`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-b6ebda5c

- suggestion id: `html-cocos-runtime-gap-b6ebda5c`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.5530049189814815`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-9cf73fe6

- suggestion id: `html-cocos-runtime-gap-9cf73fe6`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.6418918788580247`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-4664f062

- suggestion id: `html-cocos-runtime-gap-4664f062`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.617475887345679`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-667610d4

- suggestion id: `html-cocos-runtime-gap-667610d4`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.6418918788580247`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-28 — html-cocos-runtime-gap-1a59384c

- suggestion id: `html-cocos-runtime-gap-1a59384c`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.6460725308641976`，threshold=`0.95`
- top offenders:
  - `src` — `unsupported` — `css unsupported occurrences=3`
  - `background` — `assetize` — `css assetize occurrences=2`
  - `--accent-gold` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-cta` — `unsupported` — `css unsupported occurrences=1`
  - `--accent-gold-light` — `unsupported` — `css unsupported occurrences=1`
  - `--bg` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-deep` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-mid` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-navy` — `unsupported` — `css unsupported occurrences=1`
  - `--bg-olive` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-lg` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-md` — `unsupported` — `css unsupported occurrences=1`
  - `--btn-sm` — `unsupported` — `css unsupported occurrences=1`
  - `--divider` — `unsupported` — `css unsupported occurrences=1`
  - `--divider-parchment` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-fast` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-norm` — `unsupported` — `css unsupported occurrences=1`
  - `--dur-slow` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-default` — `unsupported` — `css unsupported occurrences=1`
  - `--ease-enter` — `unsupported` — `css unsupported occurrences=1`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/general-detail-ds3-cutover`
- impact: pending — 需 reviewer 接受後才可自動套用。


## Entry 2026-04-28 — html-to-ucuf-skill-general-rules-2026-04-28

- suggestion id: `html-to-ucuf-skill-general-rules-2026-04-28`
- status: `accepted`
- safety: `auto-applicable`
- reviewer: `user-requested-generalization-2026-04-28`
- source package: `*` (rule applies to all v2 source-package flows, not bound to any single screen)
- screenId: `*`
- source hashes: `n/a (toolchain-level rule)`
- before: 多個工具與 runtime 元件在 DS3 試誤中暴露通則性問題：(a) `ShadowBackground` 把 outer shadow alpha 在元素內部填滿；(b) `ucuf-runtime-check.js` 把 sidecar JSON 當成正式 screen manifest，全部報 RT-03；(c) `compare-html-to-cocos-editor.js` 預設 viewport 與 Cocos Editor screenshot 解析度不一致，產生 false negative；(d) compare 失敗自動寫入 evolution candidate，重跑診斷時無法抑制；(e) `box-shadow` / `linear-gradient` 只在 sidecar 端落地，runtime 缺對應元件。
- top offenders:
  - `assets/scripts/ui/components/ShadowBackground.ts` — `_shadowAlpha` — outer shadow 內部漏色
  - `tools_node/ucuf-runtime-check.js` — sidecar detection — RT-03 假陽性
  - `tools_node/compare-html-to-cocos-editor.js` — `--viewport` default — viewport mismatch
  - `tools_node/compare-html-to-cocos-editor.js` — evolution writer — 噪音 candidate 無法抑制
  - `assets/scripts/ui/core/UIPreviewNodeFactory.ts` / `UIPreviewStyleBuilder.ts` — shadow/gradient sidecar 與 runtime 元件 wiring
- proposed rule:
  - R-1：`ShadowBackground._shadowAlpha(distance, blur)` 在 `distance < 0` 必須回 `0`；`blur === 0` 時只在 `distance === 0` 顯示。所有 CSS `box-shadow` / `drop-shadow` 通用。
  - R-2：`ucuf-runtime-check.js` 只把 `.screen.json` 結尾或裸 `<screen>.json` 且具備 `layoutRef` / `skinRef` / `childPanels` 的檔案視為正式 screen manifest；其餘 sidecar (`.interaction` / `.motion` / `.preload` / `.sync-report` / `.visual-review` / `.logic-guard` / `.logic-inventory` / `.fragment-routes` / `.composite` / `.tab-routing` / `.r-guard` / `.bundle-suggestion`) 一律跳過。`layoutRef` / `skinRef` 接受 `assets/resources/ui-spec/...` 完整路徑。
  - R-3：`compare-html-to-cocos-editor.js --viewport` 必須等於實際 Cocos Editor screenshot 解析度，不可預設 1080。
  - R-4：診斷階段重複比對必須支援 `--no-evolution`；reviewer 接受前不視為共識；噪音 candidate 必須手動移除。
  - R-5：CSS `box-shadow` / `drop-shadow` / `linear-gradient` 必須在 DOM-to-UCUF (`fidelity-sidecars.js`) 與 runtime (`ShadowBackground` / `GradientBackground` + `UIPreviewStyleBuilder` / `UIPreviewNodeFactory` wiring) 雙端同步落地。
- verification:
  - `node tools_node/test/dom-to-ui-self-test.js`
  - `node tools_node/validate-ui-specs.js --strict --check-content-contract`
  - `node tools_node/ucuf-runtime-check.js`
  - `node tools_node/check-encoding-touched.js --changed`
- impact: 下一個進入 html-to-ucuf v2 flow 的畫面可直接受惠（無需重新發現此類 bug）；不影響任何單一畫面的視覺判準，因此標記 `auto-applicable`。
## Entry 2026-04-28 — html-to-ucuf-skill-diagnostic-rules-2026-04-28-v2

- suggestion id: `html-to-ucuf-skill-diagnostic-rules-2026-04-28-v2`
- status: `accepted`
- safety: `auto-applicable`
- reviewer: `tech-director-pass-2026-04-28`
- source package: `*` (rule applies to all v2 source-package flows)
- screenId: `*`
- source hashes: `n/a (toolchain-level rule)`
- before: `runtimeVsSource.score=0.7457`，threshold=`0.95`。`top-offenders` 列出 128 個 unsupported，其中 121 個是 `--*` token 宣告假陽性、2 個是 CSS 註解假陽性 (`source` / `spec`)，掩蓋了實際的 5 個視覺缺口（@font-face URL ×3、`background var(--parchment-base|--bg)` 需 assetize ×2、`text-shadow` ×1、`text-transform: uppercase` ×1）。
- top offenders:
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js` — `classifyCssProperty` — `--*` token 宣告誤分為 `unsupported`
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js` — `buildCssCapabilityReport` — CSS 註解未剝除，`/* SOURCE: ... */` 等被誤抓
  - `tools_node/lib/dom-to-ui/computed-style-capture.js` — `buildCssCapabilityFromUsage` — summary / topOffenders 沒區分 token-declaration
- proposed rule:
  - R-6：`classifyCssProperty` 對 `--` 開頭的 property 一律回傳 `token-declaration`；summary 增 `tokenDeclaration` 桶；topOffenders 同時排除 `supported` 與 `token-declaration`。
  - R-7：`buildCssCapabilityReport` 在掃描前必須 strip `/* ... */` 註解。
- verification:
  - `node tools_node/test/dom-to-ui-self-test.js` (26 ok，含新增 R-6 / R-7 case)
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System" --main-html "design_handoff/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --viewport 1920x1032 --output artifacts/ui-qa/ds3-r6r7-clean --no-evolution` 後 `top-offenders` summary：unsupported 128 → 5，tokenDeclaration 122（新桶），可清楚識別 5 個真正缺口。
- impact: 對所有走 v2 source-package flow 的 HTML 通用，特別是任何使用 design-system CSS variable 或在 source CSS 寫 documentation comment 的設計稿。本身不改變像素 score，但讓 reviewer 與下一輪 skill 不再被 ~120 噪音淹沒，可正確聚焦於真正的 mapper 級缺口（字型載入、`var()` 背景 assetize、`text-transform`、`text-shadow`）。
## Entry 2026-04-28 — html-to-ucuf-skill-classifier-rule-r8-2026-04-28

- suggestion id: `html-to-ucuf-skill-classifier-rule-r8-2026-04-28`
- status: `accepted`
- safety: `auto-applicable`
- reviewer: `tech-director-pass-2026-04-28`
- source package: `*` (rule applies to all v2 source-package flows)
- screenId: `*`
- source hashes: `n/a (toolchain-level rule)`
- before: `classifyCssProperty` 中 `if (ASSETIZE.has(prop)) return 'assetize'` 會在 `background` 任何值（包括 solid color 與 `var(--token)`）一律回 `assetize`，後續的 `if (prop === 'background' && /linear-gradient|.../)` 為死碼。所有使用 design-system token 化 BG 的 UI 都會被誤標需要 assetize，掩蓋真正只能靠 asset 解決的 gradient / image 問題。
- top offenders:
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js` — `classifyCssProperty` — `background` 早於 value 檢查被 ASSETIZE 集合吃掉
- proposed rule:
  - R-8：`classifyCssProperty` 必須在 `ASSETIZE.has(prop)` 之前處理 `background`：`linear-gradient` / `radial-gradient` / `conic-gradient` / `url(...)` → `assetize`；solid color / `var(--token)` / `rgb(...)` / `#...` → `supported`（runtime color-rect 即可承接）。`background-image` 等其他 ASSETIZE 屬性不變。
- verification:
  - `node tools_node/test/dom-to-ui-self-test.js` (27 ok，含新增 R-8 case 覆蓋 5 種 background 值類型)
  - `node tools_node/compare-html-to-cocos-editor.js ... --output artifacts/ui-qa/ds3-r6r7r8-clean --no-evolution` 後 summary：assetize 3 → 1、supported 46 → 48，token 化 BG 不再被誤標。
- impact: 對所有走 v2 source-package flow 的 HTML 通用，特別是任何使用 design-system CSS variable 當 BG 的設計稿。本身不改變像素 score，但讓真正需要 assetize 的目標（gradient / image）從 3 個降為 1 個，下一輪可精準針對該 1 個 assetize 缺口而非被假陽性拖累。

## Entry 2026-04-28 — html-to-ucuf-skill-text-transform-rule-r9-2026-04-28

- suggestion id: `html-to-ucuf-skill-text-transform-rule-r9-2026-04-28`
- status: `accepted`
- safety: `auto-applicable`
- reviewer: `tech-director-pass-2026-04-28`
- source package: `*` (rule applies to all v2 source-package flows)
- screenId: `*`
- source hashes: `n/a (toolchain-level rule)`
- before: Cocos Label 無原生 `text-transform`。converter 端把原始字串（小寫或自然大小寫）直接寫入 layout JSON，runtime 渲染後與瀏覽器套用 CSS `text-transform: uppercase` 後的 reference 圖在每一個 navigation tab、section heading 都有像素差異。reviewer 看到的是「文字內容看起來一樣但分數低」，實際上是字串本身就不一樣。屬於把 runtime 缺失的能力錯誤外包給 runtime 的反模式。
- top offenders:
  - `tools_node/lib/dom-to-ui/computed-style-capture.js` — `CAPTURED` / `ALL_PROPS` / `DEFAULT_VALUES` 未含 `text-transform`
  - `tools_node/lib/dom-to-ui/draft-builder.js` — label 分支直接 `collectText(el)` 不套 transform
- proposed rule:
  - R-9：runtime 沒有的 CSS 能力，能離線決定的就離線決定。`computed-style-capture` 必須抓取 `text-transform`（default `none`）；`draft-builder` label 分支必須以純函式 `applyTextTransformGeneral(text, transform)` 把字串轉換完成再寫進 layout JSON。實作須以 `toLocaleUpperCase` / `toLocaleLowerCase` 處理 locale-sensitive 字型（土耳其文 i/I、德文 sharp s 等），CJK 不被破壞；`capitalize` 走 word-boundary；`full-width` 將 ASCII 對應到全形碼位。Helper 必須 export 供其他 mapper 共用。
- verification:
  - `node tools_node/test/dom-to-ui-self-test.js` (28 ok，含新增 R-9 case 涵蓋 uppercase / lowercase / capitalize / CJK / none / undefined)
  - `node tools_node/dom-to-ui-json.js --input "Design System/design_handoff/character/index.html" ... --use-computed-style --sync-existing --merge-mode preserve-human` 後 `assets/resources/ui-spec/layouts/character-ds3-main.json` 含 `LEGEND` / `OVERVIEW` / `CORE` / `ROLE` / `TRAITS` / `BLOODLINE` / `BIOGRAPHY` / `STAT` / `TACT` / `FATE` / `GEAR` 等大寫字串。
- impact: 對所有走 v2 source-package flow 的 HTML 通用，特別是大量使用全大寫 navigation / heading / button 風格的設計稿（DS3、未來 DS3-style 衍生畫面、所有採用 Roboto / Inter / system-ui 並設定 `text-transform` 的 UI）。把字串差異從 runtime 邊界搬到 converter 邊界；本次 layout JSON 已更新 ~10 處字串，是 R-6/R-7/R-8 之後第一個直接影響「畫面上字看起來不一樣」的真正像素級修正。reviewer 重 capture Cocos Editor screenshot 後重跑 `compare-html-to-cocos-editor.js` 即可觀察 score 變化。

## Entry 2026-04-28 — html-to-ucuf-skill-font-family-stack-rule-r10-2026-04-28

- suggestion id: `html-to-ucuf-skill-font-family-stack-rule-r10-2026-04-28`
- status: `accepted`
- safety: `auto-applicable`
- reviewer: `tech-director-pass-2026-04-28`
- source package: `*` (rule applies to all v2 source-package flows)
- screenId: `*`
- source hashes: `n/a (toolchain-level rule)`
- before: `tools_node/lib/dom-to-ui/draft-builder.js` 的 `pickFontByTag` 寫成 `if (/serif/i.test(family)) return 'fonts/newsreader/font'; return 'fonts/newsreader/font'`，兩個分支結果一樣，等同於把所有 label 的 `font` 都打成同一份字型資產。即使 source CSS 用 `--font-headline` / `--font-body` / `--font-label` / `--font-num` 四條變數映射到不同的 font-family stack，runtime 還是吃同一份 newsreader（serif）字型，導致所有 Latin label / num 字模幾何錯配，是 R-6/R-7/R-8/R-9 之後最大的字型側視覺差異來源。
- top offenders:
  - `tools_node/lib/dom-to-ui/draft-builder.js` — `pickFontByTag` 死碼，未走 stack 解析
- proposed rule:
  - R-10：font-family 是 CSS 的「優先級堆疊」，不是別名。converter 必須建立資料導向 `PROJECT_FONT_REGISTRY`（regex match → asset path），依 stack 順序逐個 family 比對，第一個有專案資產的 family 勝出；未命中時走 `PROJECT_FONT_DEFAULT`（CJK-safe，如 `fonts/notosans_tc/font`）。具體實作以純函式 `resolveFontFamilyToAsset(value, registry?, default?)` export，registry 與 default 可由呼叫端覆寫，方便 (1) 未來新增字型只要在 registry 加一筆資料，不需要改 mapper code；(2) 其他畫面 / 其他流程可以套用自訂的 family→asset 對映（例如某 zone 強制使用某字型）。registry 必須包含「具名專案字型」、「系統 CJK 別名」、「系統 serif 別名」、「CSS generic family」四層 fallback，避免 stack 全部 miss。
- verification:
  - `node tools_node/test/dom-to-ui-self-test.js` (29 ok，含新增 R-10 case 涵蓋 4 種 DS3 角色 stack、CJK alias、generic serif/sans-serif、未知 family、空 / undefined value、自訂 registry 覆寫)
  - DS3 重跑 `node tools_node/dom-to-ui-json.js --input "Design System/design_handoff/character/index.html" ... --use-computed-style --sync-existing --merge-mode html-authoritative` 後 `assets/resources/ui-spec/skins/character-ds3-default.json` 的 `font` 欄位分布從 `99 fonts/newsreader/font` 變成 `51 newsreader (headline serif) / 28 manrope (label/num Latin) / 13 notosans_tc (body CJK)`，對齊 source 的 4 條 `--font-*` 變數語意。
- impact: 對所有走 v2 source-package flow 的 HTML 通用，特別是任何使用多層 font-family stack（`"X","Y","Z",fallback`）的設計稿——也就是幾乎所有現代 UI。把字型錯配的根因從 mapper 死碼改為資料導向解析；新加入字型只需要更新 registry 一筆資料即可同步到所有 UI。R-10 不需要 reviewer 主動介入，每次 source-package 重生即生效。後續 R-12（`@font-face url()` 自動掛入 registry）將進一步把這一層做到「source CSS 增加新字型 → converter 完全自動同步」。


## html-to-ucuf-skill-text-shadow-rule-r11-2026-04-28

- 來源：character-ds3-main HTML→UCUF v2 pipeline 升級，從「runtime 無能力的 CSS → converter 離線」進到「runtime 已支援能力 → converter 必須直接 wire」的對偶通則。
- 通則 R-11：`text-shadow` simple 形式（單層、非 inset）在 converter 階段必須映射為 Cocos Label 原生 shadow API（`enableShadow` / `shadowColor` / `shadowOffset` / `shadowBlur`），不可退回 assetize 圖檔生成。多層或 inset 陰影才走 assetize（由 `tools_node/lib/dom-to-ui/css-capability-matrix.js` 的 value-aware 規則自動分流）。
- 落地點：
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js`：`classifyCssProperty` 在 `ASSETIZE.has(prop)` 之前加 `text-shadow` value-aware 分支；`none` / 單層 → `supported`，含 `inset` / 多層（comma-separated 且非 rgba/hsla 內部 comma）→ `assetize`。
  - `tools_node/lib/dom-to-ui/draft-builder.js`：新增純函式 `parseSimpleTextShadow(value)` 與 `normalizeCssColorToHex(value)`，前者解析 `<offset-x> <offset-y> [blur] <color>` 雙向順序、保持 `rgba(...)` 完整、length<2 / `none` / 多層 / 空值回 null；後者把 `rgb()` / `rgba()` / 3/4/6/8 位 hex 統一轉成 `#RRGGBBAA`。`ensureLabelStyle` 把結果寫到 `slot.shadow = { color, offsetX, offsetY, blur }`。兩個函式皆 export 供未來 mapper 共用。
  - `assets/scripts/ui/core/UISpecTypes.ts`：`SkinLabelSlot` 加 optional `shadow?: { color: string; offsetX: number; offsetY: number; blur?: number }`。
  - `assets/scripts/ui/core/UISkinResolver.ts`：`ResolvedLabelStyle` 加 optional `shadow?: { color: Color; offsetX: number; offsetY: number; blur: number }`；`getLabelStyle` 透過 `resolveColor` 解析陰影色。
  - `assets/scripts/ui/core/UIPreviewStyleBuilder.ts`：`applyLabelStyle` 在 outline / isBold 之間 wire `label.enableShadow = true; label.shadowColor; label.shadowOffset = new Vec2(offsetX, offsetY); label.shadowBlur`。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-11 區塊覆蓋（單層 `Xpx Ypx Bpx rgba(...)`、color-leading 形式、hex 無 blur、`none`、空字串、多層 comma、inset、多層 classify→`assetize`、inset classify→`assetize`、none classify→`supported`）。最終 30 個 ok。
- 影響範圍：所有有單層文字陰影的 UI 通用。DS3 case：1 個 hero overlay heading 的 `text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6)` 從 assetize 缺口降為 supported，並真正套到 Cocos Label 上而非生成 sidecar 圖；assetize 缺口從 5 → 4。
- 設計原則：runtime 已支援的能力一定要直接 wire 過去，禁止退回 assetize 或要求 runtime 解析 CSS 字串；converter 必須在 layout 階段就把 CSS color/length 規範化為 runtime 可直接消費的型態（hex8 / number），保持「converter 解析、runtime 套值」的單向資料流。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（30 ok / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 1 個 label 取得 `shadow: {"offsetX":0,"offsetY":2,"blur":6,"color":"#00000099"}`）；`node tools_node/validate-ui-specs.js --strict --check-content-contract`（無新錯誤）；`node tools_node/check-encoding-touched.js`（touched 全綠）。


## html-to-ucuf-skill-font-face-registry-rule-r12-2026-04-29

- 來源：character-ds3-main HTML→UCUF v2 在 R-9 / R-10 / R-11 之後，compare-html-to-cocos-editor 報告殘留的 `src` ×3 是因為 source-package CSS（`Design System/design_handoff/colors_and_type.css`）的 3 個 `@font-face` 區塊被 declaration scanner 誤判為 unsupported；同時 `font-family` / `font-weight` / `font-display` 等 inner declarations 也持續污染 top offenders。
- 通則 R-12：`@font-face` 是 CSS 宣告自訂字型的標準寫法，runtime 不需要解析；converter 必須把它變成 Cocos font asset 引用，capability 報告必須把整個 block 歸到獨立的 `font-face-declaration` 桶（不算 supported / assetize / unsupported），並把抽出的 mapping 暴露給 compare 工具與 converter 動態擴充字型 registry。
- 落地點：
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js`：`buildCssCapabilityReport(cssText)` 在 declaration scan 之前先用 `extractFontFaceMappings` 抽出所有 `@font-face` block，整批計入 `font-face-declaration`；scan 前再用 `cssText.replace(/@font-face\s*\{[^}]*\}/gi,'')` 移除避免假性 `src` / `font-family` 漏出。`summary` 新增 `fontFaceDeclaration` 欄位；report 新增 `fontFaceMappings: [{family, src, srcs}]`；`topOffenders` filter 排除 `font-face-declaration`。新增 export `extractFontFaceMappings`。
  - `tools_node/lib/dom-to-ui/draft-builder.js`：新增 `buildFontFaceRegistry(styleSheets, customResolver?)` 把 `<style>` 區塊內的 `@font-face` 轉成 `[{ match: /^family$/i, asset, source: '@font-face', family }]` registry；新增 `resolveFontAssetByConvention(family)` 預設按 `fonts/<sanitized-family>/font` 規則解析；`buildDraftFromHtml` 在 `parseStylesheets` 之後 call 並掛到 `ctx.fontFaceRegistry`。`pickFontByTag(style, ctx)` 新增 `ctx` 參數，把 `ctx.fontFaceRegistry` layered 在 `PROJECT_FONT_REGISTRY` 之前；`ensureLabelStyle` 把 `ctx` 一起傳入。新增 export `buildFontFaceRegistry`、`resolveFontAssetByConvention`，並 re-export `extractFontFaceMappings`（透過 css-capability-matrix）。
  - 注意：`buildDraftFromHtml` 只看 inline `<style>`，`<link rel="stylesheet">` 仍由 source-package 模式（compare 工具）負責讀取；converter 內 R-12 對未來「inline @font-face」自動生效，linked CSS 的好處則直接落在 compare 工具的 capability 報告。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-12 區塊覆蓋（quoted/unquoted family、多 url() 來源、缺 src 不噴錯、convention 路徑 sanitize、empty family 回 null、layered registry @font-face 優先勝出、project font 仍能 fallback、customResolver 覆寫）。最終 31 個 ok / ALL PASS。
- 影響範圍：所有使用自訂字型 / @font-face 的 UI 通用。DS3 case：linked `colors_and_type.css` 的 3 個 @font-face（Newsreader / NotoSansTC / Manrope）從 top offenders 退出，compare 報告的真正缺口從 4 → 1（剩下純 `box-shadow` / `background-image` assetize 1 件，候選 R-13 / R-14）。
- 設計原則：`font-face` / `token-declaration`（R-6）/ 註解（R-7）這類「非 render-time 屬性」必須走獨立 capability 桶，不可被歸為 unsupported；converter 必須消費這些宣告做 asset wiring，不可丟給 runtime；registry 必須資料導向，可由 caller 透過 customResolver 覆寫，加新字型只需要在 source CSS 加 @font-face、不需要改 mapper code。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（31 ok / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 重新匯出，無 regression）；`node -e "buildCssCapabilityReport(<DS3 source CSS>)"` 顯示 `summary.fontFaceDeclaration=3`、`fontFaceMappings=[Newsreader,NotoSansTC,Manrope]`、top offenders 不含 `src`；`node tools_node/check-encoding-touched.js`（touched 全綠）。


## html-to-ucuf-skill-declaration-block-extraction-rule-r13-2026-04-29

- 來源：character-ds3-main HTML→UCUF v2 在 R-12 之後，DS3 source-package CSS 跑 `buildCssCapabilityReport` 仍有 `cell` ×4、`a` ×N、`div` ×N 等假性 unsupported entry。trace 後確認來源是 `.cell:last-child {...}` / `a:hover {...}` / `div::before {...}` 等 selector 中的冒號被 flat `prop:val` regex 誤判為 declaration。同時 `border: 1px solid #fff` 等 5 條 hairline 也被一律歸為 unsupported，與 Cocos 實際渲染能力不符。
- 通則 R-13：CSS classifier 的 declaration 掃描必須只跑在 `{ ... }` block 的內文，selector text 必須以結構切分排除（與 R-7 strip comments、R-12 extract @font-face 同形）。同時 shorthand property（`background` / `text-shadow` / `border`）一律走 value-aware 路徑，沒有任何一個 shorthand 應該被 hard-listed 為某個固定 capability。
- 落地點：
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js`：新增 `extractDeclarationBlocks(cssText)` 純函式，brace-balanced scan 走訪 CSS、只收 leaf body（不含內層 `{`），把所有 leaf body 用 `;` 串成單一字串。`buildCssCapabilityReport` 在 R-7 strip comments + R-12 extract @font-face 之後 call 該函式，並把結果丟給原本的 `prop:val` regex（取代直接掃 `stripped`）。新增 export `extractDeclarationBlocks`。
  - `classifyCssProperty('border', value)` 改為 value-aware：`none` / `0` / `Npx style ...` 起始 → supported；`solid` 關鍵字 → supported；`dashed` / `dotted` / `double` / `groove` / `ridge` / `inset` / `outset` → assetize；其餘 → unsupported。
  - SUPPORTED 集合補入 `text-transform`（R-9 converter 已在 build 時消費 → render-time 等價於 `none`，不應算 unsupported）。
  - 所有變動在 `extractDeclarationBlocks` 模組 export 後即可被 compare 工具與測試直接消費，純函式、無 I/O、無副作用。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-13 區塊覆蓋（selector-leak phantom 拒絕：`.cell:last-child` / `a:hover` / `div::before` / `@media nested`；real declaration 仍正確分類；`extractDeclarationBlocks` 取 leaf body 不取 selector / wrapper；nested at-rule 內層仍能取出；`border` shorthand 各種值 supported / assetize / unsupported；`text-transform: uppercase` supported）。最終 48 個 [ok] / ALL PASS。
- 影響範圍：所有使用 pseudo-class / pseudo-element / 巢狀 at-rule / class 名稱含冒號 token 的 UI 通用（幾乎所有 web-style design system 都有）。DS3 case：`summary.unsupported` 從 55 → 39（−16），`summary.supported` 從 247 → 252（+5），phantom `cell` / `a` / `div` 全數消失，真正的渲染缺口剩 `box-shadow` / `background-image`（候選 R-14 / R-15）。
- 設計原則：CSS scanner 是一條 strip + extract pipeline：comment（R-7）→ at-rule block（R-12 @font-face；未來 @keyframes / @media / @supports）→ leaf declaration body（R-13）→ flat prop:val regex → value-aware classifier。每一層都必須結構性處理，不可指望 flat regex 兼顧所有 grammar。shorthand property 一律 value-aware，與 R-8 / R-11 / R-13 對齊。capability 桶不只 supported / assetize / unsupported 三種，還有 `token-declaration`（R-6）/ `font-face-declaration`（R-12）/ 未來可能的 `interaction-only`（cursor / pointer-events）/ `motion-only`（transition / animation）—— 「非 render-time 屬性」永遠各佔獨立桶。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（48 [ok] / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 重新匯出，無 regression）；`node -e "buildCssCapabilityReport(<DS3 source CSS>)"` 顯示 `summary.unsupported=39`、phantom selector property 已消失、`border` 不再在 top offenders；`node tools_node/check-encoding-touched.js`（touched 全綠）。


## html-to-ucuf-skill-box-shadow-value-aware-rule-r14-2026-04-29

- 來源：character-ds3-main HTML→UCUF v2 在 R-13 之後，`buildCssCapabilityReport` 顯示 `box-shadow` 在 top offenders（assetize ×6），但 trace runtime 後確認 repo 已存在 `assets/scripts/ui/components/ShadowBackground.ts`，能以 procedural texture 渲染任意數量的非 `inset` 陰影層（接受 `setShadows(shadows[], padding, cornerRadius)`）；converter 端 `draft-builder.js#buildEffectSiblingNodes` 早已產出對應的 `shadow-set` skin slot 與 sibling node。也就是說 classifier 與 runtime 不一致：runtime 已支援、classifier 仍標 assetize。
- 通則 R-14：CSS classifier 必須以 VALUE 而非 property name 來判定 `box-shadow` / `drop-shadow`：`none` / 空 → supported；任意非 `inset` 層 → supported；任一層 `inset` → assetize（候選 R-15 sidecar bake）。`box-shadow` / `drop-shadow` 必須從 `ASSETIZE` 硬列表移除，加入 value-aware 分支（與 R-8 background / R-11 text-shadow / R-13 border 同形）。
- 落地點：
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty`：在 `if (ASSETIZE.has(prop)) return 'assetize'` 之前加入 `box-shadow` / `drop-shadow` 的 value-aware 分支。`ASSETIZE` 集合保持原樣（仍是 fall-through default），但 value-aware 分支會比它先 hit。
  - 不需要動 converter 與 runtime：兩端早已配合得很好，純粹是 capability 報告的分類修正。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-14 區塊覆蓋（`none` supported、單層非 inset supported、多層非 inset supported、純 inset assetize、混合 inset+outer assetize、`drop-shadow` 同規則）。最終 49 個 [ok] / ALL PASS。
- 影響範圍：所有有 box-shadow / drop-shadow 的 UI 通用。DS3 case：`summary.assetize` 從 20 → 17（−3），`summary.supported` 從 252 → 258（+6 含連動），剩 3 個 `box-shadow assetize` 為真 `inset` 變體。
- 設計原則：**capability scanner 的分類必須反映 runtime 真實能力**，不可因為 property name 屬於某個歷史 hard-listed 集合就一路丟 assetize。所有 shorthand property（`background` / `text-shadow` / `border` / `box-shadow` / `drop-shadow`）一律走 value-aware 分支；硬列表（SUPPORTED / ASSETIZE / UNSUPPORTED）只用於沒有 value 變化空間的 atomic property。任何時候 converter 與 runtime 已實作對某個 CSS pattern 的支援，classifier 都必須立即追上，否則 compare 工具的「真正缺口」會被誤判為比實際更大。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（49 [ok] / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 重新匯出，無 regression）；`node -e "buildCssCapabilityReport(<DS3 source CSS>)"` 顯示 `summary.assetize=17`、3 個 `box-shadow assetize` 全為 `inset` 變體；`node tools_node/check-encoding-touched.js`（touched 全綠）。


## html-to-ucuf-skill-non-render-time-buckets-rule-r16-2026-04-29

- 來源：character-ds3-main HTML→UCUF v2 在 R-14 之後，topOffenders 仍由 `transition` ×5 / `cursor` ×4 / `inset` ×4 / `pointer-events` ×3 / `transform` ×5 等屬性主導，但這些都不是 render-time 像素差距：transition / animation 由 `interaction.json` / `motion.json` sidecar 處理；cursor / pointer-events 是輸入控制；inset shorthand 是 Cocos Widget 4-side anchor；transform 的 translate / scale / rotate 都被 converter 在 build time 吸收進 widget / sprite / node。經 trace 後確認 classifier 與 runtime / converter 的能力嚴重 不一致。
- 通則 R-16：**capability scanner 的 `unsupported` 桶只能用來標真正會造成像素差的 render-time 屬性。** 其他屬性各自獨立分桶：（a）motion-only（transition / animation / will-change）；（b）interaction-only（cursor / pointer-events / user-select / scrollbar-* / -webkit-scrollbar* / -webkit-tap-highlight-color / scroll-behavior）；（c）token-declaration（R-6 已落地）；（d）font-face-declaration（R-12 已落地）。`summary` 與 `topOffenders` 都必須對應更新：summary 全桶都列；topOffenders 只列真正會影響像素的 supported 以外桶（assetize / unsupported），其餘獨立桶一律排除。同時：所有 shorthand property 一律 value-aware（`background` / `text-shadow` / `border` / `border-{side}` / `box-shadow` / `drop-shadow` / `transform`），`box-sizing` 在 Cocos UITransform 隱含 border-box，加入 SUPPORTED。
- 落地點：
  - `tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty`：在 `if (ASSETIZE.has(prop))` 之後加入 motion-only / interaction-only 分支；`transform` 改為 value-aware（不再一律 unsupported）；`inset` / `inset-block` / `inset-inline` / `inset-*` 直接 supported；`border-{top|right|bottom|left}` 側向 shorthand 套 R-13 同款 value-aware；`box-sizing` 加入 SUPPORTED 集合；移除 R-14 重複貼上的殘留註解。
  - `buildCssCapabilityReport` return 物件：`summary` 新增 `motionOnly` / `interactionOnly`；`topOffenders` filter 同步排除這兩桶。
  - 不需要動 converter / runtime / sidecar 產生器：`tools_node/lib/dom-to-ui/draft-builder.js#buildMotionSpec` / `buildInteractionSpec` 早已在處理這些屬性，純粹是 capability 報告的分類修正。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-16 區塊覆蓋（motion-only：transition / transition-property / animation / animation-delay / will-change；interaction-only：cursor / pointer-events / user-select / scrollbar-width / -webkit-scrollbar*；value-aware transform：none / translate / translateX / translate3d / scale / rotate / rotate3d / matrix3d / skew；inset 定位 shorthand；側向 border 各值分類；box-sizing；summary 與 topOffenders 對應驗證）。最終 50 個 [ok] / ALL PASS。
- 影響範圍：所有有 hover transition / cursor pointer / 定位 inset / translateX 居中 / 側向 border 的 UI 通用（幾乎涵蓋所有 web-style design system）。DS3 case：`summary.unsupported` 從 36 → 10（−26），`summary.supported` 從 258 → 269（+11），新增 `motionOnly=5` 與 `interactionOnly=10`；topOffenders 收斂為 8 條，全部是真實渲染缺口（`background` 9 / `box-shadow inset` 3 / `content` 3 / `clip-path` 2 / `text-shadow` multi-layer 2 / `background-{image|position|size}` 各 1）。從 R-12 到 R-16 累計：`unsupported` 55 → 10（−45），假性 phantom 全部消失，剩下的全是真任務。
- 設計原則：**capability scanner 是診斷工具，不是渲染引擎的代理；它的分類必須等於「runtime + converter + sidecar 已實作能力的反向總和」**。任何時候 converter / runtime / sidecar 已支援某個 CSS pattern，classifier 都必須立即追上；任何時候某個屬性根本不影響像素，必須走獨立桶不污染 unsupported。`unsupported` 桶在這條 pipeline 結束時應該幾乎為 0；剩下的 entry 才是真值得開 R-N 規則攻克的 gap。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（50 [ok] / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 重新匯出，無 regression）；`node -e "buildCssCapabilityReport(<DS3 source CSS>)"` 顯示 `summary.unsupported=10`、`motionOnly=5`、`interactionOnly=10`、topOffenders 100% 真渲染缺口；`node tools_node/check-encoding-touched.js`（touched 全綠）。


## html-to-ucuf-skill-unsupported-set-value-aware-rule-r17-2026-04-29

- 來源：R-16 完工後 DS3 capability summary 還有 10 個 unsupported，topOffenders 含 `content` ×3 / `clip-path` ×2 / `border-bottom` ×1 / `box-sizing` ×1 等。深入檢查發現絕大多數命中是 `content: ""` 純裝飾 pseudo-element、`clip-path: none` 預設值、`filter: none` reset 樣式 — 這些 VALUE 都是可渲染特例，但 classifier 因為 property name 落在 UNSUPPORTED 集合就直接退回 unsupported，違反 R-8 / R-11 / R-13 / R-14 / R-16 已建立的 value-aware 原則。
- 通則 R-17：**任何屬性只要存在 `none` / `normal` / 空 pseudo `""` / 軸對齊簡單形 / 原生 blend mode 等可渲染特例，classifier 必須先 inspect VALUE，不能因 property name 落在 UNSUPPORTED 集合就直接 fail-classify。** 這是 shorthand value-aware 規則的鏡像延伸：「value-aware 不限於 shorthand」。 完整規則表見落地點。
- 落地點：`tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty`，在 `if (UNSUPPORTED.has(prop))` 之前插入 R-17 dispatcher，逐屬性家族處理 `content` / `clip-path` / `filter` / `backdrop-filter` / `mask` / `mask-image` / `mix-blend-mode` / `transform-style` / `perspective` / `shape-outside`。每條規則都是值感知的：`none` / `normal` / 空字串 / 軸對齊形 / 原生 Cocos 對應 → supported；複雜形 / url() / path() → assetize；真正無對應的 3D / shape-outside 才退回 unsupported。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-17 區塊。覆蓋（a）`content` 全變體；（b）`clip-path` none / inset / circle / ellipse / 4-pt polygon / 複雜 polygon / path / url；（c）`filter` / `backdrop-filter` none / drop-shadow / blur；（d）`mask` / `mask-image` none / gradient / url；（e）`mix-blend-mode` 8 種；（f）`transform-style` / `perspective` / `shape-outside` 各值；（g）summary：all-none CSS 必須產出 `unsupported=0` / `topOffenders.length=0`。
- 影響範圍：所有現代 CSS 框架皆採用大量 reset 樣式（`content: ""`、`clip-path: none`、`filter: none`、`mix-blend-mode: normal`），R-17 把這些假性 unsupported 全部消化。DS3 case：`unsupported` 10 → 4（−6），topOffenders 從 8 條下降至 7 條真實 assetize。
- 設計原則：**「value-aware」不是 shorthand 專屬，而是 capability scanner 的通用診斷義務**。任何 property name 對應到 capability 的 mapping 都必須允許值感知特例 short-circuit，否則 classifier 就在說謊。

## html-to-ucuf-skill-layout-only-bucket-rule-r18-2026-04-29

- 來源：R-17 完工後 DS3 殘留 4 個 unsupported（`grid-template-columns` / `max-width` / `place-items` / `border-bottom`）。其中 `border-bottom` 已由 R-16 處理（值感知 supported），`grid-template-columns` / `place-items` 是 layout shorthand，`max-width` 由 Cocos UITransform / Widget 吸收 — 三者都不是渲染缺口。
- 通則 R-18：**layout shorthand 必須與 motion-only / interaction-only 同形分桶**。具體規則：
  - `max-width` / `min-width` / `max-height` / `min-height` / `aspect-ratio` → supported（Cocos UITransform + Widget native）。
  - `grid-template-*` / `grid-area` / `grid-column` / `grid-row` / `grid-auto-*` / `place-items` / `place-content` / `place-self` → `layout-only` 獨立桶（converter build-time 轉 Cocos Layout component，runtime 不見原 CSS 屬性）。
- 落地點：`css-capability-matrix.js` R-17 dispatcher 之後、UNSUPPORTED fallback 之前；`buildCssCapabilityReport` 同步：`summary` 新增 `layoutOnly` 欄位、`topOffenders` filter 排除 `layout-only`。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-18 區塊。覆蓋全部 max/min/aspect-ratio 與 grid/place-* shorthand，並驗證 summary `layoutOnly=2` 且 topOffenders 不含 `layout-only`。
- 影響範圍：所有採用 CSS Grid 或 flexbox `place-items` 的現代 UI（幾乎涵蓋全部 design system handoff）。DS3 case：`unsupported` 4 → 1（−3，剩餘 1 為 `xl` phantom 待 R-19 邊界規則）；新增 `layoutOnly=2`；topOffenders 7 條全部為真實 assetize 工作（background gradient/url + box-shadow inset + text-shadow multi-layer + clip-path 複雜形）。
- 累計（R-9 ~ R-18）：DS3 `unsupported` 55 → 1（−54），假性缺口幾乎清零；`topOffenders` 從原本被 phantom selector / motion / interaction / layout / 預設 reset value 污染，收斂為 100% 真實渲染缺口（全部需要 R-15 sidecar bake）。
- 設計原則延伸：**capability scanner 的 unsupported 桶在 pipeline 結束時應該等於 0**。這是 R-1..R-18 累積後的可量化終點。任何時候 unsupported > 0，都應視為 classifier debt，要麼新開 R-N 規則消化，要麼確認該屬性確實無 Cocos 對應。


## html-to-ucuf-skill-runtime-capability-alignment-rule-r19-2026-04-29

- 來源：R-18 完工後 DS3 capability summary topOffenders 仍含 `background ×9 / background-image / -position / -size` 等 assetize 條目。深入檢查 runtime 後發現：
  - `assets/scripts/ui/components/GradientBackground.ts` 已有 `setLinearGradient()` / `setRadialGradient()`，runtime 直接渲染 CSS gradient。
  - `assets/scripts/ui/core/UIPreviewStyleBuilder.ts` 已把 `gradient-rect` skin slot 路由到 `GradientBackground`。
  - `tools_node/lib/dom-to-ui/draft-builder.js` `buildGradientRectSlot` 已把 CSS gradient 轉為 slot，`url(...)` 走 sprite-frame slot。
  - 因此 single-layer gradient / url 是 runtime-supported，不該留在 assetize。
- 通則 R-19：**classifier capability 必須等於 runtime + converter + sidecar 已實作能力的反向總和（遞迴版）。** 任何時候 converter 端為某種 CSS pattern 開發了新的 skin slot kind / 新的 runtime component / 新的 sidecar emitter，必須同步在 classifier 把對應 property + value form 從 assetize / unsupported 升級為 supported。否則 classifier 永遠在說謊。這是 R-16 evolution 條款已寫下的設計原則的遞迴應用。
- 落地點：`tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty`。
  - `background` 規則改寫為值感知：solid / var / none / transparent → supported；單層 `linear-gradient(...)` / `radial-gradient(...)` / `conic-gradient(...)` → supported；單層 `url(...)` → supported；mixed gradient + url 或多層 gradient/url → assetize。
  - 新增 `background-image` 值感知分支：規則同 `background`。
  - 新增 `background-position` / `background-size` / `background-repeat` → 直接 supported（sprite/gradient slot config 吸收，非獨立渲染 pass）。
- 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-19 區塊覆蓋全部 7 種 `background` 值 + 4 種 `background-image` 值 + 3 個 longhand config + summary 驗證（單層 gradient/url 純 CSS yield 0 assetize / 0 unsupported）。原 R-8 測試升級為 R-8/R-19。
- 影響範圍：所有採用 design system gradient token / 背景圖 url 的 UI 通用（幾乎涵蓋全部現代設計稿）。DS3 case：`summary.assetize` 18 → 14（−4），`summary.supported` 275 → 279（+4），topOffenders 7 → 6 條。剩下 6 條 = 7 個 `background` multi-layer mix + 3 個 `box-shadow inset` + 2 個 `text-shadow` multi-layer + 1 個 `background-image` multi-layer + 1 個 `clip-path` 複雜 polygon + 1 個 phantom `xl` = **5 個真實 R-15 sidecar bake 工作 + 1 個 R-20 var resolution candidate**。
- 累計（R-9 ~ R-19）：DS3 `unsupported` 55 → 1（−54），`assetize` ~25 → 14（其中 5 個為真實 bake 工作）。classifier 已對齊 runtime 真實能力，剩下的 gap 全部要靠 R-15 真實 bake 才能繼續推進 95% pixel similarity。
- 設計原則延伸：建議在 `skin-kinds.js` 與 `css-capability-matrix.js` 之間設立交叉檢查機制（後續 R-N 候選）—每次新增 skin kind 必須同步更新 classifier 的對應 capability mapping，避免 R-19 類型的「runtime 已支援但 classifier 仍說 unsupported / assetize」漂移。
- 驗證：`node tools_node/test/dom-to-ui-self-test.js`（53 [ok] / ALL PASS）；`node tools_node/dom-to-ui-json.js ... --sync-existing --merge-mode html-authoritative`（character-ds3-main 重新匯出 durationMs=6146 無 regression）；`node tools_node/check-encoding-touched.js`（touched 全綠）。

## html-to-ucuf-skill-declaration-boundary-regex-rule-r20-2026-04-29

- 類型：classifier 結構性錯誤（capability scanner regex 沒錨在 declaration boundary、又不認得 token 名稱裡的數字）。
- 觸發：DS3 source 量測 R-19 之後 topOffenders 仍殘留 1 條 phantom unsupported `xl` count=1 sample=`32px`，回溯到 `Design System/design_handoff/colors_and_type.css` 第 141 行 `--sp-2xl: 32px;`。`[A-Za-z-]+` 字元類不收 `2`，正則在 `--sp-2` 失敗後直接從 `xl` 重新嘗試，把 `xl: 32px` 當成獨立宣告。任何 design system 採用 `xs/sm/md/lg/xl/2xl/3xl/4xl/5xl`、`1k/2k/4k/8k`、`r-2/r-3` 之類的 token 命名都會洩漏 phantom 屬性。
- 修正：`tools_node/lib/dom-to-ui/css-capability-matrix.js#buildCssCapabilityReport` 的 `declRe` 改為 `(?:^|[;{}])\s*(--[\w-]+|[A-Za-z][A-Za-z0-9-]*)\s*:\s*([^;{}]+)`，要求屬性名出現在宣告邊界（檔頭、`;`、`{`、`}` 之後），並把 custom property 與 standard property 拆成兩個分支：custom 用 `--[\w-]+`（容許數字 + 底線）、standard 用 `[A-Za-z][A-Za-z0-9-]*`（首字母英文）。
- Self-test：`tools_node/test/dom-to-ui-self-test.js` 新增 R-20 區塊。cover (a) `:root { --sp-2xl: 32px; --font-3xl: 48px; --col-4k: 3840px; }` → 3 條 token-declaration、0 條 unsupported、items 不出現 `xl/3xl/4k`；(b) `url("data:image/png;base64,...")` 內嵌 `:` 不會被當成 `image:`/`png:` 屬性；(c) 標準 CSS（`color/padding`）+ 額外 token（`--my-2xs`）一起時 unsupported 仍為 0。從 53 → 54 [ok] / ALL PASS。
- DS3 source 量測：summary `{supported:279, assetize:14, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`unsupported 1 → 0`、`tokenDeclaration 122 → 128`（回收原本被吃掉的 `2xl/3xl/4xl/5xl` family token）。topOffenders 5 條 = 100% 真實 R-15 sidecar bake 工作。
- 通則語：「**capability scanner 必須能區分『宣告邊界』與『identifier 子比對』**。任何子字串級的正則都需要錨點。設計 token 命名常含數字後綴（`xs/sm/md/lg/xl/2xl/3xl`、`1k/2k/4k`），分類器必須對 custom property 開出 `[\w-]+` 容許域，否則 token 命名約定本身會被誤判為新的不支援屬性。」
- 累計戰果：R-9 ~ R-20 把 `unsupported` 從 55 → 0（−55）、`assetize` 從 ~25 收斂至 14；topOffenders 100% 真實 R-15 工作。capability scanner 階段性結束，後續推升 95% 相似度的唯一路徑改由 R-15 sidecar bake pipeline（puppeteer 對每個 assetize selector 烤透明 PNG → 自動串 `background-set`/`shadow-set`/`mask-set`）承接。

## html-to-ucuf-skill-nested-paren-aware-layer-split-rule-r21-2026-04-29

- 類型：classifier 結構性錯誤（多層偵測單回合 paren strip 漏掉外層 gradient 括號，把 inner rgba 逗號誤當 layer 邊界）。
- 觸發：DS3 R-20 之後 topOffenders 仍見 `background ×7` assetize。逐 sample 分類後發現「單層 linear-gradient 含 rgba 顏色站」也被分成 assetize。回溯到 `splitTopLevelLayers` 之前的實作：`rawValue.replace(/\([^()]*\)/g, '()')` 是 single pass、`/g` 只在「同一次 scan」的非重疊位置匹配，因此只會清掉最內層 `rgba(...)`，外層 `linear-gradient(...)` 仍然完整。後續 `split(',')` 時 gradient 內部的逗號通通變成假 layer 切點，產生 phantom 多層。
- 修正：`tools_node/lib/dom-to-ui/css-capability-matrix.js` 新增 helper `splitTopLevelLayers(value)`，用 paren-depth counter 走訪字串字元，遇 `(` depth+1、遇 `)` depth-1、僅在 depth=0 的 `,` 切割。`background` / `background-image` / `text-shadow` 三個 value-aware 規則的 layer split 全部改用新 helper。`box-shadow` / `drop-shadow` 之前不依賴 layer split（僅檢查 `inset`），不受影響但仍可受惠於同一 helper 的後續擴充。
- Self-test：`tools_node/test/dom-to-ui-self-test.js` 新增 R-21 區塊。cover (a) 單層 `linear-gradient(90deg, transparent 45%, rgba(...), ...)` → supported；(b) 單層 `radial-gradient` 帶 3 個 rgba 站 → supported；(c) 兩個 stacked radial-gradient → assetize；(d) `text-shadow` 單層 supported / 雙層 assetize；(e) scanner regression：對 mixed CSS 同時驗證單層 supported 與真多層 assetize 計數。從 54 → 55 [ok] / ALL PASS。
- DS3 source 量測（巨幅改善）：summary `{supported:286, assetize:7, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`assetize 14 → 7`（**−50%**）、`supported 279 → 286`（+7）。topOffenders 4 條 = 100% 真實 R-15 工作：`box-shadow inset ×3`、`text-shadow` 真多層 ×2、`background` 雙 radial-gradient ×1、`clip-path` 複雜 polygon ×1。
- 通則語：「**CSS shorthand 的 layer split 必須是 paren-depth aware**。CSS 函式可任意巢狀（gradient 內含 rgba 內含 var()），任何只用 single-pass replace + split 的 layer 計數都會在 nested 情況下失真。設計系統幾乎一定會用 rgba/hsla/var 控制顏色，因此這條規則對所有 UI 都會觸發。」
- 累計戰果：R-9 ~ R-21 把 `unsupported` 從 55 → 0、`assetize` 從 ~25 → 7、`supported` 從 ~210 → 286。capability scanner 階段性結束。**剩餘 7 條 assetize 全部是真實 R-15 puppeteer bake 工作**（box-shadow inset ×3、text-shadow 真多層 ×2、stacked radial-gradient ×1、複雜 polygon clip-path ×1），這也是現在唯一還能進一步推升 95% pixel similarity 的渲染缺口。

## html-to-ucuf-skill-partial-supported-shadow-rule-r22-2026-04-29

- 類型：classifier 與 runtime 行為不一致（runtime 對 mixed inset+outer box-shadow 已自動 filter inset 並渲 outer，classifier 卻把整條歸 assetize）。
- 觸發：R-21 之後 DS3 topOffenders 仍有 `box-shadow ×3` assetize（全為 mixed inset+outer pattern）。檢視 `assets/scripts/ui/components/ShadowBackground.ts` L46 確認 runtime 已用 `.filter(shadow => !shadow.inset)` 跳過 inset 層 → mixed shadow 在現行 runtime **已渲了一半**。R-14 把 mixed 標 assetize 違反 R-19 遞迴原則（classifier capability = runtime + converter + sidecar 能力總和），且高估「待 R-15 bake」的工作量。
- 修正：
  1. `tools_node/lib/dom-to-ui/css-capability-matrix.js` 引入新 capability bucket `partial-supported`，意義是「value 中存在 runtime 可渲染的子集，剩餘需要 R-15 sidecar bake」。
  2. `box-shadow` / `drop-shadow` 規則拆三段：純 outer → `supported`、純 inset → `assetize`、mixed inset+outer → `partial-supported`。
  3. `buildCssCapabilityReport` 加入 `summary.partialSupported` 統計欄；`topOffenders` filter 排除 `partial-supported`（reviewer 看到的「未渲」清單不應包含 runtime 已渲一半的項目）。
- Self-test：`tools_node/test/dom-to-ui-self-test.js` 新增 R-22 區塊，cover 純 outer / 純 inset / mixed 三種；同時更新舊 R-14 mixed expectation 從 `assetize` 改為 `partial-supported`。從 55 → 56 [ok] / ALL PASS。
- DS3 source 量測：summary `{supported:286, assetize:4, partialSupported:3, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`assetize 7 → 4`；新增 `partialSupported: 3`；topOffenders 4 → 3 條。
- 通則語：「**runtime 對某 CSS value 的部分渲染（partial render）也是真實能力**。若 runtime 用 filter / clamp / 子規則挑出可渲染部分並丟棄其餘，classifier 必須有專屬 capability 表示『部分渲染 + 部分待 bake』，不可一律歸為全 miss 的 assetize。這條原則對 mask-composite、background-blend-mode、複合 filter chain 等都適用。」
- 累計戰果：R-9 ~ R-22 把 `unsupported` 從 55 → 0、`assetize` 從 ~25 → 4、`supported` 從 ~210 → 286，新增 `partialSupported` 軸（首批 3 條）。reviewer 看到的「真正全 miss」topOffenders 已壓到 3 條：text-shadow 真多層 ×2、background stacked radial-gradient ×1、clip-path 複雜 polygon ×1。剩餘 4 條 assetize 全部需要 R-15 puppeteer bake 才能進一步推升 95% pixel similarity。

## R-23（2026-04-18）— text-shadow partial-supported 通則化（與 R-22 同源遞迴原則延伸至 text 軸）

**範疇**：classifier `text-shadow` 規則 + self-test + DS3 規格量測對照。

**背景**：R-22 把 box-shadow 軸的 partial-render 從 `assetize` 升級到新的 `partial-supported` 桶；text-shadow 軸的 multi-layer case 仍停在舊的 `assetize` 分類，違反 R-19 + R-22 確立的「runtime 對某 CSS value 的部分渲染（partial render）也是真實能力」遞迴原則。

**證據鏈**：
- `assets/scripts/ui/core/UIPreviewStyleBuilder.ts` L348-354 — Cocos Label 原生 shadow API 一次只能設一組 `enableShadow / shadowColor / shadowOffset / shadowBlur`；converter 在 layout 階段已能由 CSS `text-shadow` 預解析其中**最重要的一層**並交給 Label 渲染。
- `assets/scripts/ui/core/UISpecTypes.ts` L384 註解 R-11 明確說 Cocos Label native shadow 是 single-layer 模型。
- DS3 source 兩條 multi-layer 文字陰影：
  - `0 0 2px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7)`
  - `0 1px 0 #000, 0 0 10px rgba(0,0,0,.9)`
  在現行 runtime 已渲第 1 層；剩餘層才需要 R-15 sidecar bake。

**規則修正**：classifier `text-shadow` 三段：
1. `none` / 空 → `supported`（no-op）
2. 含 `inset` → `assetize`（CSS quirk，無原生對應）
3. 由 R-21 `splitTopLevelLayers()` 切 layer：
   - `layers ≤ 1` → `supported`
   - `layers ≥ 2` 且全 non-inset → **`partial-supported`**（NEW）

`topOffenders` filter 沿用 R-22 既存設計，自動排除 `partial-supported`。

**通則性**：適用任何使用「文字描邊 + 文字外發光」combo 的 UI（game UI 常見），非僅 character-ds3-main。

**self-test 變更**：
- 新增 R-23 區塊 5 case：none / single non-inset / two-layer / three-layer / inset，並驗 summary `partialSupported === 1` 與 `topOffenders` 不含 text-shadow。
- 更新 R-11 multi-layer expectation：`assetize` → `partial-supported`。
- 更新 R-21 two-layer rgba expectation：`assetize` → `partial-supported`。
- 結果 56 → 57 [ok] / ALL PASS。

**DS3 source 量測**：
- summary `{supported:286, assetize:2, partialSupported:5, unsupported:0}`
- assetize: 4 → 2（−2）
- partialSupported: 3 → 5（+2）
- topOffenders 3 → 2 條：`background ×1`（真三層 radial+radial+linear mix）、`clip-path ×1`（5-point polygon `polygon(0 0, 100% 0, 100% 86%, 91% 100%, 0 100%)`）

**累計（R-9 ~ R-23）**：unsupported 55 → 0、assetize 約 25 → 2、supported 約 210 → 286、partialSupported 0 → 5。剩餘真正全 miss 的 R-15 puppeteer bake 工作壓到 2 個 property、共 2 條 sample。

**未來候選（不在 R-23 範圍）**：
- 多點 axis-aligned `clip-path: polygon(...)`：repo 內目前只有 `Mask.Type.GRAPHICS_RECT` / `RECT` 用例（`UIPreviewNodeFactory.ts` L179、L361 等），尚無 `GRAPHICS_STENCIL` + `Graphics.lineTo()` 任意多邊形遮罩用例。若要把 5-point cut-corner polygon 也升 `supported`，需先在 runtime / converter 加 polygon Mask 支援，屬大型工作；先記錄為 future runtime extension candidate，不在 classifier-only R-23 範圍內。

## R-24（2026-04-18）— gradient-subtype 精度修正（false-positive supported → 正確 assetize）

**範疇**：classifier `background` / `background-image` 規則 + self-test + DS3 量測對照。

**背景**：R-19 引入「value-aware background」原則，把 single gradient / single url 從 assetize 升 supported。但當時偷懶寫 `if (hasGradient) return 'supported'`，沒區分 gradient 子型別。converter `buildGradientRectSlot` (`tools_node/lib/dom-to-ui/draft-builder.js` L939-963) 實際上**只接受 `gradient.type === 'linear'` 且 `layers.length === 1`**：

```javascript
if (layers.length !== 1 || layers[0].kind !== 'gradient') return null;
const gradient = layers[0].gradient;
if (!gradient || gradient.type !== 'linear') return null;
```

所以 `single radial-gradient / single conic-gradient / repeating-linear-gradient / repeating-radial-gradient` 全部沒有原生 render path，但 classifier 卻全部回 `supported`。這違反 R-19 自己提出的「**classifier capability MUST equal runtime + converter actual implementation**」遞迴原則。

**證據鏈**：
- DS3 source 隱藏 1 條 `background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,.07) 3px, rgba(0,0,0,.07) 4px)` — 垂直細線紋理。runtime 從未渲，reviewer 從 css-coverage 看不到問題（false-positive supported）。R-24 後正確標 `assetize`，露出可被 R-15 bake 的真實工作項。

**規則修正**（`background` 與 `background-image` 雙路徑同步）：
1. 加 `isSingleLinear = layers.length === 1 && /^linear-gradient\s*\(/i.test(layers[0].trim())` 判斷
2. `if (hasGradient) return isSingleLinear ? 'supported' : 'assetize'`
3. `repeating-linear-gradient(` 前綴不匹配 `^linear-gradient(`，自動 fallthrough → assetize（無需另寫規則）
4. multi-layer 規則保持不變（`layers.length > 1 && (hasGradient || hasUrl) → assetize`）
5. solid color / var / transparent / single url 全保 supported

**通則性**：適用任何使用 radial spotlight、conic ring、CSS 條紋紋理（`repeating-linear-gradient`）的 UI，非僅 character-ds3-main。

**self-test 變更**：
- 新增 R-24 區塊 9 case cover solid color / var / transparent / single url / single linear / single radial / single conic / multi-layer linear+url / multi-layer radial+linear
- 更新 R-19 (a) 兩條既存期望：`background: radial-gradient(...)` 從 supported 改 assetize；`background: conic-gradient(...)` 從 supported 改 assetize
- 更新 R-21 (b) 期望：single radial-gradient with rgba stops 從 supported 改 assetize（R-21 paren-aware split 仍正確，但 subtype routing 由 R-24 接手）
- 結果 57 → **58 [ok] / ALL PASS**

**DS3 source 量測**：
- summary `{supported:285, assetize:3, partialSupported:5, unsupported:0}`
- supported: 286 → 285（−1，把 1 條 `repeating-linear-gradient` 從 false-positive 移走）
- assetize: 2 → 3（+1，揭露無聲 gap）
- topOffenders 2 → 3 條：`background ×1`（三層 radial+radial+linear mix）、`background-image ×1`（repeating-linear-gradient 條紋紋理）、`clip-path ×1`（5-point polygon）

**技術總監視角的關鍵原則**（記錄為 RuleEvolution 哲學要點）：
> classifier 的「**假樂觀（false-positive supported）**」比「**假悲觀（false-negative assetize）**」危害大十倍。
> - 假樂觀：reviewer 以為通過，但 runtime 實際少渲一層 → pixel similarity 永遠卡在那 → 95% 目標永遠摸不到
> - 假悲觀：R-15 多烤一張 PNG → 一次性成本 → 100% 渲染保證
>
> 因此每次 classifier 規則放寬到 `supported`，**必須**用 converter / runtime 的實際 sink 路徑反向證明，否則寧可保守標 `assetize`。

**累計（R-9 ~ R-24）**：unsupported 55 → 0、supported 約 210 → 285、assetize 約 25 → 3（含 R-24 揭露 1 條隱藏 gap）、partialSupported 0 → 5。剩餘 R-15 puppeteer bake 工作 = **3 個 property、3 條 sample**：3-layer mix bg、repeating-linear-gradient bg-image、5-point polygon clip-path（另 1 條 box-shadow 純 inset 聚合在 partial-supported 統計外）。

**Future runtime extension candidates**（不在 R-24 範圍）：
- 多層 linear-gradient stacking：可考慮在 `GradientBackground` 加 layer array 支援（每層一個 sub-Sprite），把 multi-layer linear+linear 從 assetize 升 partial-supported
- radial-gradient 原生 support：在 `GradientBackground` 加 `setRadialGradient(centerX, centerY, shape, stops)`，沿用 16x16 baked texture 路徑
- 5-point axis-aligned polygon Mask：用 `Mask.Type.GRAPHICS_STENCIL` + `Graphics.lineTo()` 畫多邊形，把 cut-corner clip-path 升 supported

## R-25（2026-04-18）— bake-manifest 通則化（build-time 烤圖契約 + R-15 input 規範）

**範疇**：新增 `tools_node/lib/dom-to-ui/bake-manifest.js`、`fidelity-sidecars.js` 加 emit、`dom-to-ui-json.js` stdout 加 token、self-test 加區塊。

**動機**：R-9 ~ R-24 把 classifier 校準到 honest reporting（unsupported 0、assetize 3、partialSupported 5）。下一個 bottleneck 不是 classifier，是**「該補哪些圖」沒有正式契約**：
- reviewer 看 `*.css-coverage.json` 的 `topOffenders` 只有 property × 計數，不知道是哪個節點
- 美術想開工沒有 shopping list（不知道每張要烤多大、放哪）
- 未來 R-15 puppeteer 要讀什麼 input 沒共識

**架構澄清（technical-director 級重要決策，記入 RuleEvolution 哲學要點）**：
> puppeteer 在這個 pipeline 中**永遠**是 build-time / dev-time 工具，**從不**進 runtime。
>   - build-time：開發機 / CI 跑 puppeteer 烤 PNG，PNG 直接寫進 `assets/resources/sidecars/<screen>/<bakeId>.png`，meta + uuid 進 git。
>   - runtime（玩家手機 / PC / WebGL）：Cocos 載入 PNG 當 SpriteFrame，零 puppeteer 依賴、零額外算力、跨平台一致。
>   - 美術 override：直接把同名 PNG 覆蓋上去（uuid 不變），converter 自動載入新版本，不需改任何 code。
>
> 這條原則寫進每份 manifest 的 `bakerHint` 區塊，避免後續 agent / 美術 / reviewer 誤解 R-15 是「runtime 接 puppeteer」這種錯誤架構。

**規則設計**：
1. **純函式** `buildBakeManifest({snapshots, screenId, sidecarBundle})`：no I/O，不啟動 puppeteer，跑在現有 fidelity-sidecars puppeteer pass 內，零額外成本。
2. **input** 來自既有的 `captureComputedStyles()` snapshots：每個 snapshot 已經有 `path`（DOM selector）、`_rect`（boundingBox `{x,y,w,h}`）、`ucufId`、`tag`、`id`。
3. **scan 規則**：對每個 snapshot × 每個 `BAKE_RELEVANT_PROPS`（background / background-image / box-shadow / text-shadow / filter / backdrop-filter / clip-path / mask / mask-image / mix-blend-mode / content），呼叫 `classifyCssProperty(prop, value)`，只取 `'assetize'` 的 row。
4. **skinSlotKind routing**（forward contract for R-15 converter integration）：
   - `box-shadow` / `text-shadow` / `filter` / `backdrop-filter` → `shadow-set`
   - `clip-path` / `mask` / `mask-image` → `mask-set`
   - 其餘 → `background-set`
5. **stable bakeId**：`<screenId>__<tag>_<nodeId>__<property>`（檔名安全字元集 + 80 char cap）。再跑一次 pipeline 結果完全一致 → git diff 乾淨。
6. **outputPath 約定**：`assets/<bundle>/sidecars/<screenId>/<bakeId>.png`，預設 bundle = `resources`。
7. **target dpr** 預設 2（高 DPI 手機友善），puppeteer 之後可依此產 2x 解析度。
8. **deterministic ordering**：sorted by property → selector → bakeId。
9. **排除規則**：
   - zero-area `_rect.w <= 0 || _rect.h <= 0`（隱藏節點不烤）
   - pseudo (::before / ::after)（避免和父元素重複；R-26 territory）
   - `supported` / `partial-supported`（partial 的 bake recipe 不同，R-26 才處理那條）
10. **schema metadata**：`schemaVersion: '1.0.0'`、`schemaSpec: 'doc_other_0017 (R-25)'`、`bakerHint: { tool, runWhen, runtimeCost, artistOverride }` — 自我說明文件，每份輸出都帶。

**self-test 變更**：
- 新增 R-25 區塊 8 case cover：3-layer bg → entry / single linear-gradient → 不取 / 5-point polygon → mask-set entry / mixed box-shadow → 不取（partial-supported）/ zero-area → 排除 / pseudo → 排除 / 純 inset box-shadow → shadow-set entry / 跨 run 同 input 同輸出 / target dpr=2 / outputPath 路徑前綴
- 結果 58 → **59 [ok] / ALL PASS**

**DS3 source 量測**（pure tooling，classifier 數字不變）：
- summary 不變：`{supported:285, assetize:3, partialSupported:5, unsupported:0}`
- 但**新增** `*.bake-manifest.json` emit，含 7 條具體 placeholder：
  - `background-image ×2`：1 張 1190×1080（主背景三層 mix）、1 張 84×84（重複條紋紋理）
  - `clip-path ×5`：5 張 177×168（5 個 cut-corner card 的 axis-aligned 5-point polygon mask）

**為什麼 7 > classifier summary 的 3**：classifier 計數是 unique value 級（同一條 CSS rule 出現幾次），manifest 是 selector × property tuple 級（同一個 polygon 値被 5 個 card 套用就 5 條）。manifest 才是真實工作量。

**累計（R-9 ~ R-25）**：
- classifier：unsupported 55→0、supported ~210→285、assetize ~25→3、partialSupported 0→5
- 工具：新增 bake-manifest 契約（zero runtime 成本、build-time 烤圖、PNG 進 git、美術可 override）
- 距離 95% pixel similarity 還缺：實作 R-15 puppeteer bake script（R-27 後只讀 manifest 中 `autoBake=true` 的小碎片；其他 entry 走 art asset / converter geometry / waiver）

**Future runtime extension candidates**（不在 R-25 範圍）：
- R-26：partial-supported（multi-layer text-shadow / mixed box-shadow）的部分烤圖 — 只烤 runtime 沒渲到的層數
- R-15 implementation：bake-manifest reader + puppeteer launch per entry + PNG write + meta sync + converter `background-set` / `shadow-set` / `mask-set` slot 接收

## R-26（2026-04-29）— puppeteer bake script 落地（R-15 正式 implementation）

**範疇**：增強 `bake-manifest.js` schema 1.1.0（+sourceHtml/+viewport）、新增 `tools_node/bake-ucuf-sidecars.js` 純 CLI、`fidelity-sidecars.js` 注入 sourceHtml/viewport。

**動機**：R-25 確立契約後立刻面對下一個 bottleneck — 沒有 PNG 就沒有 95%。reviewer / 美術 / converter 都在等實體檔。R-26 = 把抽象契約變成可執行管線。

**通則設計（technical-director 級重點）**：
1. **manifest 自包含**：bake CLI **不應該需要任何額外 CLI 引數就能重跑**。R-25 schema 缺 sourceHtml → bake CLI 只能靠人手記得當初是哪份 HTML。R-26 把它寫進 manifest（schema 1.1.0），任何後人 / CI / 美術 clone 下來都能 `node bake-ucuf-sidecars.js --manifest <path>` 一鍵重跑。
2. **單次 puppeteer launch**：所有 auto-bake entry 共用同個 `page`。launch 成本 ~700ms / entry 成本 ~30ms；R-27 後 DS3 沒有 auto-bake entry，未來只對明確 opt-in 的小碎片計入此成本。
3. **`data-ucuf-capture-id` 跨 run stable**：bake CLI 中那段 `CAPTURE_ID_STAMP` IIFE 與 `computed-style-capture.js` 的 id 賦值演算法**byte-equivalent**。理由 — 任何「重新 query selector by tag/class/index」的方案都會在動態 DOM（template repeat / CMS）下崩盤。共享 capture-id 是 capture pass 已經贏的 invariant，bake 直接搭便車。
4. **transparent omitBackground**：`page.screenshot({omitBackground:true})` 讓 PNG 帶 alpha，Cocos converter 用 `background-set` / `mask-set` slot 接收後可以與任何 parent fill / scene background 自由疊合，不會出現黑底邊。
5. **status writeback**：bake 完寫回 `entry.status='baked'` + `bakedBytes` + `bakedMtime`，再加 top-level `lastBake { at, tool, bakedCount, failedCount, durationMs }`。reviewer 看 manifest 一眼判斷 freshness。CI 模式 `--no-update-status` 跳過避免 push 衝突。
6. **`--only` / `--dry-run` / `--repo-root`**：增量重烤 / CI 預演 / 跨 workspace 三大實戰 flag。
7. **架構不變式**：puppeteer 只在 build/dev/CI 跑，PNG 進 git，runtime 載 SpriteFrame 零 puppeteer 依賴。本 script 的 module-level 註解明文寫死這條，避免後續 agent 誤把 puppeteer 包進 runtime。

**DS3 首次 R-15 技術驗證（R-27 已撤回作正式素材）**：
- R-26 曾 7/7 baked，0 失敗，3950ms；R-27 判定這只是技術驗證，不是正式素材清單。
- `div_2__background-image` 1334×750 → 2.5MB（主背景三層 mix 真 raster）
- `div_84__background-image` 338×96 → 30KB（重複條紋紋理）
- 5× `div_*__clip-path` 109×13 ~ 662×1 → 108B ~ 2KB（5 個 cut-corner card mask）
- 7 張 PNG 曾進 `assets/resources/sidecars/character-ds3-main/`，但此為 R-26 技術驗證；R-27 美術 QC 後已判定不應作為正式素材並清除。

**R-27 候選（已知殘缺）**：
- clip-path bake-time bbox（109×13）≠ capture-time bbox（123×117）。原因：設計稿可能有 lazy reveal / hover-grow / IntersectionObserver-driven animation；兩次 navigate 之間 layout settle 不穩。修法選項（依複雜度）：
  - (a) bake 用 manifest `target.{width,height}` 直接 setViewport / clip 區域，不依賴當下 boundingBox（最快、最穩、推薦）
  - (b) capture-time 凍結 animation（`document.getAnimations().forEach(a=>a.pause())`）後再讀 rect
  - (c) bake-time `element.scrollIntoView` + extra settle delay
- partial-supported recipe（multi-layer text-shadow / mixed inset+outer box-shadow）只烤缺漏的 layer，不烤 runtime 已 native 支援的層 → R-28
- bake-time content-mask metadata 寫入 outputPath sibling JSON（含原 selector / property / value），讓美術看 PNG 旁邊的 spec 就能改

**累計（R-9 ~ R-26）**：
- classifier：unsupported 55→0、supported ~210→285、assetize ~25→3、partialSupported 0→5
- 工具：bake-manifest 契約（R-25）+ puppeteer bake CLI（R-26）；R-26 曾實測 7 張 PNG，但 R-27 美術 QC 判定為錯誤引導並已撤回 / 清除
- **距離 95% pixel similarity 還缺**：R-27 美術 QC 後改為 (a) 大背景 / 紋理語言走正式 art asset 或 token/procedural 決策 (b) clip-path 走 converter geometry/runtime mask (c) 只有明確 `data-ucuf-bake="fragment"` 的小碎片才由 puppeteer 產 PNG (d) Cocos Editor 重 capture screenshot 跑 hard pixel gate

## R-27（2026-04-29）— 美術總監 QC：auto-bake 只允許小型缺圖碎片（撤回 R-26 七張 PNG）

**範疇**：`computed-style-capture.js` 捕捉 `data-ucuf-bake` 語意、`bake-manifest.js` schema 1.2.0 加 art-direction gate、`bake-ucuf-sidecars.js` 預設只烤 `autoBake=true` entry、清除錯誤 sidecar PNG。

**美術判定**：R-26 技術上可烤，但美術語意錯了。`assetize` 只代表「Cocos 現階段不能原生重建這個 CSS 值」，不等於「應該把整個 DOM element 截成 PNG」。七張輸出中：
- `div_2__background-image` 是全螢幕級不透明 PNG，違反大型背景正式資產要走 JPG / family layer 的規則，也不是小缺圖。
- `div_84__background-image` 實際截成 676×192 不透明區塊，不是 manifest 上看起來的 58×58 tile；是否需要小圖需人工判斷，不能自動烤。
- 5 張 `clip-path` 是 2px/26px 高的不透明黑條；clip-path 是 geometry/mask behavior，不是缺圖。

**新規則**：
1. **auto-bake 必須 opt-in**：source HTML 的小碎片節點必須標 `data-ucuf-bake="fragment"`（或 `data-bake="fragment"`）才可能進 auto-bake。
2. **尺寸硬門檻**：預設 `maxWidth=256`、`maxHeight=256`、`maxArea=65536`、`maxViewportAreaRatio=0.08`。超過就算標了 fragment 也轉 `manual-art-asset`。
3. **geometry 禁止 screenshot**：`clip-path` / `mask` / `mask-image` 一律 `converter-geometry`，交給 Cocos mask/vector/converter rule，不截 rendered content。
4. **未標記小圖只 review**：小尺寸但無 opt-in 的 `assetize` row 只做 `review-only`，讓美術決定它是 token/procedural、正式資產、還是真缺圖。
5. **outputPath 只給 autoBake**：review-only / manual-art-asset / converter-geometry entry 沒有 `outputPath`，避免 reviewer 或 CLI 誤以為要產 PNG。
6. **bake CLI 安全預設**：`tools_node/bake-ucuf-sidecars.js` 只處理 `autoBake=true && bakeAction='auto-screenshot-fragment'`；dry-run 會列出 skipped reason。
7. **clip 使用 manifest target**：真正 auto-bake 時改用 capture-time `target.{x,y,width,height}` clip，而不是 bake-time `elementHandle.boundingBox()`，避免 layout settle 漂移。

**DS3 R-27 結果**：
- manifest schemaVersion: `1.2.0`
- totalEntries: 7
- autoBakeEntries: 0
- reviewOnlyEntries: 7
- byBakeAction: `{ manual-art-asset: 1, review-only: 1, converter-geometry: 5 }`
- `assets/resources/sidecars/character-ds3-main/` 七張 PNG + meta 已移除。

**通則結論**：未來每個 UI 走 HTML→UCUF 時，sidecar bake 不是「補所有 assetize」；它只補**美術確認缺乏的小型視覺碎片**。大型背景要走正式 art asset，幾何裁切要走 converter/runtime capability，未決小紋理要先 review 再 opt-in。

**累計（R-9 ~ R-27）**：
- classifier：unsupported 55→0、supported ~210→285、assetize ~25→3、partialSupported 0→5
- 工具：bake-manifest 從「PNG shopping list」修正為「gap resolution manifest」：每個 entry 必須落在 auto-baked PNG / manual art asset / converter geometry / waiver 其中一種 resolution。
- **距離 95% pixel similarity 還缺**：(a) 背景與紋理語言的正式 art asset / token 決策 (b) clip-path geometry converter/runtime 支援 (c) 若 source HTML 明確標記 `data-ucuf-bake="fragment"`，再用 bake CLI 產真正的小碎片 PNG (d) Cocos Editor 重 capture screenshot 跑 hard pixel gate。

## R-28（2026-04-29）— 既有 runtime 美術資源優先：update mode 不得覆蓋已交付 sprite asset

**範疇**：`smart-merge.js` skin merge、`dom-to-ui-self-test.js` regression、HTML→UCUF skill update mode 文件規則。

**來源**：R-27 之後發現 HTML draft 仍可能把已存在的正式背景圖洗成 generated gradient / color / placeholder，導致下一輪 skill update 比上一輪美術輸出退步。這不是單一 UI 問題；任何已經有 `assets/resources/` runtime SpriteFrame 的畫面，都不應被新 HTML 的暫時性 CSS 輸出覆蓋，除非 reviewer 明確決定要換圖。

**通則 R-28**：
1. **既有 runtime sprite 是 update mode 的預設權威**：既有 `auto.*` skin slot 若為 `kind: "sprite-frame"` 且 path 在 `assets/resources/` 找得到 `.png/.jpg/.jpeg/.webp/.json` 實檔，smart merge 必須保留它。
2. **`html-authoritative` 不等於 asset-authoritative**：`--merge-mode html-authoritative` 仍可覆蓋結構與 generated style，但不能默默覆蓋已交付美術圖。HTML 產生的 gradient/color slot 只代表新草稿，不代表可替換正式 asset。
3. **替換必須明確批准**：draft slot 只有帶 `assetPolicy: "replace-existing"`、`assetReplaceApproved: true` 或 `_replaceExistingAsset: true` 之一，才允許覆蓋既有 runtime sprite。
4. **保留時要清理 generated paint 污染**：若過去一輪曾把 `color: "unmappedColor"` / `opacity: 1` / `gradient` 混入 sprite slot，preserve path 必須清掉這類 draft paint residue，只留下乾淨 sprite-frame 欄位與 `_assetPreserveReason: "existing-runtime-asset"`。
5. **sync-report 必須可追蹤**：保留行為寫入 `existing-runtime-asset-preserved` field change，讓 reviewer 能看到 HTML draft 嘗試替換哪個正式 asset。

**DS3 驗證例**：`character_ds3_portrait_bg_decor.jpg` 判定為不需要的 generated runtime 資源並移除；左側背景 slot 維持既有正式 `sprites/ui_families/general_detail/generated/general_detail_bg_v5_civil`。這只是驗證案例，規則本身適用所有 HTML→UCUF update mode 畫面。

**自我測試**：新增 `--sync-existing html-authoritative preserves existing runtime sprite assets unless replacement is explicit`；驗證 (a) draft gradient/color 不會覆蓋既有 runtime sprite、(b) preserved sprite 不繼承 generated paint 欄位、(c) 帶 `assetPolicy: "replace-existing"` 時才允許替換。`node tools_node/test/dom-to-ui-self-test.js` 全綠。

**累計（R-9 ~ R-28）**：
- classifier：unsupported 55→0、supported ~210→285、assetize ~25→3、partialSupported 0→5
- 工具：bake-manifest 已是 gap resolution manifest；update mode 再新增 existing-runtime-asset preservation，避免美術資產被 HTML draft 回洗。
- **距離 95% pixel similarity 還缺**：(a) 背景與紋理語言的正式 art asset / token 決策 (b) clip-path geometry converter/runtime 支援 (c) 明確 opt-in 小碎片 bake (d) Cocos Editor 重 capture screenshot 跑 hard pixel gate。

## R-29（2026-04-29）— 正式 tab/button UI chrome asset preservation + art-authority-aware score

**範疇**：`smart-merge.js` runtime asset detection 擴展、`dom-to-ui-compare.js --manual-waivers`、`dom-to-ui-self-test.js` regression、`character-ds3-main.skin.json` tab button 實測。

**來源**：R-28 先保住大型背景 sprite，但 user 指出 tab button 圖片也是正式素材；若 converter 只保護 `auto.* sprite-frame`，未來 named slot 或 `button-skin` 仍可能被 HTML gradient / border 草稿洗掉。這會讓已交付的 UI chrome（tab、button、icon、panel frame）因追求 HTML CSS 近似而退步。

**通則 R-29**：
1. **runtime art asset 不限 sprite-frame**：既有 slot 若為 `sprite-frame.path`，或 `button-skin.normal/pressed/disabled/selected` 任一狀態資產，且所有引用路徑都存在於 `assets/resources/`，smart merge 在 update mode 必須保留。
2. **slot id 不限 `auto.*`**：正式 named slot 更可能是人手 curated asset；不應比 auto slot 更容易被覆蓋。
3. **HTML 權威不等於美術替換權威**：HTML draft 可覆寫結構與 generated style，但不能把正式 UI chrome 換成 gradient/color fallback。
4. **替換仍需明確批准**：`assetPolicy: "replace-existing"`、`assetReplaceApproved: true` 或 `_replaceExistingAsset: true` 才允許換掉正式 runtime asset。
5. **分數雙軸**：raw `runtimeVsSource.score` 保持誠實；已核准正式資產與 HTML 草稿不同時，必須用 image waiver / art-authority sidecar 記錄 rect + reason，進 adjusted score 與 reviewer 報告。這不是無紀錄扣分豁免，而是把「正式美術與 HTML 草稿不同」從 converter failure 中分離。

**工具修正**：
- `tools_node/lib/dom-to-ui/smart-merge.js`：`preserveExistingRuntimeAssetSlot` 改用 `isExistingRuntimeAssetSlot`，支援 `sprite-frame` 與 `button-skin`，移除 `auto.*` 限制，並以 runtime asset signature 判斷 draft/existing 是否相同。
- `tools_node/dom-to-ui-compare.js`：新增 `--manual-waivers <json>`，讓 approved art authority zones 可被寫入 `.image-waivers.json`，並讓 pixel-diff adjusted coverage 具備可稽核來源。
- `tools_node/test/dom-to-ui-self-test.js`：新增 formal `button-skin` preservation regression，確認 named tab/button slot 在 `html-authoritative` 下不被 gradient 覆蓋；explicit replace marker 仍可替換。

**DS3 實測**：
- `character-ds3-main` right tab rail 六個 slots 接回正式 `button-skin`：`button_4` 使用 `sprites/ui_families/general_detail/tab_active_button`，`button_5`~`button_9` 使用 `tab_idle_button`，各自保留 pressed/disabled/selected formal paths。
- 重跑 `node tools_node/dom-to-ui-json.js --input "Design System/design_handoff/character/index.html" --output "assets/resources/ui-spec/layouts/character-ds3-main.layout.json" --skin-output "assets/resources/ui-spec/skins/character-ds3-main.skin.json" --screen-id character-ds3-main --bundle resources --use-computed-style --sync-existing --merge-mode html-authoritative` 後，6 個 tab slots 全部仍為 `button-skin` 且 `_assetPreserveReason: "existing-runtime-asset"`。
- `assets/resources/ui-spec/screens/character-ds3-main.layout.sync-report.json` 產生 6 筆 `existing-runtime-asset-preserved`，detail 顯示 HTML draft 的 `gradient-rect` 嘗試被正式 tab button assets 擋下。

**自我測試**：`node tools_node/test/dom-to-ui-self-test.js` 全綠；新增檢查 covers runtime sprite preservation、formal button-skin preservation、explicit replace marker、compare manual waiver sidecar。

**累計（R-9 ~ R-29）**：
- classifier：unsupported 55→0、supported ~210→285、assetize ~25→3、partialSupported 0→5
- 工具：update mode 已能保住正式背景 sprite 與 tab/button `button-skin`；compare adjusted score 可透過 manual/art-authority waiver 稽核正式 asset 差異。
- **距離 95% pixel similarity 還缺**：正式 art asset 要成為 source authority 時，應同步更新 HTML source 或產生 approved art-authority waiver；剩餘 renderer gap 仍是 clip-path geometry、明確 opt-in 小碎片 bake、Cocos Editor 重 capture hard pixel gate。

## Entry 2026-04-29 — html-cocos-runtime-gap-49d4b385

- suggestion id: `html-cocos-runtime-gap-49d4b385`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8556172839506173`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,576,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-29-pill-cornerradius-fix`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-40d05097

- suggestion id: `html-cocos-runtime-gap-40d05097`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8403356481481481`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1472,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r38-align-pass`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-74be2cf6

- suggestion id: `html-cocos-runtime-gap-74be2cf6`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8405020254629629`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r38-align-pass-after`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-155ce92a

- suggestion id: `html-cocos-runtime-gap-155ce92a`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8408029513888889`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,576,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r39-paragraph-overflow`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-02b914c3

- suggestion id: `html-cocos-runtime-gap-02b914c3`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.812160976080247`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1344,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1408,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1472,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1536,640,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r40-panel-readability`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-e91b2c6d

- suggestion id: `html-cocos-runtime-gap-e91b2c6d`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8139086612654322`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1344,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1408,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1472,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1536,640,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r41-subtle-panels`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-05caa0c8

- suggestion id: `html-cocos-runtime-gap-05caa0c8`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8408858989197531`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r42-alignment-overflow-final`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-29 — html-cocos-runtime-gap-d4033106

- suggestion id: `html-cocos-runtime-gap-d4033106`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.8405473572530864`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,576,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r43-no-auto-shrink`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-71c0bc89

- suggestion id: `html-cocos-runtime-gap-71c0bc89`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:a09e5c5b44eb9ab25e2da79b23b0e8ee`
- before: `runtimeVsSource.score=0.7102261766975309`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-source/character-ds3/review/2026-04-30-r53-overview-crop/character-ds3-main`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-39d26ac2

- suggestion id: `html-cocos-runtime-gap-39d26ac2`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.881379726080247`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,960,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,512,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,896,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,768,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,192,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r54-border-fix`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-f35005f8

- suggestion id: `html-cocos-runtime-gap-f35005f8`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `design_handoff/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:f5914a603324da4aabb672d9264cdb13` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.731878375771605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,512,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,576,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,704,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "design_handoff/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r59-artdir-continue`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-6f24e0e9

- suggestion id: `html-cocos-runtime-gap-6f24e0e9`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.731878375771605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,512,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,576,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,704,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r59b-artdir-continue`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-d34612c7

- suggestion id: `html-cocos-runtime-gap-d34612c7`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.731878375771605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,512,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,576,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,640,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,704,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r59c-artdir-continue`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-04-30 — html-cocos-runtime-gap-ed0c6ef3

- suggestion id: `html-cocos-runtime-gap-ed0c6ef3`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6993788580246914`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r60-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-bf03275a

- suggestion id: `html-cocos-runtime-gap-bf03275a`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.8618610146604938`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,1024,64,56`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,1024,64,56`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,1024,64,56`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,1024,64,56`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,1024,64,56`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r62-current-runtime-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-90842d59

- suggestion id: `html-cocos-runtime-gap-90842d59`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.8841912615740741`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=768,704,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=832,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=768,768,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=832,320,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r62-story-collapsed-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-24534ce1

- suggestion id: `html-cocos-runtime-gap-24534ce1`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7310831404320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r62-source-skin-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-55f2a3e5

- suggestion id: `html-cocos-runtime-gap-55f2a3e5`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6840104166666666`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r70-no-auto-label-outline-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-a4813d0d

- suggestion id: `html-cocos-runtime-gap-a4813d0d`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.681370563271605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-b6a4bf7d

- suggestion id: `html-cocos-runtime-gap-b6a4bf7d`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.681370563271605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-0c9587b3

- suggestion id: `html-cocos-runtime-gap-0c9587b3`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.681370563271605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-3b4c22f7

- suggestion id: `html-cocos-runtime-gap-3b4c22f7`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.681370563271605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-6f5a7427

- suggestion id: `html-cocos-runtime-gap-6f5a7427`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5560522762345679`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare-1080`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-6e661aba

- suggestion id: `html-cocos-runtime-gap-6e661aba`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5560522762345679`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r71-overflow-none-compare-1080`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-bb5260bb

- suggestion id: `html-cocos-runtime-gap-bb5260bb`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.2878390239197531`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-6ff6ed31

- suggestion id: `html-cocos-runtime-gap-6ff6ed31`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.07365354938271605`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=64,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate-rerun`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-2cfeed9a

- suggestion id: `html-cocos-runtime-gap-2cfeed9a`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.559931037808642`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate-browser`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-5c0cec01

- suggestion id: `html-cocos-runtime-gap-5c0cec01`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.559931037808642`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate-browser`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-d83e881e

- suggestion id: `html-cocos-runtime-gap-d83e881e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.559931037808642`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate-browser`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-01 — html-cocos-runtime-gap-25311dda

- suggestion id: `html-cocos-runtime-gap-25311dda`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5630478395061729`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/r73-runtime-gate-browser`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-bf103264

- suggestion id: `html-cocos-runtime-gap-bf103264`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.23423032407407407`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,128,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/cocos-editor-final-gate/character-ds3-main-current`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-f1364604

- suggestion id: `html-cocos-runtime-gap-f1364604`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5707609953703704`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r96-compare-preview-with-protocol`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-95a15742

- suggestion id: `html-cocos-runtime-gap-95a15742`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6928708526234568`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r96-compare-preview-no-crop`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-d512be90

- suggestion id: `html-cocos-runtime-gap-d512be90`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6928708526234568`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r97-compare-preview-with-auto-crop-skip`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-fdabe0c4

- suggestion id: `html-cocos-runtime-gap-fdabe0c4`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.23423032407407407`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,128,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r98-compare-full-editor-regression`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-83a04356

- suggestion id: `html-cocos-runtime-gap-83a04356`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5979325810185185`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-002`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-b0acd4ac

- suggestion id: `html-cocos-runtime-gap-b0acd4ac`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.23885416666666667`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-002-overviewprod`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-fffd75f3

- suggestion id: `html-cocos-runtime-gap-fffd75f3`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6940605709876543`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-005`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-b9e85950

- suggestion id: `html-cocos-runtime-gap-b9e85950`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6989289158950617`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-006`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-9746b1d2

- suggestion id: `html-cocos-runtime-gap-9746b1d2`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6989289158950617`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-006`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-ae547147

- suggestion id: `html-cocos-runtime-gap-ae547147`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6989289158950617`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-006`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-919d0fee

- suggestion id: `html-cocos-runtime-gap-919d0fee`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6988710455246914`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-009`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-cc86f43e

- suggestion id: `html-cocos-runtime-gap-cc86f43e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6986603009259259`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-010`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-07e64a72

- suggestion id: `html-cocos-runtime-gap-07e64a72`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.37494116512345677`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-011`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-74f0912e

- suggestion id: `html-cocos-runtime-gap-74f0912e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6986603009259259`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/chads3-20260502-018`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-a1f37a97

- suggestion id: `html-cocos-runtime-gap-a1f37a97`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/character/index.html`
- screenId: `character-ds3-main`
- source hashes: `html=sha256:2d6bfca1ae9c76f2d3ddb85cdcd202f4` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6920047260802469`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=960,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=896,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/character/index.html" --screen-id character-ds3-main --editor-screenshot <png> --output artifacts/ui-qa/r100-compare-after-stretch-fix`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-02 — html-cocos-runtime-gap-e487873c

- suggestion id: `html-cocos-runtime-gap-e487873c`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `artifacts/ui-qa/stats-fragment-source-package` / `character-ds3-main.stats.right-content.html`
- screenId: `character-ds3-stats-fragment`
- source hashes: `html=sha256:284594b7bac46ba1eb9a7d82e45b6c14` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7693156828703703`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,256,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,128,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "artifacts/ui-qa/stats-fragment-source-package" --main-html "character-ds3-main.stats.right-content.html" --screen-id character-ds3-stats-fragment --editor-screenshot <png> --output artifacts/ui-qa/r122-radar-source-geometry-compare`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-39da6bcf

- suggestion id: `html-cocos-runtime-gap-39da6bcf`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09943962191358025`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-f632df2e

- suggestion id: `html-cocos-runtime-gap-f632df2e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.0895191936728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-d34e8dff

- suggestion id: `html-cocos-runtime-gap-d34e8dff`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.0895191936728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/ui-qa/gacha-ds3-agent-review`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-5a83ddde

- suggestion id: `html-cocos-runtime-gap-5a83ddde`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.0895191936728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/ui-qa/gacha-ds3-agent-review`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-a1a903ca

- suggestion id: `html-cocos-runtime-gap-a1a903ca`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.0895191936728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/ui-qa/gacha-ds3-agent-review`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-44956045

- suggestion id: `html-cocos-runtime-gap-44956045`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/shop-gacha-popup/index.html`
- screenId: `gacha-pull-result`
- source hashes: `html=sha256:38d04ee72c00873488976571ee9aeb31` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5159717399691358`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=640,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=704,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=768,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=832,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/shop-gacha-popup/index.html" --screen-id gacha-pull-result --editor-screenshot <png> --output artifacts/ui-qa/gacha-pull-result-review`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-69ff2730

- suggestion id: `html-cocos-runtime-gap-69ff2730`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-458264be

- suggestion id: `html-cocos-runtime-gap-458264be`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-8f03dcb2

- suggestion id: `html-cocos-runtime-gap-8f03dcb2`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-0a6be0d2

- suggestion id: `html-cocos-runtime-gap-0a6be0d2`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-03 — html-cocos-runtime-gap-fdcbec49

- suggestion id: `html-cocos-runtime-gap-fdcbec49`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-b71d0f5c

- suggestion id: `html-cocos-runtime-gap-b71d0f5c`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-251f81b9

- suggestion id: `html-cocos-runtime-gap-251f81b9`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09063175154320988`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-eb82fb39

- suggestion id: `html-cocos-runtime-gap-eb82fb39`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.09058256172839506`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-b5f1c3df

- suggestion id: `html-cocos-runtime-gap-b5f1c3df`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.532752700617284`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1728,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1856,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-63f72288

- suggestion id: `html-cocos-runtime-gap-63f72288`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.532752700617284`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1600,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1664,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1728,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1792,0,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1856,0,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-fea6322b

- suggestion id: `html-cocos-runtime-gap-fea6322b`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7032036072530864`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=640,192,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-135ad855

- suggestion id: `html-cocos-runtime-gap-135ad855`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7032036072530864`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=640,192,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-aa9d2504

- suggestion id: `html-cocos-runtime-gap-aa9d2504`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7031520061728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=640,192,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-a486256f

- suggestion id: `html-cocos-runtime-gap-a486256f`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.7031520061728395`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=576,192,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=640,192,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-4f32f1d2

- suggestion id: `html-cocos-runtime-gap-4f32f1d2`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.48582368827160494`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-c88167a5

- suggestion id: `html-cocos-runtime-gap-c88167a5`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.48582368827160494`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-9cd1caac

- suggestion id: `html-cocos-runtime-gap-9cd1caac`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.48582175925925924`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-99f74b52

- suggestion id: `html-cocos-runtime-gap-99f74b52`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.4837065972222222`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-fe73aeb1

- suggestion id: `html-cocos-runtime-gap-fe73aeb1`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.4837065972222222`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-821337a7

- suggestion id: `html-cocos-runtime-gap-821337a7`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.48357831790123457`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-e03fc76f

- suggestion id: `html-cocos-runtime-gap-e03fc76f`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.48357831790123457`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-22ee64ed

- suggestion id: `html-cocos-runtime-gap-22ee64ed`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.4835841049382716`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-d750538a

- suggestion id: `html-cocos-runtime-gap-d750538a`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.4836159336419753`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-4b9ad422

- suggestion id: `html-cocos-runtime-gap-4b9ad422`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.4836159336419753`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-fbc9b758

- suggestion id: `html-cocos-runtime-gap-fbc9b758`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5562827932098765`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1152,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-ff7cd1eb

- suggestion id: `html-cocos-runtime-gap-ff7cd1eb`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5562827932098765`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1152,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-4415b33e

- suggestion id: `html-cocos-runtime-gap-4415b33e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5566618441358024`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1152,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-2b5ab4ff

- suggestion id: `html-cocos-runtime-gap-2b5ab4ff`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5567134452160494`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1152,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-1890c826

- suggestion id: `html-cocos-runtime-gap-1890c826`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5567235725308642`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1024,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1088,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1152,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1216,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=1280,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-a242d342

- suggestion id: `html-cocos-runtime-gap-a242d342`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6206462191358024`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r3/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-2c4b0489

- suggestion id: `html-cocos-runtime-gap-2c4b0489`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6205878665123457`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r3/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-2c89e55e

- suggestion id: `html-cocos-runtime-gap-2c89e55e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6205661651234567`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-c9dd0154

- suggestion id: `html-cocos-runtime-gap-c9dd0154`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6205661651234567`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-4fa89be6

- suggestion id: `html-cocos-runtime-gap-4fa89be6`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6205661651234567`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-5512ea36

- suggestion id: `html-cocos-runtime-gap-5512ea36`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6205661651234567`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate-tight`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-8337ae87

- suggestion id: `html-cocos-runtime-gap-8337ae87`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6198577353395062`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate-hero-name`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-0fa2d59e

- suggestion id: `html-cocos-runtime-gap-0fa2d59e`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.5600308641975309`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=256,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=448,64,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=512,64,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate-gradient-res`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-f2d08957

- suggestion id: `html-cocos-runtime-gap-f2d08957`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6206225887345679`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-formal-geometry-20260504-r1/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。

## Entry 2026-05-04 — html-cocos-runtime-gap-1d3b057f

- suggestion id: `html-cocos-runtime-gap-1d3b057f`
- status: `candidate`
- safety: `reviewer-required`
- reviewer: `(pending)`
- source package: `Design System 3` / `ui_kits/gacha/index.html`
- screenId: `gacha-ds3`
- source hashes: `html=sha256:da0cd6c53b14fc5e164c893a0f53d2c7` / `css=sha256:40af62e125634c89c2f9b13262178782` / `tokens=sha256:5ce59139d44bcb9e980cc8ab51204985`
- before: `runtimeVsSource.score=0.6467240547839506`，threshold=`0.95`
- top offenders:
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=0,128,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=320,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=384,384,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=128,448,64,64`
  - `pixel-diff` — `unwaived-diff-bucket` — `rect=192,448,64,64`
- proposed rule: 依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。
- verification:
  - `node tools_node/compare-html-to-cocos-editor.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --editor-screenshot <png> --output artifacts/skill-test-html-to-ucuf/gacha-ds3-formal-geometry-20260504-r2/final-gate`
- impact: pending — 需 reviewer 接受後才可自動套用。
