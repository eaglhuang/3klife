import { assert, TestSuite } from './TestRunner';
import {
    acknowledgeOnboardingSegment,
    currentOnboardingSegment,
    FRESH_ONBOARDING,
    isOnboardingComplete,
    normalizeOnboardingState,
    ONBOARDING_SEGMENTS,
} from '../assets/scripts/core/systems/OnboardingTutorial';

export function createOnboardingTutorialSuite(): TestSuite {
    const suite = new TestSuite('OnboardingTutorial (MVP-11 新手 3 段式引導)');

    suite.test('引導共 3 段，順序為宿命→成長→傳承，且每段有字串 key', () => {
        assert.equals(3, ONBOARDING_SEGMENTS.length);
        assert.equals('fate', ONBOARDING_SEGMENTS[0].id);
        assert.equals('growth', ONBOARDING_SEGMENTS[1].id);
        assert.equals('legacy', ONBOARDING_SEGMENTS[2].id);
        for (const seg of ONBOARDING_SEGMENTS) {
            assert.isTrue(seg.key.indexOf('UI_TUTORIAL_') === 0);
            assert.isTrue(seg.text.length > 0);
        }
    });

    suite.test('首次進入從第 1 段開始，未完成', () => {
        assert.equals('fate', currentOnboardingSegment(FRESH_ONBOARDING)!.id);
        assert.isFalse(isOnboardingComplete(FRESH_ONBOARDING));
    });

    suite.test('依序確認三段後完成，並回報 completed', () => {
        let state = { ...FRESH_ONBOARDING };
        const order = ['fate', 'growth', 'legacy'] as const;
        for (let i = 0; i < order.length; i++) {
            const result = acknowledgeOnboardingSegment(state, order[i]);
            assert.isTrue(result.ok);
            assert.equals(order[i], result.acknowledged!.id);
            assert.equals(i === order.length - 1, result.completed);
            state = result.state;
        }
        assert.isTrue(isOnboardingComplete(state));
        assert.isTrue(currentOnboardingSegment(state) === null);
    });

    suite.test('跳段被拒絕（out-of-order），狀態不前進', () => {
        const result = acknowledgeOnboardingSegment(FRESH_ONBOARDING, 'growth');
        assert.isFalse(result.ok);
        assert.equals('out-of-order', result.reason!);
        assert.equals(0, result.state.nextIndex);
        assert.equals(0, FRESH_ONBOARDING.nextIndex);
    });

    suite.test('重複確認同一段被拒絕', () => {
        const first = acknowledgeOnboardingSegment(FRESH_ONBOARDING, 'fate');
        const again = acknowledgeOnboardingSegment(first.state, 'fate');
        assert.isFalse(again.ok);
        assert.equals('out-of-order', again.reason!);
        assert.equals(1, again.state.nextIndex);
    });

    suite.test('完成後再確認回報 already-complete', () => {
        let state = { ...FRESH_ONBOARDING };
        for (const seg of ONBOARDING_SEGMENTS) state = acknowledgeOnboardingSegment(state, seg.id).state;
        const result = acknowledgeOnboardingSegment(state, 'fate');
        assert.isFalse(result.ok);
        assert.equals('already-complete', result.reason!);
        assert.isTrue(result.completed);
    });

    suite.test('存檔讀取：無效值一律回到第 1 段，超出段數夾到完成', () => {
        assert.equals(0, normalizeOnboardingState(null).nextIndex);
        assert.equals(0, normalizeOnboardingState('bad').nextIndex);
        assert.equals(0, normalizeOnboardingState({ nextIndex: -1 }).nextIndex);
        assert.equals(0, normalizeOnboardingState({ nextIndex: 1.5 }).nextIndex);
        assert.equals(0, normalizeOnboardingState({}).nextIndex);
        assert.equals(2, normalizeOnboardingState({ nextIndex: 2 }).nextIndex);
        assert.equals(3, normalizeOnboardingState({ nextIndex: 99 }).nextIndex);
    });

    return suite;
}
