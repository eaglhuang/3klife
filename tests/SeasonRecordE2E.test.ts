/**
 * SeasonRecordE2E — 賽季戰績在 GameSession 真實流程的整合（QA，PROG-2-0636）
 *
 * Unity 對照：像連打幾場、跨過賽季邊界，再存檔讀檔，確認計分表有跟著換本、存檔後不丟。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { BattleRecord } from '../assets/scripts/core/systems/BattleRoster';

function hero(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk: 40, careerClass: 'Warrior', role: 'Commander',
    } as unknown as GeneralConfig;
}

function world(adapter: MemoryStorageAdapter, roster: GeneralConfig[]) {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setEventEmitter({ emit: () => {} });
    session.setRandomSource(() => 0.99);
    return { session, store };
}

const recordOf = (store: InMemoryRosterStore, id: string): BattleRecord =>
    (store.getAll().find((g) => g.id === id) as GeneralConfig & { battleRecord: BattleRecord }).battleRecord;

export function createSeasonRecordE2ESuite(): TestSuite {
    const suite = new TestSuite('SeasonRecordE2E (賽季戰績 真實流程 PROG-2-0636)');

    suite.test('同賽季連打累加；跨過 4 個遊戲季進入 S2 後從零開始；存讀檔不丟', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, store } = world(adapter, [hero('h')]);
        session.startNewGame(1);
        await session.recordBattle(['h'], 'player-win', { stageId: 'stage-1', performance: { h: { kills: 3, damageDealt: 500, damageTaken: 100, healingDone: 0 } } });
        await session.recordBattle(['h'], 'enemy-win', { stageId: 'stage-1' });
        let record = recordOf(store, 'h');
        assert.equals('S1', record.season?.seasonId);
        assert.equals(1, record.season?.wins);
        assert.equals(1, record.season?.losses);
        assert.equals(3, record.season?.kills);

        for (let i = 0; i < 4; i += 1) await session.advanceSeason();
        await session.recordBattle(['h'], 'player-win', { stageId: 'stage-1' });
        record = recordOf(store, 'h');
        assert.equals('S2', record.season?.seasonId, '跨過 4 季進入 S2');
        assert.equals(1, record.season?.wins);
        assert.equals(0, record.season?.losses, '新賽季從零開始');
        assert.equals(2, record.wins, '生涯戰績仍累加');

        await session.save();
        const b = world(adapter, []);
        assert.isTrue(await b.session.load());
        assert.equals(JSON.stringify(recordOf(store, 'h')), JSON.stringify(recordOf(b.store, 'h')), '存讀檔後戰績一致');
    });

    suite.test('跨賽季後舊賽季的統計去向：必須留在某處供賽季結算讀取（歸檔）', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, store } = world(adapter, [hero('h')]);
        session.startNewGame(1);
        await session.recordBattle(['h'], 'player-win', { stageId: 'stage-1' });
        for (let i = 0; i < 4; i += 1) await session.advanceSeason();
        await session.recordBattle(['h'], 'player-win', { stageId: 'stage-1' });
        const record = recordOf(store, 'h');
        assert.equals(1, record.seasonHistory?.length, 'S1 收進歸檔');
        assert.equals('S1', record.seasonHistory![0].seasonId);
        assert.equals(1, record.seasonHistory![0].wins);
        assert.equals('S2', record.season?.seasonId);

        // 再跨一個賽季：歸檔累積成 S1、S2；同賽季連打不重複歸檔
        for (let i = 0; i < 4; i += 1) await session.advanceSeason();
        await session.recordBattle(['h'], 'enemy-win', { stageId: 'stage-1' });
        await session.recordBattle(['h'], 'enemy-win', { stageId: 'stage-1' });
        const later = recordOf(store, 'h');
        assert.equals('S1,S2', later.seasonHistory!.map((entry) => entry.seasonId).join(','));
        assert.equals(2, later.season?.losses, 'S3 兩場敗');

        // 存讀檔後歸檔仍在
        await session.save();
        const b = world(adapter, []);
        assert.isTrue(await b.session.load());
        assert.equals(JSON.stringify(later.seasonHistory), JSON.stringify(recordOf(b.store, 'h').seasonHistory));
    });

    suite.test('平手：不計賽季勝敗，但生涯平手數累加', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, store } = world(adapter, [hero('h')]);
        session.startNewGame(1);
        await session.recordBattle(['h'], 'draw', { stageId: 'stage-1' });
        const record = recordOf(store, 'h');
        assert.equals(1, record.draws);
        assert.equals(0, record.season?.wins);
        assert.equals(0, record.season?.losses);
    });

    return suite;
}
