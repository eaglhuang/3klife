// @spec-source → 見 docs/cross-reference-index.md
/**
 * GeneralListSort — 武將列表欄位排序（UI技術規格書 doc_ui_0049，PROG-2-1882）
 *
 * 純資料函式，不依賴 cc。缺值（undefined／null／空字串／無兵種適性）不論升降冪一律排最後，
 * 避免數字欄位遇到缺值時改走字串比較，造成比較結果前後矛盾、排序錯亂。
 *
 * Unity 對照：List<T>.Sort 搭配自訂 IComparer，缺值統一放尾端。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';

export type GeneralSortKey = 'name' | 'gender' | 'age' | 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk' | 'troop' | 'faction';

/** 兵種適性等級順序 */
export const APTITUDE_ORDER: Readonly<Record<string, number>> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

/** 武將最強兵種的等級分數；沒有任何適性時回傳 0 */
export function bestTroopRank(g: GeneralConfig): number {
    const grades = Object.values(g.troopAptitude ?? {});
    return grades.reduce((best: number, gr) => Math.max(best, APTITUDE_ORDER[gr as string] ?? 0), 0);
}

function sortValue(g: GeneralConfig, key: GeneralSortKey): unknown {
    if (key === 'troop') {
        const rank = bestTroopRank(g);
        return rank > 0 ? rank : undefined;
    }
    return (g as unknown as Record<string, unknown>)[key];
}

function isMissing(v: unknown): boolean {
    return v === undefined || v === null || v === '';
}

/** 依欄位排序並回傳新陣列（穩定排序；同值保留原順序） */
export function sortGenerals(list: readonly GeneralConfig[], key: GeneralSortKey, asc: boolean): GeneralConfig[] {
    return [...list].sort((a, b) => {
        const va = sortValue(a, key);
        const vb = sortValue(b, key);
        const ma = isMissing(va);
        const mb = isMissing(vb);
        if (ma || mb) return ma === mb ? 0 : (ma ? 1 : -1);
        const diff = typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb), 'zh-TW');
        return asc ? diff : -diff;
    });
}
