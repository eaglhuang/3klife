#!/usr/bin/env node
// doc_id: doc_other_0009 — dom-to-ui-json self-test
// 用法： node tools_node/test/dom-to-ui-self-test.js
//
// 驗證 phase 2 之核心能力：
//   1. 嵌套 children 正確（panel→[image,label]）
//   2. lazySlot 後代資產被推到 deferred
//   3. label-style auto-fill outlineColor / outlineWidth
//   4. --validate 串接 validate-ui-specs.js
//   5. --sync-existing preserve-human 保留人手欄位
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { PNG } = require('pngjs');
const { buildDraftFromHtml } = require('../lib/dom-to-ui/draft-builder');
const { smartMerge } = require('../lib/dom-to-ui/smart-merge');
const { buildSyncReport } = require('../lib/dom-to-ui/sidecar-emitters');
const { snapshotToSlots } = require('../lib/dom-to-ui/snapshot-to-slots');
const { resolveSourcePackage, writeHtmlWithSourceCss } = require('../lib/html-to-ucuf/source-package');
const { runRuleGuard } = require('../lib/html-to-ucuf/rule-guard');
const { validateArtAuthorityWaivers } = require('../lib/dom-to-ui/art-authority-waivers');
const { buildReadinessReport } = require('../lib/dom-to-ui/readiness-gate');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', 'gacha-banner.html');
const INTERACTION_FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', 'interaction-motion.html');
const VISUAL_RICH_FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', 'visual-rich.html');
const HTML_TO_UCUF_FIXTURE_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'html-to-ucuf');
const CLI = path.join(REPO_ROOT, 'tools_node', 'dom-to-ui-json.js');
const COMPARE_CLI = path.join(REPO_ROOT, 'tools_node', 'dom-to-ui-compare.js');
const FEEDBACK_CLI = path.join(REPO_ROOT, 'tools_node', 'dom-to-ui-feedback.js');
const LOGIC_GUARD_CLI = path.join(REPO_ROOT, 'tools_node', 'dom-to-ui-logic-guard.js');
const SCAFFOLD_CLI = path.join(REPO_ROOT, 'tools_node', 'scaffold-ui-component.js');
const HTML_COCOS_COMPARE_CLI = path.join(REPO_ROOT, 'tools_node', 'compare-html-to-cocos-editor.js');
const HTML_TO_UCUF_WORKFLOW_CLI = path.join(REPO_ROOT, 'tools_node', 'run-html-to-ucuf-workflow.js');
const TEST_RUNTIME_BUTTON_ASSET = 'sprites/ui_families/general_detail/tab_active_button';

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[ok] ${msg}`);
}

function sha256File(filePath) {
  return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function run(args, env) {
  const hasFidelityIntent = args.some(a => [
    '--no-css-coverage', '--strict-coverage', '--coverage-baseline',
    '--no-token-suggestions', '--strict-tokens', '--no-image-waivers', '--manual-waivers', '--browser',
  ].includes(a));
  const finalArgs = hasFidelityIntent
    ? args
    : [...args, '--no-css-coverage', '--no-token-suggestions', '--no-image-waivers'];
  const proc = spawnSync(process.execPath, [CLI, ...finalArgs], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, env || {}),
  });
  return proc;
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dom-to-ui-selftest-'));
  try { return fn(dir); } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

function collectRuntimeSpecArtifacts(screenId) {
  const base = path.join(REPO_ROOT, 'assets', 'resources', 'ui-spec');
  const screensDir = path.join(base, 'screens');
  return [
    path.join(base, 'layouts', `${screenId}.json`),
    path.join(base, 'layouts', `${screenId}.layout.json`),
    path.join(base, 'skins', `${screenId}.skin.json`),
    path.join(screensDir, `${screenId}.json`),
    path.join(screensDir, `${screenId}.screen.json`),
    path.join(screensDir, `${screenId}.preload.json`),
    path.join(screensDir, `${screenId}.performance.json`),
    path.join(screensDir, `${screenId}.composite.json`),
    path.join(screensDir, `${screenId}.bundle-suggestion.json`),
    path.join(screensDir, `${screenId}.interaction.json`),
    path.join(screensDir, `${screenId}.motion.json`),
    path.join(screensDir, `${screenId}.fragment-routes.json`),
    path.join(screensDir, `${screenId}.tab-routing.json`),
    path.join(screensDir, `${screenId}.logic-inventory.json`),
    path.join(screensDir, `${screenId}.logic-guard.json`),
    path.join(screensDir, `${screenId}.r-guard.json`),
    path.join(screensDir, `${screenId}.visual-review.json`),
    path.join(screensDir, `${screenId}.readiness.json`),
    path.join(screensDir, `${screenId}.runtime-version.json`),
  ];
}

function backupFiles(filePaths) {
  return filePaths.map((filePath) => ({
    filePath,
    existed: fs.existsSync(filePath),
    content: fs.existsSync(filePath) ? fs.readFileSync(filePath) : null,
  }));
}

function restoreFiles(backups) {
  for (const entry of backups || []) {
    if (!entry || !entry.filePath) continue;
    if (entry.existed) {
      fs.writeFileSync(entry.filePath, entry.content);
      continue;
    }
    if (fs.existsSync(entry.filePath)) {
      fs.rmSync(entry.filePath, { force: true });
    }
  }
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  const group = getArgValue('--group');
  if (group === 'html-to-ucuf-active-contract') {
    runHtmlToUcufActiveContractGroup();
    console.log('\nALL PASS');
    return;
  }
  if (group === 'html-to-ucuf-fidelity-contract') {
    runHtmlToUcufFidelityContractGroup();
    console.log('\nALL PASS');
    return;
  }

  if (!fs.existsSync(FIXTURE)) fail(`fixture missing: ${FIXTURE}`);

  {
    const parsed = buildDraftFromHtml(`
      <html><body>
        <button style="width:96px;height:96px;border-radius:50%;background:#111;border:3px solid #d4af37;">Go</button>
      </body></html>
    `, {
      screenId: 'percent-radius-self-test',
      bundle: 'ui_common',
    });
    const slots = parsed && parsed.skinDraft && parsed.skinDraft.slots ? parsed.skinDraft.slots : {};
    const buttonSlot = Object.values(slots).find((slot) => slot && typeof slot.cornerRadius === 'number');
    if (!buttonSlot || buttonSlot.cornerRadius !== 48) {
      fail(`percent border-radius should normalize to 48, got ${JSON.stringify(buttonSlot)}`);
    }
    ok('50% border-radius normalizes to numeric cornerRadius');
  }

  withTempDir((tmp) => {
    const layout = path.join(tmp, 'out.layout.json');
    const skin = path.join(tmp, 'out.skin.json');

    // 1. base run with preload + perf
    let p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test',
      '--bundle', 'ui_gacha',
      '--emit-preload-manifest',
      '--emit-performance-report',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`base run exit=${p.status}\n${p.stderr}`);
    ok('base run');

    const layoutObj = JSON.parse(fs.readFileSync(layout, 'utf8'));
    const skinObj = JSON.parse(fs.readFileSync(skin, 'utf8'));

    const fragmentRoutesPath = layout.replace(/\.layout\.json$/, '.layout.fragment-routes.json');
    if (!fs.existsSync(fragmentRoutesPath)) fail('fragment route patch sidecar not produced');
    const fragmentRoutes = JSON.parse(fs.readFileSync(fragmentRoutesPath, 'utf8'));
    if (fragmentRoutes.summary.lazySlotCount < 2) fail('fragment route patch did not include lazy slots');
    ok('fragment route patch sidecar includes lazy slots');

    // 2. nesting: must contain a panel containing an image + a label
    const panel = findNode(layoutObj, n => n.type === 'panel');
    if (!panel) fail('expected a panel node from .banner');
    const hasImage = (panel.children || []).some(c => c.type === 'image');
    const hasLabel = (panel.children || []).some(c => c.type === 'label');
    if (!hasImage || !hasLabel) fail('panel must contain image + label children');
    ok('nested children panel→[image,label]');

    // 3. lazy slot preserved + has defaultFragment + warmupHint
    const lazy = collectNodes(layoutObj, n => n.lazySlot === true);
    if (lazy.length < 2) fail(`expected >=2 lazy slots, got ${lazy.length}`);
    for (const l of lazy) {
      if (!l.defaultFragment) fail(`lazy slot ${l.name} missing defaultFragment`);
      if (!l.warmupHint) fail(`lazy slot ${l.name} missing warmupHint`);
    }
    ok('lazy slots with defaultFragment + warmupHint');

    // 4. label-style auto-fill
    const labelNode = findNode(layoutObj, n => n.type === 'label');
    const styleSlot = labelNode && labelNode.styleSlot && skinObj.slots[labelNode.styleSlot];
    if (!styleSlot) fail('label styleSlot missing');
    if (styleSlot.outlineColor !== 'colorOutlineDark') fail(`outlineColor expected colorOutlineDark, got ${styleSlot.outlineColor}`);
    if (styleSlot.outlineWidth !== 2) fail(`outlineWidth expected 2, got ${styleSlot.outlineWidth}`);
    ok('label-style outline auto-fill (UCUF §37.2)');

    // 5. preload manifest split correctness
    const preloadPath = path.join(path.dirname(layout), 'screens', 'out.layout.preload.json');
    const preloadAlt = layout.replace(/\.layout\.json$/, '.layout.preload.json');
    const usedPreload = fs.existsSync(preloadPath) ? preloadPath : preloadAlt;
    if (!fs.existsSync(usedPreload)) fail('preload manifest not produced');
    const preload = JSON.parse(fs.readFileSync(usedPreload, 'utf8'));
    if (!preload.firstScreen || !preload.deferred) fail('preload missing firstScreen/deferred');
    if (!Array.isArray(preload.deferred.lazySlots) || preload.deferred.lazySlots.length < 2) {
      fail(`deferred.lazySlots count = ${preload.deferred.lazySlots && preload.deferred.lazySlots.length}`);
    }
    ok('preload manifest splits firstScreen vs deferred');

    const perfPath = layout.replace(/\.layout\.json$/, '.layout.performance.json');
    if (!fs.existsSync(perfPath)) fail('performance report not produced');
    const perf = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
    if (!perf.runtimeGate || !perf.runtimeGate.nodeCount || !perf.runtimeGate.maxDepth) fail('performance runtimeGate missing nodeCount/maxDepth');
    ok('performance runtimeGate includes nodeCount + maxDepth');

    // 6. --validate runs validate-ui-specs.js
    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test',
      '--bundle', 'ui_gacha',
      '--validate',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`--validate exit=${p.status}\n${p.stderr}`);
    ok('--validate hooked validate-ui-specs.js (exit 0)');

    // 7. sync-existing preserve-human keeps manual edits
    const layoutBefore = JSON.parse(fs.readFileSync(layout, 'utf8'));
    const targetPanel = findNode(layoutBefore, n => n.type === 'panel');
    targetPanel._humanNote = 'manual';
    const targetImage = findNode(targetPanel, n => n.type === 'image');
    targetImage.width = 12345;
    fs.writeFileSync(layout, JSON.stringify(layoutBefore, null, 2), 'utf8');

    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test',
      '--bundle', 'ui_gacha',
      '--sync-existing',
      '--merge-mode', 'preserve-human',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`--sync-existing exit=${p.status}\n${p.stderr}`);

    const layoutAfter = JSON.parse(fs.readFileSync(layout, 'utf8'));
    const skinAfter = JSON.parse(fs.readFileSync(skin, 'utf8'));
    const panelAfter = findNode(layoutAfter, n => n.type === 'panel');
    const imageAfter = findNode(panelAfter, n => n.type === 'image');
    if (panelAfter._humanNote !== 'manual') fail('preserve-human dropped _humanNote');
    if (imageAfter.width !== 12345) fail(`preserve-human dropped width override (got ${imageAfter.width})`);
    if (skinAfter.id !== skinObj.id) fail(`preserve-human dropped skin id (got ${skinAfter.id})`);
    ok('--sync-existing preserve-human kept manual edits');

    const widgetMerge = smartMerge(
      { type: 'image', name: 'Hero', widget: { left: 284, bottom: 0 }, width: 540 },
      { type: 'image', name: 'Hero', widget: { bottom: 0 }, height: '90%' },
      { id: 'skin-draft', slots: {} },
      { id: 'skin-existing', slots: {} },
      { mergeMode: 'preserve-human' },
    );
    if (!widgetMerge.layout.widget || widgetMerge.layout.widget.left !== 284 || widgetMerge.layout.widget.bottom !== 0) {
      fail(`preserve-human widget subfield merge failed: ${JSON.stringify(widgetMerge.layout.widget)}`);
    }
    if (widgetMerge.layout.height !== '90%' || widgetMerge.layout.width !== 540) {
      fail(`preserve-human widget merge should preserve existing height and add missing width: ${JSON.stringify(widgetMerge.layout)}`);
    }
    ok('--sync-existing preserve-human merges missing widget subfields');

    const wrappedRootMerge = smartMerge(
      { id: 'wrapped', root: { type: 'container', name: 'Root', children: [{ type: 'image', name: 'Hero', widget: { left: 12 }, width: 100 }] } },
      { id: 'wrapped', root: { type: 'container', name: 'Root', children: [{ type: 'image', name: 'Hero', widget: { bottom: 0 }, height: 80 }] } },
      { id: 'skin-draft', slots: {} },
      { id: 'skin-existing', slots: {} },
      { mergeMode: 'preserve-human' },
    );
    const wrappedHero = findNode(wrappedRootMerge.layout.root, n => n.name === 'Hero');
    if (!wrappedHero || wrappedHero.width !== 100 || wrappedHero.height !== 80 || wrappedHero.widget.left !== 12 || wrappedHero.widget.bottom !== 0) {
      fail(`preserve-human wrapped root merge failed: ${JSON.stringify(wrappedRootMerge.layout)}`);
    }
    ok('--sync-existing preserve-human recurses into wrapped layout root');

    const placeholderPromotion = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { Panel: { kind: 'color-rect', color: 'backgroundDeep', opacity: 0.8 } } },
      { id: 'skin-existing', slots: { Panel: { kind: 'color-rect', color: 'unmappedColor', opacity: 1 } } },
      { mergeMode: 'preserve-human' },
    );
    const promotedSlot = placeholderPromotion.skin.slots.Panel;
    if (!promotedSlot || promotedSlot.color !== 'backgroundDeep' || promotedSlot.opacity !== 0.8) {
      fail('preserve-human did not promote unmappedColor placeholder to resolved draft color');
    }
    ok('--sync-existing preserve-human promotes unmappedColor placeholders');

    const gradientSlotPromotion = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { 'auto.gradient.panel': { kind: 'gradient-rect', gradient: { type: 'linear', angle: 90, stops: [{ color: '#111111', offset: 0 }, { color: '#222222', offset: 1 }] } } } },
      { id: 'skin-existing', slots: { 'auto.gradient.panel': { kind: 'color-rect', color: 'backgroundDeep', opacity: 1, borderColor: 'secondary', borderWidth: 2, cornerRadius: 8 } } },
      { mergeMode: 'preserve-human' },
    );
    const promotedGradient = gradientSlotPromotion.skin.slots['auto.gradient.panel'];
    if (!promotedGradient || promotedGradient.kind !== 'gradient-rect' || promotedGradient.gradient.angle !== 90) {
      fail(`preserve-human did not promote safe auto color slot to gradient-rect: ${JSON.stringify(promotedGradient)}`);
    }
    if (promotedGradient.borderWidth !== 2 || promotedGradient.cornerRadius !== 8) fail(`gradient promotion should preserve border fields: ${JSON.stringify(promotedGradient)}`);
    ok('--sync-existing preserve-human promotes safe auto color slots to gradient-rect');

    const existingAssetPath = 'sprites/ui_families/general_detail/generated/general_detail_bg_v5_civil';
    const assetPreserve = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { 'auto.asset.panel': { kind: 'gradient-rect', gradient: { type: 'linear', angle: 90, stops: [{ color: '#111111', offset: 0 }, { color: '#222222', offset: 1 }] } } } },
      { id: 'skin-existing', slots: { 'auto.asset.panel': { kind: 'sprite-frame', path: existingAssetPath, expectedWidth: 827, expectedHeight: 750 } } },
      { mergeMode: 'html-authoritative' },
    );
    const preservedAsset = assetPreserve.skin.slots['auto.asset.panel'];
    if (!preservedAsset || preservedAsset.kind !== 'sprite-frame' || preservedAsset.path !== existingAssetPath) {
      fail(`html-authoritative should not overwrite existing runtime sprite asset with generated gradient/color slot: ${JSON.stringify(preservedAsset)}`);
    }
    if (preservedAsset.color !== undefined || preservedAsset.opacity !== undefined || preservedAsset.gradient !== undefined) {
      fail(`preserved runtime sprite should not inherit generated draft paint fields: ${JSON.stringify(preservedAsset)}`);
    }
    if (!assetPreserve.fieldChanges.some(change => change.kind === 'existing-runtime-asset-preserved')) {
      fail('asset preservation must be recorded in sync fieldChanges');
    }
    const assetReplace = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { 'auto.asset.panel': { kind: 'color-rect', color: 'backgroundDeep', assetPolicy: 'replace-existing' } } },
      { id: 'skin-existing', slots: { 'auto.asset.panel': { kind: 'sprite-frame', path: existingAssetPath } } },
      { mergeMode: 'html-authoritative' },
    );
    const replacedAsset = assetReplace.skin.slots['auto.asset.panel'];
    if (!replacedAsset || replacedAsset.kind !== 'color-rect' || replacedAsset.color !== 'backgroundDeep') {
      fail(`explicit assetPolicy=replace-existing should allow replacing existing asset: ${JSON.stringify(replacedAsset)}`);
    }
    if (!assetReplace.fieldChanges.some(change => change.kind === 'explicit-runtime-asset-replace-approved')) {
      fail('explicit runtime asset replacement must be recorded in sync fieldChanges');
    }
    const assetAuditReport = buildSyncReport('asset-audit-test', 'html-authoritative', { type: 'container', name: 'Root' }, { type: 'container', name: 'Root' }, {
      fieldChanges: assetPreserve.fieldChanges.concat(assetReplace.fieldChanges),
      conflicts: [],
    });
    if (!assetAuditReport.assetReplacementAudit || assetAuditReport.assetReplacementAudit.summary.preservedRuntimeAssetCount < 1) {
      fail('sync-report assetReplacementAudit must list preserved runtime assets');
    }
    if (assetAuditReport.assetReplacementAudit.summary.explicitReplaceApprovalCount < 1) {
      fail('sync-report assetReplacementAudit must list explicit replace approvals');
    }
    ok('--sync-existing html-authoritative preserves existing runtime sprite assets unless replacement is explicit');

    const tabButtonAssetPath = TEST_RUNTIME_BUTTON_ASSET;
    const tabButtonSkinPreserve = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { 'detail.tab.formal': { kind: 'gradient-rect', gradient: { type: 'linear', angle: 180, stops: [{ color: '#111111', offset: 0 }, { color: '#222222', offset: 1 }] } } } },
      { id: 'skin-existing', slots: { 'detail.tab.formal': { kind: 'button-skin', normal: tabButtonAssetPath, pressed: tabButtonAssetPath, disabled: tabButtonAssetPath, selected: 'sprites/ui_families/general_detail/detail_tab_active_frame', spriteType: 'simple', allowAutoAtlas: true } } },
      { mergeMode: 'html-authoritative' },
    );
    const preservedTabButton = tabButtonSkinPreserve.skin.slots['detail.tab.formal'];
    if (!preservedTabButton || preservedTabButton.kind !== 'button-skin' || preservedTabButton.normal !== tabButtonAssetPath) {
      fail(`html-authoritative should preserve existing formal button-skin assets: ${JSON.stringify(preservedTabButton)}`);
    }
    if (preservedTabButton.gradient !== undefined) {
      fail(`preserved formal button-skin should not inherit generated gradient fields: ${JSON.stringify(preservedTabButton)}`);
    }
    if (!tabButtonSkinPreserve.fieldChanges.some(change => change.path === 'skin.slots.detail.tab.formal' && change.kind === 'existing-runtime-asset-preserved')) {
      fail('formal button-skin preservation must be recorded in sync fieldChanges');
    }
    const tabButtonReplace = smartMerge(
      { type: 'container', name: 'Root' },
      { type: 'container', name: 'Root' },
      { id: 'skin-draft', slots: { 'detail.tab.formal': { kind: 'color-rect', color: 'backgroundDeep', assetPolicy: 'replace-existing' } } },
      { id: 'skin-existing', slots: { 'detail.tab.formal': { kind: 'button-skin', normal: tabButtonAssetPath, pressed: tabButtonAssetPath, disabled: tabButtonAssetPath } } },
      { mergeMode: 'html-authoritative' },
    );
    const replacedTabButton = tabButtonReplace.skin.slots['detail.tab.formal'];
    if (!replacedTabButton || replacedTabButton.kind !== 'color-rect' || replacedTabButton.color !== 'backgroundDeep') {
      fail(`explicit assetPolicy=replace-existing should allow replacing formal button-skin assets: ${JSON.stringify(replacedTabButton)}`);
    }
    ok('--sync-existing html-authoritative preserves formal button-skin assets unless replacement is explicit');

    const pseudoCleanup = smartMerge(
      { type: 'container', name: 'Root', children: [] },
      { type: 'container', name: 'Root', children: [{ type: 'panel', name: 'Root_PseudoAfter', _cssPseudo: 'after', skinSlot: 'auto.cleanup.root_pseudoafter' }] },
      { id: 'skin-draft', slots: {} },
      { id: 'skin-existing', slots: { 'auto.cleanup.root_pseudoafter': { kind: 'gradient-rect', gradient: { type: 'linear', angle: 90, stops: [{ color: '#000000', offset: 0 }, { color: '#ffffff', offset: 1 }] } } } },
      { mergeMode: 'preserve-human' },
    );
    if ((pseudoCleanup.layout.children || []).some(n => n && n._cssPseudo)) fail(`generated pseudo node should be removed when absent from draft: ${JSON.stringify(pseudoCleanup.layout)}`);
    if (pseudoCleanup.skin.slots['auto.cleanup.root_pseudoafter']) fail('generated pseudo slot should be removed when absent from draft');
    ok('--sync-existing preserve-human removes stale generated pseudo overlays');

    const effectCleanup = smartMerge(
      { type: 'container', name: 'Root', children: [] },
      { type: 'container', name: 'Root', children: [{ type: 'panel', name: 'Root_CssShadow', _cssEffect: 'shadow', skinSlot: 'auto.cleanup.root_cssshadow' }] },
      { id: 'skin-draft', slots: {} },
      { id: 'skin-existing', slots: { 'auto.cleanup.root_cssshadow': { kind: 'shadow-set', boxShadows: [{ x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.4)' }] } } },
      { mergeMode: 'preserve-human' },
    );
    if ((effectCleanup.layout.children || []).some(childNode => childNode && childNode._cssEffect)) fail(`generated css effect node should be removed when absent from draft: ${JSON.stringify(effectCleanup.layout)}`);
    if (effectCleanup.skin.slots['auto.cleanup.root_cssshadow']) fail('generated css effect slot should be removed when absent from draft');
    ok('--sync-existing preserve-human removes stale generated CSS effect layers');

    // 8. dry-run does not write files
    const probeMtime = fs.statSync(layout).mtimeMs;
    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test',
      '--bundle', 'ui_gacha',
      '--sync-existing',
      '--merge-mode', 'dry-run',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`dry-run exit=${p.status}\n${p.stderr}`);
    const afterMtime = fs.statSync(layout).mtimeMs;
    if (afterMtime !== probeMtime) fail('dry-run modified the layout file');
    ok('--merge-mode dry-run does not write files');

    // 9. M2 art-director guards: token reverse lookup + visual risk warnings
    const artHtml = `
      <style>
        .card {
          display: flex;
          gap: var(--spacing-md);
          padding: 8px 12px;
          background: var(--surface-parchment-base);
          overflow: hidden;
          transform: translateX(4px);
          z-index: 3;
          border-radius: 8px 16px;
          opacity: .8;
          box-shadow: 0 4px 8px rgba(0,0,0,.4);
        }
        .title {
          color: var(--text-primary);
          font-size: 18px;
          line-height: 26px;
          font-weight: 700;
          letter-spacing: .05em;
        }
      </style>
      <div class="card" data-name="ArtCard">
        <span class="title" data-name="ArtTitle">測試標題</span>
        <img data-name="DbSprite" src="db://assets/foo.png" />
        <img data-name="AbsoluteSprite" src="C:\\bad\\asset.png" />
      </div>`;
    const artDraft = buildDraftFromHtml(artHtml, { screenId: 'art-m2', bundle: 'ui_gacha' });
    const artSkin = artDraft.skinDraft;
    const artLayout = artDraft.layoutDraft;
    const artPanel = findNode(artLayout, n => n.name === 'ArtCard');
    const artLabel = findNode(artLayout, n => n.name === 'ArtTitle');
    const artPanelSlot = artPanel && artPanel.skinSlot && artSkin.slots[artPanel.skinSlot];
    const artLabelSlot = artLabel && artLabel.styleSlot && artSkin.slots[artLabel.styleSlot];
    if (!artPanelSlot || artPanelSlot.color !== 'surface.parchment.base') fail(`CSS var color token not mapped: ${artPanelSlot && artPanelSlot.color}`);
    if (!artPanel.layout || artPanel.layout.spacingX !== 12 || artPanel.layout.paddingTop !== 8 || artPanel.layout.paddingLeft !== 12) {
      fail(`spacing / padding mapping failed: ${JSON.stringify(artPanel && artPanel.layout)}`);
    }
    if (!artLabelSlot || artLabelSlot.color !== 'textPrimary') fail(`label CSS var color not mapped: ${artLabelSlot && artLabelSlot.color}`);
    if (!artLabelSlot.isBold) fail('font-weight 700 did not map to isBold');
    if (!artLabelSlot.style) fail('typography scale reverse lookup did not set label-style.style');
    const codes = artDraft.warnings.map(w => w.code);
    for (const code of [
      'asset-path-guarded',
      'css-transform-manual-layout-risk',
      'overflow-hidden-clipping-risk',
      'z-index-manual-zorder-risk',
      'asymmetric-border-radius-approximated',
      'node-opacity-washes-children-risk',
      'css-effect-needs-art-review',
    ]) {
      if (!codes.includes(code)) fail(`expected art warning: ${code}\n${JSON.stringify(artDraft.warnings, null, 2)}`);
    }
    const tokenUsage = artSkin.meta && artSkin.meta.tokenUsageReport;
    if (!tokenUsage || !tokenUsage.spacing.some(t => t.token === 'spacing.md')) fail('spacing token usage report missing spacing.md');
    if (!tokenUsage.typography.some(t => /^typography\./.test(t.token))) fail('typography token usage report missing');
    ok('M2 art token mapping + visual guard warnings');

    const gradientHtml = `
      <div data-name="GradientStage">
        <div data-name="GradientPanel" style="width:100px;height:50px;background-image:linear-gradient(90deg, rgb(10, 20, 30) 0%, rgba(40, 50, 60, 0.5) 100%)"></div>
      </div>`;
    const gradientDraft = buildDraftFromHtml(gradientHtml, { screenId: 'gradient-rect', bundle: 'ui_test' });
    const gradientPanel = findNode(gradientDraft.layoutDraft, n => n.name === 'GradientPanel');
    const gradientSlot = gradientPanel && gradientPanel.skinSlot && gradientDraft.skinDraft.slots[gradientPanel.skinSlot];
    if (!gradientSlot || gradientSlot.kind !== 'gradient-rect') fail(`linear-gradient should map to gradient-rect: ${JSON.stringify(gradientSlot)}`);
    if (gradientSlot.gradient.angle !== 90 || gradientSlot.gradient.stops.length !== 2) fail(`gradient-rect payload malformed: ${JSON.stringify(gradientSlot)}`);
    if (gradientSlot.gradient.stops[1].opacity !== 0.5) fail(`gradient rgba alpha should become stop opacity: ${JSON.stringify(gradientSlot)}`);
    ok('linear-gradient maps to reusable gradient-rect skin slot');

    const repeatingGradientDraft = buildDraftFromHtml(`
      <div data-name="RepeatingStage">
        <div data-name="RepeatingPanel" style="width:100px;height:50px;background-image:repeating-linear-gradient(45deg, rgb(30, 16, 40), rgb(30, 16, 40) 6px, rgb(37, 24, 51) 6px, rgb(37, 24, 51) 12px)"></div>
      </div>`, { screenId: 'repeating-gradient-rect', bundle: 'ui_test' });
    const repeatingPanel = findNode(repeatingGradientDraft.layoutDraft, n => n.name === 'RepeatingPanel');
    const repeatingSlot = repeatingPanel && repeatingPanel.skinSlot && repeatingGradientDraft.skinDraft.slots[repeatingPanel.skinSlot];
    if (!repeatingSlot || repeatingSlot.kind !== 'gradient-rect' || repeatingSlot.gradient.repeating !== true) {
      fail(`repeating-linear-gradient should preserve top-level gradient.repeating: ${JSON.stringify(repeatingSlot)}`);
    }
    if (repeatingSlot.gradient.repeatSpanPx !== 12) {
      fail(`repeating-linear-gradient should preserve repeatSpanPx=12: ${JSON.stringify(repeatingSlot)}`);
    }
    if (repeatingSlot.gradient.stops[1]?.offset !== 0.5 || repeatingSlot.gradient.stops[2]?.offset !== 0.5) {
      fail(`repeating-linear-gradient should normalize px stops into repeat span offsets: ${JSON.stringify(repeatingSlot)}`);
    }
    if (!repeatingSlot.backgroundLayers || !repeatingSlot.backgroundLayers[0]?.gradient?.repeating) {
      fail(`repeating-linear-gradient should preserve backgroundLayers repeating metadata: ${JSON.stringify(repeatingSlot)}`);
    }
    if (repeatingSlot.backgroundLayers[0]?.gradient?.repeatSpanPx !== 12) {
      fail(`repeating-linear-gradient should preserve backgroundLayers repeatSpanPx=12: ${JSON.stringify(repeatingSlot)}`);
    }
    ok('repeating-linear-gradient preserves repeat span metadata for runtime rendering');

    const absoluteBlockFlowDraft = buildDraftFromHtml(`
      <style>
        .caption-stack { position:absolute; left:10px; bottom:20px; }
        .chip { margin-bottom:12px; }
        .subtitle { margin-top:10px; }
      </style>
      <div data-name="AbsoluteStage" style="width:300px;height:200px;position:relative">
        <div data-name="CaptionStack" class="caption-stack">
          <div data-name="CaptionChip" class="chip">Chip</div>
          <div data-name="CaptionTitle">Title</div>
          <div data-name="CaptionSubtitle" class="subtitle">Subtitle</div>
        </div>
      </div>`, { screenId: 'absolute-block-flow', bundle: 'ui_test' });
    const captionStack = findNode(absoluteBlockFlowDraft.layoutDraft, n => n.name === 'CaptionStack');
    if (!captionStack || !captionStack.layout || captionStack.layout.type !== 'vertical') {
      fail(`position:absolute container should preserve normal-flow child vertical layout: ${JSON.stringify(captionStack)}`);
    }
    if (captionStack.layout.spacingY !== 12) {
      fail(`absolute block flow should infer child margin spacing, got ${JSON.stringify(captionStack.layout)}`);
    }
    ok('positioned block containers preserve internal normal-flow vertical layout');

    const compoundSelectorDraft = buildDraftFromHtml(`
      <style>
        .slide { width: 100px; height: 50px; }
        .dot { width: 10px; height: 10px; }
        .slide.active { opacity: 1; }
        .dot.active { background: #D4AF37; }
      </style>
      <div data-name="CompoundStage">
        <div data-name="Slide" class="slide active"></div>
        <div data-name="Dot" class="dot active"></div>
      </div>`, { screenId: 'compound-selector', bundle: 'ui_test' });
    const compoundSlide = findNode(compoundSelectorDraft.layoutDraft, n => n.name === 'Slide');
    const compoundDot = findNode(compoundSelectorDraft.layoutDraft, n => n.name === 'Dot');
    if (!compoundSlide || compoundSlide.skinSlot || compoundSlide.type === 'panel') {
      fail(`compound selector .dot.active should not leak background into .slide.active: ${JSON.stringify(compoundSlide)}`);
    }
    const compoundDotSlot = compoundDot && compoundDot.skinSlot && compoundSelectorDraft.skinDraft.slots[compoundDot.skinSlot];
    if (!compoundDotSlot || compoundDotSlot.kind !== 'color-rect') {
      fail(`compound selector .dot.active should still apply to matching element: ${JSON.stringify({ compoundDot, compoundDotSlot })}`);
    }
    ok('compound class selectors require all classes before applying declarations');

    const opacityHiddenDraft = buildDraftFromHtml(`
      <div data-name="OpacityStage">
        <div data-name="InactiveOverlay" style="position:absolute;inset:0;width:100px;height:50px;opacity:0;background:#16061f"></div>
      </div>`, { screenId: 'opacity-hidden', bundle: 'ui_test' });
    const inactiveOverlay = findNode(opacityHiddenDraft.layoutDraft, n => n.name === 'InactiveOverlay');
    if (!inactiveOverlay || inactiveOverlay.opacity !== 0 || inactiveOverlay.active !== false) {
      fail(`opacity:0 node should be inactive by default while preserving opacity metadata: ${JSON.stringify(inactiveOverlay)}`);
    }
    if (!opacityHiddenDraft.warnings.some(w => w.code === 'css-opacity-zero-default-inactive')) {
      fail(`opacity:0 inactive warning missing: ${JSON.stringify(opacityHiddenDraft.warnings)}`);
    }
    ok('opacity:0 nodes default to inactive for initial HTML parity');

    const lazyHostShellDraft = buildDraftFromHtml(`
      <div data-name="LazyShell" data-ucuf-tab-content style="width:300px;height:200px;background:linear-gradient(180deg,#16061f 0%,#0f0509 100%);border-left:1px solid rgba(156,39,176,.12)">
        <div data-name="ActiveTabPayload">Active</div>
      </div>`, { screenId: 'lazy-host-shell', bundle: 'ui_test' });
    const lazyHostShell = findNode(lazyHostShellDraft.layoutDraft, n => n.name === 'LazyShell');
    if (!lazyHostShell || lazyHostShell.lazySlot !== true) fail(`data-ucuf-tab-content should map to lazySlot: ${JSON.stringify(lazyHostShell)}`);
    if ((lazyHostShell.children || []).length > 0) fail(`lazySlot host should defer active children to per-tab fragments: ${JSON.stringify(lazyHostShell)}`);
    const lazyHostSlot = lazyHostShell.skinSlot && lazyHostShellDraft.skinDraft.slots[lazyHostShell.skinSlot];
    if (!lazyHostSlot || lazyHostSlot.kind !== 'gradient-rect') fail(`lazySlot host shell should preserve gradient skin: ${JSON.stringify(lazyHostSlot)}`);
    ok('data-ucuf-tab-content lazySlot host preserves its shell skin');

    const pseudoHtml = `
      <div data-name="PseudoRoot">
        <div data-name="PseudoStage" data-ucuf-capture-id="1" style="width:100px;height:50px"></div>
      </div>`;
    const pseudoDraft = buildDraftFromHtml(pseudoHtml, {
      screenId: 'pseudo-overlay',
      bundle: 'ui_test',
      useComputedStyle: true,
      fidelitySnapshots: [
        { id: 1, parentId: 0, styles: { _rect: { x: 0, y: 0, w: 100, h: 50 }, 'background-color': 'rgba(0, 0, 0, 0)' }, pseudo: null },
        { id: 1002, parentId: 1, styles: { 'background-image': 'linear-gradient(90deg, transparent 0%, rgba(10, 10, 10, 0.7) 100%)', 'opacity': '0.5' }, pseudo: 'after' },
      ],
    });
    const pseudoOverlay = findNode(pseudoDraft.layoutDraft, n => n.name === 'PseudoStage_PseudoAfter');
    if (!pseudoOverlay || pseudoOverlay.type !== 'panel') fail(`pseudo ::after overlay node missing: ${JSON.stringify(pseudoDraft.layoutDraft)}`);
    if (pseudoOverlay.opacity !== 0.5) fail(`pseudo opacity should map to node opacity: ${JSON.stringify(pseudoOverlay)}`);
    const pseudoSlot = pseudoOverlay.skinSlot && pseudoDraft.skinDraft.slots[pseudoOverlay.skinSlot];
    if (!pseudoSlot || pseudoSlot.kind !== 'gradient-rect') fail(`pseudo gradient should map to gradient-rect: ${JSON.stringify(pseudoSlot)}`);
    if (pseudoSlot.gradient.stops[0].opacity !== 0) fail(`transparent gradient stop should map opacity=0: ${JSON.stringify(pseudoSlot)}`);
    ok('computed ::after pseudo overlay maps to reusable fill child skin slot');

    const shadowDraft = buildDraftFromHtml(`
      <div data-name="ShadowRoot">
        <div data-name="ShadowPanel" data-ucuf-capture-id="1" style="position:absolute;left:20px;top:30px;width:100px;height:50px"></div>
      </div>`, {
      screenId: 'shadow-effect',
      bundle: 'ui_test',
      useComputedStyle: true,
      fidelitySnapshots: [
        {
          id: 1,
          parentId: 0,
          styles: {
            _rect: { x: 20, y: 30, w: 100, h: 50 },
            'background-color': 'rgb(10, 20, 30)',
            'box-shadow': 'rgba(0, 0, 0, 0.45) 0px 6px 20px 0px',
            filter: 'drop-shadow(4px 8px 16px rgba(0, 0, 0, 0.5))',
            'border-top-left-radius': '12px',
            'border-top-right-radius': '12px',
            'border-bottom-right-radius': '12px',
            'border-bottom-left-radius': '12px',
          },
        },
      ],
    });
    const shadowChildren = shadowDraft.layoutDraft.children || [];
    const effectNode = shadowChildren.find(node => node.name === 'ShadowPanel_CssShadow');
    const targetNode = shadowChildren.find(node => node.name === 'ShadowPanel');
    if (!effectNode || !targetNode) fail(`shadow effect sibling missing: ${JSON.stringify(shadowDraft.layoutDraft)}`);
    if (shadowChildren.indexOf(effectNode) > shadowChildren.indexOf(targetNode)) fail('shadow effect sibling should be inserted before target node');
    if (effectNode.width <= targetNode.width || effectNode.height <= targetNode.height) fail(`shadow effect node should expand bounds: ${JSON.stringify(effectNode)}`);
    const shadowSlot = effectNode.skinSlot && shadowDraft.skinDraft.slots[effectNode.skinSlot];
    if (!shadowSlot || shadowSlot.kind !== 'shadow-set') fail(`shadow effect slot should be shadow-set: ${JSON.stringify(shadowSlot)}`);
    if (!shadowSlot.boxShadows || shadowSlot.boxShadows.length !== 2) fail(`box-shadow + drop-shadow should both map: ${JSON.stringify(shadowSlot)}`);
    if (!shadowSlot.padding || shadowSlot.padding.bottom <= shadowSlot.padding.top) fail(`shadow padding should reflect downward shadow: ${JSON.stringify(shadowSlot)}`);
    if (shadowSlot.cornerRadius !== 12) fail(`shadow corner radius should follow computed radius: ${JSON.stringify(shadowSlot)}`);
    ok('computed box-shadow/drop-shadow maps to reusable shadow-set effect sibling');

    // 9b. CSS-hidden overlay must not render active in runtime by default.
    const hiddenHtml = `
      <style>
        .stage { position: relative; width: 100px; height: 100px; }
        .base { background: #222; width: 100px; height: 100px; }
        .overlay { position: absolute; inset: 0; background: #000; display: none; opacity: 0; }
      </style>
      <div class="stage">
        <div class="base" data-name="BasePanel"></div>
        <div class="overlay" data-name="HiddenOverlay"></div>
      </div>`;
    const hiddenDraft = buildDraftFromHtml(hiddenHtml, { screenId: 'hidden-overlay', bundle: 'ui_test' });
    const hiddenOverlay = findNode(hiddenDraft.layoutDraft, n => n.name === 'HiddenOverlay' && n.type === 'panel');
    if (!hiddenOverlay) fail('hidden overlay node missing');
    if (hiddenOverlay.active !== false) fail(`display:none overlay should be active=false, got ${hiddenOverlay.active}`);
    if (hiddenOverlay.opacity !== 0) fail(`opacity:0 should map to node opacity=0, got ${hiddenOverlay.opacity}`);
    if (!hiddenDraft.warnings.some(w => w.code === 'css-hidden-node-default-inactive')) fail('hidden overlay warning missing');
    ok('CSS display:none / opacity hidden overlay maps to inactive runtime node');

    // 9c. CSS unitless line-height is a multiplier, not px. Cocos skin must receive px.
    const lineHeightHtml = `
      <div data-name="LineHeightStage">
        <span data-name="LineHeightOne" style="font-size:32px;line-height:1">將</span>
        <span data-name="LineHeightPercent" style="font-size:20px;line-height:150%">兵</span>
      </div>`;
    const lineHeightDraft = buildDraftFromHtml(lineHeightHtml, { screenId: 'line-height-unitless', bundle: 'ui_test' });
    const lineHeightOne = findNode(lineHeightDraft.layoutDraft, n => n.name === 'LineHeightOne');
    const lineHeightPercent = findNode(lineHeightDraft.layoutDraft, n => n.name === 'LineHeightPercent');
    const lineHeightOneSlot = lineHeightDraft.skinDraft.slots[lineHeightOne.styleSlot];
    const lineHeightPercentSlot = lineHeightDraft.skinDraft.slots[lineHeightPercent.styleSlot];
    if (lineHeightOneSlot.lineHeight !== 32) fail(`unitless line-height:1 should map to 32px, got ${lineHeightOneSlot.lineHeight}`);
    if (lineHeightPercentSlot.lineHeight !== 30) fail(`line-height:150% should map to 30px, got ${lineHeightPercentSlot.lineHeight}`);
    ok('unitless / percent line-height maps to Cocos px lineHeight');

    // 9d. v2 source package: source tokens + colors_and_type.css are explicit converter inputs.
    runSourcePackageV2Step(tmp);

    // 10. variant mode gacha-3pool metadata
    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test-variant',
      '--bundle', 'ui_gacha',
      '--variant-mode', 'gacha-3pool',
      '--emit-screen-draft',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`variant-mode exit=${p.status}\n${p.stderr}`);
    const variantLayout = JSON.parse(fs.readFileSync(layout, 'utf8'));
    if (!variantLayout.meta || !variantLayout.meta.domToUi || !variantLayout.meta.domToUi.previewVariants.includes('limited')) {
      fail('variant-mode gacha-3pool did not write previewVariants');
    }
    ok('--variant-mode gacha-3pool emits preview variants');

    // 11. M10 interaction + motion sidecars
    const behaviorLayout = path.join(tmp, 'behavior.layout.json');
    const behaviorSkin = path.join(tmp, 'behavior.skin.json');
    p = run([
      '--input', INTERACTION_FIXTURE,
      '--output', behaviorLayout,
      '--skin-output', behaviorSkin,
      '--screen-id', 'interaction-motion',
      '--bundle', 'ui_test',
      '--strict',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`interaction/motion strict exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    const interactionPath = behaviorLayout.replace(/\.layout\.json$/, '.layout.interaction.json');
    const motionPath = behaviorLayout.replace(/\.layout\.json$/, '.layout.motion.json');
    if (!fs.existsSync(interactionPath) || !fs.existsSync(motionPath)) fail('interaction / motion sidecars missing');
    const interaction = JSON.parse(fs.readFileSync(interactionPath, 'utf8'));
    const motion = JSON.parse(fs.readFileSync(motionPath, 'utf8'));
    if (!interaction.actions.some(a => a.type === 'openPanel' && a.target === 'sample-dialog')) fail('openPanel interaction not translated');
    if (!interaction.actions.some(a => a.type === 'closeModal' && a.target === 'sample-dialog')) fail('closeModal interaction not translated');
    if (motion.summary.motionCount < 1 || !motion.motionTokens.standard) fail('motion draft missing transition/keyframes or motion tokens');
    ok('interaction + motion sidecars translate button open/close and CSS motion');

    // 12. M9 logic guard inventory + verify
    const logicInventory = path.join(tmp, 'behavior.logic-inventory.json');
    const logicVerify = path.join(tmp, 'behavior.logic-guard.json');
    p = spawnSync(process.execPath, [LOGIC_GUARD_CLI,
      '--mode', 'inventory',
      '--screen-id', 'interaction-motion',
      '--layout', behaviorLayout,
      '--output', logicInventory,
    ], { encoding: 'utf8', env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }) });
    if (p.status !== 0) fail(`logic inventory exit=${p.status}\n${p.stderr}`);
    p = spawnSync(process.execPath, [LOGIC_GUARD_CLI,
      '--mode', 'verify',
      '--screen-id', 'interaction-motion',
      '--layout', behaviorLayout,
      '--baseline', logicInventory,
      '--output', logicVerify,
      '--strict',
    ], { encoding: 'utf8', env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }) });
    if (p.status !== 0) fail(`logic verify exit=${p.status}\n${p.stderr}`);
    const logicReport = JSON.parse(fs.readFileSync(logicVerify, 'utf8'));
    if (logicReport.verdict !== 'pass') fail(`logic guard verdict=${logicReport.verdict}`);
    ok('logic guard inventory + verify pass');

    // 13. scaffold-ui-component --ucuf end-to-end contract check
    p = spawnSync(process.execPath, [SCAFFOLD_CLI,
      '--screen', 'self-test-screen',
      '--ucuf',
      '--check-ucuf',
      '--dry-run',
      '--no-uiconfig',
      '--out', tmp,
    ], { encoding: 'utf8' });
    if (p.status !== 0) fail(`scaffold --ucuf check exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    ok('scaffold-ui-component --ucuf contract check');

    // 14. backup-before-overwrite: second run should create a timestamped backup (§45)
    const backupRoot = path.join(tmp, 'dom-to-ui-backups');
    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test-backup',
      '--bundle', 'ui_gacha',
      '--backup-dir', backupRoot,
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`backup run exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    // backup dir should now have a timestamped subdirectory
    if (!fs.existsSync(backupRoot)) fail('backup root dir not created');
    const backupEntries = fs.readdirSync(backupRoot);
    if (backupEntries.length === 0) fail('no backup subdirectory was created');
    const backupSubDir = path.join(backupRoot, backupEntries[0]);
    const backupFiles = fs.readdirSync(backupSubDir);
    if (!backupFiles.some(f => f.endsWith('.layout.json') || f === path.basename(layout))) {
      fail(`backup subdir ${backupSubDir} missing layout backup; found: ${backupFiles.join(', ')}`);
    }
    // verify --no-backup suppresses backup creation
    const backupRoot2 = path.join(tmp, 'dom-to-ui-backups-skip');
    p = run([
      '--input', FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'self-test-backup-skip',
      '--bundle', 'ui_gacha',
      '--no-backup',
      '--backup-dir', backupRoot2,
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`--no-backup run exit=${p.status}`);
    if (fs.existsSync(backupRoot2)) fail('--no-backup should not create backup dir');
    ok('backup-before-overwrite: timestamped backup created; --no-backup suppresses it');
  });

  // 15. Accuracy harness baseline (§40)
  runAccuracyStep();
  runAdditionalAccuracyBaselines();

  // 16-22. M13-M20 fidelity sidecars and feedback loop (§47-§54)
  runFidelitySteps();

  console.log('\nALL PASS');
}

