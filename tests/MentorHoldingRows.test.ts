/**
 * MentorHoldingRows.test.ts — 我的教官卡列表列資料（PROG-2-1097）
 */
import { TestSuite, assert } from './TestRunner';
import { mentorHoldingRows } from '../assets/scripts/ui/core/MentorHoldingRows';
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
        assert.isTrue(src.includes('void this._openMentorHoldings()'));
        assert.isTrue(!src.includes('openAsync(UIID.SupportCard)'));
    });

    return suite;
}
