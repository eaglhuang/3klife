/**
 * GachaPityMigration.test.ts — GCH-R5（PROG-2-9464）：舊保底存檔轉 reward.pity、天命商店額度改讀 reward.pity
 *
 * 三種舊存檔：（A）只有 pullCount、（B）含 lastSsrPull、（C）含 destinyExchanges；另測冪等、新路徑已抽過的混合存檔、
 * 轉完後經共通 API 看到的進度（reward.pity）與兌換（reward.pity.redeem）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { migrateLegacyPity } from '../assets/scripts/core/gacha/GachaPityMigration';
import { createGeneralGrantHandler, RewardGachaPort } from '../assets/scripts/core/gacha/RewardGachaPull';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { buildRewardPools, legacyPoolIdsOf } from '../assets/scripts/shared/reward/RewardRoster';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = { gems: 50000, bronze: 50000, tickets: 100 };
    public balance(c: string): number { return this.bag[c] ?? 0; }
    public spend(c: string, a: number): boolean { if (this.balance(c) < a) return false; this.bag[c] = this.balance(c) - a; return true; }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(c: string, a: number): void { this.bag[c] = this.balance(c) + a; }
}

function rig() {
    const generals = readJson('assets/resources/data/generals.json') as GeneralConfig[];
    const poolsRaw = readJson('assets/resources/data/gacha-reward-pools.json');
    const base = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));
    const pools = buildRewardPools(poolsRaw, generals);
    const legacyIds = legacyPoolIdsOf(poolsRaw);
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const reward = new MemoryReward();
    bundle.setWallet(new FakeWallet());
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig({ ...base, pools: [...base.pools, ...pools] });
    bundle.setRewardHooks({ entropy: () => 'r5-entropy' });
    const byId = new Map(generals.map((g) => [g.id, g]));
    bundle.registerRewardEffect('general', createGeneralGrantHandler({ resolve: (id) => byId.get(id) ?? null, enroll: () => ({ duplicate: false }) }));
    const port = new RewardGachaPort(bundle.api, legacyIds, { resolveGeneral: (id) => byId.get(id) ?? null });
    const migrate = (book: unknown) => {
        const out = migrateLegacyPity(book, reward.rewardMeta, pools, legacyIds);
        reward.setMeta(out.meta);
        return out;
    };
    return { reward, port, migrate, pools };
}

const MAIN = 'GENERAL_STANDARD_01';

export function createGachaPityMigrationSuite(): TestSuite {
    const suite = new TestSuite('GachaPityMigration（GCH-R5 保底存檔遷移）');

    suite.test('獎池 JSON 帶累計計數（名將池與紅顏池各一條，每 200 抽）', () => {
        const { pools } = rig();
        for (const id of ['POOL_GENERAL_MAIN', 'POOL_HEROINE']) {
            const pool = pools.find((p) => p.id === id)!;
            assert.equals(1, pool.tallies.length);
            assert.equals(200, pool.tallies[0].creditEvery);
        }
    });

    suite.test('舊存檔 A（只有 pullCount）：SSR 階梯夾上限、SR 階梯為累計 mod 50 夾上限、累計計數原樣', async () => {
        const { reward, migrate, port } = rig();
        const out = migrate({ [MAIN]: { pullCount: 130 } });
        assert.equals(MAIN, out.migrated.join(','));
        assert.equals(89, reward.rewardMeta.pity['gacha.general.ssr']);
        assert.equals(9, reward.rewardMeta.pity['gacha.general.sr']);
        assert.equals(130, reward.rewardMeta.pity['gacha.general.pulls']);
        assert.equals(undefined, reward.rewardMeta.pity['gacha.general.exchanged']);
        const tally = await port.tally(MAIN);
        assert.equals(130, tally?.count);
        assert.equals(0, tally?.credits);
        assert.equals(70, tally?.toNext);
    });

    suite.test('舊存檔 B（含 lastSsrPull）：SSR 階梯為累計減上次出 SSR 的抽數', () => {
        const { reward, migrate } = rig();
        migrate({ [MAIN]: { pullCount: 120, lastSsrPull: 100 } });
        assert.equals(20, reward.rewardMeta.pity['gacha.general.ssr']);
        assert.equals(9, reward.rewardMeta.pity['gacha.general.sr']);
        assert.equals(120, reward.rewardMeta.pity['gacha.general.pulls']);
        const small = rig();
        small.migrate({ [MAIN]: { pullCount: 52, lastSsrPull: 51 } });
        assert.equals(1, small.reward.rewardMeta.pity['gacha.general.ssr']);
        assert.equals(2, small.reward.rewardMeta.pity['gacha.general.sr']);
    });

    suite.test('舊存檔 C（含 destinyExchanges）：兌換次數保留，額度經 reward.pity 讀取，redeem 扣一次', async () => {
        const { reward, migrate, port } = rig();
        migrate({ [MAIN]: { pullCount: 640, lastSsrPull: 600, destinyExchanges: 1 } });
        assert.equals(1, reward.rewardMeta.pity['gacha.general.exchanged']);
        const before = await port.tally(MAIN);
        assert.equals(2, before?.credits);
        assert.equals(160, before?.toNext);
        assert.isTrue(await port.redeem(MAIN, 'a'));
        const after = await port.tally(MAIN);
        assert.equals(1, after?.credits);
        assert.equals(2, after?.spent);
        assert.equals(640, after?.count);
        assert.isTrue(await port.redeem(MAIN, 'b'));
        assert.isTrue(!(await port.redeem(MAIN, 'c')));
        assert.equals(0, (await port.tally(MAIN))?.credits);
    });

    suite.test('只轉一次：重跑不重複加；沒有舊資料的池只留標記', () => {
        const { reward, migrate } = rig();
        const book = { [MAIN]: { pullCount: 40, destinyExchanges: 0 } };
        migrate(book);
        const again = migrate(book);
        assert.equals(0, again.migrated.length);
        assert.equals(40, reward.rewardMeta.pity['gacha.general.pulls']);
        assert.equals(1, reward.rewardMeta.pity['gacha.migrated.support-pool']);
        assert.equals(undefined, reward.rewardMeta.pity['gacha.heroine.pulls']);
    });

    suite.test('壞資料與空存檔：不丟錯、不寫計數', () => {
        const { reward, migrate } = rig();
        for (const bad of [null, undefined, 'x', [], { [MAIN]: { pullCount: -3 } }, { [MAIN]: 5 }]) migrate(bad);
        assert.equals(undefined, reward.rewardMeta.pity['gacha.general.pulls']);
    });

    suite.test('新路徑已先抽過再遷移：階梯保留現值、累計相加，舊抽數不遺失', async () => {
        const { reward, migrate, port } = rig();
        await port.pull({ poolId: MAIN, count: 3, currency: 'bronze', cost: 450 });
        const sr = reward.rewardMeta.pity['gacha.general.sr'] ?? 0;
        assert.equals(3, reward.rewardMeta.pity['gacha.general.pulls']);
        migrate({ [MAIN]: { pullCount: 100, lastSsrPull: 90 } });
        assert.equals(103, reward.rewardMeta.pity['gacha.general.pulls']);
        assert.equals(sr, reward.rewardMeta.pity['gacha.general.sr'] ?? 0);
    });

    suite.test('抽卡累計：十連加 10；抽滿 200 得 1 次資格', async () => {
        const { port } = rig();
        for (let i = 0; i < 20; i += 1) await port.pull({ poolId: MAIN, count: 10, currency: 'bronze', cost: 1500, requestId: 'p' + i });
        const tally = await port.tally(MAIN);
        assert.equals(200, tally?.count);
        assert.equals(1, tally?.credits);
        assert.equals(200, tally?.toNext);
    });

    return suite;
}
