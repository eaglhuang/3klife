/**
 * GeneralPlateAvoidance — 部隊資訊框避開武將名牌（PROG-2-9434）
 *
 * 覆蓋：不重疊不動、重疊時取較短方向推開、推開後不再重疊、兩塊名牌、平滑逼近。
 *
 * Unity 對照：像測 UI 標籤 overlap resolver 的純函式。
 */
import { assert, TestSuite } from './TestRunner';
import { easePlateOffset, plateAvoidOffsetY, PLATE_AVOID_GAP, type LabelRect } from '../assets/scripts/battle/shared/GeneralPlateAvoidance';

const plate: LabelRect = { x: 0, y: 0, halfW: 90, halfH: 32 };

function stillOverlaps(badge: LabelRect, plates: readonly LabelRect[], dy: number): boolean {
    return plates.some((p) => Math.abs(badge.x - p.x) < badge.halfW + p.halfW && Math.abs(badge.y + dy - p.y) < badge.halfH + p.halfH);
}

export function createGeneralPlateAvoidanceSuite(): TestSuite {
    const suite = new TestSuite('GeneralPlateAvoidance (部隊框避開武將名牌 PROG-2-9434)');

    suite.test('不重疊：橫向離很遠或上下分開時位移 0', () => {
        assert.equals(0, plateAvoidOffsetY({ x: 300, y: 0, halfW: 63, halfH: 30 }, [plate]));
        assert.equals(0, plateAvoidOffsetY({ x: 0, y: 100, halfW: 63, halfH: 30 }, [plate]));
    });

    suite.test('部隊框在名牌偏下方：往下推到名牌底下並留間距', () => {
        const badge = { x: 80, y: -30, halfW: 63, halfH: 30 };
        const dy = plateAvoidOffsetY(badge, [plate]);
        assert.isTrue(dy < 0);
        assert.equals(-32 - PLATE_AVOID_GAP, badge.y + dy + badge.halfH);
    });

    suite.test('部隊框在名牌偏上方：往上推', () => {
        const badge = { x: -60, y: 40, halfW: 63, halfH: 30 };
        const dy = plateAvoidOffsetY(badge, [plate]);
        assert.isTrue(dy > 0);
        assert.isFalse(stillOverlaps(badge, [plate], dy));
    });

    suite.test('兩塊名牌：推開後兩塊都不重疊', () => {
        const plates: LabelRect[] = [plate, { x: 60, y: -70, halfW: 90, halfH: 32 }];
        const badge = { x: 40, y: -20, halfW: 63, halfH: 30 };
        const dy = plateAvoidOffsetY(badge, plates);
        assert.isFalse(stillOverlaps(badge, plates, dy));
    });

    suite.test('平滑逼近：一幀只走一部分，接近時直接到位，dt 無效直接到位', () => {
        const half = easePlateOffset(0, -40, 1 / 24);
        assert.isTrue(half < 0 && half > -40);
        assert.equals(-40, easePlateOffset(-39.8, -40, 1 / 60));
        assert.equals(-40, easePlateOffset(0, -40, 0));
    });

    return suite;
}
