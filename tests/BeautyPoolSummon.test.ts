/**
 * BeautyPoolSummon.test.ts — 紅顏池開放召喚（PROG-2-1086）headless 測試
 *
 * MVP 三代循環：第二代成年後要有非親屬的女性可結緣，因此紅顏池必須抽得到、而且候選都是真的女性武將。
 */
import { TestSuite, assert } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { OPENING_BEAUTY_POOL_ID, openingBeautyCandidates } from '../assets/scripts/core/systems/OpeningBeauty';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function beautyGenerals(): GeneralConfig[] {
    const pool = readJson<Array<{ poolId: string; candidateIds: string[] }>>('assets/resources/data/gacha-config.json')
        .find((entry) => entry.poolId === OPENING_BEAUTY_POOL_ID);
    const all = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
    const ids = new Set(openingBeautyCandidates(pool as never, all));
    return all.filter((g) => ids.has(g.id));
}

export function createBeautyPoolSummonSuite(): TestSuite {
    const suite = new TestSuite('BeautyPoolSummon (紅顏池開放召喚 PROG-2-1086)');

    suite.test('紅顏池候選（經別名轉換）全部對得到武將資料，而且都是女性', () => {
        const pool = readJson<Array<{ poolId: string; candidateIds: string[] }>>('assets/resources/data/gacha-config.json')
            .find((entry) => entry.poolId === OPENING_BEAUTY_POOL_ID);
        const generals = beautyGenerals();
        assert.equals(pool?.candidateIds.length, generals.length, '每個候選 id 都要存在');
        for (const g of generals) assert.equals('女', (g as { gender?: string }).gender, `${g.id} 要是女性`);
    });

    suite.test('召喚券抽紅顏池：扣 1 張召喚券，抽到的是紅顏池武將', async () => {
        const generals = beautyGenerals();
        for (const roll of [0.01, 0.5, 0.99]) {
            const service = new LocalGachaService(null, () => roll);
            const before = service.getCurrencyAmount('tickets');
            const results = await service.performPoolTicketSummon(OPENING_BEAUTY_POOL_ID, 1, generals);
            assert.equals(before - 1, service.getCurrencyAmount('tickets'));
            assert.equals(OPENING_BEAUTY_POOL_ID, results[0].poolId);
            assert.equals(true, generals.some((g) => g.id === results[0].general.id));
        }
    });

    return suite;
}
