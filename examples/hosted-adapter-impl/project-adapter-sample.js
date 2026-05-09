'use strict';

const fs = require('fs');
const path = require('path');

const {
  create3KLifeProjectAdapter,
} = require('../../tools_node/adapters/atm-3klife/project-adapter');

function loadConfig() {
  const filePath = path.resolve(__dirname, 'adapter.config.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function printResult(label, result) {
  const output = {
    label,
    ok: result && result.ok,
    adapterName: result && result.adapterName,
    lifecycleMode: result && result.lifecycleMode,
    messages: (result && result.messages) || [],
    artifacts: ((result && result.artifacts) || []).map((item) => item.artifactPath),
  };
  console.log(JSON.stringify(output, null, 2));
}

function run() {
  const config = loadConfig();
  const adapter = create3KLifeProjectAdapter(config);
  const context = {
    repositoryRoot: path.resolve(__dirname, '../..'),
    lifecycleMode: 'evolution',
    atomId: 'ATM-5-0002',
  };
  const workItem = {
    workItemId: 'ATM-5-0002',
    title: 'Adapter Guide 與 Plugin SDK 文件',
    status: 'running',
  };

  printResult('initialize', adapter.initialize(context));
  printResult('prepareWorkItem', adapter.prepareWorkItem(context, workItem));
  printResult('finalizeWorkItem', adapter.finalizeWorkItem(context, workItem));
}

run();
