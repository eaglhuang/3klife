'use strict';
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../PROG-2-0120/red-face-entry-flow.js'), 'utf8')
    .replace("name: 'PROG-2-0120-entry-diagnostic'", "name: 'PROG-2-0136-onboarding-order'");
new Function('require', '__dirname', source)(require, __dirname);
