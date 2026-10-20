/**
 * 五階血脈傳承奧義的摘要文字（PROG-2-0740，五階三步之三；PROG-2-0743 文案改走語系表）。純邏輯，不依賴 cc。
 *
 * 規格：武將人物介面規格書.md §6.6；階段判定在 BloodlineTransmissionUltimate.checkNextStage，
 * 這裡只把判定原因轉成說明文字。文案由 UltimateTexts 取得，lookup 缺省時用 zh-TW 預設。
 * 暫定文案（待企劃替換）：規格沒有給這些句子。
 */
import { checkNextStage, normalizeUltimateState, ULTIMATE_MAX_STAGE, type UltimateAwakenReason, type UltimateProgressInput, type UltimateState } from '../../core/systems/BloodlineTransmissionUltimate';
import { ultimateText, type UltimateTextLookup } from './UltimateTexts';

/** 判定原因 → 下一階卡住的語系 key */
export const NEXT_STEP_KEYS: Record<UltimateAwakenReason, string> = {
    CAP_LOCKED: 'ui.general.ultimate.next.cap_locked',
    ALREADY_MAX: 'ui.general.ultimate.next.already_max',
    FAME_SHORT: 'ui.general.ultimate.next.fame_short',
    INCIDENT_SHORT: 'ui.general.ultimate.next.incident_short',
    EPIC_REQUIRED: 'ui.general.ultimate.next.epic_required',
};

const IDENTITY_LOOKUP: UltimateTextLookup = (key) => key;

/** 摘要一行：已點亮幾階、上限多少，以及下一階卡在哪 */
export function ultimateStageSummary(
    raw: { stageCap?: number; stageCurrent?: number } | undefined,
    progress: UltimateProgressInput,
    lookup: UltimateTextLookup = IDENTITY_LOOKUP,
): string {
    const state: UltimateState = normalizeUltimateState(raw);
    const check = checkNextStage(state, progress);
    const next = check.ok
        ? ultimateText(lookup, 'ui.general.ultimate.next_ready')
        : ultimateText(lookup, NEXT_STEP_KEYS[(check as { ok: false; reason: UltimateAwakenReason }).reason]);
    const head = ultimateText(lookup, 'ui.general.ultimate.head', state.stageCurrent, ULTIMATE_MAX_STAGE, state.stageCap);
    return ultimateText(lookup, 'ui.general.ultimate.summary', head, next);
}
