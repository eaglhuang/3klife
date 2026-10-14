/** Strict actual-pointer M4 acceptance. State assertions are read-only; gameplay changes use UI, never seeds. */
async function run0110Flow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [];
    const fs=require('fs'), path=require('path');
    const outIndex=process.argv.indexOf('--out');
    const dir=path.resolve(outIndex>=0?process.argv[outIndex+1]:'artifacts/PROG-2-0110');
    fs.mkdirSync(dir,{recursive:true});
    const mark = async name => { steps.push(name); await page.screenshot({path:path.join(dir, `${steps.length}-${name}.png`),fullPage:true}); fs.writeFileSync(path.join(dir,'observed-ui.json'),JSON.stringify({steps,state:await state()},null,2),'utf8'); if(options.onStep) await options.onStep(name); };
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
        try { await page.waitForFunction(name => {
            function find(node) {
                const button = node.getComponent('cc.Button');
                return (node.name === name && node.activeInHierarchy && button && button.interactable) || node.children.some(find);
            }
            return find(window.cc.director.getScene());
        }, { timeout }, name); } catch (error) {
            await mark(`unavailable-${name}`);
            throw Error(`0110: 無法操作 ${name}；可見按鈕：${Object.keys((await state()).buttons).join(', ')}`);
        }
        const point = await page.evaluate(name => {
            let node;
            function walk(n) { if (n.activeInHierarchy) { if (n.name === name && !node) node = n; n.children.forEach(walk); } }
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
    await page.waitForFunction(()=>window.cc?.director?.getScene()?.name==='LoginScene',{timeout});
    await click('BtnStart',8000);
    await page.waitForFunction(()=>window.cc.director.getScene().name==='LobbyScene',{timeout});
    await mark('lobby-and-onboarding');
    if (!(await state()).labels.TutorialText) throw Error('0110: 新玩家沒有可見的新手引導文字');
    for(let i=0;i<3;i++) await click('BtnNextTutorial',500);
    await click('GameplayGacha',1200);
    await mark('gacha-before-mercenary');
    await click('GachaDs3_div_48',900);
    await click('GachaPullResult_div_412',900);
    const entry=await page.evaluate(()=>{
        function find(node){
            if(!node.activeInHierarchy)return null;
            const button=node.getComponent('cc.Button');
            const text=[];function labels(n){const l=n.getComponent('cc.Label');if(l)text.push(l.string);n.children.forEach(labels);}labels(node);
            if(button?.interactable&&text.some(s=>String(s).includes('傭兵')))return node.name;
            for(const child of node.children){const result=find(child);if(result)return result;}return null;
        }return find(window.cc.director.getScene());
    });
    if(entry) await click(entry,1000);
    else {
        let found=false;
        for(let i=0;i<8;i++) {
            const ui=await state();
            if(Object.values(ui.labels).some(text=>String(text).includes('傭兵'))){found=true;break;}
            if(!ui.buttons.BtnPoolNext)break;
            await click('BtnPoolNext',500);
        }
        if(!found){await mark('mercenary-entry-not-found');throw Error('0110: 已用卡池切換按鈕檢查，仍找不到傭兵池文字與入口');}
    }
    await mark('mercenary-pool');
    if (!Object.values((await state()).labels).some(text => String(text).includes('傭兵池'))) {
        throw Error('0110: 傭兵入口未顯示正式列表');
    }
    await click('MercenaryPoolBack',500);
    await click('GachaReturnToLobby',1200);
    await click('LeadGeneralButton0',700);
    await click('OpenDomesticButton',700);
    await mark('domestic-panel');
    if (!Object.values((await state()).labels).some(text => String(text).includes('內政'))) {
        throw Error('0110: 內政面板沒有可見內政文字');
    }
    await click('BtnClose',500);
    await click('BtnOpenHallBoard',700);
    await mark('mission-board');
    if (!Object.values((await state()).labels).some(text => /軍事|內政|任務/.test(String(text)))) {
        throw Error('0110: 任務板没有可見任務文字');
    }
    await click('BtnClose',500);
    const sandtableEntry = await page.evaluate(() => {
        function find(node) {
            if (!node.activeInHierarchy) return null;
            const button=node.getComponent('cc.Button');
            const label=node.getComponent('cc.Label');
            if (button?.interactable && (String(label?.string || '').includes('沙盤') || /sandtable/i.test(node.name))) return node.name;
            if (button?.interactable && node.children.some(child => String(child.getComponent('cc.Label')?.string || '').includes('沙盤'))) return node.name;
            for (const child of node.children) { const found=find(child); if(found) return found; }
            return null;
        }
        return find(window.cc.director.getScene());
    });
    if (!sandtableEntry) { await mark('sandtable-entry-not-found'); throw Error('0110: 大廳找不到可操作的沙盤入口；壽命、教學戰、出征與血統樹尚未驗證'); }
    await click(sandtableEntry,700);
    await mark('sandtable');
    if (!(await state()).labels.HallBoardTitle?.includes('遠征')) throw Error('0110: 天下沙盤入口未切到遠征分頁');
    await click('BtnHallRow0',900);
    await mark('expedition-accepted');
    if (!Object.values((await state()).labels).some(text=>String(text).includes('已接取'))) throw Error('0110: 遠征接取後未標示已接取');
    const save = await page.evaluate(() => new Promise((resolve,reject)=>{
        const open=indexedDB.open('3KLifeData');
        open.onerror=()=>reject(Error('IndexedDB read failed'));
        open.onsuccess=()=>{
            const db=open.result;
            if (!db.objectStoreNames.contains('kv')) { db.close(); reject(Error('player.save store missing')); return; }
            const tx=db.transaction('kv','readonly'), read=tx.objectStore('kv').get('player.save');
            read.onsuccess=()=>resolve(read.result?.value || null);
            read.onerror=()=>reject(Error('player.save read failed'));
            tx.oncomplete=()=>db.close();
        };
    }));
    if (!save?.leadGeneralId || !Object.values(save.hallAssignments || {}).includes(save.leadGeneralId)) throw Error('0110: 遠征指派未寫入出戰主將');
    await click('BtnClose',500);
    await click('OpenSortieButton',700);
    await mark('sortie-setup');
    await click('BtnCloseSortie',500);
    await click('OpenBondingButton',700);
    await mark('bonding-bloodline-layout');
    await click('BtnCloseBond',500);
    await click('GameplayGenerals',1000);
    await mark('general-list-lifespan-route');
    await click('Row',1000);
    await mark('general-detail-lifespan');
    const detail = await state();
    const lifespanObserved = Object.entries(detail.labels).filter(([name,text]) => /lifespan/i.test(name) || String(text).includes('壽命'));
    const pending = ['tutorial-battle','bloodline-tree-readability'];
    if (lifespanObserved.length===0) pending.push('lifespan-detail-not-visible');
    return {name:'0110',completed:false,steps,expedition:{leadGeneralId:save.leadGeneralId,assignments:save.hallAssignments},lifespanObserved,pending};
}
module.exports={run0110Flow};
if(require.main===module){require('./web-three-generation-flow').runThreeGenerationFlow=run0110Flow;process.argv.push('--flow','three-generation');require('../run-web-smoke');}
