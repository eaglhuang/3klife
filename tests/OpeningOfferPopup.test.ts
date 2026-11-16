// @spec-source → 新手開場規格書 §10.2、§10.3；OPEN-12；裁決 11/09 第 11 題；PROG-2-2198
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    FRESH_OPENING_OFFER_STATE,
    nextOpeningOffer,
    normalizeOpeningOfferState,
    OPENING_OFFER_SNOOZE_MS,
    parseOpeningOfferTable,
    resolveOpeningOffer,
    type OpeningOfferState,
    type OpeningOfferTable,
} from '../assets/scripts/core/systems/OpeningOffer';
import { OpeningOfferPopupController, openingOfferView } from '../assets/scripts/ui/core/OpeningOfferPopupController';

function loadTable(): OpeningOfferTable {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/opening-offers.json'), 'utf8'));
    const parsed = parseOpeningOfferTable(raw);
    if (!parsed.ok) throw new Error(parsed.issues.join('; '));
    return parsed.table;
}

function layoutIds(): Set<string> {
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        (node.children ?? []).forEach((c) => walk(c as { id?: string; children?: unknown[] }));
    };
    walk(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/ui-spec/layouts/opening-offer-main.json'), 'utf8')).root);
    return ids;
}

const T0 = 1_800_000_000_000;

