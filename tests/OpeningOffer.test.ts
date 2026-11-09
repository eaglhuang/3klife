/**
 * OpeningOffer — 開場商業序列（OPEN-12）的 headless 測試
 *
 * 鎖住：拒絕高價包後才出破冰包、教學在前景不彈、買過或拒絕過不再出現、資料檔與 GameSession 存讀檔。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    FRESH_OPENING_OFFER_STATE,
    nextOpeningOffer,
    normalizeOpeningOfferState,
    parseOpeningOfferTable,
    resolveOpeningOffer,
    type OpeningOfferTable,
} from '../assets/scripts/core/systems/OpeningOffer';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

const DATA = path.resolve(__dirname, '..', 'assets/resources/data/opening-offers.json');
const readRaw = (): any => JSON.parse(fs.readFileSync(DATA, 'utf8'));

function loadTable(): OpeningOfferTable {
    const parsed = parseOpeningOfferTable(readRaw());
    if (!parsed.ok) throw new Error(parsed.issues.join('; '));
    return parsed.table;
}

const OPEN = { leadSelected: true, tutorialBlocking: false };

export function createOpeningOfferSuite(): TestSuite {
    const suite = new TestSuite('OpeningOffer');

    suite.test('資料檔通過驗證：先 29.99、被拒絕後才 0.99', () => {
        const table = loadTable();
        assert.equals(29.99, table.offers[0].price);
        assert.equals('lead-selected', table.offers[0].trigger);
        assert.equals(0.99, table.offers[1].price);
        assert.equals(table.offers[0].id, table.offers[1].after);
    });

    suite.test('驗證：缺條件、同時有兩種條件、after 指向後面或不存在、id 重複、價格非正都會被拒', () => {
        const base = { id: 'a', price: 1, quote: 'q', trigger: 'lead-selected' };
        const bad: unknown[] = [
            null,
            { offers: [] },
            { offers: [{ id: 'a', price: 1, quote: 'q' }] },
            { offers: [{ ...base, after: 'x' }] },
            { offers: [{ id: 'b', price: 1, quote: 'q', after: 'a' }, base] },
            { offers: [base, base] },
            { offers: [{ ...base, price: 0 }] },
            { offers: [{ ...base, trigger: 'unknown' }] },
            { offers: [{ ...base, quote: '' }] },
        ];
        for (const raw of bad) assert.equals(false, parseOpeningOfferTable(raw).ok, JSON.stringify(raw));
        assert.equals(true, parseOpeningOfferTable({ offers: [base] }).ok);
    });

    suite.test('尚未選定名將時不出商品；選定後出高價包', () => {
        const table = loadTable();
        assert.equals(null, nextOpeningOffer(table, FRESH_OPENING_OFFER_STATE, { ...OPEN, leadSelected: false }));
        assert.equals(table.offers[0].id, nextOpeningOffer(table, FRESH_OPENING_OFFER_STATE, OPEN)?.id);
    });

    suite.test('教學在前景時不出任何商品，結束後才出', () => {
        const table = loadTable();
        const blocked = { ...OPEN, tutorialBlocking: true };
        assert.equals(null, nextOpeningOffer(table, FRESH_OPENING_OFFER_STATE, blocked));
        const declined = resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, table.offers[0].id, 'declined', true);
        if (!declined.ok) throw new Error('應可拒絕');
        assert.equals(null, nextOpeningOffer(table, declined.state, blocked));
        assert.equals(table.offers[1].id, nextOpeningOffer(table, declined.state, OPEN)?.id);
    });

    suite.test('買下高價包不出破冰包；破冰包回應後序列結束', () => {
        const table = loadTable();
        const bought = resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, table.offers[0].id, 'purchased', true);
        if (!bought.ok) throw new Error('應可購買');
        assert.equals(null, nextOpeningOffer(table, bought.state, OPEN));

        const declined = resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, table.offers[0].id, 'declined', true);
        if (!declined.ok) throw new Error('應可拒絕');
        const finished = resolveOpeningOffer(table, declined.state, table.offers[1].id, 'declined', true);
        if (!finished.ok) throw new Error('應可拒絕破冰包');
        assert.equals(null, nextOpeningOffer(table, finished.state, OPEN));
    });

    suite.test('回應會擋掉：未知商品、跳過序列、重複回應、尚未選定名將', () => {
        const table = loadTable();
        const [premium, icebreaker] = table.offers;
        assert.equals(false, resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, 'nope', 'declined', true).ok);
        assert.equals(false, resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, icebreaker.id, 'purchased', true).ok);
        assert.equals(false, resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, premium.id, 'declined', false).ok);
        const declined = resolveOpeningOffer(table, FRESH_OPENING_OFFER_STATE, premium.id, 'declined', true);
        if (!declined.ok) throw new Error('應可拒絕');
        assert.equals(false, resolveOpeningOffer(table, declined.state, premium.id, 'declined', true).ok);
    });

    suite.test('正規化：壞資料變空紀錄、去重、兩邊都有時以已購買為準', () => {
        assert.equals(JSON.stringify({ declined: [], purchased: [] }), JSON.stringify(normalizeOpeningOfferState('bad')));
        assert.equals(JSON.stringify({ declined: [], purchased: [] }), JSON.stringify(normalizeOpeningOfferState(null)));
        assert.equals(
            JSON.stringify({ declined: ['a'], purchased: ['b'] }),
            JSON.stringify(normalizeOpeningOfferState({ declined: ['a', 'a', 'b', 1, ''], purchased: ['b'] })),
        );
    });

    suite.test('GameSession：序列讀主將狀態，回應後存檔再讀回', () => {
        const table = loadTable();
        const session = new GameSession();
        (session as any)._leadGeneralId = null;
        assert.equals(null, session.nextOpeningOffer(table, false));
        assert.equals(false, session.resolveOpeningOffer(table, table.offers[0].id, 'declined'));

        (session as any)._leadGeneralId = 'cao-cao';
        assert.equals(table.offers[0].id, session.nextOpeningOffer(table, false)?.id);
        assert.equals(null, session.nextOpeningOffer(table, true));
        assert.equals(true, session.resolveOpeningOffer(table, table.offers[0].id, 'declined'));
        assert.equals(table.offers[1].id, session.nextOpeningOffer(table, false)?.id);

        const fields = (session as any).lifespanSaveFields();
        assert.equals(JSON.stringify({ declined: [table.offers[0].id], purchased: [] }), JSON.stringify(fields.openingOffers));

        const reloaded = new GameSession();
        (reloaded as any)._leadGeneralId = 'cao-cao';
        reloaded.restoreLifespanState(fields as any);
        assert.equals(table.offers[1].id, reloaded.nextOpeningOffer(table, false)?.id);
    });

    suite.test('GameSession：沒有紀錄時存檔不寫欄位', () => {
        const fields = (new GameSession() as any).lifespanSaveFields();
        assert.equals(undefined, fields.openingOffers);
    });

    return suite;
}
