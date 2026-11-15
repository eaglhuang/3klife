import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';
import { TurnFlowManager } from '../assets/scripts/battle/views/TurnFlowManager';

export function createDuelPresentationBridgeSuite(): TestSuite {
  const suite = new TestSuite('單挑結算與演出接線');
  suite.test('接受單挑保留結算結果，演出結束後才提交 HUD 與戰後畫面', async () => {
    const ctx = createBattleSceneContext();
    const scene = { isValid: true } as any;
    const bridge = new BattleUIBridge(ctx, scene);
    let release: () => void = () => undefined;
    const animation = new Promise<void>(resolve => { release = resolve; });
    const calls: any[] = [];
    ctx.unitRenderer = { playDuelPresentation: (...args: any[]) => { calls.push(args); return animation; } } as any;
    const committed: any[] = [], ended: string[] = [];
    const off = services().event.on(EVENT_NAMES.GeneralDamagedVisualCommitted, data => committed.push(data));
    const internal = bridge as any;
    const originalEnd = internal._onBattleEnded.bind(bridge);
    internal._onBattleEnded = (data: any) => internal.duelCapture ? originalEnd(data) : ended.push(data.result);
    ctx.ctrl = {
      state: { getGeneral: (f: Faction) => ({ currentHp: f === Faction.Player ? 30 : 0, maxHp: 100 }) },
      resolveDuelChallenge: () => {
        internal._onGeneralDamaged({ faction: Faction.Enemy, hp: 0, damage: 20, wasDodged: false });
        internal._onBattleEnded({ result: 'player-win' });
        return 'player-win';
      },
    } as any;
    const pending = bridge.resolveDuelPresentation(Faction.Player, true);
    assert.equals(1, calls.length);
    assert.equals(0, calls[0][0]);
    assert.equals(true, calls[0][1]);
    assert.equals(0, calls[0][2][0].attacker);
    assert.equals(0, committed.length);
    assert.equals(0, ended.length);
    release();
    assert.equals('player-win', await pending);
    assert.equals(1, committed.length);
    assert.equals(0, committed[0].hp);
    assert.equals('player-win', ended[0]);
    off();
  });
  suite.test('拒絕單挑直接執行既有結算，不播放交鋒', async () => {
    const ctx = createBattleSceneContext();
    const bridge = new BattleUIBridge(ctx, { isValid: true } as any);
    let played = false;
    ctx.unitRenderer = { playDuelPresentation: () => { played = true; } } as any;
    ctx.ctrl = { resolveDuelChallenge: (_f: Faction, accepted: boolean) => accepted ? 'bad' : 'ongoing' } as any;
    assert.equals('ongoing', await bridge.resolveDuelPresentation(Faction.Enemy, false));
    assert.equals(false, played);
  });
  suite.test('素材尚未載入時仍完成既有結算與 HUD 提交', async () => {
    const ctx = createBattleSceneContext();
    const bridge = new BattleUIBridge(ctx, { isValid: true } as any);
    const committed: any[] = [];
    const off = services().event.on(EVENT_NAMES.GeneralDamagedVisualCommitted, data => committed.push(data));
    ctx.ctrl = {
      state: { getGeneral: () => ({ currentHp: 10, maxHp: 100 }) },
      resolveDuelChallenge: () => {
        (bridge as any)._onGeneralDamaged({ faction: Faction.Player, hp: 10, damage: 0, wasDodged: true });
        return 'ongoing';
      },
    } as any;
    assert.equals('ongoing', await bridge.resolveDuelPresentation(Faction.Enemy, true));
    assert.equals(1, committed.length);
    assert.equals(10, committed[0].hp);
    off();
  });
  suite.test('場景銷毀時不對已離開的 HUD 提交事件', async () => {
    const ctx = createBattleSceneContext();
    const scene = { isValid: true };
    const bridge = new BattleUIBridge(ctx, scene as any);
    let release: () => void = () => undefined;
    const animation = new Promise<void>(resolve => { release = resolve; });
    ctx.unitRenderer = { playDuelPresentation: () => animation } as any;
    const committed: any[] = [];
    const off = services().event.on(EVENT_NAMES.GeneralDamagedVisualCommitted, data => committed.push(data));
    ctx.ctrl = {
      state: { getGeneral: () => ({ currentHp: 10, maxHp: 100 }) },
      resolveDuelChallenge: () => {
        (bridge as any)._onGeneralDamaged({ faction: Faction.Player, hp: 10, damage: 1 });
        return 'ongoing';
      },
    } as any;
    const pending = bridge.resolveDuelPresentation(Faction.Enemy, true);
    scene.isValid = false; release();
    assert.equals('ongoing', await pending);
    assert.equals(0, committed.length);
    off();
  });
  suite.test('回合移動後檢查單挑，演出完成前不推進敵方回合', async () => {
    const ctx = createBattleSceneContext();
    const scheduled: Array<{ fn: () => void; delay: number }> = [];
    const scene = { isValid: true, scheduleOnce: (fn: () => void, delay: number) => scheduled.push({ fn, delay }) };
    let release: (value: string) => void = () => undefined;
    const animation = new Promise<string>(resolve => { release = resolve; });
    let duelCalls = 0, enemyTurns = 0;
    const bridge = {
      refreshBattleViews: () => undefined, playTurnBanner: () => undefined,
      showEnemyThinkingPanel: () => undefined, hideEnemyThinkingPanel: () => undefined,
      resolveDuelPresentation: () => { duelCalls++; return animation; },
    };
    ctx.ctrl = {
      isWaitingDuelPlacement: false, canAdvanceBattleTurn: () => true,
      resolvePlayerTurn: () => 'ongoing', resolveEnemyTurn: () => { enemyTurns++; },
      isDuelChallengeResolved: () => false,
      isGeneralFacingEnemyGeneral: (f: Faction) => f === Faction.Player,
      evaluateDuelAcceptance: () => ({ accepted: true, score: 1, defenderFaction: Faction.Enemy }),
    } as any;
    const turn = new TurnFlowManager(ctx, scene as any, bridge as any);
    const runNext = (): void => {
      scheduled.sort((a, b) => a.delay - b.delay);
      const next = scheduled.shift();
      if (!next) throw new Error('缺少排程');
      next.fn();
    };
    turn.onEndTurn();
    runNext();
    assert.equals(1, duelCalls);
    assert.equals(true, ctx.isDuelPanelActive);
    assert.equals(0, enemyTurns);
    release('ongoing');
    await Promise.resolve(); await Promise.resolve();
    runNext();
    runNext();
    assert.equals(1, enemyTurns);
  });
  return suite;
}

if (require.main === module) {
  void createDuelPresentationBridgeSuite().run().then(results => {
    for (const result of results) process.stdout.write(`${result.passed ? 'PASS' : 'FAIL'} ${result.caseName}${result.error ? ': ' + result.error : ''}\n`);
    if (results.some(result => !result.passed)) process.exitCode = 1;
  });
}
