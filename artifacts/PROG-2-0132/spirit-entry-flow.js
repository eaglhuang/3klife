'use strict';
const fs = require('fs'), path = require('path');
let source = fs.readFileSync(path.join(__dirname, '../PROG-2-0120/red-face-entry-flow.js'), 'utf8');
source = source.replace('const steps = [];', 'const steps = [], pointerPoints = [];');
source = source.replace('await page.mouse.click(point.x, point.y);', `pointerPoints.push({ name, ...point });
        fs.writeFileSync(path.join(__dirname, 'pointer-points.json'), JSON.stringify(pointerPoints, null, 2));
        await page.mouse.click(point.x, point.y);`);
const marker = '    final = await observe();\n    await page.screenshot';
if (!source.includes(marker)) throw new Error('Entry helper changed; review adapter');
source = source.replace(marker, `    const beforeCodex = await observe();
    await page.screenshot({ path: path.join(__dirname, 'hud.png'), fullPage: true });
    const open = beforeCodex.buttons.find(button => /^btnOpenSpiritCodex$/i.test(button.name) && button.enabled);
    let opened = null, closed = null;
    if (open) {
        await click(open.name);
        opened = await observe();
        await page.screenshot({ path: path.join(__dirname, 'codex.png'), fullPage: true });
        const close = opened.buttons.find(button => /^btnCloseSpiritCodex$/i.test(button.name) && button.enabled);
        if (close) { await click(close.name); closed = await observe(); }
    }
    fs.writeFileSync(path.join(__dirname, 'codex-observation.json'), JSON.stringify({
        interaction: 'actual-pointer', beforeCodex, opened, closed,
        limitation: 'No spirit cards injected; populated, overflow, multilingual and phone checks are not yet verified.'
    }, null, 2));
    final = await observe();
    await page.screenshot`);
source = source.replace("await page.screenshot({ path: path.join(__dirname, 'entry-observation.png'), fullPage: true });", '// Dedicated HUD and codex captures above.');
source = source.replace("name: 'PROG-2-0120-entry-diagnostic'", "name: 'PROG-2-0132-spirit-entry-diagnostic'");
new Function('require', '__dirname', source)(require, __dirname);
