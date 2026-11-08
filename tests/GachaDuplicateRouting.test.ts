/**
 * GachaDuplicateRouting — 轉蛋重複卡導向分流彈窗（DUP-05；PROG-2-2073）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    DUPLICATE_INFUSION_VALUE,
    DuplicatePullPopupController,
    infusionTargetsOf,
    rebirthTargetsOf,
    splitOwnedDuplicates,
} from '../assets/scripts/ui/core/DuplicatePullPopupController';

const LOBBY = path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts');

const pulled = [
    { id: 'zhao-yun', name: '趙雲' },
    { id: 'ma-chao', name: '馬超' },
    { id: 'guan-yu', name: '關羽' },
    { id: 'ma-chao', name: '馬超' },
];

export function createGachaDuplicateRoutingSuite(): TestSuite {
    const suite = new TestSuite('GachaDuplicateRouting (轉蛋重複卡分流 DUP-05 PROG-2-2073)');

    suite.test('抽卡前已持有的留下來問；其餘（含同批第二張）照原本入冊', () => {
        const { owned, rest } = splitOwnedDuplicates(pulled, new Set(['zhao-yun', 'guan-yu']));
        assert.equals('zhao-yun,guan-yu', owned.map((g) => g.id).join(','));
        assert.equals('ma-chao,ma-chao', rest.map((g) => g.id).join(','));
    });

    suite.test('依選擇分流；沒有選擇的維持轉生', () => {
        const owned = pulled.slice(0, 3);
        const choices = [{ id: 'zhao-yun', route: 'infusion' as const }, { id: 'ma-chao', route: 'rebirth' as const }];
        assert.equals('ma-chao,guan-yu', rebirthTargetsOf(owned, choices).map((g) => g.id).join(','));
        assert.equals('zhao-yun', infusionTargetsOf(owned, choices).map((g) => g.id).join(','));
        assert.equals(3, rebirthTargetsOf(owned, []).length);
        assert.equals(0, infusionTargetsOf(owned, []).length);
    });

    suite.test('沒有可灌注的英靈卡：灌注按鈕不能按；批次沿用灌注時改走復生', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask([
            { id: 'zhao-yun', name: '趙雲', infusionAvailable: false },
            { id: 'guan-yu', name: '關羽' },
            { id: 'lu-bu', name: '呂布', infusionAvailable: false },
        ]);
        const view = ctrl.getView();
        assert.equals(false, view.enabled.btnDupInfusion);
        assert.equals('未裝配英靈卡，無法灌注', view.texts.dupInfusionLabel);
        assert.equals(false, ctrl.choose('infusion'));
        assert.isTrue(ctrl.getView().texts.dupSubtitle.includes('趙雲'));
        ctrl.choose('rebirth');
        assert.isTrue(ctrl.getView().enabled.btnDupInfusion);
        ctrl.toggleBatchDefault();
        assert.equals(true, ctrl.choose('infusion'));
        assert.equals('rebirth,infusion,rebirth', (await pending).map((c) => c.route).join(','));
    });

    suite.test('大廳接線：轉蛋入冊改走分流、灌注值 500', () => {
        const lobby = fs.readFileSync(LOBBY, 'utf8');
        assert.equals(500, DUPLICATE_INFUSION_VALUE);
        assert.isTrue(lobby.includes('this._enrollGachaGenerals(results.map((entry) => entry.general))'));
        assert.isTrue(lobby.includes('await this._routeGachaOwnedDuplicates();'));
        assert.isTrue(lobby.includes('this.openBloodlineInfusionResult(card, DUPLICATE_INFUSION_VALUE, general.id)'));
    });

    return suite;
}
