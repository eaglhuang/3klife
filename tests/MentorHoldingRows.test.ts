/**
 * MentorHoldingRows.test.ts — 我的教官卡列表列資料（PROG-2-1097）
 */
import { TestSuite, assert } from './TestRunner';
import { mentorHoldingRows } from '../assets/scripts/ui/core/MentorHoldingRows';
import { MentorHoldingsController, type MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function card(uid: string, name: string, rarity: string, stars: number): MentorCard {
    return {
        uid, name, sourceGeneralId: uid, faction: 'wei', retiredAge: 65, retiredSeason: 1, retiredYear: 1,
        ep_snapshot: 50, gene_refs: [], parentUids: ['', ''],
        generalSnapshot: { id: uid, name, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 50 } as never,
        stars, support: { rarity, tacticInspireEvents: [], friendshipBonus: [1] } as never,
    } as MentorCard;
}

export function createMentorHoldingRowsSuite(): TestSuite {
    const suite = new TestSuite('MentorHoldingRows (我的教官卡列表 PROG-2-1097)');

    suite.test('稀有度高者在前，同稀有度星等高者在前', () => {
        const rows = mentorHoldingRows([card('a', '甲', 'R', 3), card('b', '乙', 'SSR', 1), card('c', '丙', 'SSR', 4)]);
        assert.equals('丙,乙,甲', rows.map((r) => r.name).join(','));
    });

    suite.test('列文字含稀有度、星等、專長與 TP', () => {
        const [row] = mentorHoldingRows([card('a', '趙雲', 'SSR', 2)]);
        assert.isTrue(row.text.startsWith('趙雲　SSR　★2'), row.text);
        assert.isTrue(row.text.includes('專長 ') && row.text.includes('TP +'), row.text);
    });

    suite.test('大廳「支援」改開教官卡列表，不再開不存在的預製件', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(src.includes('void this._mentorHoldings?.open()'));
        assert.isTrue(!src.includes('openAsync(UIID.SupportCard)'));
    });

    function harness(cards: MentorCard[]) {
        const log = { toasts: [] as string[], opened: [] as string[], texts: {} as Record<string, string>, actives: {} as Record<string, boolean>, front: 0 };
        let bindings: MentorHoldingsButtonBinding[] = [];
        const host = {
            node: { active: true },
            binder: {
                setTexts: (t: Record<string, string>) => { Object.assign(log.texts, t); },
                setActives: (a: Record<string, boolean>) => { Object.assign(log.actives, a); },
            },
        };
        const ctrl = new MentorHoldingsController({
            mountHost: async (b) => { bindings = b; return host; },
            loadCards: async () => cards,
            breedText: () => ((key: string) => key) as never,
            openDetail: (_card, title) => { log.opened.push(title); },
            bringToFront: () => { log.front++; },
            toast: (m) => { log.toasts.push(m); },
        });
        const click = (id: string) => bindings.find((b) => b.buttonId === id)?.handler();
        return { ctrl, host, log, click };
    }

    suite.test('控制器：掛載後隱藏，沒卡時只提示不開畫面', async () => {
        const h = harness([]);
        await h.ctrl.mount();
        assert.isFalse(h.host.node.active);
        await h.ctrl.open();
        assert.isFalse(h.host.node.active);
        assert.equals(1, h.log.toasts.length);
    });

    suite.test('控制器：有卡時開畫面、置頂、分頁並點列開詳情', async () => {
        const cards = Array.from({ length: 7 }, (_, i) => card(`u${i}`, `將${i}`, 'R', i));
        const h = harness(cards);
        await h.ctrl.mount();
        await h.ctrl.open();
        assert.isTrue(h.host.node.active);
        assert.equals(1, h.log.front);
        assert.equals('我的教官卡（7 張）', h.log.texts.borrowTitle);
        assert.equals('1 / 2', h.log.texts.borrowPage);
        h.click('btnBorrowNext');
        assert.equals('2 / 2', h.log.texts.borrowPage);
        assert.isFalse(h.log.actives.borrowRow2Box);
        h.click('btnBorrowRow0');
        assert.equals(1, h.log.opened.length);
        h.click('btnBorrowClose');
        assert.isFalse(h.host.node.active);
    });

    return suite;
}
