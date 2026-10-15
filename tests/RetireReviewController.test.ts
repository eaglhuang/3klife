/**
 * 退役回顧與季度戰報的畫面流程（REC-08，PROG-2-0448）
 *
 * 鎖住：有戰績與精力時文字正確；舊存檔沒有 battleRecord 或精力資料時用安全預設（0），不拋錯；
 * 精力在高區才建議結緣。
 */
import { assert, TestSuite } from './TestRunner';
import { buildRetireReviewTexts, buildRetireReviewView, withRetireReviewFallback } from '../assets/scripts/ui/core/RetireReviewController';
import { quarterlyBattleReport, retireReviewCareerLine, retireReviewScriptLine } from '../assets/scripts/core/systems/RetireReviewCopy';
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

    suite.test('句子走語系查詢：無語系表時 fallback 與 RetireReviewCopy 組句一致', () => {
        const record = { wins: 5, losses: 3, kills: 2, totalDamage: 0, guardianPower: 7 };
        const g = general({ battleRecord: record, vitality: 40, maxVitality: 100 });
        const texts = buildRetireReviewTexts(g);
        const report = quarterlyBattleReport('趙雲', 40);
        assert.equals(retireReviewCareerLine(record), texts.retireCareer);
        assert.equals(retireReviewScriptLine(record), texts.retireScript);
        assert.equals(report.reportLine, texts.retireReport);
        assert.equals(report.scriptLine, texts.retireQuarterly);
    });

    suite.test('語系查詢拿到占位參數：數值以參數傳入，不在元件內拼字', () => {
        const lookup = (key: string, ...args: string[]): string => `${key}|${args.join(',')}`;
        const g = general({ battleRecord: { wins: 5, losses: 3, kills: 2, totalDamage: 0, guardianPower: 7 }, vitality: 40, maxVitality: 100 });
        const texts = buildRetireReviewTexts(g, lookup);
        assert.equals('ui.retire_review.career|5,3,2', texts.retireCareer);
        assert.equals('ui.retire_review.script|5,2,7', texts.retireScript);
        assert.equals('ui.retire_review.quarterly|趙雲,40,ui.retire_review.bond_no|', texts.retireQuarterly);
    });

    suite.test('withRetireReviewFallback：語系表回傳 key 本身時改用 zh-TW 預設並帶入參數', () => {
        const missing = withRetireReviewFallback((key) => key);
        assert.equals('戰損報告：精力 75%', missing('ui.retire_review.report', '75'));
        assert.equals('退役回顧', missing('ui.retire_review.title'));
        const localized = withRetireReviewFallback(() => 'Battle Damage: 75%');
        assert.equals('Battle Damage: 75%', localized('ui.retire_review.report', '75'));
    });

    suite.test('沒有武將時仍回傳完整結構', () => {
        const view = buildRetireReviewView(null);
        assert.equals('戰損報告：精力 0%', view.reportLine);
        assert.isFalse(view.bondRecommended);
    });

    return suite;
}
