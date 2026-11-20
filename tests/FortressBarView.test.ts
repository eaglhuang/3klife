/**
 * FortressBarView — 戰場頂部城寨血條顯示數值（doc_ui_0001 §2.1）
 *
 * 覆蓋：開場血量為滿條、受損比例、夾限與無效輸入保護。
 *
 * Unity 對照：像測 Slider 的 fillAmount 計算，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { DEFENSE_FORTRESS_WARN_RATIO, FORTRESS_MAX_HP, defenseFortressBarText, fortressBarRatio } from '../assets/scripts/core/systems/FortressBarView';
import { readFileSync } from 'fs';
import { join } from 'path';

export function createFortressBarViewSuite(): TestSuite {
    const suite = new TestSuite('FortressBarView (戰場頂部城寨血條 doc_ui_0001 §2.1)');

    suite.test('開場血量為滿條；扣到 250 時剩一半', () => {
        assert.equals(1, fortressBarRatio(FORTRESS_MAX_HP));
        assert.equals(0.5, fortressBarRatio(250));
        assert.equals(0.5, fortressBarRatio(60, 120));
    });

    suite.test('超出範圍時夾在 0~1', () => {
        assert.equals(0, fortressBarRatio(-30));
        assert.equals(1, fortressBarRatio(FORTRESS_MAX_HP + 100));
    });

    suite.test('上限無效或血量為 NaN 時回傳 0', () => {
        assert.equals(0, fortressBarRatio(100, 0));
        assert.equals(0, fortressBarRatio(100, NaN));
        assert.equals(0, fortressBarRatio(NaN));
    });

    suite.test('守城血條文字：取整、夾在 0~上限；壞值不崩（PROG-2-9430）', () => {
        assert.equals('我方城寨 500／500', defenseFortressBarText(FORTRESS_MAX_HP));
        assert.equals('我方城寨 455／500', defenseFortressBarText(455));
        assert.equals('我方城寨 0／500', defenseFortressBarText(-15));
        assert.equals('我方城寨 500／500', defenseFortressBarText(620));
        assert.equals('我方城寨 0／500', defenseFortressBarText(NaN));
        assert.equals('我方城寨 13／120', defenseFortressBarText(12.6, 120));
        assert.isTrue(DEFENSE_FORTRESS_WARN_RATIO > 0 && DEFENSE_FORTRESS_WARN_RATIO < 1);
    });

    suite.test('守城血條接線：兩個開戰入口都依守方開啟（PROG-2-9430）', () => {
        const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
        for (const f of ['assets/scripts/battle/views/BattleScene.ts', 'assets/scripts/battle/views/BattleSceneFlow.ts']) {
            assert.isTrue(read(f).includes('setDefenseFortressBarVisible?.('), f);
        }
        assert.isTrue(read('assets/scripts/ui/components/BattleHUDComposite.ts').includes('public setDefenseFortressBarVisible('));
    });

    return suite;
}
