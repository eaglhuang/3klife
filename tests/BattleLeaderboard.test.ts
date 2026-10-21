/**
 * BattleLeaderboard.test.ts — 戰績排行榜排序、同分規則與舊存檔相容 headless 測試（PROG-2-0953）
 *
 * Unity 對照：EditMode Test，驗證 ScrollView 資料來源排序穩定、只取前 N 列。
 */
import { TestSuite, assert } from './TestRunner';
import { leaderboardEntryOf, rankLeaderboard, type LeaderboardEntry } from '../assets/scripts/core/systems/BattleLeaderboard';

const rows: LeaderboardEntry[] = [
    { generalId: 'b', damage: 500, kills: 3, guardian: 40 },
    { generalId: 'a', damage: 900, kills: 1, guardian: 10 },
    { generalId: 'c', damage: 500, kills: 5, guardian: 90 },
];

export function createBattleLeaderboardSuite(): TestSuite {
    const suite = new TestSuite('BattleLeaderboard');

    suite.test('依傷害排序由大到小；同傷害時依擊殺、再依 id 排', () => {
        const ranked = rankLeaderboard(rows, 'damage', 3).map((r) => r.generalId);
        assert.equals('a', ranked[0] ?? '');
        assert.equals('c', ranked[1] ?? '');
        assert.equals('b', ranked[2] ?? '');
    });

    suite.test('依擊殺與守護力排序使用各自的主指標', () => {
        assert.equals('c', rankLeaderboard(rows, 'kills', 1)[0]?.generalId ?? '');
        assert.equals('c', rankLeaderboard(rows, 'guardian', 1)[0]?.generalId ?? '');
    });

    suite.test('完全同分時依武將 id 由小到大，結果穩定', () => {
        const tied: LeaderboardEntry[] = [
            { generalId: 'z', damage: 1, kills: 1, guardian: 1 },
            { generalId: 'm', damage: 1, kills: 1, guardian: 1 },
        ];
        assert.equals('m', rankLeaderboard(tied, 'damage', 2)[0]?.generalId ?? '');
    });

    suite.test('limit 取前 N 名；小於 1 時回傳空陣列；不修改傳入陣列', () => {
        assert.equals(2, rankLeaderboard(rows, 'damage', 2).length);
        assert.equals(0, rankLeaderboard(rows, 'damage', 0).length);
        assert.equals('b', rows[0]?.generalId ?? '');
    });

    suite.test('舊存檔沒有戰績欄位時當 0；壞值歸零', () => {
        const legacy = leaderboardEntryOf({ id: 'old' });
        assert.equals(0, legacy.damage);
        const broken = leaderboardEntryOf({ id: 'x', battleRecord: { totalDamage: -5, kills: NaN, guardianPower: 7 } });
        assert.equals(0, broken.damage);
        assert.equals(0, broken.kills);
        assert.equals(7, broken.guardian);
    });

    return suite;
}
