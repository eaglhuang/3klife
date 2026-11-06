/**
 * EnvironmentBonus — 戰場 HUD 環境加成百分點摘要（doc_ui_0001 §6.3，PROG-2-1893）
 *
 * 覆蓋：百分點換算、略過 B 與重複項、全 0 為空字串、接進軍師摘要句。
 *
 * Unity 對照：像測 HUD Presenter 的格式化函式，不需要場景。
 */
import { assert, TestSuite } from './TestRunner';
import { aptitudeAtkPct, environmentBonusText } from '../assets/scripts/core/systems/EnvironmentBonus';
import { strategistHudLogLine } from '../assets/scripts/core/systems/StrategistHud';

export function createEnvironmentBonusSuite(): TestSuite {
    const suite = new TestSuite('EnvironmentBonus (環境加成百分點摘要 doc_ui_0001 §6.3)');

    suite.test('適性等級換成攻擊百分點', () => {
        assert.equals(20, aptitudeAtkPct('S'));
        assert.equals(10, aptitudeAtkPct('A'));
        assert.equals(0, aptitudeAtkPct('B'));
        assert.equals(-10, aptitudeAtkPct('C'));
        assert.equals(-25, aptitudeAtkPct('D'));
    });

    suite.test('略過 B 與重複名稱，正數帶加號', () => {
        const text = environmentBonusText([
            { label: '雨天', grade: 'C' },
            { label: '平原', grade: 'B' },
            { label: '山地', grade: 'S' },
            { label: '山地', grade: 'D' },
        ]);
        assert.equals('雨天 -10%、山地 +20%', text);
    });

    suite.test('全部為 0 時回傳空字串，軍師摘要不多一欄', () => {
        assert.equals('', environmentBonusText([{ label: '晴天', grade: 'B' }]));
        const base = { hazardsThisTurn: [], interactiveObjects: [], salvage: { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 }, missingCounters: [] };
        assert.equals('', strategistHudLogLine(base));
        assert.equals('軍師：環境 夜戰 +10%', strategistHudLogLine({ ...base, environmentBonus: '夜戰 +10%' }));
    });

    return suite;
}
