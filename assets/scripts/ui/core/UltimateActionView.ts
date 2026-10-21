/**
 * 五階血脈傳承奧義的操作區文字與按鈕狀態（PROG-2-0720；PROG-2-0743 文案改走語系表；PROG-2-0749 升星素材說明）。純邏輯，不依賴 cc。
 *
 * 規格：武將人物介面規格書.md §6.6、§6.7；點亮與升星的判定在 BloodlineTransmissionUltimate，
 * 這裡只決定按鈕能不能按、為什麼不能按。
 * 暫定：升星來源未定（待使用者裁決），升星按鈕一律鎖定。文案由 UltimateTexts 取得，lookup 缺省時用 zh-TW 預設。
 */
import { checkNextStage, normalizeUltimateState, ULTIMATE_MAX_STAGE } from '../../core/systems/BloodlineTransmissionUltimate';
import type { UltimateAwakenReason, UltimateProgressInput } from '../../core/systems/BloodlineTransmissionUltimate';
import type { StarUpMaterial } from '../../core/systems/StarUpMaterial';
import { NEXT_STEP_KEYS } from './UltimateStageSummary';
import { ULTIMATE_FALLBACK_ZH_TW, ultimateText, type UltimateTextLookup } from './UltimateTexts';

/** 升星按鈕的鎖定文字（zh-TW 預設，保留給沒有 lookup 的呼叫端） */
export const RAISE_LOCKED_TEXT = ULTIMATE_FALLBACK_ZH_TW['ui.general.ultimate.raise_locked'];

/** 升星素材的說明文字；持有檢查與消耗還沒接，所以按鈕仍鎖定 */
export const STAR_UP_MATERIAL_TEXT: Record<StarUpMaterial, string> = {
    TEMPLATE_CARD: '升星需要範本卡（持有檢查未接，暫未開放）',
    LINEAGE_SEAL: '升星需要譜牒印記（來源待裁決，暫未開放）',
};

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

const IDENTITY_LOOKUP: UltimateTextLookup = (key) => key;

function raiseLabelOf(starUp: StarUpMaterial | null, lookup: UltimateTextLookup): string {
    return starUp ? STAR_UP_MATERIAL_TEXT[starUp] : ultimateText(lookup, 'ui.general.ultimate.raise_locked');
}

/** 依目前狀態算出操作區；點亮可按時顯示「點亮第 N 階」，不可按時顯示原因 */
export function ultimateActionView(
    raw: { stageCap?: number; stageCurrent?: number } | undefined,
    progress: UltimateProgressInput,
    lookup: UltimateTextLookup = IDENTITY_LOOKUP,
    starUp: StarUpMaterial | null = null,
): UltimateActionView {
    const state = normalizeUltimateState(raw);
    const check = checkNextStage(state, progress);
    const head = ultimateText(lookup, 'ui.general.ultimate.head', state.stageCurrent, ULTIMATE_MAX_STAGE, state.stageCap);
    const raiseLabel = raiseLabelOf(starUp, lookup);
    if (check.ok) {
        return {
            summary: ultimateText(lookup, 'ui.general.ultimate.summary', head, ultimateText(lookup, 'ui.general.ultimate.next_ready')),
            awakenEnabled: true,
            awakenLabel: ultimateText(lookup, 'ui.general.ultimate.awaken_label', check.stage),
            raiseLabel,
            raiseEnabled: false,
        };
    }
    // cc 設定沒開 strictNullChecks，.ok 無法收斂 union，需手動斷言
    const reason = (check as { ok: false; reason: UltimateAwakenReason }).reason;
    return {
        summary: ultimateText(lookup, 'ui.general.ultimate.summary', head, ultimateText(lookup, NEXT_STEP_KEYS[reason])),
        awakenEnabled: false,
        awakenLabel: ultimateText(lookup, reason === 'ALREADY_MAX' ? 'ui.general.ultimate.next.already_max' : 'ui.general.ultimate.awaken_blocked'),
        raiseLabel,
        raiseEnabled: false,
    };
}
