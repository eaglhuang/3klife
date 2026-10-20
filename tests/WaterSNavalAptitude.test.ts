/**
 * 水域 S 級觸發合攻（PROG-2-0787）headless 測試
 *
 * 規格：水域 S「可執行合攻」。協調者裁示：由 S 級觸發，與 naval-combined-attack 因子效果取聯集。
 * 合攻仍需站在水域（河流）格，地形閘門不變。
 */
import { TestSuite, assert } from './TestRunner';
import { canNavalCombinedAttack, hasNavalAptitude } from '../assets/scripts/core/systems/FactorTacticLinkage';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

export function createWaterSNavalAptitudeSuite(): TestSuite {
    const suite = new TestSuite('WaterSNavalAptitude (水域 S 級觸發合攻 PROG-2-0787)');

    suite.test('水域 S 級本身即有水戰適性（不需因子效果）', () => {
        assert.isTrue(hasNavalAptitude('S', false));
    });

    suite.test('非 S 級且沒有因子效果：沒有水戰適性', () => {
        assert.isFalse(hasNavalAptitude('A', false));
        assert.isFalse(hasNavalAptitude('B', false));
        assert.isFalse(hasNavalAptitude('D', false));
    });

    suite.test('有 naval-combined-attack 因子效果：即使不是 S 級也有（取聯集）', () => {
        assert.isTrue(hasNavalAptitude('B', true));
    });

    suite.test('合攻閘門：水域 S 在河流格可合攻，在平原格不可', () => {
        assert.isTrue(canNavalCombinedAttack(TerrainType.River, hasNavalAptitude('S', false)));
        assert.isFalse(canNavalCombinedAttack(TerrainType.Plain, hasNavalAptitude('S', false)));
    });

    return suite;
}
