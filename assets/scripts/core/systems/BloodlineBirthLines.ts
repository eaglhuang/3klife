// @spec-source → 血統理論系統.md §G 祖輩顯靈、血脈共鳴，§H UI_ANCESTOR_GHOST、UI_WILD_GENE；PROG-2-1775
/**
 * BloodlineBirthLines — 子嗣出生時的血統提示句（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格的「雙方祖先皆為北境之民」要有地域資料，目前沒有，改寫成不提地名的句子。
 * - 顯靈只算真實祖先（nameOf 對虛擬祖先回傳 null），只挑一位：世代最遠的因子來源，同世代取第一個查得到姓名的祖先。
 * - 句子不提因子名：子嗣因子出生時還是鎖定狀態。
 *
 * Unity 對照：像一個把結算結果轉成顯示字串的靜態 Formatter。
 */
import type { InheritedFactor } from './FactorInheritance';

export const BLOODLINE_RESONANCE_LINE = '雙方祖先血脈相通，血脈共鳴已達極致！';
export const WILD_GENE_LINE = '血脈中蘊含未知的基因突變！';

export function ancestorGhostLine(name: string): string {
    return `${name} 的英靈顯現！${name}虛影：「此子血脈中有我的影子！」`;
}

/** 繼承自祖輩以上、世代最遠且查得到姓名的祖先；沒有回傳 null */
function ghostAncestor(factors: readonly InheritedFactor[], nameOf: (uid: string) => string | null): string | null {
    const distant = factors.filter((factor) => factor.generation >= 2).sort((a, b) => b.generation - a.generation);
    for (const factor of distant) {
        for (const uid of factor.sourceUids) {
            const name = nameOf(uid);
            if (name) return name;
        }
    }
    return null;
}

export function bloodlineBirthLines(
    result: { ep?: { resonance: number }; factors?: readonly InheritedFactor[] },
    nameOf: (uid: string) => string | null,
): string[] {
    const factors = result.factors ?? [];
    const lines: string[] = [];
    const ghost = ghostAncestor(factors, nameOf);
    if (ghost) lines.push(ancestorGhostLine(ghost));
    if ((result.ep?.resonance ?? 0) > 0) lines.push(BLOODLINE_RESONANCE_LINE);
    if (factors.some((factor) => factor.wildGene)) lines.push(WILD_GENE_LINE);
    return lines;
}
