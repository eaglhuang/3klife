/**
 * GeneralLifecycle.test.ts — 武將詳情與培育畫面的生命週期文字（PROG-2-0232）
 *
 * 純文字的 Presenter 測試：階段由年齡推導、剩餘壽命換算成年月、已故與缺年齡的佔位文字。
 */
import { assert, TestSuite } from './TestRunner';
import { describeLifecycle, formatRemainingMonths, GENERAL_STAGE_LABELS } from '../assets/scripts/ui/core/GeneralLifecyclePresenter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Partial<GeneralConfig> & Record<string, unknown> = {}): GeneralConfig {
    return { id: 'liu', name: '劉備', faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 80, ...extra } as unknown as GeneralConfig;
}

export function createGeneralLifecycleSuite(): TestSuite {
    const suite = new TestSuite('GeneralLifecycle (PROG-2-0232 生命週期文字)');

    suite.test('階段由年齡推導：30 歲為成年，摘要含剩餘壽命', () => {
        const view = describeLifecycle(general({ age: 30, maxLifespan: 80 }));
        assert.equals('adult', view.stage!);
        assert.equals('成年', view.stageLabel);
        assert.equals(50 * 12, view.remainingMonths!);
        assert.equals('成年 · 剩餘 50 年 0 月', view.summary);
    });

    suite.test('剩餘月數換算：整年與餘月分開顯示', () => {
        assert.equals('剩餘 1 年 3 月', formatRemainingMonths(15));
        assert.equals('剩餘 0 年 0 月', formatRemainingMonths(0));
    });

    suite.test('超過天年時剩餘為 0；70 歲（天年 80）仍有 10 年，階段為退役候選', () => {
        const over = describeLifecycle(general({ age: 85, maxLifespan: 80 }));
        assert.equals('retired', over.stage!);
        assert.equals(0, over.remainingMonths!);
        const near = describeLifecycle(general({ age: 70, maxLifespan: 80 }));
        assert.equals('retired', near.stage!);
        assert.equals(120, near.remainingMonths!);
    });

    suite.test('已故只顯示已故，不給階段與剩餘', () => {
        const view = describeLifecycle(general({ age: 30, status: 'dead' } as Partial<GeneralConfig>));
        assert.isTrue(view.stage === null);
        assert.equals('已故', view.summary);
        assert.isTrue(view.remainingMonths === null);
    });

    suite.test('缺年齡時回傳佔位文字，不猜測', () => {
        const view = describeLifecycle(general({ age: undefined } as Partial<GeneralConfig>));
        assert.equals('—', view.summary);
        assert.isTrue(view.remainingMonths === null);
    });

    suite.test('階段標籤涵蓋六個生命週期階段', () => {
        assert.equals(6, Object.keys(GENERAL_STAGE_LABELS).length);
    });

    return suite;
}
