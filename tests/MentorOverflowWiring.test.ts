/**
 * MentorOverflowWiring.test.ts — 教官卡突破／溢出接線（PROG-2-1095）headless 測試
 *
 * 驗證：重複抽到未滿星卡回報升星事件、滿 ★5 回報溢出積分（依稀有度）、新卡不回報、
 * 錢包有積分欄位且舊檔補 0、大廳依事件入帳並提示。
 */
import { TestSuite, assert } from './TestRunner';
import { addGachaMentorCards, type GachaMentorDuplicateEvent } from '../assets/scripts/core/systems/MentorSupportCatalog';
import { normalizeGachaWalletSave } from '../assets/scripts/core/services/PlayerSaveService';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const TIME = { season: 1, year: 1 };
const POOL = 'mentor-pool';

function catalogOf(rarity: string) {
    // 只用到 byGeneralId 與 support.rarity；其餘欄位交給 mentorCardFromGachaDraw 的預設處理
    const support = { generalId: 'g1', rarity } as unknown;
    return { byGeneralId: new Map([['g1', support]]) } as unknown as Parameters<typeof addGachaMentorCards>[2];
}

function draw(holdings: MentorCard[], rarity: string): { cards: MentorCard[]; events: GachaMentorDuplicateEvent[] } {
    const events: GachaMentorDuplicateEvent[] = [];
    const general = { id: 'g1', name: '趙雲' } as GeneralConfig;
    const cards = addGachaMentorCards(holdings, [general], catalogOf(rarity), TIME as never, POOL, undefined, (e) => events.push(e));
    return { cards, events };
}

export function createMentorOverflowWiringSuite(): TestSuite {
    const suite = new TestSuite('MentorOverflowWiring (教官卡突破／溢出接線 PROG-2-1095)');

    suite.test('第一次抽到不回報；重複抽到未滿星回報升星', () => {
        let r = draw([], 'SSR');
        assert.equals(0, r.events.length);
        assert.equals(1, r.cards.length);
        r = draw(r.cards, 'SSR');
        assert.equals(1, r.events.length);
        const e = r.events[0];
        assert.equals('breakthrough', e.kind);
        if (e.kind === 'breakthrough') assert.equals(e.fromStar + 1, e.toStar);
    });

    suite.test('滿 ★5 再抽到：回報溢出積分，SSR 500／SR 100／R 20', () => {
        for (const [rarity, score] of [['SSR', 500], ['SR', 100], ['R', 20]] as const) {
            const first = draw([], rarity).cards;
            const maxed = first.map((c) => ({ ...c, stars: 5 }));
            const r = draw(maxed, rarity);
            assert.equals(1, r.events.length, rarity);
            const e = r.events[0];
            assert.equals('overflow', e.kind, rarity);
            if (e.kind === 'overflow') assert.equals(score, e.scoreGain, rarity);
            assert.equals(5, r.cards[0].stars ?? 0, rarity);
        }
    });

    suite.test('錢包有積分欄位：開局 0，舊存檔缺欄位補 0', () => {
        assert.equals(0, STARTER_GACHA_WALLET.scorePoints);
        assert.equals(0, normalizeGachaWalletSave({ gems: 1 }).scorePoints);
        assert.equals(320, normalizeGachaWalletSave({ scorePoints: 320 }).scorePoints);
    });

    suite.test('大廳依事件入帳積分並提示升星／轉化', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(src.includes("grantCurrency('scorePoints', event.scoreGain)"));
        assert.isTrue(src.includes('overflowToastText(event.name, event.scoreGain)'));
        assert.isTrue(src.includes('突破 ★${event.fromStar} → ★${event.toStar}'));
    });

    return suite;
}
