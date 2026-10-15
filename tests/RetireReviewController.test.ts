/**
 * 退役回顧與季度戰報的畫面流程（REC-08，PROG-2-0448）
 *
 * 鎖住：有戰績與精力時文字正確；舊存檔沒有 battleRecord 或精力資料時用安全預設（0），不拋錯；
 * 精力在高區才建議結緣。
 */
import { assert, TestSuite } from './TestRunner';
import { buildRetireReviewView } from '../assets/scripts/ui/core/RetireReviewController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Record<string, unknown>): GeneralConfig {
    return { id: 'g1', name: '趙雲', ...extra } as unknown as GeneralConfig;
}

export function createRetireReviewControllerSuite(): TestSuite {
    const suite = new TestSuite('RetireReviewController (退役回顧與季度戰報 REC-08)');

    suite.test('有戰績與精力：季度戰報顯示精力百分比，精力高於 50% 建議結緣', () => {
        const view = buildRetireReviewView(general({ vitality: 80, maxVitality: 100 }));
        assert.equals('戰損報告：精力 80%', view.reportLine);
        assert.isTrue(view.bondRecommended);
        assert.equals('本季戰報：趙雲 精力剩 80%，可進行結緣。', view.quarterlyScriptLine);
    });

    suite.test('精力在 50% 以下：不建議結緣', () => {
        const view = buildRetireReviewView(general({ vitality: 40, maxVitality: 100 }));
        assert.isFalse(view.bondRecommended);
        assert.equals('本季戰報：趙雲 精力剩 40%，不建議進行結緣。', view.quarterlyScriptLine);
    });

    suite.test('舊存檔沒有 battleRecord 與精力：不拋錯，用空戰績與 0%', () => {
        const view = buildRetireReviewView(general({}));
        assert.equals('戰損報告：精力 0%', view.reportLine);
        assert.isFalse(view.bondRecommended);
        assert.isTrue(view.careerLine.length > 0);
        assert.isTrue(view.scriptLine.length > 0);
    });

    suite.test('沒有武將時仍回傳完整結構', () => {
        const view = buildRetireReviewView(null);
        assert.equals('戰損報告：精力 0%', view.reportLine);
        assert.isFalse(view.bondRecommended);
    });

    return suite;
}
