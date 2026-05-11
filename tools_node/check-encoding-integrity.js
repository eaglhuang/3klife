#!/usr/bin/env node
const path = require('path');
const { createEncodingAdapter } = require('./adapters/atm-3klife/encoding-adapter');

const adapter = createEncodingAdapter({
    projectRoot: path.resolve(__dirname, '..'),
});

const exitCode = adapter.runIntegrityCli(process.argv.slice(2), process);
process.exit(exitCode);
