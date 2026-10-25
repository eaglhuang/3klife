'use strict';
// Reuse the actual-pointer diagnostic; stop on the first ordering mismatch.
const fs = require('fs');
const path = require('path');
const original = path.join(__dirname, '../PROG-2-0120/red-face-entry-flow.js');
let source = fs.readFileSync(original, 'utf8');
const branch = 'if (next) { await click(next.name); continue; }';
if (!source.includes(branch)) throw new Error('Entry diagnostic changed; review adapter');
source = source.replace(branch, `if (next) {
    if (/^btnNextTutorial$/i.test(next.name) && !steps.includes('BtnDestinyRow0')) {
        steps.push('ORDER_MISMATCH:tutorial-before-destiny');
        break;
    }
    await click(next.name); continue;
}`);
source = source.replace("name: 'PROG-2-0120-entry-diagnostic'", "name: 'PROG-2-0133-opening-order'");
source = source.replace("limitation: 'Entry diagnosis only; first-battle victory and complete showcase interaction remain unverified.'",
    "limitation: 'Stop at first mismatch: tutorial is visible before destiny selection; remaining acceptance steps are unverified.'");
new Function('require', '__dirname', source)(require, __dirname);
