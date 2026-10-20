/**
 * SaveSixTableGraduationE2E — 真實流程產生的存檔 × 六表映射 × 培育紀錄（QA，PROG-2-0632）
 * 驗證 #651（畢業寫培育紀錄）與 #652（存檔映射六表列）在真實遊戲資料上不會互相打架。
 *
 * Unity 對照：像一支從主選單點到第一代畢業的 PlayMode 冒煙測試，所有服務都接在同一個 GameSession 與名冊上，
 * 中間不手動改任何資料，只呼叫玩家在畫面上會觸發的入口。
 */
import { assert, TestSuite } from './TestRunner';
import { validateNurtureRecordRow } from '../server/schema/nur15-row-validators';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { mapSnapshotToSixTables } from '../assets/scripts/core/services/PlayerSaveTableRows';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { buildFactorDictionary, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { mentorFromCard, TRAINING_KINDS } from '../assets/scripts/core/systems/NurtureSystem';
import { DEFAULT_SEASON_MODIFIERS, seasonModifiersOf, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const dictionary: FactorDictionary = buildFactorDictionary(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/master/gene-dictionary.json'), 'utf8')),
);

function person(id: string, gender: '男' | '女', age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk: 40, careerClass: 'Warrior',
        genes: [{ id: 'gene_command', level: 3 }],
        ...extra,
    } as unknown as GeneralConfig;
}

interface World {
    session: GameSession;
    store: InMemoryRosterStore;
    legacy: LegacyService;
    breeding: BreedingService;
    nurture: NurtureService;
    unveiling: UnveilingService;
    emitted: string[];
}

function buildWorld(adapter: MemoryStorageAdapter, roster: GeneralConfig[], saveService = new PlayerSaveService(adapter)): World {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    const legacy = new LegacyService(adapter);
    const emitted: string[] = [];
    session.setRosterStore(store);
    session.setSaveService(saveService);
    session.setLifecycle(legacy);
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    // 亂數固定 0.99：不會老死、不會受傷、訓練消耗取上限；結緣另外給 0.01 保證受孕
    session.setRandomSource(() => 0.99);
    const nurture = new NurtureService(store, {
        random: session.randomSource,
        currentSeason: () => session.gameTime.totalSeasonsElapsed,
        currentMode: () => session.gameTime.currentMode,
        seasonTrainingVigorMod: () => seasonModifiersOf(session.gameTime.currentSeason).trainingStaminaMultiplier,
    });
    session.setNurtureStatePort(nurture);
    const breeding = new BreedingService(store, new BloodlineGraph(), {
        random: () => 0.01,
        dictionary,
        currentSeason: () => session.gameTime.totalSeasonsElapsed,
    });
    const unveiling = new UnveilingService(store, session.randomSource);
    return { session, store, legacy, breeding, nurture, unveiling, emitted };
}

export function createSaveSixTableGraduationE2ESuite(): TestSuite {
    const suite = new TestSuite('SaveSixTableGraduationE2E (真實存檔×六表映射×畢業培育紀錄)');

    async function playToGraduation(world: World): Promise<string> {
        const { session } = world;
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        session.startNewGame(20261020);
        const bred = world.breeding.breed('hero', 'lady');
        assert.equals('conceived', bred.outcome);
        const childId = bred.child!.id;
        let guard = 0;
        while (!(world.store.getAll().find((g) => g.id === childId) as UnveilingGeneral).fate && guard++ < 40) await session.advanceSeason();
        world.unveiling.choose(childId, 'accept');
        guard = 0;
        while (session.gameTime.currentMode !== GameTimeMode.Nurture && guard++ < 6) await session.advanceSeason();
        world.nurture.start(childId);
        let current = world.nurture.getSession(childId)!;
        let rounds = 0;
        while (current.status === 'active' && rounds++ < 80) {
            const action = current.vigor < 45 ? 'rest' : TRAINING_KINDS[current.round % TRAINING_KINDS.length];
            current = world.nurture.train(childId, action).session;
        }
        assert.equals('completed', current.status);
        world.nurture.graduate(childId);
        return childId;
    }

    suite.test('真實玩到畢業後存檔：六表映射不阻擋存檔，錯誤只落在已知的資料落差欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const saveService = new PlayerSaveService(adapter);
        const w = buildWorld(adapter, [person('hero', '男', 30), person('lady', '女', 28)], saveService);
        await playToGraduation(w);
        await w.session.save();
        const snapshot = (await saveService.load())!;
        assert.isDefined(snapshot, '存檔照常寫入、可讀回');
        const mapped = mapSnapshotToSixTables(snapshot);
        assert.equals(snapshot.roster.length, mapped.rows.generals.length, '每個名冊武將一列');
        assert.equals(mapped.errors.join('|'), saveService.lastSixTableErrors().join('|'), 'service 回報與直接映射一致');
        // 已知落差（#652 暫定範圍）：母資料 generals-base.json 沒有 templateId / bloodlineId / status，
        // 子嗣的 status 是 Mystery，不在六表 CHECK 的 Active/Training/Retired/Dead 內。
        // 這裡只擋「出現已知欄位以外的新錯誤」；落差補齊後此測試仍會通過。
        const KNOWN_GAP = /\.(template_id|bloodline_id|role|status):/;
        const unexpected = mapped.errors.filter((message) => !KNOWN_GAP.test(message));
        assert.equals(0, unexpected.length, unexpected.join('；'));
        assert.equals(0, mapped.errors.filter((m) => m.startsWith('player_resources')).length, '資源列不該出錯');
    });

    suite.test('畢業培育紀錄：存讀檔後仍在，欄位與子嗣、季數一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const w = buildWorld(adapter, [person('hero', '男', 30), person('lady', '女', 28)]);
        const childId = await playToGraduation(w);
        await w.session.save();
        const snapshot = (await new PlayerSaveService(adapter).load())!;
        const records = snapshot.nurture?.graduationRecords ?? [];
        assert.equals(1, records.length, '存檔裡有一筆畢業紀錄');
        const record = records[0];
        assert.equals(childId, record.child_uid);
        assert.isTrue(record.end_season >= record.start_season, '結束季不早於開始季');
        assert.isTrue(typeof record.tp_total === 'number', '新培育會話有 totalTp');
        // server 列驗證：目前只允許 revelation_level 未接線這一項（#651 已知，待 PM 裁定）
        const serverErrors = validateNurtureRecordRow(record as never);
        assert.equals(1, serverErrors.length, serverErrors.join('；'));
        assert.isTrue(serverErrors[0].startsWith('revelation_level'));
        // 重新載入後再存一次，紀錄不重複、不遺失
        const b = buildWorld(adapter, []);
        assert.isTrue(await b.session.load());
        await b.session.save();
        const again = (await new PlayerSaveService(adapter).load())!;
        assert.equals(1, (again.nurture?.graduationRecords ?? []).length);
    });

    return suite;
}
