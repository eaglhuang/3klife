#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  extractFunctions,
  buildCandidate,
  buildAnchorDescriptor,
  loadPolicyStack,
  runScan,
  runScaffold,
  runValidate,
  runDemandPolice,
  runPromote,
} = require('../atm-atomize');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atm-atomize-test-'));
const workbenchRoot = path.join(tempRoot, 'atomic_workbench');
const policyRoot = path.join(workbenchRoot, 'policies');
const fixtureFile = path.join(tempRoot, 'fixture.js');
const reportPath = path.join(tempRoot, 'candidates.json');

fs.mkdirSync(policyRoot, { recursive: true });
fs.writeFileSync(path.join(policyRoot, 'capsule-governance.policy.json'), JSON.stringify({
  thresholds: {
    functionLinesWarn: 10,
    familyPromotionMinCount: 2,
  },
}, null, 2), 'utf8');
fs.writeFileSync(path.join(policyRoot, 'capsule-governance.hook.cjs'), [
  "module.exports = function applyCapsulePolicy(context) {",
  "  if (context.candidate.symbolName === 'writeThing') {",
  "    return {",
  "      overrides: {",
  "        splitPolicy: 'sealed',",
  "        splitPolicyReason: 'io-bundle',",
  "      },",
  "      findings: [{ severity: 'info', message: 'writeThing sealed by test hook' }],",
  "    };",
  "  }",
  "  return { overrides: {}, findings: [] };",
  "};",
  "",
].join('\n'), 'utf8');

const fixtureLines = [
  "'use strict';",
  '',
  'function parseThing(raw) {',
  "  return String(raw || '').trim().split(',').filter(Boolean);",
  '}',
  '',
  'function writeThing(filePath, value) {',
  '  const fs = require("node:fs");',
  '  fs.writeFileSync(filePath, value);',
  '  return true;',
  '}',
  '',
  'function processElement(input) {',
  '  let total = 0;',
];
for (let index = 0; index < 260; index += 1) {
  fixtureLines.push(`  total += ${index};`);
}
fixtureLines.push('  return total + String(input || "").length;');
fixtureLines.push('}');
fixtureLines.push('');
fixtureLines.push('module.exports = {');
fixtureLines.push('  parseThing,');
fixtureLines.push('};');
fixtureLines.push('');
fs.writeFileSync(fixtureFile, fixtureLines.join('\n'), 'utf8');

const { policy, defaultPolicy, projectPolicy, hookPath } = loadPolicyStack({
  workbenchRoot,
  policy: null,
  policyHook: null,
});
assert.equal(policy.thresholds.functionLinesWarn, 10, 'project policy overrides default threshold');

const functions = extractFunctions(fixtureFile);
assert.equal(functions.length, 3, 'detect named functions');
const anchor = buildAnchorDescriptor(fixtureFile, policy);

const parseCandidate = buildCandidate(functions.find((item) => item.symbolName === 'parseThing'), {
  policy,
  defaultPolicy,
  projectPolicy,
  hookPath,
  anchor,
});
assert.equal(parseCandidate.exported, true, 'module.exports marks exported function');
assert.equal(parseCandidate.recommendedTier, 'governed-atom', 'exported pure parser is governed candidate');
assert.deepEqual(parseCandidate.requiredCaseSets, ['base', 'boundary', 'invalid'], 'candidate gets behavior template requirement');

const sideEffectCandidate = buildCandidate(functions.find((item) => item.symbolName === 'writeThing'), {
  policy,
  defaultPolicy,
  projectPolicy,
  hookPath,
  anchor,
});
assert.equal(sideEffectCandidate.recommendedTier, 'local-capsule', 'side effect helper stays local');
assert.ok(sideEffectCandidate.reasons.includes('side-effect-risk'), 'side effect reason');
assert.equal(sideEffectCandidate.splitPolicy, 'sealed', 'policy hook can seal a capsule');
assert.ok(sideEffectCandidate.requiredCaseSets.includes('boundary'), 'side effect risk requires boundary cases');
assert.ok(sideEffectCandidate.requiredCaseSets.includes('invalid'), 'side effect risk requires invalid cases');

const releaseBlockerCandidate = buildCandidate(functions.find((item) => item.symbolName === 'processElement'), {
  policy,
  defaultPolicy,
  projectPolicy,
  hookPath,
  anchor,
});
assert.equal(releaseBlockerCandidate.severity, 'block-release', 'large function becomes release blocker');
assert.ok(releaseBlockerCandidate.requiredCaseSets.includes('regression'), 'release blocker requires regression template');

const scanReport = runScan({
  command: 'scan',
  files: [fixtureFile],
  changed: false,
  report: reportPath,
  workbenchRoot,
});
assert.equal(scanReport.candidateCount, 3, 'scan emits candidates');
assert.equal(scanReport.anchors.length, 1, 'scan emits one source anchor');
assert.equal(scanReport.thresholds.functionLinesWarn, 10, 'scan uses merged project threshold');
assert.ok(fs.existsSync(reportPath), 'scan report written');

const scaffoldReport = runScaffold({
  candidateReport: reportPath,
  report: reportPath,
  workbenchRoot,
});
assert.equal(scaffoldReport.created.length, 3, 'scaffold emits capsule metadata');
assert.equal(scaffoldReport.createdAnchors.length, 1, 'scaffold emits anchor metadata');
assert.ok(fs.existsSync(path.join(workbenchRoot, 'capsules', 'parse-thing', 'tests', 'base.cases.json')), 'candidate base cases generated');
assert.ok(fs.existsSync(path.join(workbenchRoot, 'capsules', 'process-element', 'tests', 'regression.cases.json')), 'release blocker regression cases generated');
assert.ok(fs.existsSync(path.join(workbenchRoot, 'anchors', anchor.moduleSlug, 'anchor.manifest.json')), 'anchor manifest generated');

const validateReport = runValidate({
  workbenchRoot,
});
assert.equal(validateReport.passed, true, 'scaffolded capsule tests pass');
assert.equal(validateReport.total, 4, 'capsules plus anchor validated');

const demandPoliceReport = runDemandPolice({
  workbenchRoot,
});
assert.equal(demandPoliceReport.passed, true, 'demand police passes on clean scaffold');

const promoteReport = runPromote({
  workbenchRoot,
  capsuleId: 'H2U-CAPSULE-PARSE-THING',
  targetTier: 'governed-atom',
});
assert.equal(promoteReport.promotedTo, 'governed-atom', 'candidate can promote to governed atom');
const promotedManifest = JSON.parse(fs.readFileSync(path.join(workbenchRoot, 'capsules', 'parse-thing', 'capsule.manifest.json'), 'utf8'));
assert.equal(promotedManifest.promotion.currentTier, 'governed-atom', 'promotion current tier updated');
const registry = JSON.parse(fs.readFileSync(path.join(tempRoot, 'atomic-registry.json'), 'utf8'));
assert.ok(Array.isArray(registry.anchors) && registry.anchors.length === 1, 'registry records anchors');
assert.ok(Array.isArray(registry.capsules) && registry.capsules.some((item) => item.capsuleId === 'H2U-CAPSULE-PARSE-THING'), 'registry records promoted capsule');

console.log('atm-atomize tests passed');
