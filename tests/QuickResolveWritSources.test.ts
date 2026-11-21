// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §三-5 軍令狀取得；PROG-2-9709（總PM 2026-11-22 裁決）
/**
 * QuickResolveWritSources.test.ts — 軍令狀三個免費來源（走獎勵框架 reward.claim）
 *
 * 鎖住：Boss 關首勝 ×1、年終守城勝 ×2、每季第一場戰鬥勝利 ×1；同 grantKey 重送只給一次；敗北不給；
 * 張數放在 reward-config.json 的套件。Unity 對照：EditMode Test。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_QUICK_RESOLVE_WRIT } from '../assets/scripts/core/systems/QuickResolveGate';
import {
    bossFirstClearWritClaim, QUICK_RESOLVE_WRIT_BUNDLES, quickResolveWritClaimsFor, seasonFirstWinWritClaim, yearEndDefenseWritClaim,
} from '../assets/scripts/core/systems/QuickResolveWritSources';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';

const rewardConfig = normalizeRewardConfig(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'reward-config.json'), 'utf8')));

const hero = (): GeneralConfig => ({
    id: 'hero', name: 'hero', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalRank: 1,
    battleRecord: { wins: 0, losses: 0, draws: 0, merit: 0, kills: 0 },
}) as unknown as GeneralConfig;

async function rig(): Promise<GameSession> {
    const session = new GameSession();
    const store = new PlayerSaveService(new MemoryStorageAdapter());
    session.setRosterStore(new InMemoryRosterStore([hero()]));
    session.setSaveService(store);
    session.setRandomSource(() => 0);
    await session.load();
    const bundle = createLocalApi(store, { now: () => 1_000 });
    bundle.setItemAuthority(session.itemAuthority());
    bundle.setRewardAuthority(session.rewardAuthority());
    bundle.setRewardConfig(rewardConfig);
    session.setItemApi(bundle.api);
    session.setRewardApi(bundle.api);
    return session;
}

const defense = { moraleOnVictory: 0, playerGeneralsDown: false };

export function createQuickResolveWritSourcesSuite(): TestSuite {
    const suite = new TestSuite('QuickResolveWritSources (軍令狀三個獎勵管道 PROG-2-9709)');

    suite.test('套件張數放在 JSON：Boss 首勝 1、年終守城 2、每季首勝 1，皆為軍令狀', () => {
        const amounts: Record<string, number> = {};
        for (const b of rewardConfig.bundles) {
            const e = b.effects[0] as { kind: string; itemId: string; qty: number };
            if (b.id.startsWith('BUNDLE_QUICK_RESOLVE_WRIT_')) { assert.equals(ITEM_QUICK_RESOLVE_WRIT, e.itemId); amounts[b.id] = e.qty; }
        }
        assert.equals(1, amounts[QUICK_RESOLVE_WRIT_BUNDLES.bossFirstClear]);
        assert.equals(2, amounts[QUICK_RESOLVE_WRIT_BUNDLES.yearEndDefense]);
        assert.equals(1, amounts[QUICK_RESOLVE_WRIT_BUNDLES.seasonFirstWin]);
    });

    suite.test('純函式：grantKey 格式；只有勝利才有；Boss／守城各自成立', () => {
        assert.equals('quickResolveWrit:bossFirstClear:extreme-lu-bu', bossFirstClearWritClaim('extreme-lu-bu').grantKey);
        assert.equals('quickResolveWrit:yearEndDefense:200', yearEndDefenseWritClaim(200).grantKey);
        assert.equals('quickResolveWrit:seasonFirstWin:200-2', seasonFirstWinWritClaim(200, 2).grantKey);
        const base = { stageId: 'x', isBossStage: false, isDefense: false, year: 200, season: 1 };
        assert.equals(0, quickResolveWritClaimsFor({ ...base, result: 'enemy-win', isBossStage: true, isDefense: true }).length, '敗北不給');
        assert.equals(0, quickResolveWritClaimsFor({ ...base, result: 'draw' }).length);
        assert.equals(1, quickResolveWritClaimsFor({ ...base, result: 'player-win' }).length, '一般勝利只有每季首勝');
        assert.equals(2, quickResolveWritClaimsFor({ ...base, result: 'player-win', isBossStage: true }).length);
        assert.equals(3, quickResolveWritClaimsFor({ ...base, result: 'player-win', isBossStage: true, isDefense: true }).length);
    });

    suite.test('每季第一場勝利 +1：敗北不給，同季再贏不重領', async () => {
        const session = await rig();
        await session.recordBattle(['hero'], 'enemy-win', { stageId: 'encounter-001' });
        assert.equals(0, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '敗北不給');
        await session.recordBattle(['hero'], 'player-win', { stageId: 'encounter-001' });
        assert.equals(1, session.itemCount(ITEM_QUICK_RESOLVE_WRIT));
        await session.recordBattle(['hero'], 'player-win', { stageId: 'encounter-001' });
        assert.equals(1, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '同一季第二場勝利不重領');
    });

    suite.test('Boss 關首勝 +1（另加當季首勝 +1）；同一 Boss 關再贏不重領', async () => {
        const session = await rig();
        await session.recordBattle(['hero'], 'player-win', { stageId: 'extreme-lu-bu' });
        assert.equals(2, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), 'Boss 首勝 1 + 當季首勝 1');
        await session.recordBattle(['hero'], 'player-win', { stageId: 'extreme-lu-bu' });
        assert.equals(2, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '同 Boss 關冪等');
        await session.recordBattle(['hero'], 'player-win', { stageId: 'extreme-cao-cao' });
        assert.equals(3, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '另一個 Boss 關首勝再 +1');
    });

    suite.test('年終守城勝利 +2（另加當季首勝 +1）；同年重送不重領；敗北不給', async () => {
        const session = await rig();
        await session.recordBattle(['hero'], 'enemy-win', { defense });
        assert.equals(0, session.itemCount(ITEM_QUICK_RESOLVE_WRIT));
        await session.recordBattle(['hero'], 'player-win', { defense });
        assert.equals(3, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '守城 2 + 當季首勝 1');
        await session.recordBattle(['hero'], 'player-win', { defense });
        assert.equals(3, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '同年守城冪等');
    });

    suite.test('沒綁獎勵 API（純邏輯）不發也不出錯', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([hero()]));
        session.setRandomSource(() => 0);
        await session.recordBattle(['hero'], 'player-win', { stageId: 'extreme-lu-bu' });
        assert.equals(0, session.itemCount(ITEM_QUICK_RESOLVE_WRIT));
    });

    return suite;
}
