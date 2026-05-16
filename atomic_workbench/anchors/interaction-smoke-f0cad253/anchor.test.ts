import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(readFileSync(new URL('./anchor.manifest.json', import.meta.url), 'utf8'));
const anchorRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(anchorRoot, '../../..');
const sourcePath = path.resolve(repoRoot, manifest.source.file);
const source = readFileSync(sourcePath, 'utf8');
const actual = `sf:sha256:${createHash('sha256').update(String(source || '').replace(/\s+/g, ' ').trim()).digest('hex')}`;
assert.equal(actual, manifest.semanticFingerprint, 'module fingerprint');
assert.ok(Array.isArray(manifest.children) && manifest.children.length > 0, 'anchor children');
console.log(`${manifest.anchorId} anchor self-check ok`);
