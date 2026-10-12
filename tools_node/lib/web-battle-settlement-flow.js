'use strict';

/** Actual pointer acceptance for one natural battle loss; all inspected game state is read-only. */
async function runBattleSettlementFlow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [], clicks = [];
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
    async function login() {
        await page.waitForFunction(() => window.cc && window.cc.director.getScene(), { timeout });
        await sleep(8000);
        await page.evaluate(() => new Promise((resolve, reject) => window.cc.director.loadScene('LoginScene', e => e ? reject(String(e)) : resolve())));
        await sleep(2000);
        await page.evaluate(() => {
            function walk(n) { const c = n.getComponent('LoginScene'); if (c) { c.onClickStart(); return true; } return n.children.some(walk); }
            if (!walk(window.cc.director.getScene())) throw Error('LoginScene missing');
        });
        await sleep(8000);
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
    await login();
    await click('GameplayGacha');
    await click('GachaDs3_div_48');
    await click('GachaPullResult_div_412');
    await click('GachaReturnToLobby');
    await click('LeadGeneralButton0');
    const beforeRoster = await roster();
    await click('GameplayBattle');
    await sleep(8000);
    const initial = await battle(), before = beforeRoster.find(g => g.id === initial.id);
    if (!before) throw Error('Battle did not load a player-owned general');
    await mark('owned-general-loaded');
    async function waitForTurn() {
        const deadline = Date.now() + timeout;
        let current;
        do {
            current = await battle();
            if (current.outcome && current.outcome !== 'ongoing') return;
            if (current.duelActive) await click('BtnSecondary');
            else if (current.ready) return;
            await sleep(250);
        } while (Date.now() < deadline);
        throw Error('Turn did not finish: ' + JSON.stringify(current));
    }
    // Passing without deploying is a legal losing strategy. Never set HP, force a result, or call recordBattle.
    let turns = 0;
    for (; turns < 50; turns++) {
        const current = await battle();
        if (current.outcome && current.outcome !== 'ongoing') break;
        await waitForTurn();
        await click('EndTurnBtn');
        await waitForTurn();
        if ((turns + 1) % 5 === 0) await mark('turns-' + (turns + 1));
    }
    const final = await battle();
    if (final.outcome !== 'enemy-win') throw Error('Expected a natural loss, got ' + final.outcome);
    await mark('natural-loss');
    const oldRecord = before.battleRecord || { wins: 0, losses: 0, draws: 0, merit: 0 };
    await page.waitForFunction(({ id, losses }) => {
        const g = JSON.parse(localStorage.getItem('ucuf.player-roster') || '[]').find(g => g.id === id);
        return g?.battleRecord?.losses === losses + 1;
    }, { timeout }, { id: before.id, losses: oldRecord.losses });
    const settled = (await roster()).find(g => g.id === before.id);
    if (settled.vitality !== Math.max(0, before.vitality - 30)
        || settled.battleRecord.wins !== oldRecord.wins || settled.battleRecord.draws !== oldRecord.draws
        || settled.battleRecord.merit !== oldRecord.merit + 3) throw Error('Incorrect battle settlement');
    const deadline = Date.now() + timeout;
    let saved;
    do { saved = await savedGeneral(before.id); if (JSON.stringify(saved) === JSON.stringify(settled)) break; await sleep(250); } while (Date.now() < deadline);
    if (JSON.stringify(saved) !== JSON.stringify(settled)) throw Error('Battle settlement not persisted to IndexedDB');
    await sleep(2000);
    if (JSON.stringify((await roster()).find(g => g.id === before.id)) !== JSON.stringify(settled)) throw Error('Repeated settlement after result');
    await mark('settlement-saved-once');
    await page.reload();
    await login();
    const restored = (await roster()).find(g => g.id === before.id);
    if (JSON.stringify(restored) !== JSON.stringify(settled)) throw Error('Battle settlement changed after reload');
    await mark('settlement-restored');
    return { name: 'battle-settlement', completed: true, interaction: 'actual-pointer-and-public-login', steps, clicks,
        id: before.id, turns, outcome: final.outcome, before: { vitality: before.vitality, record: oldRecord },
        after: { vitality: restored.vitality, record: restored.battleRecord },
        limitations: ['Natural loss only; victory, deployment and tactical combat are not covered'] };
}
module.exports = { runBattleSettlementFlow };
