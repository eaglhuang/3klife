/**
 * SandtableMarkers.test.ts — 世界沙盤標記數量上限 headless 測試（PROG-2-0954）
 *
 * Unity 對照：EditMode Test，驗證各階段 Slot 數量與超量時不再生成。
 */
import { TestSuite, assert } from './TestRunner';
import {
    SANDTABLE_MARKER_LIMIT,
    canPlaceSandtableMarker,
    remainingSandtableMarkers,
    sandtableMarkerLimitOf,
} from '../assets/scripts/core/systems/SandtableMarkers';

export function createSandtableMarkersSuite(): TestSuite {
    const suite = new TestSuite('SandtableMarkers');

    suite.test('各階段上限為暫定值 S1=3、S2=5、S3=8', () => {
        assert.equals(3, SANDTABLE_MARKER_LIMIT.S1);
        assert.equals(5, SANDTABLE_MARKER_LIMIT.S2);
        assert.equals(8, SANDTABLE_MARKER_LIMIT.S3);
    });

    suite.test('未解鎖沙盤（null）上限為 0，無法放標記', () => {
        assert.equals(0, sandtableMarkerLimitOf(null));
        assert.isTrue(!canPlaceSandtableMarker(0, null));
    });

    suite.test('剩餘數量隨已放數量遞減，到上限為 0 後不能再放', () => {
        assert.equals(3, remainingSandtableMarkers(0, 'S1'));
        assert.equals(1, remainingSandtableMarkers(2, 'S1'));
        assert.equals(0, remainingSandtableMarkers(3, 'S1'));
        assert.isTrue(canPlaceSandtableMarker(2, 'S1'));
        assert.isTrue(!canPlaceSandtableMarker(3, 'S1'));
    });

    suite.test('超過上限時剩餘為 0，不會變負數', () => {
        assert.equals(0, remainingSandtableMarkers(10, 'S2'));
    });

    suite.test('已放數量為負或非有限數時視為 0', () => {
        assert.equals(5, remainingSandtableMarkers(-4, 'S2'));
        assert.equals(8, remainingSandtableMarkers(Number.NaN, 'S3'));
    });

    return suite;
}
