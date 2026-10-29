/**
 * 攻城戰最小版（PROG-2-1589，暫定）headless 測試
 *
 * 覆蓋：戰法對應 siege 場景；敵方城牆區（depth ≥ 6）防禦 ×1.5、城外不加；投石機轟擊城牆區不致死；雲梯讓我方步兵抵銷城牆地利；
 * 我方工兵攻城傷害 ×2、敵方不加；非攻城場景倍率皆為 1。
 */
import { TestSuite, assert } from './TestRunner';
import {
    SIEGE_CATAPULT_DAMAGE,
    SIEGE_RAM_MULTIPLIER,
    applySceneCatapult,
    sceneLadderDefenseBypassOf,
    SIEGE_WALL_DEFENSE_MULTIPLIER,
    sceneDefenseMultiplierOf,
    sceneSiegeDamageMultiplierOf,
} from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { resolveBattleSceneMode } from '../assets/scripts/battle/shared/BattleSceneMode';
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';

function unitAt(faction: Faction, depth: number): TroopUnit {
    return { faction, depth, lane: 1 } as unknown as TroopUnit;
}

export function createSiegeSceneSuite(): TestSuite {
    const suite = new TestSuite('SiegeScene (攻城戰最小版 PROG-2-1589)');
    const siege = { battleTactic: BattleTactic.Siege } as never;
    const normal = { battleTactic: BattleTactic.Normal } as never;

    suite.test('攻城戰對應 siege 場景', () => {
        assert.equals('siege', resolveBattleSceneMode(BattleTactic.Siege));
    });

    suite.test('城牆地利：敵方 depth ≥ 6（城池在最後兩列）防禦 ×1.5，城外與我方不加（PROG-2-1596 修正）', () => {
        assert.equals(SIEGE_WALL_DEFENSE_MULTIPLIER, sceneDefenseMultiplierOf(unitAt(Faction.Enemy, 7), siege));
        assert.equals(SIEGE_WALL_DEFENSE_MULTIPLIER, sceneDefenseMultiplierOf(unitAt(Faction.Enemy, 6), siege));
        assert.equals(1, sceneDefenseMultiplierOf(unitAt(Faction.Enemy, 5), siege));
        assert.equals(1, sceneDefenseMultiplierOf(unitAt(Faction.Enemy, 0), siege));
        assert.equals(1, sceneDefenseMultiplierOf(unitAt(Faction.Player, 7), siege));
    });

    suite.test('衝車：我方工兵攻城 ×2，敵方不加', () => {
        assert.equals(SIEGE_RAM_MULTIPLIER, sceneSiegeDamageMultiplierOf(unitAt(Faction.Player, 0), siege));
        assert.equals(1, sceneSiegeDamageMultiplierOf(unitAt(Faction.Enemy, 7), siege));
    });

    suite.test('投石機：我方工兵轟擊城牆區敵軍 10 傷、最少留 1 血，城外與非攻城場景不受影響（PROG-2-1596）', () => {
        const mk = (id: string, faction: Faction, depth: number, hp: number) => ({ id, faction, depth, lane: 1, currentHp: hp, isDead: () => hp <= 0 }) as unknown as TroopUnit;
        const wall = mk('w', Faction.Enemy, 7, 100);
        const weak = mk('k', Faction.Enemy, 6, 5);
        const field = mk('f', Faction.Enemy, 3, 100);
        const engineer = mk('e', Faction.Player, 2, 100);
        const units = new Map([[wall.id, wall], [weak.id, weak], [field.id, field], [engineer.id, engineer]]);
        const hit = applySceneCatapult(engineer, { battleTactic: BattleTactic.Siege, units } as never);
        assert.equals('w,k', hit.join(','));
        assert.equals(100 - SIEGE_CATAPULT_DAMAGE, wall.currentHp);
        assert.equals(1, weak.currentHp);
        assert.equals(100, field.currentHp);
        assert.equals(0, applySceneCatapult(engineer, { battleTactic: BattleTactic.Normal, units } as never).length);
    });

    suite.test('雲梯：我方步兵打城牆區守軍抵銷城牆地利，騎兵與城外不抵銷（PROG-2-1597）', () => {
        const mk = (faction: Faction, type: TroopType, depth: number) => ({ faction, type, depth, lane: 1 }) as unknown as TroopUnit;
        const wall = mk(Faction.Enemy, TroopType.Shield, 7);
        const infantry = mk(Faction.Player, TroopType.Infantry, 6);
        const bypass = sceneLadderDefenseBypassOf(infantry, wall, siege);
        assert.equals(1, Math.round(bypass * sceneDefenseMultiplierOf(wall, siege) * 1000) / 1000);
        assert.equals(1, sceneLadderDefenseBypassOf(mk(Faction.Player, TroopType.Cavalry, 6), wall, siege));
        assert.equals(1, sceneLadderDefenseBypassOf(infantry, mk(Faction.Enemy, TroopType.Shield, 3), siege));
        assert.equals(1, sceneLadderDefenseBypassOf(infantry, wall, normal));
    });

    suite.test('非攻城場景倍率皆為 1', () => {
        assert.equals(1, sceneDefenseMultiplierOf(unitAt(Faction.Enemy, 7), normal));
        assert.equals(1, sceneSiegeDamageMultiplierOf(unitAt(Faction.Player, 0), normal));
    });

    return suite;
}
