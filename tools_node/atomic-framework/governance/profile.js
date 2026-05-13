'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('../../lib/project-config');

const DEFAULT_PROFILE_REL = 'tools_node/adapters/atm-3klife/governance-profile.json';

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function relFromRoot(filePath) {
  return toPosix(path.relative(ROOT, filePath));
}

function resolveFromRoot(candidatePath) {
  if (!candidatePath) {
    return ROOT;
  }
  return path.isAbsolute(candidatePath)
    ? path.normalize(candidatePath)
    : path.resolve(ROOT, candidatePath);
}

function loadGovernanceProfile(options = {}) {
  const profilePath = resolveFromRoot(options.profilePath || DEFAULT_PROFILE_REL);
  const raw = fs.readFileSync(profilePath, 'utf8');
  const profile = JSON.parse(raw);
  return {
    profile,
    profilePath,
    profileRelPath: relFromRoot(profilePath),
  };
}

function validateString(errors, value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${fieldName} must be a non-empty string`);
  }
}

function validateStringArray(errors, value, fieldName, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(`${fieldName} must be ${allowEmpty ? 'an array' : 'a non-empty array'}`);
    return;
  }
  value.forEach((item, index) => validateString(errors, item, `${fieldName}[${index}]`));
}

function validateGovernanceProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return {
      ok: false,
      errors: ['profile must be an object'],
    };
  }

  validateString(errors, profile.profileId, 'profileId');
  if (typeof profile.version !== 'number') {
    errors.push('version must be a number');
  }

  const manifests = profile.editorHooks && profile.editorHooks.manifests;
  if (!Array.isArray(manifests) || manifests.length === 0) {
    errors.push('editorHooks.manifests must be a non-empty array');
  } else {
    manifests.forEach((manifest, manifestIndex) => {
      validateString(errors, manifest.id, `editorHooks.manifests[${manifestIndex}].id`);
      validateString(errors, manifest.targetPath, `editorHooks.manifests[${manifestIndex}].targetPath`);
      if (!Array.isArray(manifest.hooks) || manifest.hooks.length === 0) {
        errors.push(`editorHooks.manifests[${manifestIndex}].hooks must be a non-empty array`);
        return;
      }
      manifest.hooks.forEach((stage, stageIndex) => {
        validateString(errors, stage.stage, `editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].stage`);
        if (!Array.isArray(stage.entries) || stage.entries.length === 0) {
          errors.push(`editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].entries must be a non-empty array`);
          return;
        }
        stage.entries.forEach((entry, entryIndex) => {
          validateString(errors, entry.type, `editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].entries[${entryIndex}].type`);
          validateString(errors, entry.command, `editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].entries[${entryIndex}].command`);
          validateString(errors, entry.windows, `editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].entries[${entryIndex}].windows`);
          if (typeof entry.timeout !== 'number') {
            errors.push(`editorHooks.manifests[${manifestIndex}].hooks[${stageIndex}].entries[${entryIndex}].timeout must be a number`);
          }
        });
      });
    });
  }

  const preCommit = profile.gitHooks && profile.gitHooks.preCommit;
  if (!preCommit || typeof preCommit !== 'object') {
    errors.push('gitHooks.preCommit must be an object');
  } else {
    validateString(errors, preCommit.targetPath, 'gitHooks.preCommit.targetPath');
    if (!Array.isArray(preCommit.steps) || preCommit.steps.length === 0) {
      errors.push('gitHooks.preCommit.steps must be a non-empty array');
    } else {
      preCommit.steps.forEach((step, index) => {
        validateString(errors, step.id, `gitHooks.preCommit.steps[${index}].id`);
        validateString(errors, step.kind, `gitHooks.preCommit.steps[${index}].kind`);
        validateString(errors, step.run, `gitHooks.preCommit.steps[${index}].run`);
        validateStringArray(errors, step.failMessages, `gitHooks.preCommit.steps[${index}].failMessages`);
        if (step.kind === 'staged-match') {
          validateString(errors, step.variableName, `gitHooks.preCommit.steps[${index}].variableName`);
          validateString(errors, step.diffFilter, `gitHooks.preCommit.steps[${index}].diffFilter`);
          validateStringArray(errors, step.patternLines, `gitHooks.preCommit.steps[${index}].patternLines`);
        }
      });
    }
  }

  const workflows = profile.ci && profile.ci.workflows;
  if (!Array.isArray(workflows) || workflows.length === 0) {
    errors.push('ci.workflows must be a non-empty array');
  } else {
    workflows.forEach((workflow, index) => {
      validateString(errors, workflow.id, `ci.workflows[${index}].id`);
      validateString(errors, workflow.targetPath, `ci.workflows[${index}].targetPath`);
      validateString(errors, workflow.name, `ci.workflows[${index}].name`);
      validateString(errors, workflow.nodeVersion, `ci.workflows[${index}].nodeVersion`);
      validateStringArray(errors, workflow.branches && workflow.branches.pullRequest, `ci.workflows[${index}].branches.pullRequest`);
      validateStringArray(errors, workflow.branches && workflow.branches.push, `ci.workflows[${index}].branches.push`);
      validateString(errors, workflow.changedFiles && workflow.changedFiles.artifactDir, `ci.workflows[${index}].changedFiles.artifactDir`);
      validateString(errors, workflow.changedFiles && workflow.changedFiles.changedFilesPath, `ci.workflows[${index}].changedFiles.changedFilesPath`);
      validateString(errors, workflow.changedFiles && workflow.changedFiles.worktreeStatusPath, `ci.workflows[${index}].changedFiles.worktreeStatusPath`);
      if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        errors.push(`ci.workflows[${index}].steps must be a non-empty array`);
      } else {
        workflow.steps.forEach((step, stepIndex) => {
          validateString(errors, step.name, `ci.workflows[${index}].steps[${stepIndex}].name`);
          validateString(errors, step.entrypointKey, `ci.workflows[${index}].steps[${stepIndex}].entrypointKey`);
        });
      }
    });
  }

  const doctor = profile.doctor;
  if (!doctor || typeof doctor !== 'object') {
    errors.push('doctor must be an object');
  } else {
    if (!Array.isArray(doctor.advisoryLocalSurfaces)) {
      errors.push('doctor.advisoryLocalSurfaces must be an array');
    } else {
      doctor.advisoryLocalSurfaces.forEach((surface, index) => {
        validateString(errors, surface.id, `doctor.advisoryLocalSurfaces[${index}].id`);
        validateString(errors, surface.path, `doctor.advisoryLocalSurfaces[${index}].path`);
        validateString(errors, surface.status, `doctor.advisoryLocalSurfaces[${index}].status`);
        validateString(errors, surface.label, `doctor.advisoryLocalSurfaces[${index}].label`);
      });
    }

    if (!Array.isArray(doctor.portabilityBlockers)) {
      errors.push('doctor.portabilityBlockers must be an array');
    } else {
      doctor.portabilityBlockers.forEach((blocker, index) => {
        validateString(errors, blocker.id, `doctor.portabilityBlockers[${index}].id`);
        validateString(errors, blocker.label, `doctor.portabilityBlockers[${index}].label`);
        if (!Array.isArray(blocker.probes) || blocker.probes.length === 0) {
          errors.push(`doctor.portabilityBlockers[${index}].probes must be a non-empty array`);
        } else {
          blocker.probes.forEach((probe, probeIndex) => {
            validateString(errors, probe.path, `doctor.portabilityBlockers[${index}].probes[${probeIndex}].path`);
            validateString(errors, probe.pattern, `doctor.portabilityBlockers[${index}].probes[${probeIndex}].pattern`);
          });
        }
      });
    }
  }

  const entrypoints = profile.gateEntrypoints;
  if (!entrypoints || typeof entrypoints !== 'object') {
    errors.push('gateEntrypoints must be an object');
  } else {
    ['dev', 'pr', 'ciDriftCheck', 'ciDev', 'ciPr'].forEach((key) => {
      validateString(errors, entrypoints[key], `gateEntrypoints.${key}`);
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

module.exports = {
  DEFAULT_PROFILE_REL,
  ROOT,
  loadGovernanceProfile,
  relFromRoot,
  resolveFromRoot,
  toPosix,
  validateGovernanceProfile,
};
