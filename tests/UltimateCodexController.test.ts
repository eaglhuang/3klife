/**
 * UltimateCodexController.test.ts — 奧義圖鑑控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { UltimateCodexController } from '../assets/scripts/ui/core/UltimateCodexController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

export function createUltimateCodexControllerSuite(): TestSuite {
    const suite = new TestSuite('UltimateCodexController (奧義圖鑑 PROG-2-1633)');

    suite.test('未掛載時 open 不動作；掛載後 open 寫字、置頂、開啟；關閉鈕收起', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        let writes = 0;
        let fronts = 0;
        const host = {
            node: { active: false },
            binder: {
                setTexts: () => { writes++; },
                setActives: () => undefined,
            },
        };
        const ctrl = new UltimateCodexController({
            mountHost: async (b) => { bindings = b; return host; },
            generals: () => [],
            lookup: (key) => key,
            bringToFront: () => { fronts++; },
        });
        ctrl.open();
        assert.equals(0, writes);
        await ctrl.mount();
        ctrl.open();
        assert.equals(1, writes);
        assert.equals(1, fronts);
        assert.isTrue(host.node.active);
        bindings.find((b) => b.buttonId === 'btnCloseUltimateCodex')?.handler();
        assert.isFalse(host.node.active);
    });

    return suite;
}
