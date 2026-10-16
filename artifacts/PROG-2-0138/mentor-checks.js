'use strict';
const fs = require('fs'), path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../PROG-2-0131/mentor-checks.js'), 'utf8')
    .replace('requiredStar: 0', 'requiredStar: i');
const implementation = { exports: {} };
new Function('require', '__dirname', 'module', source)(require, __dirname, implementation);
module.exports = implementation.exports;
