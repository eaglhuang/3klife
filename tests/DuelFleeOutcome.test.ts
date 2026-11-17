/**
 * DuelFleeOutcome — 單挑勝負效果（doc_spec_0314 §4；使用者 2026-11-17 裁決，PROG-2-9369）
 *
 * 一般戰鬥：主將生命掉到兩成以下就落荒而逃（生命歸 1、全軍兵力減半），一擊直接打到 0 才算斬將。
 * 勝方：全軍士氣拉滿、暴擊率 +15% 持續 2 回合。教學戰只給勝方獎勵，不套敗方代價。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { EVENT_NAMES, Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { DEFAULT_TROOP_STATS } from '../assets/scripts/battle/runtime/BattleUnitSpawner';
import { MORALE_MAX } from '../assets/scripts/battle/shared/Morale';
import { duelVictoryBuffTurns, duelVictoryCritBonus, tickDuelVictoryBuff } from '../assets/scripts/battle/shared/DuelVictoryBuff';
import type { DuelOutcomeAppliedEvent } from '../assets/scripts/battle/runtime/BattleGeneralDuelFlow';

function general(id: string, faction: Faction, hp: number, str: number): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp, maxSp: 100, initialSp: 0, str, int: 60, lea: 60, luk: 0, tacticSlots: [] } as unknown as GeneralConfig);
}

let serial = 0;
function troop(ctrl: BattleController, faction: Faction, lane: number, depth: number): TroopUnit {
    serial += 1;
    const unit = new TroopUnit('df-' + faction + '-' + serial, TroopType.Infantry, faction, DEFAULT_TROOP_STATS[TroopType.Infantry]);
    unit.moveTo(lane, depth);
    ctrl.state.addUnit(unit);
    return unit;
}

interface World { ctrl: BattleController; mine: TroopUnit; theirs: TroopUnit; events: DuelOutcomeAppliedEvent[] }

function battle(tutorial: boolean, playerStr: number, enemyStr: number, enemyHp = 900): World {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, 1500, playerStr), general('e', Faction.Enemy, enemyHp, enemyStr));
    ctrl.tutorialBattle = tutorial;
    const mine = troop(ctrl, Faction.Player, 0, 1);
    const theirs = troop(ctrl, Faction.Enemy, 4, 6);
    const events: DuelOutcomeAppliedEvent[] = [];
    services().event.on(EVENT_NAMES.DuelOutcomeApplied, (e: DuelOutcomeAppliedEvent) => { events.push(e); });
    return { ctrl, mine, theirs, events };
}

export function createDuelFleeOutcomeSuite(): TestSuite {
    const suite = new TestSuite('DuelFleeOutcome（單挑殘血敗逃與勝方獎勵，PROG-2-9369）');

    suite.test('設定值：敗逃線為生命兩成', () => {
        assert.equals(0.2, GAME_CONFIG.duelFleeHpRatio);
    });

    suite.test('一般戰我方較強：敵主將逃走（生命歸 1）、敵軍兵力減半、戰鬥繼續', () => {
        const w = battle(false, 95, 20);
        const before = w.theirs.currentHp;
        const result = w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals('ongoing', result, '戰鬥繼續');
        assert.equals(1, w.ctrl.state.enemyGeneral!.currentHp, '敵主將生命歸 1');
        assert.equals(Math.floor(before / 2), w.theirs.currentHp, '敵軍兵力減半');
        assert.equals(Faction.Player, w.ctrl.getLastDuelWinner());
        const last = w.events[w.events.length - 1];
        assert.isTrue(last.fled && !last.killed && !last.tutorial, '事件標為敗逃');
    });

    suite.test('一般戰勝方獎勵：我方全軍士氣拉滿、暴擊 +15% 兩回合；敗方沒有', () => {
        const w = battle(false, 95, 20);
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals(MORALE_MAX, w.mine.morale, '我方士氣拉滿');
        assert.isTrue(w.theirs.morale < MORALE_MAX, '敵方士氣沒有拉滿');
        const buff = w.ctrl.state.getDuelVictoryBuff(Faction.Player);
        assert.equals(0.15, duelVictoryCritBonus(buff));
        assert.equals(2, buff!.remainingTurns, '發起方獲勝：當回合算第 1 回合');
        assert.equals(0, duelVictoryCritBonus(w.ctrl.state.getDuelVictoryBuff(Faction.Enemy)), '敗方沒有暴擊加成');
    });

    suite.test('一般戰我方較弱：我方主將逃回（生命歸 1）、我軍兵力減半、不判負；敵方得獎勵', () => {
        const w = battle(false, 5, 99, 90000);
        const before = w.mine.currentHp;
        const result = w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals('ongoing', result);
        assert.equals(1, w.ctrl.state.playerGeneral!.currentHp);
        assert.equals(Math.floor(before / 2), w.mine.currentHp);
        assert.equals(MORALE_MAX, w.theirs.morale);
        assert.equals(3, w.ctrl.state.getDuelVictoryBuff(Faction.Enemy)!.remainingTurns, '被挑戰方獲勝：多給 1 回合抵掉回合頭倒數');
    });

    suite.test('一擊直接打到 0 仍算斬將，整場結束', () => {
        const w = battle(false, 95, 20, 30);
        const result = w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals('player-win', result);
        assert.isTrue(w.ctrl.state.enemyGeneral!.isDead());
        const last = w.events[w.events.length - 1];
        assert.isTrue(last.killed && !last.fled, '事件標為斬將');
    });

    suite.test('教學戰：贏了有勝方獎勵，敗方不套代價（停在五成、兵力不減）', () => {
        const w = battle(true, 95, 20);
        const before = w.theirs.currentHp;
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        const enemy = w.ctrl.state.enemyGeneral!;
        assert.equals(Math.ceil(enemy.maxHp * GAME_CONFIG.tutorialDuelHpFloorRatio), enemy.currentHp, '敵主將停在五成');
        assert.equals(before, w.theirs.currentHp, '敵軍兵力不減');
        assert.equals(MORALE_MAX, w.mine.morale, '我方士氣拉滿');
        assert.equals(0.15, duelVictoryCritBonus(w.ctrl.state.getDuelVictoryBuff(Faction.Player)));
    });

    suite.test('教學戰輸了：我方主將停在五成、兵力不減', () => {
        const w = battle(true, 5, 99, 90000);
        const before = w.mine.currentHp;
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        const player = w.ctrl.state.playerGeneral!;
        assert.equals(Math.ceil(player.maxHp * GAME_CONFIG.tutorialDuelHpFloorRatio), player.currentHp);
        assert.equals(before, w.mine.currentHp);
    });

    suite.test('暴擊加成倒數：2 回合後失效', () => {
        const start = { critBonus: 0.15, remainingTurns: duelVictoryBuffTurns(2, true) };
        const t1 = tickDuelVictoryBuff(start);
        assert.equals(0.15, duelVictoryCritBonus(t1), '第 2 回合仍有效');
        assert.equals(0, duelVictoryCritBonus(tickDuelVictoryBuff(t1)), '第 3 回合失效');
        assert.equals(0, duelVictoryCritBonus(null));
    });

    return suite;
}
