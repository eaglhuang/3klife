#!/usr/bin/env node
'use strict';

const path = require('node:path');

class ExitSignal extends Error {
  constructor(code) {
    super(`process.exit(${code})`);
    this.name = 'ExitSignal';
    this.code = Number.isInteger(code) ? code : 1;
  }
}

function toTextChunk(chunk, encoding) {
  if (typeof chunk === 'string') return chunk;
  if (Buffer.isBuffer(chunk)) return chunk.toString(typeof encoding === 'string' ? encoding : 'utf8');
  return String(chunk || '');
}

function isPromiseLike(value) {
  return Boolean(value) && typeof value.then === 'function';
}

function shouldFallbackForEperm(runResult) {
  const code = String(runResult && runResult.error && runResult.error.code || '').toUpperCase();
  const message = String(runResult && runResult.error && runResult.error.message || '');
  const stderr = String(runResult && runResult.stderr || '');
  return code === 'EPERM' || /EPERM/i.test(message) || /EPERM/i.test(stderr);
}

async function runScriptInProcess(options) {
  const {
    scriptPath,
    args = [],
    cwd = process.cwd(),
    envPatch = {},
    label = '',
  } = options || {};

  const absoluteScriptPath = path.resolve(cwd, scriptPath);
  const loaded = require(absoluteScriptPath);
  const mainFn = loaded && loaded.main;
  if (typeof mainFn !== 'function') {
    return {
      label,
      command: `in-process ${absoluteScriptPath} ${args.join(' ')}`.trim(),
      status: 1,
      stdout: '',
      stderr: '',
      error: `in-process main() not exported: ${absoluteScriptPath}`,
      mode: 'in-process',
    };
  }

  const stdoutChunks = [];
  const stderrChunks = [];
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const previousEnv = new Map();
  const envKeys = Object.keys(envPatch || {});

  for (const key of envKeys) {
    previousEnv.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    process.env[key] = String(envPatch[key]);
  }

  process.argv = [process.execPath, absoluteScriptPath, ...args];
  process.exit = (code) => {
    throw new ExitSignal(code);
  };
  process.stdout.write = function patchedStdoutWrite(chunk, encoding, callback) {
    stdoutChunks.push(toTextChunk(chunk, encoding));
    if (typeof callback === 'function') callback();
    return true;
  };
  process.stderr.write = function patchedStderrWrite(chunk, encoding, callback) {
    stderrChunks.push(toTextChunk(chunk, encoding));
    if (typeof callback === 'function') callback();
    return true;
  };

  let status = 0;
  let error = null;
  try {
    const maybePromise = mainFn(process.argv);
    if (isPromiseLike(maybePromise)) {
      await maybePromise;
    }
  } catch (err) {
    if (err instanceof ExitSignal) {
      status = err.code;
    } else {
      status = 1;
      error = String(err && (err.stack || err.message) || err);
      stderrChunks.push(`${error}\n`);
    }
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    for (const key of envKeys) {
      const prev = previousEnv.get(key);
      if (typeof prev === 'undefined') delete process.env[key];
      else process.env[key] = prev;
    }
  }

  return {
    label,
    command: `in-process ${absoluteScriptPath} ${args.join(' ')}`.trim(),
    status,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    error,
    mode: 'in-process',
  };
}

module.exports = {
  runScriptInProcess,
  shouldFallbackForEperm,
};

