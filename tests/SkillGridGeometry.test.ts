import { TestSuite, assert } from './TestRunner';
import { crossCells, isStraightLine, squareCells } from '../assets/scripts/battle/skills/SkillGridGeometry';

const LANES = 5;
const DEPTHS = 8;

export function createSkillGridGeometrySuite(): TestSuite {
    const suite = new TestSuite('SkillGridGeometry (戰法格子幾何 PROG-2-0754)');

    suite.test('同 lane 或同 depth 為直線，斜線不是', () => {
        assert.isTrue(isStraightLine({ lane: 1, depth: 2 }, { lane: 1, depth: 6 }));
        assert.isTrue(isStraightLine({ lane: 1, depth: 2 }, { lane: 4, depth: 2 }));
        assert.isFalse(isStraightLine({ lane: 1, depth: 2 }, { lane: 2, depth: 3 }));
    });

    suite.test('十字：內部格 5 格，角落只剩 3 格', () => {
        assert.equals(5, crossCells(2, 4, LANES, DEPTHS).length);
        assert.equals(3, crossCells(0, 0, LANES, DEPTHS).length);
    });

    suite.test('3x3：內部格 9 格，角落 4 格', () => {
        assert.equals(9, squareCells(2, 4, 1, LANES, DEPTHS).length);
        assert.equals(4, squareCells(0, 0, 1, LANES, DEPTHS).length);
    });

    suite.test('所有結果都在棋盤範圍內', () => {
        const all = [...crossCells(0, 7, LANES, DEPTHS), ...squareCells(4, 0, 1, LANES, DEPTHS)];
        for (const c of all) {
            assert.isTrue(c.lane >= 0 && c.lane < LANES && c.depth >= 0 && c.depth < DEPTHS);
        }
    });

    return suite;
}
