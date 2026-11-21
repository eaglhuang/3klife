/**
 * PreviewSortie.test.ts — QA 預覽／直進戰場的模擬出征帳本（PROG-2-9711）
 * 預覽戰場沒有大廳出征帳本時補一份，委任（自動代打）才出得了兵；戰後結算不寫回存檔。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { PREVIEW_SORTIE_DEFAULTS, buildPreviewSortieInput, wantsPreviewSortie } from '../assets/scripts/core/systems/PreviewSortie';
import { computeCommandCapacity, createSortieState } from '../assets/scripts/core/systems/SortieDeploy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createPreviewSortieSuite(): TestSuite {
    const suite = new TestSuite('PreviewSortie (QA 預覽模擬帳本 PROG-2-9711)');

    suite.test('只有 QA 預覽與直進戰場補模擬帳本，正式入口與再戰不補', () => {
        assert.isTrue(wantsPreviewSortie('preview'));
        assert.isTrue(wantsPreviewSortie('qa'));
        assert.isFalse(wantsPreviewSortie('lobby'));
        assert.isFalse(wantsPreviewSortie('replay'));
        assert.isFalse(wantsPreviewSortie(undefined));
        assert.isFalse(wantsPreviewSortie(null));
    });

    suite.test('軍勢依主將統率與名聲計算，兵源糧草用預設值', () => {
        const input = buildPreviewSortieInput({ lea: 80, generalRank: 1, generalFame: 20 });
        assert.equals(computeCommandCapacity({ lea: 80, generalRank: 1, fameBonus: 20 }), input.commandCapacity);
        assert.equals(PREVIEW_SORTIE_DEFAULTS.cityTroops, input.cityTroops);
        assert.equals(PREVIEW_SORTIE_DEFAULTS.food, input.food);
    });

    suite.test('沒有統率資料時仍可建立帳本，且出征軍勢大於 0（委任有兵可出）', () => {
        const state = createSortieState(buildPreviewSortieInput({}));
        assert.isTrue(state.poolCurrent > 0);
        assert.isTrue(state.food > 0);
    });

    suite.test('接線：戰場開局與再戰都走 resolveBattleSortieInput，帶 preview 旗標', () => {
        const scene = read('assets/scripts/battle/views/BattleScene.ts');
        const flow = read('assets/scripts/battle/views/BattleSceneFlow.ts');
        assert.isTrue(scene.includes('resolveBattleSortieInput(pg, battleParams.entrySource)'));
        assert.isTrue(scene.includes('{ preview: sortie.preview }'));
        assert.isTrue(flow.includes('resolveBattleSortieInput(pg, battleParams?.entrySource)'));
        assert.isTrue(flow.includes('{ preview: sortie.preview }'));
    });

    suite.test('戰後結算：模擬帳本只顯示戰況，不傳給 recordBattle（不寫回兵源糧草）', () => {
        const bridge = read('assets/scripts/battle/views/BattleUIBridge.ts');
        assert.isTrue(bridge.includes('const sortie = previewSortie ? null : fieldSortie;'));
        assert.isTrue(bridge.includes('formatSortieSummary(fieldSortie)'));
        const ctrl = read('assets/scripts/battle/controllers/BattleController.ts');
        assert.isTrue(ctrl.includes('this.previewSortie = options.preview === true;'));
        assert.isTrue(ctrl.includes('this.previewSortie = false;'));
    });

    suite.test('試玩腳本：開場按一次自動，之後不再按自動鈕', () => {
        const script = read('tools_node/playtest-online.js');
        assert.isTrue(script.includes("clickButton('^BtnAuto$')"));
        assert.equals(1, script.split("clickButton('^BtnAuto$')").length - 1);
    });

    return suite;
}
