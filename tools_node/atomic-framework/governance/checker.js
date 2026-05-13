'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  ROOT,
  loadGovernanceProfile,
  relFromRoot,
  resolveFromRoot,
  toPosix,
  validateGovernanceProfile,
} = require('./profile');
const { renderGovernanceTargets } = require('./renderers');

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function writeGovernanceTargets(targets, options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  const results = [];
  for (const target of targets) {
    const absolutePath = path.resolve(root, target.targetPath);
    const before = fileExists(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, target.content, 'utf8');
    results.push({
      id: target.id,
      kind: target.kind,
      targetPath: toPosix(target.targetPath),
      bytes: Buffer.byteLength(target.content, 'utf8'),
      changed: before !== target.content,
    });
  }
  return results;
}

function compareGovernanceTargets(targets, options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  const readFile = typeof options.readFile === 'function'
    ? options.readFile
    : (absolutePath) => fs.readFileSync(absolutePath, 'utf8');

  const comparisons = targets.map((target) => {
    const absolutePath = path.resolve(root, target.targetPath);
    const exists = fileExists(absolutePath);
    const actual = exists ? readFile(absolutePath) : '';
    return {
      id: target.id,
      kind: target.kind,
      targetPath: toPosix(target.targetPath),
      exists,
      drift: !exists || actual !== target.content,
    };
  });

  return {
    status: comparisons.some((item) => item.drift) ? 'drift' : 'pass',
    mismatches: comparisons.filter((item) => item.drift),
    comparisons,
  };
}

function evaluateLocalSurfaces(profile, options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  const findings = (profile.doctor && profile.doctor.advisoryLocalSurfaces || []).map((surface) => {
    const absolutePath = path.resolve(root, surface.path);
    return {
      id: surface.id,
      path: surface.path,
      exists: fileExists(absolutePath),
      status: surface.status,
      label: surface.label,
    };
  });
  const activeFindings = findings.filter((item) => item.exists);
  return {
    status: activeFindings.length > 0 ? 'advisory-local-only' : 'pass',
    findings,
  };
}

function evaluatePortability(profile, options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  const blockers = (profile.doctor && profile.doctor.portabilityBlockers || []).map((blocker) => {
    const matches = [];
    for (const probe of blocker.probes || []) {
      const absolutePath = path.resolve(root, probe.path);
      if (!fileExists(absolutePath)) {
        continue;
      }
      const content = fs.readFileSync(absolutePath, 'utf8');
      const regex = new RegExp(probe.pattern, 'm');
      if (regex.test(content)) {
        matches.push({
          path: probe.path,
          pattern: probe.pattern,
        });
      }
    }
    return {
      id: blocker.id,
      label: blocker.label,
      active: matches.length > 0,
      matches,
    };
  });
  const active = blockers.filter((item) => item.active);
  return {
    status: active.length > 0 ? 'blocked-by-portability' : 'pass',
    blockers,
  };
}

function buildOverallDoctorStatus(driftStatus, localSurfaceStatus, portabilityStatus) {
  if (driftStatus === 'drift') {
    return 'drift';
  }
  if (portabilityStatus === 'blocked-by-portability') {
    return 'blocked-by-portability';
  }
  if (localSurfaceStatus === 'advisory-local-only') {
    return 'advisory-local-only';
  }
  return 'pass';
}

function buildGovernanceReport(options = {}) {
  const loaded = loadGovernanceProfile(options);
  const schema = validateGovernanceProfile(loaded.profile);
  const renderedTargets = schema.ok ? renderGovernanceTargets(loaded.profile) : [];
  const drift = schema.ok
    ? compareGovernanceTargets(renderedTargets, options)
    : { status: 'drift', mismatches: [], comparisons: [] };
  const localSurfaces = schema.ok
    ? evaluateLocalSurfaces(loaded.profile, options)
    : { status: 'pass', findings: [] };
  const portability = schema.ok
    ? evaluatePortability(loaded.profile, options)
    : { status: 'pass', blockers: [] };
  const doctorStatus = buildOverallDoctorStatus(drift.status, localSurfaces.status, portability.status);

  return {
    ok: schema.ok && drift.status === 'pass',
    profilePath: loaded.profilePath,
    profileRelPath: loaded.profileRelPath,
    profileId: loaded.profile.profileId,
    schema,
    renderedTargets,
    drift,
    localSurfaces,
    portability,
    overall: {
      strictStatus: schema.ok && drift.status === 'pass' ? 'pass' : 'drift',
      doctorStatus,
    },
  };
}

module.exports = {
  ROOT,
  buildGovernanceReport,
  compareGovernanceTargets,
  evaluateLocalSurfaces,
  evaluatePortability,
  relFromRoot,
  resolveFromRoot,
  writeGovernanceTargets,
};
