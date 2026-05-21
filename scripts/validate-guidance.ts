const fs = require('fs');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/core/src/guidance/legacy-route-delegation.ts',
  'packages/core/src/guidance/language-adapter-resolver.ts',
  'packages/core/src/guidance/language-adapter-fallback.ts',
  'tests/atm-lang-0300-0302.test.ts',
  'tests/fixtures/language-route-planning/delegated-and-fallback.json',
];

const REQUIRED_SNIPPETS = [
  'export async function planLegacyRouteWithAdapter',
  'buildGenericFallbackRoutePlan',
  "mode: 'adapter-delegated'",
  "mode: 'generic-fallback'",
];

const FORBIDDEN_LANGUAGE_WORDS = ['python', 'java', 'c#', 'csharp', 'go', 'php'];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-guidance] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const checkedFiles = [];

  for (const relativePath of REQUIRED_FILES) {
    const fullPath = repoPath(relativePath);
    ensure(fs.existsSync(fullPath), `missing required file: ${relativePath}`, failures);
    if (fs.existsSync(fullPath)) {
      checkedFiles.push(relativePath);
    }
  }

  const delegationPath = repoPath('packages/core/src/guidance/legacy-route-delegation.ts');
  if (fs.existsSync(delegationPath)) {
    const text = fs.readFileSync(delegationPath, 'utf8');
    for (const snippet of REQUIRED_SNIPPETS) {
      ensure(text.includes(snippet), `legacy-route-delegation missing snippet: ${snippet}`, failures);
    }
    for (const word of FORBIDDEN_LANGUAGE_WORDS) {
      const pattern = new RegExp(`\\b${word.replace('#', '\\#')}\\b`, 'i');
      ensure(
        !pattern.test(text),
        `legacy-route-delegation contains language-specific ownership token: ${word}`,
        failures
      );
    }
  }

  const summary = {
    checkedFiles,
    requiredFileCount: REQUIRED_FILES.length,
    snippetCount: REQUIRED_SNIPPETS.length,
    forbiddenWordCount: FORBIDDEN_LANGUAGE_WORDS.length,
  };

  if (failures.length > 0) {
    console.error('[validate-guidance] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[validate-guidance] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();

