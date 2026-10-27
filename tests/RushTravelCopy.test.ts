/**
 * RushTravelCopy.test.ts — 紅顏趕路與商業化提示文案（COPY-04，PROG-2-1269）headless 測試
 *
 * 鎖住：四段文案與規格逐字一致；四段皆非空；未知 key 退回趕路文案，不丟錯。
 */
import { assert, TestSuite } from './TestRunner';
import { RUSH_TRAVEL_COPY, rushTravelCopy } from '../assets/scripts/core/models/RushTravelCopy';

export function createRushTravelCopySuite(): TestSuite {
    const suite = new TestSuite('RushTravelCopy (趕路與商業化文案 COPY-04 PROG-2-1269)');

    suite.test('趕路文案與規格 §5 逐字一致', () => {
        assert.equals(
            '主公，妾身正在路上。\n\n若您願意等待，妾身終將抵達；若您不願等待，也可以讓相逢更早到來。\n\n只要一點盤纏，便能縮短這段旅途。',
            RUSH_TRAVEL_COPY.rushTravel,
        );
    });

    suite.test('0.99、29.99、倒數文案與規格 §6 逐字一致', () => {
        assert.equals('只差一步，便能讓你的陣容更完整。', RUSH_TRAVEL_COPY.promo099);
        assert.equals('若要一次補齊文武核心，這是最直接的選擇。', RUSH_TRAVEL_COPY.promo2999);
        assert.equals('她正在趕來。請給她一點時間；若不想等待，也可以立即相見。', RUSH_TRAVEL_COPY.countdown);
    });

    suite.test('四段文案皆非空', () => {
        for (const key of Object.keys(RUSH_TRAVEL_COPY) as (keyof typeof RUSH_TRAVEL_COPY)[]) {
            assert.isTrue(RUSH_TRAVEL_COPY[key].length > 0);
        }
    });

    suite.test('未知 key 退回趕路文案，不丟錯', () => {
        assert.equals(RUSH_TRAVEL_COPY.rushTravel, rushTravelCopy('nope'));
        assert.equals(RUSH_TRAVEL_COPY.countdown, rushTravelCopy('countdown'));
    });

    return suite;
}
