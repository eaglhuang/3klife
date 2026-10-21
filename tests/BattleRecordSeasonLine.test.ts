/**
 * BattleRecordSeasonLine.test.ts — 戰績分頁「本賽季」一行的 headless 測試（PROG-2-0956）
 *
 * Unity 對照：EditMode Test，驗證面板只顯示目前賽季的計分表；上一季殘留的表不顯示。
 */
import { TestSuite, assert } from './TestRunner';
import { buildBattleRecordTabText, buildSeasonRecordLine } from '../assets/scripts/core/systems/BattleRecordStats';
import type { SeasonStats } from '../assets/scripts/core/systems/BattleSeasonStats';

function season(seasonId: string, overrides: Partial<SeasonStats> = {}): SeasonStats {
    return { seasonId, wins: 0, losses: 0, kills: 0, totalDamage: 0, guardianPower: 0, ...overrides };
}

export function createBattleRecordSeasonLineSuite(): TestSuite {
    const suite = new TestSuite('BattleRecordSeasonLine');

    suite.test('目前賽季 ID 未知時本賽季行顯示「—」', () => {
        assert.equals('本賽季：—', buildSeasonRecordLine(season('S1', { wins: 2 }), undefined));
    });

    suite.test('沒有賽季紀錄或賽季 ID 過期，都顯示「尚未出征」', () => {
        assert.equals('本賽季：尚未出征', buildSeasonRecordLine(null, 'S2'));
        assert.equals('本賽季：尚未出征', buildSeasonRecordLine(season('S1', { wins: 9, losses: 1, kills: 40 }), 'S2'));
    });

    suite.test('本賽季有出征但沒有勝負（例如只有平手）仍顯示「尚未出征」', () => {
        assert.equals('本賽季：尚未出征', buildSeasonRecordLine(season('S2'), 'S2'));
    });

    suite.test('本賽季有戰績時顯示勝敗與擊殺', () => {
        assert.equals('本賽季：3勝 1敗 斬5人', buildSeasonRecordLine(season('S2', { wins: 3, losses: 1, kills: 5 }), 'S2'));
    });

    suite.test('tab 文字的 season 欄位依目前賽季產生，不影響生涯戰績文字', () => {
        const record = { wins: 3, losses: 1, kills: 5, season: season('S2', { wins: 3, losses: 1, kills: 5 }) };
        const text = buildBattleRecordTabText(record, 'S2');
        assert.equals('本賽季：3勝 1敗 斬5人', text.season);
        assert.equals('生涯戰績：3勝 1敗 斬5人', text.career);

        assert.equals('本賽季：—', buildBattleRecordTabText(record).season);
        assert.equals('本賽季：尚未出征', buildBattleRecordTabText(record, 'S3').season);
    });

    suite.test('舊存檔沒有 season 欄位時，tab 仍正常顯示', () => {
        const text = buildBattleRecordTabText({ wins: 1, losses: 0 }, 'S1');
        assert.equals('本賽季：尚未出征', text.season);
        assert.equals('生涯戰績：1勝 0敗 斬0人', text.career);
    });

    return suite;
}
