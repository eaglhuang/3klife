/**
 * ChapterAiConfig — 章節 AI 精度縮放（doc_spec_0329；PROG-2-2007）
 */
import { assert, TestSuite } from './TestRunner';
import { chapterAiConfigOf, shouldPickCounter } from '../assets/scripts/core/systems/ChapterAiConfig';

export function createChapterAiConfigSuite(): TestSuite {
    const suite = new TestSuite('ChapterAiConfig (章節 AI 縮放 doc_spec_0329 PROG-2-2007)');

    suite.test('四章 IQ 與剋制率；第四章起封頂', () => {
        const c1 = chapterAiConfigOf(1);
        assert.equals(40, c1.iq);
        assert.isTrue(c1.randomDeploy && !c1.reserveFood);
        assert.equals(0.45, chapterAiConfigOf(2).counterRate);
        assert.isTrue(chapterAiConfigOf(3).evaluateScenePreset);
        assert.isFalse(chapterAiConfigOf(3).usePersonalityProfile);
        const c9 = chapterAiConfigOf(9);
        assert.equals(100, c9.iq);
        assert.equals('EXTREME', c9.iqLevel);
        assert.isTrue(c9.useBestTally);
        assert.equals(9, c9.chapter);
        assert.equals(1, chapterAiConfigOf(0).chapter);
        assert.equals(40, chapterAiConfigOf(NaN).iq);
    });

    suite.test('剋制擲骰', () => {
        assert.isTrue(shouldPickCounter(chapterAiConfigOf(1), 0.19));
        assert.isFalse(shouldPickCounter(chapterAiConfigOf(1), 0.2));
        assert.isTrue(shouldPickCounter(chapterAiConfigOf(4), 0.89));
    });

    return suite;
}
