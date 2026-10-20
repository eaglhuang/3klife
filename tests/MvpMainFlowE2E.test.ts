/**
 * MvpMainFlowE2E — MVP 主流程端到端（QA，PROG-2-0629）
 * 開局 → 結緣 → 長輩退役成教官卡 → 子嗣長到 5 歲開獎 → 宿命選擇 → 帶教官培育 36 回合畢業 → 戰鬥 → 存讀檔。
 *
 * Unity 對照：像一支從主選單點到第一代畢業的 PlayMode 冒煙測試，所有服務都接在同一個 GameSession 與名冊上，
 * 中間不手動改任何資料，只呼叫玩家在畫面上會觸發的入口。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
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

function buildWorld(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): World {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    const legacy = new LegacyService(adapter);
    const emitted: string[] = [];
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(adapter));
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

export function createMvpMainFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('MvpMainFlowE2E (開局→結緣→退役→開獎→培育→畢業→戰鬥→存檔)');

    suite.test('一整輪：每一步的產物都被下一步用上，最後存讀檔一致', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const adapter = new MemoryStorageAdapter();
        const w = buildWorld(adapter, [person('hero', '男', 30), person('lady', '女', 28), person('elder', '男', 64)]);
        const { session } = w;

        // ── 開局 ──
        session.startNewGame(20261020);
        assert.equals(1, session.gameTime.currentYear);

        // ── 結緣：受孕成功，子嗣進名冊，母方待產 ──
        const bred = w.breeding.breed('hero', 'lady');
        assert.equals('conceived', bred.outcome);
        const childId = bred.child!.id;
        assert.isTrue(w.store.getAll().some((g) => g.id === childId), '子嗣進名冊');

        // ── 長輩滿 65 歲後退役，成為教官卡 ──
        let seasons = 0;
        while (((w.store.getAll().find((g) => g.id === 'elder')?.age) ?? 0) < 65 && seasons < 8) { await session.advanceSeason(); seasons++; }
        assert.isTrue(((w.store.getAll().find((g) => g.id === 'elder')?.age) ?? 0) >= 65, '長輩年滿 65');
        const card = await session.retireGeneral('elder');
        assert.equals('elder', card.sourceGeneralId);
        assert.isTrue(w.emitted.includes(GAME_SESSION_EVENTS.GeneralRetired));
        assert.equals(1, (await w.legacy.getMentorCards()).length);

        // ── 子嗣長到 5 歲：每季推進，到齡由 GameSession 自動開獎 ──
        let guard = 0;
        while (!(w.store.getAll().find((g) => g.id === childId) as UnveilingGeneral).fate && guard++ < 40) await session.advanceSeason();
        const unveiled = w.store.getAll().find((g) => g.id === childId) as UnveilingGeneral;
        assert.isTrue(!!unveiled.fate, `${guard} 季後子嗣應已開獎`);
        assert.isTrue(w.emitted.includes(GAME_SESSION_EVENTS.GeneralUnveiled));
        assert.equals(1, w.unveiling.getPendingFate().length, '等待玩家做宿命選擇');

        // ── 宿命選擇 ──
        const chosen = w.unveiling.choose(childId, 'accept');
        assert.isTrue(!!chosen.fate?.choice);
        assert.equals(0, w.unveiling.getPendingFate().length);

        // ── 等到培育季，帶教官卡入學 ──
        guard = 0;
        while (session.gameTime.currentMode !== GameTimeMode.Nurture && guard++ < 6) await session.advanceSeason();
        assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode);
        const [mentorCard] = await w.legacy.getMentorCards();
        const nurtureSession = w.nurture.startWithCards(childId, [mentorCard]);
        assert.equals(0, nurtureSession.round);
        assert.isTrue(w.nurture.lockedMentorIds().length > 0, '培育中教官被鎖定');

        // ── 36 回合：精力低就休息，否則輪流練五項 ──
        let current = w.nurture.getSession(childId)!;
        let rounds = 0;
        let mentorRounds = 0;
        while (current.status === 'active' && rounds++ < 80) {
            const action = current.vigor < 45 ? 'rest' : TRAINING_KINDS[current.round % TRAINING_KINDS.length];
            const round = w.nurture.train(childId, action);
            if (round.log.mentorsOnSlot.length > 0) mentorRounds++;
            current = round.session;
        }
        assert.equals('completed', current.status, '36 回合後培育完成');
        assert.isTrue(mentorRounds > 0, '退役長輩的教官卡在培育中至少站過一次位');

        // ── 畢業：成績寫回名冊、教官解鎖、發探索經驗 ──
        const graduation = w.nurture.graduate(childId);
        const graduate = w.store.getAll().find((g) => g.id === childId) as UnveilingGeneral & { graduationRating?: string };
        assert.isTrue(!!graduate.graduationRating, '名冊上的子嗣有畢業評價');
        assert.equals(graduation.rating, graduate.graduationRating);
        assert.equals(0, w.nurture.lockedMentorIds().length, '畢業後教官解鎖');

        // ── 戰鬥：畢業生出戰，戰績記進名冊 ──
        await session.recordBattle([childId], 'player-win', { stageId: 'stage-1' });
        assert.isTrue(session.clearedStageIds.includes('stage-1'));
        assert.isTrue(!!(w.store.getAll().find((g) => g.id === childId) as GeneralConfig & { battleRecord?: unknown }).battleRecord, '戰績記入名冊');

        // ── 存讀檔：新 Session 讀回後，名冊、教官卡、通關紀錄一致 ──
        await session.save();
        const b = buildWorld(adapter, []);
        assert.isTrue(await b.session.load());
        const ids = (roster: GeneralConfig[]) => roster.map((g) => g.id).sort().join(',');
        assert.equals(ids(w.store.getAll()), ids(b.store.getAll()), '名冊一致');
        assert.equals(JSON.stringify(w.store.getAll().find((g) => g.id === childId)), JSON.stringify(b.store.getAll().find((g) => g.id === childId)), '畢業生資料一致');
        assert.equals(1, (await b.legacy.getMentorCards()).length, '教官卡仍在');
        assert.equals(JSON.stringify(session.clearedStageIds), JSON.stringify(b.session.clearedStageIds));
        assert.equals(session.gameTime.totalSeasonsElapsed, b.session.gameTime.totalSeasonsElapsed);
    });

    return suite;
}
