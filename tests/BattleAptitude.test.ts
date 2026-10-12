/**
 * BattleAptitude.test.ts — 戰場適性修正引擎 headless 測試（PROG-2-0071）
 *
 * Unity 對照：EditMode Test，驗證 Affinity Matrix 查表與 DamageCalculator 的適性乘區。
 */
import { TestSuite, assert } from './TestRunner';
import {
    APTITUDE_MODIFIERS,
    MIN_HIT_RATE,
    applyAptitudeMove,
    hitRateOf,
    normalizeAptitudeGrade,
    rollHit,
    pinkFactorAptitude,
    resolveAptitude,
    terrainGradeOf,
    troopGradeOf,
    weatherGradeOf,
} from '../assets/scripts/core/systems/BattleAptitude';
import { FormulaSystem } from '../assets/scripts/core/systems/FormulaSystem';
import { getTerrainTroopEffect, NO_TERRAIN_TROOP_EFFECT } from '../assets/scripts/core/systems/TerrainTroopRules';
import { TerrainType, TroopType } from '../assets/scripts/shared/CommonEnums';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { Faction, TerrainType, TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import { executeBattleAutoMovePhase } from '../assets/scripts/battle/runtime/phases/BattleAutoMovePhase';

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
            resolver.hitRandom = () => 0;
            assert.equals(grade, resolver.getUnitAptitude(attacker).troop);
            resolver.resolveCombat(attacker, defender, services());
            return 1000 - defender.currentHp;
        };
        const s = hit('S');
        const b = hit('B');
        const d = hit('D');
        assert.isTrue(s > b && b > d, `S ${s} > B ${b} > D ${d}`);
    });

    suite.test('命中率：基礎 100%，只有負修正會落空，下限 50%；滿命中不吃亂數', () => {
        assert.equals(1, hitRateOf(0.15), 'S 級超過 100% 夾回 100%');
        assert.equals(1, hitRateOf(0));
        assert.equals(0.85, hitRateOf(-0.15));
        assert.equals(MIN_HIT_RATE, hitRateOf(-0.9));
        let calls = 0;
        assert.isTrue(rollHit(0, () => { calls += 1; return 0.99; }));
        assert.equals(0, calls, '100% 命中不擲骰');
        assert.isTrue(rollHit(-0.15, () => 0.84));
        assert.isFalse(rollHit(-0.15, () => 0.85));
    });

    suite.test('移動修正：會走的部隊至少留 1 格，不能走的維持 0', () => {
        assert.equals(3, applyAptitudeMove(2, 1));
        assert.equals(1, applyAptitudeMove(2, -2), 'D 級騎兵仍能走 1 格');
        assert.equals(1, applyAptitudeMove(1, -1), 'C 級步兵不會卡死');
        assert.equals(0, applyAptitudeMove(0, 1), '被定身 / 不移動的戰法不受適性加成');
    });

    suite.test('戰場回歸：命中落空不造成傷害、不觸發反擊，並發出 UnitAttackMissed', () => {
        services().initialize();
        const general = new GeneralUnit({
            id: 'g-d', name: 'D', faction: Faction.Player, hp: 1000, str: 80, lea: 80,
            troopAptitude: { CAVALRY: 'D' }, terrainAptitude: { PLAIN: 'D' }, weatherAptitude: { SUNNY: 'D' },
        });
        const enemyGeneral = new GeneralUnit({ id: 'e', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
        const ctrl = new BattleController();
        ctrl.initBattle(general, enemyGeneral, undefined, Weather.Clear);
        const attacker = new TroopUnit('p-cav', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 2, attackRange: 1 });
        const defender = new TroopUnit('e-inf', TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 30, defense: 15, moveRange: 1, attackRange: 1 });
        attacker.moveTo(2, 3);
        defender.moveTo(2, 4);
        ctrl.state.addUnit(attacker);
        ctrl.state.addUnit(defender);
        const resolver = ctrl['combatResolver'];
        assert.equals(0.7, hitRateOf(resolver.getUnitAptitude(attacker).accuracyDelta), '平原 D + 晴天 D = 70%');
        const missed: Array<{ hitRate: number }> = [];
        const off = services().event.on(EVENT_NAMES.UnitAttackMissed, (data?: { hitRate: number }) => { if (data) missed.push(data); });
        resolver.hitRandom = () => 0.95;
        resolver.resolveCombat(attacker, defender, services());
        off();
        assert.equals(1000, defender.currentHp, '落空沒有傷害');
        assert.equals(100, attacker.currentHp, '落空沒有反擊');
        assert.equals(1, missed.length);
        assert.equals(0.7, missed[0].hitRate);
        resolver.hitRandom = () => 0.1;
        resolver.resolveCombat(attacker, defender, services());
        assert.isTrue(defender.currentHp < 1000, '擲中就照常造成傷害');
    });

    suite.test('戰場回歸：自動推進套用主將移動修正，S 級騎兵多走 1 格、D 級少走但至少 1 格', () => {
        services().initialize();
        const advance = (grade: string): number => {
            const general = new GeneralUnit({
                id: `g-${grade}`, name: grade, faction: Faction.Player, hp: 1000, str: 80, lea: 80,
                troopAptitude: { CAVALRY: grade }, terrainAptitude: { PLAIN: grade },
            });
            const ctrl = new BattleController();
            ctrl.initBattle(general, new GeneralUnit({ id: 'e', name: 'e', faction: Faction.Enemy, hp: 1000 }), undefined, Weather.Clear);
            const unit = new TroopUnit(`p-${grade}`, TroopType.Cavalry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 2, attackRange: 1 });
            unit.moveTo(0, 0);
            ctrl.state.addUnit(unit);
            ctrl.state.getCell(0, 0)!.occupantId = unit.id;
            const resolver = ctrl['combatResolver'];
            executeBattleAutoMovePhase({
                state: ctrl.state,
                actingFaction: Faction.Player,
                turnManager: ctrl['turnManager'],
                consumeTileBuff: () => undefined,
                getFactionUnits: (faction) => resolver.getFactionUnits(faction),
                isCellMovementBlocked: (lane, depth) => resolver.isCellMovementBlocked(lane, depth),
                isGeneralUnit: (unitId) => resolver.isGeneralUnit(unitId),
                getAptitudeMoveDelta: (u) => resolver.getUnitAptitude(u).moveDelta,
            });
            return unit.depth;
        };
        assert.equals(2, advance('B'), 'B 級照基礎 2 格');
        assert.equals(4, advance('S'), '平原 S +1、騎兵 S +1');
        assert.equals(1, advance('D'), 'D 級 -4 但夾在 1 格');
    });

    suite.test('兵種 × 地形強弱勢：騎兵平原 +2 移動、山地 −2、林地 −1；步兵山地防禦 +30%；弓兵林地隱蔽 +20%、水域射程 −1', () => {
        assert.equals(2, getTerrainTroopEffect(TroopType.Cavalry, TerrainType.Plain).moveDelta);
        assert.equals(-2, getTerrainTroopEffect(TroopType.Cavalry, TerrainType.Mountain).moveDelta);
        assert.equals(-1, getTerrainTroopEffect(TroopType.Cavalry, TerrainType.Forest).moveDelta);
        assert.equals(0.3, getTerrainTroopEffect(TroopType.Infantry, TerrainType.Mountain).defenseMult);
        assert.equals(0.2, getTerrainTroopEffect(TroopType.Archer, TerrainType.Forest).stealthBonus);
        assert.equals(-1, getTerrainTroopEffect(TroopType.Archer, TerrainType.River).attackRangeDelta);
    });

    suite.test('兵種 × 地形強弱勢：沒有規則的組合回傳全 0（不憑空加數值）', () => {
        assert.equals(JSON.stringify(NO_TERRAIN_TROOP_EFFECT), JSON.stringify(getTerrainTroopEffect(TroopType.Infantry, TerrainType.Plain)));
        assert.equals(JSON.stringify(NO_TERRAIN_TROOP_EFFECT), JSON.stringify(getTerrainTroopEffect(TroopType.Shield, TerrainType.Mountain)));
    });

    return suite;
}
