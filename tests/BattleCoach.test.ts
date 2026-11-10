import { TestSuite, assert } from './TestRunner';
import { BattleTutorialHint } from '../assets/scripts/battle/views/BattleTutorialHint';
import { FirstBattleOperationGuide } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
import { EVENT_NAMES, Faction, SP_PER_KILL } from '../assets/scripts/core/config/Constants';
import { battleCoachPlacement, coachRectsOverlap } from '../assets/scripts/ui/core/BattleCoachPlacement';
import { readFileSync } from 'fs';
import { join } from 'path';
export function createBattleCoachSuite(): TestSuite {
 const suite = new TestSuite('BattleCoach');
 suite.test('未擊殺也可翻頁查看SP、勝負、撤退，結束後不得復活', () => {
  const g=new FirstBattleOperationGuide();
  g.advance('next');g.advance('next');assert.equals('ultimate',g.step);
  assert.contains(g.hint!.message,'擊殺');g.advance('next');assert.contains(g.hint!.message,'陣地');
  g.advance('next');assert.contains(g.hint!.message,'撤退');g.advance('previous');assert.equals('victory',g.step);
  g.advance('ended');g.advance('next');assert.equals(null,g.hint);
 });
 suite.test('真實事件推進，SP成本同源、非玩家事件不誤推、沒有重複toast、dispose清乾淨', () => {
  const listeners = new Map<string,(d:any)=>void>(); let hint:any=null,toasts=0;
  const sp={current:0,max:80};
  const coach=new BattleTutorialHint({on:(name,fn)=>{listeners.set(name,fn);return()=>{listeners.delete(name);};}},
    ()=>{toasts++;}, h=>{hint=h;},()=>sp);
  listeners.get(EVENT_NAMES.UnitDeployed)!({faction:Faction.Enemy});assert.contains(hint.message,'①');
  listeners.get(EVENT_NAMES.UnitDeployed)!({faction:Faction.Player});assert.contains(hint.message,'②');
  listeners.get(EVENT_NAMES.TurnPhaseChanged)!({turn:2});assert.contains(hint.message,'③');
  assert.contains(hint.message,'0/80');assert.contains(hint.message,`每擊殺 +${SP_PER_KILL}`);
  sp.current=40;listeners.get(EVENT_NAMES.GeneralSpChanged)!({faction:Faction.Player,sp:40,maxSp:80});
  assert.contains(hint.message,'40/80');assert.contains(hint.message,'消耗 80 SP');
  listeners.get('first-battle-guide-next')!({});assert.contains(hint.message,'④');
  listeners.get(EVENT_NAMES.TurnPhaseChanged)!({turn:8});assert.contains(hint.message,'退');
  listeners.get(EVENT_NAMES.BattleEnded)!({});assert.equals(null,hint);assert.equals(0,toasts);
  coach.dispose();assert.equals(0,listeners.size);
 });
 for(const [w,h] of [[1920,1080],[1600,1000],[1440,1080],[1080,1920]]) {
  suite.test(`${w}x${h} 卡、HP chip、戰報與指令避障`, () => {
   const obstacles=[{x:0,y:0,width:w,height:168},{x:0,y:184,width:w*.162,height:h-184},
    {x:w-300,y:100,width:280,height:64},{x:w-250,y:168,width:234,height:480},
    {x:w-362,y:h-244,width:344,height:226},{x:(w-944)/2,y:h-184,width:944,height:160}];
   const r=battleCoachPlacement(w,h,obstacles) || battleCoachPlacement(w,h,obstacles,true);
   assert.isTrue(!!r);assert.isTrue(obstacles.every(o=>!coachRectsOverlap(r!,o)));
   assert.isTrue(r!.x>=0&&r!.y>=0&&r!.x+r!.width<=w&&r!.y+r!.height<=h);
  });
 }
 suite.test('完全沒空位時不蓋HUD；收起頁籤也是72設計px（720p為48px）', () => {
  assert.equals(null,battleCoachPlacement(360,640,[{x:0,y:0,width:360,height:640}],true));
  const r=battleCoachPlacement(1080,1920,[],true)!;assert.equals(72,r.height);
 });
 suite.test('收合不受事件強行展開、綁定重開/翻頁與resize，移除600px遮擋箭頭', () => {
  const src=readFileSync(join(__dirname,'../assets/scripts/ui/components/BattleScenePanel.ts'),'utf8');
  assert.contains(src,'this._guideMinimized = true');assert.contains(src,'this._guideMinimized = false');
  assert.contains(src,'this.schedule(this._guideLayoutTick, 0.25)');assert.contains(src,'getBoundingBoxToWorld');
  assert.contains(src,"binder?.getNode('guideResume')?.on(Button.EventType.CLICK");
  const layout=JSON.parse(readFileSync(join(__dirname,'../assets/resources/ui-spec/layouts/battle-operation-guide-main.json'),'utf8'));
  assert.isFalse(JSON.stringify(layout).includes('tutorialPointer'));
 });
 return suite;
}
