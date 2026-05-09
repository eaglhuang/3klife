'use strict';

const { createAjvCacheRegistry } = require('./ajv-cache-registry');

function createValidatorOrchestrator(options = {}) {
  const orchestratorId = String(options.orchestratorId || 'validator-orchestrator');
  const validators = new Map();
  const runs = [];
  const cacheRegistry = options.cacheRegistry || createAjvCacheRegistry({
    registryId: `${orchestratorId}:ajv`,
  });

  function registerValidator(spec = {}) {
    const id = String(spec.id || '').trim();
    if (!id) {
      throw new Error(`validator-orchestrator[${orchestratorId}] requires validator id`);
    }
    if (typeof spec.run !== 'function') {
      throw new Error(`validator-orchestrator[${orchestratorId}] validator "${id}" requires run()`);
    }
    validators.set(id, {
      id,
      run: spec.run,
      description: String(spec.description || ''),
      tags: Array.isArray(spec.tags) ? spec.tags.slice() : [],
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  function runValidator(id, input) {
    const validator = validators.get(String(id || '').trim());
    if (!validator) {
      throw new Error(`validator-orchestrator[${orchestratorId}] unknown validator: ${id}`);
    }

    const startedAt = Date.now();
    try {
      const result = validator.run(input);
      const finishedAt = Date.now();
      runs.push({
        id: validator.id,
        passed: true,
        durationMs: finishedAt - startedAt,
        timestamp: new Date(finishedAt).toISOString(),
      });
      return result;
    } catch (error) {
      const finishedAt = Date.now();
      runs.push({
        id: validator.id,
        passed: false,
        durationMs: finishedAt - startedAt,
        timestamp: new Date(finishedAt).toISOString(),
        error: String(error && error.message ? error.message : error),
      });
      throw error;
    }
  }

  function getOrCompileJsonSchemaValidator(params = {}) {
    const cacheKey = String(params.cacheKey || '').trim();
    const schemaPath = String(params.schemaPath || '').trim();
    const buildAjv = typeof params.buildAjv === 'function'
      ? params.buildAjv
      : null;
    if (!buildAjv) {
      throw new Error(`validator-orchestrator[${orchestratorId}] getOrCompileJsonSchemaValidator requires buildAjv()`);
    }

    return cacheRegistry.getOrCompile({
      cacheKey,
      schemaPath,
      compile: ({ schema, schemaPath: absPath, fingerprint }) => {
        const ajv = buildAjv({ schemaPath: absPath, fingerprint });
        if (!ajv || typeof ajv.compile !== 'function') {
          throw new Error(`validator-orchestrator[${orchestratorId}] buildAjv() must return AJV instance`);
        }
        if (typeof params.beforeCompile === 'function') {
          params.beforeCompile({ ajv, schema, schemaPath: absPath, fingerprint });
        }
        const compiled = typeof params.compile === 'function'
          ? params.compile({ ajv, schema, schemaPath: absPath, fingerprint })
          : ajv.compile(schema);
        return compiled;
      },
    });
  }

  function snapshotTelemetry() {
    const totalRuns = runs.length;
    const failedRuns = runs.filter((item) => item.passed === false).length;
    const successfulRuns = totalRuns - failedRuns;
    const totalDurationMs = runs.reduce((sum, item) => sum + (Number.isFinite(item.durationMs) ? item.durationMs : 0), 0);
    const recentRuns = runs.slice(-20);
    return {
      orchestratorId,
      registry: {
        validatorCount: validators.size,
        ids: Array.from(validators.keys()),
      },
      run: {
        totalRuns,
        successfulRuns,
        failedRuns,
        totalDurationMs,
        recentRuns,
      },
      cache: cacheRegistry.snapshotTelemetry(),
    };
  }

  function clearRunHistory() {
    runs.length = 0;
  }

  return {
    registerValidator,
    runValidator,
    getOrCompileJsonSchemaValidator,
    snapshotTelemetry,
    clearRunHistory,
  };
}

module.exports = {
  createValidatorOrchestrator,
};

