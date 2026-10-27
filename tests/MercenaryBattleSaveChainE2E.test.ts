/**
 * MercenaryBattleSaveChainE2E.test.ts — 試用傭兵戰績經日推進與存讀檔的鏈（PROG-2-0687）
 *
 * Unity 對照：像角色身上的計數器，跨天、存檔、重開遊戲讀回後仍要一樣，插畫階段不能倒退。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createMercenaryBattleSaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('MercenaryBattleSaveChainE2E (PROG-2-0687 傭兵戰績存讀檔鏈)');

    suite.test('出戰記錄經日推進與存讀檔，場數、勝場、插畫階段保持不變', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(3);
        a.setMercenaries({
            mercenaries: [{ uid: 'merc-1', daysLeft: 5, bond: 2, status: 'Trial', affection: 10 }],
            upkeep: [], cooldowns: [],
        });
        await a.recordBattle(['merc-1'], 'player-win');
        await a.recordBattle(['merc-1'], 'enemy-win');
        await a.recordBattle(['merc-1'], 'player-win');
        await a.recordBattle(['merc-1'], 'player-win');
        const before = { ...a.mercenaries.mercenaries[0] };
        assert.equals(4, before.battles!);
        assert.equals(3, before.wins!);

        await a.advanceMercenaryDay();
        const afterDay = a.mercenaries.mercenaries[0];
        assert.equals(4, afterDay.battles!);
        assert.equals(3, afterDay.wins!);
        assert.equals(before.illustrationStage!, afterDay.illustrationStage!);

        await a.save();
        const b = build(adapter);
        assert.isTrue(await b.load());
        const loaded = b.mercenaries.mercenaries[0];
        assert.equals(4, loaded.battles!);
        assert.equals(3, loaded.wins!);
        assert.equals(before.illustrationStage!, loaded.illustrationStage!);
        // 讀檔後續打：接著累加，階段不倒退
        await b.recordBattle(['merc-1'], 'player-win');
        const next = b.mercenaries.mercenaries[0];
        assert.equals(5, next.battles!);
        assert.equals(4, next.wins!);
        assert.isTrue((next.illustrationStage ?? 1) >= before.illustrationStage!);
    });

    suite.test('試用到期離隊後不再累計戰績', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter());
        a.startNewGame(3);
        a.setMercenaries({
            mercenaries: [{ uid: 'merc-1', daysLeft: 1, bond: 2, status: 'Trial', affection: 10 }],
            upkeep: [], cooldowns: [],
        });
        await a.recordBattle(['merc-1'], 'player-win');
        await a.advanceMercenaryDay();
        await a.advanceMercenaryDay();
        const status = a.mercenaries.mercenaries[0].status;
        assert.isTrue(status !== 'Trial', `應已到期，實際 ${status}`);
        await a.recordBattle(['merc-1'], 'player-win');
        assert.equals(1, a.mercenaries.mercenaries[0].battles!);
    });

    return suite;
}
