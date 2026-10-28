/**
 * LimitedPoolGachaFlow.test.ts — 限定池排程接上轉蛋服務（GCH-12 / PROG-2-1072）
 *
 * 鎖住：
 *   1. 限定池只在時間窗內可抽；時間窗外（含結束時刻）拒絕
 *   2. 銅錢符（bronze）不能用於限定池；靈玉（gems）可以
 *   3. 沒有任何限定池設定時，既有池子行為不變
 *   4. 排程設定 JSON 解析：格式不合的項目略過；repo 內的預設設定為空
 *
 * 暫定：限定池時間窗資料由 assets/resources/data/limited-pool-schedule.json 提供，預設為空陣列；真實資料待使用者裁決。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService, type LocalGachaRollOptions, type GachaSaveStore } from '../assets/scripts/core/services/LocalGachaService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { parseLimitedPoolWindows, type LimitedPoolWindow } from '../assets/scripts/core/systems/LimitedPoolSchedule';
import { sys } from 'cc';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const LIMITED: LimitedPoolWindow = { poolId: 'LIMITED_01', startMs: 1000, endMs: 2000, featuredGeneralIds: ['g0'] };

function resetSyncDevice(): void {
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
}

function makeSaveStore(): GachaSaveStore {
    let pity: Parameters<GachaSaveStore['writePity']>[0] | null = null;
    let wallet: ReturnType<GachaSaveStore['readWallet']> = null;
    return {
        readPity: () => pity,
        writePity: (next) => { pity = next; },
        readWallet: () => wallet,
        writeWallet: (next) => { wallet = next; },
    };
}

function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function makeGenerals(): GeneralConfig[] {
    const out: GeneralConfig[] = [];
    for (let i = 0; i < 20; i++) {
        out.push({ id: `g${i}`, name: `n${i}`, faction: 'player', rarityTier: i < 2 ? 'legendary' : 'common' } as unknown as GeneralConfig);
    }
    return out;
}

function limitedService(): LocalGachaService {
    const svc = new LocalGachaService(makeSaveStore());
    svc.setLimitedPoolWindows([LIMITED]);
    return svc;
}

/** 直接走服務層的結算入口，讓貨幣鍵可以指定（公開方法只提供票券）。 */
function summonWith(svc: LocalGachaService, currencyKey: string, poolId: string, options: LocalGachaRollOptions) {
    return (svc as unknown as {
        _performGacha: (request: unknown) => Promise<unknown[]>;
    })._performGacha({
        actionType: 'LOCAL_TICKET_SUMMON', poolId, drawCount: 1, cost: 1, currencyKey,
        generals: makeGenerals(), options,
    });
}

async function rejects(promise: Promise<unknown>): Promise<boolean> {
    try {
        await promise;
        return false;
    } catch {
        return true;
    }
}

export function createLimitedPoolGachaFlowSuite(): TestSuite {
    const suite = new TestSuite('LimitedPoolGachaFlow (限定池排程接上轉蛋 GCH-12)');

    suite.test('限定池時間窗外拒絕抽卡，窗內可抽', async () => {
        resetSyncDevice();
        const svc = limitedService();
        svc.grantCurrency('tickets', 10);
        assert.isTrue(await rejects(summonWith(svc, 'tickets', 'LIMITED_01', { rng: lcg(1), nowMs: 500 })), '窗前應拒絕');
        assert.isTrue(await rejects(summonWith(svc, 'tickets', 'LIMITED_01', { rng: lcg(1), nowMs: 2000 })), '窗後（不含結束時刻）應拒絕');
        const results = await summonWith(svc, 'tickets', 'LIMITED_01', { rng: lcg(1), nowMs: 1500 });
        assert.equals(1, (results as unknown[]).length);
    });

    suite.test('銅錢符不能用於限定池；靈玉可以', async () => {
        resetSyncDevice();
        const svc = limitedService();
        svc.grantCurrency('bronze', 1500);
        svc.grantCurrency('gems', 1280);
        assert.isTrue(await rejects(summonWith(svc, 'bronze', 'LIMITED_01', { rng: lcg(3), nowMs: 1500 })), '銅錢符應被限定池擋下');
        assert.isFalse(await rejects(summonWith(svc, 'gems', 'LIMITED_01', { rng: lcg(4), nowMs: 1500 })), '靈玉應可用於限定池');
    });

    suite.test('沒有任何限定池設定時，既有池子照常抽卡', async () => {
        resetSyncDevice();
        const svc = new LocalGachaService(makeSaveStore());
        svc.grantCurrency('tickets', 5);
        const results = await svc.performPoolTicketSummon('GENERAL_STANDARD_01', 2, makeGenerals(), { rng: lcg(5) });
        assert.equals(2, results.length);
    });

    suite.test('排程解析：格式不合或時間窗無效的項目略過', () => {
        const parsed = parseLimitedPoolWindows({
            windows: [
                LIMITED,
                { poolId: '', startMs: 1, endMs: 2, featuredGeneralIds: [] },
                { poolId: 'X', startMs: 5, endMs: 5, featuredGeneralIds: [] },
                { poolId: 'Y', startMs: 1, endMs: 2, featuredGeneralIds: [1] },
                null,
            ],
        });
        assert.equals(1, parsed.length);
        assert.equals('LIMITED_01', parsed[0].poolId);
        assert.equals(0, parseLimitedPoolWindows(null).length);
    });

    suite.test('repo 內的預設排程設定可解析且為空（真實時間窗待裁決）', () => {
        const file = path.resolve(__dirname, '../assets/resources/data/limited-pool-schedule.json');
        const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
        assert.equals(0, parseLimitedPoolWindows(raw).length);
    });

    return suite;
}
