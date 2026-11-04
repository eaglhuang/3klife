// @spec-source → 關卡設計系統.md (doc_spec_0049) §D-4 軍師 HUD；PROG-2-1744
import { TestSuite, assert } from './TestRunner';
import { strategistHudLogLine, type SalvageTotals } from '../assets/scripts/core/systems/StrategistHud';

const ZERO: SalvageTotals = { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };

export function createStrategistHudLogSuite(): TestSuite {
    const suite = new TestSuite('StrategistHudLog');

    suite.test('四欄都空：不寫日誌', () => {
        assert.equals('', strategistHudLogLine({ hazardsThisTurn: [], interactiveObjects: [], salvage: { ...ZERO }, missingCounters: [] }));
    });

    suite.test('只列有內容的欄位，多類物件以分號連接', () => {
        const line = strategistHudLogLine({
            hazardsThisTurn: ['火場延燒'],
            interactiveObjects: [{ kind: 'Camp_Target', state: 'alive' }, { kind: 'Camp_Target', state: 'alive' }, { kind: 'Trap_Cluster', state: 'alive' }],
            salvage: { ...ZERO, stone: 3 },
            missingCounters: ['抗混亂'],
        });
        assert.equals('軍師：危害 火場延燒｜營帳：存活 2；陷阱：存活 1｜回收 石材 3｜缺少抗混亂', line);
        assert.equals('軍師：回收 補給 5', strategistHudLogLine({ hazardsThisTurn: [], interactiveObjects: [], salvage: { ...ZERO, supply: 5 }, missingCounters: [] }));
    });

    return suite;
}
