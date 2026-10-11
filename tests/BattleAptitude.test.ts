/**
 * BattleAptitude.test.ts — 戰場適性修正引擎 headless 測試（PROG-2-0071）
 *
 * Unity 對照：EditMode Test，驗證 Affinity Matrix 查表與 DamageCalculator 的適性乘區。
 */
import { TestSuite, assert } from './TestRunner';
import {
    APTITUDE_MODIFIERS,
    normalizeAptitudeGrade,
    pinkFactorAptitude,
    resolveAptitude,
    terrainGradeOf,
    troopGradeOf,
    weatherGradeOf,
} from '../assets/scripts/core/systems/BattleAptitude';
import { FormulaSystem } from '../assets/scripts/core/systems/FormulaSystem';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { Faction, TerrainType, TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

const CAO_CAO = {
    troopAptitude: { CAVALRY: 'A', INFANTRY: 'B', ARCHER: 'B', SIEGE: 'B' },
    terrainAptitude: { PLAIN: 'A', MOUNTAIN: 'B', WATER: 'B', FOREST: 'B', DESERT: 'C' },
    weatherAptitude: { FOG: 'A', RAINY: 'A', SUNNY: 'B', WINDY: 'B', NIGHT: 'B', THUNDER: 'C' },
};

function near(expected: number, actual: number, msg?: string): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, msg ?? `expected ${expected}, got ${actual}`);
}

