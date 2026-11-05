// @spec-source → 戰法場景規格書.md (doc_spec_0039) §E；關卡設計系統.md (doc_spec_0049) §D-4；PROG-2-1851
import { TestSuite, assert } from './TestRunner';
import { strategistHudViewOf } from '../assets/scripts/battle/shared/StrategistHudView';
import { wisdomFillRatio } from '../assets/scripts/battle/shared/WisdomMeter';
import { strategistHudLogLine, type SalvageTotals, type StrategistHudInput } from '../assets/scripts/core/systems/StrategistHud';

const ZERO: SalvageTotals = { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };
const EMPTY: StrategistHudInput = { hazardsThisTurn: [], interactiveObjects: [], salvage: ZERO, missingCounters: [] };

export function createStrategistHudViewSuite(): TestSuite {
    const suite = new TestSuite('StrategistHudView');

    suite.test('填充比例隨能量增加，超出範圍時夾住', () => {
        assert.equals(0, wisdomFillRatio(0));
        assert.equals(0.45, wisdomFillRatio(45));
        assert.equals(1, wisdomFillRatio(100));
        assert.equals(0, wisdomFillRatio(-5));
        assert.equals(1, wisdomFillRatio(180));
    });

    suite.test('四欄都空：摘要為空，智謀條照常顯示', () => {
        const view = strategistHudViewOf(EMPTY, 45.5);
        assert.equals('', view.summaryText);
        assert.equals('智謀 45/100', view.wisdomText);
        assert.equals(0.455, view.wisdomRatio);
    });

    suite.test('摘要與戰場日誌同一份文字', () => {
        const input: StrategistHudInput = { ...EMPTY, hazardsThisTurn: ['火場延燒'], missingCounters: ['抗混亂'] };
        const view = strategistHudViewOf(input, 0);
        assert.equals(strategistHudLogLine(input), view.summaryText);
        assert.contains(view.summaryText, '火場延燒');
    });

    return suite;
}
