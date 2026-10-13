// @spec-source → 血統理論系統.md §Wild Gene／Star Jump；PROG-2-0102（BLT-07）
/** 獨立純邏輯；尚未接入祖先生成或結緣。所有數值暫定，Q38 未定案。 */
/** 暫定，Q38 未定案：一般變異率 10%。 */
export const STAR_JUMP_CHANCE = 0.10;
/** 暫定，Q38 未定案：初代在基礎機率上多 10 個百分點。 */
export const WILD_GENE_FIRST_GEN_BONUS = 0.10;
/** 暫定，Q38 未定案：沿用規格 3→5 的例子，一次升兩星。 */
export const STAR_JUMP_STEP = 2;
/** 暫定上限，Q38 未定案；規格例子包含五星，但未明定全域上限。 */
export const STAR_JUMP_MAX_LEVEL = 5;

export interface StarJumpFactor {
    id: string;
    color: string;
    /** 既有 InheritedFactor 以 level 表示星級。 */
    level: number;
}

function sample(random: () => number): number {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new RangeError('亂數必須介於 0（含）與 1（不含）');
    }
    return value;
}

/** generation=1 為初代；其餘正整數為後代。每次判定只取一次注入亂數。 */
export function rollWildGene(ancestorGeneration: number, random: () => number): boolean {
    if (!Number.isInteger(ancestorGeneration) || ancestorGeneration < 1) {
        throw new RangeError('祖先世代必須是正整數');
    }
    const chance = STAR_JUMP_CHANCE + (ancestorGeneration === 1 ? WILD_GENE_FIRST_GEN_BONUS : 0);
    return sample(random) < chance;
}

/**
 * 獨立的基礎機率 Star Jump 判定：成功只提升 level，保留其餘欄位與輸入。
 * 不在 rollWildGene 成功後再呼叫本函式作第二次判定；接線與組合方式另卡決定。
 * 已達上限不消耗亂數；超上限輸入夾回暫定上限，非法星級拒絕。
 */
export function applyStarJump<T extends StarJumpFactor>(factor: T, random: () => number): T {
    if (!Number.isInteger(factor.level) || factor.level < 1) {
        throw new RangeError('星級必須是正整數');
    }
    const level = factor.level >= STAR_JUMP_MAX_LEVEL
        ? STAR_JUMP_MAX_LEVEL
        : Math.min(STAR_JUMP_MAX_LEVEL, factor.level + (sample(random) < STAR_JUMP_CHANCE ? STAR_JUMP_STEP : 0));
    return { ...factor, level };
}
