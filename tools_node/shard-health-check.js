#!/usr/bin/env node
'use strict';

const { main } = require('./check-doc-shard-health');

if (require.main === module) {
  main();
}

module.exports = {
  main,
};