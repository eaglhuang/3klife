/**
 * GeneralLoyalty — 忠誠度讀模型、警示區間、沒收虎符扣 30（HUM-01；PROG-2-1931）
 */
import { assert, TestSuite } from './TestRunner';
import { confiscateTallyLoyalty, loyaltyBandOf, normalizeLoyalty } from '../assets/scripts/core/systems/GeneralLoyalty';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createGeneralLoyaltySuite(): TestSuite {
    const suite = new TestSuite('GeneralLoyalty (忠誠度 HUM-01 PROG-2-1931)');

    suite.test('缺欄位補預設：轉蛋鎖定 100；招降夾在 0~100', () => {
        assert.equals(JSON.stringify({ value: 100, isLocked: true, sourceType: 'Gacha' }), JSON.stringify(normalizeLoyalty(undefined)));
        assert.equals(100, normalizeLoyalty({ value: 20, isLocked: false, sourceType: 'Gacha' }).value);
        assert.equals(0, normalizeLoyalty({ value: -9, isLocked: true, sourceType: 'Capture' }).value);
        assert.isFalse(normalizeLoyalty(undefined, 'Mercenary').isLocked);
    });

    suite.test('區間與沒收虎符：鎖定不扣，未鎖定扣 30 不低於 0', () => {
        assert.equals('locked', loyaltyBandOf(normalizeLoyalty(undefined)));
        assert.equals('normal', loyaltyBandOf({ value: 60, isLocked: false, sourceType: 'Capture' }));
        assert.equals('warning', loyaltyBandOf({ value: 59, isLocked: false, sourceType: 'Capture' }));
        assert.equals('danger', loyaltyBandOf({ value: 29, isLocked: false, sourceType: 'Capture' }));
        const locked = confiscateTallyLoyalty(normalizeLoyalty(undefined));
        assert.equals(0, locked.lost);
        const r = confiscateTallyLoyalty({ value: 70, isLocked: false, sourceType: 'Capture' });
        assert.equals(40, r.loyalty.value);
        assert.equals(30, r.lost);
        assert.equals(10, confiscateTallyLoyalty({ value: 10, isLocked: false, sourceType: 'Capture' }).lost);
    });

    suite.test('GeneralConfig 四個新欄位皆為選填（舊資料相容）', () => {
        const legacy = { id: 'x' } as unknown as GeneralConfig;
        assert.equals(undefined, legacy.personality);
        const g = { id: 'y', personality: { type: 'Brave', description: '豪氣干雲' }, recentLog: { timestamp: 't', narrative: 'n' }, currentSuitability: { taskId: 'M_001', taskName: '夜襲曹營', reason: 'r' } } as unknown as GeneralConfig;
        assert.equals('Brave', g.personality?.type);
    });

    return suite;
}
