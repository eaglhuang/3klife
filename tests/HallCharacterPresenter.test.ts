import { assert, TestSuite } from './TestRunner';
import { HallCandidate } from '../assets/scripts/core/systems/HallCharacterRoll';
import {
    buildHallSpotRows,
    EMPTY_HALL_SPOT_STATE,
    hallSpotSlotCount,
    refreshHallCharacterSpots,
} from '../assets/scripts/core/systems/HallCharacterPresenter';

const POOL: HallCandidate[] = [
    { id: 'a', favorite: false, assigned: false },
    { id: 'b', favorite: true, assigned: false },
    { id: 'c', favorite: false, assigned: true },
    { id: 'd', favorite: false, assigned: false },
];

export function createHallCharacterPresenterSuite(): TestSuite {
    const suite = new TestSuite('HallCharacterPresenter (HALL-07 點位接線)');

    suite.test('從未刷新時立即抽出點位並記錄刷新時間', () => {
        const next = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 1000, POOL, 3, () => 0.1);
        assert.equals(1000, next.lastRefreshSec!);
        assert.equals(3, next.spotIds.length);
    });

    suite.test('未滿 60 秒不重抽，回傳同一個狀態物件', () => {
        const first = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 1000, POOL, 3, () => 0.1);
        const second = refreshHallCharacterSpots(first, 1059, POOL, 3, () => 0.9);
        assert.equals(first, second);
    });

    suite.test('滿 60 秒才重抽並更新刷新時間', () => {
        const first = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 1000, POOL, 3, () => 0.1);
        const second = refreshHallCharacterSpots(first, 1060, POOL, 3, () => 0.9);
        assert.equals(1060, second.lastRefreshSec!);
        assert.isTrue(second !== first);
    });

    suite.test('人數超出 3~5 時夾回範圍', () => {
        const next = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 0, POOL, 99, () => 0.1);
        assert.equals(4, next.spotIds.length);
        const small = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 0, POOL, 0, () => 0.1);
        assert.equals(3, small.spotIds.length);
    });

    suite.test('候選為空時點位為空，但仍記錄刷新時間', () => {
        const next = refreshHallCharacterSpots(EMPTY_HALL_SPOT_STATE, 500, [], 3, () => 0.1);
        assert.equals(0, next.spotIds.length);
        assert.equals(500, next.lastRefreshSec!);
    });

    suite.test('列資料帶出收藏與已派任務旗標，略過找不到的 id', () => {
        const rows = buildHallSpotRows(['b', 'zz', 'c'], POOL);
        assert.equals(2, rows.length);
        assert.equals('b', rows[0].id);
        assert.isTrue(rows[0].favorite);
        assert.isFalse(rows[0].assigned);
        assert.isTrue(rows[1].assigned);
    });

    suite.test('點位數夾回 6~8', () => {
        assert.equals(6, hallSpotSlotCount(2));
        assert.equals(8, hallSpotSlotCount(20));
    });

    return suite;
}
