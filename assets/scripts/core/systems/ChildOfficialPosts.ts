// @spec-source → 領地治理系統 §F 非培育子嗣內政職位（屯田官、說客）與 Official_Output 公式；WBS v16.3 GOV-10（PROG-2-0988）；兒童低效係數為 PM 2026-10-27 暫定
/**
 * ChildOfficialPosts — 非培育子嗣內政職位的產出公式（純邏輯，不依賴 cc）。
 *
 * 規格：Official_Output = Base_Output × (1 + Child_RelevantStat / 100)。
 * - 屯田官：基礎 -20% 培育糧草消耗，推薦 POL 高的子嗣。
 * - 說客：基礎 +15% 傭兵結義成功率，推薦 CHR 高的子嗣。
 * - 兒童低效：未成年（出生、開獎階段）效率 ×0.5（PM 暫定），常數集中在 CHILD_MINOR_EFFICIENCY。
 * - 工匠（建築完成時間）程式目前沒有建築系統，略過。
 *
 * Unity 對照：一張 OfficeConfig 表，每個職位一個基礎值；效率係數像 Animator 的 speed 倍率。
 */
import type { GeneralStage } from './GeneralStage';

/** 兒童低效係數（PM 2026-10-27 暫定）：未成年效率減半。 */
export const CHILD_MINOR_EFFICIENCY = 0.5;

/** 未成年的生命週期階段（出生、開獎）。 */
const MINOR_STAGES: readonly GeneralStage[] = ['birth', 'unveiling'];

export type ChildOfficialPost = 'tuntian' | 'shuike';

/** 各職位基礎值（比例）：屯田官為糧草消耗減少，說客為結義成功率提高。 */
export const CHILD_POST_BASE: Readonly<Record<ChildOfficialPost, number>> = Object.freeze({
    tuntian: 0.2,
    shuike: 0.15,
});

/** 是否為未成年階段（適用兒童低效）。 */
export function isMinorStage(stage: GeneralStage): boolean {
    return MINOR_STAGES.includes(stage);
}

/**
 * 職位的實際效果比例 = 基礎值 × (1 + 相關屬性 / 100) × 兒童係數。
 * 屬性為負數時視為 0；不改輸入。
 */
export function childPostEffect(post: ChildOfficialPost, relevantStat: number, stage: GeneralStage): number {
    const stat = Math.max(0, Number.isFinite(relevantStat) ? relevantStat : 0);
    const efficiency = isMinorStage(stage) ? CHILD_MINOR_EFFICIENCY : 1;
    return CHILD_POST_BASE[post] * (1 + stat / 100) * efficiency;
}
