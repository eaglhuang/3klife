'use strict';

function buildMemberResult(atomId, violations) {
  return {
    atomId,
    status: violations.length === 0 ? 'pass' : 'fail',
    violationCount: violations.length,
  };
}

function aggregateNeutralityReport(options) {
  const termViolations = options.termViolations || [];
  const pathViolations = options.pathViolations || [];
  const violations = [...termViolations, ...pathViolations]
    .sort((left, right) => `${left.file}:${left.type}:${left.matchedRule}`.localeCompare(`${right.file}:${right.type}:${right.matchedRule}`));
  const memberResults = options.memberResults || [
    { atomId: 'ATM-CORE-0003-A', status: 'pass', targetCount: Number(options.targetCount || 0) },
    { atomId: 'ATM-CORE-0003-B', status: 'pass', ruleCount: Number(options.ruleCount || 0) },
    buildMemberResult('ATM-CORE-0003-C', termViolations),
    buildMemberResult('ATM-CORE-0003-D', pathViolations),
  ];
  const status = violations.length === 0 ? 'pass' : 'fail';
  return {
    schemaVersion: 'atm.neutrality-report.v0',
    sourceAtom: 'ATM-CORE-0003-E',
    atomId: 'ATM-CORE-0003',
    mapId: options.mapId || 'ATM-MAP-NEUTRALITY-0001',
    canonicalMapId: options.canonicalMapId || 'ATM-MAP-0002',
    rootDir: options.rootDir || '',
    status,
    exitCode: status === 'pass' ? 0 : 1,
    totals: {
      targets: Number(options.targetCount || 0),
      termViolations: termViolations.length,
      pathViolations: pathViolations.length,
      violations: violations.length,
    },
    memberResults: [
      ...memberResults,
      { atomId: 'ATM-CORE-0003-E', status, violationCount: violations.length },
    ],
    violations,
  };
}

module.exports = {
  aggregateNeutralityReport,
};
