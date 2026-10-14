/** Strict actual-pointer M4 acceptance. State assertions are read-only; gameplay changes use UI, never seeds. */
async function run0115Flow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const steps = [];
    const fs=require('fs'),path=require('path');const index=process.argv.indexOf('--out');
    const dir=path.resolve(index>=0?process.argv[index+1]:'artifacts/PROG-2-0115');fs.mkdirSync(dir,{recursive:true});
    const mark = async name => {steps.push(name);await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});if(options.onStep)await options.onStep(name);};
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
    for(let i=0;i<3&&(await state()).buttons.BtnNextTutorial;i++)await click('BtnNextTutorial');
    await click('GameplayGacha',1200);await mark('mercenary-entry');
    await click('GachaMercenaryEntry',500);
    const opened=await state();
    const text=opened.labels.MercenaryPoolText;
    if(!text?.includes('傭兵池'))throw Error('傭兵列表未開啟');
    await mark('mercenary-pool');
    const rect=await page.evaluate(()=>{
        const scene=window.cc.director.getScene();function find(n){return n.name==='MercenaryPoolPanel'?n:n.children.map(find).find(Boolean);}const n=find(scene),ui=n.getComponent('cc.UITransform');
        const b=ui.getBoundingBoxToWorld(),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect(),v=window.cc.view;
        const sx=v.getScaleX()*r.width/canvas.width,sy=v.getScaleY()*r.height/canvas.height;
        const x=Math.max(0,r.x+b.xMin*sx),y=Math.max(0,r.y+r.height-b.yMax*sy);
        return {x,y,width:Math.max(1,Math.min(innerWidth-x,b.width*sx)),height:Math.max(1,Math.min(innerHeight-y,b.height*sy))};
    });
    await page.screenshot({path:path.join(dir,'mercenary-main-region.png'),clip:rect});
    await click('MercenaryPoolBack',400);
    if((await state()).labels.MercenaryPoolText)throw Error('返回後面板未關閉');
    await click('GachaMercenaryEntry',400);
    if((await state()).labels.MercenaryPoolText!==text)throw Error('只讀列表重新開啟改變資料');
    return {name:'0115',completed:true,steps,interaction:'actual-pointer',text,returned:true,reopened:true,empty:text.includes('目前沒有傭兵')};
}
module.exports={run0115Flow};
if(require.main===module){require('./web-three-generation-flow').runThreeGenerationFlow=run0115Flow;process.argv.push('--flow','three-generation');require('../run-web-smoke');}
