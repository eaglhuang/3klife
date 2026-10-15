'use strict';
const fs = require('fs'), path = require('path');
let adapter = fs.readFileSync(path.join(__dirname, '../PROG-2-0132/spirit-entry-flow.js'), 'utf8');
adapter = adapter.replace("    fs.writeFileSync(path.join(__dirname, 'codex-observation.json')", `    if (!opened || !opened.labels.some(label => /CodexTitle/.test(label.name))) {
        throw new Error('Spirit Codex did not open through actual pointer');
    }
    if (!closed || closed.buttons.some(button => /^btnCloseSpiritCodex$/i.test(button.name))) {
        throw new Error('Spirit Codex did not close through actual pointer');
    }
    fs.writeFileSync(path.join(__dirname, 'codex-observation.json')`);
new Function('require', '__dirname', adapter)(require, __dirname);
