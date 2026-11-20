/**
 * 戰後里程碑發獎（GEN-13 / PROG-2-0817）
 *
 * 鎖住：戰後新達成千人斬／百人斬時，戰法筆記寫入庫存；
 * 同一里程碑不重複發放；未達成時庫存不變。（PROG-2-9205 起經 reward.claim 入帳）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_BATTLE_NOTE } from '../assets/scripts/core/systems/PlayerInventory';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';

function makeGeneral(id: string): AgingGeneral {
    return { id, name: id, faction: 'player', age: 30 } as AgingGeneral;
}

async function sessionWith(roster: AgingGeneral[]): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster as never));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    await session.load();
    // 戰後里程碑獎勵走 reward.claim（PROG-2-9205）：綁本機 API，設定讀正式的 reward-config.json
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
    bundle.setItemAuthority(session.itemAuthority());
    bundle.setRewardAuthority(session.rewardAuthority());
    bundle.setRewardConfig(normalizeRewardConfig(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'reward-config.json'), 'utf8'))));
    session.setRewardApi(bundle.api);
    return session;
}

function killsOf(kills: number) {
    return { g1: { kills, damageDealt: 0, damageTaken: 0, healingDone: 0 } };
}

export function createBattleMilestoneNotesSuite(): TestSuite {
    const suite = new TestSuite('BattleMilestoneNotes (戰後里程碑發獎 GEN-13)');

    suite.test('戰後首次達成百人斬：發 1 本戰法筆記', async () => {
        const session = await sessionWith([makeGeneral('g1')]);
        const before = session.inventory[ITEM_BATTLE_NOTE] ?? 0;
        await session.recordBattle(['g1'], 'player-win', { performance: killsOf(100) });
        assert.equals(before + 1, session.inventory[ITEM_BATTLE_NOTE] ?? 0);
    });

    suite.test('同一里程碑不重複發放：第二場再斬 10 人不再加筆記', async () => {
        const session = await sessionWith([makeGeneral('g1')]);
        await session.recordBattle(['g1'], 'player-win', { performance: killsOf(100) });
        const once = session.inventory[ITEM_BATTLE_NOTE] ?? 0;
        await session.recordBattle(['g1'], 'player-win', { performance: killsOf(10) });
        assert.equals(once, session.inventory[ITEM_BATTLE_NOTE] ?? 0);
    });

    suite.test('未達成里程碑：庫存不變', async () => {
        const session = await sessionWith([makeGeneral('g1')]);
        await session.recordBattle(['g1'], 'player-win', { performance: killsOf(5) });
        assert.equals(0, session.inventory[ITEM_BATTLE_NOTE] ?? 0);
    });

    return suite;
}
