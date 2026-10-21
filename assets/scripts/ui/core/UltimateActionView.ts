/**
 * 五階血脈傳承奧義的操作區文字與按鈕狀態（PROG-2-0720）。純邏輯，不依賴 cc。
 *
 * 規格：武將人物介面規格書.md §6.6、§6.7；點亮與升星的判定在 BloodlineTransmissionUltimate，
 * 這裡只決定按鈕能不能按、為什麼不能按。
 * 暫定：升星來源未定（待使用者裁決），升星按鈕一律鎖定；文案寫在程式裡，未走語系表。
 */
import { checkNextStage, normalizeUltimateState, ULTIMATE_MAX_STAGE } from '../../core/systems/BloodlineTransmissionUltimate';
import type { UltimateProgressInput } from '../../core/systems/BloodlineTransmissionUltimate';
import { NEXT_STEP_TEXT } from './UltimateStageSummary';
import type { StarUpMaterial } from '../../core/systems/StarUpMaterial';

export const RAISE_LOCKED_TEXT = '升星提高上限（來源待裁決，暫未開放）';

/** 升星素材的說明文字；持有檢查與消耗還沒接，所以按鈕仍鎖定 */
export const STAR_UP_MATERIAL_TEXT: Record<StarUpMaterial, string> = {
    TEMPLATE_CARD: '升星需要範本卡（持有檢查未接，暫未開放）',
    LINEAGE_SEAL: '升星需要譜牒印記（來源待裁決，暫未開放）',
};

function raiseLabelOf(starUp: StarUpMaterial | null): string {
    return starUp ? STAR_UP_MATERIAL_TEXT[starUp] : RAISE_LOCKED_TEXT;
}

export interface UltimateActionView {
    /** 操作區第一行：已點亮幾階、下一階狀態 */
    summary: string;
    /** 點亮下一階按鈕是否可按 */
    awakenEnabled: boolean;
    /** 點亮下一階按鈕的文字 */
    awakenLabel: string;
    /** 升星按鈕的文字；來源未定前固定鎖定 */
    raiseLabel: string;
    raiseEnabled: boolean;
}

/** 依目前狀態算出操作區；點亮可按時顯示「點亮第 N 階」，不可按時顯示原因 */
export function ultimateActionView(
    raw: { stageCap?: number; stageCurrent?: number } | undefined,
    progress: UltimateProgressInput,
    starUp: StarUpMaterial | null = null,
): UltimateActionView {
    const state = normalizeUltimateState(raw);
    const check = checkNextStage(state, progress);
    const head = `血脈傳承奧義：已點亮 ${state.stageCurrent} / ${ULTIMATE_MAX_STAGE} 階（上限 ${state.stageCap}）`;
    if (check.ok) {
        return {
            summary: `${head}，下一階可點亮`,
            awakenEnabled: true,
            awakenLabel: `點亮第 ${check.stage} 階`,
            raiseLabel: raiseLabelOf(starUp),
            raiseEnabled: false,
        };
    }
    // cc 設定沒開 strictNullChecks，.ok 無法收斂 union，需手動斷言
    const { reason } = check as { ok: false; reason: keyof typeof NEXT_STEP_TEXT };
    return {
        summary: `${head}，${NEXT_STEP_TEXT[reason]}`,
        awakenEnabled: false,
        awakenLabel: reason === 'ALREADY_MAX' ? '已全部點亮' : '條件未達成',
        raiseLabel: raiseLabelOf(starUp),
        raiseEnabled: false,
    };
}
