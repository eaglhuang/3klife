/**
 * TallyHoldingsWiring — 虎符持有接進存檔與陣亡事件的 headless 測試（PROG-2-0235，WBS TRP-08）
 *
 * 重點：持有關係要能存檔讀回；舊檔沒有欄位時補空表；武將陣亡時手上的虎符退回君主。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService, normalizeTallyHoldingsMap } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, status = 'alive'): GeneralConfig {
    return { id, name: id, status } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createTallyHoldingsWiringSuite(): TestSuite {
    const suite = new TestSuite('TallyHoldingsWiring (虎符持有接線 TRP-08)');

    suite.test('normalizeTallyHoldingsMap：非物件為空表，只保留字串或 null 的條目', () => {
        assert.equals(0, Object.keys(normalizeTallyHoldingsMap(undefined)).length);
        const map = normalizeTallyHoldingsMap({ t1: 'liu', t2: null, t3: 42, '': 'x' });
        assert.equals('liu', map.t1 ?? '');
        assert.isTrue('t2' in map);
        assert.isFalse('t3' in map);
        assert.isFalse('' in map);
    });

    suite.test('舊存檔（沒有 tallyHoldings）讀回補空表', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, { schemaVersion: 1, savedAt: '2026-10-01T00:00:00.000Z', gameTime: createInitialGameTimeState(), roster: [] });
        const session = createSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(0, Object.keys(session.tallyHoldings).length);
    });

    suite.test('登記、裝上後存檔，重開可讀回持有關係', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [general('liu')]);
        await session.registerTallyCards(['t1', 't2']);
        const equipped = await session.equipTally('t1', 'liu');
        assert.isTrue(equipped?.ok ?? false);
        assert.equals('t1', session.tallyOf('liu') ?? '');

        const reopened = createSession(adapter, [general('liu')]);
        assert.isTrue(await reopened.load());
        assert.equals('t1', reopened.tallyOf('liu') ?? '');
        assert.equals(null, reopened.tallyHoldings.t2 ?? null);
    });

    suite.test('同一武將不能裝兩張；不在名冊的武將裝不上', async () => {
        const session = createSession(new MemoryStorageAdapter(), [general('liu')]);
        await session.registerTallyCards(['t1', 't2']);
        await session.equipTally('t1', 'liu');
        const second = await session.equipTally('t2', 'liu');
        assert.equals('GENERAL_HAS_TALLY', second && !second.ok ? second.reason : '');
        assert.isTrue((await session.equipTally('t2', 'ghost')) === null);
    });

    suite.test('武將陣亡（戰後結算）時，手上的虎符退回君主並存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [general('liu', 'dead'), general('guan')]);
        await session.registerTallyCards(['t1']);
        // 直接用存檔還原持有關係，避免走裝上流程時名冊內的陣亡武將被擋下
        await adapter.set(PLAYER_SAVE_KEY, { schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [general('liu', 'dead'), general('guan')], tallyHoldings: { t1: 'liu' } });
        await session.load();
        assert.equals('t1', session.tallyOf('liu') ?? '');
        await session.recordBattle(['guan'], 'player-win');
        assert.equals(null, session.tallyOf('liu'));
        assert.equals(null, session.tallyHoldings.t1 ?? null);

        const reopened = createSession(adapter);
        await reopened.load();
        assert.equals(null, reopened.tallyHoldings.t1 ?? null, '退回君主要寫入存檔');
    });

    suite.test('卸下虎符退回君主；未持有時卸下失敗', async () => {
        const session = createSession(new MemoryStorageAdapter(), [general('liu')]);
        await session.registerTallyCards(['t1']);
        await session.equipTally('t1', 'liu');
        assert.isTrue((await session.unequipTally('t1')).ok);
        assert.equals(null, session.tallyOf('liu'));
        const again = await session.unequipTally('t1');
        assert.equals('NOT_HELD', again.ok ? '' : again.reason);
    });

    return suite;
}