export function createBattleAptitudeSuite(): TestSuite {
    const suite = new TestSuite('BattleAptitude');

    suite.test('Q16=C 重訂表：S~D 單調遞減，D 級 -30%（Q35 硬核落在最低級）', () => {
        const grades = ['S', 'A', 'B', 'C', 'D'] as const;
        for (let i = 1; i < grades.length; i += 1) {
            assert.isTrue(APTITUDE_MODIFIERS[grades[i]].atk < APTITUDE_MODIFIERS[grades[i - 1]].atk, `${grades[i]} 攻擊低於 ${grades[i - 1]}`);
            assert.isTrue(APTITUDE_MODIFIERS[grades[i]].move <= APTITUDE_MODIFIERS[grades[i - 1]].move);
            assert.isTrue(APTITUDE_MODIFIERS[grades[i]].acc <= APTITUDE_MODIFIERS[grades[i - 1]].acc);
        }
        assert.equals(0, APTITUDE_MODIFIERS.B.atk, 'B 級普通、無修正');
        assert.equals(-0.3, APTITUDE_MODIFIERS.D.atk);
        assert.equals(0.2, APTITUDE_MODIFIERS.S.def);
    });

    suite.test('等級正規化：小寫、空白、未知值都安全', () => {
        assert.equals('S', normalizeAptitudeGrade(' s '));
        assert.equals('B', normalizeAptitudeGrade('Z'));
        assert.equals('B', normalizeAptitudeGrade(undefined));
        assert.equals('B', normalizeAptitudeGrade(3));
    });

    suite.test('戰場代碼對應適性欄位：河流=水域、器械=SIEGE/ENGINEER、盾槍歸步兵、沙暴=大風', () => {
        assert.equals('A', terrainGradeOf(CAO_CAO, TerrainType.Plain));
        assert.equals('C', terrainGradeOf(CAO_CAO, TerrainType.Desert));
        assert.equals('B', terrainGradeOf(CAO_CAO, TerrainType.River));
        assert.equals('S', terrainGradeOf({ terrainAptitude: { RIVER: 'S' } }, TerrainType.River), '舊資料 RIVER 欄位');
        assert.equals('B', terrainGradeOf(CAO_CAO, TerrainType.Fortress), '城塞沒有適性欄位');
        assert.equals('A', weatherGradeOf(CAO_CAO, Weather.Fog));
        assert.equals('A', weatherGradeOf(CAO_CAO, Weather.Rain));
        assert.equals('B', weatherGradeOf(CAO_CAO, Weather.Sandstorm));
        assert.equals('A', troopGradeOf(CAO_CAO, TroopType.Cavalry));
        assert.equals('B', troopGradeOf(CAO_CAO, TroopType.Shield));
        assert.equals('D', troopGradeOf({ troopAptitude: { ENGINEER: 'D' } }, TroopType.Engineer));
        assert.equals('B', troopGradeOf(CAO_CAO, TroopType.Navy), '沒有 NAVY 欄位視為 B');
        assert.equals('B', troopGradeOf(null, TroopType.Cavalry), '沒有指揮武將');
    });

    suite.test('三乘區：攻防 = (1+地形)(1+天氣)(1+兵種)，移動 = 地形+兵種，命中 = 地形+天氣', () => {
        const r = resolveAptitude(CAO_CAO, { troopType: TroopType.Cavalry, terrain: TerrainType.Plain, weather: Weather.Fog });
        near(1.1 * 1.1 * 1.1, r.attackMultiplier, '平原 A × 大霧 A × 騎兵 A');
        near(1.331, r.defenseMultiplier);
        assert.equals(0, r.moveDelta);
        near(0.2, r.accuracyDelta);
        const worst = resolveAptitude(
            { troopAptitude: { CAVALRY: 'D' }, terrainAptitude: { MOUNTAIN: 'D' }, weatherAptitude: { NIGHT: 'C' } },
            { troopType: 'cavalry', terrain: 'mountain', weather: 'night' },
        );
        near(0.7 * 0.9 * 0.7, worst.attackMultiplier);
        assert.equals(-4, worst.moveDelta);
        near(-0.2, worst.accuracyDelta);
    });

    suite.test('粉色因子→適性：★0~3 = D/C/B/A，≥5 位祖先同因子升一級（最高 S）', () => {
        assert.equals('D', pinkFactorAptitude(0));
        assert.equals('C', pinkFactorAptitude(1));
        assert.equals('B', pinkFactorAptitude(2));
        assert.equals('A', pinkFactorAptitude(3));
        assert.equals('A', pinkFactorAptitude(9), '星等夾在 3');
        assert.equals('S', pinkFactorAptitude(3, 5));
        assert.equals('A', pinkFactorAptitude(2, 7));
        assert.equals('B', pinkFactorAptitude(2, 4));
    });

    suite.test('FormulaSystem：沒有適性倍率時與舊公式相同；有倍率時乘進攻防', () => {
        const formula = new FormulaSystem();
        const base = { attackerAttack: 100, defenderDefense: 20, attackerType: TroopType.Infantry, defenderType: TroopType.Archer, attackerTerrain: TerrainType.Plain, defenderTerrain: TerrainType.Plain };
        const plain = formula.calculateDamage(base);
        assert.equals(plain, formula.calculateDamage({ ...base, attackerAptitudeMultiplier: 1, defenderAptitudeMultiplier: 1 }));
        assert.equals(Math.floor(100 * 1.2 - 20 * 0.7), formula.calculateDamage({ ...base, attackerAptitudeMultiplier: 1.2, defenderAptitudeMultiplier: 0.7 }));
    });

    suite.test('戰場回歸：主將適性決定麾下部隊的攻防，S 平原騎兵比 D 平原騎兵打得更痛', () => {
        services().initialize();
        const make = (grade: string) => new GeneralUnit({
            id: `g-${grade}`, name: grade, faction: Faction.Player, hp: 1000, str: 80, lea: 80,
            troopAptitude: { CAVALRY: grade }, terrainAptitude: { PLAIN: grade }, weatherAptitude: { SUNNY: grade },
        });
        const enemyGeneral = new GeneralUnit({ id: 'e', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
        const hit = (grade: string): number => {
            const ctrl = new BattleController();
            ctrl.initBattle(make(grade), enemyGeneral, undefined, Weather.Clear);
            const attacker = new TroopUnit('p-cav', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 2, attackRange: 1 });
            const defender = new TroopUnit('e-inf', TroopType.Archer, Faction.Enemy, { hp: 1000, attack: 30, defense: 15, moveRange: 1, attackRange: 2 });
            attacker.moveTo(2, 3);
            defender.moveTo(2, 4);
            ctrl.state.addUnit(attacker);
            ctrl.state.addUnit(defender);
            const resolver = ctrl['combatResolver'];
            assert.equals(grade, resolver.getUnitAptitude(attacker).troop);
            resolver.resolveCombat(attacker, defender, services());
            return 1000 - defender.currentHp;
        };
        const s = hit('S');
        const b = hit('B');
        const d = hit('D');
        assert.isTrue(s > b && b > d, `S ${s} > B ${b} > D ${d}`);
    });

    return suite;
}
