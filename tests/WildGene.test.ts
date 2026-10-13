import { assert, TestSuite } from './TestRunner';
import { applyStarJump, rollWildGene, STAR_JUMP_CHANCE, WILD_GENE_FIRST_GEN_BONUS, STAR_JUMP_STEP, STAR_JUMP_MAX_LEVEL } from '../assets/scripts/core/systems/WildGene';

export function createWildGeneSuite(): TestSuite {
    const suite = new TestSuite('WildGene (BLT-07)');
    suite.test('同一亂數：初代較容易變異；各只抽一次', () => {
        let draws = 0;
        const random = () => { draws++; return STAR_JUMP_CHANCE + WILD_GENE_FIRST_GEN_BONUS / 2; };
        assert.isTrue(rollWildGene(1, random));
        assert.isFalse(rollWildGene(2, random));
        assert.isFalse(rollWildGene(3, random));
        assert.equals(3, draws);
    });
    suite.test('機率邊界：零命中、等於門檻不命中', () => {
        assert.isTrue(rollWildGene(2, () => 0));
        assert.isFalse(rollWildGene(2, () => STAR_JUMP_CHANCE));
        assert.isFalse(rollWildGene(1, () => STAR_JUMP_CHANCE + WILD_GENE_FIRST_GEN_BONUS));
    });
    suite.test('只升星，保留種類、顏色與其他欄位，不改輸入', () => {
        const source = Object.freeze({ id: 'gene-blue', color: 'blue', level: 3, generation: 1, sourceUids: ['ancestor'] });
        const result = applyStarJump(source, () => 0);
        assert.equals(3 + STAR_JUMP_STEP, result.level);
        assert.equals(source.id, result.id);
        assert.equals(source.color, result.color);
        assert.equals(source.generation, result.generation);
        assert.isTrue(result.sourceUids === source.sourceUids);
        assert.equals(3, source.level);
        assert.isTrue(result !== source);
    });
    suite.test('未命中回傳相同星級的副本', () => {
        const source = { id: 'gene-red', color: 'red', level: 2 };
        const result = applyStarJump(source, () => STAR_JUMP_CHANCE);
        assert.equals(2, result.level);
        assert.isTrue(source !== result);
    });
    suite.test('靠近上限夾住；已達或超上限不抽亂數', () => {
        const factor = { id: 'gene', color: 'pink', level: STAR_JUMP_MAX_LEVEL - 1 };
        assert.equals(STAR_JUMP_MAX_LEVEL, applyStarJump(factor, () => 0).level);
        for (const level of [STAR_JUMP_MAX_LEVEL, STAR_JUMP_MAX_LEVEL + 1]) {
            assert.equals(STAR_JUMP_MAX_LEVEL, applyStarJump({ ...factor, level }, () => { throw new Error('不可抽亂數'); }).level);
        }
    });
    suite.test('相同注入序列可重現', () => {
        const run = () => {
            const values = [0.15, 0.05];
            const random = () => values.shift()!;
            return JSON.stringify([rollWildGene(1, random), applyStarJump({ id: 'gene', color: 'green', level: 2 }, random)]);
        };
        assert.equals(run(), run());
    });
    suite.test('非法世代、星級與亂數明確拒絕', () => {
        const rejects = (action: () => unknown) => {
            let rejected = false;
            try { action(); } catch (error) { rejected = error instanceof RangeError; }
            assert.isTrue(rejected);
        };
        for (const value of [0, -1, 1.5, NaN, Infinity]) {
            rejects(() => rollWildGene(value, () => 0));
            rejects(() => applyStarJump({ id: 'gene', color: 'white', level: value }, () => 0));
        }
        for (const value of [-0.1, 1, NaN, Infinity]) {
            rejects(() => rollWildGene(1, () => value));
            rejects(() => applyStarJump({ id: 'gene', color: 'white', level: 1 }, () => value));
        }
    });
    return suite;
}
