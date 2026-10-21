/**
 * SaveLoadFlowRegression.test.ts — 存讀檔全流程回歸（QA，PROG-2-0638）
 *
 * Unity 對照：像 PlayMode 冒煙測試——開局、戰鬥、換季、中途存檔，再開一個全新的 GameSession 讀檔，
 * 兩邊必須「快照逐欄位相同」，而且接著玩同樣的操作，結果也要一樣（存檔沒有漏欄位、讀檔沒有偷補值）。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat',
        ...extra,
    } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    session.setEventEmitter({ emit: () => undefined });
    return session;
}

/** 遞迴排序物件鍵，避免只是鍵順序不同被當成差異 */
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => [k, sortKeys(v)]));
    }
    return value;
}

/** 快照去掉存檔時間後的深拷貝，用來逐欄位比對 */
function comparable(snapshot: PlayerSaveSnapshot): unknown {
    const copy = sortKeys(JSON.parse(JSON.stringify(snapshot))) as Record<string, unknown>;
    delete copy.savedAt;
    return copy;
}

function diffKeys(a: unknown, b: unknown): string[] {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
}

/** 開局 → 戰鬥（勝＋敗）→ 換季多次；中途動到各系統的存檔欄位 */
async function playSome(session: GameSession): Promise<void> {
    await session.setLeadGeneral('a');
    await session.setDeck(['tactic-a', 'tactic-b']);
    await session.toggleFavorite('b');
    await session.addItem('item-test', 3);
    await session.grantScorePoints(40);
    await session.grantAutoNurtureTickets(2);
    await session.gainDiscoveryExp('battle' as never, 30).catch(() => undefined);
    await session.capturePrisoner(person('pow', 35, { faction: 'wei' }));
    await session.recordBattle(['a', 'b'], 'player-win', { stageId: 'stage-1' });
    await session.advanceSeason();
    await session.recordBattle(['a'], 'enemy-win', { stageId: 'stage-2' });
    await session.advanceSeason();
    await session.advanceSeason();
    await session.recordBattle(['a', 'b'], 'player-win', { stageId: 'stage-2' });
}

export function createSaveLoadFlowRegressionSuite(): TestSuite {
    const suite = new TestSuite('SaveLoadFlowRegression (開局→戰鬥→換季→存讀)');

    const roster = (): GeneralConfig[] => [person('a', 30), person('b', 25), person('c', 40)];

    suite.test('中途存檔後讀回：快照逐欄位與存檔前相同', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, roster());
        await playSome(a);
        const saved = await a.save();

        const b = newSession(adapter, []);
        assert.isTrue(await b.load());
        const reloaded = b.createSnapshot();
        // 前提：這些欄位確實有被填到，比對才不是空對空
        assert.equals('a', reloaded.leadGeneralId);
        assert.equals(2, reloaded.deck.length);
        assert.equals(40, reloaded.resources?.scorePoints);
        assert.equals(1, reloaded.prison?.pending.length);
        assert.equals(2, (reloaded.clearedStageIds ?? []).length);
        assert.isTrue((reloaded.favoriteGeneralIds ?? []).includes('b'));
        const diff = diffKeys(comparable(saved), comparable(reloaded));
        assert.equals('', diff.join(','), `讀檔後有欄位不一致：${diff.join(',')}`);
    });

    suite.test('讀檔後接著玩同樣的操作：兩邊快照仍然相同', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, roster());
        await playSome(a);
        await a.save();

        const b = newSession(adapter, []);
        assert.isTrue(await b.load());
        for (const s of [a, b]) {
            await s.recordBattle(['b', 'c'], 'player-win', { stageId: 'stage-3' });
            await s.advanceSeason();
            await s.advanceSeason();
        }
        const diff = diffKeys(comparable(a.createSnapshot()), comparable(b.createSnapshot()));
        assert.equals('', diff.join(','), `續玩後有欄位分歧：${diff.join(',')}`);
    });

    suite.test('連續兩次存讀：第二次讀回與第一次完全相同（讀檔不會偷改資料）', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, roster());
        await playSome(a);
        await a.save();

        const b = newSession(adapter, []);
        await b.load();
        await b.save();
        const c = newSession(adapter, []);
        await c.load();
        const diff = diffKeys(comparable(b.createSnapshot()), comparable(c.createSnapshot()));
        assert.equals('', diff.join(','), `二次讀檔不一致：${diff.join(',')}`);
    });

    suite.test('戰績與賽季：換季後存讀，生涯與賽季統計不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, roster());
        await playSome(a);
        await a.save();
        const before = a.roster.find((g) => g.id === 'a') as unknown as { battleRecord?: unknown };

        const b = newSession(adapter, []);
        await b.load();
        const after = b.roster.find((g) => g.id === 'a') as unknown as { battleRecord?: unknown };
        assert.isDefined(before.battleRecord);
        assert.equals(JSON.stringify(before.battleRecord), JSON.stringify(after.battleRecord));
        assert.equals(a.gameTime.totalSeasonsElapsed, b.gameTime.totalSeasonsElapsed);
    });

    return suite;
}
