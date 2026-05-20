const fs = require('fs');
const path = require('path');

const SDK_FILE = 'packages/plugin-sdk/src/language-adapter.ts';
const REQUIRED_SNIPPETS = [
  'interface LanguageAdapter<',
  'detectProjectProfile(repositoryRoot: string)',
  'validateComputeAtom(request: ValidateRequest)',
  'interface LanguageAdapterV2<',
  "readonly contractVersion?: 'v2';",
  'readonly capabilities?: LanguageAdapterCapabilitySet;',
  'scanSourceInventory?(',
  'planAtomizeDryRun?(',
  'planInfectDryRun?(',
  'detectRuntimeCommands?(',
  'parseDiagnostics?(',
  'computeEquivalenceContract?(',
  'buildAtomicMapDecomposition?(',
];

const REQUIRED_SCHEMA_FILES = [
  'schemas/language-source-inventory.schema.json',
  'schemas/language-symbol-range-reference.schema.json',
  'schemas/language-diagnostics.schema.json',
  'schemas/language-runtime-commands.schema.json',
  'schemas/language-equivalence-fixture.schema.json',
  'schemas/language-dry-run-evidence-envelope.schema.json',
];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const sdkPath = path.join(repoRoot, SDK_FILE);
  const failures = [];

  ensure(fs.existsSync(sdkPath), `missing SDK contract file: ${SDK_FILE}`, failures);
  if (!fs.existsSync(sdkPath)) {
    console.error('[validate-plugin-sdk] FAIL');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }

  const text = fs.readFileSync(sdkPath, 'utf8');
  for (const snippet of REQUIRED_SNIPPETS) {
    ensure(text.includes(snippet), `SDK contract missing snippet: ${snippet}`, failures);
  }

  for (const relPath of REQUIRED_SCHEMA_FILES) {
    const fullPath = path.join(repoRoot, relPath);
    ensure(fs.existsSync(fullPath), `missing schema dependency: ${relPath}`, failures);
  }

  if (failures.length > 0) {
    console.error('[validate-plugin-sdk] FAIL');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }

  console.log('[validate-plugin-sdk] PASS');
  console.log(
    JSON.stringify(
      {
        sdkFile: path.resolve(sdkPath),
        checkedSnippets: REQUIRED_SNIPPETS.length,
        schemaDependencies: REQUIRED_SCHEMA_FILES.length,
      },
      null,
      2
    )
  );
}

main();

