import { assert, TestSuite } from './TestRunner';
import { createPlayerSaveSnapshot, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createLifespanDeathPersistSuite(): TestSuite {
    const suite = new TestSuite('LifespanDeathPersist (PROG-2-0222 主動指令死亡存檔)');
    const roster = [{ id: 'liu', name: '劉備', faction: 'shu', gender: '男', age: 40, hp: 1000 }] as unknown as GeneralConfig[];
    const gameTime = new GameClock().state;

    suite.test('舊檔沒有 pendingLifespanDeaths 時讀回為空陣列', () => {
        const snapshot = createPlayerSaveSnapshot(gameTime, roster, new Date(0));
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.lengthEquals(0, restored.pendingLifespanDeaths ?? []);
    });

    suite.test('待季結死亡經存檔往返後保留，壞項目丟棄', () => {
        const snapshot = {
            ...createPlayerSaveSnapshot(gameTime, roster, new Date(0)),
            pendingLifespanDeaths: [
                { generalId: 'liu', age: 70 },
                { generalId: 42, age: 1 },
                { generalId: 'guan', age: Number.NaN },
            ],
        };
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.lengthEquals(1, restored.pendingLifespanDeaths ?? []);
        assert.equals('liu', restored.pendingLifespanDeaths![0].generalId);
        assert.equals(70, restored.pendingLifespanDeaths![0].age);
    });

    return suite;
}
