/**
 * GeneralDetailCommandPanelMapping.test.ts — 將頁統領區塊接入 overview 內容狀態（TSK-06，PROG-2-1213 後續）
 *
 * 鎖住：overview 內容狀態帶五列統領資料；名聲、帶兵上限取自武將讀取模型；城市兵源由呼叫端傳入；缺資料顯示 —。
 *
 * Unity 對照：Presenter 的 ViewModel 多一組綁定欄位，Text 綁定依欄位值顯示，沒有值就顯示佔位。
 */
import { TestSuite, assert } from './TestRunner';
import { buildGeneralDetailOverviewContentState } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Record<string, unknown> = {}): GeneralConfig {
    return { id: 'zhang-fei', name: '張飛', title: '燕人猛將', ...extra } as unknown as GeneralConfig;
}

function valueOf(rows: { key: string; value: string }[], key: string): string {
    return rows.find((r) => r.key === key)?.value ?? '';
}

export function createGeneralDetailCommandPanelMappingSuite(): TestSuite {
    const suite = new TestSuite('GeneralDetailCommandPanelMapping (將頁統領區塊接入 TSK-06)');

    suite.test('overview 內容狀態帶五列統領資料', () => {
        const state = buildGeneralDetailOverviewContentState(general());
        assert.equals(5, state.commandPanelRows.length);
    });

    suite.test('名聲與帶兵上限取自武將讀取模型，城市兵源由呼叫端傳入', () => {
        const state = buildGeneralDetailOverviewContentState(
            general({ General_Fame: 120, Command_Capacity: 11000 }),
            undefined,
            undefined,
            9000,
        );
        assert.equals('120', valueOf(state.commandPanelRows, 'fame'));
        assert.equals('11000', valueOf(state.commandPanelRows, 'commandCapacity'));
        assert.equals('9000', valueOf(state.commandPanelRows, 'cityTroops'));
        assert.equals('8000', valueOf(state.commandPanelRows, 'sortiePool'));
    });

    suite.test('缺資料與官職暫為 —', () => {
        const state = buildGeneralDetailOverviewContentState(general());
        assert.equals('—', valueOf(state.commandPanelRows, 'fame'));
        assert.equals('—', valueOf(state.commandPanelRows, 'official'));
        assert.equals('—', valueOf(state.commandPanelRows, 'cityTroops'));
        assert.equals('—', valueOf(state.commandPanelRows, 'sortiePool'));
    });

    return suite;
}
