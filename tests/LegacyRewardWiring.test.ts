import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { LEGACY_PREMIUM_REWARD, type LegacyAchievement } from '../assets/scripts/core/systems/LegacyAchievement';

// 世代成就入帳與 Legacy_Count 存檔（PROG-2-0529 / RET-07 續）。
// Unity 對照：像 Achievement 的 Reward 發放與 PlayerPrefs 存檔，入帳後自動寫檔。

function achievement(geneId: string): LegacyAchievement {
    return {
        descendantUid: 'C',
        ancestorUid: 'fff',
        geneId,
        generationGap: 3,
        reward: { currency: 'premium', amount: LEGACY_PREMIUM_REWARD },
    };
}

function sessionWith(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createLegacyRewardWiringSuite(): TestSuite {
    const suite = new TestSuite('LegacyRewardWiring (RET-07 入帳與 Legacy_Count 存檔)');

    suite.test('沒有錢包存檔時以起始錢包為基底入帳：靈玉 +100，其他資源不變', async () => {
        const session = new GameSession(3);
        const result = await session.applyLegacyAchievements([achievement('gene-red')]);
        assert.equals(LEGACY_PREMIUM_REWARD, result.granted);
        const wallet = session.gachaWalletSave!;
        assert.equals(STARTER_GACHA_WALLET.gems + LEGACY_PREMIUM_REWARD, wallet.gems);
        assert.equals(STARTER_GACHA_WALLET.gold, wallet.gold);
        assert.equals(STARTER_GACHA_WALLET.tickets, wallet.tickets);
        assert.equals(1, session.legacyCount);
    });

    suite.test('已有錢包時只加靈玉，多個成就各自入帳並累加次數', async () => {
        const session = new GameSession(3);
        session.setGachaWalletSave({ gems: 5, gold: 0, tickets: 0, bronze: 0, oracle: 0 });
        const result = await session.applyLegacyAchievements([achievement('gene-red'), achievement('gene-green')]);
        assert.equals(2 * LEGACY_PREMIUM_REWARD, result.granted);
        assert.equals(5 + 2 * LEGACY_PREMIUM_REWARD, session.gachaWalletSave!.gems);
        assert.equals(2, session.legacyCount);
    });

    suite.test('空成就清單不改錢包也不改次數', async () => {
        const session = new GameSession(3);
        session.setGachaWalletSave({ gems: 7, gold: 1, tickets: 2, bronze: 3, oracle: 4 });
        const result = await session.applyLegacyAchievements([]);
        assert.equals(0, result.granted);
        assert.equals(7, session.gachaWalletSave!.gems);
        assert.equals(0, session.legacyCount);
    });

    suite.test('入帳後自動存檔：靈玉與 Legacy_Count 讀回保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWith(adapter);
        session.setGachaWalletSave({ gems: 10, gold: 0, tickets: 0, bronze: 0, oracle: 0 });
        await session.applyLegacyAchievements([achievement('gene-red')]);

        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(10 + LEGACY_PREMIUM_REWARD, restored.gachaWalletSave!.gems);
        assert.equals(1, restored.legacyCount);
    });

    suite.test('舊檔沒有 legacyCount 欄位 → 讀回 0', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWith(adapter);
        session.setGachaWalletSave({ gems: 1, gold: 0, tickets: 0, bronze: 0, oracle: 0 });
        await session.save();

        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(0, restored.legacyCount);
    });

    suite.test('新遊戲重置後 Legacy_Count 歸 0', async () => {
        const session = new GameSession(3);
        await session.applyLegacyAchievements([achievement('gene-red')]);
        assert.equals(1, session.legacyCount);
        session.startNewGame(1);
        assert.equals(0, session.legacyCount);
    });

    return suite;
}
