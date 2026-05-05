'use strict';

const fs = require('fs');
const path = require('path');

const config = require('./project-config');

const ROOT = config.ROOT;
const REGISTRY_JSON = path.join(ROOT, 'docs', 'doc-id-registry.json');
const REGISTRY_MD = path.join(ROOT, 'docs', 'doc-id-registry.md');
const SHARD_DIR = path.join(ROOT, 'docs', 'doc-id-registry-shards');
const SHARD_RC = path.join(SHARD_DIR, '.shardrc.json');

const REGISTRY_NOTE = 'doc_id 系統唯一真相來源。文件路徑異動後 doc_id 不變。Agent 可用 `grep -r "doc_id: <id>"` 或 `node tools_node/resolve-doc-id.js <id>` 定位文件。';

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeEntry(docId, entry) {
  const normalized = {
    id: String(docId || entry.id || '').trim(),
    path: normalizePath(entry.path),
    title: String(entry.title || '').trim(),
    category: String(entry.category || '').trim(),
  };
  if (entry.subtype) {
    normalized.subtype = String(entry.subtype).trim();
  }
  return normalized;
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

function entriesToRegistry(entries) {
  const registry = {};
  for (const entry of sortEntries(entries)) {
    const record = {
      path: entry.path,
      title: entry.title,
      category: entry.category,
    };
    if (entry.subtype) {
      record.subtype = entry.subtype;
    }
    registry[entry.id] = record;
  }
  return registry;
}

function registryToEntries(registry) {
  return sortEntries(
    Object.entries(registry || {}).map(([docId, entry]) => normalizeEntry(docId, entry || {}))
  );
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function looksLikeFlatRegistry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return false;
  }
  const keys = Object.keys(raw);
  if (keys.length === 0) {
    return true;
  }
  return keys.every((key) => /^doc_[a-z]+(?:_[a-z]+)?_\d{4}$/i.test(key));
}

function loadShardConfig() {
  if (!fs.existsSync(SHARD_RC)) {
    return null;
  }
  const cfg = loadJson(SHARD_RC);
  cfg._dir = SHARD_DIR;
  return cfg;
}

function loadEntriesFromShards(cfg) {
  const entries = [];
  for (const shard of cfg.shards || []) {
    const shardPath = path.join(SHARD_DIR, `${shard.name}.json`);
    if (!fs.existsSync(shardPath)) {
      continue;
    }
    const raw = loadJson(shardPath);
    const shardEntries = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.entries)
        ? raw.entries
        : [];
    for (const entry of shardEntries) {
      entries.push(normalizeEntry(entry.id, entry));
    }
  }
  return sortEntries(entries);
}

function loadDocIdRegistryRaw() {
  if (!fs.existsSync(REGISTRY_JSON)) {
    throw new Error('Registry not found. Run node tools_node/doc-id-registry.js first.');
  }

  const raw = loadJson(REGISTRY_JSON);

  if (raw && raw.registry && typeof raw.registry === 'object' && !Array.isArray(raw.registry)) {
    const registry = raw.registry;
    const entries = registryToEntries(registry);
    return {
      format: 'legacy-registry-map',
      raw,
      generated: String(raw.generated || '').trim(),
      note: String(raw.note || REGISTRY_NOTE),
      registry,
      entries,
    };
  }

  if (raw && Array.isArray(raw.entries)) {
    const entries = sortEntries(raw.entries.map((entry) => normalizeEntry(entry.id, entry)));
    return {
      format: 'entry-source',
      raw,
      generated: String(raw.generated || '').trim(),
      note: String(raw.note || REGISTRY_NOTE),
      registry: entriesToRegistry(entries),
      entries,
    };
  }

  if (looksLikeFlatRegistry(raw)) {
    const registry = raw;
    const entries = registryToEntries(registry);
    return {
      format: 'flat-registry-map',
      raw,
      generated: '',
      note: REGISTRY_NOTE,
      registry,
      entries,
    };
  }

  if (raw && Array.isArray(raw.shards)) {
    const cfg = loadShardConfig();
    if (!cfg) {
      throw new Error('doc-id-registry shard index found but docs/doc-id-registry-shards/.shardrc.json is missing');
    }
    const entries = loadEntriesFromShards(cfg);
    return {
      format: 'shard-index',
      raw,
      generated: '',
      note: REGISTRY_NOTE,
      registry: entriesToRegistry(entries),
      entries,
      shardConfig: cfg,
    };
  }

  throw new Error('Unsupported doc-id-registry format');
}

function loadDocIdRegistryMap() {
  return loadDocIdRegistryRaw().registry;
}

function buildRegistrySourcePayload(registry, generatedDate) {
  return {
    generated: generatedDate || new Date().toISOString().split('T')[0],
    note: REGISTRY_NOTE,
    entries: registryToEntries(registry),
  };
}

module.exports = {
  ROOT,
  REGISTRY_JSON,
  REGISTRY_MD,
  SHARD_DIR,
  SHARD_RC,
  REGISTRY_NOTE,
  normalizeEntry,
  registryToEntries,
  entriesToRegistry,
  loadShardConfig,
  loadDocIdRegistryRaw,
  loadDocIdRegistryMap,
  buildRegistrySourcePayload,
};