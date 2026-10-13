/**
 * TigerTallyWiring — 虎符忠誠度接上 GameSession 與存檔（TRP-09）的 headless 測試
 *
 * 忠誠數值與反洗規則本身在 TigerTallyLoyalty.test.ts；這裡只測接線：狀態記在武將身上、
 * 季次取 totalSeasonsElapsed、存檔往返與舊檔相容。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService, normalizeTallyLoyaltyMap, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30 } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = [general('liu')]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createTigerTallyWiringSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyWiring (虎符忠誠接線 TRP-09)');

    suite.test('拔除虎符：忠誠記在武將身上，初始 50，UR 拔除 −25', async () => {
        const session = createSession(new MemoryStorageAdapter());
        const result = await session.changeTallyLoyalty('liu', 'unequip', 'UR');
        assert.isTrue(result !== null && result.ok, '名冊內武將應可變更');
        assert.equals(25, session.tallyLoyalty['liu'].loyalty);
    });

    suite.test('不在名冊的武將回傳 null，不建立紀錄', async () => {
        const session = createSession(new MemoryStorageAdapter());
        assert.equals(null, await session.changeTallyLoyalty('nobody', 'unequip', 'R'));
        assert.isFalse('nobody' in session.tallyLoyalty);
    });

    suite.test('同一季第二次變更被每季 1 次限制擋下，忠誠不變', async () => {
        const session = createSession(new MemoryStorageAdapter());
        await session.changeTallyLoyalty('liu', 'unequip', 'SR');
        const second = await session.changeTallyLoyalty('liu', 'equip', 'SSR');
        assert.isTrue(second !== null && !second.ok && second.reason === 'SEASON_LIMIT');
        assert.equals(38, session.tallyLoyalty['liu'].loyalty);
    });

    suite.test('連續兩季拔除 ×1.5（R：第一季 −5，第二季 floor(−7.5) = −8，沿用既有取整）', async () => {
        const session = createSession(new MemoryStorageAdapter());
        await session.changeTallyLoyalty('liu', 'unequip', 'R');
        await session.advanceSeason();
        const second = await session.changeTallyLoyalty('liu', 'unequip', 'R');
        assert.isTrue(second !== null && second.ok);
        assert.equals(1.5, second!.ok ? second!.multiplier : 0);
        assert.equals(37, session.tallyLoyalty['liu'].loyalty);
    });

    suite.test('轉蛋名將忠誠鎖定 100，變更不影響數值', async () => {
        const session = createSession(new MemoryStorageAdapter());
        await session.changeTallyLoyalty('liu', 'unequip', 'UR', true);
        assert.equals(100, session.tallyLoyalty['liu'].loyalty);
    });

    suite.test('存檔往返：忠誠與季次在重開後保留，舊檔（無 tallyLoyalty）補空物件', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = createSession(adapter);
        await first.changeTallyLoyalty('liu', 'unequip', 'SR');
        const reopened = createSession(adapter);
        assert.isTrue(await reopened.load());
        assert.equals(38, reopened.tallyLoyalty['liu'].loyalty);
        assert.equals(0, reopened.tallyLoyalty['liu'].lastChangeSeason!);

        const legacy = new MemoryStorageAdapter();
        await legacy.set(PLAYER_SAVE_KEY, { schemaVersion: 1, savedAt: '2026-10-01T00:00:00.000Z', gameTime: createInitialGameTimeState(), roster: [] });
        const old = createSession(legacy);
        assert.isTrue(await old.load());
        assert.equals(0, Object.keys(old.tallyLoyalty).length);
    });

    suite.test('normalizeTallyLoyaltyMap：丟棄壞掉的條目，非物件視為空；tallyLoyalty 非物件拋錯', () => {
        const map = normalizeTallyLoyaltyMap({ ok: { loyalty: 40 }, bad: { loyalty: 'x' }, nul: null });
        assert.equals(1, Object.keys(map).length);
        assert.equals(40, map['ok'].loyalty);
        assert.equals(0, Object.keys(normalizeTallyLoyaltyMap([1, 2])).length);
        assert.throws(() => validatePlayerSaveSnapshot({
            schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [], tallyLoyalty: 'oops',
        }));
    });

    return suite;
}
