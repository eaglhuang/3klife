/**
 * PROG-2-1164：教官突破星等「其他加成」接上效果
 * ★1 初期情誼 +5、★3 擅長科目屬性加成 ×1.1、★4 TP 加成 +10；高星包含低星的加成。
 */

import { assert, TestSuite } from './TestRunner';
import { mentorStarPerks } from '../assets/scripts/core/systems/MentorBreakthrough';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function card(stars?: number): MentorCard {
    return {
        uid: 'mentor-x', sourceGeneralId: 'x', name: '關羽', faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'],
        generalSnapshot: { id: 'x', name: '關羽', str: 90, int: 40, lea: 70, pol: 30, cha: 50 } as unknown as GeneralConfig,
        ...(stars !== undefined ? { stars } : {}),
    } as MentorCard;
}

export function createMentorStarPerksSuite(): TestSuite {
    const suite = new TestSuite('MentorStarPerks');

    suite.test('mentorStarPerks：依星等累計', () => {
        assert.equals(JSON.stringify({ initialFriendship: 0, statBonusMultiplier: 1, tpBonusAdd: 0 }), JSON.stringify(mentorStarPerks(0)));
        assert.equals(JSON.stringify({ initialFriendship: 5, statBonusMultiplier: 1, tpBonusAdd: 0 }), JSON.stringify(mentorStarPerks(2)));
        assert.equals(JSON.stringify({ initialFriendship: 5, statBonusMultiplier: 1.1, tpBonusAdd: 0 }), JSON.stringify(mentorStarPerks(3)));
        assert.equals(JSON.stringify({ initialFriendship: 5, statBonusMultiplier: 1.1, tpBonusAdd: 10 }), JSON.stringify(mentorStarPerks(5)));
        assert.equals(JSON.stringify(mentorStarPerks(5)), JSON.stringify(mentorStarPerks(99)), '超過上限夾到 ★5');
        assert.equals(JSON.stringify(mentorStarPerks(0)), JSON.stringify(mentorStarPerks(undefined)));
    });

    suite.test('mentorFromCard：★0 無加成', () => {
        const mentor = mentorFromCard(card(0));
        assert.equals(8, mentor.tpBonus);
        assert.equals(18, mentor.statBonus?.str);
        assert.equals(undefined, mentor.friendship);
    });

    suite.test('mentorFromCard：★5 情誼、屬性、TP 全加', () => {
        const mentor = mentorFromCard(card(5));
        assert.equals(18, mentor.tpBonus);
        assert.equals(20, mentor.statBonus?.str, '18 × 1.1 = 19.8 四捨五入');
        assert.equals(5, mentor.friendship);
    });

    suite.test('mentorFromCard：覆寫星等時以覆寫星等計算', () => {
        const mentor = mentorFromCard(card(0), { stars: 1 });
        assert.equals(5, mentor.friendship);
        assert.equals(8, mentor.tpBonus);
    });

    return suite;
}
