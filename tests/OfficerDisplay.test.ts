/**
 * OfficerDisplay — 大廳官職區塊顯示資料（OFC-08 顯示段）的 headless 測試
 *
 * 鎖住：文案格式「官職經驗：{Current}/{Next}」、階位名稱、進度比例、最高階 MAX、備援名稱。
 */
import { assert, TestSuite } from './TestRunner';
import { officerDisplayOf } from '../assets/scripts/core/systems/OfficerDisplay';
import type { OfficerState } from '../assets/scripts/core/systems/OfficerState';

const stateOf = (currentTier: number, officerExp: number): OfficerState => ({
    currentTier,
    officerExp,
    unlockHistory: Array.from({ length: currentTier }, (_, i) => i + 1),
});

export function createOfficerDisplaySuite(): TestSuite {
    const suite = new TestSuite('OfficerDisplay (大廳官職顯示 OFC-08)');

    suite.test('初始階位：區塊標題「官職」、名稱「鄉里義士」、經驗 0/100', () => {
        const display = officerDisplayOf(stateOf(1, 0));
        assert.equals('官職', display.sectionTitle);
        assert.equals('鄉里義士', display.rankName);
        assert.equals('官職經驗：0/100', display.expLabel);
        assert.equals(0, display.progress);
    });

    suite.test('階位 3、經驗 312：顯示 312/520，進度依本階區間計算', () => {
        const display = officerDisplayOf(stateOf(3, 312));
        assert.equals('郡守', display.rankName);
        assert.equals('官職經驗：312/520', display.expLabel);
        assert.equals(true, Math.abs(display.progress - (312 - 260) / (520 - 260)) < 1e-9);
    });

    suite.test('最高階：經驗欄顯示 MAX，進度為 1', () => {
        const display = officerDisplayOf(stateOf(5, 950));
        assert.equals('霸府重臣', display.rankName);
        assert.equals('官職經驗：950/MAX', display.expLabel);
        assert.equals(1, display.progress);
    });

    suite.test('提供資料列時以資料列的名稱為準', () => {
        const rows = [{ tier: 2, code: 'OFFICER_TIER_2', title: '測試名', expToReach: 100, questCap: 'normal' as const, unlockedFeatures: [] }];
        assert.equals('測試名', officerDisplayOf(stateOf(2, 120), rows).rankName);
    });

    return suite;
}
