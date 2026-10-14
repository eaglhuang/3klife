/**
 * FemaleSourcePresenter — 女武將來源標籤的 headless 測試（PROG-2-0247）
 */
import { assert, TestSuite } from './TestRunner';
import { createFemaleSource } from '../assets/scripts/core/systems/FemaleSource';
import { femaleSourcePresentationOf } from '../assets/scripts/core/systems/FemaleSourcePresenter';

export function createFemaleSourcePresenterSuite(): TestSuite {
    const suite = new TestSuite('FemaleSourcePresenter (女武將來源標籤 PROG-2-0247)');

    suite.test('來源品質標籤依規格格式輸出，且不含規格引號', () => {
        const view = femaleSourcePresentationOf(createFemaleSource('GACHA', 'SSR', 3));
        assert.equals('天命召喚', view?.sourceLabel ?? '');
        assert.equals('來源品質：天命召喚 (SSR)', view?.qualityTag ?? '');
    });

    suite.test('沒有來源紀錄回傳 null（UI 不顯示該行）', () => {
        assert.equals(null, femaleSourcePresentationOf(null));
        assert.equals(null, femaleSourcePresentationOf(undefined));
    });

    suite.test('送禮好感只對戰俘與傭兵顯示', () => {
        assert.isTrue(femaleSourcePresentationOf(createFemaleSource('CAPTIVE', 'SR', 1))?.showGiftAffinity ?? false);
        assert.isTrue(femaleSourcePresentationOf(createFemaleSource('MERCENARY', 'SR', 1))?.showGiftAffinity ?? false);
        assert.isFalse(femaleSourcePresentationOf(createFemaleSource('GACHA', 'SSR', 1))?.showGiftAffinity ?? true);
    });

    return suite;
}
