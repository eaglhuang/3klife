const fs = require('fs');
const childProcess = require('child_process');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/core/src/guidance/source-inventory-service.ts',
  'packages/core/src/guidance/candidate-ranking-signal-model.ts',
  'packages/core/src/guidance/candidates-rank-service.ts',
  'packages/cli/src/commands/candidates.ts',
  'tests/atm-lang-0400-0402.test.ts',
  'tests/fixtures/language-candidates-ranking/ranking-fixtures.json',
];

const REQUIRED_SNIPPETS = [
  {
    path: 'packages/core/src/guidance/source-inventory-service.ts',
    snippets: ['collectCandidateSourceInventory', 'defaultSourceInventoryArtifactPath'],
  },
  {
    path: 'packages/core/src/guidance/candidate-ranking-signal-model.ts',
    snippets: ['buildCandidateRankingSignalModel', 'Unsupported signal IDs (advisory)'],
  },
  {
    path: 'packages/core/src/guidance/candidates-rank-service.ts',
    snippets: ['rankCandidatesWithAdapter', 'inventoryArtifactPath'],
  },
  {
    path: 'packages/cli/src/commands/candidates.ts',
    snippets: ['candidatesRank', 'rankCandidatesWithAdapter'],
  },
];

const CHAINED_VALIDATORS = [
  'scripts/validate-plugin-sdk.ts',
  'scripts/validate-guidance.ts',
  'scripts/roadmap-traceability-check.ts',
  'scripts/atom-map-coverage-check.ts',
  'scripts/script-facade-boundary.ts',
  'scripts/validate-neutrality.ts',
];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function checkRequiredFiles(failures) {
  for (const relativePath of REQUIRED_FILES) {
    const fullPath = repoPath(relativePath);
    ensure(fs.existsSync(fullPath), `missing required file: ${relativePath}`, failures);
  }
}

function checkRequiredSnippets(failures) {
  for (const item of REQUIRED_SNIPPETS) {
    const fullPath = repoPath(item.path);
    if (!fs.existsSync(fullPath)) {
      failures.push(`cannot check snippets; file missing: ${item.path}`);
      continue;
    }
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const snippet of item.snippets) {
      ensure(text.includes(snippet), `missing snippet in ${item.path}: ${snippet}`, failures);
    }
  }
}

function runValidator(relativePath, mode) {
  const fullPath = repoPath(relativePath);
  const result = childProcess.spawnSync(process.execPath, [fullPath, '--mode', mode], {
    cwd: repoPath(),
    stdio: 'inherit',
  });
  return result.status === 0;
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-guide] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  checkRequiredFiles(failures);
  checkRequiredSnippets(failures);

  if (failures.length > 0) {
    console.error('[validate-guide] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  let allPassed = true;
  for (const validatorPath of CHAINED_VALIDATORS) {
    console.log(`[validate-guide] running ${validatorPath}`);
    const passed = runValidator(validatorPath, mode);
    allPassed = allPassed && passed;
  }

  const summary = {
    requiredFileCount: REQUIRED_FILES.length,
    requiredSnippetCount: REQUIRED_SNIPPETS.reduce((acc, item) => acc + item.snippets.length, 0),
    validatorCount: CHAINED_VALIDATORS.length,
    validators: CHAINED_VALIDATORS,
  };

  if (!allPassed) {
    console.error('[validate-guide] FAIL');
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[validate-guide] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
