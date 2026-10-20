/**
 * LuckTacticCopy — 運氣 ≥80 的「戰法強制複製」（LUK-06 效果，PROG-2-0874，純邏輯，不依賴 cc）
 *
 * 規格（運氣系統.md「LUK 特殊門檻效果」）：LUK ≥ 80 時，父親最強戰法 100% 繼承。
 *
 * 暫定：
 * - 「最強戰法」取父親本人身上色系為戰法（綠）的因子中星級最高的一個；同星以 id 排序取第一個。
 * - 強制複製在因子隨機抽選之後套用，不消耗亂數，因此不改變既有亂數順序。
 * - 子嗣若已因機率抽到同一個戰法，星級取較高者；若名額已滿，會替換掉星級最低的非強制因子。
 *
 * Unity 對照：像在隨機掉落結算後加一條「保底」規則，保底項目一定進背包，名額不足就擠掉最弱的一格。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { type FactorDictionary, type InheritedFactor, resolveFactorColor } from './FactorInheritance';

const TACTIC_COLOR = 'green';

/** 父親身上最強的戰法因子（綠色、星級最高）；沒有戰法時回傳 null。 */
export function strongestFatherTactic(
    father: GeneralConfig,
    dictionary?: FactorDictionary,
): { id: string; level: number } | null {
    let best: { id: string; level: number } | null = null;
    for (const gene of father.genes ?? []) {
        const id = gene.id;
        if (!id) continue;
        if (resolveFactorColor(id, dictionary, gene) !== TACTIC_COLOR) continue;
        const maxLevel = dictionary?.get(id)?.maxLevel ?? 5;
        const level = Math.max(1, Math.min(maxLevel, Math.floor(gene.level ?? 1)));
        if (!best || level > best.level || (level === best.level && id.localeCompare(best.id) < 0)) {
            best = { id, level };
        }
    }
    return best;
}

/**
 * 把父親最強戰法強制放進子嗣因子。回傳新陣列，不修改輸入。
 * 沒有戰法可複製時原樣回傳。
 */
export function forceFatherTacticCopy(
    factors: InheritedFactor[],
    father: GeneralConfig,
    dictionary: FactorDictionary | undefined,
    maxFactors: number,
): InheritedFactor[] {
    const tactic = strongestFatherTactic(father, dictionary);
    if (!tactic) return factors;

    const sourceUid = father.id;
    const forced: InheritedFactor = { id: tactic.id, color: TACTIC_COLOR, level: tactic.level, generation: 1, sourceUids: [sourceUid] };
    const rest = factors.filter((factor) => factor.id !== tactic.id);
    const existing = factors.find((factor) => factor.id === tactic.id);
    if (existing) {
        forced.level = Math.max(forced.level, existing.level);
        forced.sourceUids = [...new Set([sourceUid, ...existing.sourceUids])];
    }

    // 名額已滿時，擠掉排序最後的非強制因子（排序與 inheritFactors 相同：星級高、世代近、id 小者優先）
    const cap = Math.max(1, maxFactors);
    const kept = [...rest].sort((a, b) => b.level - a.level || a.generation - b.generation || a.id.localeCompare(b.id));
    kept.splice(cap - 1);
    return [forced, ...kept].sort((a, b) => b.level - a.level || a.generation - b.generation || a.id.localeCompare(b.id));
}
