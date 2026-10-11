import { Faction } from '../assets/scripts/shared/CommonEnums';
import { TestSuite, assert } from './TestRunner';
import { SeededRandom, validateRandomState, LEGACY_RANDOM_SEED } from '../assets/scripts/core/systems/SeededRandom';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { unveilGeneral } from '../assets/scripts/core/systems/Unveiling';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function same(expected: unknown, actual: unknown): void {
    assert.equals(JSON.stringify(expected), JSON.stringify(actual));
}
function rejects(action: () => unknown): void {
    let failed = false;
    try { action(); } catch { failed = true; }
    assert.isTrue(failed);
}
function general(id: string, gender = '男', age = 30): GeneralConfig {
    return { id, name: id, gender, age, faction: Faction.Player, hp: 1000,
        vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70,
        pol: 50, cha: 60, luk: 40, genes: [] } as GeneralConfig;
}
function setup(seed: number, save: PlayerSaveService, generals: GeneralConfig[] = []) {
    const session = new GameSession(seed);
    const roster = new InMemoryRosterStore(generals);
    session.setRosterStore(roster);
    session.setSaveService(save);
    session.setAutoSave(false);
    return { session, roster };
}

export function createSeededRandomSuite(): TestSuite {
    const suite = new TestSuite('SeededRandom / Q25');
    suite.test('演算法已知向量與半開範圍', () => {
        const rng = new SeededRandom(1);
        same([0.6270739405881613, 0.002735721180215478, 0.5274470399599522],
            [rng.next(), rng.next(), rng.next()]);
        for (const seed of [0, 0xffffffff]) {
            const source = new SeededRandom(seed);
            for (let i = 0; i < 1000; i++) {
                const value = source.next();
                assert.isTrue(value >= 0 && value < 1);
            }
        }
    });
    suite.test('恢復目前游標、快照不共享、不同種子不同序列', () => {
        const rng = new SeededRandom(21);
        rng.next(); rng.next();
        const state = rng.snapshot();
        const restored = new SeededRandom(0);
        restored.restore(state);
        state.state = 0;
        same(Array.from({ length: 20 }, () => rng.next()), Array.from({ length: 20 }, () => restored.next()));
        assert.notEquals(new SeededRandom(1).next(), new SeededRandom(2).next());
    });
    suite.test('壞狀態與未知版本拒絕，不能默默重新抽取', () => {
        for (const raw of [null, {}, { algorithm: 'future', state: 1 },
            ...[-1, 0.5, Infinity, NaN, 4294967296].map(state => ({ algorithm: 'mulberry32-v1', state }))]) {
            rejects(() => validateRandomState(raw));
        }
    });
    suite.test('實際儲存後重建，既有 callback 接續相同序列', async () => {
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const original = setup(19, save).session;
        original.randomSource(); original.randomSource();
        await original.save();
        const restored = setup(200, save).session;
        const callback = restored.randomSource;
        await restored.load();
        same(Array.from({ length: 15 }, () => original.randomSource()), Array.from({ length: 15 }, () => callback()));
    });
    suite.test('舊檔固定遷移，下一次存檔補狀態', async () => {
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const old = new GameSession(1).createSnapshot();
        delete old.randomState;
        await save.save(old);
        const session = setup(200, save).session;
        await session.load();
        assert.equals(new SeededRandom(LEGACY_RANDOM_SEED).next(), session.randomSource());
        await session.save();
        assert.isTrue((await save.load())!.randomState !== undefined);
    });
    suite.test('新局重設游標而不沿用上一局', () => {
        const session = new GameSession(7);
        session.randomSource();
        session.startNewGame(7);
        assert.equals(new SeededRandom(7).next(), session.randomSource());
    });
    suite.test('存檔驗證拒絕損壞游標', () => {
        rejects(() => validatePlayerSaveSnapshot({ ...new GameSession(1).createSnapshot(), randomState: null }));
    });
    suite.test('老化季結：讀檔後名冊與亂數游標一致', async () => {
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const original = setup(21, save, [general('elder', '男', 80)]).session;
        await original.save();
        const restored = setup(0, save).session;
        await restored.load();
        for (let i = 0; i < 8; i++) { await original.advanceSeason(); await restored.advanceSeason(); }
        same(original.roster, restored.roster);
        same(original.createSnapshot().randomState, restored.createSnapshot().randomState);
    });
    suite.test('宿命與培育中途存檔：後續休息和訓練結果一致', async () => {
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const child = unveilGeneral({ ...general('child', '男', 5), status: 'Mystery', hiddenFlags: ['mystery-phase'] }).general;
        const original = setup(21, save, [child]);
        new UnveilingService(original.roster, original.session.randomSource).choose('child', 'defy');
        const nurture = (value: ReturnType<typeof setup>) => {
            const service = new NurtureService(value.roster, { random: value.session.randomSource,
                currentSeason: () => 1, currentMode: () => GameTimeMode.Nurture });
            value.session.setNurtureStatePort(service);
            return service;
        };
        const first = nurture(original);
        first.start('child'); first.train('child', 'str');
        await original.session.save();
        const restored = setup(0, save);
        const second = nurture(restored);
        await restored.session.load();
        for (const action of ['rest', 'str', 'rest', 'int'] as const) {
            same(first.train('child', action), second.train('child', action));
        }
        same(original.session.createSnapshot().randomState, restored.session.createSnapshot().randomState);
    });
    suite.test('結緣注入共用來源：相同存檔與操作產出一致', async () => {
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const original = setup(7, save, [general('father'), general('mother', '女')]);
        await original.session.save();
        const restored = setup(0, save);
        await restored.session.load();
        const breed = (value: ReturnType<typeof setup>) => new BreedingService(value.roster, new BloodlineGraph(),
            { random: value.session.randomSource, currentSeason: () => 1 }).breed('father', 'mother');
        const result = breed(original);
        assert.equals('conceived', result.outcome);
        same(result, breed(restored));
        same(original.roster.getAll(), restored.roster.getAll());
        same(original.session.createSnapshot().randomState, restored.session.createSnapshot().randomState);
    });
    return suite;
}
