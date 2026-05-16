import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('./capsule.manifest.json', import.meta.url), 'utf8'));
for (const kind of manifest.requiredCaseSets || []) {
  const fileName = `./tests/${kind}.cases.json`;
  const cases = JSON.parse(readFileSync(new URL(fileName, import.meta.url), 'utf8'));
  assert.ok(Array.isArray(cases) && cases.length > 0, `${kind} cases present`);
  for (const item of cases) {
    assert.equal(item.kind, kind, `${kind} case kind matches`);
    assert.ok(typeof item.id === 'string' && item.id.length > 0, `${kind} case id`);
    assert.ok(typeof item.title === 'string' && item.title.length > 0, `${kind} case title`);
    assert.ok(Object.prototype.hasOwnProperty.call(item, 'inputSample'), `${kind} input sample`);
    assert.ok(item.expectation && typeof item.expectation === 'object', `${kind} expectation`);
  }
}
console.log(`${manifest.capsuleId} behavior template contract ok`);
