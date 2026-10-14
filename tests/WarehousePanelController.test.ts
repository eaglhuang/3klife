import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { WarehousePanelController, WarehousePanelDeps } from '../assets/scripts/ui/core/WarehousePanelController';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function makeDeps(overrides: Partial<WarehousePanelDeps> = {}): WarehousePanelDeps {
    return {
        usedSlots: () => 12,
        expansions: () => 0,
        expand: () => true,
        ...overrides,
    };
}

export function createWarehousePanelControllerSuite(): TestSuite {
    const suite = new TestSuite('WarehousePanelController (BAG-09 倉庫面板)');

    suite.test('容量文字顯示已用/上限，可擴容時按鈕文字為 +20 格', () => {
        const view = new WarehousePanelController(makeDeps()).getFlowView();
        assert.equals('容量 12/50', view.texts.warehouseCapacity);
        assert.equals('擴容 +20 格', view.texts.btnWarehouseExpandLabel);
        assert.isTrue(view.enabled.btnWarehouseExpand);
        assert.isFalse(view.actives.warehouseNotice);
    });

    suite.test('擴容成功後呼叫一次 expand，回傳 true 且清除提示', () => {
        let calls = 0;
        const controller = new WarehousePanelController(makeDeps({ expand: () => { calls++; return true; } }));
        controller.reportStore({ ok: false, reason: 'full', usedSlots: 50 });
        assert.isTrue(controller.expandSelected());
        assert.equals(1, calls);
        assert.isFalse(controller.getFlowView().actives.warehouseNotice);
    });

    suite.test('達上限後擴容鈕停用，按下只提示上限，不呼叫 expand', () => {
        let called = false;
        const controller = new WarehousePanelController(makeDeps({
            expansions: () => 8,
            usedSlots: () => 10,
            expand: () => { called = true; return true; },
        }));
        const view = controller.getFlowView();
        assert.equals('容量 10/200', view.texts.warehouseCapacity);
        assert.isFalse(view.enabled.btnWarehouseExpand);
        assert.equals('已達上限', view.texts.btnWarehouseExpandLabel);
        assert.isFalse(controller.expandSelected());
        assert.isFalse(called);
        assert.equals('已達倉庫容量上限', controller.getFlowView().texts.warehouseNotice);
    });

    suite.test('滿倉：已用達容量時自動顯示滿倉提示，存入被拒時也會顯示', () => {
        const full = new WarehousePanelController(makeDeps({ usedSlots: () => 50 }));
        assert.equals('倉庫已滿，請擴容或整理', full.getFlowView().texts.warehouseNotice);
        assert.isTrue(full.getFlowView().actives.warehouseNotice);

        const rejected = new WarehousePanelController(makeDeps());
        rejected.reportStore({ ok: false, reason: 'full', usedSlots: 12 });
        assert.isTrue(rejected.getFlowView().actives.warehouseNotice);
        assert.equals('倉庫已滿，請擴容或整理', rejected.getFlowView().texts.warehouseNotice);
    });

    suite.test('擴容失敗時顯示失敗提示，容量不因此改變', () => {
        const controller = new WarehousePanelController(makeDeps({ expand: () => false }));
        assert.isFalse(controller.expandSelected());
        assert.equals('擴容失敗，請稍後再試', controller.getFlowView().texts.warehouseNotice);
    });

    suite.test('layout 節點 id 涵蓋所有 flow key，skin slot 都已定義', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/warehouse-panel-main.json');
        const skin = readJson('assets/resources/ui-spec/skins/warehouse-panel-screen.skin.json');
        const screen = readJson('assets/resources/ui-spec/screens/warehouse-panel-screen.json');
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
        const view = new WarehousePanelController(makeDeps()).getFlowView();
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
