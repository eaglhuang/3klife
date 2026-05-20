const fs = require('fs');
const path = require('path');

const SCHEMAS = [
  'schemas/language-source-inventory.schema.json',
  'schemas/language-symbol-range-reference.schema.json',
  'schemas/language-diagnostics.schema.json',
  'schemas/language-runtime-commands.schema.json',
  'schemas/language-equivalence-fixture.schema.json',
  'schemas/language-dry-run-plan-request.schema.json',
  'schemas/language-dry-run-plan-report.schema.json',
  'schemas/language-dry-run-evidence-envelope.schema.json',
];

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const failures = [];
  const summary = [];

  for (const relPath of SCHEMAS) {
    const fullPath = path.join(repoRoot, relPath);
    ensure(fs.existsSync(fullPath), `missing schema file: ${relPath}`, failures);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    let doc;
    try {
      doc = readJson(fullPath);
    } catch (error) {
      failures.push(`invalid JSON in ${relPath}: ${error.message}`);
      continue;
    }

    ensure(typeof doc.$schema === 'string', `${relPath} missing $schema`, failures);
    ensure(typeof doc.$id === 'string', `${relPath} missing $id`, failures);
    summary.push({
      file: relPath,
      id: doc.$id,
      title: doc.title || '',
    });
  }

  if (failures.length > 0) {
    console.error('[validate-schemas] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('[validate-schemas] PASS');
  console.log(JSON.stringify({ count: summary.length, schemas: summary }, null, 2));
}

main();
