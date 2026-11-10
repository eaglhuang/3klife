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
   UnitRenderer.prototype['projectWorldLabel'].call({uiRoot:{},canvasNode:{},uiProjectionBuffer:result,
     worldCamera:{convertToUINode:(v:any)=>{input={...v};}}} as any,
     {worldPosition:{clone:()=>({...pos})}}, {setPosition:(v:any)=>{placed=v;}},0.55);
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
   assert.contains(src,'（主將棋子）');assert.contains(src,'view.usingGeneralPawn');
 });
 return suite;
}
