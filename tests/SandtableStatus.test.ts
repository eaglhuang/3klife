/**
 * SandtableStatus.test.ts — 天下沙盤入口的狀態字串（PROG-2-0964）
 *
 * 鎖住：未解鎖只顯示尚未開放；解鎖後顯示階段與「已放 / 上限」；標記數異常時不顯示負數。
 *
 * Unity 對照：Presenter 的 EditMode 測試，只驗 Label 字串。
 */
import { assert, TestSuite } from './TestRunner';
import { buildSandtableStatusLabel } from '../assets/scripts/core/systems/SandtableStatus';

export function createSandtableStatusSuite(): TestSuite {
    const suite = new TestSuite('SandtableStatus (沙盤狀態列 PROG-2-0964)');

    suite.test('未解鎖沙盤（stage 為 null）只顯示尚未開放', () => {
        assert.equals('天下沙盤（尚未開放）', buildSandtableStatusLabel(null, 0));
    });

    suite.test('S1 顯示階段與已放 / 上限（上限 3）', () => {
        assert.equals('天下沙盤・S1｜標記 2/3', buildSandtableStatusLabel('S1', 2));
        assert.equals('天下沙盤・S3｜標記 0/8', buildSandtableStatusLabel('S3', 0));
    });

    suite.test('標記數為負、非有限或小數時視為 0 或取整數', () => {
        assert.equals('天下沙盤・S2｜標記 0/5', buildSandtableStatusLabel('S2', -1));
        assert.equals('天下沙盤・S2｜標記 0/5', buildSandtableStatusLabel('S2', Number.NaN));
        assert.equals('天下沙盤・S2｜標記 1/5', buildSandtableStatusLabel('S2', 1.9));
    });

    return suite;
}
