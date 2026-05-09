'use strict';

const path = require('path');
const cp = require('child_process');

class EncodingAdapter {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot
      ? path.resolve(options.projectRoot)
      : path.resolve(__dirname, '..', '..', '..');
    this.checkTouchedScriptPath = options.checkTouchedScriptPath
      ? path.resolve(options.checkTouchedScriptPath)
      : path.join(this.projectRoot, 'tools_node', 'check-encoding-touched.js');
    this.checkIntegrityScriptPath = options.checkIntegrityScriptPath
      ? path.resolve(options.checkIntegrityScriptPath)
      : path.join(this.projectRoot, 'tools_node', 'check-encoding-integrity.js');
  }

  normalizeFiles(files) {
    return Array.from(new Set((Array.isArray(files) ? files : [])
      .map((filePath) => String(filePath || '').trim().replace(/\\/g, '/'))
      .filter(Boolean)));
  }

  run(scriptPath, args) {
    const result = cp.spawnSync(process.execPath, [scriptPath, ...args], {
      cwd: this.projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: false,
    });
    return {
      ok: (result.status ?? 1) === 0,
      exitCode: result.status ?? 1,
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
      command: `node ${path.relative(this.projectRoot, scriptPath).replace(/\\/g, '/')} ${args.join(' ')}`.trim(),
    };
  }

  checkTouched(files = []) {
    const normalized = this.normalizeFiles(files);
    const args = normalized.length > 0 ? ['--files', ...normalized] : [];
    return this.run(this.checkTouchedScriptPath, args);
  }

  checkIntegrity(options = {}) {
    const normalized = this.normalizeFiles(options.files);
    let args = [];
    if (normalized.length > 0) {
      args = ['--files', ...normalized];
    } else if (options.staged === true) {
      args = ['--staged'];
    }
    return this.run(this.checkIntegrityScriptPath, args);
  }
}

function createEncodingAdapter(options = {}) {
  return new EncodingAdapter(options);
}

module.exports = {
  EncodingAdapter,
  createEncodingAdapter,
};
