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

    suite.test('空戰場：無互動物件、無危害、尚無收益', () => {
        const summary = buildStrategistHudSummary(strategistHudInputOf(new BattleState()));
        assert.equals('無互動物件', summary.interactiveObjectStatus);
        assert.equals('本回合無主題危害', summary.themeHazard);
        assert.equals('尚無收益', summary.stageSalvageSummary);
    });

    return suite;
}
