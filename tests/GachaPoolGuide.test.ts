// @spec-source → 轉蛋系統.md §雙池定位導覽、§死亡傳承提示（PROG-2-0563）
/**
 * GachaPoolGuide — 雙池定位與死亡傳承提示文案 headless 測試（PROG-2-0563）
 */
import { assert, TestSuite } from './TestRunner';
import {
    DEATH_LEGACY_HINT,
    GENERAL_POOL_GUIDE,
    SUPPORT_POOL_GUIDE,
} from '../assets/scripts/core/systems/GachaPoolGuide';

export function createGachaPoolGuideSuite(): TestSuite {
    const suite = new TestSuite('GachaPoolGuide (雙池定位與死亡傳承提示 GCH-10)');

    suite.test('名將池明示血統種子，支援卡池明示培育深度', () => {
        assert.isTrue(GENERAL_POOL_GUIDE.includes('血統種子'));
        assert.isTrue(SUPPORT_POOL_GUIDE.includes('培育深度'));
    });

    suite.test('支援卡池文案明示不可上陣，避免新手誤認', () => {
        assert.isTrue(SUPPORT_POOL_GUIDE.includes('不可上陣'));
    });

    suite.test('死亡傳承提示提到英靈卡與虎符卡，且說明不在抽卡結果掉落', () => {
        assert.isTrue(DEATH_LEGACY_HINT.includes('英靈卡'));
        assert.isTrue(DEATH_LEGACY_HINT.includes('虎符卡'));
        assert.isTrue(DEATH_LEGACY_HINT.includes('不會在抽卡結果中掉落'));
    });

    return suite;
}
