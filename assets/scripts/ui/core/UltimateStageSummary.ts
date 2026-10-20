/**
 * 五階血脈傳承奧義的摘要文字（PROG-2-0740，五階三步之三）。純邏輯，不依賴 cc。
 *
 * 規格：武將人物介面規格書.md §6.6；階段判定在 BloodlineTransmissionUltimate.checkNextStage，
 * 這裡只把判定原因轉成說明文字。
 * 暫定文案（待企劃替換）：規格沒有給這些句子，這版寫在程式裡。
 */
import { checkNextStage, normalizeUltimateState, ULTIMATE_MAX_STAGE, type UltimateAwakenReason, type UltimateProgressInput, type UltimateState } from '../../core/systems/BloodlineTransmissionUltimate';

const NEXT_STEP_TEXT: Record<UltimateAwakenReason, string> = {
    CAP_LOCKED: '需先升星提高上限',
    ALREADY_MAX: '已全部點亮',
    FAME_SHORT: '名聲不足',
    INCIDENT_SHORT: '事蹟不足',
    EPIC_REQUIRED: '需要一次史詩事蹟',
};

/** 摘要一行：已點亮幾階、上限多少，以及下一階卡在哪 */
export function ultimateStageSummary(raw: { stageCap?: number; stageCurrent?: number } | undefined, progress: UltimateProgressInput): string {
    const state: UltimateState = normalizeUltimateState(raw);
    const check = checkNextStage(state, progress);
    const next = check.ok ? `下一階可點亮` : NEXT_STEP_TEXT[check.reason];
    return `血脈傳承奧義：已點亮 ${state.stageCurrent} / ${ULTIMATE_MAX_STAGE} 階（上限 ${state.stageCap}），${next}`;
}
