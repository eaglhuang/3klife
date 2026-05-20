const childProcess = require('child_process');
const path = require('path');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const VALIDATORS = [
  { path: 'scripts/validate-plugin-sdk.ts', args: [] },
  { path: 'scripts/validate-schemas.ts', args: [] },
  { path: 'scripts/validate-guidance.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/validate-python-adapter.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/validate-language-js.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/validate-language-csharp.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/validate-map-curator.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/roadmap-traceability-check.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/atom-map-coverage-check.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/script-facade-boundary.ts', args: ['--mode', 'validate'] },
  { path: 'scripts/validate-neutrality.ts', args: ['--mode', 'validate'] },
];

function runValidator(entry) {
  const fullPath = repoPath(entry.path);
  console.log(`[validate-full] running ${entry.path}`);
  const result = childProcess.spawnSync(process.execPath, [fullPath, ...entry.args], {
    cwd: repoPath(),
    stdio: 'inherit',
  });
  return {
    path: entry.path,
    status: result.status,
    ok: result.status === 0,
  };
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-full] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const results = VALIDATORS.map(runValidator);
  const failed = results.filter((result) => !result.ok);
  const summary = {
    repoRoot: path.resolve(repoPath()),
    validatorCount: VALIDATORS.length,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
    failedValidators: failed.map((result) => result.path),
  };

  if (failed.length > 0) {
    console.error('[validate-full] FAIL');
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[validate-full] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
