// @spec-source → 同名武將系統.md §戰魂寄宿；WBS SAME-08（PROG-2-0857）；PROG-2-1056 接線
/**
 * SoulFragmentLedger — 戰魂碎片帳本（純邏輯，不依賴 cc）
 *
 * 碎片以亡者 uid 為鍵存在存檔的 soulFragments 清單裡（PM 裁定，暫定）：
 *   - 亡者死亡時（超齡死亡）產生一筆，同一亡者只記一次。
 *   - 注入成功後該筆碎片被消耗。
 *
 * 暫定選擇（可逆）：
 *   - 亡者沒有 totalTp 欄位時以 0 計（與 LegacyService 的做法一致）。
 *   - 讀存檔時丟掉格式不對的碎片，不讓壞資料進來。
 *
 * Unity 對照：像一個以 uid 為 key 的 Dictionary，死亡時 Add，注入時 Remove。
 */
import { createSoulFragment, injectSoulFragment, type SoulFragment, type SoulInjectResult, type SoulTransferGeneral } from '../models/SoulTransfer';

export type SoulFragmentLedger = Record<string, SoulFragment>;

export function emptySoulFragmentLedger(): SoulFragmentLedger {
    return {};
}

/** 讀存檔用：只保留欄位齊全、數值合法的碎片 */
export function normalizeSoulFragmentLedger(raw: unknown): SoulFragmentLedger {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: SoulFragmentLedger = {};
    for (const [uid, value] of Object.entries(raw as Record<string, unknown>)) {
        const f = value as Partial<SoulFragment> | null;
        if (!f || typeof f.fromTemplateId !== 'string' || typeof f.bloodlineId !== 'string') continue;
        if (typeof f.tp !== 'number' || !Number.isFinite(f.tp) || f.tp < 0) continue;
        out[uid] = { fromTemplateId: f.fromTemplateId, bloodlineId: f.bloodlineId, tp: Math.floor(f.tp) };
    }
    return out;
}

/** 亡者死亡時記一筆碎片；同一亡者已有碎片時不重複記。不修改輸入。 */
export function recordDeathFragment(
    ledger: SoulFragmentLedger,
    deadUid: string,
    dead: { templateId: string; bloodlineId: string; totalTp?: number },
): { ledger: SoulFragmentLedger; added: boolean } {
    if (ledger[deadUid]) return { ledger: { ...ledger }, added: false };
    const fragment = createSoulFragment({ templateId: dead.templateId, bloodlineId: dead.bloodlineId, totalTp: dead.totalTp ?? 0 });
    return { ledger: { ...ledger, [deadUid]: fragment }, added: true };
}

/**
 * 把亡者的碎片注入目標武將。成功時目標 tp 增加、該筆碎片被消耗；失敗時兩者都不變。
 */
export function injectFromLedger(
    ledger: SoulFragmentLedger,
    deadUid: string,
    target: SoulTransferGeneral,
): { ok: true; ledger: SoulFragmentLedger; target: SoulTransferGeneral; amount: number } | { ok: false; reason: 'NO_FRAGMENT' | Extract<SoulInjectResult, { ok: false }>['reason'] } {
    const fragment = ledger[deadUid];
    if (!fragment) return { ok: false, reason: 'NO_FRAGMENT' };
    const result = injectSoulFragment(target, fragment);
    // cc 設定沒開 strictNullChecks，.ok 無法收斂 union，需手動斷言
    if (!result.ok) return { ok: false, reason: (result as Extract<SoulInjectResult, { ok: false }>).reason };
    const next = { ...ledger };
    delete next[deadUid];
    return { ok: true, ledger: next, target: result.target, amount: result.amount };
}
