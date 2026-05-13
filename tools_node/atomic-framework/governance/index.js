'use strict';

const { buildGovernanceReport, writeGovernanceTargets } = require('./checker');
const { loadGovernanceProfile, validateGovernanceProfile } = require('./profile');
const { renderGovernanceTargets } = require('./renderers');

function runGovernanceRender(options = {}) {
  const loaded = loadGovernanceProfile(options);
  const schema = validateGovernanceProfile(loaded.profile);
  if (!schema.ok) {
    return {
      ok: false,
      profilePath: loaded.profilePath,
      profileRelPath: loaded.profileRelPath,
      schema,
      writes: [],
      dryRun: Boolean(options.dryRun),
    };
  }

  const renderedTargets = renderGovernanceTargets(loaded.profile);
  const writes = options.dryRun
    ? renderedTargets.map((target) => ({
      id: target.id,
      kind: target.kind,
      targetPath: target.targetPath,
      bytes: Buffer.byteLength(target.content, 'utf8'),
      changed: false,
    }))
    : writeGovernanceTargets(renderedTargets, options);

  return {
    ok: true,
    profilePath: loaded.profilePath,
    profileRelPath: loaded.profileRelPath,
    schema,
    writes,
    dryRun: Boolean(options.dryRun),
  };
}

function runGovernanceCheck(options = {}) {
  return buildGovernanceReport(options);
}

module.exports = {
  runGovernanceCheck,
  runGovernanceRender,
};
