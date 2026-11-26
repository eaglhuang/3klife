// @spec-source → Issue #2074；PROG-2-2218
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
const { UnitRenderer } = require('../assets/scripts/battle/views/UnitRenderer');
export function createDeployedUnitPresentationSuite(): TestSuite {
 const suite = new TestSuite('DeployedUnitPresentation');
 suite.test('主將化身不再略過顯示而留下小兵方塊，會建立主將棋子', async () => {
   let built=0;
   await UnitRenderer.prototype['ensureTroopFormation'].call({isGeneralAvatarUnit:()=>true,
     ensureGeneralPawn:()=>{built++;}} as any,{}, {id:'player-general-xiahou-dun'});
   assert.equals(1,built);
 });
 suite.test('名牌走引擎3D→UI轉換並加高度，不把3D深度交給UI相機', () => {
   let input:any=null, placed:any=null;
   const pos={x:3,y:4,z:5}; const result={x:20,y:30,z:0};
   UnitRenderer.prototype['projectWorldLabel'].call({projectToOverlay:UnitRenderer.prototype['projectToOverlay'],uiRoot:{getComponent:()=>null},canvasNode:{getComponent:()=>null},uiProjectionBuffer:result,labelWorldPosBuf:{},
     worldCamera:{convertToUINode:(v:any)=>{input={...v};}}} as any,
     {getWorldPosition:(out:any)=>Object.assign(out,pos)}, {setPosition:(v:any)=>{placed=v;}},0.55);
   assert.equals(4.55,input.y);assert.equals(result,placed);
 });
 suite.test('部署世界位置在模型非同步載入之前設定，首個名牌不停在原點', () => {
   const src=readFileSync(join(__dirname,'../assets/scripts/battle/views/UnitRenderer.ts'),'utf8');
   const start=src.indexOf('private createUnitView('),end=src.indexOf('private updateUnitView(',start);
   const create=src.slice(start,end);
   const positionAt = create.indexOf('worldNode.setWorldPosition(initialPosition)');
   const loadAt = create.indexOf('void this.ensureTroopFormation');
   assert.isTrue(positionAt >= 0 && loadAt >= 0 && positionAt < loadAt);
 });
 suite.test('缺專屬美術使用可辨識棋子與真實姓名，沒有借用其他角色模型', () => {
   const src=readFileSync(join(__dirname,'../assets/scripts/battle/views/UnitRenderer.ts'),'utf8');
   assert.contains(src,"name: 'GeneralPawnHead'");assert.contains(src,'primitives.cylinder(0.16, 0.27, 0.44');
   assert.isTrue(!src.includes('（主將棋子）'), '名牌不可顯示開發用「（主將棋子）」字樣');assert.contains(src,'view.usingGeneralPawn');
 });
 suite.test('小兵一回合連走三格：三個事件同瞬間到達，起點仍是原格、終點是第三格', () => {
   const cellPos = (d:number) => ({x:0,y:0,z:d*2,clone(){return {...this};}});
   const node:any = {worldPosition:cellPos(3),setWorldPosition(v:any){this.worldPosition=v;this.sets.push(v.z);},sets:[] as number[]};
   const unit:any = {id:'u1',lane:1,depth:0};
   const fake:any = {
     unitViews:new Map([['u1',{worldNode:node}]]),
     movingUnits:new Set<string>(),
     carriedUnits:new Set<string>(), // PROG-2-10100：被水沖走的單位
     // 與真實 updateUnitView 一致：沒在移動才把節點放到單位所在格
     updateUnitView:(_v:any,u:any)=>{ if(!fake.movingUnits.has(u.id)) node.worldPosition=cellPos(u.depth); },
     getUnitWorldPosition:(_l:number,d:number)=>cellPos(d),
     playRiverCurrentMoveTween:()=>{},
     spawnMoveDust:()=>{}, // PROG-2-9406：揚塵不在此測試範圍
   };
   // 邏輯層先把單位走到第 3 格，再同步連發三個事件
   unit.depth=3;
   // 測試用 cc stub 的 Tween 沒有 stopAllByTarget，暫時補上
   const ccTween = require('cc').Tween; const hadStop = 'stopAllByTarget' in ccTween;
   if (!hadStop) ccTween.stopAllByTarget = () => {};
   // stub 的 tween().call() 會立刻執行回呼，改成不動作的記錄器，才能觀察「起點」
   const cc = require('cc'); const origTween = cc.tween; const tweenDurations: number[] = [];
   cc.tween = () => { const t:any = { to:(d:number)=>{tweenDurations.push(d);return t;}, call:()=>t, start:()=>{} }; return t; };
   try {
     UnitRenderer.prototype.animateMove.call(fake,unit,1,0);
     UnitRenderer.prototype.animateMove.call(fake,unit,1,1);
     UnitRenderer.prototype.animateMove.call(fake,unit,1,2);
   } finally { cc.tween = origTween; if (!hadStop) delete ccTween.stopAllByTarget; }
   assert.equals(0,node.sets[0]);
   assert.equals(0,node.sets[node.sets.length-1]); // 最後一個事件的起點不是倒數第二格(depth2 = z4)
   assert.isTrue(fake.movingUnits.has('u1'));
   const BT = require('../assets/scripts/battle/views/BattlePresentationTiming').BATTLE_VISUAL_TIMING;
   assert.equals(BT.moveAdvanceSec + 2 * BT.moveAdvanceExtraCellSec, tweenDurations[2]); // 第三格合併滑行 3 格的時間
 });
 suite.test('planMoveSegment：移動中用目前位置起算，滑行時間依格數放大並有上限', () => {
   const { planMoveSegment, BATTLE_VISUAL_TIMING } = require('../assets/scripts/battle/views/BattlePresentationTiming');
   const p=(d:number)=>({x:0,y:0,z:d*2});
   const idle = planMoveSegment(p(2),p(3),null,false);
   assert.equals(4,idle.start.z); assert.equals(1,idle.cells); assert.equals(BATTLE_VISUAL_TIMING.moveAdvanceSec,idle.durationSec);
   const moving = planMoveSegment(p(2),p(3),p(0),true);
   assert.equals(0,moving.start.z); assert.equals(3,moving.cells);
   assert.equals(BATTLE_VISUAL_TIMING.moveAdvanceSec+2*BATTLE_VISUAL_TIMING.moveAdvanceExtraCellSec,moving.durationSec);
   const far = planMoveSegment(p(8),p(9),p(0),true);
   assert.equals(moving.durationSec,far.durationSec);
 });
 return suite;
}
