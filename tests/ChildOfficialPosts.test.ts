/**
 * ChildOfficialPosts.test.ts — 屯田官與說客的產出公式與兒童低效（PROG-2-0988）
 */
import { assert, TestSuite } from './TestRunner';
import { CHILD_MINOR_EFFICIENCY, childPostEffect, isMinorStage } from '../assets/scripts/core/systems/ChildOfficialPosts';

export function createChildOfficialPostsSuite(): TestSuite {
    const suite = new TestSuite('ChildOfficialPosts (PROG-2-0988 屯田官與說客)');

    suite.test('成年子嗣：效果 = 基礎值 × (1 + 屬性 / 100)', () => {
        assert.equals(0.2 * 1.5, childPostEffect('tuntian', 50, 'adult'));
        assert.equals(0.15 * 2, childPostEffect('shuike', 100, 'adult'));
    });

    suite.test('屬性為 0 時即為基礎值', () => {
        assert.equals(0.2, childPostEffect('tuntian', 0, 'peak'));
        assert.equals(0.15, childPostEffect('shuike', 0, 'adult'));
    });

    suite.test('未成年（出生、開獎）效率減半', () => {
        assert.equals(CHILD_MINOR_EFFICIENCY, 0.5);
        assert.equals(childPostEffect('shuike', 40, 'adult') * 0.5, childPostEffect('shuike', 40, 'birth'));
        assert.equals(childPostEffect('tuntian', 40, 'adult') * 0.5, childPostEffect('tuntian', 40, 'unveiling'));
        assert.isTrue(isMinorStage('birth'));
        assert.isFalse(isMinorStage('adult'));
    });

    suite.test('負數或非有限屬性視為 0，不會產生負效果', () => {
        assert.equals(0.2, childPostEffect('tuntian', -30, 'adult'));
        assert.equals(0.15, childPostEffect('shuike', Number.NaN, 'adult'));
    });

    return suite;
}
