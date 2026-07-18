const fs = require('fs');

const reportPath = 'docs/reports/3klife-task-audit-debt-triage.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const expected = {
  findingCount: 881,
  errorCount: 48,
  warningCount: 833,
  bucketCount: 8,
};

const actual = {
  findingCount: report.audit?.findingCount,
  errorCount: report.audit?.errorCount,
  warningCount: report.audit?.warningCount,
  bucketCount: Array.isArray(report.buckets) ? report.buckets.length : 0,
};

for (const [key, value] of Object.entries(expected)) {
  if (actual[key] !== value) {
    console.error(`audit triage mismatch: ${key} expected ${value}, got ${actual[key]}`);
    process.exit(1);
  }
}

const requiredCodes = new Set([
  'ATM_TASK_AUDIT_MANUAL_DONE',
  'ATM_TASK_AUDIT_TRANSITION_EVIDENCE_MISSING',
  'ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING',
  'ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET',
  'ATM_TASK_AUDIT_LEGACY_BASELINE_DONE',
  'ATM_TASK_AUDIT_PLANNING_ONLY_DONE',
  'ATM_TASK_AUDIT_STALE_CLAIM',
  'ATM_TASK_AUDIT_STALE_FRAMEWORK_LOCK',
]);

for (const bucket of report.buckets ?? []) {
  requiredCodes.delete(bucket.code);
}

if (requiredCodes.size > 0) {
  console.error(`audit triage missing bucket(s): ${Array.from(requiredCodes).join(', ')}`);
  process.exit(1);
}

console.log('audit triage report ok');
