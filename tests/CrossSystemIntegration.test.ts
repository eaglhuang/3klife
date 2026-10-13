/**
 * CrossSystemIntegration.test.ts — 跨系統整合測試（QA 線，PROG-2-0250）
 *
 * Unity 對照：等同 PlayMode 整合測試，不單測一個 MonoBehaviour，而是把
 * 「出征 → 戰鬥結算 → 換季 → 存檔 → 重開續玩」串成一條線，驗證各系統交接處不漏欄位。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, gender: '男' | '女', age: number, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

function makeRoster(): GeneralConfig[] {
    return [
        makeGeneral('hero-a', '男', 30),
        makeGeneral('hero-b', '男', 28),
        makeGeneral('hero-c', '女', 26),
    ];
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[], seed = 20261013): GameSession {
    const session = new GameSession();
    const legacy = new LegacyService(adapter);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(legacy);
    session.startNewGame(seed);
    return session;
}

/** 鍵排序後序列化，讓比對不受物件欄位順序影響 */
function canonical(value: unknown): string {
    return JSON.stringify(value, (_key, v) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1)));
        }
        return v;
    });
}

function snapshotOf(session: GameSession): Record<string, unknown> {
    return JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as Record<string, unknown>;
}

export function createCrossSystemIntegrationSuite(): TestSuite {
    const suite = new TestSuite('CrossSystem (出征→結算→換季→存檔續玩)');

    suite.test('出征勝利後換季、存檔，新 Session 讀回的所有欄位與原 Session 完全一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.setLeadGeneral('hero-a');
        await a.setDeck(['tactic-1', 'tactic-2']);
        await a.addItem('ITEM_ORACLE', 2);
        await a.gainDiscoveryExp('battle-win' as never);
        await a.changeTallyLoyalty('hero-b', 'equip' as never, 'N' as never);
        await a.recordBattle(['hero-a', 'hero-b'], 'player-win', {
            stageId: 'stage-1',
            sortie: { lostTroops: 9000, foodSpent: 400 },
            performance: { 'hero-a': { kills: 5, damageDealt: 900, damageTaken: 200, healingDone: 0 } },
        });
        for (let i = 0; i < 5; i++) await a.advanceSeason();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load(), '應能讀回存檔');

        const before = snapshotOf(a);
        const after = snapshotOf(b);
        for (const key of Object.keys(before)) {
            assert.equals(canonical(before[key]), canonical(after[key]), `存檔欄位 ${key} 讀回後不一致`);
        }
        const mil = b.military;
        assert.isTrue(mil.cityTroops < mil.cityTroopsCap, '戰損尚未補滿，兵源應低於上限，才證明扣補都有被存下');
    });

    suite.test('續玩後亂數游標延續：原 Session 與讀檔 Session 再推進一季，名冊結果相同', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.recordBattle(['hero-a'], 'player-win', { stageId: 'stage-1' });
        for (let i = 0; i < 3; i++) await a.advanceSeason();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
        await b.load();

        await a.recordBattle(['hero-a', 'hero-c'], 'player-win', { stageId: 'stage-2' });
        await b.recordBattle(['hero-a', 'hero-c'], 'player-win', { stageId: 'stage-2' });
        for (let i = 0; i < 4; i++) { await a.advanceSeason(); await b.advanceSeason(); }

        assert.equals(canonical(a.roster), canonical(b.roster), '同一亂數游標下名冊應相同');
        assert.equals(canonical(a.clearedStageIds), canonical(b.clearedStageIds));
        assert.equals(canonical(snapshotOf(a)), canonical(snapshotOf(b)), '續玩幾季後整份快照仍一致');
    });

    suite.test('老死（真實 LegacyService 季結）：持有的虎符退回君主，名將產出陣亡虎符，存檔往返不遺失', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            makeGeneral('hist-old', '男', 80, { isHistorical: true, maxLifespan: 60, battleRecord: { wins: 10, kills: 20, merit: 100 } } as never),
            makeGeneral('young', '男', 20),
        ];
        const a = createSession(adapter, roster);
        a.setRandomSource(() => 0);
        await a.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t1', 'hist-old');
        assert.equals('t1', a.tallyOf('hist-old') ?? '');

        const payload = await a.advanceSeason();
        assert.isTrue(payload.agingEvents.some((e) => e.type === 'died' && e.generalId === 'hist-old'), '應發生老死');
        assert.isTrue(a.tallyOf('hist-old') === null, '陣亡武將不應繼續持有虎符');
        assert.isTrue(a.tallyHoldings['t1'] === null, '虎符 t1 應退回君主');
        const produced = Object.keys(a.tallyCards).filter((uid) => uid !== 't1');
        assert.equals(1, produced.length, '歷史名將老死應產出 1 張陣亡虎符');

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        await b.load();
        assert.equals(canonical(a.tallyHoldings), canonical(b.tallyHoldings));
        assert.equals(canonical(a.tallyCards), canonical(b.tallyCards));
    });

    suite.test('壽命耗盡死亡（主動指令）→ 下一次季結：持有的虎符退回君主並產出陣亡虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            // 壽命上限 60、年齡 59.75：剩 3 個月，結緣扣 6 個月 → 當場死亡
            makeGeneral('hist-spent', '男', 59.75, { isHistorical: true, maxLifespan: 60, battleRecord: { wins: 5, kills: 5, merit: 40 } } as never),
            makeGeneral('young', '男', 20),
        ];
        const a = createSession(adapter, roster);
        a.setRandomSource(() => 0.99);
        await a.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t1', 'hist-spent');

        const spent = a.spendLifespan('hist-spent', 'breeding');
        assert.isTrue(spent?.events.some((e) => e.type === 'died') ?? false, '剩餘壽命不足時結緣應導致死亡');
        assert.equals('t1', a.tallyOf('hist-spent') ?? '', '主動指令死亡的當下還沒進季結，虎符先不動');

        await a.advanceSeason();
        assert.isTrue(a.tallyOf('hist-spent') === null, '季結後陣亡武將不再持有虎符');
        assert.isTrue(a.tallyHoldings['t1'] === null, '虎符退回君主');
        assert.equals(1, Object.keys(a.tallyCards).filter((uid) => uid !== 't1').length, '應產出 1 張陣亡虎符');

        await a.advanceSeason();
        assert.equals(1, Object.keys(a.tallyCards).filter((uid) => uid !== 't1').length, '再過一季不會重複產卡');
    });

    return suite;
}
