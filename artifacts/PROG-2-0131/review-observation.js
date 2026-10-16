'use strict';
const fs = require('fs'), path = require('path');
const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'mentor-observation.json'), 'utf8'));
const events = original.checks.find(c => c.name === '03-events');
if (!events) throw new Error('Missing real-pointer events observation');
const leaks = events.nodes.filter(n => /^RowLock\d$/.test(n.name) && n.active).flatMap(lock => {
    const content = events.nodes.find(n => n.name === 'RowLabel' + lock.name.slice(-1));
    return content?.active && content.text ? [{ name: content.name, text: content.text, lock: lock.text }] : [];
});
const result = {
    completed: false, firstFailedStep: 3, pass: leaks.length === 0, leaks,
    correction: 'The initial harness checked star-lock presence but missed locked content visibility. Its steps1to5Passed is not acceptance authority.',
    unverified: ['Step 4 visual text fit', 'Step 6 real nurture entry with and without a mentor'],
};
fs.writeFileSync(path.join(__dirname, 'acceptance-review.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
