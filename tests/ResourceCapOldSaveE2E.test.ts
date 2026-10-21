/**
 * ResourceCapOldSaveE2E.test.ts — 資源上限夾制（ECO-11）後讀舊存檔的多季流程（QA，PROG-2-0660）
 *
 * Unity 對照：像把舊版本存下的 ScriptableObject 資料讀進新版 Min/Max 規則，
 * 讀回當下要夾到新上限，之後連續推進多季也不能再衝破上限。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BASE_RESOURCE_CAPS } from '../assets/scripts/core/systems/ResourceCap';

function newSession(adapter: MemoryStorageAdapter): { session: GameSession; save: PlayerSaveService } {
    const save = new PlayerSaveService(adapter);
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(save);
    session.setAutoSave(false);
    session.startNewGame(3);
    return { session, save };
}

/** 寫入一份「舊版」存檔：上限是舊值、存量超過新上限 */
async function writeOldSave(adapter: MemoryStorageAdapter, military: Record<string, number>, fame: number): Promise<void> {
    const { session, save } = newSession(adapter);
    const snapshot = session.createSnapshot();
    await save.save({ ...snapshot, military: military as never, resources: { ...(snapshot.resources ?? {}), fame } as never });
}

export function createResourceCapOldSaveE2ESuite(): TestSuite {
    const suite = new TestSuite('ResourceCapOldSaveE2E (上限夾制後讀舊存檔 PROG-2-0660)');

    suite.test('舊存檔兵源 10000／上限 10000、名聲 5000：讀回夾到新上限，糧草上限改用規則值', async () => {
        const adapter = new MemoryStorageAdapter();
        await writeOldSave(adapter, { cityTroops: 10000, cityTroopsCap: 10000, recruitRegen: 100, food: 600, foodCap: 600 }, 5000);
        const { session } = newSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(BASE_RESOURCE_CAPS.troops, session.military.cityTroopsCap);
        assert.equals(BASE_RESOURCE_CAPS.troops, session.military.cityTroops, '兵源夾到新上限');
        assert.equals(BASE_RESOURCE_CAPS.food, session.military.foodCap, '糧草上限改為規則值');
        assert.equals(600, session.military.food, '糧草存量不被動');
        assert.equals(BASE_RESOURCE_CAPS.fame, session.fame);
    });

    suite.test('讀舊存檔後連推多季：糧草與兵源永遠不超過上限，且存讀檔後不變形', async () => {
        const adapter = new MemoryStorageAdapter();
        await writeOldSave(adapter, { cityTroops: 10000, cityTroopsCap: 10000, recruitRegen: 100, food: 9900, foodCap: 600 }, 0);
        const { session } = newSession(adapter);
        assert.isTrue(await session.load());
        for (let i = 0; i < 8; i++) {
            await session.advanceSeason();
            assert.isTrue(session.military.food <= BASE_RESOURCE_CAPS.food, `第 ${i + 1} 季糧草未超上限`);
            assert.isTrue(session.military.cityTroops <= BASE_RESOURCE_CAPS.troops, `第 ${i + 1} 季兵源未超上限`);
        }
        const before = JSON.stringify(session.military);
        await session.save();
        const { session: again } = newSession(adapter);
        assert.isTrue(await again.load());
        assert.equals(before, JSON.stringify(again.military));
    });

    return suite;
}
