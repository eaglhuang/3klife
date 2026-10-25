/**
 * MentorSupportRoster.test.ts — 支援卡池內容完整性（PROG-2-1099）
 */
import { TestSuite, assert } from './TestRunner';
import { DEFAULT_SYNERGY_GROUPS } from '../assets/scripts/core/systems/MentorSynergy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const DATA = path.join(__dirname, '..', 'assets/resources/data');
type Entry = { General_ID: string; Support: { Support_ID: string; Rarity: string } };
const cards = JSON.parse(fs.readFileSync(path.join(DATA, 'mentor-support-cards.json'), 'utf8')) as Entry[];
const pools = JSON.parse(fs.readFileSync(path.join(DATA, 'gacha-config.json'), 'utf8')) as { poolId: string; candidateIds: string[] }[];

export function createMentorSupportRosterSuite(): TestSuite {
    const suite = new TestSuite('MentorSupportRoster (支援卡池內容 PROG-2-1099)');
    const ids = new Set(cards.map((c) => c.Support.Support_ID));

    suite.test('羈絆引用的支援卡都存在', () => {
        for (const group of DEFAULT_SYNERGY_GROUPS) {
            for (const partner of group.partners) assert.isTrue(ids.has(partner), `${group.name} 缺 ${partner}`);
        }
    });

    suite.test('支援卡池候選都有支援卡資料', () => {
        const pool = pools.find((p) => p.poolId === 'mentor-pool');
        assert.isTrue(Boolean(pool));
        const generals = new Set(cards.map((c) => c.General_ID));
        for (const id of pool!.candidateIds) assert.isTrue(generals.has(id), `缺 ${id}`);
    });

    suite.test('SSR／SR／R 各至少一張', () => {
        for (const rarity of ['SSR', 'SR', 'R']) {
            assert.isTrue(cards.some((c) => c.Support.Rarity === rarity), rarity);
        }
    });

    return suite;
}
