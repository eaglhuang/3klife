/**
 * GeneralCommandPanel — 將頁統領區塊列資料的 headless 測試（PROG-2-1213，TSK-06）
 */
import { assert, TestSuite } from './TestRunner';
import { buildGeneralCommandRows } from '../assets/scripts/core/systems/GeneralCommandPanel';

export function createGeneralCommandPanelSuite(): TestSuite {
    const suite = new TestSuite('GeneralCommandPanel (將頁名聲／官職／統領軍勢 TSK-06)');

    suite.test('五列依序輸出，標籤與規格欄位一致', () => {
        const rows = buildGeneralCommandRows({ fame: 120, officialTitle: '太守', commandCapacity: 11000, cityTroops: 9000 });
        assert.equals('fame,official,commandCapacity,cityTroops,sortiePool', rows.map((r) => r.key).join(','));
        assert.equals('名聲,官職,帶兵上限,可用城市兵源,預估出征軍勢', rows.map((r) => r.label).join(','));
    });

    suite.test('預估出征軍勢取帶兵上限、城市兵源與關卡上限的最小值', () => {
        const rows = buildGeneralCommandRows({ fame: 0, officialTitle: null, commandCapacity: 11000, cityTroops: 9000 });
        assert.equals('8000', rows.find((r) => r.key === 'sortiePool')?.value ?? '');
        const capped = buildGeneralCommandRows({ fame: 0, officialTitle: null, commandCapacity: 11000, cityTroops: 9000, stageSortieCap: 5000 });
        assert.equals('5000', capped.find((r) => r.key === 'sortiePool')?.value ?? '');
        const short = buildGeneralCommandRows({ fame: 0, officialTitle: null, commandCapacity: 11000, cityTroops: 3000 });
        assert.equals('3000', short.find((r) => r.key === 'sortiePool')?.value ?? '');
    });

    suite.test('缺資料的列顯示 "—"，預估出征軍勢在任一來源缺失時也不推算', () => {
        const rows = buildGeneralCommandRows({ fame: null, officialTitle: null, commandCapacity: 11000, cityTroops: null });
        assert.equals('—', rows.find((r) => r.key === 'fame')?.value ?? '');
        assert.equals('—', rows.find((r) => r.key === 'official')?.value ?? '');
        assert.equals('—', rows.find((r) => r.key === 'cityTroops')?.value ?? '');
        assert.equals('—', rows.find((r) => r.key === 'sortiePool')?.value ?? '');
        assert.equals('11000', rows.find((r) => r.key === 'commandCapacity')?.value ?? '');
    });

    suite.test('官職名稱有值時原樣顯示', () => {
        const rows = buildGeneralCommandRows({ fame: 0, officialTitle: '校尉', commandCapacity: null, cityTroops: null });
        assert.equals('校尉', rows.find((r) => r.key === 'official')?.value ?? '');
    });

    return suite;
}
