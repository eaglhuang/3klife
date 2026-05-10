'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv, options = {}) {
  const repeatable = new Set(options.repeatable || []);
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const equalsIndex = token.indexOf('=');
    const rawKey = equalsIndex >= 0 ? token.slice(2, equalsIndex) : token.slice(2);
    let value = true;
    if (equalsIndex >= 0) {
      value = token.slice(equalsIndex + 1);
    } else if (index + 1 < argv.length && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }
    if (repeatable.has(rawKey)) {
      if (!Array.isArray(args[rawKey])) {
        args[rawKey] = [];
      }
      args[rawKey].push(value);
    } else {
      args[rawKey] = value;
    }
  }
  return args;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonFile(filePath) {
  return JSON.parse(readTextFile(filePath));
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function resolveProjectPath(value) {
  if (!value) {
    return '';
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(PROJECT_ROOT, value);
}

function resolveCacheDir(toolName, override) {
  return override
    ? resolveProjectPath(String(override))
    : path.join(PROJECT_ROOT, 'local', 'agent-cli-cache', toolName);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

function sha256Short(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex').slice(0, 16);
}

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[(){}\[\]<>:;,.'"`~!@#$%^&*+=?\/\\|_-]/g, '')
    .replace(/[\u3000\u3001\u3002\uff0c\uff1b\uff1a\uff01\uff1f\u300c\u300d\u300e\u300f\u3010\u3011]/g, '');
}

function uniqueStrings(values) {
  const seen = new Set();
  const ordered = [];
  for (const value of values || []) {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    ordered.push(text);
  }
  return ordered;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildBasePayload(toolName, args, extra = {}) {
  return {
    ok: true,
    tool: toolName,
    generatedAt: new Date().toISOString(),
    canonicalWrites: false,
    dryRun: Boolean(args['dry-run']),
    support: [
      '--help',
      '--json',
      '--compact',
      '--dry-run',
      '--limit',
      '--cache-dir',
      '--output',
      '--self-test',
    ],
    ...extra,
  };
}

function emitPayload(payload, args, renderText, renderCompact) {
  if (args.output && args.output !== true) {
    writeJsonFile(resolveProjectPath(String(args.output)), payload);
  }
  if (args.compact) {
    const compactPayload = typeof renderCompact === 'function' ? renderCompact(payload) : payload;
    process.stdout.write(`${JSON.stringify(compactPayload)}\n`);
    return;
  }
  if (args.json || typeof renderText !== 'function') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderText(payload)}\n`);
}

function calculateByteMetrics(payload, compactPayload) {
  return {
    prettyJsonBytes: Buffer.byteLength(JSON.stringify(payload, null, 2), 'utf8'),
    compactBytes: Buffer.byteLength(JSON.stringify(compactPayload), 'utf8'),
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

module.exports = {
  PROJECT_ROOT,
  buildBasePayload,
  calculateByteMetrics,
  emitPayload,
  ensureDir,
  fileExists,
  normalizeLabel,
  parseArgs,
  readJsonFile,
  readStdin,
  readTextFile,
  resolveCacheDir,
  resolveProjectPath,
  safeArray,
  safeObject,
  sha256Short,
  stripHtml,
  toInt,
  truncate,
  uniqueStrings,
  writeJsonFile,
};
