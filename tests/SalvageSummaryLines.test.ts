// @spec-source → 關卡設計系統.md (doc_spec_0049) §I-2/I-3 Stage_Salvage 戰後結算；PROG-2-1857
import { TestSuite, assert } from './TestRunner';
import { SALVAGE_LOST_LINE, salvageSummaryLines } from '../assets/scripts/core/systems/StageSalvageSettlement';
import type { SalvageTotals } from '../assets/scripts/core/systems/StrategistHud';

const empty: SalvageTotals = { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };

export function createSalvageSummaryLinesSuite(): TestSuite {
    const suite = new TestSuite('SalvageSummaryLines');

    suite.test('勝利時依回收欄順序列出資源，略過 0，有補給時補換算說明', () => {
        const lines = salvageSummaryLines({ ...empty, stone: 120, supply: 300, wood: 80 }, true);
        assert.equals('關卡回收：石材 120、木材 80、補給 300', lines[0]);
        assert.equals(2, lines.length);
        assert.isTrue(lines[1].includes('糧草'));
    });

    suite.test('沒有補給時只列一行', () => {
        assert.equals(1, salvageSummaryLines({ ...empty, intel: 2 }, true).length);
    });

    suite.test('戰敗且有回收物時提示帶不回', () => {
        const lines = salvageSummaryLines({ ...empty, stone: 50 }, false);
        assert.equals(1, lines.length);
        assert.equals(SALVAGE_LOST_LINE, lines[0]);
    });

    suite.test('沒有回收物或沒有資料時不列', () => {
        assert.equals(0, salvageSummaryLines(empty, true).length);
        assert.equals(0, salvageSummaryLines(empty, false).length);
        assert.equals(0, salvageSummaryLines(undefined, true).length);
    });

    return suite;
}
