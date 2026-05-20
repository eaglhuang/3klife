const path = require('path');

const {
  collectTableRows,
  parseMode,
  readLines,
  readText,
} = require('./atm-lang-validator-common.ts');

const PLAN_PATH = 'docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md';
const COMPANION_PATH = 'docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md';

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function lineIsNegatedOfficialClaim(line) {
  return /no official|not official|does not declare|do not promote/i.test(line)
    || line.includes('不交付 official')
    || line.includes('不宣稱')
    || line.includes('不是');
}

function collectUnsafeOfficialClaims(label, lines) {
  const findings = [];
  const pattern = /\b(Go|Java|C#|CSharp|PHP)\b.*\bofficial\b|\bofficial\b.*\b(Go|Java|C#|CSharp|PHP)\b/i;
  lines.forEach((line, index) => {
    if (pattern.test(line) && !lineIsNegatedOfficialClaim(line)) {
      findings.push(`${label}:${index + 1}: ${line.trim()}`);
    }
  });
  return findings;
}

function collectPrivateProjectLeaks(label, lines) {
  const findings = [];
  const privateTerms = ['3KLife', 'npc-brain'];
  lines.forEach((line, index) => {
    for (const term of privateTerms) {
      if (!line.includes(term)) continue;
      const allowed =
        line.includes('不把')
        || line.includes('non_goals')
        || line.includes('repo 保留')
        || line.includes('防止把')
        || line.includes('No host project')
        || line.includes('host project');
      if (!allowed) {
        findings.push(`${label}:${index + 1}: private project term "${term}" appears in public contract text`);
      }
    }
  });
  return findings;
}

function parseValidatorOwnershipRows() {
  const lines = readLines(PLAN_PATH);
  return collectTableRows(
    lines,
    /^\| Validator \| Tables Checked \| Failure Mode \| Command \|$/,
    /^\|\s*`[^`]+`\s*\|/
  ).map((cells) => ({
    validator: cells[0].replace(/`/g, ''),
    tablesChecked: cells[1],
    failureMode: cells[2],
    command: cells[3].replace(/`/g, ''),
  }));
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-neutrality] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const planText = readText(PLAN_PATH);
  const companionText = readText(COMPANION_PATH);
  const planLines = planText.split(/\r?\n/);
  const companionLines = companionText.split(/\r?\n/);
  const ownershipRows = parseValidatorOwnershipRows();

  ensure(planText.includes('core 去語言特例'), 'Chinese plan must explicitly keep ATM core language-neutral.', failures);
  ensure(planText.includes('不把 3KLife、npc-brain 或任何採用者專案語意寫成 ATM 官方 contract'), 'Chinese plan must prohibit adopter semantics in official ATM contracts.', failures);
  ensure(companionText.includes('It is not a translation of the Chinese roadmap'), 'English companion must declare its canonical guide role.', failures);
  ensure(companionText.includes('advisory example only'), 'English companion must keep Go as advisory.', failures);
  ensure(companionText.includes('Do not promote any language from `Advisory`, `Future`, or `RFC` to `Official`'), 'English companion must block premature Official promotion.', failures);
  ensure(['Official', 'Advisory', 'Future', 'RFC'].every((status) => companionText.includes(`| ${status} |`)), 'English companion must define Official/Advisory/Future/RFC statuses.', failures);

  const officialFindings = [
    ...collectUnsafeOfficialClaims(PLAN_PATH, planLines),
    ...collectUnsafeOfficialClaims(COMPANION_PATH, companionLines),
  ];
  const privateLeakFindings = [
    ...collectPrivateProjectLeaks(PLAN_PATH, planLines),
    ...collectPrivateProjectLeaks(COMPANION_PATH, companionLines),
  ];

  for (const finding of officialFindings) {
    failures.push(`unsafe official-support claim: ${finding}`);
  }
  for (const finding of privateLeakFindings) {
    failures.push(`private project leak: ${finding}`);
  }

  ensure(ownershipRows.length >= 5, `validator ownership matrix must include at least 5 rows, got ${ownershipRows.length}`, failures);
  const validators = new Set(ownershipRows.map((row) => row.validator));
  for (const requiredValidator of [
    'scripts/roadmap-traceability-check.ts',
    'scripts/atom-map-coverage-check.ts',
    'scripts/script-facade-boundary.ts',
    'scripts/validate-neutrality.ts',
    'scripts/validate-full.ts',
  ]) {
    ensure(validators.has(requiredValidator), `validator ownership matrix missing ${requiredValidator}`, failures);
  }

  const summary = {
    planPath: path.resolve(path.join(__dirname, '..', PLAN_PATH)),
    companionPath: path.resolve(path.join(__dirname, '..', COMPANION_PATH)),
    officialClaimFindings: officialFindings.length,
    privateProjectLeakFindings: privateLeakFindings.length,
    validatorOwnershipRows: ownershipRows.length,
  };

  if (failures.length > 0) {
    console.error('[validate-neutrality] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[validate-neutrality] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