function runSourcePackageV2Step(tmp) {
  const sourceDir = path.join(tmp, 'v2-source-package');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'ui-design-tokens.json'), JSON.stringify({
    colors: { brandPrimary: '#336699', textPrimary: '#f8f8f8' },
    spacing: { md: 12 },
    typography: { body: { fontSize: 16, lineHeight: 24 } },
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(sourceDir, 'colors_and_type.css'), `
:root { --brand-primary: #336699; --text-primary: #f8f8f8; --spacing-md: 12px; }
html, body { margin: 0; width: 64px; height: 64px; overflow: hidden; background: var(--brand-primary); }
.stage { width: 64px; height: 64px; background: var(--brand-primary); color: var(--text-primary); }
`, 'utf8');
  fs.writeFileSync(path.join(sourceDir, 'index.html'), `<!doctype html>
<html><head><title>v2</title></head><body><div class="stage" data-name="Stage"></div></body></html>
`, 'utf8');

  const pkg = resolveSourcePackage({ sourceDir, mainHtml: 'index.html' });
  if (!pkg.ok) fail(`source package should validate: ${pkg.errors.join(',')}`);
  if (!pkg.tokensPath.endsWith('ui-design-tokens.json')) fail('source package did not resolve source token json');
  if (!pkg.cssPath.endsWith('colors_and_type.css')) fail('source package did not resolve colors_and_type.css');
  const preparedHtml = path.join(tmp, 'v2-source-package.prepared.html');
  writeHtmlWithSourceCss({ htmlPath: pkg.mainHtmlPath, cssPath: pkg.cssPath, outputPath: preparedHtml });
  if (!/data-ucuf-source-css/.test(fs.readFileSync(preparedHtml, 'utf8'))) fail('source CSS was not injected into converter HTML');

  const layout = path.join(tmp, 'v2-source-package.layout.json');
  const skin = path.join(tmp, 'v2-source-package.skin.json');
  const runtimeTokens = path.join(tmp, 'v2-runtime-tokens.json');
  fs.writeFileSync(runtimeTokens, JSON.stringify({ colors: { brandPrimary: '#111111' } }, null, 2), 'utf8');
  let p = run([
    '--input', preparedHtml,
    '--output', layout,
    '--skin-output', skin,
    '--screen-id', 'v2-source-package',
    '--bundle', 'ui_test',
    '--tokens-source', pkg.tokensPath,
    '--tokens-runtime', runtimeTokens,
    '--source-css', pkg.cssPath,
  ], { DOM_TO_UI_TELEMETRY: '0' });
  if (p.status !== 0) fail(`v2 source token dom-to-ui run exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
  const skinObj = JSON.parse(fs.readFileSync(skin, 'utf8'));
  if (!skinObj.meta || !skinObj.meta.tokenSources || path.resolve(skinObj.meta.tokenSources.sourcePath) !== path.resolve(pkg.tokensPath)) {
    fail('skin meta did not record source token path');
  }
  const hasBrandToken = Object.values(skinObj.slots).some(slot => slot && slot.color === 'brandPrimary');
  if (!hasBrandToken) fail('source token brandPrimary was not used by skin slot');
  const conflicts = skinObj.meta.tokenConflictReport || [];
  if (!conflicts.some(item => item.section === 'colors' && item.token === 'brandPrimary' && item.chosenSource === 'source')) {
    fail('source token conflict report did not record brandPrimary source override');
  }
  ok('v2 source package validates, injects CSS, and maps source tokens');

  // R-6 (general rule): CSS custom property declarations must not pollute the
  // unsupported bucket or top offenders. Test the classifier directly so the
  // guarantee covers every UI source that uses design-system tokens.
  {
    const { classifyCssProperty, buildCssCapabilityReport } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));
    if (classifyCssProperty('--accent-gold', '#D4AF37') !== 'token-declaration') {
      fail('R-6 classifier should classify --accent-gold as token-declaration');
    }
    if (classifyCssProperty('--bg', '#0F0F0F') !== 'token-declaration') {
      fail('R-6 classifier should classify --bg as token-declaration');
    }
    if (classifyCssProperty('color', '#fff') !== 'supported') {
      fail('R-6 classifier regression: real properties must remain supported');
    }
    const report = buildCssCapabilityReport(':root{--accent-gold:#D4AF37;--bg:#000;}body{color:#fff;background:linear-gradient(red,blue);}');
    if ((report.summary.unsupported || 0) !== 0) {
      fail(`R-6 token declarations leaked into unsupported summary: ${report.summary.unsupported}`);
    }
    if ((report.summary.tokenDeclaration || 0) < 2) {
      fail(`R-6 tokenDeclaration summary missing: ${report.summary.tokenDeclaration}`);
    }
    if (report.topOffenders.some(item => String(item.property).startsWith('--'))) {
      fail('R-6 topOffenders must exclude CSS custom property declarations');
    }
    ok('R-6 css custom property declarations classified as token-declaration (not unsupported)');

    // R-7 (general rule): CSS comments must be stripped before scanning so that
    // documentation comments (e.g. `/* SOURCE: ... */`, `/* spec 1920x1080 */`)
    // do not leak as fake `source` / `spec` properties in top offenders.
    const commentReport = buildCssCapabilityReport('/* SOURCE: design-handoff/source/tokens.json */\n/* spec 1920x1080 native */\nbody{color:#fff;}');
    if (commentReport.topOffenders.some(item => ['source', 'spec'].includes(item.property))) {
      fail(`R-7 css comments leaked into topOffenders: ${commentReport.topOffenders.map(i => i.property).join(',')}`);
    }
    ok('R-7 css comments do not leak as fake property declarations');

    // R-8 (general rule): `background` must be classified by value. Plain solid
    // color or `var(--token)` resolves to a color-rect → `supported`; only
    // gradient / url / multi-layer values are `assetize`. Without this rule
    // every design-system UI using `background: var(--bg)` triggers a false
    // assetize warning.
    if (classifyCssProperty('background', '#0F0F0F') !== 'supported') {
      fail('R-8 plain background color must classify as supported');
    }
    if (classifyCssProperty('background', 'var(--bg)') !== 'supported') {
      fail('R-8 background var(...) without gradient/url must classify as supported');
    }
    if (classifyCssProperty('background', 'rgb(20,20,20)') !== 'supported') {
      fail('R-8 background rgb(...) must classify as supported');
    }
    if (classifyCssProperty('background', 'linear-gradient(red,blue)') !== 'supported') {
      fail('R-19 supersedes R-8: single-layer linear-gradient is runtime-supported (GradientBackground)');
    }
    if (classifyCssProperty('background', 'url(./bg.png)') !== 'supported') {
      fail('R-19 supersedes R-8: single-layer url() is runtime-supported (sprite-frame)');
    }
    // background-image longhand: same R-19 alignment.
    if (classifyCssProperty('background-image', 'url(./x.png)') !== 'supported') {
      fail('R-19 supersedes R-8: background-image url() is runtime-supported');
    }
    // R-19 invariant: only mixed multi-layer mixes remain assetize.
    if (classifyCssProperty('background', 'linear-gradient(red,blue), url(./bg.png)') !== 'assetize') {
      fail('R-19 mixed gradient + url multi-layer must remain assetize');
    }
    ok('R-8/R-19 background classifier: solid/gradient/url single-layer all supported; multi-layer mixes remain assetize');

    // R-9 (general rule): `text-transform` is applied offline at convert time
    // because Cocos Label has no runtime equivalent. Test the helper directly
    // so every UI source going through draft-builder is covered.
    const { applyTextTransformGeneral } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'draft-builder.js'));
    if (applyTextTransformGeneral('Tab Overview', 'uppercase') !== 'TAB OVERVIEW') {
      fail(`R-9 uppercase failed: ${applyTextTransformGeneral('Tab Overview', 'uppercase')}`);
    }
    if (applyTextTransformGeneral('Hello World', 'lowercase') !== 'hello world') {
      fail('R-9 lowercase failed');
    }
    if (applyTextTransformGeneral('hello world', 'capitalize') !== 'Hello World') {
      fail('R-9 capitalize failed');
    }
    if (applyTextTransformGeneral('張飛', 'uppercase') !== '張飛') {
      fail('R-9 uppercase must leave CJK unchanged');
    }
    if (applyTextTransformGeneral('preserved', 'none') !== 'preserved') {
      fail('R-9 none must pass through');
    }
    if (applyTextTransformGeneral('preserved', '') !== 'preserved') {
      fail('R-9 empty transform must pass through');
    }
    if (applyTextTransformGeneral('preserved', undefined) !== 'preserved') {
      fail('R-9 undefined transform must pass through');
    }
    ok('R-9 text-transform applied offline (uppercase/lowercase/capitalize), CJK and none preserved');
  }

  // R-10: font-family stack 必須走 registry-based 解析。converter 不能把整個
  // stack 都打成同一份字型資產（舊 pickFontByTag 寫死回 newsreader）。任何走
  // v2 source-package flow 的 UI 都應該照 stack 順序找到第一個有資產的 family。
  {
    const { resolveFontFamilyToAsset, PROJECT_FONT_REGISTRY, PROJECT_FONT_DEFAULT } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'draft-builder.js'));
    if (!Array.isArray(PROJECT_FONT_REGISTRY) || PROJECT_FONT_REGISTRY.length < 4) {
      fail('R-10 PROJECT_FONT_REGISTRY must be exported and non-trivial');
    }
    // 具名專案字型優先
    if (resolveFontFamilyToAsset('"Newsreader", "NotoSansTC", "Songti TC", "STSong", serif') !== 'fonts/newsreader/font') {
      fail('R-10 headline stack must resolve to newsreader');
    }
    if (resolveFontFamilyToAsset('"NotoSansTC", "PingFang TC", "Microsoft JhengHei", sans-serif') !== 'fonts/notosans_tc/font') {
      fail('R-10 body stack must resolve to notosans_tc');
    }
    if (resolveFontFamilyToAsset('"Manrope", "NotoSansTC", system-ui, sans-serif') !== 'fonts/manrope/font') {
      fail('R-10 label stack must resolve to manrope (Latin first)');
    }
    if (resolveFontFamilyToAsset('"Manrope", "Newsreader", serif') !== 'fonts/manrope/font') {
      fail('R-10 num stack must resolve to manrope');
    }
    // System CJK aliases 落到 notosans_tc
    if (resolveFontFamilyToAsset('"PingFang TC"') !== 'fonts/notosans_tc/font') {
      fail('R-10 PingFang TC alias must resolve to notosans_tc');
    }
    // Generic fallback
    if (resolveFontFamilyToAsset('serif') !== 'fonts/newsreader/font') {
      fail('R-10 generic serif must resolve to newsreader');
    }
    if (resolveFontFamilyToAsset('sans-serif') !== 'fonts/notosans_tc/font') {
      fail('R-10 generic sans-serif must resolve to notosans_tc');
    }
    // 完全未知 → default（CJK-safe）
    if (resolveFontFamilyToAsset('"Comic Sans Whatever"') !== PROJECT_FONT_DEFAULT) {
      fail('R-10 unknown family must fall back to PROJECT_FONT_DEFAULT');
    }
    if (resolveFontFamilyToAsset('') !== PROJECT_FONT_DEFAULT) {
      fail('R-10 empty value must fall back to PROJECT_FONT_DEFAULT');
    }
    if (resolveFontFamilyToAsset(undefined) !== PROJECT_FONT_DEFAULT) {
      fail('R-10 undefined must fall back to PROJECT_FONT_DEFAULT');
    }
    // 自訂 registry 仍可覆寫（保證資料導向）
    const customAsset = resolveFontFamilyToAsset('CustomFont', [{ match: /^customfont$/i, asset: 'fonts/custom/font' }], 'fonts/notosans_tc/font');
    if (customAsset !== 'fonts/custom/font') {
      fail('R-10 custom registry must take effect');
    }
    ok('R-10 font-family stack resolves via registry; first project-font match wins; CJK-safe fallback');
  }

  // R-11: text-shadow → native Cocos Label shadow API. Single non-inset shadow
  // must parse offline; multi-layer / inset must return null so the capability
  // matrix can route them to assetize.
  {
    const { parseSimpleTextShadow } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'draft-builder.js'));
    const { classifyCssProperty } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));
    if (typeof parseSimpleTextShadow !== 'function') fail('R-11 parseSimpleTextShadow must be exported');
    const a = parseSimpleTextShadow('1px 2px 3px rgba(0,0,0,0.5)');
    if (!a || a.offsetX !== 1 || a.offsetY !== 2 || a.blur !== 3 || a.color !== '#00000080') fail('R-11 X Y B color form must parse to hex8');
    const b = parseSimpleTextShadow('rgba(0,0,0,0.6) 0 1px 0');
    if (!b || b.offsetX !== 0 || b.offsetY !== 1 || b.blur !== 0 || b.color !== '#00000099') fail('R-11 color-leading form must parse to hex8');
    const c = parseSimpleTextShadow('2px 4px #000');
    if (!c || c.offsetX !== 2 || c.offsetY !== 4 || c.blur !== 0 || c.color !== '#000000FF') fail('R-11 hex without blur must normalize to hex8');
    if (parseSimpleTextShadow('none') !== null) fail('R-11 none must return null');
    if (parseSimpleTextShadow('') !== null) fail('R-11 empty must return null');
    if (parseSimpleTextShadow('1px 1px 0 #000, 2px 2px 0 #fff') !== null) fail('R-11 multi-layer must return null');
    if (classifyCssProperty('text-shadow', '1px 2px 3px rgba(0,0,0,0.5)') !== 'supported') fail('R-11 single shadow must classify supported');
    if (classifyCssProperty('text-shadow', '1px 1px 0 #000, 2px 2px 0 #fff') !== 'partial-supported') fail('R-11+R-23 multi-layer text-shadow must classify partial-supported');
    if (classifyCssProperty('text-shadow', 'inset 1px 1px 0 #000') !== 'assetize') fail('R-11 inset must classify assetize');
    if (classifyCssProperty('text-shadow', 'none') !== 'supported') fail('R-11 none must classify supported');
    ok('R-11 text-shadow parses offline; single shadow supported; multi-layer/inset routed to assetize');
  }

  // R-12: @font-face → font asset registry. Source CSS declaring custom fonts
  // via @font-face must (a) NOT pollute the capability gap report with `src`
  // / `font-family` / `font-weight` rows, (b) surface a fontFaceMappings
  // structured list, and (c) extend the converter font registry per
  // conversion so the new family resolves without code change.
  {
    const { classifyCssProperty, buildCssCapabilityReport, extractFontFaceMappings } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));
    const { buildFontFaceRegistry, resolveFontAssetByConvention, resolveFontFamilyToAsset, PROJECT_FONT_DEFAULT } = require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'draft-builder.js'));
    const css = `
      @font-face {
        font-family: "Manrope";
        src: url("../fonts/Manrope-Variable.woff2") format("woff2-variations"),
             url("../fonts/Manrope-Variable.woff") format("woff");
        font-weight: 100 900;
        font-display: swap;
      }
      @font-face { font-family: 'Newsreader'; src: url('../fonts/Newsreader.ttf'); }
      body { font-family: 'Manrope', sans-serif; color: #fff; }
    `;
    const report = buildCssCapabilityReport(css);
    if (!Array.isArray(report.fontFaceMappings) || report.fontFaceMappings.length !== 2) fail('R-12 must extract 2 font-face mappings');
    if (report.fontFaceMappings[0].family !== 'Manrope') fail('R-12 family parsed');
    if (!report.fontFaceMappings[0].srcs || report.fontFaceMappings[0].srcs.length !== 2) fail('R-12 must capture all url() sources');
    if (report.summary.unsupported !== 0) fail('R-12 @font-face inner declarations must NOT count as unsupported, got ' + report.summary.unsupported);
    if (report.summary.fontFaceDeclaration < 1) fail('R-12 fontFaceDeclaration summary must be >= 1');
    if (report.topOffenders.some(o => o.property === 'src' || o.property === '@font-face')) fail('R-12 top offenders must not include src / @font-face');

    // Direct extractor: must handle quoted/unquoted families and missing src.
    const direct = extractFontFaceMappings('@font-face{font-family:Foo;src:url(./foo.ttf);}');
    if (direct.length !== 1 || direct[0].family !== 'Foo' || direct[0].src !== './foo.ttf') fail('R-12 unquoted family + url must parse');
    const noSrc = extractFontFaceMappings('@font-face{font-family:"BareBoned";}');
    if (noSrc.length !== 1 || noSrc[0].family !== 'BareBoned' || noSrc[0].src !== null) fail('R-12 missing src must yield null src, not throw');

    // Convention resolver
    if (resolveFontAssetByConvention('NotoSansTC') !== 'fonts/notosans_tc/font') fail('R-12 convention resolver must prefer registered project font assets');
    if (resolveFontAssetByConvention('Manrope', './x.ttf') !== 'fonts/manrope/font') fail('R-12 convention resolver simple case');
    if (resolveFontAssetByConvention('') !== null) fail('R-12 empty family must resolve null');

    // Built registry layering: source @font-face entry must take precedence
    // over PROJECT_FONT_REGISTRY for the declared family, and fall through to
    // defaults for unrelated stacks.
    const sheets = ['@font-face{font-family:"BrandX";src:url(./brandx.woff);}'];
    const reg = buildFontFaceRegistry(sheets);
    if (reg.length !== 1 || reg[0].asset !== 'fonts/brandx/font') fail('R-12 buildFontFaceRegistry default convention');
    const layered = reg.concat(require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'draft-builder.js')).PROJECT_FONT_REGISTRY);
    if (resolveFontFamilyToAsset('"BrandX", sans-serif', layered, PROJECT_FONT_DEFAULT) !== 'fonts/brandx/font') fail('R-12 layered registry resolves @font-face family first');
    if (resolveFontFamilyToAsset('"Newsreader", serif', layered, PROJECT_FONT_DEFAULT) !== 'fonts/newsreader/font') fail('R-12 layered registry must still resolve project fonts when not declared');

    // Custom resolver override
    const reg2 = buildFontFaceRegistry(sheets, (family) => `custom/${family}/font`);
    if (reg2[0].asset !== 'custom/BrandX/font') fail('R-12 customResolver override must take effect');

    ok('R-12 @font-face mappings extract; classifier excludes from unsupported; per-conversion registry layers ahead of project defaults');
  }

  // R-13: declaration-block extraction (selector text must not leak as fake
  // properties) + value-aware `border` shorthand classification. Both rules
  // are generic for every UI flow, not specific to character-ds3-main.
  {
    const { buildCssCapabilityReport, classifyCssProperty, extractDeclarationBlocks } =
      require(path.join(REPO_ROOT, 'tools_node/lib/dom-to-ui/css-capability-matrix.js'));

    // (a) Selector text with pseudo-classes / pseudo-elements / nested at-rules
    // must produce zero phantom properties. Without R-13, `.cell:last-child`
    // would leak property=`cell` value=`last-child`; `a:hover` leaks
    // property=`a`; `div::before` leaks property=`div`.
    const selectorCss = [
      '.cell:last-child { color: #fff; }',
      'a:hover { color: red; }',
      'div::before { content: ""; }',
      '@media (min-width: 600px) { .x:focus { opacity: 0.5; } }',
    ].join('\n');
    const r1 = buildCssCapabilityReport(selectorCss);
    const phantomProps = r1.items.filter(i => ['cell', 'a', 'div', 'x'].includes(i.property));
    if (phantomProps.length > 0) {
      fail('R-13 declaration-block extraction must reject selector-leak phantoms; found: ' +
        phantomProps.map(p => p.property).join(','));
    }
    // Real declarations from inside `{ ... }` must still be classified.
    if (!r1.items.some(i => i.property === 'color')) fail('R-13 must still classify real `color` declaration inside selector blocks');
    if (!r1.items.some(i => i.property === 'opacity')) fail('R-13 must still classify declarations inside @media nested blocks');
    if (!r1.items.some(i => i.property === 'content')) fail('R-13 must still classify `content` declaration inside ::before block');

    // (b) `extractDeclarationBlocks` is a pure helper; verify it joins leaf
    // bodies with `;` and ignores wrapper text.
    const decls = extractDeclarationBlocks('.foo { a: 1; b: 2; } .bar { c: 3; }');
    if (!/a: 1/.test(decls) || !/c: 3/.test(decls)) fail('R-13 extractDeclarationBlocks must include leaf body text');
    if (/\.foo|\.bar/.test(decls)) fail('R-13 extractDeclarationBlocks must exclude selector text');

    // (c) Nested at-rule (`@media { ... { ... } }`): only inner leaf body
    // should be extracted, not the wrapper.
    const nested = extractDeclarationBlocks('@media print { .p { d: 4; } }');
    if (!/d: 4/.test(nested)) fail('R-13 must extract inner leaf body from nested at-rule');

    // (d) value-aware `border` shorthand:
    if (classifyCssProperty('border', '1px solid #fff') !== 'supported') fail('R-13 simple solid border must be supported');
    if (classifyCssProperty('border', '2px solid rgba(212,175,55,.28)') !== 'supported') fail('R-13 solid border with rgba color must be supported');
    if (classifyCssProperty('border', 'none') !== 'supported') fail('R-13 `border: none` must be supported');
    if (classifyCssProperty('border', '0') !== 'supported') fail('R-13 `border: 0` must be supported');
    if (classifyCssProperty('border', '1px dashed #888') !== 'assetize') fail('R-13 dashed border must be assetize');
    if (classifyCssProperty('border', '2px dotted red') !== 'assetize') fail('R-13 dotted border must be assetize');
    if (classifyCssProperty('border', '3px double black') !== 'assetize') fail('R-13 double border must be assetize');

    // (e) `text-transform` is consumed by the R-9 converter (text content is
    // baked); it is NOT a render-time gap and must not be classified
    // unsupported.
    if (classifyCssProperty('text-transform', 'uppercase') !== 'supported') fail('R-13 text-transform must be classified supported (R-9 converter consumes it)');

    ok('R-13 declaration-block structural extraction rejects selector-leak phantoms; value-aware border shorthand; text-transform reclassified supported');
  }

  // R-14: value-aware `box-shadow` / `drop-shadow` classification. The repo
  // ships a ShadowBackground component that natively renders any number of
  // non-inset shadow layers; only `inset` truly needs sidecar bake. Generic
  // for every UI flow.
  {
    const { classifyCssProperty } = require(path.join(REPO_ROOT, 'tools_node/lib/dom-to-ui/css-capability-matrix.js'));
    if (classifyCssProperty('box-shadow', 'none') !== 'supported') fail('R-14 box-shadow none must be supported');
    if (classifyCssProperty('box-shadow', '0 4px 8px rgba(0,0,0,.3)') !== 'supported') fail('R-14 single non-inset box-shadow must be supported (ShadowBackground renders it)');
    if (classifyCssProperty('box-shadow', '0 4px 8px rgba(0,0,0,.3), 0 2px 4px rgba(0,0,0,.5)') !== 'supported') fail('R-14 multi-layer non-inset box-shadow must be supported (ShadowBackground accepts shadow array)');
    if (classifyCssProperty('box-shadow', 'inset 0 2px 4px rgba(0,0,0,.5)') !== 'assetize') fail('R-14 inset box-shadow must be assetize (sidecar bake, R-15)');
    // R-22 supersedes the old R-14 mixed expectation: mixed inset+outer is
    // now `partial-supported` (runtime ShadowBackground renders the outer
    // half today; only the inset half needs R-15 bake).
    if (classifyCssProperty('box-shadow', '0 4px 8px rgba(0,0,0,.3), inset 0 2px 4px rgba(0,0,0,.5)') !== 'partial-supported') fail('R-14+R-22 mixed inset+outer must be partial-supported');
    if (classifyCssProperty('drop-shadow', '0 2px 4px rgba(0,0,0,.5)') !== 'supported') fail('R-14 drop-shadow simple must be supported');
    ok('R-14 box-shadow / drop-shadow value-aware: non-inset routes to ShadowBackground (supported); inset routes to sidecar bake (assetize)');
  }

  // R-16: non-render-time bucket separation (motion-only / interaction-only)
  // + value-aware `transform` + positioning `inset` shorthand + side-shorthand
  // border + `box-sizing` no-op. All generic for any UI flow.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.join(REPO_ROOT, 'tools_node/lib/dom-to-ui/css-capability-matrix.js'));

    // (a) motion-only bucket
    if (classifyCssProperty('transition', 'all 200ms') !== 'motion-only') fail('R-16 transition must be motion-only');
    if (classifyCssProperty('transition-property', 'opacity') !== 'motion-only') fail('R-16 transition-property must be motion-only');
    if (classifyCssProperty('animation', 'spin 1s linear infinite') !== 'motion-only') fail('R-16 animation must be motion-only');
    if (classifyCssProperty('animation-delay', '200ms') !== 'motion-only') fail('R-16 animation-delay must be motion-only');
    if (classifyCssProperty('will-change', 'transform') !== 'motion-only') fail('R-16 will-change must be motion-only');

    // (b) interaction-only bucket
    if (classifyCssProperty('cursor', 'pointer') !== 'interaction-only') fail('R-16 cursor must be interaction-only');
    if (classifyCssProperty('pointer-events', 'none') !== 'interaction-only') fail('R-16 pointer-events must be interaction-only');
    if (classifyCssProperty('user-select', 'none') !== 'interaction-only') fail('R-16 user-select must be interaction-only');
    if (classifyCssProperty('scrollbar-width', 'thin') !== 'interaction-only') fail('R-16 scrollbar-width must be interaction-only');
    if (classifyCssProperty('-webkit-scrollbar-thumb', 'red') !== 'interaction-only') fail('R-16 -webkit-scrollbar-* must be interaction-only');

    // (c) value-aware transform
    if (classifyCssProperty('transform', 'none') !== 'supported') fail('R-16 transform: none must be supported');
    if (classifyCssProperty('transform', 'translateX(-50%)') !== 'supported') fail('R-16 translateX absorbed by widget => supported');
    if (classifyCssProperty('transform', 'translate(10px, 20px)') !== 'supported') fail('R-16 translate must be supported');
    if (classifyCssProperty('transform', 'scale(1.06)') !== 'supported') fail('R-16 scale absorbed by sprite scale => supported');
    if (classifyCssProperty('transform', 'translateY(-50%) scale(1.06)') !== 'supported') fail('R-16 combined translate+scale must be supported');
    if (classifyCssProperty('transform', 'rotate(45deg)') !== 'supported') fail('R-16 2D rotate absorbed by node angle => supported');
    if (classifyCssProperty('transform', 'rotate3d(1,1,0,30deg)') !== 'unsupported') fail('R-16 rotate3d must be unsupported');
    if (classifyCssProperty('transform', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)') !== 'unsupported') fail('R-16 matrix3d must be unsupported');
    if (classifyCssProperty('transform', 'skew(10deg)') !== 'unsupported') fail('R-16 skew must be unsupported');

    // (d) `inset` positioning shorthand absorbed by Cocos Widget
    if (classifyCssProperty('inset', '0') !== 'supported') fail('R-16 `inset: 0` (Widget anchor) must be supported');
    if (classifyCssProperty('inset-block', '10px') !== 'supported') fail('R-16 inset-block must be supported');

    // (e) side-shorthand border value-aware (companion of R-13)
    if (classifyCssProperty('border-bottom', '1px solid #fff') !== 'supported') fail('R-16 border-bottom solid must be supported');
    if (classifyCssProperty('border-top', 'none') !== 'supported') fail('R-16 border-top none must be supported');
    if (classifyCssProperty('border-left', '2px dashed #888') !== 'assetize') fail('R-16 border-left dashed must be assetize');

    // (f) box-sizing no-op
    if (classifyCssProperty('box-sizing', 'border-box') !== 'supported') fail('R-16 box-sizing border-box must be supported');

    // (g) summary report adds new buckets and excludes them from topOffenders
    const css = '.x { transition: all 200ms; cursor: pointer; transform: translateX(-50%); }';
    const r = buildCssCapabilityReport(css);
    if (r.summary.motionOnly !== 1) fail('R-16 summary.motionOnly must count transition');
    if (r.summary.interactionOnly !== 1) fail('R-16 summary.interactionOnly must count cursor');
    if (r.topOffenders.some(o => o.capability === 'motion-only' || o.capability === 'interaction-only')) {
      fail('R-16 motion-only / interaction-only must NOT appear in topOffenders');
    }

    ok('R-16 motion-only / interaction-only buckets; value-aware transform & side-border; inset positioning & box-sizing as supported; non-render-time properties never pollute topOffenders');
  }

  // R-17: value-aware classification of every property previously hard-classified
  // as `unsupported`. Mirrors R-8 / R-11 / R-13 / R-14 / R-16 (shorthand value-
  // aware): classifier MUST inspect VALUE for renderable special cases (`none`,
  // `normal`, empty pseudo `""`, axis-aligned simple shapes, native blend modes)
  // before falling back to unsupported. Generic for every UI: `clip-path: none`,
  // `filter: none`, `content: ""`, `mix-blend-mode: multiply`, etc. all have
  // trivially renderable special forms.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // (a) `content` value-aware: empty/none/normal -> supported decorative slot;
    //     non-empty marker text / counter() / attr() / url() -> assetize.
    if (classifyCssProperty('content', '""') !== 'supported') fail('R-17 content: "" must be supported');
    if (classifyCssProperty('content', "''") !== 'supported') fail("R-17 content: '' must be supported");
    if (classifyCssProperty('content', 'none') !== 'supported') fail('R-17 content: none must be supported');
    if (classifyCssProperty('content', 'normal') !== 'supported') fail('R-17 content: normal must be supported');
    if (classifyCssProperty('content', '"★"') !== 'assetize') fail('R-17 content with marker text must be assetize');
    if (classifyCssProperty('content', 'counter(section)') !== 'assetize') fail('R-17 content: counter() must be assetize');
    if (classifyCssProperty('content', 'attr(data-label)') !== 'assetize') fail('R-17 content: attr() must be assetize');

    // (b) `clip-path` value-aware: none -> supported; inset()/circle()/ellipse()
    //     -> supported (Cocos Mask); polygon with 4 points -> supported (rect-
    //     like); path()/url()/complex polygon -> assetize.
    if (classifyCssProperty('clip-path', 'none') !== 'supported') fail('R-17 clip-path: none must be supported');
    if (classifyCssProperty('clip-path', 'inset(10px 20px)') !== 'supported') fail('R-17 clip-path: inset() must be supported');
    if (classifyCssProperty('clip-path', 'circle(50%)') !== 'supported') fail('R-17 clip-path: circle() must be supported');
    if (classifyCssProperty('clip-path', 'ellipse(50% 25%)') !== 'supported') fail('R-17 clip-path: ellipse() must be supported');
    if (classifyCssProperty('clip-path', 'polygon(0 0, 100% 0, 100% 100%, 0 100%)') !== 'supported') fail('R-17 clip-path: 4-pt polygon must be supported');
    if (classifyCssProperty('-webkit-clip-path', 'polygon(0 0, 100% 0, 100% 100%, 0 100%)') !== 'supported') fail('R-17 -webkit-clip-path alias must match clip-path');
    if (classifyCssProperty('clip-path', 'polygon(0 0, 50% 0, 100% 50%, 50% 100%, 0 50%)') !== 'assetize') fail('R-17 clip-path: complex polygon must be assetize');
    if (classifyCssProperty('clip-path', 'path("M 0,0 L 100,0 ...")') !== 'assetize') fail('R-17 clip-path: path() must be assetize');
    if (classifyCssProperty('clip-path', 'url(#mask)') !== 'assetize') fail('R-17 clip-path: url() must be assetize');

    // (c) `filter` / `backdrop-filter` value-aware: none -> supported;
    //     drop-shadow() -> supported (R-14 sibling); blur/brightness/etc -> assetize.
    if (classifyCssProperty('filter', 'none') !== 'supported') fail('R-17 filter: none must be supported');
    if (classifyCssProperty('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,.3))') !== 'supported') fail('R-17 filter: drop-shadow() must be supported');
    if (classifyCssProperty('filter', 'blur(8px)') !== 'assetize') fail('R-17 filter: blur() must be assetize');
    if (classifyCssProperty('filter', 'brightness(1.1)') !== 'assetize') fail('R-17 filter: brightness() must be assetize');
    if (classifyCssProperty('backdrop-filter', 'none') !== 'supported') fail('R-17 backdrop-filter: none must be supported');
    if (classifyCssProperty('backdrop-filter', 'blur(20px)') !== 'assetize') fail('R-17 backdrop-filter: blur() must be assetize');

    // (d) `mask` / `mask-image` value-aware: none -> supported; gradient/url -> assetize.
    if (classifyCssProperty('mask', 'none') !== 'supported') fail('R-17 mask: none must be supported');
    if (classifyCssProperty('mask-image', 'none') !== 'supported') fail('R-17 mask-image: none must be supported');
    if (classifyCssProperty('-webkit-mask-image', 'none') !== 'supported') fail('R-17 -webkit-mask-image alias must match mask-image');
    if (classifyCssProperty('mask-image', 'linear-gradient(black, transparent)') !== 'assetize') fail('R-17 mask gradient must be assetize');
    if (classifyCssProperty('mask-image', 'url(./mask.png)') !== 'assetize') fail('R-17 mask url() must be assetize');

    // (e) `mix-blend-mode` value-aware: normal + native Cocos blend modes -> supported.
    if (classifyCssProperty('mix-blend-mode', 'normal') !== 'supported') fail('R-17 mix-blend-mode: normal must be supported');
    if (classifyCssProperty('mix-blend-mode', 'multiply') !== 'supported') fail('R-17 mix-blend-mode: multiply must be supported');
    if (classifyCssProperty('mix-blend-mode', 'screen') !== 'supported') fail('R-17 mix-blend-mode: screen must be supported');
    if (classifyCssProperty('mix-blend-mode', 'overlay') !== 'supported') fail('R-17 mix-blend-mode: overlay must be supported');
    if (classifyCssProperty('mix-blend-mode', 'hue') !== 'assetize') fail('R-17 mix-blend-mode: hue must be assetize');
    if (classifyCssProperty('mix-blend-mode', 'luminosity') !== 'assetize') fail('R-17 mix-blend-mode: luminosity must be assetize');

    // (f) `transform-style` / `perspective` / `shape-outside` value-aware.
    if (classifyCssProperty('transform-style', 'flat') !== 'supported') fail('R-17 transform-style: flat must be supported');
    if (classifyCssProperty('transform-style', 'preserve-3d') !== 'unsupported') fail('R-17 transform-style: preserve-3d must be unsupported');
    if (classifyCssProperty('perspective', 'none') !== 'supported') fail('R-17 perspective: none must be supported');
    if (classifyCssProperty('perspective', '0') !== 'supported') fail('R-17 perspective: 0 must be supported');
    if (classifyCssProperty('perspective', '600px') !== 'unsupported') fail('R-17 perspective: 600px must be unsupported');
    if (classifyCssProperty('shape-outside', 'none') !== 'supported') fail('R-17 shape-outside: none must be supported');
    if (classifyCssProperty('shape-outside', 'circle(50%)') !== 'unsupported') fail('R-17 shape-outside non-none must be unsupported');

    // (g) summary: a CSS that uses only renderable special cases of these
    //     properties must produce zero unsupported entries.
    const r = buildCssCapabilityReport(
      '.x { content: ""; clip-path: none; filter: none; mask: none; mix-blend-mode: normal; transform-style: flat; perspective: none; shape-outside: none; }'
    );
    if (r.summary.unsupported !== 0) fail(`R-17 all-none property set must yield 0 unsupported, got ${r.summary.unsupported}`);
    if (r.topOffenders.length !== 0) fail(`R-17 all-none property set must yield 0 topOffenders, got ${r.topOffenders.length}`);

    ok('R-17 value-aware completion of UNSUPPORTED set: content/clip-path/filter/mask/mix-blend-mode/transform-style/perspective/shape-outside all inspect VALUE before falling back to unsupported');
  }

  // R-18: layout shorthand classification. `max-width` / `min-width` /
  // `max-height` / `min-height` / `aspect-ratio` are absorbed by Cocos
  // UITransform / Widget -> supported. CSS Grid shorthand and `place-*`
  // alignment are consumed by converter at build time (Cocos Layout) and
  // bucket as `layout-only` so they appear in summary but never in
  // topOffenders. Mirrors R-16 motion-only / interaction-only.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    if (classifyCssProperty('max-width', '320px') !== 'supported') fail('R-18 max-width must be supported');
    if (classifyCssProperty('min-width', '120px') !== 'supported') fail('R-18 min-width must be supported');
    if (classifyCssProperty('max-height', '480px') !== 'supported') fail('R-18 max-height must be supported');
    if (classifyCssProperty('min-height', '60px') !== 'supported') fail('R-18 min-height must be supported');
    if (classifyCssProperty('aspect-ratio', '16 / 9') !== 'supported') fail('R-18 aspect-ratio must be supported');

    if (classifyCssProperty('grid-template-columns', 'repeat(3, 1fr)') !== 'layout-only') fail('R-18 grid-template-columns must be layout-only');
    if (classifyCssProperty('grid-template-rows', 'auto auto') !== 'layout-only') fail('R-18 grid-template-rows must be layout-only');
    if (classifyCssProperty('grid-template-areas', '"a b" "c d"') !== 'layout-only') fail('R-18 grid-template-areas must be layout-only');
    if (classifyCssProperty('grid-area', 'header') !== 'layout-only') fail('R-18 grid-area must be layout-only');
    if (classifyCssProperty('grid-column', '1 / 3') !== 'layout-only') fail('R-18 grid-column must be layout-only');
    if (classifyCssProperty('grid-row', '1 / 2') !== 'layout-only') fail('R-18 grid-row must be layout-only');
    if (classifyCssProperty('grid-auto-flow', 'row') !== 'layout-only') fail('R-18 grid-auto-flow must be layout-only');
    if (classifyCssProperty('place-items', 'center') !== 'layout-only') fail('R-18 place-items must be layout-only');
    if (classifyCssProperty('place-content', 'space-between') !== 'layout-only') fail('R-18 place-content must be layout-only');
    if (classifyCssProperty('place-self', 'center') !== 'layout-only') fail('R-18 place-self must be layout-only');

    const r = buildCssCapabilityReport(
      '.x { max-width: 320px; aspect-ratio: 16/9; grid-template-columns: repeat(3, 1fr); place-items: center; }'
    );
    if (r.summary.unsupported !== 0) fail(`R-18 layout shorthand must yield 0 unsupported, got ${r.summary.unsupported}`);
    if (r.summary.layoutOnly !== 2) fail(`R-18 expected layoutOnly=2, got ${r.summary.layoutOnly}`);
    if (r.topOffenders.some(o => o.capability === 'layout-only')) fail('R-18 layout-only must NOT appear in topOffenders');

    ok('R-18 layout shorthand: max/min/aspect-ratio supported; grid/place-* bucketed as layout-only and excluded from topOffenders');
  }

  // R-19: classifier capability must equal runtime + converter + sidecar
  // capability sum (recursive principle from R-16 evolution2). The runtime
  // already renders `linear-gradient(...)` / `radial-gradient(...)` /
  // the parity-safe subset of `radial-gradient(...)` via `GradientBackground`
  // routed through `gradient-rect`, and renders `url(...)` via sprite-frame
  // slot. Therefore single-layer linear, simple centered radial, and url()
  // backgrounds must be `supported`, NOT `assetize`. Same for
  // `background-image` / `background-position` / `background-size` /
  // `background-repeat` longhand which are slot CONFIG. Only mixed multi-layer
  // or complex/off-center radial values genuinely need sidecar bake.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // (a) `background` value-aware reclassification: gradients & url single-
    //     layer become supported (runtime renders them); multi-layer mixes
    //     remain assetize.
    if (classifyCssProperty('background', 'linear-gradient(red, blue)') !== 'supported') fail('R-19 background linear-gradient must be supported (runtime: GradientBackground)');
    if (classifyCssProperty('background', 'radial-gradient(circle, red, blue)') !== 'supported') fail('R-19 background simple radial-gradient must be supported');
    if (classifyCssProperty('background', 'radial-gradient(circle at 50% 50%, red, blue)') !== 'supported') fail('R-19 background centered radial-gradient must be supported');
    if (classifyCssProperty('background', 'radial-gradient(circle at 40% 30%, red, blue)') !== 'assetize') fail('R-19+R-24 off-center radial-gradient must be assetize');
    if (classifyCssProperty('background', 'radial-gradient(ellipse 120% 80% at 40% 30%, red, blue)') !== 'assetize') fail('R-19+R-24 explicit-size radial-gradient must be assetize');
    if (classifyCssProperty('background', 'conic-gradient(red, blue)') !== 'assetize') fail('R-19+R-24 background conic-gradient must be assetize');
    if (classifyCssProperty('background', 'url(./bg.png)') !== 'supported') fail('R-19 background url() must be supported (runtime: sprite-frame)');
    if (classifyCssProperty('background', 'url(./bg.png) center / cover no-repeat') !== 'supported') fail('R-19 single-layer url with config must be supported');
    if (classifyCssProperty('background', 'linear-gradient(red, blue), url(./bg.png)') !== 'assetize') fail('R-19 mixed gradient + url must remain assetize');
    if (classifyCssProperty('background', 'url(./a.png), url(./b.png)') !== 'assetize') fail('R-19 multi-layer urls must remain assetize');
    if (classifyCssProperty('background', '#0F0F0F') !== 'supported') fail('R-19 regression: solid color must remain supported');

    // (b) `background-image` longhand: same rule as `background`.
    if (classifyCssProperty('background-image', 'linear-gradient(red, blue)') !== 'supported') fail('R-19 background-image linear-gradient must be supported');
    if (classifyCssProperty('background-image', 'radial-gradient(circle, red, blue)') !== 'supported') fail('R-19 background-image simple radial-gradient must be supported');
    if (classifyCssProperty('background-image', 'radial-gradient(ellipse 120% 80% at 40% 30%, red, blue)') !== 'assetize') fail('R-19+R-24 background-image explicit-size radial-gradient must be assetize');
    if (classifyCssProperty('background-image', 'url(./x.png)') !== 'supported') fail('R-19 background-image url() must be supported');
    if (classifyCssProperty('background-image', 'none') !== 'supported') fail('R-19 background-image: none must be supported');
    if (classifyCssProperty('background-image', 'linear-gradient(red, blue), url(./x.png)') !== 'assetize') fail('R-19 background-image mixed must remain assetize');

    // (c) `background-position` / `background-size` / `background-repeat`:
    //     pure config, always supported.
    if (classifyCssProperty('background-position', 'center') !== 'supported') fail('R-19 background-position must be supported');
    if (classifyCssProperty('background-size', 'cover') !== 'supported') fail('R-19 background-size must be supported');
    if (classifyCssProperty('background-repeat', 'no-repeat') !== 'supported') fail('R-19 background-repeat must be supported');

    // (d) Summary impact: a CSS that uses only single-layer gradient/url
    //     backgrounds must produce zero assetize entries.
    const r = buildCssCapabilityReport(
      '.x { background: linear-gradient(red, blue); } .y { background: radial-gradient(circle, red, blue); } .z { background-image: linear-gradient(black, white); background-size: cover; background-position: center; }'
    );
    if (r.summary.assetize !== 0) fail(`R-19 single-layer gradient/url CSS must yield 0 assetize, got ${r.summary.assetize}`);
    if (r.summary.unsupported !== 0) fail(`R-19 single-layer gradient/url CSS must yield 0 unsupported, got ${r.summary.unsupported}`);

    ok('R-19 classifier aligned with runtime: single-layer linear/simple-radial/url backgrounds + background-image/position/size/repeat all supported; only complex radial or multi-layer mixes remain assetize');
  }

  // R-20: declaration-boundary anchoring + digit-aware property names.
  // The legacy `[A-Za-z-]+` regex had two structural bugs that leaked
  // phantom properties for every UI: (1) no boundary anchor — values like
  // `--sp-2xl: 32px;` backed up and matched `xl: 32px` because the engine
  // retried after the digit `2`; (2) no digit support — CSS custom
  // properties allow digits anywhere (`--sp-2xl`, `--font-3xl`, `--col-4k`).
  // The fix anchors property names at `^` / `;` / `{` / `}` and splits the
  // pattern into custom (`--[\w-]+`) vs standard (`[A-Za-z][A-Za-z0-9-]*`).
  // Generic for any design token system using xs/sm/md/lg/xl/2xl/3xl
  // naming conventions or k-resolution markers.
  {
    const { buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // (a) Custom property with embedded digit must be classified as
    //     token-declaration (not leak `xl` as phantom unsupported).
    const r1 = buildCssCapabilityReport(':root { --sp-2xl: 32px; --font-3xl: 48px; --col-4k: 3840px; }');
    if (r1.summary.tokenDeclaration !== 3) fail(`R-20 expected 3 token-declaration entries, got ${r1.summary.tokenDeclaration}`);
    if (r1.summary.unsupported !== 0) fail(`R-20 digit tokens must NOT leak as phantom unsupported, got ${r1.summary.unsupported}`);
    if (r1.items.some(i => i.property === 'xl' || i.property === '3xl' || i.property === '4k')) {
      fail('R-20 partial-name phantoms (xl/3xl/4k) must NOT appear in items');
    }

    // (b) Boundary anchor: a value containing `:` text inside parens (e.g.
    //     `url(data:image/png;...)`) must not produce phantom properties
    //     for the embedded `image/png`. The brace-balanced extractor already
    //     guards selector text; the boundary anchor guards value text.
    const r2 = buildCssCapabilityReport('.x { background: url("data:image/png;base64,iVBORw0KGgo"); }');
    if (r2.items.some(i => i.property === 'image' || i.property === 'png')) {
      fail('R-20 URL data-scheme must NOT produce phantom image/png properties');
    }

    // (c) Standard property with digit (e.g. `padding-block-end`) — ensure
    //     digit-aware regex still accepts standard properties WITHOUT digits.
    //     Note: standard CSS property names today don't actually contain digits,
    //     but the regex tolerates them via `[A-Za-z][A-Za-z0-9-]*` for safety.
    const r3 = buildCssCapabilityReport('.y { color: red; padding: 8px; --my-2xs: 2px; }');
    if (r3.summary.unsupported !== 0) fail(`R-20 standard CSS must remain clean, got ${r3.summary.unsupported}`);
    if (r3.summary.tokenDeclaration !== 1) fail(`R-20 expected 1 token-declaration, got ${r3.summary.tokenDeclaration}`);

    ok('R-20 declaration-boundary anchoring + digit-aware custom properties: --sp-2xl / --font-3xl / --col-4k tokens classified as token-declaration; no phantom xl/png/image leakage');
  }

  // R-21: nested-paren-aware multi-layer detection. CSS shorthand layer
  // splits MUST respect paren depth; a naive single-pass paren-strip
  // (`replace(/\([^()]*\)/g)`) only erases INNERMOST parens, leaving outer
  // gradient parens intact and producing fake layer counts. Generic for
  // ANY UI using gradients with rgba/hsla/var/nested function arguments.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // (a) Single linear-gradient with rgba color stops: must be supported.
    const v1 = 'linear-gradient(90deg, transparent 45%, rgba(10,10,10,.7) 75%, #0a0a0a 100%)';
    if (classifyCssProperty('background', v1) !== 'supported') fail(`R-21 single linear-gradient with rgba stops must be supported, got ${classifyCssProperty('background', v1)}`);
    if (classifyCssProperty('background-image', v1) !== 'supported') fail('R-21 background-image single linear-gradient must be supported');

    // (b) Single complex radial-gradient with multiple rgba stops: the
    //     paren-aware split still identifies it as a single layer, but the
    //     off-center / explicit-size geometry keeps it in `assetize`.
    const v2 = 'radial-gradient(ellipse at 30% 40%, rgba(139,98,42,.3), rgba(44,58,66,.25), transparent 60%)';
    if (classifyCssProperty('background', v2) !== 'assetize') fail(`R-21+R-24 single radial-gradient with rgba stops must be assetize, got ${classifyCssProperty('background', v2)}`);

    // (c) Two stacked radial-gradients: genuinely multi-layer, must be assetize.
    const v3 = 'radial-gradient(ellipse at 30% 40%, rgba(139,98,42,.3), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(44,58,66,.25), transparent 60%)';
    if (classifyCssProperty('background', v3) !== 'assetize') fail(`R-21 stacked radial-gradients must be assetize, got ${classifyCssProperty('background', v3)}`);

    // (d) Single text-shadow with rgba: supported. Two-layer text-shadow with rgba: assetize.
    const t1 = '0 0 10px rgba(0,0,0,.9)';
    const t2 = '0 0 2px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7)';
    if (classifyCssProperty('text-shadow', t1) !== 'supported') fail(`R-21 single rgba text-shadow must be supported, got ${classifyCssProperty('text-shadow', t1)}`);
    // R-23 supersedes the old R-21 expectation: multi-layer text-shadow is
    // now `partial-supported` (Cocos Label renders FIRST layer natively;
    // remaining layers need R-15 bake).
    if (classifyCssProperty('text-shadow', t2) !== 'partial-supported') fail(`R-21+R-23 two-layer rgba text-shadow must be partial-supported, got ${classifyCssProperty('text-shadow', t2)}`);

    // (e) DS3-shape regression at scanner level.
    const css = `:root { --bg-1: linear-gradient(90deg, transparent 45%, rgba(10,10,10,.7) 75%, #0a0a0a 100%); }
.a { background: linear-gradient(135deg, rgba(212,175,55,.18), rgba(138,110,31,.1)); }
.b { background: radial-gradient(ellipse at 30% 40%, rgba(1,1,1,.3), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(2,2,2,.25), transparent 60%); }`;
    const r = buildCssCapabilityReport(css);
    const bgItems = r.items.filter(i => i.property === 'background');
    const bgSupportedCount = bgItems.filter(i => i.capability === 'supported').reduce((n, i) => n + i.count, 0);
    const bgAssetizeCount = bgItems.filter(i => i.capability === 'assetize').reduce((n, i) => n + i.count, 0);
    if (bgSupportedCount !== 1) fail(`R-21 single linear-gradient with nested rgba expected 1 background-supported, got ${bgSupportedCount}`);
    if (bgAssetizeCount !== 1) fail(`R-21 stacked radial-gradients expected 1 background-assetize, got ${bgAssetizeCount}`);

    ok('R-21 nested-paren-aware multi-layer detection: single-layer gradients with rgba/hsla/var stops correctly supported; only true multi-layer mixes routed to assetize');
  }

  // R-22: partial-supported capability bucket for mixed inset+outer
  // box-shadow. Runtime ShadowBackground.setShadows() filters !shadow.inset
  // and renders outer layers, so a `inset 0 0 16px rgba(...), 0 6px 20px
  // rgba(...)` declaration is HALF-rendered today. Classifier must mirror
  // this real runtime behaviour (R-19 recursive principle). Generic for
  // any UI using "outer glow + inset highlight" shadow patterns.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // Pure outer -> supported.
    if (classifyCssProperty('box-shadow', '0 6px 20px rgba(0,0,0,.5)') !== 'supported') fail('R-22 pure outer box-shadow must be supported');
    // Pure inset -> assetize.
    if (classifyCssProperty('box-shadow', 'inset 0 0 16px rgba(212,175,55,.1)') !== 'assetize') fail('R-22 pure inset box-shadow must be assetize');
    // Mixed inset + outer -> partial-supported.
    const mix1 = 'inset 0 0 16px rgba(212,175,55,.1), 0 0 24px rgba(212,175,55,.2)';
    if (classifyCssProperty('box-shadow', mix1) !== 'partial-supported') fail(`R-22 mixed inset+outer must be partial-supported, got ${classifyCssProperty('box-shadow', mix1)}`);
    const mix2 = '0 6px 20px rgba(0,0,0,.5), inset 0 0 20px rgba(140,207,196,.15)';
    if (classifyCssProperty('box-shadow', mix2) !== 'partial-supported') fail(`R-22 mixed outer+inset must be partial-supported, got ${classifyCssProperty('box-shadow', mix2)}`);
    // All-inset multi-layer -> assetize.
    if (classifyCssProperty('box-shadow', 'inset 0 0 4px red, inset 0 0 8px blue') !== 'assetize') fail('R-22 all-inset multi-layer must be assetize');

    // Summary: partial-supported reported in summary, excluded from topOffenders.
    const css = '.a { box-shadow: inset 0 0 16px rgba(0,0,0,.1), 0 0 24px rgba(0,0,0,.2); } .b { box-shadow: 0 6px 20px rgba(0,0,0,.5); }';
    const r = buildCssCapabilityReport(css);
    if (r.summary.partialSupported !== 1) fail(`R-22 expected partialSupported 1, got ${r.summary.partialSupported}`);
    if (r.summary.supported < 1) fail(`R-22 expected supported >= 1, got ${r.summary.supported}`);
    if (r.topOffenders.some(o => o.capability === 'partial-supported')) fail('R-22 partial-supported MUST be excluded from topOffenders');

    ok('R-22 partial-supported bucket: mixed inset+outer box-shadow classified separately to mirror runtime ShadowBackground filter; outer-only fully supported, all-inset routed to assetize');
  }

  // R-23: Cocos Label exposes ONE shadow surface
  // (`enableShadow`/`shadowOffset`/`shadowBlur`/`shadowColor`). Multi-layer
  // text-shadow is therefore HALF-rendered today (Label paints first layer;
  // rest needs R-15 bake). Apply the R-22 partial-supported pattern to
  // text-shadow for the same recursive runtime-alignment principle.
  // Generic for any UI using stacked text shadows for outline / glow effects.
  {
    const { classifyCssProperty, buildCssCapabilityReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    if (classifyCssProperty('text-shadow', 'none') !== 'supported') fail('R-23 text-shadow none must be supported');
    if (classifyCssProperty('text-shadow', '0 1px 0 #000') !== 'supported') fail('R-23 single non-inset text-shadow must be supported');
    if (classifyCssProperty('text-shadow', '0 0 2px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7)') !== 'partial-supported') fail('R-23 two-layer text-shadow must be partial-supported');
    if (classifyCssProperty('text-shadow', '0 1px 0 #000, 0 0 10px rgba(0,0,0,.9), 0 0 2px #fff') !== 'partial-supported') fail('R-23 three-layer text-shadow must be partial-supported');
    if (classifyCssProperty('text-shadow', 'inset 0 0 4px red') !== 'assetize') fail('R-23 inset text-shadow (rare/CSS quirk) must be assetize');

    // Summary check: multi-layer text-shadow excluded from topOffenders.
    const css = '.a { text-shadow: 0 0 2px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7); } .b { text-shadow: 0 1px 0 #000; }';
    const r = buildCssCapabilityReport(css);
    if (r.summary.partialSupported !== 1) fail(`R-23 expected partialSupported 1, got ${r.summary.partialSupported}`);
    if (r.topOffenders.some(o => o.property === 'text-shadow')) fail('R-23 multi-layer text-shadow MUST NOT appear in topOffenders');

    ok('R-23 text-shadow partial-supported: Cocos Label single-shadow API renders first layer natively; multi-layer routes to partial-supported (same R-22 recursive runtime-alignment principle)');
  }

  // R-24: gradient-subtype accuracy fix on background / background-image.
  // Runtime parity is narrower than "all gradients": single linear and only
  // simple centered radial are considered safe. Off-center / explicit-size /
  // repeating-radial / conic still require assetization or further evidence.
  {
    const { classifyCssProperty } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-capability-matrix.js'));

    // Solid color / var / transparent / url stays supported.
    if (classifyCssProperty('background', '#0F0F0F') !== 'supported') fail('R-24 solid color background must be supported');
    if (classifyCssProperty('background', 'var(--bg)') !== 'supported') fail('R-24 var() background must be supported');
    if (classifyCssProperty('background', 'transparent') !== 'supported') fail('R-24 transparent background must be supported');
    if (classifyCssProperty('background', 'url(data:image/png;base64,xxx)') !== 'supported') fail('R-24 single url background must be supported');

    // Single linear-gradient = supported (converter renders).
    if (classifyCssProperty('background', 'linear-gradient(180deg, #000, #fff)') !== 'supported') fail('R-24 single linear-gradient background must be supported');
    if (classifyCssProperty('background-image', 'linear-gradient(90deg, transparent 45%, rgba(10,10,10,.7) 100%)') !== 'supported') fail('R-24 single linear-gradient background-image must be supported');

    // Simple centered radial = supported; complex radial = assetize.
    if (classifyCssProperty('background', 'radial-gradient(circle, #000, transparent 70%)') !== 'supported') fail('R-24 simple centered radial-gradient background must be supported');
    if (classifyCssProperty('background-image', 'radial-gradient(circle, red, blue)') !== 'supported') fail('R-24 simple centered radial-gradient background-image must be supported');
    if (classifyCssProperty('background', 'radial-gradient(ellipse 120% 80% at 40% 30%, #000, transparent 70%)') !== 'assetize') fail('R-24 explicit-size off-center radial-gradient background MUST be assetize');
    if (classifyCssProperty('background-image', 'radial-gradient(circle at 40% 30%, red, blue)') !== 'assetize') fail('R-24 off-center radial-gradient background-image MUST be assetize');

    // Repeating radial remains assetize until dedicated parity evidence exists.
    if (classifyCssProperty('background', 'repeating-radial-gradient(circle, red 0 4px, blue 4px 8px)') !== 'assetize') fail('R-24 repeating-radial background MUST be assetize');

    // Single conic-gradient = assetize.
    if (classifyCssProperty('background', 'conic-gradient(from 0deg, red, yellow, green)') !== 'assetize') fail('R-24 single conic-gradient background MUST be assetize');
    if (classifyCssProperty('background-image', 'conic-gradient(red, blue)') !== 'assetize') fail('R-24 single conic-gradient background-image MUST be assetize');

    // Multi-layer mix = assetize (unchanged from R-21).
    if (classifyCssProperty('background', 'linear-gradient(180deg,#000,#fff), url(a.png)') !== 'assetize') fail('R-24 multi-layer linear+url must remain assetize');
    if (classifyCssProperty('background', 'radial-gradient(red,blue), linear-gradient(0deg,green,yellow)') !== 'assetize') fail('R-24 multi-layer radial+linear must remain assetize');

    ok('R-24 gradient-subtype accuracy: single linear and simple centered radial stay supported; complex radial, repeating-radial, conic, and multi-layer mixes remain assetize');
  }

  // R-25/R-27: deterministic bake-manifest builder. Pure function over
  // snapshots[] produces a review list (selector + property + value + target
  // dimensions) for CSS gaps, but R-27 art-direction gating prevents blindly
  // screenshotting full UI regions. Only small nodes explicitly marked with
  // data-ucuf-bake="fragment" become autoBake entries.
  {
    const { buildBakeManifest } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'bake-manifest.js'));
    const { buildCssSkinKindContractReport } =
      require(path.resolve(__dirname, '..', 'lib', 'dom-to-ui', 'css-skin-kind-contract.js'));

    const snapshots = [
      // (a) assetize: large 3-layer background mix -> review entry, not auto-bake.
      { id: 1, tag: 'div', path: 'body > div.bg-mix', styles: {
        background: 'radial-gradient(red,blue), radial-gradient(green,yellow), linear-gradient(0deg,#000,#fff)',
        _rect: { x: 0, y: 0, w: 1334, h: 750 },
      }, pseudo: null },
      // (b) supported: single linear-gradient -> NO entry.
      { id: 2, tag: 'div', path: 'body > div.bg-linear', styles: {
        background: 'linear-gradient(180deg,#000,#fff)',
        _rect: { x: 0, y: 0, w: 100, h: 100 },
      }, pseudo: null },
      // (c) assetize + explicit fragment: small complex radial background -> auto-bake.
      { id: 8, tag: 'div', path: 'body > div.small-fragment', bakeMode: 'fragment', styles: {
        background: 'radial-gradient(ellipse 120% 80% at 40% 30%, red, blue)',
        _rect: { x: 10.25, y: 20.5, w: 48, h: 48 },
      }, pseudo: null },
      // (d) assetize: clip-path 5-point polygon -> converter geometry, not screenshot.
      { id: 3, tag: 'div', path: 'body > div.cut', styles: {
        'clip-path': 'polygon(0 0, 100% 0, 100% 86%, 91% 100%, 0 100%)',
        _rect: { x: 0, y: 0, w: 600, h: 400 },
      }, pseudo: null },
      // (e) partial-supported: mixed box-shadow -> NO entry (R-22 half-rendered).
      { id: 4, tag: 'div', path: 'body > div.mixed-shadow', styles: {
        'box-shadow': '0 6px 20px #000, inset 0 0 20px #fff',
        _rect: { x: 0, y: 0, w: 200, h: 200 },
      }, pseudo: null },
      // (f) zero-area -> filtered.
      { id: 5, tag: 'span', path: 'body > span.empty', styles: {
        background: 'radial-gradient(red,blue)',
        _rect: { x: 0, y: 0, w: 0, h: 0 },
      }, pseudo: null },
      // (g) pseudo -> skipped.
      { id: 6001, tag: 'div', path: 'body > div.x::before', styles: {
        background: 'radial-gradient(red,blue)',
        _rect: { x: 0, y: 0, w: 50, h: 50 },
      }, pseudo: 'before' },
      // (h) box-shadow pure inset + explicit fragment -> auto-bake shadow fragment.
      { id: 7, tag: 'div', path: 'body > div.inset-only', bakeMode: 'fragment', styles: {
        'box-shadow': 'inset 0 0 16px rgba(212,175,55,.2)',
        _rect: { x: 0, y: 0, w: 120, h: 60 },
      }, pseudo: null },
    ];

    const m = buildBakeManifest({ snapshots, screenId: 'test-screen', sidecarBundle: 'resources', viewport: { width: 1334, height: 750 } });

    if (m.entries.length !== 4) fail(`R-27 expected 4 review entries, got ${m.entries.length}`);
    if (!m.entries.every(e => e.capability === 'assetize')) fail('R-25 every entry must be capability=assetize');
    if (m.summary.autoBakeEntries !== 2) fail(`R-27 expected 2 autoBake entries, got ${m.summary.autoBakeEntries}`);
    if (m.summary.reviewOnlyEntries !== 2) fail(`R-27 expected 2 review-only entries, got ${m.summary.reviewOnlyEntries}`);

    // Deterministic ordering: by property name first.
    const props = m.entries.map(e => e.property);
    const sortedProps = [...props].sort();
    if (props.join(',') !== sortedProps.join(',')) fail(`R-25 entries must be sorted by property, got ${props.join(',')}`);

    // skinSlotKind routing.
    const bg = m.entries.find(e => e.property === 'background' && e.autoBake);
    if (!bg || bg.skinSlotKind !== 'background-set') fail('R-25 background must route to background-set');
    const mask = m.entries.find(e => e.property === 'clip-path');
    if (!mask || mask.skinSlotKind !== 'mask-set') fail('R-25 clip-path must route to mask-set');
    const shadow = m.entries.find(e => e.property === 'box-shadow');
    if (!shadow || shadow.skinSlotKind !== 'shadow-set') fail('R-25 box-shadow must route to shadow-set');
    if (mask.autoBake !== false || mask.bakeAction !== 'converter-geometry') fail('R-27 clip-path must be converter geometry, not auto-bake');
    const largeBg = m.entries.find(e => e.property === 'background' && e.target.width === 1334);
    if (!largeBg || largeBg.autoBake !== false || largeBg.bakeAction !== 'manual-art-asset') fail('R-27 large background must require manual art asset');

    // outputPath exists only for autoBake entries.
    if (!bg.outputPath.startsWith('assets/resources/sidecars/test-screen/')) fail(`R-25 outputPath wrong: ${bg.outputPath}`);
    if (!/\.png$/.test(bg.outputPath)) fail('R-25 outputPath must end with .png');
    if (largeBg.outputPath !== null || mask.outputPath !== null) fail('R-27 review-only entries must not get outputPath');

    // Target dimensions copied from _rect.
    if (bg.target.width !== 48 || bg.target.height !== 48 || bg.target.x !== 10.25 || bg.target.y !== 20.5) fail(`R-27 target dims wrong: ${JSON.stringify(bg.target)}`);
    if (bg.target.dpr !== 2) fail('R-25 target.dpr must default to 2');

    // Stable bakeId is deterministic w.r.t. screenId + tag + nodeId + property.
    const m2 = buildBakeManifest({ snapshots, screenId: 'test-screen', sidecarBundle: 'resources' });
    if (m.entries.map(e => e.bakeId).join('|') !== m2.entries.map(e => e.bakeId).join('|')) fail('R-25 bakeId must be deterministic across runs');

    // Summary aggregates.
    if (m.summary.totalEntries !== 4) fail(`R-25 summary.totalEntries wrong: ${m.summary.totalEntries}`);
    if (m.summary.byProperty.background !== 2) fail('R-27 byProperty.background must be 2');
    if (m.summary.bySkinSlotKind['mask-set'] !== 1) fail('R-25 bySkinSlotKind.mask-set must be 1');
    if (m.summary.byBakeAction['auto-screenshot-fragment'] !== 2) fail('R-27 auto-screenshot-fragment count must be 2');

    // Schema metadata (forward contract for R-15 puppeteer bake).
    if (!m.schemaVersion) fail('R-25 schemaVersion required');
    if (!m.bakerHint || m.bakerHint.runtimeCost !== 'zero — runtime only loads pre-baked PNGs as SpriteFrame') {
      fail('R-25 bakerHint must document zero runtime cost');
    }
    if (!m.bakerHint.autoBakeContract || !m.bakerHint.autoBakeContract.includes('data-ucuf-bake="fragment"')) {
      fail('R-27 bakerHint must document explicit fragment opt-in');
    }

    const contract = buildCssSkinKindContractReport([
      { property: 'background', value: 'linear-gradient(180deg,#000,#fff)', expectedCapability: 'supported', expectedSkinKind: 'gradient-rect' },
      { property: 'background', value: 'radial-gradient(circle, red, blue)', expectedCapability: 'supported', expectedSkinKind: 'gradient-rect' },
      { property: 'background', value: 'radial-gradient(ellipse 120% 80% at 40% 30%, red, blue)', expectedCapability: 'assetize', expectedSkinKind: 'background-set' },
      { property: 'background-image', value: 'url("panel.png")', expectedCapability: 'supported', expectedSkinKind: 'sprite-frame' },
      { property: 'box-shadow', value: '0 6px 20px #000', expectedCapability: 'supported', expectedSkinKind: 'shadow-set' },
      { property: 'box-shadow', value: 'inset 0 0 16px #fff', expectedCapability: 'assetize', expectedSkinKind: 'shadow-set' },
      { property: 'filter', value: 'brightness(1.15)', expectedCapability: 'assetize', expectedSkinKind: 'shadow-set' },
      { property: 'clip-path', value: 'polygon(0 0, 100% 0, 100% 86%, 91% 100%, 0 100%)', expectedCapability: 'assetize', expectedSkinKind: 'mask-set' },
      { property: 'clip-path', value: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', expectedCapability: 'supported', expectedSkinKind: 'mask-and-clip' },
      { property: 'mix-blend-mode', value: 'screen', expectedCapability: 'supported', expectedSkinKind: 'opacity-and-blend' },
    ]);
    if (!contract.ok) fail(`R-34 CSS capability / skin kind contract failed: ${contract.errors.join('; ')}`);

    ok('R-25/R-27/R-34 bake-manifest builder: deterministic review list emitted from snapshots; auto-bake is art-gated; CSS capability and skin-kind mapping stay aligned');
  }

  const editorBlue = path.join(tmp, 'v2-editor-blue.png');
  const editorRed = path.join(tmp, 'v2-editor-red.png');
  const editorSmallDiff = path.join(tmp, 'v2-editor-small-diff.png');
  writeSolidPng(editorBlue, 64, 64, [0x33, 0x66, 0x99, 0xff]);
  writeSolidPng(editorRed, 64, 64, [0x99, 0x22, 0x22, 0xff]);
  writeSolidPng(editorSmallDiff, 64, 64, [0x33, 0x66, 0x99, 0xff]);
  paintPngRect(editorSmallDiff, { x: 0, y: 0, w: 8, h: 8 }, [0x99, 0x22, 0x22, 0xff]);
  const compareOut = path.join(tmp, 'html-cocos-compare');
  fs.writeFileSync(path.join(sourceDir, 'v2-source-package.final-capture-protocol.json'), JSON.stringify({
    schemaVersion: '1.0.0',
    screenId: 'v2-source-package',
    viewport: { width: 64, height: 64, dpr: 1 },
    safeArea: { x: 0, y: 0, width: 64, height: 64 },
    settleMs: 0,
    threshold: 0.99,
    tolerance: 12,
    artAuthorityWaivers: null,
  }, null, 2), 'utf8');
  const evolutionLog = path.join(tmp, 'html_skill_rule-evolution2.md');
  fs.writeFileSync(evolutionLog, '# Evolution v2 Test\n', 'utf8');
  p = spawnSync(process.execPath, [HTML_COCOS_COMPARE_CLI,
    '--source-dir', sourceDir,
    '--main-html', 'index.html',
    '--screen-id', 'v2-source-package',
    '--editor-screenshot', editorBlue,
    '--output', compareOut,
    '--threshold', '0.99',
    '--evolution-log', evolutionLog,
  ], { encoding: 'utf8' });
  if (p.status !== 0) fail(`html-cocos compare pass exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
  const verdict = JSON.parse(fs.readFileSync(path.join(compareOut, 'v2-source-package.html-cocos-verdict.json'), 'utf8'));
  if (verdict.runtimeVsSource.verdict !== 'pass' || verdict.runtimeVsSource.score < 0.99) fail(`html-cocos pass verdict invalid: ${JSON.stringify(verdict.runtimeVsSource)}`);
  if (!verdict.captureProtocol || verdict.captureProtocol.viewport.width !== 64 || verdict.captureProtocol.settleMs !== 0) {
    fail(`R-33 capture protocol not applied: ${JSON.stringify(verdict.captureProtocol)}`);
  }

  const compareOutFail = path.join(tmp, 'html-cocos-compare-fail');
  p = spawnSync(process.execPath, [HTML_COCOS_COMPARE_CLI,
    '--source-dir', sourceDir,
    '--main-html', 'index.html',
    '--screen-id', 'v2-source-package-fail',
    '--editor-screenshot', editorRed,
    '--output', compareOutFail,
    '--viewport', '64x64',
    '--threshold', '0.99',
    '--evolution-log', evolutionLog,
  ], { encoding: 'utf8' });
  if (p.status !== 12) fail(`html-cocos compare fail should exit 12, got ${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
  if (!/html-cocos-runtime-gap/.test(fs.readFileSync(evolutionLog, 'utf8'))) fail('failed html-cocos compare did not append evolution2 candidate');

  const artWaiversPath = path.join(tmp, 'v2-source-package-art.art-authority-waivers.json');
  const validArtWaiver = {
    schemaVersion: '1.0.0',
    screenId: 'v2-source-package-art',
    sourcePackageId: 'self-test-source-package',
    coordinateSpace: 'normalized-viewport',
    viewport: { width: 64, height: 64, dpr: 1 },
    policy: {
      maxWaiverViewportRatio: 0.08,
      maxTotalWaiverViewportRatio: 0.08,
      allowedScopes: ['chrome'],
      allowedAssetKinds: ['button-skin'],
    },
    waivers: [{
      id: 'approved-runtime-art-square',
      zoneId: 'approved-runtime-art-square',
      rect: { x: 0, y: 0, width: 8, height: 8, unit: 'px' },
      scope: 'chrome',
      assetRefs: [{ kind: 'button-skin', path: TEST_RUNTIME_BUTTON_ASSET }],
      authority: { approvedBy: 'art-director-self-test', approvedAt: '2026-04-29', source: 'self-test', decisionId: 'R-30A-self-test' },
      reason: 'fixture exercises approved runtime art delta without changing raw score',
      expectation: { sourceHtmlExpectation: 'solid source color remains raw authority', runtimeExpectation: 'small approved runtime chrome differs intentionally' },
      scoreImpact: { mayAffectScore: true, channel: 'visual' },
    }],
  };
  const validation = validateArtAuthorityWaivers(validArtWaiver, { repoRoot: REPO_ROOT, screenId: 'v2-source-package-art', targetWidth: 64, targetHeight: 64 });
  if (!validation.ok) fail(`valid art-authority waiver rejected: ${validation.errors.join('; ')}`);
  const invalidValidation = validateArtAuthorityWaivers(Object.assign({}, validArtWaiver, {
    waivers: [Object.assign({}, validArtWaiver.waivers[0], { id: 'bad-text-waiver', coversText: true })],
  }), { repoRoot: REPO_ROOT, screenId: 'v2-source-package-art', targetWidth: 64, targetHeight: 64 });
  if (invalidValidation.ok) fail('art-authority validator must reject text/data/interaction/mount coverage flags');
  fs.writeFileSync(artWaiversPath, JSON.stringify(validArtWaiver, null, 2), 'utf8');
  const compareOutArt = path.join(tmp, 'html-cocos-compare-art');
  p = spawnSync(process.execPath, [HTML_COCOS_COMPARE_CLI,
    '--source-dir', sourceDir,
    '--main-html', 'index.html',
    '--screen-id', 'v2-source-package-art',
    '--editor-screenshot', editorSmallDiff,
    '--output', compareOutArt,
    '--viewport', '64x64',
    '--threshold', '0.99',
    '--art-authority-waivers', artWaiversPath,
    '--evolution-log', evolutionLog,
  ], { encoding: 'utf8' });
  if (p.status !== 0) fail(`html-cocos compare approved art delta exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
  const artVerdict = JSON.parse(fs.readFileSync(path.join(compareOutArt, 'v2-source-package-art.html-cocos-verdict.json'), 'utf8'));
  if (!(artVerdict.runtimeVsSource.score < 0.99)) fail(`art-authority test must preserve raw failing score: ${JSON.stringify(artVerdict.runtimeVsSource)}`);
  if (artVerdict.runtimeVsSource.verdict !== 'pass-with-approved-art-delta' || artVerdict.runtimeVsSource.adjustedScore < 0.99) {
    fail(`approved art delta verdict invalid: ${JSON.stringify(artVerdict.runtimeVsSource)}`);
  }
  if (!artVerdict.adjustedPixelDiff.unwaivedDiffTopList || artVerdict.adjustedPixelDiff.unwaivedDiffTopList.length !== 0) {
    fail('approved art delta should remove waived bucket from unwaived diff top list');
  }
  const zoneOwnership = JSON.parse(fs.readFileSync(path.join(compareOutArt, 'v2-source-package-art.zone-ownership.json'), 'utf8'));
  if (!zoneOwnership.summary || zoneOwnership.summary.byTaxonomy['art-authority'] !== 1) {
    fail(`R-31 zone ownership should classify approved art waiver: ${JSON.stringify(zoneOwnership.summary)}`);
  }
  if (!artVerdict.zoneOwnership || !artVerdict.zoneOwnership.report) fail('R-31 verdict must link zone ownership report');
  ok('HTML source vs Cocos Editor screenshot gate passes, fails, emits evolution2 candidate, applies capture protocol, classifies zone ownership, and supports approved art delta');

  const workflowOut = path.join(tmp, 'v2-workflow');
  const workflowProtocol = path.join(tmp, 'v2-workflow.final-capture-protocol.json');
  const workflowCaptureProtocol = {
    schemaVersion: '1.0.0',
    screenId: 'v2-workflow',
    viewport: { width: 64, height: 64, dpr: 1 },
    safeArea: { x: 0, y: 0, width: 64, height: 64 },
    settleMs: 0,
    threshold: 0.95,
    tolerance: 12,
    finalCompareEligible: true,
    finalCompareViolations: [],
    finalImageSize: { width: 64, height: 64 },
    imageSizeAfterScreenshot: { width: 64, height: 64 },
    requestedMaxWidth: 0,
    effectiveMaxWidth: 0,
  };
  fs.writeFileSync(workflowProtocol, JSON.stringify(workflowCaptureProtocol, null, 2), 'utf8');
  const workflowCaptureReport = path.join(tmp, 'v2-workflow.capture-report.json');
  fs.writeFileSync(workflowCaptureReport, JSON.stringify({
    schemaVersion: '1.0.0',
    captures: [
      {
        file: editorBlue,
        screenshotHash: sha256File(editorBlue),
        screenId: 'v2-workflow',
        expectedScreenId: 'v2-workflow',
        actualScreenId: 'v2-workflow',
        captureMode: 'formal-html-to-ucuf',
        uiVersion: 'selftest-v2-workflow',
        runtimeVersion: 'selftest-v2-workflow',
        runtimeSpecHash: { screen: 'selftest-screen', layout: 'selftest-layout', skin: 'selftest-skin' },
        captureProtocol: workflowCaptureProtocol,
      },
    ],
  }, null, 2), 'utf8');
  const workflowRuntimeBackup = backupFiles(collectRuntimeSpecArtifacts('v2-workflow'));
  p = spawnSync(process.execPath, [HTML_TO_UCUF_WORKFLOW_CLI,
    '--source-dir', sourceDir,
    '--main-html', 'index.html',
    '--screen-id', 'v2-workflow',
    '--bundle', 'ui_test',
    '--out-dir', workflowOut,
    '--editor-screenshot', editorBlue,
    '--viewport', '64x64',
    '--skip-compare',
    '--no-validate',
    '--capture-protocol', workflowProtocol,
    '--capture-report', workflowCaptureReport,
    '--evolution-log', evolutionLog,
  ], { encoding: 'utf8', env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }) });
  restoreFiles(workflowRuntimeBackup);
  if (p.status !== 0) fail(`v2 workflow source-dir exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
  const summary = JSON.parse(fs.readFileSync(path.join(workflowOut, 'v2-workflow.workflow-summary.json'), 'utf8'));
  if (!summary.sourcePackage || !summary.verdict.editorVisualPass || !summary.verdict.workflowPass) fail('v2 workflow summary missing sourcePackage/editorVisualPass/workflowPass');
  ok('run-html-to-ucuf-workflow --source-dir wires source package and Editor visual gate');

  const workflowSkipOut = path.join(tmp, 'v2-workflow-skip-editor');
  const workflowSkipRuntimeBackup = backupFiles(collectRuntimeSpecArtifacts('v2-workflow-skip-editor'));
  p = spawnSync(process.execPath, [HTML_TO_UCUF_WORKFLOW_CLI,
    '--source-dir', sourceDir,
    '--main-html', 'index.html',
    '--screen-id', 'v2-workflow-skip-editor',
    '--bundle', 'ui_test',
    '--out-dir', workflowSkipOut,
    '--skip-compare',
    '--skip-editor-compare',
    '--no-per-tab-replay',
    '--no-validate',
  ], { encoding: 'utf8', env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }) });
  restoreFiles(workflowSkipRuntimeBackup);
  if (p.status === 0) fail('v2 workflow must not pass when --skip-editor-compare is used');
  const skipSummary = JSON.parse(fs.readFileSync(path.join(workflowSkipOut, 'v2-workflow-skip-editor.workflow-summary.json'), 'utf8'));
  if (skipSummary.verdict.workflowPass || !skipSummary.verdict.remainingIssues.includes('editor-compare-skipped')) {
    fail('v2 workflow skip-editor verdict should fail with editor-compare-skipped');
  }
  ok('run-html-to-ucuf-workflow rejects skipped Editor gate in v2 source package flow');
}

function runFidelitySteps() {
  if (!fs.existsSync(VISUAL_RICH_FIXTURE)) fail(`fixture missing: ${VISUAL_RICH_FIXTURE}`);

  const syntheticSlots = snapshotToSlots({
    'background-image': 'linear-gradient(135deg, rgb(109, 93, 255), rgb(21, 25, 36))',
    'box-shadow': 'rgba(0, 0, 0, 0.45) 0px 8px 24px 0px',
    'border-top-width': '2px',
    'border-right-width': '2px',
    'border-bottom-width': '2px',
    'border-left-width': '2px',
    'border-top-style': 'solid',
    'border-right-style': 'solid',
    'border-bottom-style': 'solid',
    'border-left-style': 'solid',
    'border-top-color': 'rgb(109, 93, 255)',
    'border-right-color': 'rgb(109, 93, 255)',
    'border-bottom-color': 'rgb(109, 93, 255)',
    'border-left-color': 'rgb(109, 93, 255)',
    'border-top-left-radius': '12px',
    'border-top-right-radius': '12px',
    'border-bottom-right-radius': '12px',
    'border-bottom-left-radius': '12px',
    filter: 'brightness(1.05)',
    transform: 'matrix(0.997, -0.069, 0.069, 0.997, 0, 0)',
    'clip-path': 'inset(0px round 12px)',
    opacity: '0.92',
    'mix-blend-mode': 'screen',
    'text-decoration-line': 'underline',
    'text-decoration-color': 'rgb(109, 93, 255)',
    'text-decoration-thickness': '2px',
  }, { slotPrefix: 'rich' });
  for (const kind of ['gradient-rect', 'shadow-set', 'border-style', 'filter-stack', 'transform-stack', 'mask-and-clip', 'opacity-and-blend', 'text-decoration']) {
    if (!syntheticSlots.some(slot => slot.kind === kind)) fail(`M14 slot kind missing: ${kind}`);
  }
  ok('M14 skin slot kind expansion covers gradient/shadow/border/filter/transform/mask/blend/text-decoration');

  withTempDir((tmp) => {
    const layout = path.join(tmp, 'visual-rich.layout.json');
    const skin = path.join(tmp, 'visual-rich.skin.json');
    const manualWaivers = path.join(tmp, 'visual-rich.manual-waivers.json');
    const cssEvolutionLog = path.join(tmp, 'html_skill_rule-evolution2-css.md');
    fs.writeFileSync(cssEvolutionLog, '# Evolution v2 CSS Test\n', 'utf8');
    fs.writeFileSync(manualWaivers, JSON.stringify({
      waivers: [{
        selector: '.stage',
        reason: 'fixture-expected-decorative-image-gap',
        rectInCanvas: { x: 0, y: 0, w: 12, h: 12 },
      }],
    }, null, 2), 'utf8');

    let p = run([
      '--input', VISUAL_RICH_FIXTURE,
      '--output', layout,
      '--skin-output', skin,
      '--screen-id', 'visual-rich',
      '--bundle', 'ui_test',
      '--strict-coverage', '0.1',
      '--strict-tokens', '999',
      '--manual-waivers', manualWaivers,
      '--evolution-log', cssEvolutionLog,
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`M13/M18/M20 fidelity sidecars exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);

    const coveragePath = layout.replace(/\.json$/, '.css-coverage.json');
    const tokenPath = layout.replace(/\.json$/, '.token-suggestions.json');
    const waiverPath = layout.replace(/\.json$/, '.image-waivers.json');
    for (const file of [coveragePath, tokenPath, waiverPath]) {
      if (!fs.existsSync(file)) fail(`missing fidelity sidecar: ${file}`);
    }
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const waivers = JSON.parse(fs.readFileSync(waiverPath, 'utf8'));
    if (!(coverage.coveragePercent > 0)) fail(`M13 coveragePercent invalid: ${coverage.coveragePercent}`);
    if (!coverage.cssCapability || !coverage.cssCapability.topOffenders || coverage.cssCapability.topOffenders.length < 1) {
      fail('M4 cssCapability topOffenders missing from css coverage sidecar');
    }
    if (!coverage.cssCapability.assetizeHints || !coverage.cssCapability.assetizeHints.some(item => item.property === 'background-image')) {
      fail('M4 cssCapability assetizeHints missing background-image task hint');
    }
    const offenderProps = new Set(coverage.cssCapability.topOffenders.map(item => item.property));
    if (!offenderProps.has('background-image') || !offenderProps.has('filter')) {
      fail(`M4 cssCapability expected background-image/filter offenders, got ${[...offenderProps].join(',')}`);
    }
    if (!/css-capability-gap/.test(fs.readFileSync(cssEvolutionLog, 'utf8'))) {
      fail('M4 cssCapability did not append evolution2 candidate for unsupported CSS');
    }
    if (!(coverage.pseudoNodes > 0)) fail('M19 pseudo-element capture did not count pseudoNodes');
    const tokenSuggestionCount = ['colorSuggestions', 'fontSuggestions', 'spacingSuggestions']
      .reduce((sum, key) => sum + ((tokens[key] || []).length), 0);
    if (tokenSuggestionCount < 1) fail('M18 token suggestions empty');
    if (!waivers.waivers || !waivers.waivers.some(w => w.manualOverride)) fail('M20 manual image waiver missing');
    if (!waivers.waivers.some(w => /missing-banner/.test(String(w.url)))) fail('M20 missing image URL waiver missing');
    ok('M13/M18/M19/M20 sidecars: coverage, css capability, pseudo capture, token suggestions, image waivers');

    const computedHtml = path.join(tmp, 'computed-style-injection.html');
    const computedTokens = path.join(tmp, 'computed-style-tokens.json');
    const computedLayout = path.join(tmp, 'computed-style.layout.json');
    const computedSkin = path.join(tmp, 'computed-style.skin.json');
    fs.writeFileSync(computedTokens, JSON.stringify({
      colors: {
        computedPanel: '#123456',
        computedText: '#abcdef',
      },
    }, null, 2), 'utf8');
    fs.writeFileSync(computedHtml, `<!doctype html>
<html><head><style>
  @media (min-width: 1px) {
    .computed-panel { background-color: #123456; color: #abcdef; }
  }
  .computed-panel { width: 64px; height: 64px; }
</style></head><body>
  <div class="computed-panel" data-name="ComputedPanel"><span data-name="ComputedText">OK</span></div>
</body></html>
`, 'utf8');
    p = run([
      '--input', computedHtml,
      '--output', computedLayout,
      '--skin-output', computedSkin,
      '--screen-id', 'computed-style',
      '--bundle', 'ui_test',
      '--tokens-source', computedTokens,
      '--use-computed-style',
    ], { DOM_TO_UI_TELEMETRY: '0' });
    if (p.status !== 0) fail(`M16 computed-style injection exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    const computedLayoutObj = JSON.parse(fs.readFileSync(computedLayout, 'utf8'));
    const computedSkinObj = JSON.parse(fs.readFileSync(computedSkin, 'utf8'));
    if (/(_captureId|data-ucuf-capture-id)/.test(JSON.stringify(computedLayoutObj))) {
      fail('M16 computed-style injection serialized transient capture ids');
    }
    const computedPanel = findNode(computedLayoutObj, n => n.name === 'ComputedPanel');
    const computedText = findNode(computedLayoutObj, n => n.name === 'ComputedText');
    const computedPanelSlot = computedPanel && computedPanel.skinSlot && computedSkinObj.slots[computedPanel.skinSlot];
    const computedTextSlot = computedText && computedText.styleSlot && computedSkinObj.slots[computedText.styleSlot];
    if (!computedPanelSlot || computedPanelSlot.color !== 'computedPanel') fail(`M16 computed panel color mismatch: ${computedPanelSlot && computedPanelSlot.color}`);
    if (!computedTextSlot || computedTextSlot.color !== 'computedText') fail(`M16 computed text color mismatch: ${computedTextSlot && computedTextSlot.color}`);
    ok('M16 computed-style flag injects browser styles without serializing capture ids');

    const geometryHtml = `
      <div data-name="Stage" data-ucuf-capture-id="1" style="position:relative;width:1000px;height:600px;">
        <img data-name="HeroImage" data-ucuf-capture-id="2" src="./hero.png" style="position:absolute;left:50%;bottom:0;height:90%;transform:translateX(-40%);object-fit:contain;object-position:center bottom;" />
      </div>`;
    const geometryDraft = buildDraftFromHtml(geometryHtml, {
      screenId: 'computed-geometry',
      bundle: 'ui_test',
      useComputedStyle: true,
      fidelitySnapshots: {
        1: { id: 1, parentId: 0, styles: { _rect: { x: 0, y: 0, w: 1000, h: 600 } } },
        2: {
          id: 2,
          parentId: 1,
          styles: {
            position: 'absolute',
            left: '50%',
            bottom: '0px',
            transform: 'matrix(1, 0, 0, 1, -216, 0)',
            'object-fit': 'contain',
            'object-position': '50% 100%',
            _rect: { x: 284, y: 60, w: 540, h: 540 },
          },
        },
      },
    });
    const heroImage = findNode(geometryDraft.layoutDraft, n => n.name === 'HeroImage');
    if (!heroImage) fail('computed geometry image missing');
    if (heroImage.width !== 540 || heroImage.height !== 540) fail(`computed geometry did not use browser rect size: ${heroImage.width}x${heroImage.height}`);
    if (!heroImage.widget || heroImage.widget.left !== 284 || heroImage.widget.bottom !== 0) fail(`computed geometry widget mismatch: ${JSON.stringify(heroImage.widget)}`);
    if (heroImage.objectFit !== 'contain' || heroImage.objectPosition !== '50% 100%') fail(`object-fit metadata missing: ${heroImage.objectFit}/${heroImage.objectPosition}`);
    if (geometryDraft.warnings.some(w => w.code === 'css-transform-manual-layout-risk')) fail('computed geometry transform should not remain a manual layout risk');
    ok('M16 computed geometry maps absolute transform/object-fit to UCUF size + widget');

    const clipDraft = buildDraftFromHtml(`
      <div data-name="CutCard" style="width:120px;height:80px;clip-path:polygon(0 0, 100% 0, 100% 86%, 91% 100%, 0 100%);background:#111;"></div>
    `, { screenId: 'clip-path-fixture', bundle: 'ui_test' });
    const cutCard = findNode(clipDraft.layoutDraft, n => n.name === 'CutCard');
    if (!cutCard || !/^polygon\(/.test(cutCard.clipPath || '')) fail(`clip-path metadata missing: ${cutCard && cutCard.clipPath}`);
    ok('R-36 generic clip-path metadata is emitted into UCUF layout nodes');

    const cssPrimitiveDraft = buildDraftFromHtml(`
      <div data-name="BorderCard" style="width:120px;height:80px;background:rgba(255,255,255,.03);border:1px solid #4D4635;border-radius:8px"></div>
      <span data-name="VisualDot" style="display:inline-block;width:8px;height:8px;border-radius:4px;background:#D4AF37"></span>
      <span data-name="ItalicText" style="font-style:italic;letter-spacing:.2em;font-size:20px;color:#fff">Meta</span>
    `, { screenId: 'css-primitive-fixture', bundle: 'ui_test' });
    const borderCard = findNode(cssPrimitiveDraft.layoutDraft, n => n.name === 'BorderCard');
    const borderCardSlot = borderCard && cssPrimitiveDraft.skinDraft.slots[borderCard.skinSlot];
    if (!borderCardSlot || borderCardSlot.borderWidth !== 1 || borderCardSlot.cornerRadius !== 8) fail(`border/card skin metadata missing: ${JSON.stringify(borderCardSlot)}`);
    const visualDot = findNode(cssPrimitiveDraft.layoutDraft, n => n.name === 'VisualDot');
    const visualDotSlot = visualDot && cssPrimitiveDraft.skinDraft.slots[visualDot.skinSlot];
    if (!visualDot || visualDot.type !== 'panel' || !visualDotSlot || visualDotSlot.cornerRadius !== 4) fail(`visual-only span should become a rounded panel: ${JSON.stringify({ node: visualDot, slot: visualDotSlot })}`);
    const italicText = findNode(cssPrimitiveDraft.layoutDraft, n => n.name === 'ItalicText');
    const italicTextSlot = italicText && cssPrimitiveDraft.skinDraft.slots[italicText.styleSlot];
    if (!italicTextSlot || italicTextSlot.isItalic !== true || italicTextSlot.letterSpacing !== 4) fail(`italic/letter-spacing style missing: ${JSON.stringify(italicTextSlot)}`);
    ok('R-37 generic CSS border/radius, visual-only spans, and typography spacing emit renderable UCUF metadata');

    const flexAlignDraft = buildDraftFromHtml(`
      <div data-name="FlexCenterBetween" style="display:flex;align-items:center;justify-content:space-between;width:200px;height:40px;gap:8px"><span>Left</span><span>Right</span></div>
      <div data-name="FlexColumnEnd" style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;width:100px;height:80px"><span>Top</span></div>
      <div data-name="FlexBaseline" style="display:flex;align-items:baseline"><span>Big</span><span>Small</span></div>
    `, { screenId: 'flex-align-fixture', bundle: 'ui_test' });
    const flexCenter = findNode(flexAlignDraft.layoutDraft, n => n.name === 'FlexCenterBetween');
    const flexColumn = findNode(flexAlignDraft.layoutDraft, n => n.name === 'FlexColumnEnd');
    const flexBaseline = findNode(flexAlignDraft.layoutDraft, n => n.name === 'FlexBaseline');
    if (!flexCenter || flexCenter.layout.alignItems !== 'center' || flexCenter.layout.justifyContent !== 'space-between') fail(`flex center/between metadata missing: ${JSON.stringify(flexCenter && flexCenter.layout)}`);
    if (!flexColumn || flexColumn.layout.type !== 'vertical' || flexColumn.layout.alignItems !== 'end' || flexColumn.layout.justifyContent !== 'center') fail(`flex column alignment metadata missing: ${JSON.stringify(flexColumn && flexColumn.layout)}`);
    if (!flexBaseline || flexBaseline.layout.alignItems !== 'baseline') fail(`flex baseline metadata missing: ${JSON.stringify(flexBaseline && flexBaseline.layout)}`);
    ok('R-38 generic CSS flex align-items and justify-content emit UCUF layout metadata');

    const paragraphDraft = buildDraftFromHtml(`
      <div data-name="ParagraphText" style="font-size:15px;line-height:30px;text-align:justify;color:#D0C5AF">張飛，字翼德，幽州涿郡人。少年以屠豬賣酒為業，後於桃園與劉備、關羽義結金蘭，誓同生死。</div>
      <div data-name="ParagraphSibling">S</div>
    `, { screenId: 'paragraph-wrap-fixture', bundle: 'ui_test' });
    const paragraphText = findNode(paragraphDraft.layoutDraft, n => n.name === 'ParagraphText');
    const paragraphSlot = paragraphText && paragraphDraft.skinDraft.slots[paragraphText.styleSlot];
    if (!paragraphSlot || paragraphSlot.overflow !== 'RESIZE_HEIGHT') fail(`paragraph overflow should resize height for readable wrapped text: ${JSON.stringify(paragraphSlot)}`);
    ok('R-39 generic long paragraph labels use RESIZE_HEIGHT instead of shrink-to-invisible');

    const comparePng = path.join(tmp, 'visual-rich.compare.png');
    p = spawnSync(process.execPath, [COMPARE_CLI,
      '--html', VISUAL_RICH_FIXTURE,
      '--layout', layout,
      '--skin', skin,
      '--output', comparePng,
      '--render-mode', 'high-fidelity',
      '--pixel-diff',
      '--strict-coverage', '0.1',
      '--strict-pixel', '0.1',
      '--manual-waivers', manualWaivers,
      '--save-panels', path.join(tmp, 'compare-panels'),
    ], { encoding: 'utf8', env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }) });
    if (p.status !== 0) fail(`M15/M16 compare exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    const pixelPath = comparePng.replace(/\.png$/i, '.pixel-diff.json');
    const compareWaiverPath = comparePng.replace(/\.png$/i, '.image-waivers.json');
    if (!fs.existsSync(pixelPath)) fail('M16 pixel-diff sidecar missing');
    if (!fs.existsSync(compareWaiverPath)) fail('M20 compare image-waiver sidecar missing');
    const pixel = JSON.parse(fs.readFileSync(pixelPath, 'utf8'));
    const compareWaivers = JSON.parse(fs.readFileSync(compareWaiverPath, 'utf8'));
    if (typeof pixel.adjustedCoverage !== 'number') fail('M16 adjustedCoverage missing');
    if (!pixel.waiverPolicy || !/preview-diagnostic-only/.test(pixel.waiverPolicy.imageWaivers || '')) {
      fail(`M20 image waiver policy should be preview-only: ${JSON.stringify(pixel.waiverPolicy)}`);
    }
    if (!compareWaivers.waivers.some(w => w.manualOverride && w.reason === 'fixture-expected-decorative-image-gap')) {
      fail('M20 compare manual image waiver missing');
    }
    ok('M15/M16 high-fidelity renderer + pixel diff strict gate');

    const evolutionLog = path.join(tmp, 'html_skill_rule-evolution.md');
    fs.writeFileSync(evolutionLog, '# Evolution Test Log\n\n', 'utf8');
    p = spawnSync(process.execPath, [FEEDBACK_CLI,
      '--emit-fidelity-suggestions',
      '--coverage', coveragePath,
      '--pixel-diff', pixelPath,
      '--source', VISUAL_RICH_FIXTURE,
      '--log', evolutionLog,
    ], { encoding: 'utf8' });
    if (p.status !== 0) fail(`M17 emit fidelity suggestions exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    if (!/fidelity-gap/.test(fs.readFileSync(evolutionLog, 'utf8'))) fail('M17 evolution log did not receive fidelity-gap entry');
    ok('M17 feedback appends fidelity-gap evolution entries');

    const firstSuggestion = (tokens.colorSuggestions || [])[0]
      || (tokens.fontSuggestions || [])[0]
      || (tokens.spacingSuggestions || [])[0];
    if (!firstSuggestion) fail('M18 no suggestion available to accept');
    const tokenRegistry = path.join(tmp, 'accepted-tokens.json');
    p = spawnSync(process.execPath, [FEEDBACK_CLI,
      '--accept-token-suggestion', String(firstSuggestion.value),
      '--token-suggestions', tokenPath,
      '--tokens', tokenRegistry,
      '--value', 'richAccent=#6d5dff',
      '--log', evolutionLog,
    ], { encoding: 'utf8' });
    if (p.status !== 0) fail(`M18 accept token suggestion exit=${p.status}\nstdout=${p.stdout}\nstderr=${p.stderr}`);
    const acceptedTokens = JSON.parse(fs.readFileSync(tokenRegistry, 'utf8'));
    const hasAccepted = Object.values(acceptedTokens).some(bucket => bucket && bucket.richAccent === '#6d5dff');
    if (!hasAccepted) fail('M18 accepted token not written to registry');
    ok('M18 token suggestion acceptance writes token registry and evolution entry');

    runReadinessGateStep(tmp);
  });
}

function runReadinessGateStep(tmp) {
  const layoutPath = path.join(tmp, 'ready.layout.json');
  const skinPath = path.join(tmp, 'ready.skin.json');
  const capturePath = path.join(tmp, 'ready.final-capture-protocol.json');
  const zonePath = path.join(tmp, 'ready.zone-ownership.json');
  const tabPath = path.join(tmp, 'ready.tab-routing.json');
  const preloadPath = path.join(tmp, 'ready.preload.json');
  const performancePath = path.join(tmp, 'ready.performance.json');
  const bakePath = path.join(tmp, 'ready.layout.bake-manifest.json');
  const verdictPath = path.join(tmp, 'ready.html-cocos-verdict.json');
  fs.writeFileSync(layoutPath, JSON.stringify({
    type: 'container',
    name: 'ReadyRoot',
    children: [{ type: 'container', name: 'ReadyTabMount', children: [{ type: 'label', name: 'ReadyValue', text: '98', bindPath: 'general.stats.force' }] }],
  }, null, 2), 'utf8');
  fs.writeFileSync(skinPath, JSON.stringify({ slots: {} }, null, 2), 'utf8');
  fs.writeFileSync(capturePath, JSON.stringify({
    schemaVersion: '1.0.0',
    screenId: 'ready',
    viewport: { width: 64, height: 64, dpr: 1 },
    safeArea: { x: 0, y: 0, width: 64, height: 64 },
    settleMs: 100,
    threshold: 0.95,
    tolerance: 12,
  }, null, 2), 'utf8');
  fs.writeFileSync(zonePath, JSON.stringify({ screenId: 'ready', zones: [], summary: { byTaxonomy: {} } }, null, 2), 'utf8');
  fs.writeFileSync(tabPath, JSON.stringify({ screenId: 'ready', tabs: [{ id: 'Overview', mount: 'ReadyTabMount' }] }, null, 2), 'utf8');
  fs.writeFileSync(preloadPath, JSON.stringify({ firstScreen: {}, deferred: { lazySlots: [] } }, null, 2), 'utf8');
  fs.writeFileSync(performancePath, JSON.stringify({ rendering: { nodeCount: 3, maxDepth: 3 }, verdict: { blockers: [] } }, null, 2), 'utf8');
  fs.writeFileSync(bakePath, JSON.stringify({ entries: [], summary: { byBakeAction: {} } }, null, 2), 'utf8');
  fs.writeFileSync(verdictPath, JSON.stringify({ runtimeVsSource: { score: 0.96, adjustedScore: 0.96, verdict: 'pass' } }, null, 2), 'utf8');
  const passReport = buildReadinessReport({ repoRoot: tmp, screenId: 'ready', paths: {
    layout: layoutPath,
    skin: skinPath,
    captureProtocol: capturePath,
    zoneOwnership: zonePath,
    tabRouting: tabPath,
    preload: preloadPath,
    performance: performancePath,
    bakeManifest: bakePath,
    finalVerdict: verdictPath,
  } });
  if (passReport.gates.tabMounts.status !== 'pass') fail('readiness gate should accept real tab mount nodes');
  if (passReport.gates.textBinding.missingContractCount !== 0) fail('readiness gate should honor bound dynamic text');

  fs.writeFileSync(tabPath, JSON.stringify({ screenId: 'ready', tabs: [{ id: 'Overview', mount: 'SyntheticMissingMount' }] }, null, 2), 'utf8');
  const failReport = buildReadinessReport({ repoRoot: tmp, screenId: 'ready', paths: {
    layout: layoutPath,
    skin: skinPath,
    captureProtocol: capturePath,
    zoneOwnership: zonePath,
    tabRouting: tabPath,
    preload: preloadPath,
    performance: performancePath,
    bakeManifest: bakePath,
    finalVerdict: verdictPath,
  } });
  if (failReport.gates.tabMounts.status !== 'blocker') fail('readiness gate must reject synthetic tab mount names');
  if (failReport.summary.blockerUnits < 1) fail('readiness gate blocker units missing for unresolved tab mount');
  ok('R-35 readiness gate quantifies final gate, tab mounts, text binding, and sidecar freshness');
}

function runAccuracyStep() {
  const { runAccuracy } = require('../lib/dom-to-ui/accuracy-harness');
  const html = fs.readFileSync(FIXTURE, 'utf8');
  const baseline = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', 'gacha-banner.accuracy-baseline.json'),
    'utf8',
  ));
  const result = runAccuracy({
    html,
    iterations: 5,
    baseline,
    opts: { screenId: 'self-test-accuracy', bundle: 'ui_gacha' },
  });
  if (result.idempotencyRate !== 1) fail(`accuracy idempotencyRate=${result.idempotencyRate} (expected 1)`);
  if (result.structuralStability !== 1) fail(`accuracy structuralStability=${result.structuralStability} (expected 1)`);
  if (result.tokenCoverage < 0.5) fail(`accuracy tokenCoverage=${result.tokenCoverage} (<0.5)`);
  ok('accuracy harness: idempotency=1, structuralStability=1, tokenCoverage>=0.5');
}

function runAdditionalAccuracyBaselines() {
  const { runAccuracy } = require('../lib/dom-to-ui/accuracy-harness');
  const cases = [
    ['lobby-action', 'formal-ui'],
    ['general-detail-tabs', 'formal-ui'],
    ['battle-hud', 'formal-ui'],
  ];
  for (const [name, profile] of cases) {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', `${name}.html`), 'utf8');
    const baseline = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, 'tests', 'fixtures', 'dom-to-ui', `${name}.accuracy-baseline.json`),
      'utf8',
    ));
    const result = runAccuracy({
      html,
      iterations: 3,
      baseline,
      opts: { screenId: name, bundle: 'ui_test' },
    });
    if (result.idempotencyRate !== 1) fail(`${name} idempotencyRate=${result.idempotencyRate}`);
    if (result.structuralStability !== 1) fail(`${name} structuralStability=${result.structuralStability}`);
    if (result.tokenCoverage < 0.5) fail(`${name} tokenCoverage=${result.tokenCoverage}`);
    if (!result.visualReview || result.visualReview.metrics.screenshotZoneConfidence < 1) fail(`${name} visual review missing screenshotZoneConfidence`);
  }
  ok('accuracy harness covers lobby, general-detail, battle baselines');
}

function runHtmlToUcufActiveContractGroup() {
  const current = runRuleGuard({ repoRoot: REPO_ROOT, scanCore: true });
  if (current.blockerCount !== 0) {
    fail(`Plan4 rule guard should pass current core files, got blockers=${current.blockerCount}\n${JSON.stringify(current.violations.slice(0, 5), null, 2)}`);
  }
  ok('Plan4 rule guard passes current core files');

  withTempDir((tmp) => {
    seedPlan4Repo(tmp, {
      workflow: 'const screen = "gacha-ds3"; const node = "CharacterDs3Main_div_6";\n',
      sidecar: 'const TAB_TARGET_TO_CHILD_PANEL = { overview: "CharacterDs3OverviewChild" };\n',
      readiness: 'const skin = `${screenId}-default.json`;\n',
      draftBuilder: 'function buildDraftFromHtml() { return {}; }\n',
      skill: 'Plan 2 docs/html_skill_plan2.md is the formal execution spec.\n',
    });
    const report = runRuleGuard({ repoRoot: tmp, scanCore: true });
    assertRule(report, 'H2U-P4-005');
    assertRule(report, 'H2U-P4-007');
    assertRule(report, 'H2U-P4-010');
    assertRule(report, 'H2U-P4-012');
    assertRule(report, 'H2U-P5-001');
    ok('seeded negative core residues are detected');
  });

  const formalPackage = { mainHtml: 'index.html', tokens: 'ui-design-tokens.json', css: 'colors_and_type.css' };
  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: null,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
    },
  }), 'H2U-P4-001');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      debugOnlyReasons: ['editor-compare-skipped'],
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
    },
  }), 'H2U-P4-002');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      debugOnlyReasons: ['runtime-sync-disabled'],
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'debug-local-final-json' },
    },
  }), 'H2U-P4-003');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    sourceHtml: '<button role="tab" data-tab="alpha">Alpha</button><section data-ucuf-tab-content="alpha"></section>',
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [{ step: 'per-tab-replay', ok: true, skipped: true, fragmentCount: 0 }],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
    },
  }), 'H2U-P4-004');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [{ step: 'strict-replay-sidecar-repair', ok: true }],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
    },
  }), 'H2U-P4-006');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'debug-local-final-json' },
    },
  }), 'H2U-P4-008');

  assertRule(runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: { mainHtml: 'index.html', tokens: null, css: null },
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
    },
  }), 'H2U-P4-009');

  withTempDir((tmp) => {
    const brokenRadar = path.join(tmp, 'broken-radar.layout.json');
    fs.writeFileSync(brokenRadar, JSON.stringify({
      root: { type: 'container', name: 'Root', children: [{ type: 'composite', name: 'Radar', rendererHint: 'svg-radar-chart', svgMeta: { viewBox: { x: 0, y: 0, width: 100, height: 100 } } }] },
    }, null, 2), 'utf8');
    assertRule(runRuleGuard({ repoRoot: REPO_ROOT, scanCore: false, layout: brokenRadar }), 'H2U-P4-011');

    const fullRadar = path.join(tmp, 'full-radar.layout.json');
    fs.writeFileSync(fullRadar, JSON.stringify({
      root: {
        type: 'container',
        name: 'Root',
        children: [{
          type: 'composite',
          name: 'Radar',
          rendererHint: 'svg-radar-chart',
          svgMeta: {
            kind: 'radar-chart',
            viewBox: { x: 0, y: 0, width: 100, height: 100 },
            center: { x: 50, y: 50 },
            axisLines: [{ x1: 50, y1: 50, x2: 50, y2: 0 }],
            gridPolygons: [{ points: [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }] }],
            valuePolygon: { points: [{ x: 50, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 90 }] },
            labels: [{ text: 'A', x: 50, y: 0, box: { width: 20, height: 18 } }],
            textBox: { x: 40, y: -9, width: 20, height: 18 },
          },
        }],
      },
    }, null, 2), 'utf8');
    const radarPass = runRuleGuard({ repoRoot: REPO_ROOT, scanCore: false, layout: fullRadar });
    if (radarPass.violations.some(v => v.ruleId === 'H2U-P4-011')) fail('full radar geometry should pass H2U-P4-011');
    ok('Plan4 radar geometry contract detects missing payload and accepts full payload');
  });

  const envBlocked = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: true,
      environmentBlocked: 'spawnSync node.exe EPERM',
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'debug-local-final-json' },
    },
  });
  if (!envBlocked.violations.some(v => v.severity === 'warning' && /environment-blocked/.test(v.summary))) {
    fail('environment-blocked should be reported as a warning');
  }
  ok('Plan4 active contract group covers formal/debug/runtime/tab/radar/environment rules');
}

