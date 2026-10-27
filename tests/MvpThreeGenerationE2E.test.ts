/**
 * MvpThreeGenerationE2E — MVP 驗收：祖→父→子三代完整循環（QA，PROG-2-1078）
 * 規格：MVP遊戲驗證規格書（doc_spec_0045）以一輪三代傳承作為可玩循環的驗收條件。
 *
 * Unity 對照：PlayMode 長跑冒煙測試，同一個 GameSession 一路推季：
 * 祖輩結緣 → 第二代開獎、培育、出戰、成年 → 第二代結緣 → 祖輩退役成教官 → 第三代開獎並由祖輩教官帶培育畢業 → 存讀檔。
 */
import { assert, TestSuite } from './TestRunner';
import { buildWorld, person, type World } from './MvpMainFlowE2E.test';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { BREEDING_MIN_AGE } from '../assets/scripts/core/systems/BreedingSystem';
import { TRAINING_KINDS } from '../assets/scripts/core/systems/NurtureSystem';
import { DEFAULT_SEASON_MODIFIERS, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';

const find = (w: World, id: string) => w.store.getAll().find((g) => g.id === id) as (UnveilingGeneral & { graduationRating?: string }) | undefined;

/** 推季直到條件成立；上限防無窮迴圈 */
async function advanceUntil(w: World, done: () => boolean, max: number): Promise<number> {
    let n = 0;
    while (!done() && n < max) { await w.session.advanceSeason(); n++; }
    return n;
}

/** 開獎後做宿命選擇，等到培育季帶教官卡入學並訓練到畢業 */
async function unveilAndGraduate(w: World, childId: string, mentors: MentorCard[]): Promise<string> {
    await advanceUntil(w, () => !!find(w, childId)?.fate, 40);
    assert.isTrue(!!find(w, childId)?.fate, `${childId} 應已開獎`);
    w.unveiling.choose(childId, 'accept');
    await advanceUntil(w, () => w.session.gameTime.currentMode === GameTimeMode.Nurture, 6);
    w.nurture.startWithCards(childId, mentors);
    let current = w.nurture.getSession(childId)!;
    let guard = 0;
    while (current.status === 'active' && guard++ < 80) {
        const action = current.vigor < 45 ? 'rest' : TRAINING_KINDS[current.round % TRAINING_KINDS.length];
        current = w.nurture.train(childId, action).session;
    }
    assert.equals('completed', current.status, `${childId} 培育完成`);
    return w.nurture.graduate(childId).rating;
}

export function createMvpThreeGenerationE2ESuite(): TestSuite {
    const suite = new TestSuite('MvpThreeGenerationE2E (祖→父→子三代循環)');

    suite.test('三代：第二代成年結緣、祖輩退役帶第三代畢業，存讀檔後血脈一致', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const adapter = new MemoryStorageAdapter();
        // 祖輩 45 歲：第二代成年（20 歲）時正好過 65 歲可退役；兩位不同性別的同輩配偶候選
        const w = buildWorld(adapter, [
            person('grandpa', '男', 45), person('grandma', '女', 43),
            person('suitor-m', '男', 8), person('suitor-f', '女', 8),
        ]);
        w.session.startNewGame(20261024);

        // ── 第一代結緣 → 第二代 ──
        const gen1 = w.breeding.breed('grandpa', 'grandma');
        assert.equals('conceived', gen1.outcome);
        const fatherId = gen1.child!.id;

        // ── 第二代開獎、培育畢業、出戰 ──
        const gen2Rating = await unveilAndGraduate(w, fatherId, []);
        assert.equals(gen2Rating, find(w, fatherId)?.graduationRating);
        await w.session.recordBattle([fatherId], 'player-win', { stageId: 'stage-1' });

        // ── 第二代成年 → 與異性配偶結緣 → 第三代 ──
        const seasons = await advanceUntil(w, () => (find(w, fatherId)?.age ?? 0) >= BREEDING_MIN_AGE, 120);
        assert.isTrue((find(w, fatherId)?.age ?? 0) >= BREEDING_MIN_AGE, `${seasons} 季後第二代成年`);
        const gen2 = find(w, fatherId)! as unknown as GeneralConfig;
        const male = gen2.gender === '男';
        const gen3 = male ? w.breeding.breed(fatherId, 'suitor-f') : w.breeding.breed('suitor-m', fatherId);
        assert.equals('conceived', gen3.outcome, '第二代結緣受孕');
        const childId = gen3.child!.id;

        // ── 祖輩退役成教官卡，帶第三代培育畢業 ──
        assert.isTrue((find(w, 'grandpa')?.age ?? 0) >= 65, '祖輩年滿 65');
        const card = await w.session.retireGeneral('grandpa');
        assert.equals('grandpa', card.sourceGeneralId);
        const mentors = await w.legacy.getMentorCards();
        const gen3Rating = await unveilAndGraduate(w, childId, mentors);
        assert.isTrue(!!gen3Rating, '第三代畢業');

        // ── 存讀檔：三代都在名冊，第三代的父母鏈接回祖輩 ──
        await w.session.save();
        const b = buildWorld(adapter, []);
        assert.isTrue(await b.session.load());
        const loaded = (id: string) => b.store.getAll().find((g) => g.id === id) as (GeneralConfig & { parentIds?: string[]; fatherId?: string; motherId?: string }) | undefined;
        assert.isTrue(!!loaded(fatherId) && !!loaded(childId), '第二、三代讀檔後仍在名冊');
        const gen2Loaded = loaded(fatherId)!;
        assert.isTrue([gen2Loaded.fatherId, gen2Loaded.motherId].includes('grandpa'), '第二代的父母鏈指向祖輩');
        const gen3Loaded = loaded(childId)!;
        assert.isTrue([gen3Loaded.fatherId, gen3Loaded.motherId].includes(fatherId), '第三代的父母鏈指向第二代');
        assert.equals(gen3Rating, (loaded(childId) as { graduationRating?: string }).graduationRating);
        assert.equals(1, (await b.legacy.getMentorCards()).length, '祖輩教官卡仍在');
        assert.isTrue(b.session.clearedStageIds.includes('stage-1'));
    });

    return suite;
}
