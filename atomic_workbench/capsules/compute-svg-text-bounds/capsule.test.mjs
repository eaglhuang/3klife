import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(readFileSync(new URL('./capsule.manifest.json', import.meta.url), 'utf8'));
const capsuleRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(capsuleRoot, '../../..');
const sourcePath = path.resolve(repoRoot, manifest.source.file);
const source = readFileSync(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const slice = lines.slice(manifest.source.sourceRange.startLine - 1, manifest.source.sourceRange.endLine).join('\n');
const actual = `sf:sha256:${createHash('sha256').update(String(slice || '').replace(/\s+/g, ' ').trim()).digest('hex')}`;
assert.equal(actual, manifest.source.semanticFingerprint, 'source range semantic fingerprint');
assert.ok(Array.isArray(manifest.lineage.parentRefs) && manifest.lineage.parentRefs.length > 0, 'lineage parent refs');
assert.ok(typeof manifest.anchorId === 'string' && manifest.anchorId.length > 0, 'anchorId present');
console.log(`${manifest.capsuleId} capsule metadata self-check ok`);
