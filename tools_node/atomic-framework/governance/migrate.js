'use strict';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeVersion(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(/^v/i, ''));
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return NaN;
}

function ensureStep(workflow, step, afterName) {
  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const exists = steps.some((item) => item && item.entrypointKey === step.entrypointKey);
  if (exists) {
    return false;
  }
  const clone = cloneJson(step);
  const index = steps.findIndex((item) => item && item.name === afterName);
  if (index < 0) {
    steps.push(clone);
  } else {
    steps.splice(index + 1, 0, clone);
  }
  workflow.steps = steps;
  return true;
}

function migrateProfileV2ToV3(profile) {
  const next = cloneJson(profile);
  const changes = [];

  if (next.version !== 3) {
    next.version = 3;
    changes.push('version: 2 -> 3');
  }

  if (typeof next.profileId === 'string' && /\.v2$/.test(next.profileId)) {
    next.profileId = next.profileId.replace(/\.v2$/, '.v3');
    changes.push('profileId: .v2 -> .v3');
  } else if (typeof next.profileId === 'string' && !/\.v3$/.test(next.profileId)) {
    next.profileId = `${next.profileId}.v3`;
    changes.push('profileId: append .v3');
  }

  if (!next.gateEntrypoints || typeof next.gateEntrypoints !== 'object') {
    next.gateEntrypoints = {};
    changes.push('gateEntrypoints: initialize object');
  }

  const entrypoints = next.gateEntrypoints;
  const expectedEntrypoints = {
    ciReleaseShadowSummary:
      'node tools_node/render-atm-release-shadow-summary.js --report artifacts/ci/atm-release-shadow-report.json --metrics artifacts/ci/atm-release-shadow-metrics.json --output "$GITHUB_STEP_SUMMARY" --top 5',
    ciIdentityAdvisory:
      'node tools_node/check-agent-identity-consistency.js --mode advisory --json',
    ciIdentityBlocking:
      'node tools_node/check-agent-identity-consistency.js --mode blocking --json',
  };
  for (const [key, command] of Object.entries(expectedEntrypoints)) {
    if (!entrypoints[key]) {
      entrypoints[key] = command;
      changes.push(`gateEntrypoints.${key}: added`);
    }
  }

  if (!next.doctor || typeof next.doctor !== 'object') {
    next.doctor = {};
    changes.push('doctor: initialize object');
  }
  if (!next.doctor.identityConsistency || typeof next.doctor.identityConsistency !== 'object') {
    next.doctor.identityConsistency = {
      enabled: true,
      defaultMode: 'advisory',
      commandAdvisory: expectedEntrypoints.ciIdentityAdvisory,
      commandBlocking: expectedEntrypoints.ciIdentityBlocking,
    };
    changes.push('doctor.identityConsistency: added');
  }

  const workflows = next.ci && Array.isArray(next.ci.workflows) ? next.ci.workflows : [];
  for (const workflow of workflows) {
    if (!workflow || typeof workflow !== 'object') continue;
    const addedIdentity = ensureStep(workflow, {
      name: 'Agent identity consistency (advisory)',
      entrypointKey: 'ciIdentityAdvisory',
      if: "github.event_name == 'pull_request' || github.event_name == 'push'",
    }, 'Governance drift check');
    if (addedIdentity) {
      changes.push(`ci.workflows.${workflow.id || 'workflow'}.steps: add advisory identity step`);
    }

    const addedShadowSummary = ensureStep(workflow, {
      name: 'ATM flow (release-shadow summary)',
      entrypointKey: 'ciReleaseShadowSummary',
      if: "github.event_name == 'pull_request' && always()",
    }, 'ATM flow (release-shadow)');
    if (addedShadowSummary) {
      changes.push(`ci.workflows.${workflow.id || 'workflow'}.steps: add release-shadow summary step`);
    }
  }

  return {
    ok: true,
    from: 2,
    to: 3,
    profile: next,
    changes,
    noop: changes.length === 0,
  };
}

function migrateGovernanceProfile(profile, options = {}) {
  const fromVersion = normalizeVersion(options.fromVersion);
  const toVersion = normalizeVersion(options.toVersion);
  const currentVersion = normalizeVersion(profile && profile.version);
  if (!Number.isFinite(fromVersion) || !Number.isFinite(toVersion)) {
    return {
      ok: false,
      error: 'from/to version must be provided as v2/v3 or numeric values',
      profile: null,
      changes: [],
    };
  }

  if (Number.isFinite(currentVersion) && currentVersion !== fromVersion) {
    return {
      ok: false,
      error: `profile version mismatch: expected v${fromVersion}, got v${currentVersion}`,
      profile: null,
      changes: [],
    };
  }

  if (fromVersion === 2 && toVersion === 3) {
    return migrateProfileV2ToV3(profile);
  }

  return {
    ok: false,
    error: `unsupported migration path: v${fromVersion} -> v${toVersion}`,
    profile: null,
    changes: [],
  };
}

module.exports = {
  migrateGovernanceProfile,
  migrateProfileV2ToV3,
  normalizeVersion,
};
