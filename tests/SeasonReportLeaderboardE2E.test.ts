/**
 * SeasonReportLeaderboardE2E.test.ts — 季度戰報與戰績排行榜的真實流程（QA，PROG-2-0658）
 *
 * Unity 對照：像 PlayMode 測試——打幾場、換季、存讀檔，再看戰報和排行榜給出的數字是不是同一批資料。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore, type SeasonAdvancedPayload } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { buildLeaderboardRows } from '../assets/scripts/core/systems/BattleLeaderboardView';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat',
        ...extra,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[], payloads: SeasonAdvancedPayload[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    session.setEventEmitter({
        emit: (name, payload) => { if (name === 'game-session-season-advanced') payloads.push(payload as SeasonAdvancedPayload); },
    });
    return session;
}

const perf = (kills: number, damageDealt: number, damageTaken: number) => ({ kills, damageDealt, damageTaken, healingDone: 0 });

export function createSeasonReportLeaderboardE2ESuite(): TestSuite {
    const suite = new TestSuite('SeasonReportLeaderboardE2E (季度戰報與排行榜 PROG-2-0658)');

    suite.test('排行榜：三項指標各自排序正確，存讀檔後名次不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('a', 30), person('b', 30), person('c', 30)]);
        await a.recordBattle(['a'], 'player-win', { performance: { a: perf(5, 1000, 100) } });
        await a.recordBattle(['b'], 'player-win', { performance: { b: perf(9, 500, 900) } });
        await a.recordBattle(['c'], 'player-win', { performance: { c: perf(1, 9000, 10) } });

        const ids = (metric: 'damage' | 'kills' | 'guardian') => a.rankBattleLeaderboard(metric, 3).map((e) => e.generalId).join(',');
        assert.equals('c,a,b', ids('damage'));
        assert.equals('b,a,c', ids('kills'));
        assert.equals('b,a,c', ids('guardian'));

        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals('c,a,b', b.rankBattleLeaderboard('damage', 3).map((e) => e.generalId).join(','));
        const rows = buildLeaderboardRows(b.roster as never, 'damage', 5);
        assert.equals('c', rows[0].generalId);
        assert.equals('9,000', rows[0].valueText);
    });

    suite.test('排行榜：連續多場累加；武將過世離開名冊後不再上榜', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('a', 30), person('mortal', 80, { maxLifespan: 81 })]);
        await a.recordBattle(['mortal'], 'player-win', { performance: { mortal: perf(50, 90000, 0) } });
        await a.recordBattle(['a'], 'player-win', { performance: { a: perf(1, 100, 0) } });
        await a.recordBattle(['a'], 'player-win', { performance: { a: perf(1, 100, 0) } });
        assert.equals('mortal', a.rankBattleLeaderboard('damage', 1)[0].generalId);
        assert.equals(200, a.rankBattleLeaderboard('damage', 5).find((e) => e.generalId === 'a')!.damage);

        for (let i = 0; i < 4; i += 1) a.spendLifespan('mortal', 'breeding');
        await a.advanceSeason();
        await a.advanceSeason();
        assert.isFalse(a.roster.some((g) => g.id === 'mortal'), '過世者離開名冊');
        assert.equals('a', a.rankBattleLeaderboard('damage', 1)[0].generalId, '榜首換人');
    });

    suite.test('季度戰報：每位在世武將一列，過世者不在報表裡，精力百分比與名冊一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const payloads: SeasonAdvancedPayload[] = [];
        const a = build(adapter, [person('a', 30), person('weary', 30, { vitality: 40 }), person('mortal', 80, { maxLifespan: 81 })], payloads);
        for (let i = 0; i < 4; i += 1) a.spendLifespan('mortal', 'breeding');
        await a.advanceSeason();
        const reports = payloads[0].quarterlyReports ?? [];
        assert.isFalse(reports.some((r) => r.generalId === 'mortal'), '過世者不列');
        for (const row of reports) {
            const g = a.roster.find((x) => x.id === row.generalId) as unknown as { vitality: number; maxVitality: number };
            assert.equals(`戰損報告：精力 ${Math.floor((g.vitality / g.maxVitality) * 100)}%`, row.reportLine);
        }
        assert.equals(a.roster.length, reports.length, '在世武將都有一列');
    });

    return suite;
}
