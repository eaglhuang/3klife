/**
 * MentorBreakthrough.test.ts — 教官卡星等突破與重複卡判定 headless 測試（PROG-2-0274 / MENT-06）
 *
 * Unity 對照：等同 EditMode Test，驗證 ScriptableObject 星等表與判定器，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyDuplicateMentorCard,
    clampMentorStar,
    MENTOR_MAX_STAR,
    MENTOR_STAR_TABLE,
    unlockedEventGroupCount,
} from '../assets/scripts/core/systems/MentorBreakthrough';
import { MENTOR_STAR_EFFECT } from '../assets/scripts/core/systems/NurtureSystem';

export function createMentorBreakthroughSuite(): TestSuite {
    const suite = new TestSuite('MentorBreakthrough (MENT-06 教官突破星等)');

    suite.test('星等表 ★0~★5 的友情與訓練倍率與 F-4 規格一致', () => {
        const friendship = MENTOR_STAR_TABLE.map(e => e.friendshipMultiplier);
        const training = MENTOR_STAR_TABLE.map(e => e.trainingMultiplier);
        assert.equals(6, MENTOR_STAR_TABLE.length);
        assert.equals(JSON.stringify([1.0, 1.1, 1.2, 1.3, 1.4, 1.5]), JSON.stringify(friendship));
        assert.equals(JSON.stringify([1.0, 1.05, 1.1, 1.15, 1.2, 1.3]), JSON.stringify(training));
    });

    suite.test('NurtureSystem 的教官星效果由星等表派生，數值與改動前相同', () => {
        assert.equals(JSON.stringify([1, 1.05, 1.1, 1.15, 1.2, 1.3]), JSON.stringify(MENTOR_STAR_EFFECT));
    });

    suite.test('已解鎖事件組數：★0 只有組 1，★5 全部 6 組', () => {
        assert.equals(1, unlockedEventGroupCount(0));
        assert.equals(3, unlockedEventGroupCount(2));
        assert.equals(5, unlockedEventGroupCount(4));
        assert.equals(6, unlockedEventGroupCount(5));
    });

    suite.test('重複卡逐級突破：★0→★1→…→★5', () => {
        let star = 0;
        for (let expected = 1; expected <= MENTOR_MAX_STAR; expected++) {
            const result = applyDuplicateMentorCard(star);
            assert.equals('breakthrough', result.kind);
            assert.equals(expected, result.star);
            star = result.star;
        }
        assert.equals(MENTOR_MAX_STAR, star);
    });

    suite.test('滿 ★5 再抽到重複卡走溢出，星等不再上升', () => {
        const result = applyDuplicateMentorCard(MENTOR_MAX_STAR);
        assert.equals('overflow', result.kind);
        assert.equals(MENTOR_MAX_STAR, result.star);
    });

    suite.test('星等越界或非有限數會被夾住', () => {
        assert.equals(0, clampMentorStar(-3));
        assert.equals(MENTOR_MAX_STAR, clampMentorStar(9));
        assert.equals(0, clampMentorStar(Number.NaN));
        assert.equals(0, clampMentorStar(undefined));
        assert.equals(MENTOR_MAX_STAR, clampMentorStar(7.9));
        assert.equals('overflow', applyDuplicateMentorCard(12).kind);
    });

    return suite;
}
