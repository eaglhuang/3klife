/**
 * NpcMemoryPersistence.test.ts — NPC_Memory read model 隨存檔保存（NPC-09，PROG-2-1438）
 *
 * Unity 對照：像把角色的 ScriptableObject 狀態序列化進 PlayerPrefs；
 * 讀回時先確認主人是誰，換人就不沿用上一位的記憶。
 * 只驗存讀檔流程（真實 JSON 往返），不升存檔版號。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY, PLAYER_SAVE_SCHEMA_VERSION } from '../assets/scripts/core/services/PlayerSaveService';
import { createNpcMemory, normalizeNpcPlayerId, npcPlayerIdFromSeed } from '../assets/scripts/core/systems/NpcMemoryReadModel';

const SEED = 1438;

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(SEED);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 經真實 JSON 往返，模擬寫入儲存後再讀回 */
async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

export function createNpcMemoryPersistenceSuite(): TestSuite {
    const suite = new TestSuite('NpcMemoryPersistence (NPC-09 PROG-2-1438)');

    suite.test('新局由種子決定擁有者 id，存讀後 id 與記憶保持不變，版號不升', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        assert.equals(npcPlayerIdFromSeed(SEED), source.npcMemory?.Player_ID);
        await source.save();
        await roundTrip(adapter);

        const raw = await adapter.get<{ schemaVersion?: number; npcPlayerId?: string }>(PLAYER_SAVE_KEY);
        assert.equals(PLAYER_SAVE_SCHEMA_VERSION, raw?.schemaVersion);
        assert.equals(npcPlayerIdFromSeed(SEED), raw?.npcPlayerId);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(JSON.stringify(source.npcMemory), JSON.stringify(restored.npcMemory));
    });

    suite.test('舊檔缺擁有者 id：讀檔時補產一組並存回，之後每次讀都是同一個 id', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        delete snapshot.npcPlayerId;
        delete snapshot.npcMemory;
        await adapter.set(PLAYER_SAVE_KEY, snapshot);

        const first = sessionOn(adapter);
        assert.isTrue(await first.load());
        const id = first.npcMemory?.Player_ID ?? '';
        assert.isTrue(id.startsWith('npc-') && id.length > 4, '補產的 id 應有 npc- 前綴');
        const stored = await adapter.get<{ npcPlayerId?: string }>(PLAYER_SAVE_KEY);
        assert.equals(id, stored?.npcPlayerId, '補產後存回存檔');

        const second = sessionOn(adapter);
        assert.isTrue(await second.load());
        assert.equals(id, second.npcMemory?.Player_ID);
    });

    suite.test('記憶的擁有者與存檔 id 不符：不沿用他人記憶，改為空記憶並保留存檔 id', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        snapshot.npcPlayerId = 'npc-owner';
        snapshot.npcMemory = createNpcMemory('npc-someone-else')!;
        await adapter.set(PLAYER_SAVE_KEY, snapshot);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals('npc-owner', restored.npcMemory?.Player_ID);
        assert.equals(0, restored.npcMemory?.Recall_Context.length);
    });

    suite.test('擁有者 id 空白或非字串視為缺欄位', () => {
        assert.isTrue(normalizeNpcPlayerId('   ') === null);
        assert.isTrue(normalizeNpcPlayerId(42) === null);
        assert.equals('npc-1f', normalizeNpcPlayerId(' npc-1f '));
        assert.equals(npcPlayerIdFromSeed(31), 'npc-v');
    });

    suite.test('UI_NPC_* 字串三語齊全，來源提示保留 {0} 佔位符', () => {
        const keys = ['UI_NPC_DIALOGUE_TITLE', 'UI_NPC_CONTEXT_SELECT', 'UI_NPC_SPEAK_BUTTON', 'UI_NPC_LOADING', 'UI_NPC_FALLBACK', 'UI_NPC_OFFLINE_MODE', 'UI_NPC_SOURCE_HINT'];
        for (const loc of ['zh-TW', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(__dirname, `../assets/resources/i18n/${loc}.json`), 'utf8')) as Record<string, string>;
            for (const key of keys) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${loc} 缺 ${key}`);
            }
            assert.isTrue(table.UI_NPC_SOURCE_HINT.includes('{0}'), `${loc} 來源提示缺 {0}`);
        }
    });

    return suite;
}
