/**
 * DestinyRewardRoll.test.ts — GCH-R7（PROG-2-9465）：開場宿命池抽取改走共通 API（reward.roll，POOL_DESTINY 的 draw.slots）
 *
 * 用真實獎池檔與武將名冊，經本機 adapter 抽很多輪，驗「每輪恰一位六大宿命名將、十位不重複、不抽女將」；
 * 再接 DestinyOpeningController.rollAsync／rerollAsync，驗狀態機照舊（重轉免費、確定前不入冊），結果不合規時退回本機抽法。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import { createGeneralGrantHandler } from '../assets/scripts/core/gacha/RewardGachaPull';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isDestinyStar } from '../assets/scripts/core/systems/DestinyPool';
import type { RewardGrantResult } from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { buildRewardPools } from '../assets/scripts/shared/reward/RewardRoster';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';
import { DestinyOpeningController } from '../assets/scripts/ui/core/DestinyOpeningController';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

const generals = readJson('assets/resources/data/generals.json') as GeneralConfig[];
const heroPool = (readJson('assets/resources/data/gacha-config.json') as GachaConfig[]).find((c) => c.poolId === 'destiny-pool')!;

function rig() {
    const poolsRaw = readJson('assets/resources/data/gacha-reward-pools.json');
    const base = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setRewardAuthority(new MemoryReward());
    bundle.setRewardConfig({ ...base, pools: [...base.pools, ...buildRewardPools(poolsRaw, generals)] });
    let n = 0;
    bundle.setRewardHooks({ entropy: () => `r7-${n += 1}` });
    const byId = new Map(generals.map((g) => [g.id, g]));
    bundle.registerRewardEffect('general', createGeneralGrantHandler({ resolve: (id) => byId.get(id) ?? null, enroll: () => ({ duplicate: false }) }));
    let seq = 0;
    const round = async (): Promise<string[] | null> => {
        seq += 1;
        const res = await bundle.api.cmd<RewardGrantResult>('reward.roll', { poolId: 'POOL_DESTINY', count: 1, grantKey: `opening:${seq}`, source: { kind: 'opening', ref: 'destiny' } });
        if (isApiFail(res)) return null;
        return res.result.plan.map((l) => String(l.applied.generalId));
    };
    return { round, byId };
}

function newSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.99);
    return session;
}

function controllerWith(rollRound?: () => Promise<readonly string[] | null>) {
    return new DestinyOpeningController({
        config: () => heroPool, generals: () => generals, session: newSession(), random: () => 0.3, seed: () => 7,
        rollRound, onStarted: () => undefined,
    });
}

export function createDestinyRewardRollSuite(): TestSuite {
    const suite = new TestSuite('DestinyRewardRoll（GCH-R7 宿命池走 reward.roll）');

    suite.test('抽 60 輪：每輪十位不重複、恰好一位六大宿命名將、不含女將', async () => {
        const { round, byId } = rig();
        for (let i = 0; i < 60; i += 1) {
            const ids = (await round())!;
            assert.equals(10, ids.length);
            assert.equals(10, new Set(ids).size);
            assert.equals(1, ids.filter(isDestinyStar).length);
            assert.isTrue(ids.every((id) => byId.get(id)?.gender !== '女'));
        }
    });

    suite.test('六位宿命名將都有機會出現（60 輪內至少看到 4 位不同的）', async () => {
        const { round } = rig();
        const seen = new Set<string>();
        for (let i = 0; i < 60; i += 1) for (const id of (await round())!) if (isDestinyStar(id)) seen.add(id);
        assert.isTrue(seen.size >= 4);
    });

    suite.test('控制器 rollAsync／rerollAsync：走共通 API 的結果進狀態機，重轉免費', async () => {
        const { round } = rig();
        const controller = controllerWith(round);
        assert.isTrue(await controller.rollAsync());
        const first = controller.getView();
        assert.equals(10, first.rolledIds.length);
        assert.isTrue(first.coreId !== null);
        assert.isTrue(await controller.rerollAsync());
        const second = controller.getView();
        assert.equals(1, second.resets);
        assert.equals(10, new Set(second.rolledIds).size);
        assert.equals(1, second.rolledIds.filter(isDestinyStar).length);
    });

    suite.test('API 結果不合規（兩位宿命名將、重複、取不到）時退回本機抽法，仍恰一位名將十位不重複', async () => {
        const stars = ['zhang-fei', 'wei-yan'];
        const others = generals.filter((g) => g.gender !== '女' && !isDestinyStar(g.id)).slice(0, 8).map((g) => g.id);
        const bads: Array<() => Promise<readonly string[] | null>> = [
            async () => [...stars, ...others],
            async () => ['zhang-fei', ...others, others[0]],
            async () => null,
            async () => { throw new Error('boom'); },
        ];
        for (const bad of bads) {
            const controller = controllerWith(bad);
            assert.isTrue(await controller.rollAsync());
            const view = controller.getView();
            assert.equals(10, new Set(view.rolledIds).size);
            assert.equals(1, view.rolledIds.filter(isDestinyStar).length);
        }
    });

    suite.test('沒有 rollRound：行為與同步版相同', async () => {
        const controller = controllerWith(undefined);
        assert.isTrue(await controller.rollAsync());
        assert.equals(10, new Set(controller.getView().rolledIds).size);
    });

    return suite;
}
