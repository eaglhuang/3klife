'use strict';

const path = require('path');
const cp = require('child_process');

const docIdRegistryLoader = require('../../lib/doc-id-registry-loader');
const { createDocumentIndexAdapter } = require('./document-index-adapter');

class DocumentAdapter {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot
      ? path.resolve(options.projectRoot)
      : path.resolve(__dirname, '..', '..', '..');
    this.profilePath = options.profilePath
      ? path.resolve(options.profilePath)
      : path.resolve(__dirname, 'doc-index-profile.json');
    this.assignScriptPath = options.assignScriptPath
      ? path.resolve(options.assignScriptPath)
      : path.join(this.projectRoot, 'tools_node', 'doc-id-registry.js');
    this.documentIndexAdapter = createDocumentIndexAdapter({
      profilePath: this.profilePath,
    });
  }

  toRelativePath(filePath) {
    return path.relative(this.projectRoot, path.resolve(filePath)).replace(/\\/g, '/');
  }

  resolveDocumentId(documentId) {
    const registry = docIdRegistryLoader.loadDocIdRegistryMap();
    const entry = registry[String(documentId || '').trim()];
    return entry ? entry.path : null;
  }

  searchDocuments(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) {
      return [];
    }
    const registry = docIdRegistryLoader.loadDocIdRegistryMap();
    return Object.entries(registry)
      .filter(([docId, entry]) =>
        docId.toLowerCase().includes(needle)
        || String(entry.path || '').toLowerCase().includes(needle)
        || String(entry.title || '').toLowerCase().includes(needle)
      )
      .map(([, entry]) => entry.path)
      .sort((left, right) => left.localeCompare(right));
  }

  assignId(relPath, classified, registry) {
    return this.documentIndexAdapter.assignId(relPath, classified, registry);
  }

  shouldFallbackToModuleApi(result, options = {}) {
    if (options.disableModuleFallback) {
      return false;
    }
    if (!result || !result.error) {
      return false;
    }
    const code = String(result.error.code || '').toUpperCase();
    return code === 'EPERM' || code === 'EAGAIN' || code === 'UNKNOWN';
  }

  async assignDocId(markdownFilePath, options = {}) {
    const relative = this.toRelativePath(markdownFilePath);
    const result = cp.spawnSync(process.execPath, [this.assignScriptPath, '--assign', relative], {
      cwd: this.projectRoot,
      encoding: 'utf8',
      stdio: options.stdio || 'pipe',
      shell: false,
    });

    const status = result.status ?? 1;
    if (status !== 0) {
      if (this.shouldFallbackToModuleApi(result, options)) {
        const moduleExports = require(this.assignScriptPath);
        if (!moduleExports || typeof moduleExports.assignFile !== 'function') {
          throw new Error(`doc-id assignment fallback unavailable for ${relative}`);
        }
        await moduleExports.assignFile(path.join(this.projectRoot, relative));
        return {
          ok: true,
          status: 0,
          command: `node tools_node/doc-id-registry.js --assign ${relative}`,
          documentPath: relative,
          stdout: String(result.stdout || ''),
          stderr: String(result.stderr || ''),
          fallback: 'module-api',
          spawnErrorCode: result.error && result.error.code ? String(result.error.code) : '',
        };
      }
      const stderr = String(result.stderr || '').trim();
      const stdout = String(result.stdout || '').trim();
      const spawnError = result.error ? String(result.error.message || result.error.code || '').trim() : '';
      throw new Error(stderr || stdout || spawnError || `doc-id assignment failed for ${relative}`);
    }

    return {
      ok: true,
      status,
      command: `node tools_node/doc-id-registry.js --assign ${relative}`,
      documentPath: relative,
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
    };
  }
}

function createDocumentAdapter(options = {}) {
  return new DocumentAdapter(options);
}

module.exports = {
  DocumentAdapter,
  createDocumentAdapter,
};
