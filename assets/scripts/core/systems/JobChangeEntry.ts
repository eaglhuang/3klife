// @spec-source → 轉職與宿命系統.md §A（現成武將轉職入口，2026-11-19 使用者裁決 89）；PROG-2-9166
/**
 * JobChangeEntry — 武將詳情頁「轉職」鈕的顯示判斷（純邏輯，不依賴 cc）
 *
 * 規則（轉職令價格與效果沿用 JobChange，這裡只決定入口）：
 *   - 已陣亡、或沒有年齡、或未滿 JOB_CHANGE_MIN_AGE：不顯示（子嗣未成年也不顯示）
 *   - 已有副職：顯示但不可按，說明「已有副職」
 *   - 其餘：顯示且可按；轉職令不足由轉職畫面內的購買鈕處理
 * 不分是否本家子嗣：現成武將（轉蛋、傭兵、俘虜）走這裡，成年子嗣在此也可轉（與成人禮同一流程）。
 */
import { GENERAL_STATUS_DEAD } from './GeneralAging';
import { JOB_CHANGE_MIN_AGE } from './JobChange';
import type { JobWiringGeneral } from './JobChangeWiring';

export interface JobChangeEntryState {
    visible: boolean;
    enabled: boolean;
    /** 不可按時的說明；可按或不顯示時為 null */
    hint: string | null;
}

export const JOB_CHANGE_ENTRY_LABEL = '轉職';
export const JOB_CHANGE_ENTRY_HAS_SUB_HINT = '已有副職，無法再轉職';

/** 是否具備轉職資格（存活、滿 20 歲、尚無副職）；不看是否本家子嗣。 */
export function isJobChangeCandidate(general: JobWiringGeneral): boolean {
    return general.status !== GENERAL_STATUS_DEAD
        && typeof general.age === 'number'
        && general.age >= JOB_CHANGE_MIN_AGE
        && (general.subClass ?? null) === null;
}

export function jobChangeEntryState(general: JobWiringGeneral): JobChangeEntryState {
    const adult = general.status !== GENERAL_STATUS_DEAD
        && typeof general.age === 'number'
        && general.age >= JOB_CHANGE_MIN_AGE;
    if (!adult) return { visible: false, enabled: false, hint: null };
    if (!isJobChangeCandidate(general)) {
        return { visible: true, enabled: false, hint: JOB_CHANGE_ENTRY_HAS_SUB_HINT };
    }
    return { visible: true, enabled: true, hint: null };
}
