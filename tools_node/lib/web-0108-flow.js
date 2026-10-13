/** Strict actual-pointer M4 acceptance. State assertions are read-only; gameplay changes use UI, never seeds. */
async function run0108Flow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [];
    let injuryObserved = false;
    const mark = async name => { steps.push(name); if (options.onStep) await options.onStep(name); };
    async function state() {
        return page.evaluate(() => {
            const labels = {}, buttons = {};
            function walk(node) {
                if (!node.activeInHierarchy) return;
                const label = node.getComponent('cc.Label'), button = node.getComponent('cc.Button');
                if (label) labels[node.name] = label.string;
                if (button) buttons[node.name] = button.interactable;
                node.children.forEach(walk);
            }
            walk(window.cc.director.getScene());
            return { labels, buttons, roster: JSON.parse(localStorage.getItem('ucuf.player-roster') || '[]') };
        });
    }
    async function click(name, settle = 400) {
        await page.waitForFunction(name => {
            function find(node) {
                const button = node.getComponent('cc.Button');
                return (node.name === name && node.activeInHierarchy && button && button.interactable) || node.children.some(find);
            }
            return find(window.cc.director.getScene());
        }, { timeout }, name);
        const point = await page.evaluate(name => {
            let node;
            function walk(n) { if (n.activeInHierarchy) { if (n.name === name) node = n; n.children.forEach(walk); } }
            walk(window.cc.director.getScene());
            const t = node.getComponent('cc.UITransform');
            const p = t.convertToWorldSpaceAR(new window.cc.Vec3(t.width * (.5 - t.anchorX), t.height * (.5 - t.anchorY), 0));
            const canvas = document.querySelector('canvas'), r = canvas.getBoundingClientRect(), view = window.cc.view;
            return { x: r.x + p.x * view.getScaleX() * r.width / canvas.width,
                y: r.y + r.height - p.y * view.getScaleY() * r.height / canvas.height };
        }, name);
        await page.mouse.click(point.x, point.y);
        await sleep(settle);
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
    async function seasons(count) {
        for (let i = 0; i < count; i++) {
            const before = (await state()).labels.SeasonLabel;
            await click('AdvanceSeasonButton', 150);
            await page.waitForFunction(before => {
                function find(n) { const l = n.getComponent('cc.Label'); return (n.name === 'SeasonLabel' && l && l.string !== before) || n.children.some(find); }
                return find(window.cc.director.getScene());
            }, { timeout }, before);
        }
    }
    async function choose(side, name) {
        for (let i = 0; i < 40; i++) {
            if ((await state()).labels[`${side}Name`] === `${side === 'Father' ? '父方' : '母方'}：${name}`) return;
            await click(`BtnNext${side}`, 180);
        }
        throw Error(`Parent unavailable: ${name}`);
    }
    async function birth(father, mother) {
        for (let attempt = 0; attempt < 8; attempt++) {
            await click('OpenBondingButton', 700);
            await choose('Father', father.name); await choose('Mother', mother.name);
            const before = await state();
            if (!before.buttons.BtnConfirmBond) { await click('BtnCloseBond'); return null; }
            await click('BtnConfirmBond', 700);
            const after = await state();
            await click('BtnCloseBond');
            const child = after.roster.find(g => !before.roster.some(p => p.id === g.id));
            if (child) return child;
            await seasons(4); // Natural vitality recovery after a failed conception.
        }
        throw Error('Conception failed after eight normal attempts');
    }
    async function graduate(child, mentorUid) {
        for (let i = 0; i < 3 && !(await state()).labels.ModeLabel?.includes('培育'); i++) await seasons(1);
        await click('OpenNurtureButton');
        for (let i = 0; i < 30; i++) {
            const s = await state();
            if ((s.labels.FateName || s.labels.ChildName || '').includes(child.name)) break;
            if (i === 29) throw Error('Unveiled child unavailable');
            await click('BtnNextChild', 180);
        }
        await click('BtnFateAccept'); await click('BtnStartNurture');
        if (mentorUid) {
            const assigned = await page.evaluate(childId => new Promise((resolve, reject) => {
                const open = indexedDB.open('3KLifeData');
                open.onerror = () => reject(String(open.error));
                open.onblocked = () => reject(Error('IndexedDB blocked while reading training save'));
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains('kv')) { db.close(); reject(Error('Training save store missing')); return; }
                    const read = db.transaction('kv', 'readonly').objectStore('kv').get('player.save');
                    read.onsuccess = () => { db.close(); resolve(read.result?.value?.nurture?.sessions?.find(s => s.childId === childId)?.mentors?.map(m => m.id) || []); };
                    read.onerror = () => reject(String(read.error));
                };
            }), child.id);
            if (!assigned.includes(mentorUid)) throw Error('Retired founder was not assigned as a training mentor');
        }
        for (let i = 0; i < 36; i++) {
            await click(i % 3 === 2 ? 'BtnRest' : 'BtnTrain_str', 180);
            const labels = (await state()).labels;
            if (!injuryObserved && Object.values(labels).some(text => String(text).includes('訓練時受傷'))) {
                injuryObserved = true; await mark('natural-injury-observed');
            }
        }
        await click('BtnGraduate');
        const saved = (await state()).roster.find(g => g.id === child.id);
        if (!saved?.graduationRating || !(saved.prowess?.str > 0)) throw Error('Graduation not saved');
        await click('BtnDismissReport'); await click('BtnCloseFlow');
        return saved;
    }
    async function cards() {
        return page.evaluate(() => new Promise((resolve, reject) => {
            const request = indexedDB.open('3KLifeData');
            request.onerror = () => reject(String(request.error));
            request.onblocked = () => reject(Error('IndexedDB blocked while reading cards'));
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) { db.close(); reject(Error('Card store missing')); return; }
                const tx = db.transaction('kv', 'readonly'), store = tx.objectStore('kv'), result = {};
                for (const key of ['mentor_cards', 'spirit_cards']) {
                    const read = store.get(key); read.onsuccess = () => { result[key] = read.result?.value || []; };
                }
                // 虎符唯一來源是 GameSession 的存檔欄位 tallyCards（單一來源），不再讀 legacy 的 tiger_tallies 庫
                const saveRead = store.get('player.save');
                saveRead.onsuccess = () => { result.tiger_tallies = Object.values(saveRead.result?.value?.tallyCards || {}); };
                tx.oncomplete = () => { db.close(); resolve(result); }; tx.onerror = () => reject(String(tx.error));
            };
        }));
    }
    await login();
    await click('GameplayGacha', 1200);
    await click('GachaDs3_div_48', 900); await click('GachaPullResult_div_412', 900);
    for (let i = 0; i < 30; i++) {
        const roster = (await state()).roster;
        if (roster.some(g => g.gender === '女') && roster.some(g => g.gender === '男')) break;
        if (i === 29) throw Error('No natural parent pair after recruitment');
        await click('GachaDs3_div_55', 900); await click('GachaPullResult_div_412', 900);
    }
    await click('GachaReturnToLobby'); await seasons(1);
    const founders = (await state()).roster;
    let first, grandparents;
    for (const father of founders.filter(g => g.gender === '男')) {
        for (const mother of founders.filter(g => g.gender === '女')) {
            if (Math.max(father.maxLifespan || 0, mother.maxLifespan || 0) < 66) continue;
            first = await birth(father, mother);
            if (first) { grandparents = [father, mother]; break; }
        }
        if (first) break;
    }
    if (!first) throw Error('No eligible founder pair with natural retirement lifespan');
    await mark('first-generation-born'); await seasons(80);
    first = await graduate(first); await mark('first-generation-grown-and-graduated');
    if (!injuryObserved) throw Error('0108: 本次自然培育未觀察到受傷，停止，不注入亂數');
    await click('btnOpenJobChange', 800);
    for (let i = 0; i < 80; i++) {
        if ((await state()).labels.generalName === first.name) break;
        if (i === 79) throw Error('0108: 20歲子嗣不在轉職名單');
        await click('btnNextGeneral', 180);
    }
    const jobState = await state();
    if (!(first.age >= 20)) throw Error('0108: 轉職對象未成年');
    const choice = ['btnSubWarrior', 'btnSubScholar'].find(name => jobState.buttons[name]);
    if (!choice) throw Error('0108: 無可用副職選項');
    await click(choice); await click('btnConfirmJob', 800);
    const changed = (await state()).roster.find(g => g.id === first.id);
    if (!changed?.subClass) throw Error('0108: 副職未寫回名冊');
    await mark('adult-job-changed'); await click('btnCloseJob');
    const mates = (await state()).roster.filter(g => g.gender !== first.gender && g.status !== 'dead' && !grandparents.some(p => p.id === g.id) && (g.age || 0) >= 20);
    if (!mates.length) throw Error('0108: 無自然取得的適婚對象');
    const mate = mates[0];
    await click('OpenBondingButton', 700);
    await choose('Father', first.gender === '男' ? first.name : mate.name);
    await choose('Mother', first.gender === '女' ? first.name : mate.name);
    const beforeBond = await state();
    await click('BtnConfirmBond', 800);
    const afterBond = await state();
    for (const id of [first.id, mate.id]) {
        const before = beforeBond.roster.find(g => g.id === id), after = afterBond.roster.find(g => g.id === id);
        if (!after || Math.abs(after.age - before.age - 0.5) > 1e-8) throw Error('0108: 結緣未扣6個月壽命 '+id);
    }
    await mark('bond-lifespan-consumed'); await click('BtnCloseBond');
    await click('LeadGeneralButton0'); await click('GameplayBattle', 8000);
    await page.waitForFunction(() => window.cc.director.getScene().name === 'BattleScene', { timeout });
    await mark('sortie-battle-loaded');
    const saved = await page.evaluate(() => new Promise((resolve,reject) => {
        const req=indexedDB.open('3KLifeData'); req.onerror=()=>reject(String(req.error));
        req.onsuccess=()=>{const db=req.result;const tx=db.transaction('kv','readonly');const read=tx.objectStore('kv').get('player.save');let value;
        read.onsuccess=()=>value=read.result?.value;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>reject(String(tx.error));};
    }));
    if (!saved?.roster?.length) throw Error('0108: 存檔不存在');
    await page.reload({waitUntil:'networkidle'}); await login();
    const restored = (await state()).roster;
    if (JSON.stringify(saved.roster) !== JSON.stringify(restored)) throw Error('0108: 重新登入名冊不一致');
    await mark('saved-and-resumed');
    return {name:'0108',completed:true,steps,injuryObserved,jobGeneralId:first.id,bondAges:afterBond.roster.filter(g=>[first.id,mate.id].includes(g.id)).map(g=>({id:g.id,age:g.age})),interaction:'actual-pointer'};
}
module.exports = { run0108Flow };
if (require.main === module) {
    require('./web-three-generation-flow').runThreeGenerationFlow = run0108Flow;
    process.argv.push('--flow','three-generation');
    require('../run-web-smoke');
}
