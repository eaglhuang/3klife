/**
 * GachaLoyaltyFlag — 轉蛋取得武將時寫入轉蛋旗標（HUM-04 接線）的 headless 流程測試
 *
 * 覆蓋：轉蛋入冊寫入鎖定 100 的紀錄、非轉蛋入冊不寫、重複武將不覆寫既有紀錄、
 * 抽卡 → 存檔 → 讀檔 後旗標仍在，以及舊存檔（武將在名冊但沒有忠誠紀錄）不會被誤鎖。
 *
 * 忠誠度條的顯示規則見 LoyaltyGauge（HUM-04 另一張 PR）；這裡只測資料流，直接檢查紀錄欄位。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return { id, name: id, faction: 'wei', gender: '男', age: 30 } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createGachaLoyaltyFlagSuite(): TestSuite {
    const suite = new TestSuite('GachaLoyaltyFlag (轉蛋忠誠旗標接線 HUM-04)');

    suite.test('轉蛋入冊：新武將寫入轉蛋旗標，忠誠鎖定 100', () => {
        const session = createSession(new MemoryStorageAdapter());
        session.enrollGenerals([general('zhang')], { fromGacha: true });
        assert.isTrue(session.tallyLoyalty['zhang'].isGachaHero);
        assert.equals(100, session.tallyLoyalty['zhang'].loyalty);
    });

    suite.test('非轉蛋入冊（俘虜招募等）不寫入轉蛋旗標', () => {
        const session = createSession(new MemoryStorageAdapter());
        session.enrollGenerals([general('xun')]);
        assert.isFalse('xun' in session.tallyLoyalty);
    });

    suite.test('重複武將不覆寫既有紀錄：已有忠誠紀錄時保留原值與旗標', async () => {
        const session = createSession(new MemoryStorageAdapter(), [general('guo')]);
        await session.changeTallyLoyalty('guo', 'unequip', 'SR');
        const before = session.tallyLoyalty['guo'];
        session.enrollGenerals([general('guo')], { fromGacha: true });
        assert.equals(before.loyalty, session.tallyLoyalty['guo'].loyalty);
        assert.isFalse(session.tallyLoyalty['guo'].isGachaHero);
    });

    suite.test('抽卡 → 存檔 → 讀檔：轉蛋旗標與鎖定 100 的紀錄保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = createSession(adapter);
        first.enrollGenerals([general('cao')], { fromGacha: true });
        await first.save();

        const reopened = createSession(adapter);
        assert.isTrue(await reopened.load());
        assert.isTrue(reopened.tallyLoyalty['cao'].isGachaHero);
        assert.equals(100, reopened.tallyLoyalty['cao'].loyalty);
    });

    suite.test('舊存檔：名冊內武將沒有忠誠紀錄時，讀檔後不會被誤鎖', async () => {
        const legacy = new MemoryStorageAdapter();
        await legacy.set(PLAYER_SAVE_KEY, {
            schemaVersion: 1,
            savedAt: '2026-10-01T00:00:00.000Z',
            gameTime: createInitialGameTimeState(),
            roster: [general('lu')],
        });
        const old = createSession(legacy);
        assert.isTrue(await old.load());
        assert.isFalse('lu' in old.tallyLoyalty);
    });

    return suite;
}
