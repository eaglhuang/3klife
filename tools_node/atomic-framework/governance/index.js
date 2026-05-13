'use strict';

const fs = require('node:fs');

const { buildGovernanceReport, writeGovernanceTargets } = require('./checker');
const { loadGovernanceProfile, validateGovernanceProfile } = require('./profile');
const { migrateGovernanceProfile } = require('./migrate');
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

function runGovernanceMigrate(options = {}) {
  const loaded = loadGovernanceProfile(options);
  const fromVersion = options.fromVersion || loaded.profile.version;
  const toVersion = options.toVersion;

  const migration = migrateGovernanceProfile(loaded.profile, {
    fromVersion,
    toVersion,
  });

  if (!migration.ok || !migration.profile) {
    return {
      ok: false,
      profilePath: loaded.profilePath,
      profileRelPath: loaded.profileRelPath,
      fromVersion,
      toVersion,
      migration,
      schema: {
        ok: false,
        errors: migration.error ? [migration.error] : ['migration failed'],
      },
      dryRun: Boolean(options.dryRun),
      wroteProfile: false,
    };
  }

  const schema = validateGovernanceProfile(migration.profile);
  let wroteProfile = false;
  if (!options.dryRun && schema.ok) {
    fs.writeFileSync(loaded.profilePath, `${JSON.stringify(migration.profile, null, 2)}\n`, 'utf8');
    wroteProfile = true;
  }

  return {
    ok: migration.ok && schema.ok,
    profilePath: loaded.profilePath,
    profileRelPath: loaded.profileRelPath,
    fromVersion: migration.from,
    toVersion: migration.to,
    migration,
    schema,
    dryRun: Boolean(options.dryRun),
    wroteProfile,
  };
}

module.exports = {
  runGovernanceCheck,
  runGovernanceMigrate,
  runGovernanceRender,
};
