/**
 * MentorBurstRateByStar.test.ts — 教官爆發率隨突破星等成長（教官系統 §F 爆發機率範圍，PROG-2-1163）
 *
 * Unity 對照：EditMode Test，驗星等表公式與退役／抽到的教官卡換算成培育教官時的爆發率。
 */
import { assert, TestSuite } from './TestRunner';
import { burstRateAtStar, MENTOR_BURST_RATE_CAP } from '../assets/scripts/core/systems/MentorBreakthrough';
import { MENTOR_CARD_DEFAULT_BURST_RATE, mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function card(stars: number | undefined, slotBurstRate?: number): MentorCard {
    return {
        uid: 'mentor-x', sourceGeneralId: 'x', name: '關羽', faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'],
        generalSnapshot: { id: 'x', name: '關羽', str: 90, int: 40, lea: 70, pol: 30, cha: 50 } as unknown as GeneralConfig,
        ...(stars !== undefined ? { stars } : {}),
        ...(slotBurstRate !== undefined
            ? { support: { slotBurstRate, trainingSlotAffinity: ['str'], friendshipBonus: [1, 1, 1, 1, 1, 1], tacticInspireEvents: [] } }
            : {}),
    } as unknown as MentorCard;
}

export function createMentorBurstRateByStarSuite(): TestSuite {
    const suite = new TestSuite('MentorBurstRateByStar (教官爆發率隨星等成長 PROG-2-1163)');

    suite.test('★0 不變、★5 +15 個百分點（SSR 40%→55%、65%→80%）', () => {
        assert.equals(0.4, burstRateAtStar(0.4, 0));
        assert.equals(0.55, burstRateAtStar(0.4, 5));
        assert.equals(0.8, burstRateAtStar(0.65, 5));
        assert.equals(0.46, burstRateAtStar(0.4, 2));
    });

    suite.test('上限 80%；原本高於上限的不往下砍；星等夾到 0~5', () => {
        assert.equals(MENTOR_BURST_RATE_CAP, burstRateAtStar(0.7, 5));
        assert.equals(0.9, burstRateAtStar(0.9, 5));
        assert.equals(0.55, burstRateAtStar(0.4, 9));
        assert.equals(0.4, burstRateAtStar(0.4, undefined));
    });

    suite.test('mentorFromCard：支援卡爆發率依卡片星等成長', () => {
        assert.equals(0.55, mentorFromCard(card(0, 0.55)).burstRate);
        assert.equals(0.64, mentorFromCard(card(3, 0.55)).burstRate);
    });

    suite.test('mentorFromCard：沒有支援卡時預設爆發率也隨星等成長；覆寫值照用不加成', () => {
        assert.equals(MENTOR_CARD_DEFAULT_BURST_RATE + 0.06, mentorFromCard(card(2)).burstRate);
        assert.equals(0.3, mentorFromCard(card(5, 0.55), { burstRate: 0.3 }).burstRate);
        assert.equals(0.61, mentorFromCard(card(0, 0.55), { stars: 2 }).burstRate, '覆寫星等時以覆寫星等計算');
    });

    return suite;
}
