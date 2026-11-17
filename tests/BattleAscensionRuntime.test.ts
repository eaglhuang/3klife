/**
 * BattleAscensionRuntime — 戰中升階接進戰場（doc_spec_0309 §4，PROG-2-9394）
 *
 * 名聲跨過門檻就升階並套用激勵：將階一 補兵、二 全軍士氣拉滿、三 全隊移動力 +1、四 敵全體士氣 −15、五 全軍暴擊 +20%。
 * 教學戰整場跳過；戰中名聲不寫回存檔。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { DEFAULT_TROOP_STATS } from '../assets/scripts/battle/runtime/BattleUnitSpawner';
import { MORALE_MAX } from '../assets/scripts/battle/shared/Morale';
import { BattleFameSource } from '../assets/scripts/battle/shared/InBattleAscension';
import type { BattleAscendedEvent } from '../assets/scripts/battle/runtime/BattleAscensionRuntime';
import { qaPlayerStartFame } from '../assets/scripts/core/systems/QaBattleEntry';

function general(id: string, faction: Faction, hp: number, str: number, fame = 0, rank = 0): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp, maxSp: 100, initialSp: 0, str, int: 60, lea: 60, luk: 0, tacticSlots: [], generalFame: fame, generalRank: rank } as unknown as GeneralConfig);
}

let serial = 0;
function troop(ctrl: BattleController, faction: Faction, lane: number, depth: number): TroopUnit {
    serial += 1;
    const unit = new TroopUnit('asc-' + faction + '-' + serial, TroopType.Infantry, faction, DEFAULT_TROOP_STATS[TroopType.Infantry]);
    unit.moveTo(lane, depth);
    ctrl.state.addUnit(unit);
    return unit;
}

interface World { ctrl: BattleController; mine: TroopUnit; theirs: TroopUnit; events: BattleAscendedEvent[]; notices: string[] }

function battle(playerFame: number, playerRank: number, tutorial = false): World {
    services().initialize();
    services().session.setRandomSource(() => 0.5);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, 1500, 95, playerFame, playerRank), general('e', Faction.Enemy, 900, 20));
    ctrl.tutorialBattle = tutorial;
    const mine = troop(ctrl, Faction.Player, 0, 1);
    const theirs = troop(ctrl, Faction.Enemy, 4, 6);
    const events: BattleAscendedEvent[] = [];
    const notices: string[] = [];
    services().event.on(EVENT_NAMES.GeneralAscended, (e: BattleAscendedEvent) => { events.push(e); });
    services().event.on(EVENT_NAMES.BattleSkillNotice, (line: string) => { notices.push(line); });
    return { ctrl, mine, theirs, events, notices };
}

export function createBattleAscensionRuntimeSuite(): TestSuite {
    const suite = new TestSuite('BattleAscensionRuntime（戰中升階接進戰場，PROG-2-9394）');

    suite.test('進場名聲與將階從主將資料帶入', () => {
        const w = battle(320, 2);
        assert.equals(320, w.ctrl.getBattleAscension(Faction.Player).generalFame);
        assert.equals(2, w.ctrl.getBattleAscension(Faction.Player).generalRank);
        assert.equals(0, w.ctrl.getBattleAscension(Faction.Enemy).generalRank);
    });

    suite.test('名聲沒跨門檻：只累計，不升階、不發事件', () => {
        const w = battle(50, 0);
        assert.equals(null, w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]));
        assert.equals(65, w.ctrl.getBattleAscension(Faction.Player).generalFame);
        assert.equals(0, w.events.length);
    });

    suite.test('單挑獲勝跨過 100：升將階一，發事件與戰報', () => {
        const w = battle(90, 0);
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals(1, w.events.length);
        const e = w.events[0];
        assert.equals(Faction.Player, e.faction);
        assert.equals(0, e.oldRank);
        assert.equals(1, e.newRank);
        assert.equals(105, e.currentTotalFame);
        assert.equals(1, w.ctrl.getBattleAscension(Faction.Player).generalRank);
        assert.isTrue(w.notices.some((n) => n.startsWith('加封：p晉升「') && n.includes('士氣高昂')), `notices=${w.notices.join('|')}`);
    });

    suite.test('升將階二：我方全軍士氣拉滿，敵方不變', () => {
        const w = battle(290, 1);
        w.theirs.morale = 0;
        w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]);
        assert.equals(MORALE_MAX, w.mine.morale);
        assert.equals(0, w.theirs.morale);
    });

    suite.test('升將階三：場上與之後上場的我方部隊移動力都 +1，敵方不變', () => {
        const w = battle(590, 2);
        const before = w.mine.getEffectiveMoveRange();
        const foeBefore = w.theirs.getEffectiveMoveRange();
        w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]);
        assert.equals(before + 1, w.mine.getEffectiveMoveRange());
        assert.equals(foeBefore, w.theirs.getEffectiveMoveRange());
        const late = troop(w.ctrl, Faction.Player, 1, 1);
        assert.equals(before + 1, late.getEffectiveMoveRange(), '之後才上場的也吃得到');
    });

    suite.test('升將階四：敵全體士氣 −15', () => {
        const w = battle(990, 3);
        w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]);
        assert.equals(-15, w.theirs.morale);
        assert.equals(0, w.mine.morale, '我方不受影響');
    });

    suite.test('升將階五：全軍暴擊 +20%', () => {
        const w = battle(1490, 4);
        w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]);
        assert.equals(0.2, w.ctrl.state.ascensionCritBonus.get(Faction.Player));
        assert.equals(undefined, w.ctrl.state.ascensionCritBonus.get(Faction.Enemy));
    });

    suite.test('一次連跨兩階：兩階的激勵都給，事件只發一筆', () => {
        const w = battle(95, 0);
        w.ctrl.overrideBattleFame(Faction.Player, 290);
        // 290 重算為將階一；再入帳 40 跨到 330 → 將階二
        const event = w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.BOSS_OR_NATIVE]);
        assert.equals(2, event!.newRank);
        assert.equals(1, w.events.length);
        assert.equals(MORALE_MAX, w.mine.morale);
    });

    suite.test('敵方主將升階只套效果：我方士氣被壓', () => {
        const w = battle(0, 0);
        w.ctrl.overrideBattleFame(Faction.Enemy, 990);
        w.ctrl.awardBattleFame(Faction.Enemy, [BattleFameSource.DUEL_VICTORY]);
        assert.equals(-15, w.mine.morale);
        assert.equals(Faction.Enemy, w.events[0].faction);
    });

    suite.test('教學戰整場跳過升階', () => {
        const w = battle(90, 0, true);
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals(0, w.events.length);
        assert.equals(null, w.ctrl.awardBattleFame(Faction.Player, [BattleFameSource.DUEL_VICTORY]));
        assert.equals(90, w.ctrl.getBattleAscension(Faction.Player).generalFame);
    });

    suite.test('擊破敵部隊 +15 名聲，一場只算一次（裁決 52，PROG-2-9395）', () => {
        const w = battle(90, 0);
        w.ctrl['combatResolver'].onUnitKilled(w.theirs, w.mine, services());
        assert.equals(105, w.ctrl.getBattleAscension(Faction.Player).generalFame);
        assert.equals(1, w.events.length, '跨過 100 升將階一');
        const second = troop(w.ctrl, Faction.Enemy, 3, 6);
        w.ctrl['combatResolver'].onUnitKilled(second, w.mine, services());
        assert.equals(105, w.ctrl.getBattleAscension(Faction.Player).generalFame, '第二支不再給');
        assert.equals(0, w.ctrl.getBattleAscension(Faction.Enemy).generalFame, '敵方沒擊破我方部隊，不給');
    });

    suite.test('敵方擊破我方部隊：敵方主將也入帳，各算各的一次', () => {
        const w = battle(0, 0);
        w.ctrl['combatResolver'].onUnitKilled(w.mine, w.theirs, services());
        assert.equals(15, w.ctrl.getBattleAscension(Faction.Enemy).generalFame);
        assert.equals(0, w.ctrl.getBattleAscension(Faction.Player).generalFame);
    });

    suite.test('教學戰擊破部隊不入帳', () => {
        const w = battle(90, 0, true);
        w.ctrl['combatResolver'].onUnitKilled(w.theirs, w.mine, services());
        assert.equals(90, w.ctrl.getBattleAscension(Faction.Player).generalFame);
        assert.equals(0, w.ctrl.getInBattleFameForRecord(Faction.Player));
    });

    suite.test('戰後要寫回的戰中名聲：單挑那筆不算（裁決 53 去重）', () => {
        const w = battle(0, 0);
        assert.equals(0, w.ctrl.getInBattleFameForRecord(Faction.Player));
        w.ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals(15, w.ctrl.getBattleAscension(Faction.Player).generalFame, '戰中有入帳');
        assert.equals(0, w.ctrl.getInBattleFameForRecord(Faction.Player), '寫回時去重');
        w.ctrl['combatResolver'].onUnitKilled(w.theirs, w.mine, services());
        assert.equals(15, w.ctrl.getInBattleFameForRecord(Faction.Player));
        assert.equals(30, w.ctrl.getBattleAscension(Faction.Player).generalFame);
    });

    suite.test('直進入口 qaPlayerFame：只有 qa 入口生效，不合法會報錯', () => {
        assert.equals(90, qaPlayerStartFame({ entrySource: 'qa', qaPlayerGeneralFame: 90 }));
        assert.equals(null, qaPlayerStartFame({ entrySource: 'lobby', qaPlayerGeneralFame: 90 } as unknown as Parameters<typeof qaPlayerStartFame>[0]));
        assert.equals(null, qaPlayerStartFame({ entrySource: 'qa' }));
    });

    return suite;
}
