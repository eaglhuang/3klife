// QA 巡檢（PROG-2-0603）：名冊進場正規化的防呆與「新局→結緣→出征→存檔續玩」長流程
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { normalizeRosterRoles } from '../assets/scripts/core/systems/RosterRoleLoad';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { NURTURE_TOTAL_ROUNDS, TRAINING_KINDS } from '../assets/scripts/core/systems/NurtureSystem';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gen(id: string, gender: '男' | '女', age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
    } as unknown as GeneralConfig;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function canonical(value: unknown): string {
    return JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1))) : v));
}

export function createLongFlowPatrolSuite(): TestSuite {
    const suite = new TestSuite('LongFlowPatrol (名冊進場防呆＋新局→結緣→出征→存檔續玩)');

    suite.test('normalizeRosterRoles：陣列裡混入 null / undefined 不丟例外', () => {
        const out = normalizeRosterRoles([gen('a', '男', 30), null as never, undefined as never]);
        assert.equals(3, out.length);
    });

    suite.test('addGenerals：抽卡批次含壞資料（null / 無 id）時略過，不影響其餘武將入名冊', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.startNewGame(1);
        const result = await session.addGenerals([gen('ok-1', '男', 20), null as never, { name: 'x' } as never, gen('ok-2', '女', 20)]);
        assert.equals(2, result.added.length);
    });

    suite.test('新局→結緣→出征→換季→存檔→續玩：舊職能字串進場即正規化，讀檔後與原局逐欄位一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new InMemoryRosterStore([
            gen('father', '男', 30, { role: '武將' }),
            gen('mother', '女', 26, { role: '武將' }),
        ]);
        const a = new GameSession();
        a.setRosterStore(store);
        a.setSaveService(new PlayerSaveService(adapter));
        a.setLifecycle(new LegacyService(adapter));
        a.startNewGame(777);
        const breeding = new BreedingService(store, new BloodlineGraph(), { random: () => 0.01 });
        breeding.syncGraphFromRoster();
        const father = store.getAll().find((g) => g.id === 'father')!;
        const mother = store.getAll().find((g) => g.id === 'mother')!;
        const bonded = breeding.breed(father.id, mother.id);
        assert.isTrue(!!bonded, '結緣應有結果');
        const child = store.getAll().find((g) => g.id !== 'father' && g.id !== 'mother');
        if (child) {
            const role = (child as { role?: string }).role;
            assert.isTrue(role === undefined || role === 'Combat' || role === 'Mentor', `子嗣職能應為正規值，實得 ${role}`);
        }
        await a.setLeadGeneral('father');
        await a.recordBattle(['father', 'mother'], 'player-win', {
            stageId: 'stage-1', sortie: { lostTroops: 3000, foodSpent: 200 },
            performance: { father: { kills: 3, damageDealt: 500, damageTaken: 100, healingDone: 0 } },
        });
        for (let i = 0; i < 4; i++) await a.advanceSeason();
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load());
        assert.equals(canonical(a.createSnapshot(new Date(0))), canonical(b.createSnapshot(new Date(0))), '讀檔快照應與原局一致');
        await a.advanceSeason();
        await b.advanceSeason();
        assert.equals(canonical(a.roster), canonical(b.roster), '續玩一季後名冊一致');
    });

    suite.test('女性來源系統狀態（送禮好感、刷新時間）存讀往返；開新局清空；舊存檔沒有欄位時給預設', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = new GameSession();
        a.setRosterStore(new InMemoryRosterStore([gen('hero', '男', 30)]));
        a.setSaveService(new PlayerSaveService(adapter));
        a.startNewGame(5);
        a.giftFemale('fem-1', 30);
        a.rollDungeonRescueIfDue(1_000_000, () => 0.5);
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        assert.equals(canonical(a.femaleSystemState), canonical(b.femaleSystemState), '讀檔後女性來源狀態一致');
        assert.equals(null, b.rollDungeonRescueIfDue(1_000_000 + 60_000, () => 0.5), '讀檔後救美冷卻仍在');

        b.startNewGame(6);
        assert.equals(0, Object.keys(b.femaleSystemState.giftAffection).length, '開新局清空送禮好感');
        assert.equals(null, b.femaleSystemState.rescueRefreshedAtMs, '開新局清空刷新時間');
    });

    suite.test('刷新時間戳在未來（時鐘被調回）視為到期；開新局清掉大廳點位', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([gen('hero', '男', 30)]));
        session.startNewGame(9);
        assert.isTrue(session.rollDungeonRescueIfDue(10_000_000, () => 0.5) !== null, '第一次一定刷新');
        assert.equals(null, session.rollDungeonRescueIfDue(10_000_000 + 60_000, () => 0.5), '正常情況冷卻中');
        assert.isTrue(session.rollDungeonRescueIfDue(5_000_000, () => 0.5) !== null, '時鐘倒退視為到期');
        session.refreshHallSpots(0, () => 0.1);
        session.startNewGame(10);
        assert.equals(0, session.hallSpotRows.length, '開新局清空大廳點位');
    });

    suite.test('一條龍：結緣→開獎→36 回合培育畢業→出戰結算→主動扣壽命→換季→存檔→讀檔，兩邊再推進一季仍一致', async () => {
        const dictionary = buildFactorDictionary(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/gene-dictionary.json'), 'utf8')));
        const graph = new BloodlineGraph();
        const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({ version: 't', updatedAt: 't', persons: [person('dad'), person('mom')], links: [] });
        const dad = gen('dad', '男', 30, { vitality: 200, maxVitality: 200, str: 90 }) as unknown as BreedingGeneral;
        const mom = gen('mom', '女', 28, { vitality: 200, maxVitality: 200 }) as unknown as BreedingGeneral;
        const adapter = new MemoryStorageAdapter();
        const store = new InMemoryRosterStore([dad, mom]);
        const a = new GameSession();
        a.setRosterStore(store);
        a.setSaveService(new PlayerSaveService(adapter));
        a.setLifecycle(new LegacyService(adapter));
        a.setRandomSource(() => 0.99);
        a.setFactorDictionary(dictionary);

        const breeding = new BreedingService(store, graph, { random: () => 0, currentSeason: () => a.gameTime.totalSeasonsElapsed });
        const childId = breeding.breed('dad', 'mom').child!.id;
        for (let i = 0; i < 20; i++) await a.advanceSeason();
        new UnveilingService(store, () => 0.5).choose(childId, 'accept');
        const nurture = new NurtureService(store, {
            random: seeded(13),
            currentSeason: () => a.gameTime.totalSeasonsElapsed,
            currentMode: () => a.gameTime.currentMode,
        });
        a.setNurtureStatePort(nurture);
        nurture.start(childId, []);
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) {
            const current = nurture.getSession(childId)!;
            nurture.train(childId, current.vigor < 45 ? 'rest' : TRAINING_KINDS[i % 5]);
        }
        nurture.graduate(childId);
        assert.isTrue(await a.setLeadGeneral(childId));
        await a.recordBattle([childId], 'player-win', { stageId: 'stage-1', sortie: { lostTroops: 2000, foodSpent: 100 } });
        const ageBefore = (a.roster.find((g) => g.id === childId) as { age: number }).age;
        const spent = a.spendLifespan(childId, 'breeding');
        assert.isTrue(!!spent, '畢業武將可主動扣壽命');
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        b.setFactorDictionary(dictionary);
        const bStore = new InMemoryRosterStore([]);
        b.setRosterStore(bStore);
        b.setNurtureStatePort(new NurtureService(bStore, {
            random: seeded(13),
            currentSeason: () => b.gameTime.totalSeasonsElapsed,
            currentMode: () => b.gameTime.currentMode,
        }));
        assert.isTrue(await b.load());
        const snapA = JSON.parse(JSON.stringify(a.createSnapshot(new Date(0)))) as Record<string, unknown>;
        const snapB = JSON.parse(JSON.stringify(b.createSnapshot(new Date(0)))) as Record<string, unknown>;
        for (const key of new Set([...Object.keys(snapA), ...Object.keys(snapB)])) {
            assert.equals(canonical(snapA[key]), canonical(snapB[key]), `存檔欄位 ${key} 讀檔後不一致`);
        }
        const loaded = b.roster.find((g) => g.id === childId) as { age: number; battleRecord?: { wins: number } };
        assert.equals(1, loaded.battleRecord!.wins, '戰績保留');
        assert.isTrue(loaded.age >= ageBefore, '壽命與年齡在存讀後沒有倒退');
        assert.equals(childId, b.leadGeneralId!);
        await a.advanceSeason();
        await b.advanceSeason();
        assert.equals(canonical(a.roster), canonical(b.roster), '各推進一季後名冊一致');
    });

    return suite;
}
