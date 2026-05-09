'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function toPosix(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
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

function fingerprintFromBuffer(buffer) {
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

function computeSchemaSnapshot(absPath) {
  const buffer = fs.readFileSync(absPath);
  return {
    absPath,
    schemaText: buffer.toString('utf8'),
    schema: JSON.parse(buffer.toString('utf8')),
    sizeBytes: buffer.length,
    fingerprint: fingerprintFromBuffer(buffer),
  };
}

function createAjvCacheRegistry(options = {}) {
  const registryId = String(options.registryId || 'ajv-cache-registry');
  const cacheByKeyAndFingerprint = new Map();
  const latestFingerprintByCacheKey = new Map();
  const telemetry = {
    registryId,
    hits: 0,
    misses: 0,
    compileCount: 0,
    invalidations: 0,
    schemaReadCount: 0,
    errors: 0,
  };

  function buildCacheEntryKey(cacheKey, fingerprint) {
    return `${cacheKey}::${fingerprint}`;
  }

  function getOrCompile(params = {}) {
    const cacheKey = String(params.cacheKey || '').trim();
    if (!cacheKey) {
      throw new Error('ajv-cache-registry requires a non-empty cacheKey');
    }
    const schemaPath = String(params.schemaPath || '').trim();
    if (!schemaPath) {
      throw new Error(`ajv-cache-registry[${registryId}] requires schemaPath for ${cacheKey}`);
    }
    if (typeof params.compile !== 'function') {
      throw new Error(`ajv-cache-registry[${registryId}] requires compile() for ${cacheKey}`);
    }

    const absPath = path.resolve(schemaPath);
    const snapshot = computeSchemaSnapshot(absPath);
    telemetry.schemaReadCount += 1;

    const prevFingerprint = latestFingerprintByCacheKey.get(cacheKey);
    if (prevFingerprint && prevFingerprint !== snapshot.fingerprint) {
      const staleEntryKey = buildCacheEntryKey(cacheKey, prevFingerprint);
      if (cacheByKeyAndFingerprint.delete(staleEntryKey)) {
        telemetry.invalidations += 1;
      }
    }

    const entryKey = buildCacheEntryKey(cacheKey, snapshot.fingerprint);
    if (cacheByKeyAndFingerprint.has(entryKey)) {
      telemetry.hits += 1;
      latestFingerprintByCacheKey.set(cacheKey, snapshot.fingerprint);
      return {
        ...cacheByKeyAndFingerprint.get(entryKey),
        cache: {
          cacheKey,
          entryKey,
          hit: true,
          fingerprint: snapshot.fingerprint,
          schemaPath: toPosix(path.relative(process.cwd(), absPath)),
        },
      };
    }

    telemetry.misses += 1;
    telemetry.compileCount += 1;
    try {
      const compiled = params.compile({
        cacheKey,
        schemaPath: absPath,
        schema: snapshot.schema,
        fingerprint: snapshot.fingerprint,
        schemaText: snapshot.schemaText,
      });
      const entry = {
        cacheKey,
        fingerprint: snapshot.fingerprint,
        schemaPath: absPath,
        schemaPathPosix: toPosix(absPath),
        compiled,
      };
      cacheByKeyAndFingerprint.set(entryKey, entry);
      latestFingerprintByCacheKey.set(cacheKey, snapshot.fingerprint);
      return {
        ...entry,
        cache: {
          cacheKey,
          entryKey,
          hit: false,
          fingerprint: snapshot.fingerprint,
          schemaPath: toPosix(path.relative(process.cwd(), absPath)),
        },
      };
    } catch (error) {
      telemetry.errors += 1;
      throw error;
    }
  }

  function snapshotTelemetry() {
    return {
      registryId: telemetry.registryId,
      hits: telemetry.hits,
      misses: telemetry.misses,
      compileCount: telemetry.compileCount,
      invalidations: telemetry.invalidations,
      schemaReadCount: telemetry.schemaReadCount,
      errors: telemetry.errors,
      activeEntries: cacheByKeyAndFingerprint.size,
      activeCacheKeys: latestFingerprintByCacheKey.size,
    };
  }

  function clear() {
    cacheByKeyAndFingerprint.clear();
    latestFingerprintByCacheKey.clear();
  }

  return {
    getOrCompile,
    snapshotTelemetry,
    clear,
  };
}

module.exports = {
  stableSerialize,
  createAjvCacheRegistry,
};