export function createOpeningOfferPopupSuite(): TestSuite {
    const suite = new TestSuite('OpeningOfferPopup');

    suite.test('兩個都拒絕後 24 小時不彈，過後再推 0.99，再拒絕重新計時', () => {
        const table = loadTable();
        const [premium, icebreaker] = table.offers;
        const ctx = (now: number) => ({ leadSelected: true, tutorialBlocking: false, now });
        let state: OpeningOfferState = { ...FRESH_OPENING_OFFER_STATE };
        const step = (id: string, outcome: 'declined' | 'purchased', now: number): void => {
            const r = resolveOpeningOffer(table, state, id, outcome, true, now);
            if (!r.ok) throw new Error(`回應失敗 ${id}`);
            state = r.state;
        };
        step(premium.id, 'declined', T0);
        assert.equals(undefined, state.snoozeUntil, '高價包被拒不計冷卻');
        assert.equals(icebreaker.id, nextOpeningOffer(table, state, ctx(T0))?.id);
        step(icebreaker.id, 'declined', T0);
        assert.equals(null, nextOpeningOffer(table, state, ctx(T0 + OPENING_OFFER_SNOOZE_MS - 1)));
        assert.equals(icebreaker.id, nextOpeningOffer(table, state, ctx(T0 + OPENING_OFFER_SNOOZE_MS))?.id);
        assert.equals(null, nextOpeningOffer(table, state, { leadSelected: true, tutorialBlocking: false }), '沒給時間不重推');
        assert.equals(null, nextOpeningOffer(table, state, { ...ctx(T0 + OPENING_OFFER_SNOOZE_MS), tutorialBlocking: true }));
        step(icebreaker.id, 'declined', T0 + OPENING_OFFER_SNOOZE_MS);
        assert.equals(T0 + 2 * OPENING_OFFER_SNOOZE_MS, state.snoozeUntil);
        assert.equals(false, resolveOpeningOffer(table, state, icebreaker.id, 'purchased', true, T0 + OPENING_OFFER_SNOOZE_MS).ok, '冷卻中不能回應');
        step(icebreaker.id, 'purchased', T0 + 3 * OPENING_OFFER_SNOOZE_MS);
        assert.equals(icebreaker.id, state.purchased.join(','));
        assert.isFalse(state.declined.includes(icebreaker.id));
        assert.equals(null, nextOpeningOffer(table, state, ctx(T0 + 9 * OPENING_OFFER_SNOOZE_MS)), '買過就不再出');
    });

    suite.test('存檔正規化保留冷卻時間，壞值剔除', () => {
        assert.equals(123, normalizeOpeningOfferState({ declined: [], purchased: [], snoozeUntil: 123.7 }).snoozeUntil);
        assert.equals(undefined, normalizeOpeningOfferState({ snoozeUntil: 'x' }).snoozeUntil);
        assert.equals(undefined, normalizeOpeningOfferState({ snoozeUntil: -5 }).snoozeUntil);
    });

    suite.test('彈窗：view key 對得到版面；婉拒換下一個，最後婉拒關窗；購買記錄並提示', async () => {
        const table = loadTable();
        const ids = layoutIds();
        const view = openingOfferView(table.offers[0]);
        const keys = [...Object.keys(view.texts), ...Object.keys(view.enabled)];
        assert.equals('', keys.filter((k) => !ids.has(k)).join(','));

        let state: OpeningOfferState = { ...FRESH_OPENING_OFFER_STATE };
        let now = T0;
        let ready = false;
        const toasts: string[] = [];
        const host = { node: { active: true }, binder: null };
        const popup = new OpeningOfferPopupController({
            mountHost: async () => host as never,
            apply: () => undefined,
            next: (t) => nextOpeningOffer(table, state, { leadSelected: true, tutorialBlocking: false, now: t }),
            resolve: async (id, outcome, t) => {
                const r = resolveOpeningOffer(table, state, id, outcome, true, t);
                if (r.ok) state = r.state;
                return r.ok;
            },
            now: () => now,
            isReady: () => ready,
            toast: (m) => { toasts.push(m); },
        });
        await popup.mount();
        assert.isFalse(host.node.active);
        assert.isFalse(popup.tryOpen(), '大廳未就緒（載入中）不開窗');
        assert.isFalse(host.node.active);
        ready = true;
        assert.isTrue(popup.tryOpen(), '就緒後才開窗');
        assert.isFalse(popup.tryOpen(), '開著時不重複開');
        assert.equals(table.offers[0].id, popup.offer?.id);
        await popup.respond('declined');
        assert.equals(table.offers[1].id, popup.offer?.id);
        assert.isTrue(host.node.active);
        await popup.respond('declined');
        assert.isFalse(host.node.active);
        assert.isFalse(popup.tryOpen());
        now = T0 + OPENING_OFFER_SNOOZE_MS;
        assert.isTrue(popup.tryOpen());
        await popup.respond('purchased');
        assert.isFalse(host.node.active);
        assert.isFalse(toasts[0].includes('模擬'), '提示不含開發用語');
        assert.equals(table.offers[1].id, state.purchased.join(','));
    });

    suite.test('彈窗文案：沒有開發用語；主按鈕「敬請期待」只關窗、不寫存檔', async () => {
        const table = loadTable();
        const view = openingOfferView(table.offers[0]);
        const all = Object.values(view.texts).join('|');
        assert.isFalse(/Mock|模擬/.test(all), '玩家可見文字不含 Mock／模擬');
        assert.equals('敬請期待', view.texts.offerBuyLabel);
        assert.equals('此禮包尚未開放購買', view.texts.offerMockNote);
        assert.equals('婉拒', view.texts.offerDeclineLabel);
        const layout = fs.readFileSync(path.join(process.cwd(), 'assets/resources/ui-spec/layouts/opening-offer-main.json'), 'utf8');
        assert.isFalse(/模擬購買/.test(layout), '版面預設字也不含模擬購買');

        let state: OpeningOfferState = { ...FRESH_OPENING_OFFER_STATE };
        const handlers: Record<string, () => void> = {};
        const host = { node: { active: false }, binder: null };
        let resolves = 0;
        const popup = new OpeningOfferPopupController({
            mountHost: async (bindings) => { bindings.forEach((b) => { handlers[b.buttonId] = b.handler; }); return host as never; },
            apply: () => undefined,
            next: (t) => nextOpeningOffer(table, state, { leadSelected: true, tutorialBlocking: false, now: t }),
            resolve: async () => { resolves++; return true; },
            now: () => T0,
            isReady: () => true,
            toast: () => undefined,
        });
        await popup.mount();
        assert.isTrue(popup.tryOpen());
        handlers.btnOfferBuy();
        assert.isFalse(host.node.active, '敬請期待只關窗');
        assert.equals(0, resolves, '不寫任何購買紀錄');
        assert.isFalse(popup.tryOpen(), '同一次大廳不重彈');
        assert.equals(0, state.purchased.length);
    });

    return suite;
}
