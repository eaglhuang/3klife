// @spec-source → 武將系統.md §遺傳因子槽（GEN-02，PROG-2-0550）、名詞定義文件.md（Gene / GeneObject）
// @spec-source → 遺傳因子槽GeneObject資料結構與序列化規格書.md (doc_spec_0332) §1 clamp、§2.2 讀檔補齊、§3 字典校驗降級（PROG-2-2018）
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
    return Array.from(duplicates);
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

/** 名冊裡的因子：GeneObject 五欄位，加上 UI 顯示用的選填欄位（存檔時保留） */
export type GeneSaveEntry = GeneObject & { displayName?: string; description?: string };

/**
 * 存檔前經 FBR-02 序列化正規化（PROG-2-0550 接線）：欄位與型別統一，顯示用欄位併回。
 * 序列化失敗（有欄位型別錯）時原樣保留，不丟資料；由讀取端的 warning 負責回報。
 */
export function genesForSave(genes: readonly GeneSaveEntry[]): GeneSaveEntry[] {
    const parsed = parseGeneObjects(serializeGeneObjects(genes));
    if (!parsed || parsed.length !== genes.length) return genes.map((g) => ({ ...g }));
    return parsed.map((g, i) => ({ ...genes[i], ...g }));
}

/** 讀取存檔的因子：經同一套 FBR-02 解析；失敗時回傳 valid=false 與原樣資料 */
export function genesFromSave(raw: unknown): { genes: GeneSaveEntry[]; valid: boolean } {
    if (!Array.isArray(raw)) return { genes: [], valid: raw === undefined };
    // doc_spec_0332 §2.2：舊存檔缺 isLocked／discoveryLevel 時補預設值，不判為壞檔
    const entries = raw
        .filter((item): item is GeneSaveEntry => !!item && typeof item === 'object')
        .map((item) => ({
            ...item,
            isLocked: item.isLocked === undefined ? false : item.isLocked,
            discoveryLevel: item.discoveryLevel === undefined ? 1 : item.discoveryLevel,
        }));
    const parsed = parseGeneObjects(JSON.stringify(entries));
    if (!parsed || parsed.length !== entries.length) return { genes: entries, valid: false };
    return { genes: parsed.map((g, i) => ({ ...entries[i], ...g })), valid: true };
}

/** 字典校驗用的最小欄位（doc_spec_0332 §3 介面） */
export type GeneDictionaryRecord = Record<string, { color: string; maxLevel: number }>;

/**
 * doc_spec_0332 §3：與因子字典對齊。回傳第一個不合法的原因；數量 0 視為資料待補，算合法。
 */
export function validateGeneObjects(
    genes: readonly GeneObject[],
    dictionary: GeneDictionaryRecord,
): { isValid: boolean; invalidReason?: string } {
    if (genes.length > 0) {
        const count = validateGeneCount(genes);
        if (count) return { isValid: false, invalidReason: count };
    }
    for (const gene of genes) {
        const entry = dictionary[gene.id];
        if (!entry) return { isValid: false, invalidReason: `${gene.id}: 不在因子字典` };
        if (gene.type !== entry.color) return { isValid: false, invalidReason: `${gene.id}: Type 應為 ${entry.color}` };
        if (!Number.isInteger(gene.level) || gene.level < 1 || gene.level > entry.maxLevel) {
            return { isValid: false, invalidReason: `${gene.id}: Level 必須是 1..${entry.maxLevel}` };
        }
    }
    const dup = findDuplicateGeneIds(genes);
    if (dup.length > 0) return { isValid: false, invalidReason: `重複因子：${dup.join(',')}` };
    return { isValid: true };
}

/** 字典裡第一個白色因子，作為未知因子的降級對象；字典沒有白色時回傳 null。 */
export function fallbackWhiteGeneId(dictionary: GeneDictionaryRecord): string | null {
    for (const id of Object.keys(dictionary)) {
        if (dictionary[id].color === 'white') return id;
    }
    return null;
}

/**
 * doc_spec_0332 §1／§3 的容錯修復：等級超出範圍 clamp 到 1..maxLevel、Type 改回字典色、
 * 未知 id 降級為白色基礎因子（保留 level／鎖定狀態），讓戰鬥運算不中斷。
 * warnings 記錄每一筆修正，供載入時記 log。
 */
export function repairGeneObjects(
    genes: readonly GeneObject[],
    dictionary: GeneDictionaryRecord,
    fallbackId: string | null = fallbackWhiteGeneId(dictionary),
): { genes: GeneObject[]; warnings: string[] } {
    const out: GeneObject[] = [];
    const warnings: string[] = [];
    for (const gene of genes) {
        let id = gene.id;
        let entry = dictionary[id];
        if (!entry) {
            if (!fallbackId || !dictionary[fallbackId]) {
                warnings.push(`${id}: 不在因子字典且無白色因子可降級，已移除`);
                continue;
            }
            warnings.push(`${id}: 不在因子字典，降級為 ${fallbackId}`);
            id = fallbackId;
            entry = dictionary[fallbackId];
        }
        const raw = Number.isFinite(gene.level) ? Math.round(gene.level) : 1;
        const level = Math.max(1, Math.min(entry.maxLevel, raw));
        if (level !== gene.level) warnings.push(`${id}: Level ${gene.level} 修正為 ${level}`);
        out.push({ type: entry.color, id, level, isLocked: gene.isLocked, discoveryLevel: Math.max(1, gene.discoveryLevel || 1) });
    }
    return { genes: out, warnings };
}
