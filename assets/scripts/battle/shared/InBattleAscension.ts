// @spec-source → 戰場策略相剋與即時將階晉升功能規格書.md (doc_spec_0309) §4、§5；門檻沿用 GeneralRankProgress（11/06 裁決）；PROG-2-1905
/**
 * InBattleAscension — 戰場即時將階晉升（純邏輯，不依賴 cc）。
 *
 * 戰鬥中斬將、單挑、擊破部隊、討伐 BOSS 時立即入帳名聲；
 * 跨過門檻就回傳一筆升階事件，附上新帶兵上限與「局內激勵」清單，
 * 讓畫面層（BattleScene 解鎖後）播定格特寫並套用效果。
 *
 * 門檻、稱號、帶兵上限一律讀 GeneralRankProgress／SortieDeploy，不另存一份。
 *
 * Unity 對照：像戰鬥中的 OnKill 事件 → 等級系統 AddExp()，回傳 LevelUp 事件給 Timeline 播演出。
 */
import { GENERAL_FAME_AWARD, gainGeneralFame, generalRankTitle, type GeneralFameHolder } from '../../core/systems/GeneralRankProgress';
import { COMMAND_CAPACITY_RANK_BASE } from '../../core/systems/SortieDeploy';

/** 局內名聲來源（§4.1）；數字取自 GENERAL_FAME_AWARD，避免兩份數值 */
export enum BattleFameSource {
    VICTORY = 'VICTORY',
    COMMANDER_KILL = 'COMMANDER_KILL',
    DUEL_VICTORY = 'DUEL_VICTORY',
    BOSS_OR_NATIVE = 'BOSS_OR_NATIVE',
}

export const BATTLE_FAME_SOURCE_GAIN: Record<BattleFameSource, number> = {
    [BattleFameSource.VICTORY]: GENERAL_FAME_AWARD.battleWin,
    [BattleFameSource.COMMANDER_KILL]: GENERAL_FAME_AWARD.enemyCommanderSlain,
    [BattleFameSource.DUEL_VICTORY]: GENERAL_FAME_AWARD.duelWin,
    [BattleFameSource.BOSS_OR_NATIVE]: GENERAL_FAME_AWARD.bossOrInvasionWin,
};

/** 升上某將階時的局內激勵（§4.2 表格最右欄） */
export interface AscendSurge {
    rank: number;
    /** 該部隊即時補充的兵力 */
    troopRefill?: number;
    /** 全軍士氣拉滿至上限 */
    moraleToMax?: boolean;
    /** 全隊移動力加成 */
    moveBonus?: number;
    /** 敵方全體士氣變化 */
    enemyMoraleDelta?: number;
    /** 全軍暴擊率加成（百分點） */
    critRatePct?: number;
    /** Buff／技能名稱（畫面提示用） */
    label: string;
}

export const IN_BATTLE_ASCEND_SURGES: readonly AscendSurge[] = [
    { rank: 1, troopRefill: 1000, label: '士氣高昂' },
    { rank: 2, moraleToMax: true, label: '衝鋒追擊' },
    { rank: 3, moveBonus: 1, label: '戰鼓震天' },
    { rank: 4, enemyMoraleDelta: -15, label: '軍勢鼓舞' },
    { rank: 5, critRatePct: 20, label: '天下無雙' },
];

/** 升階定格演出參數（§4.2 劇本） */
export const ASCEND_CUTSCENE = {
    freezeTimeScale: 0,
    cameraFocusSec: 0.3,
    holdSec: 1.5,
    resumeTimeScale: 1,
} as const;

export interface IBattleAscendEvent {
    generalUid: string;
    generalName: string;
    oldRank: number;
    newRank: number;
    newRankTitle: string;
    newTroopCap: number;
    fameDelta: number;
    currentTotalFame: number;
    /** 這次跨過的每一階各自的激勵（連跨兩階就兩筆，由低到高） */
    surges: AscendSurge[];
}

export interface BattleAscendCandidate extends GeneralFameHolder {
    uid: string;
    name: string;
}

export interface BattleAscendResult<T extends BattleAscendCandidate> {
    general: T;
    event: IBattleAscendEvent | null;
}

export function troopCapForRank(rank: number): number {
    const index = Math.max(0, Math.min(COMMAND_CAPACITY_RANK_BASE.length - 1, Math.floor(rank)));
    return COMMAND_CAPACITY_RANK_BASE[index];
}

/** 入帳一次（或連續數次）局內名聲；跨門檻時回傳升階事件 */
export function applyBattleFame<T extends BattleAscendCandidate>(general: T, sources: readonly BattleFameSource[]): BattleAscendResult<T> {
    const gain = sources.reduce((sum, s) => sum + BATTLE_FAME_SOURCE_GAIN[s], 0);
    const oldRank = general.generalRank ?? 0;
    const { general: next, promotedRanks } = gainGeneralFame(general, gain);
    if (promotedRanks.length === 0) return { general: next, event: null };
    const newRank = next.generalRank ?? 0;
    return {
        general: next,
        event: {
            generalUid: general.uid,
            generalName: general.name,
            oldRank,
            newRank,
            newRankTitle: generalRankTitle(newRank),
            newTroopCap: troopCapForRank(newRank),
            fameDelta: gain,
            currentTotalFame: next.generalFame ?? 0,
            surges: promotedRanks.map((r) => IN_BATTLE_ASCEND_SURGES.find((s) => s.rank === r)!).filter(Boolean),
        },
    };
}

/** 把激勵合併成一份效果（連跨多階時給畫面層一次套用） */
export type MergedAscendSurge = Required<Omit<AscendSurge, 'rank' | 'label'>>;

export function mergeAscendSurges(surges: readonly AscendSurge[]): MergedAscendSurge {
    return surges.reduce<MergedAscendSurge>((acc, s) => ({
        troopRefill: acc.troopRefill + (s.troopRefill ?? 0),
        moraleToMax: acc.moraleToMax || !!s.moraleToMax,
        moveBonus: acc.moveBonus + (s.moveBonus ?? 0),
        enemyMoraleDelta: acc.enemyMoraleDelta + (s.enemyMoraleDelta ?? 0),
        critRatePct: acc.critRatePct + (s.critRatePct ?? 0),
    }), { troopRefill: 0, moraleToMax: false, moveBonus: 0, enemyMoraleDelta: 0, critRatePct: 0 });
}
