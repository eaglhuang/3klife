'use strict';

module.exports = function applyCapsulePolicy(context) {
  const candidate = context && context.candidate ? context.candidate : null;
  if (!candidate) {
    return { overrides: {}, findings: [] };
  }
  return {
    overrides: {},
    findings: [
      {
        severity: 'info',
        message: `policy hook evaluated ${candidate.symbolName}`,
      },
    ],
  };
};
