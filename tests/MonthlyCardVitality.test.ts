/**
 * MonthlyCardVitality — 月卡有效期間每季精力回復 ×1.2（VIT-08；PROG-2-1919）
 */
import { assert, TestSuite } from './TestRunner';
import { recoverVitalityOneSeason } from '../assets/scripts/core/systems/BattleRoster';
import { MONTHLY_CARD_VITALITY_RECOVERY_MULTIPLIER, monthlyCardVitalityMultiplier, activateMonthlyCard } from '../assets/scripts/core/systems/MonthlyCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const T0 = Date.parse('2026-11-07T04:00:00Z');
const DAY = 86_400_000;
const g = (): GeneralConfig => ({ id: 'a', name: 'a', vitality: 10, maxVitality: 100 } as unknown as GeneralConfig);

export function createMonthlyCardVitalitySuite(): TestSuite {
    const suite = new TestSuite('MonthlyCardVitality (月卡精力 +20% VIT-08 PROG-2-1919)');

    suite.test('倍率：月卡有效 1.2，沒卡或過期 1', () => {
        assert.equals(1.2, MONTHLY_CARD_VITALITY_RECOVERY_MULTIPLIER);
        const card = activateMonthlyCard(null, T0);
        assert.equals(1.2, monthlyCardVitalityMultiplier(card, T0));
        assert.equals(1, monthlyCardVitalityMultiplier(null, T0));
        assert.equals(1, monthlyCardVitalityMultiplier(card, T0 + 40 * DAY));
    });

    suite.test('季回復乘上倍率且不超過上限；預設倍率不變', () => {
        assert.equals(40, recoverVitalityOneSeason([g()], 1)[0].vitality);
        assert.equals(46, recoverVitalityOneSeason([g()], 1, 1.2)[0].vitality);
        const near = { ...g(), vitality: 90 } as GeneralConfig;
        assert.equals(100, recoverVitalityOneSeason([near], 1, 1.2)[0].vitality);
    });

    return suite;
}
