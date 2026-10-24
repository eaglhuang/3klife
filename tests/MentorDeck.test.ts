/**
 * MentorDeck.test.ts — 培育入場教官編成與支援卡池（PROG-2-1085）headless 測試
 *
 * 驗證：預設編成挑最強 5 位、點格輪換不重複、失效卡自動清空；
 * 支援卡池抽到重複教官改為升星；開局錢包有 5 張支援券，支援召喚扣支援券。
 */
import { TestSuite, assert } from './TestRunner';
import {
    MENTOR_DECK_SIZE, cycleMentorDeckSlot, defaultMentorDeck, emptyMentorDeck, mentorDeckCards, sanitizeMentorDeck,
} from '../assets/scripts/core/systems/MentorDeck';
import { MENTOR_POOL_ID, SUPPORT_CARD_POOL_IDS, addGachaMentorCards, parseSupportCatalog } from '../assets/scripts/core/systems/MentorSupportCatalog';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function card(id: string, ep: number, stars = 0): MentorCard {
    return {
        uid: `mentor-${id}`, sourceGeneralId: id, name: id, faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: ep, gene_refs: [],
        parentUids: ['f', 'm'], generalSnapshot: {} as GeneralConfig, stars,
    };
}

function general(id: string): GeneralConfig {
    return { id, name: id } as GeneralConfig;
}

export function createMentorDeckSuite(): TestSuite {
    const suite = new TestSuite('MentorDeck (培育入場 5 張教官編成 PROG-2-1085)');

    suite.test('預設編成：星等優先、EP 次之挑最強 5 位，不足留空', () => {
        const cards = [card('a', 50), card('b', 90), card('c', 10, 2), card('d', 70), card('e', 60), card('f', 40)];
        assert.equals(['mentor-c', 'mentor-b', 'mentor-d', 'mentor-e', 'mentor-a'].join(), defaultMentorDeck(cards).join());
        const few = defaultMentorDeck([card('a', 1)]);
        assert.equals(MENTOR_DECK_SIZE, few.length);
        assert.equals('mentor-a', few[0]);
        assert.equals(null, few[1]);
    });

    suite.test('點格輪換：跳過其他格已用的教官，最後回到空格', () => {
        const cards = [card('a', 1), card('b', 2), card('c', 3)];
        let deck = cycleMentorDeckSlot(emptyMentorDeck(), cards, 0);
        assert.equals('mentor-a', deck[0]);
        deck = cycleMentorDeckSlot(deck, cards, 1);
        assert.equals('mentor-b', deck[1], '格 1 跳過格 0 用掉的 a');
        deck = cycleMentorDeckSlot(deck, cards, 0);
        assert.equals('mentor-c', deck[0], '格 0 跳過 b');
        deck = cycleMentorDeckSlot(deck, cards, 0);
        assert.equals(null, deck[0], '最後一位之後回到空格');
        assert.equals(['mentor-b'].join(), mentorDeckCards(deck, cards).map((c) => c.uid).join());
    });

    suite.test('卡片消失或重複時編成自動清成空格', () => {
        const deck = sanitizeMentorDeck(['mentor-a', 'mentor-x', 'mentor-a', null, null], [card('a', 1)]);
        assert.equals(['mentor-a', null, null, null, null].join(), deck.join());
    });

    suite.test('支援卡池：設定檔有 mentor-pool，抽到已持有教官改為升星（上限 5）', () => {
        assert.equals(true, SUPPORT_CARD_POOL_IDS.includes(MENTOR_POOL_ID));
        const pools = readJson<Array<{ poolId: string; currencyType: string; candidateIds: string[] }>>('assets/resources/data/gacha-config.json');
        const pool = pools.find((p) => p.poolId === MENTOR_POOL_ID);
        assert.equals('mentorTicket', pool?.currencyType);
        const catalog = parseSupportCatalog(readJson('assets/resources/data/mentor-support-cards.json'));
        for (const id of pool?.candidateIds ?? []) assert.equals(true, catalog.byGeneralId.has(id), `${id} 要有支援卡資料`);
        const time = { currentYear: 1, currentSeason: 1 };
        const zhao = general('zhao-yun');
        let cards = addGachaMentorCards([], [zhao], catalog, time, MENTOR_POOL_ID);
        assert.equals(1, cards.length);
        for (let i = 0; i < 7; i++) cards = addGachaMentorCards(cards, [zhao], catalog, time, MENTOR_POOL_ID);
        assert.equals(1, cards.length, '重複不新增卡');
        assert.equals(5, cards[0].stars ?? 0, '升星封頂 5');
        assert.equals(0, addGachaMentorCards([], [zhao], catalog, time, 'hero-pool').length, '名將池不發教官卡');
    });

    suite.test('開局送 5 張支援券；支援召喚扣支援券、不扣靈玉', async () => {
        assert.equals(5, STARTER_GACHA_WALLET.mentorTickets);
        const service = new LocalGachaService(null, () => 0.1);
        const gems = service.getCurrencyAmount('gems');
        const before = service.getCurrencyAmount('mentorTickets');
        const results = await service.performSupportCardSummon(MENTOR_POOL_ID, 1, [general('zhao-yun'), general('zhuge-liang')]);
        assert.equals(1, results.length);
        assert.equals(before - 1, service.getCurrencyAmount('mentorTickets'));
        assert.equals(gems, service.getCurrencyAmount('gems'));
    });

    suite.test('支援卡池沒有 R 卡：擲到 R 也會往上遞補抽到教官，不報錯', async () => {
        const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json')
            .filter((g) => g.id === 'zhao-yun' || g.id === 'zhuge-liang');
        assert.equals(2, generals.length);
        const service = new LocalGachaService(null, () => 0.99);
        const results = await service.performSupportCardSummon(MENTOR_POOL_ID, 1, generals);
        assert.equals(true, ['zhao-yun', 'zhuge-liang'].includes(results[0].general.id));
    });

    return suite;
}
