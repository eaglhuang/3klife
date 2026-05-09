#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const { createDocumentAdapter } = require('../../tools_node/adapters/atm-3klife/document-adapter');
const { createEncodingAdapter } = require('../../tools_node/adapters/atm-3klife/encoding-adapter');
const { create3KLifeProjectAdapter } = require('../../tools_node/adapters/atm-3klife/project-adapter');

const projectRoot = path.resolve(__dirname, '..', '..');

function main() {
  const documentAdapter = createDocumentAdapter({ projectRoot });
  const encodingAdapter = createEncodingAdapter({ projectRoot });

  const probeRegistry = {
    doc_task_0001: {
      path: 'docs/agent-briefs/tasks/ATM/ATM-0-0001.md',
      title: 'probe',
      category: 'task',
    },
  };
  const assignProbe = documentAdapter.assignId(
    'docs/agent-briefs/tasks/ATM/ATM-TEST-9999.md',
    { category: 'task' },
    probeRegistry,
  );
  assert.strictEqual(assignProbe.id, 'doc_task_0002');

  const resolved = documentAdapter.resolveDocumentId('doc_task_0264');
  assert.strictEqual(resolved, 'docs/agent-briefs/tasks/ATM/ATM-3-0001.md');

  const searchResult = documentAdapter.searchDocuments('ATM-3-0001');
  assert.ok(searchResult.includes('docs/agent-briefs/tasks/ATM/ATM-3-0001.md'));

  const touchedEncoding = encodingAdapter.checkTouched(['docs/agent-briefs/tasks/ATM/ATM-3-0001.md']);
  assert.strictEqual(touchedEncoding.ok, true);
  assert.ok(touchedEncoding.command.includes('check-encoding-touched.js'));

  const integrityEncoding = encodingAdapter.checkIntegrity({
    files: ['docs/agent-briefs/tasks/ATM/ATM-3-0001.md'],
  });
  assert.strictEqual(integrityEncoding.ok, true);
  assert.ok(integrityEncoding.command.includes('check-encoding-integrity.js'));

  const projectAdapter = create3KLifeProjectAdapter();
  const docPath = projectAdapter.stores.documentIndex.resolveDocumentId('doc_task_0264');
  assert.strictEqual(docPath, 'docs/agent-briefs/tasks/ATM/ATM-3-0001.md');

  const encodingGuard = projectAdapter.stores.ruleGuard.runGuard('encoding', {
    files: ['docs/agent-briefs/tasks/ATM/ATM-3-0001.md'],
  });
  assert.strictEqual(encodingGuard.ok, true);
  assert.ok(encodingGuard.messages.some((message) => String(message).includes('Guard encoding passed.')));

  console.log('document/encoding adapter hook tests passed');
}

main();
