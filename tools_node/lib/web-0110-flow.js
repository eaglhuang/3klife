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
    await page.waitForFunction(()=>window.cc?.director?.getScene()?.name==='LoginScene',{timeout});
    await click('BtnStart',8000);
    await page.waitForFunction(()=>window.cc.director.getScene().name==='LobbyScene',{timeout});
    await mark('lobby-and-onboarding');
    if (!(await state()).labels.TutorialText) throw Error('0110: 新玩家沒有可見的新手引導文字');
    for(let i=0;i<3;i++) await click('BtnNextTutorial',500);
    await click('GameplayGacha',1200);
    await mark('gacha-before-mercenary');
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
    return {name:'0110',completed:false,steps,pending:['domestic','lifespan','tutorial-battle','sortie','sandtable','mission-board','bloodline-tree']};
}
module.exports={run0110Flow};
if(require.main===module){require('./web-three-generation-flow').runThreeGenerationFlow=run0110Flow;process.argv.push('--flow','three-generation');require('../run-web-smoke');}
