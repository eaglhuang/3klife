// @spec-source → WBS v16.3 OPEN-13（英靈夢回開場教學戰，傳說英靈→初始虎符／英靈記憶）；新手開場規格書 §2.1 英靈夢回開場原則
/**
 * TeachingSpiritTalisman — 英靈夢回教學戰結束後，傳說英靈轉成初始虎符的規則（純邏輯，不依賴 cc）。
 *
 * - 教學戰未完成時不產生任何虎符；玩家可以重打，不強迫開局。
 * - 英靈不進武將名冊，不成為永久主角；只留下少量基因在虎符上，供第一代子嗣繼承。
 * - 基因數量上限為暫定值（規格只寫「少量」），待企劃定案。
 *
 * Unity 對照：像教學關結束後發一張 ScriptableObject 道具，而不是把教學用的角色留在場景裡。
 */

/** 規格寫「少量基因」，數字未定；暫定上限。 */
export const TEACHING_STARTING_GENE_LIMIT = 2;

export interface TeachingSpiritInput {
    spiritId: string;
    spiritName: string;
    geneIds: readonly string[];
}

export interface StartingSpiritTalisman {
    kind: 'TALISMAN';
    sourceSpiritId: string;
    sourceName: string;
    geneIds: string[];
}

/**
 * 教學戰完成才產出初始虎符；未完成回傳 null。
 * 基因依原順序取前 TEACHING_STARTING_GENE_LIMIT 個並去重，不改輸入。
 */
export function buildStartingSpiritTalisman(
    spirit: TeachingSpiritInput,
    tutorialCompleted: boolean,
): StartingSpiritTalisman | null {
    if (!tutorialCompleted) return null;
    const geneIds = spirit.geneIds.filter((id, index) => spirit.geneIds.indexOf(id) === index).slice(0, TEACHING_STARTING_GENE_LIMIT);
    return {
        kind: 'TALISMAN',
        sourceSpiritId: spirit.spiritId,
        sourceName: spirit.spiritName,
        geneIds,
    };
}

/** 讀檔時驗證初始虎符；結構不合或來源缺失回傳 null，基因超過上限會截斷。 */
export function normalizeStartingTalisman(raw: unknown): StartingSpiritTalisman | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const value = raw as Partial<Record<keyof StartingSpiritTalisman, unknown>>;
    if (value.kind !== 'TALISMAN') return null;
    if (typeof value.sourceSpiritId !== 'string' || typeof value.sourceName !== 'string') return null;
    if (!Array.isArray(value.geneIds)) return null;
    const geneIds = value.geneIds.filter((id): id is string => typeof id === 'string').slice(0, TEACHING_STARTING_GENE_LIMIT);
    return { kind: 'TALISMAN', sourceSpiritId: value.sourceSpiritId, sourceName: value.sourceName, geneIds };
}
