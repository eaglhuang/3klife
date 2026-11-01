import { TestSuite, assert } from './TestRunner';
import { AWAKENING_FREEZE_TIMING, awakeningFreezeTitles } from '../assets/scripts/battle/views/AwakeningReveal';

export function createAwakeningRevealFreezeSuite(): TestSuite {
    const suite = new TestSuite('AwakeningRevealFreeze (覺醒定格演出 PROG-2-1702)');

    suite.test('每個覺醒因子一行「{名稱} 覺醒！」', () => {
        const titles = awakeningFreezeTitles([{ displayName: '燕人咆哮' }, { displayName: '龍膽' }]);
        assert.equals(2, titles.length);
        assert.equals('🔓 燕人咆哮 覺醒！', titles[0]);
    });

    suite.test('沒有覺醒時不演出', () => {
        assert.equals(0, awakeningFreezeTitles([]).length);
    });

    suite.test('時序：淡入短於停留，彈出從放大縮回', () => {
        assert.isTrue(AWAKENING_FREEZE_TIMING.fadeIn < AWAKENING_FREEZE_TIMING.hold);
        assert.isTrue(AWAKENING_FREEZE_TIMING.popScaleFrom > 1);
    });

    return suite;
}
