'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PROFILE = Object.freeze({
  categoryPrefixes: {
    tech: 'doc_tech',
    ui: 'doc_ui',
    art: 'doc_art',
    data: 'doc_data',
    spec: 'doc_spec',
    index: 'doc_index',
    task: 'doc_task',
    ai: 'doc_ai',
    agentskill: 'doc_agentskill',
    server: 'doc_server',
    other: 'doc_other',
  },
  serverSubtypePrefixes: {
    service: 'doc_server_service',
    pipeline: 'doc_server_pipeline',
    data: 'doc_server_data',
    ops: 'doc_server_ops',
    other: 'doc_server_other',
  },
  serverSubtypeFallback: 'other',
});

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadProfile(profilePath) {
  if (!profilePath || !fs.existsSync(profilePath)) {
    return DEFAULT_PROFILE;
  }

  const raw = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  return {
    categoryPrefixes: {
      ...DEFAULT_PROFILE.categoryPrefixes,
      ...(raw.categoryPrefixes || {}),
    },
    serverSubtypePrefixes: {
      ...DEFAULT_PROFILE.serverSubtypePrefixes,
      ...(raw.serverSubtypePrefixes || {}),
    },
    serverSubtypeFallback: raw.serverSubtypeFallback || DEFAULT_PROFILE.serverSubtypeFallback,
  };
}

class DocumentIndexAdapter {
  constructor(options = {}) {
    const profilePath = options.profilePath
      ? path.resolve(options.profilePath)
      : path.resolve(__dirname, 'doc-index-profile.json');
    this.profile = loadProfile(profilePath);
    this.profilePath = profilePath;
  }

  resolvePrefix(classified) {
    const category = String(classified && classified.category || '').trim();
    if (!category) {
      throw new Error('DocumentIndexAdapter.assignId requires classified.category');
    }

    if (category === 'server') {
      const subtype = String(classified && classified.subtype || this.profile.serverSubtypeFallback).trim() || this.profile.serverSubtypeFallback;
      return this.profile.serverSubtypePrefixes[subtype] || `${this.profile.categoryPrefixes.server}_${subtype}`;
    }

    const prefix = this.profile.categoryPrefixes[category];
    if (!prefix) {
      throw new Error(`DocumentIndexAdapter.assignId unsupported category: ${category}`);
    }
    return prefix;
  }

  assignId(relPath, classified, registry) {
    const normalizedPath = String(relPath || '').replace(/\\/g, '/');
    const registryEntries = Object.entries(registry || {});

    for (const [id, entry] of registryEntries) {
      if (entry && entry.path === normalizedPath) {
        return {
          id,
          reason: 'already-registered',
          prefix: '',
        };
      }
    }

    const prefix = this.resolvePrefix(classified);
    const idPattern = new RegExp(`^${escapeRegex(prefix)}_(\\d{4})$`, 'i');
    let maxNumber = 0;

    for (const docId of Object.keys(registry || {})) {
      const match = String(docId || '').match(idPattern);
      if (!match) {
        continue;
      }
      const number = Number.parseInt(match[1], 10);
      if (Number.isFinite(number)) {
        maxNumber = Math.max(maxNumber, number);
      }
    }

    return {
      id: `${prefix}_${String(maxNumber + 1).padStart(4, '0')}`,
      reason: 'new',
      prefix,
    };
  }
}

function createDocumentIndexAdapter(options = {}) {
  return new DocumentIndexAdapter(options);
}

module.exports = {
  DocumentIndexAdapter,
  createDocumentIndexAdapter,
};