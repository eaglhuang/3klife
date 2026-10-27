/**
 * MainTargetPanelView.test.ts — 血統樹底部主角區資料整理 headless 測試（BUI-05 / PROG-2-0949）
 *
 * 鎖住：立繪與稀有度原樣帶出；因子依遮罩結果分成「已覺醒」與「未解鎖」兩組；
 * 剛解鎖的槽位標記 playAnimation；輸入不被修改。
 *
 * Unity 對照：像 Presenter 把子代 SO 的欄位整理好再交給 Prefab 綁定，Presenter 本身不改原資料。
 */
import { assert, TestSuite } from './TestRunner';
import { buildMainTargetPanelView } from '../assets/scripts/core/systems/MainTargetPanelView';
import { buildFactorMaskViews } from '../assets/scripts/core/systems/FactorMaskState';
import type { GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';

const GENES: GeneralGeneConfig[] = [
    { id: 'green', type: 'green', discoveryLevel: 8 },
    { id: 'purple', type: 'purple', displayName: '天命', discoveryLevel: 45, isLocked: true },
];

export function createMainTargetPanelViewSuite(): TestSuite {
    const suite = new TestSuite('MainTargetPanelView (血統樹主角區資料 BUI-05 / PROG-2-0949)');

    suite.test('立繪與稀有度原樣帶出；缺立繪路徑時為 null', () => {
        const withPortrait = buildMainTargetPanelView({ portraitPath: 'portraits/zhaoyun', rarityTier: 'SSR' }, [], 1);
        assert.equals('portraits/zhaoyun', withPortrait.portraitPath);
        assert.equals('SSR', withPortrait.rarityTier);

        const withoutPortrait = buildMainTargetPanelView({ rarityTier: 'R' }, [], 1);
        assert.equals(null, withoutPortrait.portraitPath);
    });

    suite.test('因子依遮罩分成已覺醒與未解鎖兩組', () => {
        // 玩家等級 9：綠色（需 Lv8）已看見，紫色（需 Lv45）仍鎖住
        const view = buildMainTargetPanelView({ rarityTier: 'SSR' }, GENES, 9);
        assert.equals(1, view.awakenTraits.length);
        assert.equals('green', view.awakenTraits[0]);
        assert.equals(1, view.lockedTraits.length);
        assert.equals('??? (Lv46 解鎖)', view.lockedTraits[0]);
        assert.equals(2, view.factorViews.length);
    });

    suite.test('剛解鎖的因子帶 playAnimation；只在有前一次 view 時成立', () => {
        // 紫色在 Lv45 仍鎖住，Lv46 才看見
        const previous = buildFactorMaskViews(GENES, 45);
        const current = buildMainTargetPanelView({ rarityTier: 'SSR' }, GENES, 46, previous);
        assert.isFalse(current.factorViews[0].playAnimation);
        assert.isTrue(current.factorViews[1].playAnimation);
        assert.equals('天命', current.awakenTraits[1]);

        const firstLoad = buildMainTargetPanelView({ rarityTier: 'SSR' }, GENES, 46);
        assert.isFalse(firstLoad.factorViews[1].playAnimation);
    });

    suite.test('不修改輸入的因子與子代資料', () => {
        const genes = Object.freeze(GENES.map((gene) => Object.freeze({ ...gene })));
        const child = Object.freeze({ portraitPath: 'portraits/x', rarityTier: 'SR' });
        buildMainTargetPanelView(child, genes, 45);
        assert.equals('purple', genes[1].id as string);
        assert.isTrue(genes[1].isLocked === true);
        assert.equals('SR', child.rarityTier);
    });

    return suite;
}
