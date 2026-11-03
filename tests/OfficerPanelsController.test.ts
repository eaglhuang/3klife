/**
 * OfficerPanelsController.test.ts — 大廳官職三畫面控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { OfficerPanelsController } from '../assets/scripts/ui/core/OfficerPanelsController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { OfficerState } from '../assets/scripts/core/systems/OfficerState';

function makeHost() {
    const texts: Record<string, string> = {};
    return {
        texts,
        node: { active: true },
        binder: {
            setTexts: (t: Record<string, string>) => { Object.assign(texts, t); },
            setActives: () => undefined,
        },
    };
}

export function createOfficerPanelsControllerSuite(): TestSuite {
    const suite = new TestSuite('OfficerPanelsController (官職三畫面 PROG-2-1633)');

    suite.test('掛載三畫面並寫入 HUD；HUD 鈕開詳情頁、詳情頁開階位總覽、關詳情頁一併收起', async () => {
        const hosts: Record<string, ReturnType<typeof makeHost>> = {};
        const bindings: Record<string, MentorHoldingsButtonBinding[]> = {};
        let state: OfficerState = { currentTier: 1, officerExp: 0, unlockHistory: [1] };
        const ctrl = new OfficerPanelsController({
            mountHost: async (name, _screen, b) => { hosts[name] = makeHost(); hosts[name].node.active = false; bindings[name] = b; return hosts[name]; },
            officerState: () => state,
            tierRows: () => null,
            lookup: (key) => key,
        });
        const click = (host: string, id: string) => bindings[host].find((b) => b.buttonId === id)?.handler();
        await ctrl.mount();
        assert.isTrue(hosts.OfficerHudHost.texts.officerRank.length > 0);
        const before = hosts.OfficerHudHost.texts.officerExp;

        click('OfficerHudHost', 'btnOpenOfficerPage');
        assert.isTrue(hosts.OfficerPageHost.node.active);
        assert.isTrue('officerPermissionText' in hosts.OfficerPageHost.texts);

        click('OfficerPageHost', 'btnOpenRankProgress');
        assert.isTrue(hosts.RankProgressHost.node.active);
        assert.isTrue('rankRow0' in hosts.RankProgressHost.texts);

        click('OfficerPageHost', 'btnCloseOfficerPage');
        assert.isFalse(hosts.OfficerPageHost.node.active);
        assert.isFalse(hosts.RankProgressHost.node.active);

        state = { currentTier: 1, officerExp: 50, unlockHistory: [1] };
        ctrl.refresh();
        assert.isTrue(hosts.OfficerHudHost.texts.officerExp !== before, '狀態改變後 refresh 會重寫 HUD 經驗');
    });

    return suite;
}
