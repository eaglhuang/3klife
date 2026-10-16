'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
module.exports = async function ({ page, observe, click }) {
    const report = { completed: false, fixture: 'Card-authorized debug openMentorCardDetail; no save or nurture data changes', checks: [] };
    async function state() {
        return page.evaluate(() => {
            const nodes = [];
            function walk(node) {
                if (node.name === 'MentorCardDetailHost' || node.name === 'MentorCardPanel' || /^Row(Label|Lock)?\d$/.test(node.name) || /^Tab.*Label$/.test(node.name)) {
                    const label = node.getComponent('cc.Label'), ui = node.getComponent('cc.UITransform');
                    const rect = ui?.getBoundingBoxToWorld();
                    nodes.push({ name: node.name, active: node.activeInHierarchy, text: label?.string,
                        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null });
                }
                node.children.forEach(walk);
            }
            walk(window.cc.director.getScene()); return nodes;
        });
    }
    async function capture(name) {
        const nodes = await state();
        await page.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
        report.checks.push({ name, nodes });
        fs.writeFileSync(path.join(__dirname, 'mentor-observation.json'), JSON.stringify(report, null, 2));
        return nodes;
    }
    async function debugOpen() {
        await page.evaluate(() => {
            let lobby;
            function find(n) { lobby ||= n.getComponent('LobbyScene'); n.children.forEach(find); }
            find(window.cc.director.getScene());
            if (!lobby) throw new Error('LobbyScene component not found');
            lobby.openMentorCardDetail({ star: 2,
                effects: Array.from({ length: 6 }, (_, i) => ({ id: 'effect-' + i, label: '支援效果測試 ' + (i + 1), requiredStar: 0 })),
                events: Array.from({ length: 6 }, (_, i) => ({ id: 'event-' + i, group: i + 1, skillName: '培育事件測試 ' + (i + 1) })),
                stories: Array.from({ length: 6 }, (_, i) => ({ id: 'story-' + i, title: '小插曲測試 ' + (i + 1) }))
            }, '教官卡詳情驗收');
        });
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    try {
        const hidden = await capture('01-hidden');
        assert(hidden.some(n => n.name === 'MentorCardDetailHost' && !n.active), 'Mounted mentor host must start hidden');
        await debugOpen();
        const effects = await capture('02-effects');
        assert(effects.some(n => n.name === 'TabEffectsLabel' && n.text === '▸ 支援效果'), 'Effects tab must be selected by default');
        await click('BtnTabEvents');
        const events = await capture('03-events');
        for (let i = 0; i < 6; i++) {
            const lock = events.find(n => n.name === 'RowLock' + i);
            assert(lock && (i < 3 ? !lock.active : lock.active && lock.text.includes('需達 ★' + i)), 'Unexpected star lock at row ' + i);
            const content = events.find(n => n.name === 'RowLabel' + i);
            if (i >= 3) assert(!content?.active || !content.text, 'Locked row still reveals event contents at row ' + i);
        }
        await click('BtnTabStory');
        const story = await capture('04-story');
        assert(story.some(n => n.name === 'RowLabel0' && n.text === '小插曲測試 1'), 'Story contents did not change');
        for (const snapshot of report.checks.slice(1)) for (const n of snapshot.nodes.filter(n => n.active && /^Row(Label|Lock)\d$/.test(n.name))) {
            const row = snapshot.nodes.find(r => r.name === 'Row' + n.name.slice(-1));
            assert(row && n.rect.x >= row.rect.x && n.rect.x + n.rect.width <= row.rect.x + row.rect.width + .1, n.name + ' exceeds row');
        }
        await click('BtnCloseMentorCard');
        const closed = await capture('05-closed');
        assert(closed.some(n => n.name === 'MentorCardDetailHost' && !n.active), 'Close did not hide mentor host');
        await debugOpen();
        const reopened = await capture('06-reopened');
        assert(reopened.some(n => n.name === 'TabEffectsLabel' && n.text === '▸ 支援效果'), 'Reopen did not reset tab');
        report.steps1to5Passed = true;
        report.remaining = 'Step 6: real nurture training entry with and without assigned mentor remains unverified';
    } catch (error) { report.failure = error.message; throw error; }
    finally { fs.writeFileSync(path.join(__dirname, 'mentor-observation.json'), JSON.stringify(report, null, 2)); }
};
