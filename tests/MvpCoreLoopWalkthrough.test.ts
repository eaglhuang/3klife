/**
 * MvpCoreLoopWalkthrough — MVP 核心循環 headless 貫通驗收（doc_spec_0308 §3 CP-04～07、CP-09、CP-10，PROG-2-1907）
 *
 * 一條龍串起：入學 → 36 回合策論培育 → 結業寫回 → 戰場斬將即時升階 → 退役轉教官 → 二代借用入學。
 * CP-01～03、CP-08 屬畫面操作，不在此檔。
 *
 * Unity 對照：PlayMode 以外的整合測試，直接呼叫各系統純函式跑完整流程。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { GameTimeState } from '../assets/scripts/core/systems/GameClock';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { RETIREMENT_AGE } from '../assets/scripts/core/systems/GeneralAging';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import {
    EssayCardCategory,
    TAC_LIAODI_JIXIAN,
    YINGCHUAN_GIMMICK,
    YINGCHUAN_HAND_LIMIT,
    YingchuanDebateResolver,
    assignYingchuanMentors,
    yingchuanStateOf,
} from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import { applyAcademyGraduation, AcademyGraduationError, academyGradeOf } from '../assets/scripts/core/systems/nurture/AcademyGraduation';
import { applyBattleFame, BattleFameSource, mergeAscendSurges } from '../assets/scripts/battle/shared/InBattleAscension';
import { extractLegendaryMentor, legendaryMentorToYingchuan } from '../assets/scripts/core/systems/GenerationalLegacy';

const G = YINGCHUAN_GIMMICK;

function child(): GeneralConfig {
    return { id: 'zhao-tong', name: '趙統', faction: 'shu', hp: 100, str: 40, int: 35, lea: 38, pol: 25, cha: 30, age: 15, generalFame: 0, generalRank: 0 } as unknown as GeneralConfig;
}

function enroll(general: GeneralConfig, mode = AcademyControlMode.AUTO): AcademyStateSnapshot {
    return createAcademySnapshot({
        worldSeed: 'mvp-world', clanUuid: 'clan-zhao', childId: general.id, academyId: AcademyId.YINGCHUAN, admissionTurn: 1, controlMode: mode,
        initialStats: { str: general.str ?? 0, lea: general.lea ?? 0, int: general.int ?? 0, pol: (general as unknown as { pol: number }).pol, cha: (general as unknown as { cha: number }).cha },
    }, G);
}

/** 自動模式跑完 36 回合：精力不足就休息，否則練智力；回傳每一步的最大手牌數 */
function runAcademy(state: AcademyStateSnapshot): { state: AcademyStateSnapshot; maxHand: number } {
    let maxHand = 0;
    for (let guard = 0; guard < 400 && !state.graduated; guard++) {
        const action = state.energy < 40 ? { actionType: 'REST' as const } : { actionType: 'TRAIN' as const, targetStat: 'int' as const };
        state = resolveAcademyAction(state, action, G);
        maxHand = Math.max(maxHand, yingchuanStateOf(state).handCards.length);
    }
    return { state, maxHand };
}

const TIME: GameTimeState = { currentYear: 200, currentSeason: 0, totalSeasonsElapsed: 40, currentMode: 'normal' } as unknown as GameTimeState;

export function createMvpCoreLoopWalkthroughSuite(): TestSuite {
    const suite = new TestSuite('MvpCoreLoopWalkthrough (MVP 核心循環貫通 PROG-2-1907)');

    suite.test('CP-04：入學產生鏡像快照，種子固定且不動武將本體', () => {
        const g = child();
        const a = enroll(g);
        const b = enroll(g);
        assert.equals(a.prngSeedHex, b.prngSeedHex);
        assert.equals(64, a.prngSeedHex.length);
        a.stats.int = 999;
        assert.equals(35, g.int);
    });

    suite.test('CP-05～07：36 回合手牌不超過 5、第 6 回合清談、結業寫回並解鎖料敵機先', () => {
        const g = child();
        const { state, maxHand } = runAcademy(enroll(g));
        assert.isTrue(state.graduated);
        assert.isTrue(maxHand <= YINGCHUAN_HAND_LIMIT);
        assert.isTrue(maxHand > 0, '有抽到策論牌');
        assert.isTrue(state.chronicles.some((c) => c.turn === 6 && c.title === '潁水清談'));
        assert.equals('TRI_HARMONIC', YingchuanDebateResolver.evaluateCombo([
            { id: 'a', name: 'a', category: EssayCardCategory.SKY, star: 1, debatePower: 10 },
            { id: 'b', name: 'b', category: EssayCardCategory.EARTH, star: 1, debatePower: 10 },
            { id: 'c', name: 'c', category: EssayCardCategory.PEOPLE, star: 1, debatePower: 10 },
        ]).comboType);
        const done = applyAcademyGraduation(g, state);
        assert.isTrue((done.general.learnedTactics ?? []).indexOf(TAC_LIAODI_JIXIAN) >= 0);
        assert.equals(state.stats.int, done.general.int);
        assert.isTrue((done.general.int ?? 0) > 35);
        assert.equals(academyGradeOf(done.statTotal), done.grade);
        assert.equals(35, g.int, '原物件不被改動');
        // 同一種子重跑結果一致
        assert.equals(JSON.stringify(state.stats), JSON.stringify(runAcademy(enroll(child())).state.stats));
    });

    suite.test('結業寫回防線：未結業或快照不屬於該武將就拒絕', () => {
        const g = child();
        assert.throws(() => applyAcademyGraduation(g, enroll(g)));
        const { state } = runAcademy(enroll(g));
        const other = { ...g, id: 'someone' } as GeneralConfig;
        let err: unknown = null;
        try { applyAcademyGraduation(other, state); } catch (e) { err = e; }
        assert.isTrue(err instanceof AcademyGraduationError);
    });

    suite.test('CP-09～10：斬將升階、退役轉教官、二代借用入學起始羈絆 50', async () => {
        const g = child();
        let general = applyAcademyGraduation(g, runAcademy(enroll(g)).state).general;
        general = { ...general, generalFame: 90 };
        const battle = applyBattleFame({ ...general, uid: general.id }, [BattleFameSource.COMMANDER_KILL]);
        assert.equals(1, battle.event!.newRank);
        assert.equals(6000, battle.event!.newTroopCap);
        assert.equals(1000, mergeAscendSurges(battle.event!.surges).troopRefill);
        general = { ...general, generalFame: battle.general.generalFame, generalRank: battle.general.generalRank, age: RETIREMENT_AGE } as GeneralConfig;

        const service = new LegacyService(new MemoryStorageAdapter());
        const retired = await service.retireGeneral([general], general.id, TIME);
        const cards = await service.getMentorCards();
        assert.equals(1, cards.length);
        assert.equals(general.id, retired.card.sourceGeneralId);

        const legend = extractLegendaryMentor(retired.card, { isBloodline: true, tacticId: TAC_LIAODI_JIXIAN });
        assert.equals(TAC_LIAODI_JIXIAN, legend.inherentTacticId);
        const mentor = legendaryMentorToYingchuan(legend)!;
        const heir = { ...child(), id: 'zhao-guang', name: '趙廣' } as GeneralConfig;
        const s2 = assignYingchuanMentors(enroll(heir, AcademyControlMode.MANUAL), [mentor]);
        assert.equals(50, yingchuanStateOf(s2).mentors[0].bond);
        assert.equals(TAC_LIAODI_JIXIAN, yingchuanStateOf(s2).mentors[0].signatureTactic);
    });

    return suite;
}
