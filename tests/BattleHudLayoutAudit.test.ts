import { TestSuite, assert } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
const { auditBattleHud, VIEWPORTS } = require('../tools_node/battle-hud-layout-audit');
const read=(p:string)=>readFileSync(join(__dirname,'..',p),'utf8');
export function createBattleHudLayoutAuditSuite(): TestSuite {
 const suite=new TestSuite('BattleHudLayoutAudit');
 for(const viewport of VIEWPORTS) suite.test(`${viewport.join('x')} 真實fitHeight下沒有主HUD重疊、裁字或小於48 CSS px觸控`,()=>{
  const r=auditBattleHud({viewports:[viewport]});assert.equals(0,r.issues.length,JSON.stringify(r.issues));
 });
 suite.test('兩份HUD主要尺寸與binding一致；樣板操作/假角色停用，正式操作保留',()=>{
  const a=JSON.parse(read('assets/resources/ui-spec/layouts/battle-hud-screen.json'));
  const b=JSON.parse(read('assets/resources/ui-spec/layouts/battle-hud-screen.layout.json'));
  const get=(r:any,name:string):any=>r.name===name?r:(r.children??[]).map((n:any)=>get(n,name)).find(Boolean);
  for(const doc of [a,b])for(const name of ['BattleHudScreen_button_1','BattleHudScreen_div_123','BattleHudScreen_div_136']) assert.isFalse(get(doc.root,name).active);
  for(const name of ['BattleHudScreen_div_1','BattleHudScreen_div_4','BattleHudScreen_div_7','BattleHudScreen_div_12','BattleHudScreen_div_122','BattleHudScreen_div_126']) {
   const pick=(n:any)=>JSON.stringify([n.width,n.height,n.widget,n.active,n.id]);
   assert.equals(pick(get(a.root,name)),pick(get(b.root,name)));
  }
 });
 suite.test('計謀圓鈕顯示可讀短標題，完整理由仍保留，不改enabled/clickable規則',()=>{
  const { ActionCommandComposite }=require('../assets/scripts/ui/components/ActionCommandComposite');
  const host:any={_tacticsButton:null,_tacticsLabel:{string:''},_tacticsEnabledColor:null};
  ActionCommandComposite.prototype.setTacticSummary.call(host,'很長的戰法名稱',{current:3,max:8,enabled:true});
  assert.equals('計謀\n3點',host._tacticsLabel.string);assert.contains(host._tacticsSummaryLabel,'很長的戰法名稱');
  ActionCommandComposite.prototype.setTacticSummary.call(host,'火攻',{enabled:false},'大雨');
  assert.equals('計謀\n受限',host._tacticsLabel.string);assert.isFalse(host._tacticEnabled);
  ActionCommandComposite.prototype.setTacticSummary.call(host,'神策',{current:120,max:150,enabled:true});
  assert.equals('計謀\n99+',host._tacticsLabel.string);
 });
 suite.test('runtime不再把SP強制裁到18高、計謀不縮成12px；軍師摘要可捲動',()=>{
  assert.isFalse(read('assets/scripts/ui/components/BattleHUDComposite.ts').includes('setContentSize(180, 18)'));
  assert.isFalse(read('assets/scripts/ui/components/ActionCommandComposite.ts').includes('this._tacticsLabel.fontSize = 12'));
  const strategist=read('assets/scripts/ui/components/StrategistHudComposite.ts');
  assert.contains(strategist,'summary.updateRenderData(true)');assert.contains(strategist,'trackSize.width * view.wisdomRatio');
 });
 return suite;
}
