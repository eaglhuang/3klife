#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { runAdapter } = require('./atm-adapter/usage-evidence-shadow');
const { createValidatorOrchestrator } = require('./lib/validator-orchestrator');
const { resolveUpstreamRepoRoot } = require('./lib/upstream-env');

const ROOT = path.resolve(__dirname, '..');
const UPSTREAM_ROOT = resolveUpstreamRepoRoot({
  projectRoot: ROOT,
}).upstreamRepoRoot;
const USAGE_SCHEMA_PATH = path.join(UPSTREAM_ROOT, 'schemas', 'governance', 'evidence', 'usage-feedback.schema.json');
const EVIDENCE_SCHEMA_PATH = path.join(UPSTREAM_ROOT, 'schemas', 'governance', 'evidence.schema.json');

const GOOD_SOURCE_PATH = path.join(ROOT, 'fixtures', 'adapter', '3klife-usage-source.json');
const MISSING_SOURCE_PATH = path.join(ROOT, 'fixtures', 'adapter', '3klife-usage-source-missing-field.json');
const GOOD_REPORT_PATH = path.join(ROOT, 'fixtures', 'adapter', '3klife-usage-evidence.snapshot.json');
const LENIENT_REPORT_PATH = path.join(ROOT, 'fixtures', 'adapter', '3klife-usage-evidence-skipped.snapshot.json');
const STRICT_NEGATIVE_REPORT_PATH = path.join(ROOT, 'fixtures', 'adapter', '3klife-usage-evidence-missing-field.json');
const orchestrator = createValidatorOrchestrator({
  orchestratorId: 'validate-usage-evidence-shadow',
});

orchestrator.registerValidator({
  id: 'usage-feedback-schema',
  description: 'Validate usage-feedback payload schema with shared AJV cache',
  tags: ['validate', 'usage-feedback', 'ajv-cache'],
  run: ({ payload }) => {
    const cacheResult = orchestrator.getOrCompileJsonSchemaValidator({
      cacheKey: 'usage-feedback.schema',
      schemaPath: USAGE_SCHEMA_PATH,
      buildAjv: () => {
        const ajv = new Ajv({
          allErrors: true,
          strict: false,
          allowUnionTypes: true,
        });
        addFormats(ajv);
        return ajv;
      },
      beforeCompile: ({ ajv }) => {
        const evidenceSchema = readJson(EVIDENCE_SCHEMA_PATH);
        ajv.addSchema(evidenceSchema, evidenceSchema.$id);
      },
    });
    const validate = cacheResult.compiled;
    const valid = validate(payload);
    return {
      valid: Boolean(valid),
      errors: validate.errors || [],
    };
  },
});

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }
  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-usage-evidence-shadow.js [--strict] [--report <json>]');
  console.log('');
  console.log('Runs deterministic strict/lenient validation for ATM-3-0014 usage-evidence shadow adapter.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runAdapterPasses() {
  const checks = [];
  const findings = [];

  const strictPass = runAdapter({
    mode: 'strict',
    source: GOOD_SOURCE_PATH,
    output: GOOD_REPORT_PATH,
  });
  checks.push({
    id: 'strict-good-source',
    passed: strictPass.passed === true,
    status: strictPass.passed === true ? 0 : 1,
    stderr: strictPass.passed ? '' : JSON.stringify(strictPass.findings || [], null, 2),
  });
  if (strictPass.passed !== true) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.strict-good-source',
      trigger: 'usage-evidence-shadow.strict.good-source.failed',
      scope: 'tools_node/atm-adapter/usage-evidence-shadow.js',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'strict 模式在完整 source fixture 應成功輸出 usage-feedback。',
      message: 'strict mode failed for good source fixture',
      details: {
        findings: strictPass.findings || [],
      },
    });
  }

  const strictNegative = runAdapter({
    mode: 'strict',
    source: MISSING_SOURCE_PATH,
    output: STRICT_NEGATIVE_REPORT_PATH,
  });
  checks.push({
    id: 'strict-missing-field',
    passed: strictNegative.passed !== true,
    status: strictNegative.passed !== true ? 0 : 1,
    stderr: strictNegative.passed ? 'strict mode unexpectedly passed' : '',
  });
  if (strictNegative.passed === true) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.strict-missing-field',
      trigger: 'usage-evidence-shadow.strict.missing-field.did-not-fail',
      scope: 'tools_node/atm-adapter/usage-evidence-shadow.js',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'strict 模式遇到缺欄位必須 hard fail。',
      message: 'strict mode did not fail for missing-field fixture',
      details: {},
    });
  }

  const lenientFallback = runAdapter({
    mode: 'lenient',
    source: MISSING_SOURCE_PATH,
    output: LENIENT_REPORT_PATH,
  });
  checks.push({
    id: 'lenient-missing-field',
    passed: lenientFallback.passed === true,
    status: lenientFallback.passed === true ? 0 : 1,
    stderr: lenientFallback.passed ? '' : JSON.stringify(lenientFallback.findings || [], null, 2),
  });
  if (lenientFallback.passed !== true) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.lenient-missing-field',
      trigger: 'usage-evidence-shadow.lenient.missing-field.failed',
      scope: 'tools_node/atm-adapter/usage-evidence-shadow.js',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'lenient 模式遇到缺欄位應降級為 usage-feedback-skipped。',
      message: 'lenient mode failed for missing-field fixture',
      details: {
        findings: lenientFallback.findings || [],
      },
    });
  }

  return { checks, findings };
}

