/**
 * LeadSelectController.test.ts — 大廳選主將控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { LeadSelectController } from '../assets/scripts/ui/core/LeadSelectController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, name: string): GeneralConfig {
    return { id, name } as unknown as GeneralConfig;
}

function harness(fail = false) {
    let bindings: MentorHoldingsButtonBinding[] = [];
    let lead: string | null = null;
    const log = { texts: {} as Record<string, string>, actives: {} as Record<string, boolean>, toasts: [] as string[], warns: 0, sorties: 0 };
    const host = {
        node: { active: true },
        binder: {
            setTexts: (t: Record<string, string>) => { Object.assign(log.texts, t); },
            setActives: (a: Record<string, boolean>) => { Object.assign(log.actives, a); },
        },
    };
    const ctrl = new LeadSelectController({
        mountHost: async (b) => { bindings = b; return host; },
        deployable: () => ['a', 'b', 'c', 'd'].map((id) => general(id, id.toUpperCase())),
        leadId: () => lead,
        setLead: async (id) => { if (fail) throw new Error('io'); lead = id; },
        openSortie: () => { log.sorties++; },
        toast: (m) => { log.toasts.push(m); },
        warn: () => { log.warns++; },
    });
    const click = (id: string) => bindings.find((b) => b.buttonId === id)?.handler();
    return { ctrl, log, click, lead: () => lead };
}

export function createLeadSelectControllerSuite(): TestSuite {
    const suite = new TestSuite('LeadSelectController (大廳選主將 PROG-2-1633)');

    suite.test('掛載顯示第一頁與換頁；點選指定、再點取消；出征鈕交回宿主', async () => {
        const h = harness();
        await h.ctrl.mount();
        assert.equals('出戰主將：預設', h.log.texts.leadTitleLabel);
        assert.equals('換頁 ▶ 1/2', h.log.texts.leadPageLabel);
        assert.isTrue(h.log.actives.btnLeadPage);
        await h.ctrl.clickGeneral(0);
        assert.equals('a', h.lead());
        h.ctrl.refresh();
        assert.equals('出戰主將：A', h.log.texts.leadTitleLabel);
        assert.equals('✓ A', h.log.texts.leadGeneralLabel0);
        await h.ctrl.clickGeneral(0);
        assert.equals(null, h.lead());
        h.click('btnLeadPage');
        assert.equals('換頁 ▶ 2/2', h.log.texts.leadPageLabel);
        assert.equals('－', h.log.texts.leadGeneralLabel1);
        h.click('btnOpenSortie');
        assert.equals(1, h.log.sorties);
    });

    suite.test('存檔失敗時提示並記錄；空列不動作', async () => {
        const h = harness(true);
        await h.ctrl.mount();
        await h.ctrl.clickGeneral(0);
        assert.equals(1, h.log.warns);
        assert.equals('主將存檔失敗，請稍後再試', h.log.toasts[0]);
        h.click('btnLeadPage');
        await h.ctrl.clickGeneral(2);
        assert.equals(1, h.log.warns);
    });

    return suite;
}
