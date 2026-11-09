/**
 * BattleVision — 夜襲主題關的玩家視野（PROG-2-2132）
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { isUnitVisibleToPlayer } from '../assets/scripts/battle/shared/BattleVision';
import { stageThemeVisionRadius } from '../assets/scripts/battle/shared/StageThemeSalvage';
import { STAGE_THEME_INTEL, stageThemeMechanicNotes } from '../assets/scripts/core/systems/StageThemeIntel';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const made = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 10, defense: 5, moveRange: 1, attackRange: 1 } as never);
    made.moveTo(lane, depth);
    return made;
}

function scene(radius: number | null, ...units: TroopUnit[]): BattleState {
    const state = new BattleState();
    state.visionRadius = radius;
    units.forEach((item) => state.addUnit(item));
    return state;
}

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100, maxSp: 100, initialSp: 0, str: 50, int: 50, lea: 50,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [],
    });
}

export function createBattleVisionSuite(): TestSuite {
    const suite = new TestSuite('BattleVision (夜襲視野 PROG-2-2132)');

    suite.test('沒有視野限制時全部可見', () => {
        const enemy = unit('e', Faction.Enemy, 0, 7);
        assert.isTrue(isUnitVisibleToPlayer(scene(null, enemy), enemy));
    });

    suite.test('我方部隊永遠可見', () => {
        const mine = unit('p', Faction.Player, 4, 7);
        assert.isTrue(isUnitVisibleToPlayer(scene(3, mine), mine));
    });

    suite.test('半徑 3 內可見，超過就看不到', () => {
        const viewer = unit('p', Faction.Player, 2, 3);
        const near = unit('near', Faction.Enemy, 2, 6);
        const far = unit('far', Faction.Enemy, 2, 7);
        const state = scene(3, viewer, near, far);
        assert.isTrue(isUnitVisibleToPlayer(state, near), '距離 3');
        assert.isFalse(isUnitVisibleToPlayer(state, far), '距離 4');
    });

    suite.test('距離計算包含路數差', () => {
        const viewer = unit('p', Faction.Player, 0, 4);
        const enemy = unit('e', Faction.Enemy, 4, 4);
        assert.isFalse(isUnitVisibleToPlayer(scene(3, viewer, enemy), enemy));
    });

    suite.test('陣亡部隊不提供視野', () => {
        const viewer = unit('p', Faction.Player, 2, 5);
        viewer.currentHp = 0;
        const enemy = unit('e', Faction.Enemy, 2, 6);
        assert.isFalse(isUnitVisibleToPlayer(scene(3, viewer, enemy), enemy));
    });

    suite.test('我方沒部隊時，底線 3 格內仍看得到逼近的敵軍', () => {
        const close = unit('close', Faction.Enemy, 2, 3);
        const away = unit('away', Faction.Enemy, 2, 4);
        const state = scene(3, close, away);
        assert.isTrue(isUnitVisibleToPlayer(state, close));
        assert.isFalse(isUnitVisibleToPlayer(state, away));
    });

    suite.test('只有夜襲主題有視野半徑，且與面板情資一致', () => {
        assert.equals(stageThemeVisionRadius('Night_Raid'), 3);
        assert.equals(stageThemeVisionRadius('Canyon'), null);
        assert.equals(stageThemeVisionRadius(undefined), null);
        assert.equals(stageThemeVisionRadius('未知'), null);
        assert.equals(STAGE_THEME_INTEL.Night_Raid.visionRadius, 3);
        assert.isTrue(stageThemeMechanicNotes('Night_Raid').includes('視野受限：半徑 3 格'));
        assert.isFalse(stageThemeMechanicNotes('Canyon').some((note) => note.includes('視野')));
    });

    suite.test('開新局會清掉上一局的視野限制', () => {
        const state = new BattleState();
        state.visionRadius = 3;
        state.reset(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(state.visionRadius, null);
    });

    return suite;
}
