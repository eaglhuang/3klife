import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    MERC_PANEL_MAX_ROWS,
    MercenaryPanelController,
    MercenaryPanelDeps,
} from '../assets/scripts/ui/core/MercenaryPanelController';
import type { MercenaryState } from '../assets/scripts/core/systems/MercenaryBond';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

const TRIAL: MercenaryState = { uid: 'm1', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'zhang-fei' };
const EXPIRED: MercenaryState = { uid: 'm2', daysLeft: 0, bond: 3, status: 'Expired', generalId: 'guan-yu' };

function makeDeps(overrides: Partial<MercenaryPanelDeps> = {}): MercenaryPanelDeps {
    return {
        mercenaries: () => [TRIAL, EXPIRED],
        info: (state) => ({ originalOwnerName: '原主甲', generalName: `名${state.generalId}`, rarity: 'R' }),
        bondPoints: () => 500,
        bond: async () => true,
        ...overrides,
    };
}

export function createMercenaryPanelControllerSuite(): TestSuite {
    const suite = new TestSuite('MercenaryPanelController (MERC-07 畫面流程)');

    suite.test('預設選中第一位，文字來自 buildMercenaryPanelView', () => {
        const controller = new MercenaryPanelController(makeDeps());
        assert.equals('m1', controller.selected()!.uid);
        const view = controller.getFlowView();
        assert.equals('結義倒數：0 日', view.texts.mercCountdown);
        assert.isTrue(view.actives.mercConfirm);
        assert.equals('結義進度：6/6', view.texts.mercBond);
        assert.equals('原主：原主甲', view.texts.mercNametag);
        assert.equals('名zhang-fei', view.texts.mercRow0Name);
        assert.isTrue(view.actives.mercDetail);
        assert.isTrue(view.enabled.btnMercBond);
    });

    suite.test('點列切換到已離隊的傭兵：顯示告別文字，結義按鈕停用', () => {
        const controller = new MercenaryPanelController(makeDeps());
        controller.select(1);
        const view = controller.getFlowView();
        assert.isTrue(view.actives.mercFarewell);
        assert.isFalse(view.actives.mercConfirm);
        assert.isFalse(view.enabled.btnMercBond);
        assert.equals('檢視中', view.texts.btnMercRow1Label);
        assert.equals('選取', view.texts.btnMercRow0Label);
    });

    suite.test('點數不足時不呼叫結義，提示點數不足', async () => {
        let called = false;
        const controller = new MercenaryPanelController(makeDeps({
            bondPoints: () => 10,
            bond: async () => { called = true; return true; },
        }));
        assert.isFalse(await controller.bondSelected());
        assert.isFalse(called);
        assert.equals('結義點數不足', controller.getFlowView().texts.mercNotice);
        assert.isTrue(controller.getFlowView().actives.mercNotice);
    });

    suite.test('試用未滿六日時不可結義，提示未完成試用', async () => {
        const controller = new MercenaryPanelController(makeDeps({
            mercenaries: () => [{ ...TRIAL, daysLeft: 2, bond: 4 }],
        }));
        assert.isFalse(await controller.bondSelected());
        assert.equals('尚未完成六日試用，無法結義', controller.getFlowView().texts.mercNotice);
    });

    suite.test('點數足夠時結義選中的傭兵，成功後提示清除', async () => {
        const seen: string[] = [];
        const controller = new MercenaryPanelController(makeDeps({
            bond: async (uid) => { seen.push(uid); return true; },
        }));
        assert.isTrue(await controller.bondSelected());
        assert.equals('m1', seen[0]);
        assert.isFalse(controller.getFlowView().actives.mercNotice);
    });

    suite.test('沒有傭兵時列為空，面板不顯示細節', () => {
        const controller = new MercenaryPanelController(makeDeps({ mercenaries: () => [] }));
        const view = controller.getFlowView();
        assert.equals('目前沒有傭兵', view.texts.mercEmptyLabel);
        assert.isFalse(view.actives.mercDetail);
        assert.isFalse(view.actives.mercRow0);
        assert.isFalse(view.enabled.btnMercBond);
    });

    suite.test('列上限為 MERC_PANEL_MAX_ROWS，超出的傭兵不顯示', () => {
        const many: MercenaryState[] = Array.from({ length: 9 }, (_, i) => ({
            uid: `u${i}`, daysLeft: 1, bond: 1, status: 'Trial', generalId: `g${i}`,
        }));
        const controller = new MercenaryPanelController(makeDeps({ mercenaries: () => many }));
        assert.equals(MERC_PANEL_MAX_ROWS, controller.rows().length);
    });

    suite.test('layout 節點 id 涵蓋所有 flow key，skin slot 都已定義', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/mercenary-panel-main.json');
        const skin = readJson('assets/resources/ui-spec/skins/mercenary-panel-screen.skin.json');
        const screen = readJson('assets/resources/ui-spec/screens/mercenary-panel-screen.json');
        const ids = new Set<string>();
        const slots: string[] = [];
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (typeof node.id === 'string') ids.add(node.id);
            if (typeof node.skinSlot === 'string') slots.push(node.skinSlot);
            if (typeof node.styleSlot === 'string') slots.push(node.styleSlot);
            for (const child of node.children ?? []) walk(child);
        };
        walk(layout.root);
        const view = new MercenaryPanelController(makeDeps()).getFlowView();
        const keys = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
        for (const key of keys) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        for (const slot of slots) {
            assert.isTrue(slot in skin.slots, `skin 缺少 ${slot}`);
        }
        assert.equals(layout.id, screen.layout);
        assert.equals(skin.id, `${screen.skin}`);
    });

    return suite;
}
