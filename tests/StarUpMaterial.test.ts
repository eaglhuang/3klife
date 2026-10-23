/**
 * StarUpMaterial.test.ts — 升星素材路由（GDUI-08，PROG-2-0747）headless 測試
 *
 * 鎖住：史實名將吃同模板卡（優先於子孫判斷）；子孫且有規則吃譜牒印記；
 * 子孫沒有規則、子嗣與一般隨機武將不顯示升星。
 */
import { assert, TestSuite } from './TestRunner';
import { starUpMaterialOf } from '../assets/scripts/core/systems/StarUpMaterial';

export function createStarUpMaterialSuite(): TestSuite {
    const suite = new TestSuite('StarUpMaterial (升星素材路由 GDUI-08 PROG-2-0747)');

    suite.test('史實名將吃同模板轉蛋卡', () => {
        assert.equals('TEMPLATE_CARD', starUpMaterialOf({ isHistorical: true, isDescendant: false, lineageSealRule: false }));
    });

    suite.test('史實名將優先於子孫判斷，即使同時是子孫且有規則', () => {
        assert.equals('TEMPLATE_CARD', starUpMaterialOf({ isHistorical: true, isDescendant: true, lineageSealRule: true }));
    });

    suite.test('子孫且有 Lineage_Seal 規則吃譜牒印記', () => {
        assert.equals('LINEAGE_SEAL', starUpMaterialOf({ isHistorical: false, isDescendant: true, lineageSealRule: true }));
    });

    suite.test('子孫沒有 Lineage_Seal 規則不顯示升星', () => {
        assert.equals(null, starUpMaterialOf({ isHistorical: false, isDescendant: true, lineageSealRule: false }));
    });

    suite.test('子嗣與一般隨機武將不顯示升星', () => {
        assert.equals(null, starUpMaterialOf({ isHistorical: false, isDescendant: false, lineageSealRule: false }));
        assert.equals(null, starUpMaterialOf({ isHistorical: false, isDescendant: false, lineageSealRule: true }));
    });

    return suite;
}
