/**
 * DeckSelectController.test.ts — 大廳選卡控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { DeckSelectController, DECK_SELECT_SLOTS } from '../assets/scripts/ui/core/DeckSelectController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

const ROOT = path.resolve(__dirname, '..');

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
    return { ctrl, log, click, deck, host, bindingCount: () => bindings.length };
}

export function createDeckSelectControllerSuite(): TestSuite {
    const suite = new TestSuite('DeckSelectController (大廳選卡 PROG-2-1633)');

    suite.test('掛載綁定四個卡位並顯示勾選；無卡的卡位隱藏', async () => {
        const h = harness(async () => 'added');
        await h.ctrl.mount();
        assert.equals(DECK_SELECT_SLOTS + 1, h.bindingCount());
        assert.isTrue(h.log.texts.deckTitleLabel.startsWith('手動已選 1/'));
        assert.equals('＋ 甲（攻）', h.log.texts.deckCardLabel0);
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

    suite.test('空手動卡組仍列出可選卡，但不把目錄數量當成已選數量', async () => {
        const h = harness(async () => 'added');
        h.deck.length = 0;
        await h.ctrl.mount();
        assert.equals('手動已選 0/4', h.log.texts.deckTitleLabel);
        assert.equals('＋ 甲（攻）', h.log.texts.deckCardLabel0);
        assert.contains(h.log.texts.deckHintLabel, '可選卡');
        assert.contains(h.log.texts.deckHintLabel, '未選卡時使用預設卡組');
    });

    suite.test('關閉鈕隱藏選卡 host；版面有 btnDeckClose 且 LobbyScene 收起編組與 Esc 會收選卡', async () => {
        const h = harness(async () => 'added');
        await h.ctrl.mount();
        assert.isTrue(h.host.node.active);
        h.click('btnDeckClose');
        assert.isFalse(h.host.node.active);
        h.host.node.active = true;
        h.ctrl.close();
        assert.isFalse(h.host.node.active);

        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/lobby-deck-select-main.json'), 'utf8'));
        const ids: string[] = [];
        const walk = (node: { id?: string; children?: unknown[] }) => {
            if (node.id) ids.push(node.id);
            (node.children ?? []).forEach((child) => walk(child as typeof node));
        };
        walk(layout.root);
        assert.contains(ids.join(','), 'btnDeckClose');

        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const closeBody = lobby.slice(lobby.indexOf('private _closeSortieSetup(): void {'), lobby.indexOf('private _refreshSortieSetup'));
        assert.contains(closeBody, 'this._deckSelect?.close()');
        assert.contains(closeBody, 'this._leadSelect?.host');
        const escBody = lobby.slice(lobby.indexOf('private _onEscapeKeyUp('), lobby.indexOf('private _onEscapeKeyUp(') + 700);
        assert.contains(escBody, 'this._deckSelect?.host');
    });

    return suite;
}
