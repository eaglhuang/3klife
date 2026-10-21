// @spec-source → 同名武將系統.md §戰魂寄宿；WBS SAME-08；PROG-2-1057（寄宿戰魂按鈕的畫面資料）
/**
 * SoulInjectCandidates — 武將詳情頁「寄宿戰魂」面板的資料（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出帳本裡所有亡者碎片，逐一判斷能不能寄宿到目標武將
 *   - 不能寄宿時給出原因代碼與文案，畫面用它顯示灰掉的按鈕旁說明
 *
 * 不改任何狀態：真正寄宿仍走 GameSession.injectSoulFragment。
 *
 * Unity 對照：像一個 ViewModel，把 Dictionary 裡的碎片轉成列表項目，每項帶 interactable 與 tooltip。
 */
import { injectSoulFragment, type SoulInjectResult, type SoulTransferGeneral } from '../models/SoulTransfer';
import type { SoulFragmentLedger } from './SoulFragmentLedger';

export const SOUL_INJECT_REASON_TEXT: Record<Extract<SoulInjectResult, { ok: false }>['reason'], string> = {
    'SAME_TEMPLATE': '碎片與目標為同一版本，無法寄宿',
    'BLOODLINE_MISMATCH': '碎片與目標血脈不同，無法寄宿',
};

export interface SoulInjectCandidate {
    /** 亡者 uid（碎片的鍵） */
    deadUid: string;
    /** 碎片內含的 TP */
    tp: number;
    /** 可否按下寄宿 */
    enabled: boolean;
    /** 不可寄宿時的說明；可寄宿時為 null */
    reasonText: string | null;
}

/** 依亡者 uid 排序，讓列表順序穩定 */
export function soulInjectCandidatesFor(ledger: SoulFragmentLedger, target: SoulTransferGeneral): SoulInjectCandidate[] {
    return Object.keys(ledger).sort().map((deadUid) => {
        const fragment = ledger[deadUid];
        const result = injectSoulFragment(target, fragment);
        if (result.ok) {
            return { deadUid, tp: fragment.tp, enabled: true, reasonText: null };
        }
        // cc 設定沒開 strictNullChecks，.ok 無法收斂 union，需手動斷言
        const reason = (result as Extract<SoulInjectResult, { ok: false }>).reason;
        return { deadUid, tp: fragment.tp, enabled: false, reasonText: SOUL_INJECT_REASON_TEXT[reason] };
    });
}

/** 寄宿戰魂按鈕是否可按：至少有一筆碎片可寄宿到目標 */
export function canOpenSoulInject(candidates: readonly SoulInjectCandidate[]): boolean {
    return candidates.some((candidate) => candidate.enabled);
}
