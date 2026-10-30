/**
 * DeckSelectController.test.ts — 大廳選卡控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { DeckSelectController, DECK_SELECT_SLOTS } from '../assets/scripts/ui/core/DeckSelectController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

function harness(outcome: () => Promise<string>) {
    let bindings: MentorHoldingsButtonBinding[] = [];
    const log = { texts: {} as Record<string, string>, actives: {} as Record<string, boolean>, toasts: [] as string[], warns: 0, toggled: [] as string[] };
    const deck: string[] = ['c1'];
    const host = {
        node: { active: true },
        binder: {
            setTexts: (t: Record<string, string>) => { Object.assign(log.texts, t); },
            setActives: (a: Record<string, boolean>) => { Object.assign(log.actives, a); },
        },
    };
    const ctrl = new DeckSelectController({
        mountHost: async (b) => { bindings = b; return host; },
        deck: () => deck,
        cards: () => [{ id: 'c0', name: '甲', sub: '攻' }, { id: 'c1', name: '乙', sub: '守' }],
        toggle: async (id) => { log.toggled.push(id); return outcome(); },
        toast: (m) => { log.toasts.push(m); },
        warn: () => { log.warns++; },
    });
    const click = (id: string) => bindings.find((b) => b.buttonId === id)?.handler();
    return { ctrl, log, click, bindingCount: () => bindings.length };
}

export function createDeckSelectControllerSuite(): TestSuite {
    const suite = new TestSuite('DeckSelectController (大廳選卡 PROG-2-1633)');

    suite.test('掛載綁定四個卡位並顯示勾選；無卡的卡位隱藏', async () => {
        const h = harness(async () => 'added');
        await h.ctrl.mount();
        assert.equals(DECK_SELECT_SLOTS, h.bindingCount());
        assert.isTrue(h.log.texts.deckTitleLabel.startsWith('出戰卡組 1/'));
        assert.equals('　 甲（攻）', h.log.texts.deckCardLabel0);
        assert.equals('✓ 乙（守）', h.log.texts.deckCardLabel1);
        assert.equals('－', h.log.texts.deckCardLabel2);
        assert.isFalse(h.log.actives.btnDeckCard3);
    });

    suite.test('點卡切換；卡組已滿與存檔失敗都提示，空卡位不動作', async () => {
        const full = harness(async () => 'full');
        await full.ctrl.mount();
        await full.ctrl.clickCard(0);
        assert.equals('c0', full.log.toggled.join(','));
        assert.isTrue(full.log.toasts[0].startsWith('卡組已滿'));
        await full.ctrl.clickCard(3);
        assert.equals(1, full.log.toggled.length);

        const broken = harness(async () => { throw new Error('io'); });
        await broken.ctrl.mount();
        await broken.ctrl.clickCard(1);
        assert.equals(1, broken.log.warns);
        assert.equals('卡組存檔失敗，請稍後再試', broken.log.toasts[0]);
    });

    return suite;
}
