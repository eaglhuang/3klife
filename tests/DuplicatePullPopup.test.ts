/**
 * DuplicatePullPopup — 重複抽卡分流彈窗（DUP-01；PROG-2-2072）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { DuplicatePullPopupController } from '../assets/scripts/ui/core/DuplicatePullPopupController';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode {
    id?: string;
    children?: SpecNode[];
}

function ids(node: SpecNode, out = new Set<string>()): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) ids(child, out);
    return out;
}

const readSpec = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;

const TEN = [
    { id: 'zhao-yun', name: '趙雲' },
    { id: 'guan-yu', name: '關羽' },
    { id: 'lu-bu', name: '呂布' },
];

export function createDuplicatePullPopupSuite(): TestSuite {
    const suite = new TestSuite('DuplicatePullPopup (重複抽卡分流彈窗 DUP-01 PROG-2-2072)');

    suite.test('view key 全部對得到 layout 節點 id；screen 指向自己的 layout/skin', () => {
        const layoutIds = ids(readSpec<{ root: SpecNode }>('layouts/duplicate-pull-popup-main.json').root);
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask(TEN);
        const view = ctrl.getView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(layoutIds.has(key), key);
        }
        const screen = readSpec<{ layout: string; skin: string }>('screens/duplicate-pull-popup-screen.json');
        assert.equals('duplicate-pull-popup-main', screen.layout);
        assert.equals('duplicate-pull-popup-screen.skin', screen.skin);
        const skin = readSpec<{ slots: Record<string, unknown> }>('skins/duplicate-pull-popup-screen.skin.json');
        const layoutText = fs.readFileSync(path.join(UI_SPEC, 'layouts/duplicate-pull-popup-main.json'), 'utf8');
        for (const slot of layoutText.match(/"(?:skinSlot|styleSlot)": "([^"]+)"/g) ?? []) {
            const name = slot.replace(/^.*: "|"$/g, '');
            assert.isTrue(name in skin.slots, name);
        }
    });

    suite.test('文字：兩張分流卡與目前名將，多位時顯示進度', () => {
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask(TEN);
        const view = ctrl.getView();
        assert.equals('復生重練', view.texts.dupRebirthTitle);
        assert.equals('血脈灌注', view.texts.dupInfusionTitle);
        assert.isTrue(view.texts.dupSubtitle.includes('趙雲'));
        assert.isTrue(view.texts.dupRebirthBody.includes('上限 5 轉'));
        assert.isTrue(view.texts.dupInfusionBody.includes('500 經驗'));
        assert.equals('1 / 3', view.texts.dupPager);
        assert.isTrue(view.actives.btnDupBatchDefault);
        assert.isTrue(view.enabled.btnDupRebirth && view.enabled.btnDupInfusion);
    });

    suite.test('逐位選擇：每位重複卡回傳一筆，選完才 resolve', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask(TEN);
        assert.equals(false, ctrl.choose('rebirth'));
        assert.isTrue(ctrl.getView().texts.dupSubtitle.includes('關羽'));
        assert.equals(false, ctrl.choose('infusion'));
        assert.equals(false, ctrl.getView().actives.btnDupBatchDefault);
        assert.equals(true, ctrl.choose('rebirth'));
        assert.equals(false, ctrl.isOpen());
        assert.equals('zhao-yun:rebirth,guan-yu:infusion,lu-bu:rebirth', (await pending).map((c) => `${c.id}:${c.route}`).join(','));
    });

    suite.test('批次預設：勾選後選一次套用到剩下的；再按一次取消勾選', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask(TEN);
        ctrl.choose('rebirth');
        ctrl.toggleBatchDefault();
        ctrl.toggleBatchDefault();
        assert.isTrue(ctrl.getView().texts.dupBatchLabel.startsWith('[ ]'));
        ctrl.toggleBatchDefault();
        assert.isTrue(ctrl.getView().texts.dupBatchLabel.startsWith('[✓]'));
        assert.equals(true, ctrl.choose('infusion'));
        assert.equals('rebirth,infusion,infusion', (await pending).map((c) => c.route).join(','));
    });

    suite.test('沒有重複卡立即回傳空陣列；cancel 以已選的部分結束；新一輪會結束舊一輪', async () => {
        const ctrl = new DuplicatePullPopupController();
        assert.equals(0, (await ctrl.ask([])).length);
        assert.equals(false, ctrl.isOpen());
        const first = ctrl.ask(TEN);
        ctrl.choose('infusion');
        const second = ctrl.ask(TEN.slice(0, 1));
        assert.equals('zhao-yun:infusion', (await first).map((c) => `${c.id}:${c.route}`).join(','));
        ctrl.cancel();
        assert.equals(0, (await second).length);
        assert.equals(true, ctrl.choose('rebirth'));
    });

    return suite;
}
