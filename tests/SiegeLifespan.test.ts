/**
 * SiegeLifespan — 攻城戰開戰扣壽命的 headless 測試（PROG-2-0237，LIFE-09 攻城接線）
 */
import { assert, TestSuite } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { lifespanCommandForBattleKind } from '../assets/scripts/core/systems/LifespanWiring';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function hero(age: number): GeneralConfig {
    return { id: 'liu', name: '劉備', faction: 'shu', gender: '男', age, hp: 1000, maxLifespan: 70, status: 'alive' } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createSiegeLifespanSuite(): TestSuite {
    const suite = new TestSuite('SiegeLifespan (PROG-2-0237 攻城壽命接線)');

    suite.test('戰場類型對應主動指令：siege 扣攻城壽命，野戰與未標記都不扣', () => {
        assert.equals('siege', lifespanCommandForBattleKind('siege') ?? '');
        assert.isTrue(lifespanCommandForBattleKind('field') === null);
        assert.isTrue(lifespanCommandForBattleKind(undefined) === null);
    });

    suite.test('攻城開戰：主將 age 前進 3 月並存檔，重開可讀回', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [hero(30)]);
        const result = await session.spendSiegeLifespan('liu');
        assert.isTrue(result !== null);
        const after = session.roster.find((g) => g.id === 'liu')?.age ?? -1;
        assert.isTrue(Math.abs(after - (30 + 3 / 12)) < 1e-9, `age 應為 30.25，實際 ${after}`);

        const reopened = createSession(adapter, []);
        assert.isTrue(await reopened.load());
        const saved = reopened.roster.find((g) => g.id === 'liu')?.age ?? -1;
        assert.isTrue(Math.abs(saved - after) < 1e-9, '攻城扣壽命要寫入存檔');
    });

    suite.test('武將不在名冊時攻城扣壽命回傳 null，不寫存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [hero(30)]);
        assert.equals(null, await session.spendSiegeLifespan('ghost'));
        assert.equals(null, await adapter.get(PLAYER_SAVE_KEY));
    });

    return suite;
}
