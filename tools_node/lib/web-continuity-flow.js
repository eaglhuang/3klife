'use strict';

/** Actual pointer acceptance for continuous save, victory, tactics and three generations; all inspected game state is read-only. */
async function runContinuityFlow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [], clicks = [];
    const evidence = { name: 'continuity', completed: false, steps, clicks };
    const mark = async name => { steps.push(name); if (options.onStep) await options.onStep(name); };
    async function click(name) {
        await page.waitForFunction(name => {
            function find(n) {
                const b = n.getComponent('cc.Button');
                return (n.name === name && n.activeInHierarchy && b && b.interactable) || n.children.some(find);
            }
            return find(window.cc.director.getScene());
        }, { timeout }, name);
        const point = await page.evaluate(name => {
            const cc = window.cc;
            let target;
            function walk(n) { if (n.activeInHierarchy) { if (n.name === name) target = n; n.children.forEach(walk); } }
            walk(cc.director.getScene());
            const t = target.getComponent('cc.UITransform');
            const world = t.convertToWorldSpaceAR(new cc.Vec3(t.width * (.5 - t.anchorX), t.height * (.5 - t.anchorY), 0));
            let host = target;
            while (host && !host.getComponent('cc.Canvas')) host = host.parent;
            const camera = host?.getComponent('cc.Canvas')?.cameraComponent;
            if (!camera) throw Error('Missing UI camera for ' + name);
            const screen = camera.worldToScreen(world);
            const canvas = document.querySelector('canvas'), r = canvas.getBoundingClientRect();
            const x = r.x + screen.x * r.width / canvas.width;
            const y = r.y + r.height - screen.y * r.height / canvas.height;
            if (x < r.left || x >= r.right || y < r.top || y >= r.bottom
                || x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) throw Error('Button outside viewport: ' + name);
            return { x, y };
        }, name);
        clicks.push({ name, ...point });
        await page.mouse.click(point.x, point.y);
        await sleep(900);
    }
    async function login(nextPage = page) {
        page = nextPage;
        if (await page.evaluate(() => window.cc?.director?.getScene()?.name === 'LobbyScene')) return;
        await page.waitForFunction(() => window.cc && window.cc.director.getScene(), { timeout });
        await click('BtnStart');
        await page.waitForFunction(() => window.cc.director.getScene().name === 'LobbyScene', { timeout });
        await sleep(3000);
    }
    async function roster() {
        return page.evaluate(() => JSON.parse(localStorage.getItem('ucuf.player-roster') || '[]'));
    }
    async function battle() {
        return page.evaluate(() => {
            let result;
            function walk(n) {
                const c = n.getComponent('BattleScene');
                if (c) result = { id: c._pg?.id, outcome: c.ctrl?.flowStateMachine?.result,
                    ready: !!c.ctrl?.canAdvanceBattleTurn() && !c.sceneContext?.isAdvancingTurn,
                    duelActive: !!c.sceneContext?.isDuelPanelActive,
                    playerFortressHp: c.ctrl?.state?.playerFortressHp };
                n.children.forEach(walk);
            }
            walk(window.cc.director.getScene());
            if (!result) throw Error('BattleScene missing');
            return result;
        });
    }
    async function savedGeneral(id) {
        return page.evaluate(id => new Promise((resolve, reject) => {
            const request = indexedDB.open('3KLifeData');
            request.onerror = () => reject(String(request.error));
            request.onblocked = () => reject(Error('Save database blocked'));
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) { db.close(); reject(Error('Save store missing')); return; }
                const tx = db.transaction('kv', 'readonly'), read = tx.objectStore('kv').get('player.save');
                let value;
                read.onsuccess = () => { value = read.result?.value; };
                tx.oncomplete = () => { db.close(); resolve(value?.roster?.find(g => g.id === id) || null); };
                tx.onerror = () => { db.close(); reject(String(tx.error)); };
            };
        }), id);
    }
    async function saveState() {
        return page.evaluate(() => new Promise((resolve, reject) => {
            const open = indexedDB.open('3KLifeData');
            open.onerror = () => reject(String(open.error));
            open.onblocked = () => reject(Error('Save database blocked'));
            open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains('kv')) { db.close(); reject(Error('Save store missing')); return; }
                const tx = db.transaction('kv', 'readonly'), read = tx.objectStore('kv').get('player.save');
                let value; read.onsuccess = () => { value = read.result?.value; };
                tx.oncomplete = () => { db.close(); resolve(value); };
                tx.onerror = () => { db.close(); reject(String(tx.error)); };
            };
        }));
    }
    async function boardPoint(lane, depth) {
        return page.evaluate(({lane, depth}) => {
            let scene;
            function walk(n) { scene = scene || n.getComponent('BattleScene'); n.children.forEach(walk); }
            walk(window.cc.director.getScene());
            const world = scene.boardRenderer.getCellWorldPosition(lane, depth, 0);
            const p = scene.sceneContext.boardCamera.worldToScreen(world);
            const canvas = document.querySelector('canvas'), r = canvas.getBoundingClientRect();
            return { x: r.x + p.x * r.width / canvas.width, y: r.y + r.height - p.y * r.height / canvas.height };
        }, {lane, depth});
    }
    async function waitForTurn() {
        const deadline = Date.now() + timeout;
        do {
            const current = await battle();
            if (current.outcome && current.outcome !== 'ongoing') return current;
            if (current.duelActive) await click('BtnSecondary');
            else if (current.ready) return current;
            await sleep(250);
        } while (Date.now() < deadline);
        throw Error('Turn did not finish');
    }
    try {
        await login(); await mark('pointer-login');
        await click('GameplayGacha'); await click('GachaDs3_div_48');
        await click('GachaPullResult_div_412'); await click('GachaReturnToLobby');
        await click('LeadGeneralButton0');
        const beforeRoster = await roster();
        if (!beforeRoster.length) throw Error('Normal recruitment produced no roster');
        await mark('normal-recruitment-and-lead-selection');
        await click('GameplayBattle'); await sleep(8000);
        const initial = await battle(), before = beforeRoster.find(g => g.id === initial.id);
        if (!before) throw Error('Battle did not load owned general');
        evidence.before = before;
        await waitForTurn(); await click('DuelBtn');
        const point = await boardPoint(2, 0); await page.mouse.click(point.x, point.y); await sleep(1000);
        await mark('general-pointer-placement');
        for (let turns = 0; turns < 50; turns++) {
            const current = await waitForTurn();
            evidence.turns = turns;
            if (current.outcome && current.outcome !== 'ongoing') break;
            await click('EndTurnBtn');
            if ((turns + 1) % 5 === 0) await mark('battle-turn-' + (turns + 1));
        }
        const final = await waitForTurn(); evidence.outcome = final.outcome;
        if (final.outcome !== 'player-win') throw Error('Natural victory not achieved: ' + final.outcome);
        await mark('natural-victory');
        const old = before.battleRecord || { wins: 0, losses: 0, draws: 0, merit: 0 };
        await page.waitForFunction(({id, wins}) => JSON.parse(localStorage.getItem('ucuf.player-roster') || '[]')
            .find(g => g.id === id)?.battleRecord?.wins === wins + 1, {timeout}, {id: before.id, wins: old.wins});
        const after = (await roster()).find(g => g.id === before.id); evidence.after = after;
        if (after.battleRecord.losses !== old.losses || after.battleRecord.draws !== old.draws
            || after.battleRecord.merit <= old.merit || after.vitality >= before.vitality) throw Error('Victory record/merit/vitality inconsistent');
        const deadline = Date.now() + timeout;
        let saved;
        do { saved = await saveState(); if (JSON.stringify(saved?.roster) === JSON.stringify(await roster())) break; await sleep(250); } while (Date.now() < deadline);
        if (JSON.stringify(saved?.roster) !== JSON.stringify(await roster())) throw Error('Roster not saved to IndexedDB');
        evidence.saved = saved; await mark('victory-saved');
        // A fresh page shares the same browser context and origin, but no old page runtime.
        const reopened = await page.browserContext().newPage();
        await reopened.setViewport(page.viewport());
        const savedUrl = page.url();
        if (options.onPage) await options.onPage(reopened);
        await reopened.goto(savedUrl, {waitUntil: 'load', timeout});
        await page.close(); page = reopened;

        await login();
        const restored = await saveState(); assertSaveEqual(saved, restored);
        if (JSON.stringify(await roster()) !== JSON.stringify(saved.roster)) throw Error('Runtime roster changed after reopening');
        evidence.restored = restored; await mark('whole-save-restored');
        await click('GameplayBattle'); await sleep(8000); await waitForTurn();
        // Read-only observation: the UI must itself generate spending/effect evidence.
        await page.evaluate(() => {
            const modules = Array.from(window.System.entries());
            const entry = modules.find(([id, exports]) => id.includes('ServiceLoader') && typeof exports.services === 'function');
            if (!entry) throw Error('ServiceLoader unavailable for read-only event observation');
            window.__continuityEffects = [];
            entry[1].services().event.on('general-skill-effect', event => window.__continuityEffects.push(event));
        });
        async function tacticState() {
            return page.evaluate(() => {
                let c; const labels = [];
                function walk(n) {
                    c = c || n.getComponent('BattleScene');
                    const label = n.getComponent('cc.Label');
                    if (label && n.activeInHierarchy) labels.push(label.string);
                    n.children.forEach(walk);
                }
                walk(window.cc.director.getScene());
                return {sortie: c.ctrl.getSortieState(), labels, effects: [...window.__continuityEffects]};
            });
        }
        const tacticBefore = await tacticState();
        await click('TacticsBtn');
        const tacticAfter = await tacticState();
        evidence.tactics = {before: tacticBefore, after: tacticAfter};
        // Do not call trySpendTacticPoints or manufacture an event to satisfy the gate.
        assertTacticSpend(tacticBefore, tacticAfter);
        await mark('tactic-spending-and-effect');
        let rejected = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            const before = await tacticState(); await click('TacticsBtn'); const after = await tacticState();
            if (after.sortie?.tacticCurrent === before.sortie?.tacticCurrent && /不足/.test(after.labels.join(' '))) {
                evidence.tactics.rejection = {before, after}; rejected = true; break;
            }
            assertTacticSpend(before, after);
        }
        if (!rejected) throw Error('Insufficient-point rejection not proven within twenty normal UI attempts');
        await mark('insufficient-tactic-points-rejected');
        // Finish the second battle by legal turns before returning through the result UI.
        for (let i = 0; i < 50; i++) {
            const current = await waitForTurn();
            if (current.outcome && current.outcome !== 'ongoing') break;
            await click('EndTurnBtn');
        }
        const second = await battle();
        if (!second.outcome || second.outcome === 'ongoing') throw Error('Second battle did not finish');
        await click('BtnBack');
        evidence.generations = await require('./web-three-generation-flow').runThreeGenerationFlow(page,
            {timeoutMs: timeout, login, onStep: name => mark('generations-' + name)});
        if (!evidence.generations.completed) throw Error('Three-generation acceptance incomplete');
        evidence.completed = true;
        return evidence;
    } catch (error) {
        evidence.failedStep = steps.length ? 'after-' + steps[steps.length - 1] : 'pointer-login';
        error.flowReport = evidence;
        throw error;
    }
}
function assertSaveEqual(before, after) {
    if (!before || !after) throw Error('Missing save snapshot');
    for (const key of ['roster', 'deck', 'gameTime']) {
        if (!(key in before) || !(key in after)) throw Error('Missing save field: ' + key);
    }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (key !== 'savedAt' && JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw Error('Save changed after reopen: ' + key);
    }
}
function assertTacticSpend(before, after) {
    if (!before.sortie || !after.sortie || !(after.sortie.tacticCurrent < before.sortie.tacticCurrent))
        throw Error('Tactics UI produced no point spending: slot summary is not a cast');
    if (!after.effects?.slice(before.effects?.length || 0).some(event => event.faction === 'player')) throw Error('Tactic effect event evidence missing');
}
module.exports = { runContinuityFlow, assertSaveEqual, assertTacticSpend };
