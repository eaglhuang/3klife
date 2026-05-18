#!/usr/bin/env node
'use strict';

const registry = require('./doc-id-registry');

async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] === '--assign' ? args[1] : args[0];

  if (!targetPath || args.includes('--help') || args.includes('-h')) {
    console.log([
      'Usage:',
      '  node tools_node/assign-doc-id.js <path>',
      '  node tools_node/assign-doc-id.js --assign <path>',
      '',
      'Assigns and injects a stable doc_id for the given markdown file.',
    ].join('\n'));
    process.exit(0);
  }

  await registry.assignFile(targetPath);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
}

module.exports = {
  main,
};