function validatePayloadContract(findings, checks) {
  if (!fs.existsSync(GOOD_REPORT_PATH)) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.output.missing',
      trigger: 'usage-evidence-shadow.output.good-report.missing',
      scope: rel(GOOD_REPORT_PATH),
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'strict 輸出報告遺失，請重新生成。',
      message: 'strict output report does not exist',
      details: {},
    });
    return;
  }

  const goodReport = readJson(GOOD_REPORT_PATH);
  const payload = goodReport.payload || null;
  const usageValidation = payload
    ? orchestrator.runValidator('usage-feedback-schema', { payload })
    : { valid: false, errors: [] };
  const schemaPassed = Boolean(payload) && usageValidation.valid;
  checks.push({
    id: 'strict-schema-usage-feedback',
    passed: schemaPassed,
    status: schemaPassed ? 0 : 1,
    stderr: schemaPassed ? '' : JSON.stringify(usageValidation.errors || [], null, 2),
  });

  if (!schemaPassed) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.schema',
      trigger: 'usage-evidence-shadow.schema.usage-feedback.invalid',
      scope: rel(GOOD_REPORT_PATH),
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '輸出 payload 必須符合 ATM-2-0009 usage-feedback schema。',
      message: 'strict output payload does not satisfy usage-feedback schema',
      details: {
        errors: usageValidation.errors || [],
      },
    });
  }

  const lenientReport = fs.existsSync(LENIENT_REPORT_PATH) ? readJson(LENIENT_REPORT_PATH) : null;
  const lenientTypeOk = Boolean(lenientReport && lenientReport.payload && lenientReport.payload.evidenceType === 'usage-feedback-skipped');
  const hasSkipReason = Boolean(lenientReport && lenientReport.payload && lenientReport.payload.skipReason);
  checks.push({
    id: 'lenient-skipped-contract',
    passed: lenientTypeOk && hasSkipReason,
    status: lenientTypeOk && hasSkipReason ? 0 : 1,
    stderr: lenientTypeOk && hasSkipReason ? '' : 'lenient output must expose usage-feedback-skipped + skipReason',
  });
  if (!lenientTypeOk || !hasSkipReason) {
    findings.push({
      findingVersion: 'coverage-finding/v1',
      kind: 'coverage-finding',
      ruleId: 'usage-evidence-shadow.lenient-contract',
      trigger: 'usage-evidence-shadow.lenient.contract.invalid',
      scope: rel(LENIENT_REPORT_PATH),
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'lenient fallback 必須輸出 usage-feedback-skipped 並包含 skipReason。',
      message: 'lenient output contract is incomplete',
      details: {},
    });
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const { checks, findings } = runAdapterPasses();
  validatePayloadContract(findings, checks);

  const blockerCount = findings.filter((item) => item.action === 'fail' || item.severity === 'block').length;
  const warningCount = findings.filter((item) => item.action !== 'fail' && item.severity !== 'block').length;
  const telemetry = orchestrator.snapshotTelemetry();
  const report = {
    validator: 'validate-usage-evidence-shadow',
    passed: blockerCount === 0,
    blockerCount,
    warningCount,
    checks,
    findings,
    outputs: {
      strict: rel(GOOD_REPORT_PATH),
      strictMissing: rel(STRICT_NEGATIVE_REPORT_PATH),
      lenient: rel(LENIENT_REPORT_PATH),
    },
    telemetry,
  };

  if (opts.report) {
    writeJson(opts.report, report);
    console.error(`[validate-usage-evidence-shadow] report=${rel(opts.report)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-usage-evidence-shadow] status=${report.passed ? 'pass' : 'fail'} blockers=${blockerCount} warnings=${warningCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-usage-evidence-shadow] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}