function runHtmlToUcufFidelityContractGroup() {
  const formalPackage = { mainHtml: 'index.html', tokens: 'ui-design-tokens.json', css: 'colors_and_type.css' };
  const passedFidelityDimensions = {
    structural: { pass: true },
    colorFill: { pass: true },
    layoutGeometry: { pass: true },
    interactionSmoke: { pass: true },
  };
  let validatorEnvironmentBlocked = false;
  const fixtureNames = [
    'history-not-story.html',
    'explicit-story-strip.html',
    'radial-slide-background.html',
    'multi-layer-background.html',
    'interaction-carousel.html',
    'non-ds3-tabbed.html',
  ];
  for (const name of fixtureNames) {
    const filePath = path.join(HTML_TO_UCUF_FIXTURE_DIR, name);
    if (!fs.existsSync(filePath)) fail(`Plan4 fixture missing: ${filePath}`);
  }

  const historyDraft = buildDraftFromHtml(
    fs.readFileSync(path.join(HTML_TO_UCUF_FIXTURE_DIR, 'history-not-story.html'), 'utf8'),
    { screenId: 'history-records' },
  );
  if (/story-strip|slot\.story-strip/.test(JSON.stringify(historyDraft.layoutDraft))) {
    fail('history-not-story fixture must not infer story-strip layout semantics');
  }
  const draftStageRules = historyDraft.skinDraft && historyDraft.skinDraft.meta && historyDraft.skinDraft.meta.draftStageRules;
  const semanticStage = Array.isArray(draftStageRules)
    ? draftStageRules.find((entry) => entry && entry.stage === 'semantic-extraction')
    : null;
  if (!semanticStage || !Array.isArray(semanticStage.ruleIds) || !semanticStage.ruleIds.includes('H2U-P4-014') || !semanticStage.testTags.includes('history-not-story')) {
    fail(`history-not-story fixture must carry semantic draftStageRules metadata: ${JSON.stringify(draftStageRules)}`);
  }

  for (const name of ['radial-slide-background.html', 'multi-layer-background.html']) {
    const draft = buildDraftFromHtml(
      fs.readFileSync(path.join(HTML_TO_UCUF_FIXTURE_DIR, name), 'utf8'),
      { screenId: name.replace(/\.html$/, '') },
    );
    if (!/backgroundLayers/.test(JSON.stringify(draft.skinDraft))) {
      fail(`${name} must preserve backgroundLayers in skin contract`);
    }
  }
  const repeatingGradientDraft = buildDraftFromHtml(`
    <div data-name="RepeatingStage">
      <div data-name="RepeatingPanel" style="width:100px;height:50px;background-image:repeating-linear-gradient(45deg, rgb(30, 16, 40), rgb(30, 16, 40) 6px, rgb(37, 24, 51) 6px, rgb(37, 24, 51) 12px)"></div>
    </div>`, { screenId: 'repeating-gradient-rect', bundle: 'ui_test' });
  const repeatingPanel = findNode(repeatingGradientDraft.layoutDraft, n => n.name === 'RepeatingPanel');
  const repeatingSlot = repeatingPanel && repeatingPanel.skinSlot && repeatingGradientDraft.skinDraft.slots[repeatingPanel.skinSlot];
  if (!repeatingSlot || repeatingSlot.kind !== 'gradient-rect' || repeatingSlot.gradient.repeating !== true) {
    fail(`repeating-linear-gradient should preserve top-level gradient.repeating: ${JSON.stringify(repeatingSlot)}`);
  }
  if (repeatingSlot.gradient.repeatSpanPx !== 12) {
    fail(`repeating-linear-gradient should preserve repeatSpanPx=12: ${JSON.stringify(repeatingSlot)}`);
  }
  if (repeatingSlot.gradient.stops[1]?.offset !== 0.5 || repeatingSlot.gradient.stops[2]?.offset !== 0.5) {
    fail(`repeating-linear-gradient should normalize px stops into repeat span offsets: ${JSON.stringify(repeatingSlot)}`);
  }
  if (!repeatingSlot.backgroundLayers || !repeatingSlot.backgroundLayers[0]?.gradient?.repeating) {
    fail(`repeating-linear-gradient should preserve backgroundLayers repeating metadata: ${JSON.stringify(repeatingSlot)}`);
  }
  if (repeatingSlot.backgroundLayers[0]?.gradient?.repeatSpanPx !== 12) {
    fail(`repeating-linear-gradient should preserve backgroundLayers repeatSpanPx=12: ${JSON.stringify(repeatingSlot)}`);
  }
  const absoluteBlockFlowDraft = buildDraftFromHtml(`
    <style>
      .caption-stack { position:absolute; left:10px; bottom:20px; }
      .chip { margin-bottom:12px; }
      .subtitle { margin-top:10px; }
    </style>
    <div data-name="AbsoluteStage" style="width:300px;height:200px;position:relative">
      <div data-name="CaptionStack" class="caption-stack">
        <div data-name="CaptionChip" class="chip">Chip</div>
        <div data-name="CaptionTitle">Title</div>
        <div data-name="CaptionSubtitle" class="subtitle">Subtitle</div>
      </div>
    </div>`, { screenId: 'absolute-block-flow', bundle: 'ui_test' });
  const captionStack = findNode(absoluteBlockFlowDraft.layoutDraft, n => n.name === 'CaptionStack');
  if (!captionStack || !captionStack.layout || captionStack.layout.type !== 'vertical') {
    fail(`position:absolute container should preserve normal-flow child vertical layout: ${JSON.stringify(captionStack)}`);
  }
  if (captionStack.layout.spacingY !== 12) {
    fail(`absolute block flow should infer child margin spacing, got ${JSON.stringify(captionStack.layout)}`);
  }
  const compoundSelectorDraft = buildDraftFromHtml(`
    <style>
      .slide { width: 100px; height: 50px; }
      .dot { width: 10px; height: 10px; }
      .slide.active { opacity: 1; }
      .dot.active { background: #D4AF37; }
    </style>
    <div data-name="CompoundStage">
      <div data-name="Slide" class="slide active"></div>
      <div data-name="Dot" class="dot active"></div>
    </div>`, { screenId: 'compound-selector', bundle: 'ui_test' });
  const compoundSlide = findNode(compoundSelectorDraft.layoutDraft, n => n.name === 'Slide');
  const compoundDot = findNode(compoundSelectorDraft.layoutDraft, n => n.name === 'Dot');
  if (!compoundSlide || compoundSlide.skinSlot || compoundSlide.type === 'panel') {
    fail(`compound selector .dot.active should not leak background into .slide.active: ${JSON.stringify(compoundSlide)}`);
  }
  const compoundDotSlot = compoundDot && compoundDot.skinSlot && compoundSelectorDraft.skinDraft.slots[compoundDot.skinSlot];
  if (!compoundDotSlot || compoundDotSlot.kind !== 'color-rect') {
    fail(`compound selector .dot.active should still apply to matching element: ${JSON.stringify({ compoundDot, compoundDotSlot })}`);
  }
  const opacityHiddenDraft = buildDraftFromHtml(`
    <div data-name="OpacityStage">
      <div data-name="InactiveOverlay" style="position:absolute;inset:0;width:100px;height:50px;opacity:0;background:#16061f"></div>
    </div>`, { screenId: 'opacity-hidden', bundle: 'ui_test' });
  const inactiveOverlay = findNode(opacityHiddenDraft.layoutDraft, n => n.name === 'InactiveOverlay');
  if (!inactiveOverlay || inactiveOverlay.opacity !== 0 || inactiveOverlay.active !== false) {
    fail(`opacity:0 node should be inactive by default while preserving opacity metadata: ${JSON.stringify(inactiveOverlay)}`);
  }
  ok('Plan4 fidelity fixtures exist and cover history/background regression cases');

  // R-P5-SEL-01: descendant/child/sibling selectors must surface as css-selector-not-applied warnings
  {
    const descendantDraft = buildDraftFromHtml(`
      <style>
        .panel .label { color: red; }
        .panel > .title { font-size: 18px; }
        .btn + .btn { margin-left: 8px; }
        .item ~ .item { border-top: 1px solid #ccc; }
        .simple { background: #D4AF37; }
      </style>
      <div data-name="SelectorStage" style="width:300px;height:200px;">
        <div data-name="SimpleEl" class="simple" style="width:100px;height:50px;"></div>
      </div>`, { screenId: 'selector-capability', bundle: 'ui_test' });
    const droppedWarnings = (descendantDraft.warnings || []).filter(w => w.code === 'css-selector-not-applied');
    if (droppedWarnings.length < 4) {
      fail(`R-P5-SEL-01: expected >=4 css-selector-not-applied warnings for descendant/child/sibling selectors, got ${droppedWarnings.length}: ${JSON.stringify(droppedWarnings)}`);
    }
    const kinds = droppedWarnings.map(w => w.kind);
    if (!kinds.includes('descendant')) fail(`R-P5-SEL-01: expected descendant kind in warnings, got ${JSON.stringify(kinds)}`);
    if (!kinds.includes('child-combinator')) fail(`R-P5-SEL-01: expected child-combinator kind in warnings, got ${JSON.stringify(kinds)}`);
    if (!kinds.includes('adjacent-sibling')) fail(`R-P5-SEL-01: expected adjacent-sibling kind in warnings, got ${JSON.stringify(kinds)}`);
    if (!kinds.includes('general-sibling')) fail(`R-P5-SEL-01: expected general-sibling kind in warnings, got ${JSON.stringify(kinds)}`);
    if (!descendantDraft.selectorCapabilitySummary || descendantDraft.selectorCapabilitySummary.droppedCount < 4) {
      fail(`R-P5-SEL-01: selectorCapabilitySummary.droppedCount should be >=4, got ${JSON.stringify(descendantDraft.selectorCapabilitySummary)}`);
    }
    const simpleEl = findNode(descendantDraft.layoutDraft, n => n.name === 'SimpleEl');
    const simpleSlot = simpleEl && simpleEl.skinSlot && descendantDraft.skinDraft.slots[simpleEl.skinSlot];
    if (!simpleSlot || simpleSlot.kind !== 'color-rect') {
      fail(`R-P5-SEL-01: simple .simple class selector should still apply; got ${JSON.stringify(simpleSlot)}`);
    }
    ok('Plan5 R-P5-SEL-01: descendant/child/sibling selectors surface as css-selector-not-applied warnings');
  }

  // Plan5 fixture: background-layers (css-semantics/background-layers)
  {
    const bgFixture = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, 'fixtures', 'css-semantics', 'background-layers.input.json'), 'utf8'
    ));
    const bgDraft = buildDraftFromHtml(bgFixture.html, bgFixture.opts);
    const skinJson = JSON.stringify(bgDraft.skinDraft);
    if (!/backgroundLayers/.test(skinJson)) {
      fail(`background-layers fixture: backgroundLayers must be preserved in skin contract, got slots: ${JSON.stringify(Object.keys(bgDraft.skinDraft.slots || {}))}`);
    }
    if (!/gradient-rect/.test(skinJson)) {
      fail(`background-layers fixture: expected gradient-rect kind in skin contract, got: ${skinJson.slice(0, 200)}`);
    }
    ok('Plan5 fixture: background-layers preserves backgroundLayers in skin contract');
  }

  // Plan5 fixture: layout-flex (css-semantics/layout-flex)
  {
    const flexFixture = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, 'fixtures', 'css-semantics', 'layout-flex.input.json'), 'utf8'
    ));
    const flexDraft = buildDraftFromHtml(flexFixture.html, flexFixture.opts);
    const flexRow = findNode(flexDraft.layoutDraft, n => n.name === 'FlexRow');
    if (!flexRow || !flexRow.layout || flexRow.layout.type !== 'horizontal') {
      fail(`layout-flex fixture: expected layout.type=horizontal, got ${JSON.stringify(flexRow && flexRow.layout)}`);
    }
    if (flexRow.layout.spacingX !== 12) {
      fail(`layout-flex fixture: expected layout.spacingX=12, got ${JSON.stringify(flexRow.layout)}`);
    }
    const flexChildren = (flexRow.children || []).filter(c => c.type !== undefined);
    if (flexChildren.length < 3) {
      fail(`layout-flex fixture: expected 3 child nodes, got ${flexChildren.length}`);
    }
    ok('Plan5 fixture: layout-flex horizontal layout with gap preserved');
  }

  withTempDir((tmp) => {
    const uiRoot = path.join(tmp, 'assets', 'resources', 'ui-spec');
    seedMinimalPlan4UiSpec(uiRoot, {
      skinSlot: {
        kind: 'gradient-rect',
        unsupportedLayerRisk: { summary: 'seeded unsupported layer' },
      },
    });
    const p = runValidateUiSpecs(tmp, uiRoot, 'formal-visual-risk-path,background-layer-preservation');
    if (isEnvironmentBlockedSpawn(p)) {
      validatorEnvironmentBlocked = true;
      ok('Plan4 validate-ui-specs visual-risk seed environment-blocked');
      return;
    }
    const validatorOutput = `${p.stdout || ''}\n${p.stderr || ''}\n${p.error ? p.error.message : ''}`;
    if (p.status === 0 || !/formal-visual-risk-path|background-layer-preservation/.test(validatorOutput)) {
      fail(`Plan4 validator must reject unresolved visual risk\nstatus=${p.status}\nerror=${p.error ? p.error.message : ''}\nstdout=${p.stdout || ''}\nstderr=${p.stderr || ''}`);
    }
  });

  withTempDir((tmp) => {
    const uiRoot = path.join(tmp, 'assets', 'resources', 'ui-spec');
    seedMinimalPlan4UiSpec(uiRoot, { withInteraction: true });
    const p = runValidateUiSpecs(tmp, uiRoot, 'runtime-interaction-smoke-path');
    if (isEnvironmentBlockedSpawn(p)) {
      validatorEnvironmentBlocked = true;
      ok('Plan4 validate-ui-specs interaction smoke seed environment-blocked');
      return;
    }
    if (p.status !== 0) {
      fail(`Plan4 runtime interaction smoke fixture should pass\nstatus=${p.status}\nerror=${p.error ? p.error.message : ''}\nstdout=${p.stdout || ''}\nstderr=${p.stderr || ''}`);
    }
  });
  ok(validatorEnvironmentBlocked
    ? 'Plan4 validate-ui-specs strict seed checks were environment-blocked'
    : 'Plan4 validate-ui-specs strict rules cover visual risk and runtime interaction smoke');

  withTempDir((tmp) => {
    seedPlan4Repo(tmp, {
      workflow: [
        'function syncFinalArtifactsToRuntime(paths) {',
        '  const sourcePath = firstExistingPath([sidecarPath(paths.finalLayout, suffix), sidecarPath(paths.rawLayout, suffix)]);',
        '  return sourcePath;',
        '}',
      ].join('\n'),
      draftBuilder: [
        'const DRAFT_BUILDER_STAGE_RULES = [];',
        'const hasStoryKey = /story|chronicle|storydock|story-strip|strip-wrap/.test(haystack);',
        'if (hasStoryKey) return { dataSlot: "slot.story-strip" };',
        'if (!gradient || gradient.type !== "linear") return null;',
      ].join('\n'),
      skill: 'Plan 4 docs/html_skill_plan4.md is the current execution spec.\n',
    });
    const report = runRuleGuard({ repoRoot: tmp, scanCore: true });
    assertRule(report, 'H2U-P4-014');
    assertRule(report, 'H2U-P4-015');
    assertRule(report, 'H2U-P4-016');
    assertRule(report, 'H2U-P4-017');
    assertRule(report, 'H2U-P4-020');
    ok('Plan4 fidelity contract catches story regex, gradient downgrade, and raw sidecar fallback');
  });

  withTempDir((tmp) => {
    seedPlan4Repo(tmp, {
      workflow: [
        'function buildRuntimeInteractionSmokeStep(paths) {',
        '  const interactionPath = firstExistingPath([sidecarPath(paths.finalLayout, ".interaction.json"), sidecarPath(paths.rawLayout, ".interaction.json")]);',
        '  return interactionPath;',
        '}',
        'function syncFinalArtifactsToRuntime(paths) {',
        '  const sourcePath = firstExistingPath([sidecarPath(paths.finalLayout, suffix)]);',
        '  return sourcePath;',
        '}',
      ].join('\n'),
      draftBuilder: 'const DRAFT_BUILDER_STAGE_RULES = [];',
      skill: 'current execution spec docs/html_skill_plan5.md and tools_node/lib/html-to-ucuf/rule-registry.json\n',
    });
    const report = runRuleGuard({ repoRoot: tmp, scanCore: true });
    assertNoRule(report, 'H2U-P4-020');
    ok('Plan4 fidelity contract ignores dry-run raw sidecar fallback outside runtime sync');
  });

  const missingVisual = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
      interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
    },
  });
  assertRule(missingVisual, 'H2U-P4-019');

  const missingInteractionSmoke = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    sourceHtml: '<button data-ucuf-action="tabSwitch" data-target="next">Next</button>',
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
      visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
      interactionRuntime: { required: true, status: 'not-run', actionsBound: 0, smokeResults: [] },
    },
  });
  assertRule(missingInteractionSmoke, 'H2U-P4-018');

  const missingPlan5Diagnosis = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
      visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
      interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
      metrics: {
        compare: { adjustedCoverage: 0.97 },
        htmlCocos: { runtimeVsSource: { adjustedScore: 0.55, verdict: 'fail' } }
      },
      verdict: { workflowPass: true },
      nextFixes: []
    }
  });
  assertRule(missingPlan5Diagnosis, 'H2U-P5-003');
  assertRule(missingPlan5Diagnosis, 'H2U-P5-004');

  const missingFourDimensionGate = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
      visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
      interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
      metrics: {
        compare: { adjustedCoverage: 0.97 },
        htmlCocos: { runtimeVsSource: { adjustedScore: 0.96, verdict: 'pass' } }
      },
      verdict: { workflowPass: true },
      nextFixes: ['emit per-dimension fidelity verdicts']
    }
  });
  assertRule(missingFourDimensionGate, 'H2U-P5-F001');

  withTempDir((tmp) => {
    const missingZoneOwnershipPath = path.join(tmp, 'missing.zone-ownership.json');
    fs.writeFileSync(missingZoneOwnershipPath, JSON.stringify({
      screenId: 'gacha-ds3',
      zones: [
        { id: 'zone-1', zoneId: 'banner-bg-fill', excludedFromScore: true }
      ]
    }, null, 2), 'utf8');

    const missingRegistryRef = runRuleGuard({
      repoRoot: REPO_ROOT,
      scanCore: false,
      workflowSummary: {
        debugOnly: false,
        sourcePackage: formalPackage,
        steps: [],
        runtimeAuthority: { authority: 'synced-final-runtime-json' },
        visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
        interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
        fidelityDimensions: passedFidelityDimensions,
        metrics: {
          compare: { adjustedCoverage: 0.97 },
          htmlCocos: { runtimeVsSource: { adjustedScore: 0.96, verdict: 'pass' } }
        },
        verdict: { workflowPass: true },
        nextFixes: [],
        paths: { zoneOwnership: missingZoneOwnershipPath }
      }
    });
    assertRule(missingRegistryRef, 'H2U-P5-F002');
  });

  withTempDir((tmp) => {
    const knownGapZoneOwnershipPath = path.join(tmp, 'known-gap.zone-ownership.json');
    fs.writeFileSync(knownGapZoneOwnershipPath, JSON.stringify({
      screenId: 'gacha-ds3',
      zones: [
        { id: 'zone-1', zoneId: 'history-records', knownGapRef: 'KG-001' },
        { id: 'zone-2', zoneId: 'banner-bg-fill', excludedFromScore: true, knownGapRef: 'KG-002' },
        { id: 'zone-3', zoneId: 'interaction-carousel', excludedFromScore: true, knownGapRef: 'KG-003' }
      ]
    }, null, 2), 'utf8');

    const knownGapPass = runRuleGuard({
      repoRoot: REPO_ROOT,
      scanCore: false,
      workflowSummary: {
        debugOnly: false,
        sourcePackage: formalPackage,
        steps: [],
        runtimeAuthority: { authority: 'synced-final-runtime-json' },
        visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
        interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
        fidelityDimensions: passedFidelityDimensions,
        metrics: {
          compare: { adjustedCoverage: 0.97 },
          htmlCocos: { runtimeVsSource: { adjustedScore: 0.96, verdict: 'pass' } }
        },
        verdict: { workflowPass: true },
        nextFixes: [],
        paths: { zoneOwnership: knownGapZoneOwnershipPath }
      }
    });
    if (knownGapPass.violations.some((violation) => violation.ruleId === 'H2U-P5-F002')) {
      fail(`known gaps with registry refs must not trip H2U-P5-F002: ${JSON.stringify(knownGapPass.violations, null, 2)}`);
    }
  });
  ok('Plan5 fidelity contract enforces four-dimension gates and registry-backed known gaps');

  // Plan5 authority chain: spec-hash-tracking fixture must have specHashes with required keys
  {
    const authFixture = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, 'fixtures', 'authority-chain', 'spec-hash-tracking.input.json'), 'utf8'
    ));
    const sh = authFixture.workflowSummary && authFixture.workflowSummary.specHashes;
    if (!sh || typeof sh !== 'object') {
      fail('authority-chain fixture: specHashes missing from workflow summary');
    }
    for (const key of ['rawLayout', 'rawSkin', 'finalLayout', 'finalSkin', 'runtimeLayout', 'runtimeSkin']) {
      if (!Object.prototype.hasOwnProperty.call(sh, key)) {
        fail(`authority-chain fixture: specHashes missing key "${key}"`);
      }
    }
    ok('Plan5 authority-chain fixture: specHashes covers raw/final/runtime keys');
  }

  // Plan5 R-P5-AUTH-01: source-authority-chain rule fires when runtimeAuthority is missing/wrong
  withTempDir((tmp) => {
    const uiRoot = path.join(tmp, 'assets', 'resources', 'ui-spec');
    seedMinimalPlan4UiSpec(uiRoot);
    // Override screen to have wrong runtimeAuthority
    const screenPath = path.join(uiRoot, 'screens', 'plan4-test.json');
    const screen = JSON.parse(fs.readFileSync(screenPath, 'utf8'));
    screen.meta = { htmlToUcufPlan4: true, runtimeAuthority: 'debug-local-final-json' };
    fs.writeFileSync(screenPath, JSON.stringify(screen, null, 2), 'utf8');
    const p = runValidateUiSpecs(tmp, uiRoot, 'source-authority-chain');
    if (isEnvironmentBlockedSpawn(p)) {
      ok('Plan5 source-authority-chain rule: environment-blocked');
      return;
    }
    const validatorOutput = `${p.stdout || ''}\n${p.stderr || ''}`;
    if (!/source-authority-chain/.test(validatorOutput)) {
      fail(`Plan5 source-authority-chain rule must fire for debug-local-final-json screens\nstdout=${p.stdout || ''}\nstderr=${p.stderr || ''}`);
    }
    ok('Plan5 R-P5-AUTH-01: source-authority-chain fires for debug-local screens');
  });

  // Plan5 R-P5-AUTH-02: local-tokens-present rule fires when local-tokens sidecar is missing
  withTempDir((tmp) => {
    const uiRoot = path.join(tmp, 'assets', 'resources', 'ui-spec');
    seedMinimalPlan4UiSpec(uiRoot);
    // Override screen to have synced authority but no local-tokens file
    const screenPath = path.join(uiRoot, 'screens', 'plan4-test.json');
    const screen = JSON.parse(fs.readFileSync(screenPath, 'utf8'));
    screen.meta = { htmlToUcufPlan4: true, runtimeAuthority: 'synced-final-runtime-json' };
    fs.writeFileSync(screenPath, JSON.stringify(screen, null, 2), 'utf8');
    const p = runValidateUiSpecs(tmp, uiRoot, 'local-tokens-present');
    if (isEnvironmentBlockedSpawn(p)) {
      ok('Plan5 local-tokens-present rule: environment-blocked');
      return;
    }
    const validatorOutput = `${p.stdout || ''}\n${p.stderr || ''}`;
    if (!/local-tokens-present/.test(validatorOutput)) {
      fail(`Plan5 local-tokens-present rule must fire when local-tokens sidecar is absent\nstdout=${p.stdout || ''}\nstderr=${p.stderr || ''}`);
    }
    ok('Plan5 R-P5-AUTH-02: local-tokens-present fires when sidecar is missing');
  });

  const pass = runRuleGuard({
    repoRoot: REPO_ROOT,
    scanCore: false,
    sourceHtml: '<div class="history-panel">History only, not a story strip.</div>',
    workflowSummary: {
      debugOnly: false,
      sourcePackage: formalPackage,
      steps: [],
      runtimeAuthority: { authority: 'synced-final-runtime-json' },
      visualFidelityRisk: { status: 'pass', blockerCount: 0, violations: [] },
      interactionRuntime: { required: false, status: 'pass', actionsBound: 0, smokeResults: [] },
    },
  });
  if (pass.violations.some(v => ['H2U-P4-014', 'H2U-P4-015', 'H2U-P4-018', 'H2U-P4-019'].includes(v.ruleId))) {
    fail(`history-only formal summary should not trip fidelity rules: ${JSON.stringify(pass.violations, null, 2)}`);
  }
  ok('Plan4 fidelity contract covers visual risk and runtime interaction summary gates');
}

