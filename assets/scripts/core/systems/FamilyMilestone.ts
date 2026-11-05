// @spec-source → 血統與家系漸進揭露里程碑總綱規格書.md §E M_stage 表、§G 里程碑、§H UI_MILESTONE_*；PROG-2-1838
/**
 * FamilyMilestone — 家族揭露階段 M_stage 的升階判定與演出句（純邏輯，不依賴 cc）
 *
 * G2、G4 由家族統計算出；G3 要玩家選中表親，由 Session 另外觸發。
 * 規格的「初代家主退位」目前沒有對應資料，G2 只看首位子嗣成年。
 * §G 的句子把「此女、少主」寫死，實際配對不一定，這裡改放雙親姓名。
 *
 * Unity 對照：像一個一次性的進度門檻表，階段本身由 Session 保存。
 */
import type { ClanStats } from './ClanTier';

export type MilestoneStage = 1 | 2 | 3 | 4;

const G4_MIN_GENERATIONS = 4;
const G4_MIN_EP75 = 3;
const KIN_STAGE: MilestoneStage = 3;

const STORY_LINE: Partial<Record<MilestoneStage, string>> = {
    2: '史官呈上《家乘譜牒》：「主公半生戎馬，功業（EP）彪炳，已載入宗祠。自今日起，可翻閱【三代十四席族譜】，觀門風之延續！」',
    4: '朝廷詔書／天下名士共尊：「汝族累世公卿，文武輩出，今尊為【天下郡望】！凡我族血胤，皆得宗脈庇佑！」',
};

/** §H UI_MILESTONE_G2_UNLOCK～G4_UNLOCK */
const UNLOCK_LINE: Partial<Record<MilestoneStage, string>> = {
    2: '📜 已解鎖【三代宗族譜牒】與【生平功業（EP）傳承】視圖！',
    3: '🧬 已解鎖【外戚血脈純化】、【血脈清濁燈號】與【世交合譜】機制！',
    4: '👑 恭喜開宗立派！已解鎖【天下郡望】與【宗脈專屬家傳】系統！',
};

/** §H UI_MILESTONE_G1_HINT */
export const MILESTONE_G1_HINT = '【初創家業】目前僅顯示鄉評風聞與基礎開蒙，待子嗣成材修纂族譜後將解鎖深層血脈資訊。';
/** M_stage 表：G2 近婚只給這句文字警告 */
export const KIN_TEXT_WARNING = '親緣過近，恐損氣血';
/** M_stage 表：G1 隱藏星數，開蒙、加冠時才演出 */
export const G1_FACTOR_TEXT = '因子：開蒙、加冠時揭曉';
/** G1 只看得到父母兩席 */
const G1_VISIBLE_SEATS = 2;

export function ancestorSeatVisible(stage: MilestoneStage, seatIndex: number): boolean {
    return stage >= 2 || seatIndex < G1_VISIBLE_SEATS;
}

/** 族譜視圖：G1 只有父母一代（generation 1），G2 起展開三代 14 人 */
export function treeGenerationVisible(stage: MilestoneStage, generation: 1 | 2 | 3): boolean {
    return stage >= 2 || generation === 1;
}

/** 因子星級、顯性與連攜上限、50 箱密查都從 G2 開始 */
export function factorDetailVisible(stage: MilestoneStage): boolean {
    return stage >= 2;
}

/** 28 祖位共祖紅框、血脈燈號、純化與世交合譜都從 G3 開始 */
export function kinshipScanVisible(stage: MilestoneStage): boolean {
    return stage >= KIN_STAGE;
}

/** 多樣性折減與外婚復壯世代數從 G4 開始 */
export function diversityVisible(stage: MilestoneStage): boolean {
    return stage >= 4;
}

export function normalizeMilestoneStage(value: unknown): MilestoneStage {
    return value === 2 || value === 3 || value === 4 ? value : 1;
}

/** 由家族統計能達到的階段；G3 不看統計，所以這裡只會回 1、2、4 */
export function milestoneStageOfClan(stats: Pick<ClanStats, 'adultDescendants' | 'generations' | 'ep75'>): MilestoneStage {
    if (stats.generations >= G4_MIN_GENERATIONS && stats.ep75 >= G4_MIN_EP75) return 4;
    return stats.adultDescendants >= 1 ? 2 : 1;
}

export function kinMilestoneStage(): MilestoneStage {
    return KIN_STAGE;
}

export function kinMilestoneLine(fatherName: string, motherName: string, ancestorName: string): string {
    return `譜牒官進言：「稟家主，${motherName}與${fatherName}同出於先祖【${ancestorName}】一脈。若行『外戚純化』，可強行拔高先祖絕學上限；然血脈微躁，宜慎衡得失！」`;
}

/** 跨過的每一階依序出句；一次跳階時，沒有表親資料的 G3 只出解鎖句 */
export function milestoneUnlockLines(oldStage: MilestoneStage, newStage: MilestoneStage, kinLine = ''): string[] {
    const lines: string[] = [];
    for (let stage = oldStage + 1; stage <= newStage; stage++) {
        const key = stage as MilestoneStage;
        const story = key === KIN_STAGE ? kinLine : STORY_LINE[key];
        if (story) lines.push(story);
        const unlock = UNLOCK_LINE[key];
        if (unlock) lines.push(unlock);
    }
    return lines;
}
