import { assert, TestSuite } from './TestRunner';
import {
    clampOccupantCount,
    clampSpotCount,
    HallCandidate,
    hallWeight,
    isHallRefreshDue,
    rollHallCharacters,
} from '../assets/scripts/core/systems/HallCharacterRoll';

const POOL: HallCandidate[] = [
    { id: 'a', favorite: false, assigned: false },
    { id: 'b', favorite: true, assigned: false },
    { id: 'c', favorite: false, assigned: true },
    { id: 'd', favorite: true, assigned: true },
];

export function createHallCharacterRollSuite(): TestSuite {
    const suite = new TestSuite('HallCharacterRoll (HALL-07 點位加權抽樣)');

    suite.test('權重：收藏 ×2.0、已派任務 ×1.2，兩者相乘', () => {
        assert.equals(1, hallWeight(POOL[0]));
        assert.equals(2, hallWeight(POOL[1]));
        assert.equals(1.2, hallWeight(POOL[2]));
        assert.equals(2.4, hallWeight(POOL[3]));
    });

    suite.test('抽樣不重複，數量正確', () => {
        const picked = rollHallCharacters(POOL, 3, () => 0.3);
        assert.equals(3, picked.length);
        assert.equals(3, new Set(picked).size);
    });

    suite.test('亂數決定結果：0.5 時收藏 b 在權重區間內被抽中', () => {
        // 權重 1 + 2 = 3，roll = 0.5 × 3 = 1.5，落在 b 的區間 (1, 3]
        const picked = rollHallCharacters([POOL[0], POOL[1]], 1, () => 0.5);
        assert.equals('b', picked[0]);
    });

    suite.test('數量超過池大小時只回傳全部', () => {
        const picked = rollHallCharacters(POOL, 99, () => 0.1);
        assert.equals(4, picked.length);
    });

    suite.test('空池回傳空陣列', () => {
        assert.equals(0, rollHallCharacters([], 5, () => 0.1).length);
    });

    suite.test('點位夾在 6~8，人數夾在 3~5', () => {
        assert.equals(6, clampSpotCount(2));
        assert.equals(8, clampSpotCount(20));
        assert.equals(7, clampSpotCount(7.9));
        assert.equals(3, clampOccupantCount(0));
        assert.equals(5, clampOccupantCount(9));
        assert.equals(3, clampOccupantCount(NaN));
    });

    suite.test('每 60 秒刷新一次（含 60 秒）', () => {
        assert.isFalse(isHallRefreshDue(100, 159));
        assert.isTrue(isHallRefreshDue(100, 160));
    });

    suite.test('輸入池不被修改', () => {
        const before = JSON.stringify(POOL);
        rollHallCharacters(POOL, 4, () => 0.7);
        assert.equals(before, JSON.stringify(POOL));
    });

    return suite;
}