function seedPlan4Repo(root, files) {
  const map = {
    'tools_node/run-html-to-ucuf-workflow.js': files.workflow || '',
    'tools_node/render-html-tab-fragments.js': files.renderTabs || '',
    'tools_node/lib/dom-to-ui/sidecar-emitters.js': files.sidecar || '',
    'tools_node/lib/dom-to-ui/readiness-gate.js': files.readiness || '',
    'tools_node/lib/dom-to-ui/draft-builder.js': files.draftBuilder || '',
    'tools_node/validate-ui-specs.js': files.validator || '',
    '.github/skills/html-to-ucuf/SKILL.md': files.skill || '',
  };
  for (const [relPath, content] of Object.entries(map)) {
    const filePath = path.join(root, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function runValidateUiSpecs(projectRoot, uiRoot, rules) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'tools_node', 'validate-ui-specs.js'),
    '--project-root', projectRoot,
    '--ui-spec-root', uiRoot,
    '--strict',
    '--rules', rules,
  ], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }),
  });
}

function isEnvironmentBlockedSpawn(proc) {
  return !!(proc && proc.error && /EPERM|EACCES|spawnSync/i.test(proc.error.message || ''));
}

function seedMinimalPlan4UiSpec(uiRoot, options = {}) {
  const dirs = ['layouts', 'skins', 'screens', 'fragments/layouts', 'contracts', 'content', 'recipes/families'];
  for (const dir of dirs) fs.mkdirSync(path.join(uiRoot, dir), { recursive: true });
  fs.writeFileSync(path.join(uiRoot, 'layouts', 'plan4-test.json'), JSON.stringify({
    id: 'plan4-test',
    version: 1,
    canvas: { fitWidth: true, fitHeight: true, safeArea: true, designWidth: 1920, designHeight: 1080 },
    root: {
      type: 'container',
      name: 'Root',
      children: [
        { type: 'button', id: 'TabButton', name: 'TabButton', skinSlot: 'tabButton' },
        { type: 'container', name: 'PanelHost', lazySlot: true, defaultFragment: 'fragments/layouts/plan4-fragment' },
      ],
    },
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(uiRoot, 'fragments', 'layouts', 'plan4-fragment.json'), JSON.stringify({
    type: 'container',
    name: 'Plan4FragmentRoot',
    widget: { top: 0, left: 0, right: 0, bottom: 0 },
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(uiRoot, 'skins', 'plan4-test.skin.json'), JSON.stringify({
    id: 'plan4-test.skin',
    version: 1,
    slots: {
      panel: options.skinSlot || { kind: 'color', color: '#000000' },
      tabButton: { kind: 'button-skin', normal: 'sprites/test/normal', selected: 'sprites/test/selected' },
    },
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(uiRoot, 'screens', 'plan4-test.json'), JSON.stringify({
    id: 'plan4-test',
    version: 1,
    uiId: 'Plan4Test',
    layer: 'Popup',
    bundle: 'resources',
    layout: 'plan4-test',
    skin: 'plan4-test.skin',
    meta: { htmlToUcufPlan4: true },
    tabRouting: {
      Overview: { slotId: 'PanelHost', fragment: 'fragments/layouts/plan4-fragment' },
    },
  }, null, 2), 'utf8');
  if (options.withInteraction) {
    fs.writeFileSync(path.join(uiRoot, 'screens', 'plan4-test.interaction.json'), JSON.stringify({
      screenId: 'plan4-test',
      actions: [{
        id: 'tab-button.overview',
        trigger: 'TabButton',
        event: 'click',
        type: 'tabSwitch',
        target: 'overview',
        smoke: { expectActiveTab: 'overview' },
      }],
    }, null, 2), 'utf8');
    fs.writeFileSync(path.join(uiRoot, 'screens', 'plan4-test.tab-routing.json'), JSON.stringify({
      screenId: 'plan4-test',
      tabs: [{
        id: 'Overview',
        mount: 'PanelHost',
        fragment: 'fragments/layouts/plan4-fragment',
        buttonNode: 'TabButton',
      }],
    }, null, 2), 'utf8');
  }
}

function assertRule(report, ruleId) {
  if (!report || !Array.isArray(report.violations) || !report.violations.some(v => v.ruleId === ruleId)) {
    fail(`expected ${ruleId}, got ${JSON.stringify(report && report.violations || [], null, 2)}`);
  }
}

function assertNoRule(report, ruleId) {
  if (report && Array.isArray(report.violations) && report.violations.some(v => v.ruleId === ruleId)) {
    fail(`did not expect ${ruleId}, got ${JSON.stringify(report.violations, null, 2)}`);
  }
}

function findNode(root, pred) {
  if (root && root.root && typeof root.root === 'object' && typeof root.root.type === 'string') {
    root = root.root;
  }
  if (!root || typeof root !== 'object') return null;
  if (pred(root)) return root;
  for (const c of root.children || []) {
    const hit = findNode(c, pred);
    if (hit) return hit;
  }
  return null;
}

function collectNodes(root, pred, acc) {
  if (!acc && root && root.root && typeof root.root === 'object' && typeof root.root.type === 'string') {
    root = root.root;
  }
  acc = acc || [];
  if (!root || typeof root !== 'object') return acc;
  if (pred(root)) acc.push(root);
  for (const c of root.children || []) collectNodes(c, pred, acc);
  return acc;
}

function writeSolidPng(filePath, width, height, rgba) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = rgba[3];
    }
  }
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function paintPngRect(filePath, rect, rgba) {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      const idx = (y * png.width + x) * 4;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = rgba[3];
    }
  }
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
