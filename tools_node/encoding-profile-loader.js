'use strict';

const fs = require('fs');
const path = require('path');

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function resolveProfilePath(projectRoot, profilePath) {
  const root = projectRoot ? path.resolve(projectRoot) : path.resolve(__dirname, '..');
  const candidate = profilePath
    ? path.resolve(profilePath)
    : path.join(root, '.atm', 'encoding-guard-profile.json');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  const legacyPath = path.join(root, 'tools_node', 'encoding-integrity.config.json');
  return fs.existsSync(legacyPath) ? legacyPath : candidate;
}

function normalizeEncodingProfile(rawProfile, sourcePath) {
  if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) {
    throw new Error(`Invalid encoding profile payload: ${sourcePath}`);
  }

  if (rawProfile.profilePath) {
    const resolvedProfilePath = path.isAbsolute(rawProfile.profilePath)
      ? rawProfile.profilePath
      : path.resolve(path.dirname(sourcePath), rawProfile.profilePath);
    return loadEncodingProfile({ profilePath: resolvedProfilePath, projectRoot: path.resolve(__dirname, '..') });
  }

  const policy = rawProfile.policy && typeof rawProfile.policy === 'object'
    ? rawProfile.policy
    : rawProfile;

  return {
    sourcePath,
    profile: rawProfile,
    policy,
    metadata: {
      schemaVersion: rawProfile.schemaVersion || null,
      profileId: rawProfile.profileId || null,
      profileVersion: rawProfile.profileVersion || null,
      capability: rawProfile.capability || null,
      enabled: typeof rawProfile.enabled === 'boolean' ? rawProfile.enabled : null,
      generatedAt: rawProfile.generatedAt || null,
      compatibility: rawProfile.compatibility || null,
    },
  };
}

function loadEncodingProfile(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const resolvedPath = resolveProfilePath(projectRoot, options.profilePath);
  const rawProfile = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return normalizeEncodingProfile(rawProfile, resolvedPath);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getEncodingPolicy(profileOrPolicy) {
  if (!profileOrPolicy || typeof profileOrPolicy !== 'object') {
    throw new Error('Encoding profile must be an object.');
  }

  return profileOrPolicy.policy && typeof profileOrPolicy.policy === 'object'
    ? profileOrPolicy.policy
    : profileOrPolicy;
}

function validateEncodingProfile(profile) {
  const policy = getEncodingPolicy(profile);
  const errors = [];

  if (!Array.isArray(policy.allowedExtensions) || policy.allowedExtensions.length === 0) {
    errors.push('allowedExtensions must be a non-empty array.');
  }

  if (!Array.isArray(policy.latinMojibakeFragments) || policy.latinMojibakeFragments.length === 0) {
    errors.push('latinMojibakeFragments must be a non-empty array.');
  }

  if (typeof policy.latinMojibakeMinCount !== 'number' || policy.latinMojibakeMinCount < 1) {
    errors.push('latinMojibakeMinCount must be a positive number.');
  }

  if (typeof policy.latinMojibakeMinRatio !== 'number' || policy.latinMojibakeMinRatio < 0) {
    errors.push('latinMojibakeMinRatio must be a non-negative number.');
  }

  if (typeof policy.weirdCjkMinCount !== 'number' || policy.weirdCjkMinCount < 1) {
    errors.push('weirdCjkMinCount must be a positive number.');
  }

  if (!policy.highRiskFiles || typeof policy.highRiskFiles !== 'object' || Array.isArray(policy.highRiskFiles)) {
    errors.push('highRiskFiles must be an object.');
  }

  if (!policy.legacyAllowlist || typeof policy.legacyAllowlist !== 'object' || Array.isArray(policy.legacyAllowlist)) {
    errors.push('legacyAllowlist must be an object.');
  }

  if (policy.forbiddenPatterns !== undefined) {
    if (!Array.isArray(policy.forbiddenPatterns)) {
      errors.push('forbiddenPatterns must be an array when provided.');
    } else {
      policy.forbiddenPatterns.forEach((rule, index) => {
        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
          errors.push(`forbiddenPatterns[${index}] must be an object.`);
          return;
        }
        if (typeof rule.pathPattern !== 'string' || !rule.pathPattern.trim()) {
          errors.push(`forbiddenPatterns[${index}].pathPattern must be a non-empty string.`);
        }
        if (typeof rule.regex !== 'string' || !rule.regex.trim()) {
          errors.push(`forbiddenPatterns[${index}].regex must be a non-empty string.`);
        }
        if (rule.message !== undefined && (typeof rule.message !== 'string' || !rule.message.trim())) {
          errors.push(`forbiddenPatterns[${index}].message must be a non-empty string when provided.`);
        }
      });
    }
  }

  if (profile && typeof profile === 'object' && profile.enabled === false) {
    errors.push('Encoding guard profile must be enabled for this capability.');
  }

  return {
    ok: errors.length === 0,
    errors,
    policy,
  };
}

module.exports = {
  ensureArray,
  getEncodingPolicy,
  loadEncodingProfile,
  normalizeEncodingProfile,
  resolveProfilePath,
  toPosixPath,
  validateEncodingProfile,
};