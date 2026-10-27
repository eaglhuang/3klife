/**
 * GeneralDetailReadModelCaller.test.ts — 人物頁 presenter 呼叫 Data Read Model 的接線測試（GDUI-13，PROG-2-1024）
 *
 * 鎖住：overview 內容狀態附帶 readModel；既有欄位值不因此改變；
 * 原始武將缺少 §10 欄位時，readModel 對應欄位為 NO_DATA，不補假資料。
 *
 * Unity 對照：像 Presenter 接上 ViewModel：ViewModel 多一個欄位，既有的 Text 綁定不變，只是現在有人讀它。
 */
import { TestSuite, assert } from './TestRunner';
import { buildGeneralDetailOverviewContentState } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Record<string, unknown> = {}): GeneralConfig {
    return { id: 'zhang-fei', name: '張飛', title: '燕人猛將', ...extra } as unknown as GeneralConfig;
}

export function createGeneralDetailReadModelCallerSuite(): TestSuite {
    const suite = new TestSuite('GeneralDetailReadModelCaller (人物頁 presenter 接 read model GDUI-13)');

    suite.test('overview 內容狀態附帶 readModel，且 §10 缺漏欄位為 NO_DATA', () => {
        const state = buildGeneralDetailOverviewContentState(general());
        assert.isTrue(state.readModel !== undefined);
        assert.equals('NO_DATA', state.readModel.generalFame.state);
        assert.equals('NO_DATA', state.readModel.learnedTactics.state);
        assert.equals('NO_DATA', state.readModel.defaultTab.state);
    });

    suite.test('既有欄位不因接線而改變', () => {
        const state = buildGeneralDetailOverviewContentState(general());
        assert.equals('張飛', state.headerName);
        assert.equals('燕人猛將', state.headerTitle);
        assert.equals('血脈總覽', state.overviewModeBadgeLabel);
    });

    suite.test('武將帶有 §10 欄位時，readModel 讀到對應值', () => {
        const state = buildGeneralDetailOverviewContentState(general({ General_Fame: 120, Equipped_Tally_UID: 'tally-1' }));
        assert.equals('VALUE', state.readModel.generalFame.state);
        if (state.readModel.generalFame.state === 'VALUE') assert.equals(120, state.readModel.generalFame.value);
        assert.equals('VALUE', state.readModel.equippedTallyUid.state);
    });

    return suite;
}
