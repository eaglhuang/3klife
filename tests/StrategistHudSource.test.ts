/**
 * 軍師 HUD 戰場資料來源（PROG-2-1599）headless 測試
 *
 * 覆蓋：落石／營帳／陷阱轉成互動物件；火場、深水、陷阱列入本回合危害；回收累計原樣帶出且不共用參照。
 */
import { TestSuite, assert } from './TestRunner';
import { strategistHudInputOf } from '../assets/scripts/battle/shared/StrategistHudSource';
import { buildStrategistHudSummary } from '../assets/scripts/core/systems/StrategistHud';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { ROCK_SLIDE_TILE_NOTE } from '../assets/scripts/battle/shared/StageSalvage';
import { AMBUSH_TRAP_TILE_NOTE } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { BattleTactic } from '../assets/scripts/core/config/Constants';
import type { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';

export function createStrategistHudSourceSuite(): TestSuite {
    const suite = new TestSuite('StrategistHudSource (軍師 HUD 戰場資料來源 PROG-2-1599)');

    suite.test('落石、營帳、陷阱轉成互動物件，危害與回收帶出', () => {
        const state = new BattleState();
        state.setTileEffect({ id: 'r1', lane: 1, depth: 4, state: 'hazard-rock', blocksMovement: true, notes: ROCK_SLIDE_TILE_NOTE });
        state.setTileEffect({ id: 'r2', lane: 2, depth: 4, state: 'hazard-rock', blocksMovement: true, notes: ROCK_SLIDE_TILE_NOTE });
        state.setTileEffect({ id: 'c', lane: 3, depth: 7, state: 'scene-camp', notes: 'scene-gambit:camp' });
        state.setTileEffect({ id: 't', lane: 0, depth: 2, state: 'hazard-rock', damagePerTurn: 10, notes: AMBUSH_TRAP_TILE_NOTE });
        state.setTileEffect({ id: 'f', lane: 4, depth: 3, state: 'hazard-fire', damagePerTurn: 15 });
        state.stageSalvage.stone = 120;

        const input = strategistHudInputOf(state, ['抗混亂']);
        const summary = buildStrategistHudSummary(input);
        assert.equals('落石機關：存活 2\n營帳：存活 1\n陷阱：存活 1', summary.interactiveObjectStatus);
        assert.equals('埋伏陷阱、火場延燒', summary.themeHazard);
        assert.equals('石材 120', summary.stageSalvageSummary);
        assert.equals('缺少抗混亂', summary.recommendedLoadoutGap);

        input.salvage.stone = 0;
        assert.equals(120, state.stageSalvage.stone, '回收累計不能共用參照');
    });

    suite.test('場景戰法帶出主將智力與戰法名，一般戰鬥不帶（PROG-2-1758）', () => {
        const state = new BattleState();
        state.playerGeneral = { name: '諸葛亮', int: 99 } as unknown as GeneralUnit;
        assert.equals('', buildStrategistHudSummary(strategistHudInputOf(state)).executingTactic);
        state.battleTactic = BattleTactic.NightRaid;
        assert.equals('諸葛亮 INT 99，正在執行：夜襲', buildStrategistHudSummary(strategistHudInputOf(state)).executingTactic);
        state.playerGeneral = null;
        assert.equals(undefined, strategistHudInputOf(state).executing);
    });

    suite.test('已擊破的落石列為已回收（PROG-2-1745）', () => {
        const state = new BattleState();
        state.setTileEffect({ id: 'r1', lane: 1, depth: 4, state: 'hazard-rock', blocksMovement: true, notes: ROCK_SLIDE_TILE_NOTE });
        state.recoveredRockSlides = 2;
        const summary = buildStrategistHudSummary(strategistHudInputOf(state));
        assert.equals('落石機關：存活 1、已回收 2', summary.interactiveObjectStatus);
    });

    suite.test('已被踩中的陷阱列為已觸發（PROG-2-1750）', () => {
        const state = new BattleState();
        state.triggeredAmbushTraps = 1;
        const summary = buildStrategistHudSummary(strategistHudInputOf(state));
        assert.equals('陷阱：已觸發 1', summary.interactiveObjectStatus);
    });

    suite.test('空戰場：無互動物件、無危害、尚無收益', () => {
        const summary = buildStrategistHudSummary(strategistHudInputOf(new BattleState()));
        assert.equals('無互動物件', summary.interactiveObjectStatus);
        assert.equals('本回合無主題危害', summary.themeHazard);
        assert.equals('尚無收益', summary.stageSalvageSummary);
    });

    return suite;
}
