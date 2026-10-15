/**
 * FactorMask.test.ts — 因子視覺遮罩與發現等級（FUL-01 / FUL-02 / FBR-07，headless）
 *
 * Unity 對照：EditMode Test，只驗證遮罩元件回傳的文字與旗標，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { factorMaskView, factorRequiredLevel, visibleFactorColors } from '../assets/scripts/core/systems/FactorMask';
import type { GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createFactorMaskSuite(): TestSuite {
    const suite = new TestSuite('FactorMask');

    suite.test('三階段色系（> 門檻）：Lv1 只見藍粉，Lv21 開綠白，Lv46 開紫紅', () => {
        assert.equals('blue,pink', visibleFactorColors(1).join(','));
        assert.equals('blue,pink', visibleFactorColors(20).join(','));
        assert.equals('blue,pink,green,white', visibleFactorColors(21).join(','));
        assert.equals('blue,pink,green,white', visibleFactorColors(45).join(','));
        assert.equals('blue,pink,green,purple,white,red', visibleFactorColors(46).join(','));
    });

    suite.test('未達門檻顯示「??? (Lv N 解鎖)」，達門檻才顯示因子名稱', () => {
        const gene: GeneralGeneConfig = { type: 'purple', id: 'g_dragon', displayName: '紫龍', isLocked: true };
        const hidden = factorMaskView(gene, 30);
        assert.equals(45, hidden.requiredLevel);
        assert.equals('??? (Lv46 解鎖)', hidden.label);
        assert.isFalse(hidden.revealed);
        const shown = factorMaskView(gene, 46);
        assert.equals('紫龍', shown.label);
        assert.isTrue(shown.revealed);
    });

    suite.test('Discovery_Level 與 Is_Locked 分開：看得到但鎖住的因子不生效', () => {
        const gene: GeneralGeneConfig = { type: 'green', id: 'g_wind', displayName: '綠風', isLocked: true, discoveryLevel: 20 };
        const view = factorMaskView(gene, 25);
        assert.isTrue(view.revealed);
        assert.isFalse(view.active);
        const unlocked = factorMaskView({ ...gene, isLocked: false }, 25);
        assert.isTrue(unlocked.active);
    });

    suite.test('沒有 discoveryLevel 時依色系預設門檻；未知色系視為 Lv1', () => {
        assert.equals(20, factorRequiredLevel({ type: 'white', id: 'w' }));
        assert.equals(1, factorRequiredLevel({ type: 'unknown', id: 'u' }));
        assert.equals(7, factorRequiredLevel({ type: 'blue', id: 'b', discoveryLevel: 7 }));
    });

    return suite;
}
