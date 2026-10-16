'use strict';
const fs = require('fs'), path = require('path');
let source = fs.readFileSync(path.join(__dirname, '../PROG-2-0120/red-face-entry-flow.js'), 'utf8');
const marker = '    final = await observe();\n    await page.screenshot';
if (!source.includes(marker)) throw new Error('Entry helper changed');
source = source.replace(marker, `    await require(path.join(__dirname, 'sidebar-checks'))({ page, click });
    final = await observe();
    await page.screenshot`)
    .replace("name: 'PROG-2-0120-entry-diagnostic'", "name: 'PROG-2-0139-sidebar-validation'")
    .replace('completed: false', 'completed: true')
    .replace('Entry diagnosis only; first-battle victory and complete showcase interaction remain unverified.', 'Sidebar geometry and Spirit entry only; full 0132 acceptance remains incomplete.');
new Function('require', '__dirname', source)(require, __dirname);
