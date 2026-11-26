import { TestSuite, assert } from './TestRunner';
import { BattleTutorialHint } from '../assets/scripts/battle/views/BattleTutorialHint';
import { FirstBattleOperationGuide } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
import { EVENT_NAMES, Faction, SP_PER_KILL } from '../assets/scripts/core/config/Constants';
import { battleCoachPlacement, coachRectsOverlap, battleCoachIsObstacle, DEFAULT_COACH_PLACEMENT, parseCoachPlacementConfig, coachTabPlacement, COACH_TITLE_BAND, COACH_TAB_HEIGHT } from '../assets/scripts/ui/core/BattleCoachPlacement';
import { readFileSync } from 'fs';
import { join } from 'path';
export function createBattleCoachSuite(): TestSuite {
 const suite = new TestSuite('BattleCoach');
 suite.test('未擊殺也可翻頁查看SP、勝負、撤退，結束後不得復活', () => {
  const g=new FirstBattleOperationGuide();
  g.advance('next');g.advance('next');assert.equals('ultimate',g.step);
  assert.contains(g.hint!.message,'擊殺');g.advance('next');assert.contains(g.hint!.message,'陣地');
  g.advance('next');assert.contains(g.hint!.message,'撤退');g.advance('previous');assert.equals('victory',g.step);
  g.advance('turn-stalemate');assert.isFalse(g.hint!.message.includes('方方'));
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
   assert.isTrue(!!r);
   // 收起頁籤刻意落在整條 TopBar 的空白處（標題列），只對其他 HUD 區塊與標籤要求不重疊
   const isTab=r!.height===COACH_TAB_HEIGHT&&r!.y<COACH_TITLE_BAND;
   assert.isTrue(obstacles.filter(o=>!(isTab&&o.y===0&&o.width===w)).every(o=>!coachRectsOverlap(r!,o)));
   assert.isTrue(r!.x>=0&&r!.y>=0&&r!.x+r!.width<=w&&r!.y+r!.height<=h);
  });
 }
 suite.test('完全沒空位時不蓋HUD；收起頁籤釘在標題列（高 60 設計px，不佔棋盤）', () => {
  assert.equals(null,battleCoachPlacement(360,640,[{x:0,y:0,width:360,height:640}],true));
  const r=battleCoachPlacement(1080,1920,[],true)!;assert.equals(60,r.height);assert.isTrue(r.y<96);
 });
 suite.test('收起頁籤釘在標題列，不落在棋盤上方（QA 11/25）', () => {
  const topBar={x:0,y:0,width:1920,height:86};
  const turnLabel={x:18,y:20,width:140,height:40};
  const r=battleCoachPlacement(1920,1080,[topBar,turnLabel],true)!;
  assert.isTrue(r.y+r.height<=COACH_TITLE_BAND,'整個頁籤在標題列內');
  assert.isFalse(coachRectsOverlap(r,turnLabel));
  const tallBar=battleCoachPlacement(1920,1080,[{x:0,y:0,width:1920,height:130}],true)!;
  assert.isTrue(tallBar.y+tallBar.height<=COACH_TITLE_BAND,'TopBar 比標題列高也不擋頁籤');
  assert.equals(null,coachTabPlacement(1920,[{x:200,y:20,width:100,height:30}]),'標題列文字擋住時不硬塞');
  const fallback=battleCoachPlacement(1920,1080,[{x:200,y:20,width:100,height:30}],true);
  assert.isTrue(!fallback||fallback.y>=96||fallback.x!==190,'被擋住退回掃描');
 });

 suite.test('展開卡貼左下角：位於區域內、離左下比離右下近、不進右下拇指區與接戰區（PROG-2-10061）', () => {
  for (const [w,h] of [[1920,1080],[1600,1000],[1440,1080],[1080,1920]]) {
   const r=battleCoachPlacement(w,h,[])!;
   assert.isTrue(!!r,`${w}x${h} 要有位置`);
   assert.isTrue(r.x<w/2-r.width/2+1,'靠左');assert.isTrue(r.y+r.height>h*0.75,'靠下');
   assert.isTrue(r.x+r.width<=w*(DEFAULT_COACH_PLACEMENT.region.x+DEFAULT_COACH_PLACEMENT.region.width)+1,'不進右側拇指區');
   const engage={x:w*0.3,y:h*0.3,width:w*0.45,height:h*0.3};assert.isFalse(coachRectsOverlap(r,engage),'不壓接戰區');
  }
 });
 suite.test('被 HUD 擋住時往右／往上讓，仍貼左下錨點；全被擋回 null', () => {
  const w=1920,h=1080;const free=battleCoachPlacement(w,h,[])!;
  const col={x:0,y:0,width:w*0.162,height:h};
  const r=battleCoachPlacement(w,h,[col])!;assert.isTrue(r.x>=col.width,'讓出左欄');assert.equals(free.y,r.y);
  assert.equals(null,battleCoachPlacement(w,h,[{x:0,y:0,width:w,height:h}]));
 });
 suite.test('anchor 資料驅動：換成右下錨點就貼右側（不寫死座標）', () => {
  const cfg=parseCoachPlacementConfig({...DEFAULT_COACH_PLACEMENT,anchor:'bottom-right',region:{x:0.44,y:0.6,width:0.56,height:0.4},forbidden:[]});
  const r=battleCoachPlacement(1920,1080,[],false,cfg)!;assert.isTrue(r.x>1920/2);
 });
 suite.test('擺放資料檔與內建預設一致；壞資料退回預設', () => {
  const raw=JSON.parse(readFileSync(join(__dirname,'../assets/resources/data/battle-coach-placement.json'),'utf8'));
  assert.equals(JSON.stringify(DEFAULT_COACH_PLACEMENT),JSON.stringify(parseCoachPlacementConfig(raw)));
  assert.equals(DEFAULT_COACH_PLACEMENT,parseCoachPlacementConfig({anchor:'middle'}));
  assert.equals(DEFAULT_COACH_PLACEMENT,parseCoachPlacementConfig({...raw,region:{x:0,y:0,width:2,height:1}}));
  assert.equals(DEFAULT_COACH_PLACEMENT,parseCoachPlacementConfig(null));
 });
 suite.test('教學文案四語系都有每一步與 SP 後綴，並帶在提示上', () => {
  const g=new FirstBattleOperationGuide();
  const steps=['deploy','clash','ultimate','victory','retreat','stalemate'];
  for(const loc of ['zh-TW','zh-CN','en','ja']){
   const t=JSON.parse(readFileSync(join(__dirname,`../assets/resources/i18n/${loc}.json`),'utf8'));
   for(const k of [...steps.map(x=>`battle.guide.step.${x}`),'battle.guide.step.ultimateSp','battle.guide.step.ultimateNoSp']) assert.isTrue(typeof t[k]==='string'&&t[k].length>0,`${loc} 缺 ${k}`);
   assert.contains(t['battle.guide.step.ultimateSp'],'{2}');
  }
  for(const step of steps.slice(0,5)){(g as any).step=step;assert.equals(`battle.guide.step.${step}`,g.hint!.key);}
 });
 suite.test('收合不受事件強行展開、綁定重開/翻頁與resize，移除600px遮擋箭頭', () => {
  const src=readFileSync(join(__dirname,'../assets/scripts/ui/components/BattleScenePanel.ts'),'utf8');
  assert.contains(src,'this._guideMinimized = true');assert.contains(src,'this._guideMinimized = false');
  assert.contains(src,'this.schedule(this._guideLayoutTick, 0.25)');assert.contains(src,'getBoundingBoxToWorld');
  assert.contains(src,"binder?.getNode('guideResume')?.on(Button.EventType.CLICK");
  const layout=JSON.parse(readFileSync(join(__dirname,'../assets/resources/ui-spec/layouts/battle-operation-guide-main.json'),'utf8'));
  assert.isFalse(JSON.stringify(layout).includes('tutorialPointer'));
 });
 suite.test('透明Canvas不擋住全部教學；軍師只保留可見摘要/智謀區，scroll子內容不重複計算', () => {
  const full={x:0,y:0,width:1920,height:1080};
  assert.isFalse(battleCoachIsObstacle('StrategistHudRoot',full,1920,1080));
  assert.isFalse(battleCoachIsObstacle('DeployRoot',full,1920,1080));
  assert.isTrue(battleCoachIsObstacle('SummaryBand',{x:8,y:96,width:224,height:72},1920,1080));
  assert.isTrue(battleCoachIsObstacle('WisdomColumn',{x:1558,y:112,width:344,height:48},1920,1080));
  const src=readFileSync(join(__dirname,'../assets/scripts/ui/components/BattleScenePanel.ts'),'utf8');
  assert.contains(src,'blocks = battleCoachIsObstacle(n.name');
  assert.contains(src,'if (!covered && blocks) obstacles.push(r)');
  assert.contains(src,'visit(child, covered || blocks)');
 });
 return suite;
}
