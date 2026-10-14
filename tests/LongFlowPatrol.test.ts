// QA 巡檢（PROG-2-0603）：名冊進場正規化的防呆與「新局→結緣→出征→存檔續玩」長流程
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { normalizeRosterRoles } from '../assets/scripts/core/systems/RosterRoleLoad';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gen(id: string, gender: '男' | '女', age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
    } as unknown as GeneralConfig;
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

    return suite;
}
