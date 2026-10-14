/**
 * TroopCounterMatrix.test.ts — 兵種剋制 8×8 全矩陣對照規格（PROG-2-0600）
 *
 * 規格：兵種（虎符）系統.md §兵種剋制關係：五角 ×1.3、反向 ×0.8、機械被近戰 ×1.5，其餘 ×1。
 * 逐格比對，加上傷害公式的隨機屬性測試，確保改剋制表不會讓別的格子悄悄變動。
 *
 * Unity 對照：像把策劃表整張匯出成 CSV，再用 EditMode Test 逐格比對程式裡的查表結果。
 */
import { TestSuite, assert } from './TestRunner';
import { FormulaSystem } from '../assets/scripts/core/systems/FormulaSystem';
import { TerrainType, TroopType, MIN_DAMAGE } from '../assets/scripts/core/config/Constants';

const T = TroopType;
const ALL: TroopType[] = [T.Cavalry, T.Infantry, T.Shield, T.Archer, T.Pikeman, T.Engineer, T.Medic, T.Navy];
/** 規格逐字：key 剋 value */
const SPEC_BEATS: Array<[TroopType, TroopType]> = [
    [T.Cavalry, T.Shield], [T.Shield, T.Archer], [T.Archer, T.Infantry], [T.Infantry, T.Pikeman], [T.Pikeman, T.Cavalry],
];
const MELEE = [T.Cavalry, T.Infantry, T.Pikeman, T.Shield];

function specMultiplier(attacker: TroopType, defender: TroopType): number {
    if (defender === T.Engineer && MELEE.includes(attacker)) return 1.5;
    if (SPEC_BEATS.some(([a, d]) => a === attacker && d === defender)) return 1.3;
    if (SPEC_BEATS.some(([a, d]) => a === defender && d === attacker)) return 0.8;
    return 1;
}

function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export function createTroopCounterMatrixSuite(): TestSuite {
    const suite = new TestSuite('TroopCounterMatrix (兵種剋制 8x8 對照規格)');
    const formula = new FormulaSystem();

    suite.test('64 格倍率逐格等於規格表', () => {
        for (const a of ALL) for (const d of ALL) {
            assert.equals(specMultiplier(a, d), formula.getCounterMultiplier(a, d), `${a} → ${d}`);
        }
    });

    suite.test('五角恰好 5 條正向、5 條反向，正反向互為鏡像', () => {
        let up = 0; let down = 0;
        for (const a of ALL) for (const d of ALL) {
            const m = formula.getCounterMultiplier(a, d);
            if (m === 1.3) { up++; assert.equals(0.8, formula.getCounterMultiplier(d, a), `${a}/${d} 反向應 0.8`); }
            if (m === 0.8) down++;
        }
        assert.equals(5, up);
        assert.equals(5, down);
    });

    suite.test('機械只被近戰加成；水軍／醫護／機械自己都不在五角內', () => {
        for (const a of ALL) {
            assert.equals(MELEE.includes(a) ? 1.5 : 1, formula.getCounterMultiplier(a, T.Engineer), `${a} 打機械`);
        }
        for (const x of [T.Engineer, T.Medic, T.Navy]) {
            for (const d of ALL) if (d !== T.Engineer) assert.equals(1, formula.getCounterMultiplier(x, d), `${x} 打 ${d}`);
        }
    });

    suite.test('隨機屬性：任意兵種×地形×攻防，傷害為有限整數且不低於 MIN_DAMAGE', () => {
        const rng = lcg(2026);
        const terrains = Object.values(TerrainType);
        for (let i = 0; i < 5000; i++) {
            const damage = formula.calculateDamage({
                attackerAttack: Math.floor(rng() * 500),
                defenderDefense: Math.floor(rng() * 500),
                attackerType: ALL[Math.floor(rng() * ALL.length)],
                defenderType: ALL[Math.floor(rng() * ALL.length)],
                attackerTerrain: terrains[Math.floor(rng() * terrains.length)],
                defenderTerrain: terrains[Math.floor(rng() * terrains.length)],
            });
            assert.isTrue(Number.isInteger(damage) && damage >= MIN_DAMAGE, `傷害 ${damage}`);
        }
    });

    suite.test('同樣攻防下，剋制傷害 ≥ 中立 ≥ 被剋傷害（單調性）', () => {
        for (const a of ALL) for (const d of ALL) {
            const m = formula.getCounterMultiplier(a, d);
            const dmg = formula.calculateDamage({ attackerAttack: 200, defenderDefense: 20, attackerType: a, defenderType: d, attackerTerrain: TerrainType.Plain, defenderTerrain: TerrainType.Plain });
            const neutral = formula.calculateDamage({ attackerAttack: 200, defenderDefense: 20, attackerType: T.Medic, defenderType: T.Navy, attackerTerrain: TerrainType.Plain, defenderTerrain: TerrainType.Plain });
            if (m > 1) assert.isTrue(dmg > neutral, `${a}→${d}`);
            if (m < 1) assert.isTrue(dmg < neutral, `${a}→${d}`);
            if (m === 1) assert.equals(neutral, dmg, `${a}→${d}`);
        }
    });

    return suite;
}
