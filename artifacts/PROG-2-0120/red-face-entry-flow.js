'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');

async function runEntry(page) {
    const steps = [];
    async function observe() {
        return page.evaluate(() => {
            const scene = window.cc.director.getScene();
            const buttons = [], labels = [];
            function walk(node) {
                if (!node.activeInHierarchy) return;
                const label = node.getComponent('cc.Label');
                const button = node.getComponent('cc.Button');
                if (label) labels.push({ name: node.name, text: label.string });
                if (button) buttons.push({ name: node.name, enabled: button.interactable });
                node.children.forEach(walk);
            }
            walk(scene);
            return { scene: scene.name, buttons, labels };
        });
    }
    async function click(name) {
        const point = await page.evaluate(name => {
            let target;
            function walk(node) {
                if (!node.activeInHierarchy) return;
                if (!target && node.name === name && node.getComponent('cc.Button')?.interactable) target = node;
                node.children.forEach(walk);
            }
            walk(window.cc.director.getScene());
            if (!target) throw new Error(`No enabled button: ${name}`);
            const ui = target.getComponent('cc.UITransform');
            const p = ui.convertToWorldSpaceAR(new window.cc.Vec3(ui.width * (.5 - ui.anchorX), ui.height * (.5 - ui.anchorY), 0));
            const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
            return { x: rect.x + p.x * window.cc.view.getScaleX() * rect.width / canvas.width,
                y: rect.y + rect.height - p.y * window.cc.view.getScaleY() * rect.height / canvas.height };
        }, name);
        await page.mouse.click(point.x, point.y);
        await new Promise(resolve => setTimeout(resolve, 900));
        steps.push(name);
    }
    await page.waitForFunction(() => window.cc?.director?.getScene()?.name === 'LoginScene', { timeout: 60000 });
    await click('BtnStart');
    await page.waitForFunction(() => window.cc?.director?.getScene()?.name !== 'LoginScene', { timeout: 60000 });
    await page.waitForFunction(() => {
        function ready(node) {
            if (!node.activeInHierarchy) return false;
            return Boolean(node.getComponent('cc.Button')?.interactable) || node.children.some(ready);
        }
        return ready(window.cc.director.getScene());
    }, { timeout: 60000 });
    let final;
    for (let i = 0; i < 24; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        final = await observe();
        const enabled = final.buttons.filter(button => button.enabled);
        const next = enabled.find(button => /^(btnIntroNext|btnNextTutorial)$/i.test(button.name));
        if (next) { await click(next.name); continue; }
        const roll = enabled.find(button => /^btnDestinyRoll$/i.test(button.name));
        const row = enabled.find(button => /^btnDestinyRow0$/i.test(button.name));
        const confirm = enabled.find(button => /^btnDestinyConfirm$/i.test(button.name));
        if (confirm) { await click(confirm.name); continue; }
        if (row) { await click(row.name); continue; }
        if (roll && !steps.includes(roll.name)) { await click(roll.name); continue; }
        break;
    }
    final = await observe();
    await page.screenshot({ path: path.join(__dirname, 'entry-observation.png'), fullPage: true });
    const hasShowcase = final.labels.some(label => /RedFace/i.test(label.name));
    const report = { name: 'PROG-2-0120-entry-diagnostic', completed: false,
        interaction: 'actual-pointer', steps, showcaseObserved: hasShowcase, final,
        limitation: 'Entry diagnosis only; first-battle victory and complete showcase interaction remain unverified.' };
    fs.writeFileSync(path.join(__dirname, 'entry-observation.json'), JSON.stringify(report, null, 2), 'utf8');
    return report;
}
require(path.join(root, 'tools_node/lib/web-three-generation-flow')).runThreeGenerationFlow = runEntry;
process.argv.push('--flow', 'three-generation');
require(path.join(root, 'tools_node/run-web-smoke'));
