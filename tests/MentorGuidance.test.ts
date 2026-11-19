/**
 * MentorGuidance.test.ts — 新玩家缺教官引導的判斷與文案（PROG-2-9160）
 */
import { TestSuite, assert } from './TestRunner';
import { evaluateMentorGuidance, mentorGuidanceHint } from '../assets/scripts/core/systems/MentorGuidance';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';

export function createMentorGuidanceSuite(): TestSuite {
    const suite = new TestSuite('MentorGuidance');

    suite.test('沒有教官、沒借用、未記旗標：顯示引導，不記旗標', () => {
        const r = evaluateMentorGuidance({ ownedMentorCount: 0, hasBorrowed: false, guideDone: false });
        assert.isTrue(r.show);
        assert.isFalse(r.markDone);
    });

    suite.test('已選好友借用：不顯示引導（本來就能入學）', () => {
        const r = evaluateMentorGuidance({ ownedMentorCount: 0, hasBorrowed: true, guideDone: false });
        assert.isFalse(r.show);
        assert.isFalse(r.markDone);
    });

    suite.test('第一次擁有教官：不顯示並記旗標；已記旗標不重複記', () => {
        const first = evaluateMentorGuidance({ ownedMentorCount: 1, hasBorrowed: false, guideDone: false });
        assert.isFalse(first.show);
        assert.isTrue(first.markDone);
        const again = evaluateMentorGuidance({ ownedMentorCount: 3, hasBorrowed: false, guideDone: true });
        assert.isFalse(again.show);
        assert.isFalse(again.markDone);
    });

    suite.test('旗標已記後教官用完（退役／鎖定）：引導不再回來', () => {
        const r = evaluateMentorGuidance({ ownedMentorCount: 0, hasBorrowed: false, guideDone: true });
        assert.isFalse(r.show);
        assert.isFalse(r.markDone);
    });

    suite.test('提示文案：用實際支援券數、寫教官池；沒券時改提示補券', () => {
        const withTickets = mentorGuidanceHint(5);
        assert.isTrue(withTickets.includes('教官池') && withTickets.includes('5 張') && !withTickets.includes('支援卡池'));
        const none = mentorGuidanceHint(0);
        assert.isTrue(none.includes('教官池') && none.includes('用完'));
    });

    suite.test('正式開局錢包的支援券至少 2 張（足夠抽兩次教官）', () => {
        assert.isTrue(STARTER_GACHA_WALLET.mentorTickets >= 2);
    });

    return suite;
}
