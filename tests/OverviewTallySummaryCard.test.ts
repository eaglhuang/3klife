// @spec-source → UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) general-tally-summary；PROG-2-1858
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';
import { TALLY_SUMMARY_CARD_TITLE, tallySummaryCardLines } from '../assets/scripts/core/systems/GeneralTallySummary';

export function createOverviewTallySummaryCardSuite(): TestSuite {
    const suite = new TestSuite('OverviewTallySummaryCard');

    suite.test('兩行：第一行虎符，第二行兵種傾向接近期戰績', () => {
        const lines = tallySummaryCardLines({ tallyLine: '虎符：SR 3★｜分數 52（SR 帶 40-64）', troopLine: '兵種傾向：騎兵', recordLine: '近期戰績：3 勝 1 敗｜勝率 75%' });
        assert.equals('虎符：SR 3★｜分數 52（SR 帶 40-64）', lines[0]);
        assert.equals('兵種傾向：騎兵｜近期戰績：3 勝 1 敗｜勝率 75%', lines[1]);
        assert.equals('虎符戰記', TALLY_SUMMARY_CARD_TITLE);
    });

    suite.test('總覽版面在人物小傳上方有次卡與兩行節點', () => {
        const layout = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/ui-spec/fragments/layouts/character-ds3-overview-content.json'), 'utf8'));
        const col = layout.children[0].children[0].children as { name: string; children?: { name: string }[] }[];
        const names = col.map((c) => c.name);
        const card = names.indexOf('OverviewTallySummary');
        assert.isTrue(card >= 0);
        assert.equals(card + 1, names.indexOf('CharacterDs3TabOverview_div_45'));
        const card0 = col[card] as { name: string; children: { name: string; children?: { name: string }[] }[] };
        assert.equals('OverviewTallyTitle,OverviewTallyLines', card0.children.map((c) => c.name).join(','));
        assert.equals('OverviewTallyLine0,OverviewTallyLine1', (card0.children[1].children ?? []).map((c) => c.name).join(','));
    });

    return suite;
}
