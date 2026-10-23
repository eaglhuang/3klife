/**
 * BattleLeaderboardView.test.ts — 排行榜列資料、名稱備援與指標循環 headless 測試（PROG-2-0957）
 *
 * Unity 對照：EditMode Test，驗證 ScrollView 每一列拿到的文字與名次正確。
 */
import { TestSuite, assert } from './TestRunner';
import {
    buildLeaderboardPanelTexts,
    buildLeaderboardRows,
    nextLeaderboardMetric,
    LEADERBOARD_METRICS,
} from '../assets/scripts/core/systems/BattleLeaderboardView';

const roster = [
    { id: 'g1', name: '關羽', battleRecord: { totalDamage: 120000, kills: 300, guardianPower: 900 } },
    { id: 'g2', name: '呂布', battleRecord: { totalDamage: 98000, kills: 450, guardianPower: 100 } },
    { id: 'g3', name: '', battleRecord: { totalDamage: 5000, kills: 1, guardianPower: 60000 } },
    { id: 'g4', name: '趙雲' },
];

export function createBattleLeaderboardViewSuite(): TestSuite {
    const suite = new TestSuite('BattleLeaderboardView');

    suite.test('依傷害排序，名次從 1 開始，數值加千分位', () => {
        const rows = buildLeaderboardRows(roster, 'damage', 3);
        assert.equals(3, rows.length);
        assert.equals(1, rows[0].rank);
        assert.equals('g1', rows[0].generalId);
        assert.equals('關羽', rows[0].name);
        assert.equals('120,000', rows[0].valueText);
        assert.equals('呂布', rows[1].name);
    });

    suite.test('依擊殺排序時使用擊殺數', () => {
        const rows = buildLeaderboardRows(roster, 'kills', 1);
        assert.equals('g2', rows[0].generalId);
        assert.equals('450', rows[0].valueText);
    });

    suite.test('依守護力排序時使用守護力', () => {
        const rows = buildLeaderboardRows(roster, 'guardian', 1);
        assert.equals('g3', rows[0].generalId);
        assert.equals('60,000', rows[0].valueText);
    });

    suite.test('名稱空白時以武將 id 代替，不產生空白列', () => {
        const rows = buildLeaderboardRows(roster, 'guardian', 4);
        const blank = rows.find((row) => row.generalId === 'g3');
        assert.equals('g3', blank?.name);
    });

    suite.test('沒有戰績的舊存檔武將仍會列出，數值為 0', () => {
        const rows = buildLeaderboardRows(roster, 'damage', 4);
        assert.equals(4, rows.length);
        assert.equals('g4', rows[3].generalId);
        assert.equals('0', rows[3].valueText);
    });

    suite.test('取前 N 名不超過名冊人數，limit 小於 1 時為空', () => {
        assert.equals(4, buildLeaderboardRows(roster, 'damage', 10).length);
        assert.equals(0, buildLeaderboardRows(roster, 'damage', 0).length);
    });

    suite.test('指標切換會循環：傷害 → 擊殺 → 守護力 → 傷害', () => {
        assert.equals('kills', nextLeaderboardMetric('damage'));
        assert.equals('guardian', nextLeaderboardMetric('kills'));
        assert.equals('damage', nextLeaderboardMetric('guardian'));
        assert.equals(3, LEADERBOARD_METRICS.length);
    });

    suite.test('畫面文字鍵為 content contract 的路徑，列數不足時以「—」佔位', () => {
        const rows = buildLeaderboardRows(roster, 'damage', 2);
        const texts = buildLeaderboardPanelTexts(rows, 'damage');
        assert.equals('1', texts['DialogCard/ScrollView/ScrollContent/Row0/RankLabel']);
        assert.equals('關羽', texts['DialogCard/ScrollView/ScrollContent/Row0/NameLabel']);
        assert.equals('120,000', texts['DialogCard/ScrollView/ScrollContent/Row0/ValueLabel']);
        assert.equals('—', texts['DialogCard/ScrollView/ScrollContent/Row2/NameLabel']);
        assert.equals('傷害總量', texts['DialogCard/MetricRow/MetricDamageButton/MetricDamageLabel']);
        assert.equals('目前排序：傷害總量', texts['DialogCard/FooterBar/HintLabel']);
        assert.equals('', texts['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
    });

    suite.test('沒有任何武將時顯示空白提示', () => {
        const texts = buildLeaderboardPanelTexts([], 'kills');
        assert.equals('尚無戰績', texts['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
        assert.equals('—', texts['DialogCard/ScrollView/ScrollContent/Row0/ValueLabel']);
    });

    return suite;
}
