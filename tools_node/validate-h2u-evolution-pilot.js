#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { createValidatorOrchestrator } = require('./lib/validator-orchestrator');

const ROOT = path.resolve(__dirname, '..');
const UPSTREAM_ROOT = path.resolve(ROOT, '..', 'AI-Atomic-Framework');

const PROPOSAL_PATH = path.join(ROOT, 'fixtures', 'case-studies', 'normalize-css-color', 'proposal.json');
const DECISION_PATH = path.join(ROOT, 'fixtures', 'case-studies', 'normalize-css-color', 'decision-approve.json');
const UPGRADE_SCHEMA_PATH = path.join(UPSTREAM_ROOT, 'schemas', 'upgrade', 'upgrade-proposal.schema.json');
const orchestrator = createValidatorOrchestrator({
  orchestratorId: 'validate-h2u-evolution-pilot',
});

orchestrator.registerValidator({
  id: 'upgrade-proposal-schema',
  description: 'Validate upgrade proposal schema with shared AJV cache',
  tags: ['validate', 'h2u-pilot', 'ajv-cache'],
  run: ({ proposal }) => {
    const cacheResult = orchestrator.getOrCompileJsonSchemaValidator({
      cacheKey: 'upgrade-proposal.schema',
      schemaPath: UPGRADE_SCHEMA_PATH,
      buildAjv: () => {
        const ajv = new Ajv({
          allErrors: true,
          strict: false,
          allowUnionTypes: true,
        });
        addFormats(ajv);
        return ajv;
      },
    });
    const validate = cacheResult.compiled;
    const valid = validate(proposal);
    return {
      ok: Boolean(valid),
      errors: validate.errors || [],
    };
  },
});

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: '',
    rewriteHash: false,
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
    if (token === '--rewrite-hash') {
      parsed.rewriteHash = true;
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
  console.log('Usage: node tools_node/validate-h2u-evolution-pilot.js [--strict] [--report <json>] [--rewrite-hash]');
  console.log('');
  console.log('Validates ATM-4-0007 normalizeCssColor proposal/decision fixtures.');
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

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256Stable(value) {
  return `sha256:${crypto.createHash('sha256').update(stableSerialize(value), 'utf8').digest('hex')}`;
}

function buildFinding(message, details = {}) {
  return {
    findingVersion: 'coverage-finding/v1',
    kind: 'coverage-finding',
    ruleId: 'h2u-evolution-pilot',
    trigger: 'h2u-evolution-pilot.validation',
    scope: 'fixtures/case-studies/normalize-css-color',
    severity: 'block',
    action: 'fail',
    routeClass: 'blocker',
    routeHint: '修正 proposal/decision fixture 欄位與 hash 鏈，維持 behavior.evolve pilot 的 deterministic replay。',
    message,
    details,
  };
}

function validateProposalSchema(proposal) {
  return orchestrator.runValidator('upgrade-proposal-schema', {
    proposal,
  });
}

function patchDecisionHashes(decision, hash) {
  decision.decisionSnapshotHash = hash;
  if (decision.queueRecord) {
    decision.queueRecord.proposalSnapshotHash = hash;
    if (decision.queueRecord.review) {
      decision.queueRecord.review.decisionSnapshotHash = hash;
    }
  }
  if (decision.evidence && decision.evidence.details) {
    decision.evidence.details.decisionSnapshotHash = hash;
  }
  return decision;
}

function runValidation(opts = {}) {
  const checks = [];
  const findings = [];

  const proposal = readJson(PROPOSAL_PATH);
  const decision = readJson(DECISION_PATH);
  const proposalHash = sha256Stable(proposal);

  if (opts.rewriteHash) {
    patchDecisionHashes(decision, proposalHash);
    writeJson(DECISION_PATH, decision);
  }

  const proposalSchema = validateProposalSchema(proposal);
  checks.push({
    id: 'proposal-schema',
    passed: proposalSchema.ok,
    status: proposalSchema.ok ? 0 : 1,
    stderr: proposalSchema.ok ? '' : JSON.stringify(proposalSchema.errors, null, 2),
  });
  if (!proposalSchema.ok) {
    findings.push(buildFinding('proposal fixture does not satisfy upgrade-proposal schema', {
      errors: proposalSchema.errors,
    }));
  }

  const behaviorEvolve = proposal.behaviorId === 'behavior.evolve';
  checks.push({
    id: 'proposal-behavior-evolve',
    passed: behaviorEvolve,
    status: behaviorEvolve ? 0 : 1,
    stderr: behaviorEvolve ? '' : `behaviorId=${proposal.behaviorId || ''}`,
  });
  if (!behaviorEvolve) {
    findings.push(buildFinding('proposal behaviorId must be behavior.evolve', {
      behaviorId: proposal.behaviorId || '',
    }));
  }

  const gatesPassed = Boolean(
    proposal.automatedGates
    && proposal.automatedGates.allPassed === true
    && Array.isArray(proposal.automatedGates.blockedGateNames)
    && proposal.automatedGates.blockedGateNames.length === 0
  );
  checks.push({
    id: 'proposal-automated-gates',
    passed: gatesPassed,
    status: gatesPassed ? 0 : 1,
    stderr: gatesPassed ? '' : 'automatedGates must be all green for ATM-4-0007 pilot',
  });
  if (!gatesPassed) {
    findings.push(buildFinding('proposal automatedGates are not all green', {
      automatedGates: proposal.automatedGates || null,
    }));
  }

  const decisionMatches = Boolean(
    decision.proposalId === proposal.proposalId
    && decision.atomId === proposal.atomId
    && decision.decision === 'approve'
    && decision.queueRecord
    && decision.queueRecord.status === 'approved'
  );
  checks.push({
    id: 'decision-linkage',
    passed: decisionMatches,
    status: decisionMatches ? 0 : 1,
    stderr: decisionMatches ? '' : 'decision linkage to proposal is broken',
  });
  if (!decisionMatches) {
    findings.push(buildFinding('decision fixture linkage is inconsistent', {
      proposalId: proposal.proposalId,
      decisionProposalId: decision.proposalId || '',
      atomId: proposal.atomId,
      decisionAtomId: decision.atomId || '',
      decision: decision.decision || '',
      queueStatus: decision.queueRecord ? decision.queueRecord.status : '',
    }));
  }

  const hashFields = [
    decision.decisionSnapshotHash,
    decision.queueRecord && decision.queueRecord.proposalSnapshotHash,
    decision.queueRecord && decision.queueRecord.review && decision.queueRecord.review.decisionSnapshotHash,
    decision.evidence && decision.evidence.details && decision.evidence.details.decisionSnapshotHash,
  ];
  const hashConsistent = hashFields.every((value) => value === proposalHash);
  checks.push({
    id: 'decision-proposal-hash',
    passed: hashConsistent,
    status: hashConsistent ? 0 : 1,
    stderr: hashConsistent ? '' : `expected ${proposalHash}`,
  });
  if (!hashConsistent) {
    findings.push(buildFinding('decision hash chain does not match proposal snapshot hash', {
      expected: proposalHash,
      actual: hashFields,
    }));
  }

  const evidenceContract = Boolean(
    decision.evidence
    && decision.evidence.evidenceKind === 'review'
    && decision.evidence.evidenceType === 'human-review-decision'
    && decision.evidence.details
    && decision.evidence.details.proposalId === proposal.proposalId
    && decision.evidence.details.queueStatus === 'approved'
  );
  checks.push({
    id: 'decision-evidence-contract',
    passed: evidenceContract,
    status: evidenceContract ? 0 : 1,
    stderr: evidenceContract ? '' : 'decision evidence payload is incomplete',
  });
  if (!evidenceContract) {
    findings.push(buildFinding('decision evidence contract is incomplete', {
      evidence: decision.evidence || null,
    }));
  }

  const blockerCount = findings.length;
  const telemetry = orchestrator.snapshotTelemetry();
  const report = {
    validator: 'validate-h2u-evolution-pilot',
    passed: blockerCount === 0,
    blockerCount,
    warningCount: 0,
    checks,
    findings,
    paths: {
      proposal: rel(PROPOSAL_PATH),
      decisionApprove: rel(DECISION_PATH),
    },
    proposalHash,
    telemetry,
  };

  return report;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const report = runValidation(opts);
  if (opts.report) {
    writeJson(opts.report, report);
    console.error(`[validate-h2u-evolution-pilot] report=${rel(opts.report)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-h2u-evolution-pilot] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-h2u-evolution-pilot] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runValidation,
  patchDecisionHashes,
  validateProposalSchema,
};
