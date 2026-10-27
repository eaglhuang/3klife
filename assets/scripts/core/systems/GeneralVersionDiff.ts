// @spec-source → 同名武將系統.md E 節 #6「版本差異展示」、I 節 General_Version（Unique_Genes）；WBS SAME-07（PROG-2-1253）
/**
 * GeneralVersionDiff — 同名版本的初始因子對比（純邏輯，不依賴 cc）
 *
 * 把兩個版本的初始因子（Initial_Genes_JSON）依 Type:ID 配對，分成四組：
 *   - sameGenes：兩邊都有，且等級相同。
 *   - changedLevel：兩邊都有，但等級不同（before 為 A 的等級，after 為 B 的等級）。
 *   - onlyInA / onlyInB：只在其中一邊。
 *
 * 圖鑑比對對象（PROG-2-1367）：同血源最早上架 vs 最新上架；只有一個版本時沒有可比的對象。
 *
 * 暫定：
 *   - 規格的「戰法」「立繪」對比，版本表目前沒有對應欄位，本檔不處理；待 schema 補上再接。
 *   - 格式錯誤的因子項目（缺 Type／ID、Level 非有限數）略過，不讓整張對比失敗。
 *   - 版本的 JSON 整體解析失敗時回傳 null，由畫面顯示「資料異常」。
 *
 * Unity 對照：像比對兩個 ScriptableObject 的列表欄位，用 Dictionary<key, value> 找出交集與差集。
 */
import { GeneralVersionRecord, parseInitialGenes, versionsOfBloodline } from '../models/GeneralVersion';

export interface VersionGene {
    type: string;
    id: string;
    level: number;
}

export interface ChangedGene {
    type: string;
    id: string;
    before: number;
    after: number;
}

export interface GeneralVersionGeneDiff {
    sameGenes: VersionGene[];
    changedLevel: ChangedGene[];
    onlyInA: VersionGene[];
    onlyInB: VersionGene[];
}

/** 取出可比對的因子；缺欄位或格式錯誤的項目略過 */
function readGenes(record: GeneralVersionRecord): VersionGene[] | null {
    const raw = parseInitialGenes(record);
    if (raw === null) return null;
    const genes: VersionGene[] = [];
    for (const item of raw) {
        if (typeof item !== 'object' || item === null) continue;
        const { Type, ID, Level } = item as { Type?: unknown; ID?: unknown; Level?: unknown };
        if (typeof Type !== 'string' || typeof ID !== 'string') continue;
        if (typeof Level !== 'number' || !Number.isFinite(Level)) continue;
        genes.push({ type: Type, id: ID, level: Level });
    }
    return genes;
}

function keyOf(gene: VersionGene): string {
    return `${gene.type}:${gene.id}`;
}

/** 比對兩個版本的初始因子；任一版本的 JSON 解析失敗時回傳 null */
export function diffVersionGenes(
    a: GeneralVersionRecord,
    b: GeneralVersionRecord,
): GeneralVersionGeneDiff | null {
    const genesA = readGenes(a);
    const genesB = readGenes(b);
    if (genesA === null || genesB === null) return null;

    const mapB = new Map(genesB.map((gene) => [keyOf(gene), gene]));
    const keysA = new Set(genesA.map(keyOf));
    const diff: GeneralVersionGeneDiff = { sameGenes: [], changedLevel: [], onlyInA: [], onlyInB: [] };

    for (const gene of genesA) {
        const other = mapB.get(keyOf(gene));
        if (!other) {
            diff.onlyInA.push(gene);
        } else if (other.level === gene.level) {
            diff.sameGenes.push(gene);
        } else {
            diff.changedLevel.push({ type: gene.type, id: gene.id, before: gene.level, after: other.level });
        }
    }
    for (const gene of genesB) {
        if (!keysA.has(keyOf(gene))) diff.onlyInB.push(gene);
    }
    return diff;
}

export interface VersionComparePair {
    /** 較早上架的版本（前版） */
    before: GeneralVersionRecord;
    /** 較晚上架的版本（後版） */
    after: GeneralVersionRecord;
}

/** 同血源最早上架與最新上架的一組；版本少於兩個時回傳 null。 */
export function pickComparePair(list: readonly GeneralVersionRecord[], bloodlineId: string): VersionComparePair | null {
    const versions = versionsOfBloodline([...list], bloodlineId);
    if (versions.length < 2) return null;
    return { before: versions[0], after: versions[versions.length - 1] };
}

/** 版本差異面板的 FlowView 片段；戰法與立繪欄位版本表尚無資料，固定顯示「—」。 */
export interface VersionDiffLayoutState {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

export const VERSION_DIFF_PLACEHOLDER = '—';

export function toVersionDiffLayoutState(pair: VersionComparePair | null): VersionDiffLayoutState {
    const texts: Record<string, string> = {
        diffTitle: '',
        diffGenes: '',
        diffTactics: `戰法：${VERSION_DIFF_PLACEHOLDER}`,
        diffPortrait: `立繪：${VERSION_DIFF_PLACEHOLDER}`,
    };
    if (!pair) {
        return { texts, actives: { diffPanel: false } };
    }
    const label = (record: GeneralVersionRecord) => record.Version_Title ?? record.Template_ID;
    texts.diffTitle = `版本差異：${label(pair.before)} → ${label(pair.after)}`;
    const diff = diffVersionGenes(pair.before, pair.after);
    texts.diffGenes = diff
        ? `因子：相同 ${diff.sameGenes.length} 項・等級變動 ${diff.changedLevel.length} 項・僅前版 ${diff.onlyInA.length} 項・僅後版 ${diff.onlyInB.length} 項`
        : '因子：資料異常';
    return { texts, actives: { diffPanel: true } };
}
