'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
module.exports = async function ({ page, click }) {
    const report = { completed: false, interaction: 'actual-pointer', viewports: [] };
    const inside = (a, b) => a.x >= b.x - .5 && a.y >= b.y - .5 && a.x + a.width <= b.x + b.width + .5 && a.y + a.height <= b.y + b.height + .5;
    const separate = (a, b) => a.x + a.width <= b.x + .5 || b.x + b.width <= a.x + .5 || a.y + a.height <= b.y + .5 || b.y + b.height <= a.y + .5;
    async function inspect() {
        return page.evaluate(() => {
            const names = ['SeasonHudCard', 'DeckSelectCard', 'LeadSelectCard', 'GameplayNavigation'];
            const nodes = [], hudButtons = [];
            const canvas = document.querySelector('canvas'), canvasRect = canvas.getBoundingClientRect();
            function rect(node) {
                const ui = node.getComponent('cc.UITransform'), r = ui.getBoundingBoxToWorld();
                const sx = window.cc.view.getScaleX() * canvasRect.width / canvas.width;
                const sy = window.cc.view.getScaleY() * canvasRect.height / canvas.height;
                return { name: node.name, x: canvasRect.x + r.x * sx, y: canvasRect.y + canvasRect.height - (r.y + r.height) * sy, width: r.width * sx, height: r.height * sy };
            }
            function walk(node, inHud = false) {
                if (!node.activeInHierarchy) return;
                const isHud = inHud || node.name === 'SeasonHudCard';
                if (names.includes(node.name)) nodes.push(rect(node));
                if (isHud && node.getComponent('cc.Button')) hudButtons.push(rect(node));
                node.children.forEach(child => walk(child, isHud));
            }
            walk(window.cc.director.getScene());
            return { viewport: { x: 0, y: 0, width: innerWidth, height: innerHeight }, nodes, hudButtons };
        });
    }
    try {
        report.debugProfilerHidden = await page.evaluate(() => {
            if (typeof window.cc.profiler?.hideStats !== 'function') return false;
            window.cc.profiler.hideStats();
            return true;
        });
        for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
            await page.setViewport(viewport);
            await new Promise(resolve => setTimeout(resolve, 650));
            const observation = await inspect();
            report.viewports.push(observation);
            fs.writeFileSync(path.join(__dirname, 'sidebar-observation.json'), JSON.stringify(report, null, 2));
            assert.equal(observation.nodes.length, 4, 'Sidebar cards and navigation must all be visible');
            const hud = observation.nodes.find(n => n.name === 'SeasonHudCard');
            for (const node of observation.nodes) assert(inside(node, observation.viewport), node.name + ' exceeds viewport');
            for (let i = 0; i < observation.nodes.length; i++) for (let j = i + 1; j < observation.nodes.length; j++) {
                assert(separate(observation.nodes[i], observation.nodes[j]), observation.nodes[i].name + ' overlaps ' + observation.nodes[j].name);
            }
            assert.equal(observation.hudButtons.length, 8, 'All HUD entries must remain visible');
            for (const button of observation.hudButtons) assert(inside(button, hud), button.name + ' exceeds HUD');
            const spirit = observation.hudButtons.find(n => n.name === 'BtnOpenSpiritCodex');
            const sandtable = observation.hudButtons.find(n => n.name === 'BtnOpenSandtable');
            assert(spirit.y >= sandtable.y + sandtable.height, 'Spirit must remain below Sandtable');
            await page.screenshot({ path: path.join(__dirname, 'sidebar-' + viewport.width + '.png'), fullPage: true });
            await click('BtnOpenSpiritCodex');
            const opened = await page.evaluate(() => {
                function find(n) { return n.activeInHierarchy && (n.name === 'CodexTitle' || n.children.some(find)); }
                return find(window.cc.director.getScene());
            });
            assert(opened, 'Actual pointer did not open Spirit Codex');
            await click('BtnCloseSpiritCodex');
            const stillOpen = await page.evaluate(() => {
                function find(n) { return n.activeInHierarchy && (n.name === 'BtnCloseSpiritCodex' || n.children.some(find)); }
                return find(window.cc.director.getScene());
            });
            assert(!stillOpen, 'Actual pointer did not close Spirit Codex');
            observation.spiritOpenedAndClosed = true;
        }
        report.completed = true;
    } catch (error) { report.failure = error.message; throw error; }
    finally {
        fs.writeFileSync(path.join(__dirname, 'sidebar-observation.json'), JSON.stringify(report, null, 2));
        await page.setViewport({ width: 1920, height: 1080 });
    }
};
