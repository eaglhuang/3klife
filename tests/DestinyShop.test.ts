/**
 * DestinyShop.test.ts — 天命商店（大保底兌換）headless 測試（PROG-2-1157）
 *
 * 驗證：每 200 抽 1 次資格、兌換只能選本池 SSR、兌換不動累計抽數、各池保底分開，
 * 以及服務層兌換後入冊並寫回保底。
 * Unity 對照：EditMode Test，直接驅動純邏輯與 Service，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { sys } from 'cc';
import { destinyShopCredits, exchangeDestinyShop, pullsToNextDestinyCredit, DESTINY_SHOP_PULLS_PER_EXCHANGE } from '../assets/scripts/core/systems/DestinyShop';
import { drawGeneralOnce, normalizeGachaPity, type GachaPityBook } from '../assets/scripts/core/systems/GachaDraw';
import { LocalGachaService, type LocalGachaResultEntry, type LocalGachaWalletSnapshot } from '../assets/scripts/core/services/LocalGachaService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGenerals(): GeneralConfig[] {
    const out: GeneralConfig[] = [];
    for (let i = 0; i < 40; i++) {
        out.push({ id: `g${i}`, name: `n${i}`, faction: 'player', rarityTier: i < 3 ? 'legendary' : i < 10 ? 'epic' : 'common' } as unknown as GeneralConfig);
    }
    return out;
}

function makeSaveStore(pity: GachaPityBook | null) {
    let book = pity;
    let wallet: LocalGachaWalletSnapshot | null = null;
    const enrolled: LocalGachaResultEntry[] = [];
    return {
        enrolled,
        book: () => book,
        readPity: () => book,
        writePity: (next: GachaPityBook) => { book = next; },
        readWallet: () => wallet,
        writeWallet: (next: LocalGachaWalletSnapshot) => { wallet = next; },
        enroll: (results: readonly LocalGachaResultEntry[]) => { enrolled.push(...results); },
    };
}

export function createDestinyShopSuite(): TestSuite {
    const suite = new TestSuite('DestinyShop (天命商店 大保底兌換 PROG-2-1157)');

    suite.test('每滿 200 抽得 1 次資格；扣掉已兌換次數，不會是負數', () => {
        assert.equals(200, DESTINY_SHOP_PULLS_PER_EXCHANGE);
        assert.equals(0, destinyShopCredits({ pullCount: 199 }));
        assert.equals(1, destinyShopCredits({ pullCount: 200 }));
        assert.equals(2, destinyShopCredits({ pullCount: 450 }));
        assert.equals(1, destinyShopCredits({ pullCount: 450, destinyExchanges: 1 }));
        assert.equals(0, destinyShopCredits({ pullCount: 200, destinyExchanges: 3 }));
        assert.equals(0, destinyShopCredits(undefined));
        assert.equals(1, pullsToNextDestinyCredit({ pullCount: 199 }));
        assert.equals(200, pullsToNextDestinyCredit({ pullCount: 200 }));
    });

    suite.test('兌換：只能選本池 SSR；成功後已兌換 +1、累計抽數不變', () => {
        const pool = ['ssr', 'sr', 'r'];
        assert.equals('no-credit', exchangeDestinyShop({ pullCount: 10 }, 'ssr', pool, ['ssr']).reason!);
        assert.equals('not-in-pool', exchangeDestinyShop({ pullCount: 200 }, 'other', pool, ['ssr']).reason!);
        assert.equals('not-ssr', exchangeDestinyShop({ pullCount: 200 }, 'sr', pool, ['ssr']).reason!);
        const ok = exchangeDestinyShop({ pullCount: 230 }, 'ssr', pool, ['ssr']);
        assert.isTrue(ok.reason === null);
        assert.equals(230, ok.nextPity!.pullCount);
        assert.equals(1, ok.nextPity!.destinyExchanges!);
        assert.equals(0, destinyShopCredits(ok.nextPity));
    });

    suite.test('保底狀態：舊資料沒有兌換次數視為 0 且不寫出欄位；抽卡保留已兌換次數', () => {
        assert.isFalse('destinyExchanges' in normalizeGachaPity({ pullCount: 5 }));
        assert.equals(2, normalizeGachaPity({ pullCount: 5, destinyExchanges: 2 }).destinyExchanges!);
        assert.isFalse('destinyExchanges' in normalizeGachaPity({ pullCount: 5, destinyExchanges: -1 }));
        const pool = { ssrUp: [], ssrOther: ['a'], srUp: [], srOther: ['b'], rOther: ['c'] };
        const drawn = drawGeneralOnce(pool, { pullCount: 200, destinyExchanges: 1 }, () => 0.5);
        assert.equals(201, drawn.nextPity.pullCount);
        assert.equals(1, drawn.nextPity.destinyExchanges!);
    });

    suite.test('服務層：200 抽資格兌換 SSR 入冊並寫回保底；資格用完再換被擋、不入冊', () => {
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const store = makeSaveStore({ GENERAL_STANDARD_01: { pullCount: 200 }, OTHER_POOL: { pullCount: 0 } });
        const svc = new LocalGachaService(store);
        const generals = makeGenerals();
        assert.equals(1, svc.getDestinyShopCredits('GENERAL_STANDARD_01'));
        assert.equals(0, svc.getDestinyShopCredits('OTHER_POOL'), '各池資格分開');

        assert.equals('not-ssr', svc.exchangeDestinyShop('GENERAL_STANDARD_01', generals, 'g5').reason!);
        assert.equals(0, store.enrolled.length, '被擋時不入冊');

        const result = svc.exchangeDestinyShop('GENERAL_STANDARD_01', generals, 'g1');
        assert.equals('g1', result.entry!.general.id);
        assert.equals(1, store.enrolled.length);
        assert.equals(200, store.book()!.GENERAL_STANDARD_01.pullCount, '兌換不動累計抽數');
        assert.equals(1, store.book()!.GENERAL_STANDARD_01.destinyExchanges!);
        assert.equals(0, svc.getDestinyShopCredits('GENERAL_STANDARD_01'));

        assert.equals('no-credit', svc.exchangeDestinyShop('GENERAL_STANDARD_01', generals, 'g2').reason!);
        assert.equals(1, store.enrolled.length);
    });

    return suite;
}
