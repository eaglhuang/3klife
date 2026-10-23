/**
 * QuarterlyBattleReportWiring.test.ts — 季度戰報列資料與季度推進 payload 接線 headless 測試（PROG-2-0962）
 *
 * Unity 對照：EditMode Test，驗證每季結算後的面板資料每位武將都有一列，沒有精力資料的不編造。
 */
import { TestSuite, assert } from './TestRunner';
import { buildQuarterlyBattleReportRows } from '../assets/scripts/core/systems/RetireReviewCopy';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createQuarterlyBattleReportWiringSuite(): TestSuite {
    const suite = new TestSuite('QuarterlyBattleReportWiring');

    suite.test('每位有精力資料的武將一列，精力過半才建議結緣', () => {
        const rows = buildQuarterlyBattleReportRows([
            { id: 'g1', name: '關羽', vitality: 80, maxVitality: 120 },
            { id: 'g2', name: '呂布', vitality: 60, maxVitality: 120 },
        ]);
        assert.equals(2, rows.length);
        assert.equals('g1', rows[0].generalId);
        assert.equals('戰損報告：精力 66%', rows[0].reportLine);
        assert.isTrue(rows[0].bondRecommended);
        assert.equals('戰損報告：精力 50%', rows[1].reportLine);
        assert.isFalse(rows[1].bondRecommended);
    });

    suite.test('沒有精力資料的武將略過；缺上限時以精力值為上限（100%）', () => {
        const rows = buildQuarterlyBattleReportRows([
            { id: 'g3', name: '無資料' },
            { id: 'g4', name: '只有精力', vitality: 30 },
        ]);
        assert.equals(1, rows.length);
        assert.equals('g4', rows[0].generalId);
        assert.equals('戰損報告：精力 100%', rows[0].reportLine);
    });

    suite.test('戰報只列現役：退休教官、退休年齡與未成年一律排除（PROG-2-0966）', () => {
        const rows = buildQuarterlyBattleReportRows([
            { id: 'adult', name: '趙雲', vitality: 90, maxVitality: 100, age: 30 },
            { id: 'mentor', name: '教官甲', vitality: 80, maxVitality: 100, age: 35, isMentorCard: true },
            { id: 'retired', name: '老將乙', vitality: 60, maxVitality: 100, age: 70 },
            { id: 'child', name: '幼子丙', vitality: 100, maxVitality: 100, age: 12 },
            { id: 'unknown-age', name: '無齡丁', vitality: 70, maxVitality: 100 },
        ]);
        assert.equals('adult,unknown-age', rows.map(row => row.generalId).join(','));
    });

    suite.test('季度推進的 SeasonAdvanced payload 帶出名冊武將的季度戰報', async () => {
        const general = { id: 'g-wire', name: '趙雲', vitality: 90, maxVitality: 100, gender: 'male' } as unknown as GeneralConfig;
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general]));
        const payloads: Array<{ quarterlyReports?: Array<{ generalId: string; reportLine: string }> }> = [];
        session.setEventEmitter({
            emit: (name: string, payload: unknown) => {
                if (name === GAME_SESSION_EVENTS.SeasonAdvanced) payloads.push(payload as typeof payloads[number]);
            },
        });
        await session.advanceSeason();
        const reports = payloads[0]?.quarterlyReports ?? [];
        assert.equals(1, reports.length);
        assert.equals('g-wire', reports[0].generalId);
        assert.isTrue(reports[0].reportLine.startsWith('戰損報告：精力 '), reports[0].reportLine);
    });

    return suite;
}
