#!/usr/bin/env node
'use strict';

const { runAtmCli } = require('./bootstrap');

process.exitCode = runAtmCli();