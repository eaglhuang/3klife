/**
 * StrategistHud.test.ts — 軍師 HUD 四摘要欄 headless 測試（LVL-06 / PROG-2-1313）
 *
 * 鎖住：無危害時顯示預設句；互動物件依類別列出狀態數量；收益只列大於 0 的項目；
 * 缺口只列關鍵字，沒有缺口時顯示無缺口。
 *
 * Unity 對照：HUD Presenter 只讀 ViewModel 上公開的欄位，沒有的欄位不去場景裡找。
 */
import { assert, TestSuite } from './TestRunner';
import { buildStrategistHudSummary } from '../assets/scripts/core/systems/StrategistHud';

export function createStrategistHudSuite(): TestSuite {
    const suite = new TestSuite('StrategistHud (軍師 HUD 四摘要欄 LVL-06 / PROG-2-1313)');

    suite.test('當前回合危害與互動物件狀態依規則列出', () => {
        const summary = buildStrategistHudSummary({
            hazardsThisTurn: ['落石預警'],
            interactiveObjects: [
                { kind: 'Camp_Target', state: 'alive' },
                { kind: 'Camp_Target', state: 'alive' },
                { kind: 'Camp_Target', state: 'recovered' },
                { kind: 'Floodgate', state: 'triggered' },
            ],
            salvage: { stone: 0, wood: 0, supply: 120, intel: 0 },
            missingCounters: [],
        });
        assert.equals('落石預警', summary.themeHazard);
        assert.equals('水門：已觸發 1\n營帳：存活 2、已回收 1', summary.interactiveObjectStatus);
    });

    suite.test('沒有危害與互動物件時給預設句；收益全為 0 時顯示尚無收益', () => {
        const summary = buildStrategistHudSummary({
            hazardsThisTurn: [],
            interactiveObjects: [],
            salvage: { stone: 0, wood: 0, supply: 0, intel: 0 },
            missingCounters: [],
        });
        assert.equals('本回合無主題危害', summary.themeHazard);
        assert.equals('無互動物件', summary.interactiveObjectStatus);
        assert.equals('尚無收益', summary.stageSalvageSummary);
    });

    suite.test('缺口只列對策關鍵字，不給戰法答案；有缺口與無缺口文字不同', () => {
        const short = buildStrategistHudSummary({
            hazardsThisTurn: [],
            interactiveObjects: [],
            salvage: { stone: 10, wood: 0, supply: 0, intel: 3 },
            missingCounters: ['抗混亂', '反隱'],
        });
        assert.equals('缺少抗混亂、反隱', short.recommendedLoadoutGap);
        assert.equals('石材 10、情報 3', short.stageSalvageSummary);
        const full = buildStrategistHudSummary({
            hazardsThisTurn: [],
            interactiveObjects: [],
            salvage: { stone: 0, wood: 0, supply: 0, intel: 0 },
            missingCounters: [],
        });
        assert.equals('對策槽無缺口', full.recommendedLoadoutGap);
    });

    return suite;
}
