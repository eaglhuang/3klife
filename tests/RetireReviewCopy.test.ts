/**
 * 退役戰績回顧與季度戰損報告的文字（REC-08，PROG-2-0434）
 *
 * 鎖住：生涯戰績行、退役劇本句、精力百分比（無條件捨去、上下限）、結緣建議門檻（暫定，>50%）。
 */
import { assert, TestSuite } from './TestRunner';
import {
    quarterlyBattleReport,
    retireReviewCareerLine,
    retireReviewScriptLine,
    vitalityPercentOf,
} from '../assets/scripts/core/systems/RetireReviewCopy';

export function createRetireReviewCopySuite(): TestSuite {
    const suite = new TestSuite('RetireReviewCopy (退役戰績回顧與季度戰損報告 REC-08)');

    suite.test('退役面板生涯戰績行：勝、敗、斬人', () => {
        assert.equals('生涯戰績：10勝 2敗 斬5人', retireReviewCareerLine({ wins: 10, losses: 2, kills: 5 }));
        assert.equals('生涯戰績：0勝 0敗 斬0人', retireReviewCareerLine(null));
    });

    suite.test('退役劇本句：回首征途，勝、斬敵、承傷', () => {
        const line = retireReviewScriptLine({ wins: 10, losses: 2, kills: 5, guardianPower: 800, totalDamage: 3000 });
        assert.equals('回首征途：勝10場，斬敵5人，承傷800——英雄無悔。', line);
    });

    suite.test('精力百分比：無條件捨去，超出範圍夾在 0~100', () => {
        assert.equals(50, vitalityPercentOf(50, 100));
        assert.equals(33, vitalityPercentOf(100, 300));
        assert.equals(0, vitalityPercentOf(-5, 100));
        assert.equals(100, vitalityPercentOf(150, 100));
    });

    suite.test('精力百分比：上限無效時回 0', () => {
        assert.equals(0, vitalityPercentOf(50, 0));
        assert.equals(0, vitalityPercentOf(50, Number.NaN));
    });

    suite.test('季度戰損報告：精力 X%，高區（>50%）可結緣', () => {
        const report = quarterlyBattleReport('趙雲', 80);
        assert.equals('戰損報告：精力 80%', report.reportLine);
        assert.equals('本季戰報：趙雲 精力剩 80%，可進行結緣。', report.scriptLine);
        assert.isTrue(report.bondRecommended);
    });

    suite.test('季度戰損報告：50% 正好屬於中區，不建議結緣（暫定門檻）', () => {
        const report = quarterlyBattleReport('趙雲', 50);
        assert.isFalse(report.bondRecommended);
        assert.equals('本季戰報：趙雲 精力剩 50%，不建議進行結緣。', report.scriptLine);
    });

    return suite;
}
