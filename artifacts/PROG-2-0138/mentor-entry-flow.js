'use strict';
const fs = require('fs'), path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../PROG-2-0131/mentor-entry-flow.js'), 'utf8');
new Function('require', '__dirname', source)(require, __dirname);
