// @spec-source → 武將系統.md §遺傳因子槽（GEN-02，PROG-2-0550）、名詞定義文件.md（Gene / GeneObject）
/**
 * GeneObject — 遺傳因子槽的結構、驗證與序列化（純邏輯，不依賴 cc）
 *
 * 規格：每位武將有 3~5 個 GeneObject，欄位 Type / ID / Level / Is_Locked / Discovery_Level。
 * - Type 是六色（取 gene-dictionary 的 color），不是資料裡的中文分類（謀略、統率…）。
 * - ID 必須存在於 gene-dictionary；Level 必須在 1..maxLevel 之間。
 * - 缺的 isLocked 預設 false，缺的 discoveryLevel 預設 1（與存檔 optional 欄位的規則一致）。
 * - 沒有任何 gene 的武將視為「資料待補」，不算錯誤，由呼叫端決定如何顯示。
 *
 * Unity 對照：像一個 ScriptableObject 陣列，Inspector 填完後由 OnValidate 檢查數量與參照是否有效。
 */

export interface GeneDictionaryEntry {
    id: string;
    /** 六色，例如 blue / green（來自 gene-dictionary.json 的 color） */
    color: string;
    maxLevel: number;
}

export interface GeneObject {
    type: string;
    id: string;
    level: number;
    isLocked: boolean;
    discoveryLevel: number;
}

/** 資料裡的原始因子（欄位不一定齊全） */
export interface RawGene {
    id?: unknown;
    level?: unknown;
    isLocked?: unknown;
    discoveryLevel?: unknown;
}

export const GENE_COUNT_MIN = 3;
export const GENE_COUNT_MAX = 5;

/** 把原始因子正規化成 GeneObject；回傳錯誤訊息（有錯的那筆不會進結果） */
export function normalizeGeneObjects(
    raw: readonly RawGene[] | null | undefined,
    dictionary: ReadonlyMap<string, GeneDictionaryEntry>,
): { genes: GeneObject[]; errors: string[] } {
    const genes: GeneObject[] = [];
    const errors: string[] = [];
    for (const item of raw ?? []) {
        const id = typeof item.id === 'string' ? item.id : '';
        const entry = dictionary.get(id);
        if (!entry) {
            errors.push(`gene: ID「${id || '(空)'}」不在因子字典`);
            continue;
        }
        const level = item.level === undefined ? 1 : item.level;
        if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > entry.maxLevel) {
            errors.push(`${id}: Level 必須是 1..${entry.maxLevel} 的整數`);
            continue;
        }
        const isLocked = item.isLocked === undefined ? false : item.isLocked;
        if (typeof isLocked !== 'boolean') {
            errors.push(`${id}: Is_Locked 必須是布林值`);
            continue;
        }
        const discoveryLevel = item.discoveryLevel === undefined ? 1 : item.discoveryLevel;
        if (typeof discoveryLevel !== 'number' || !Number.isInteger(discoveryLevel) || discoveryLevel < 1) {
            errors.push(`${id}: Discovery_Level 必須是大於等於 1 的整數`);
            continue;
        }
        genes.push({ type: entry.color, id, level, isLocked, discoveryLevel });
    }
    return { genes, errors };
}

/**
 * 有因子的武將，數量必須在 3~5 之間；沒有因子回傳 missing（資料待補，不是錯誤）。
 * 回傳 null 代表通過。
 */
export function validateGeneCount(genes: readonly GeneObject[]): 'missing' | string | null {
    if (genes.length === 0) return 'missing';
    if (genes.length < GENE_COUNT_MIN || genes.length > GENE_COUNT_MAX) {
        return `因子數量必須是 ${GENE_COUNT_MIN}~${GENE_COUNT_MAX} 個，實際 ${genes.length} 個`;
    }
    return null;
}

/** 同一武將不可有兩個相同 ID 的因子 */
export function findDuplicateGeneIds(genes: readonly GeneObject[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const gene of genes) {
        if (seen.has(gene.id)) duplicates.add(gene.id);
        seen.add(gene.id);
    }
    return [...duplicates];
}

/** 序列化成 JSON 字串（存檔用） */
export function serializeGeneObjects(genes: readonly GeneObject[]): string {
    return JSON.stringify(genes.map((g) => ({ ...g })));
}

/** 從 JSON 字串讀回；格式錯誤時回傳 null，不丟例外 */
export function parseGeneObjects(json: string): GeneObject[] | null {
    try {
        const parsed = JSON.parse(json) as unknown;
        if (!Array.isArray(parsed)) return null;
        const genes: GeneObject[] = [];
        for (const item of parsed) {
            const g = item as Partial<GeneObject>;
            if (
                typeof g.type !== 'string' || typeof g.id !== 'string' ||
                typeof g.level !== 'number' || typeof g.isLocked !== 'boolean' ||
                typeof g.discoveryLevel !== 'number'
            ) {
                return null;
            }
            genes.push({ type: g.type, id: g.id, level: g.level, isLocked: g.isLocked, discoveryLevel: g.discoveryLevel });
        }
        return genes;
    } catch {
        return null;
    }
}
