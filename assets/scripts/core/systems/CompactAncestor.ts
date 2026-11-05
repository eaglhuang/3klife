// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #5、§I；PROG-2-1801
/**
 * CompactAncestor — 遠祖冷壓縮：滑出所有活人 4 代窗外的祖先轉成摘要（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 規格的 28 祖位沒有定義怎麼排，這裡用「上溯 4 代」當窗。
 * - 規格只列姓名、生卒年、EP、頭像種子、2 項因子；這裡多留父母 id，門閥代數與族譜才接得起來。
 * - 規格寫 32 bytes，是二進位目標；目前存 JSON，實際大小看 compactFootprint。
 * - 正式英靈卡、灌注過的卡、可復活者、史實武將都不壓縮，這些還有玩法在讀。
 *
 * Unity 對照：像把不再使用的 ScriptableObject 換成一行摘要表，只留顯示需要的欄位。
 */
import { GeneralLifecycleClass } from '../models/GeneralLifecycle';
import type { SpiritCard } from '../models/SpiritCard';

export const HOT_ANCESTOR_DEPTH = 4;
const MAX_COMPACT_FACTORS = 2;

export interface CompactAncestorRecord {
    uid: string;
    name: string;
    birthYear?: number;
    deathYear?: number;
    ep: number;
    avatarSeed: number;
    factors: string[];
    parentUids: [string, string];
}

export interface LivingLineage {
    id: string;
    fatherId?: string;
    motherId?: string;
    parentUids?: readonly string[];
}

export interface CompactBody {
    id?: string;
    genes?: ReadonlyArray<{ id?: string; level?: number }>;
}

function parentsOfLiving(living: LivingLineage): string[] {
    return [living.fatherId, living.motherId, ...(living.parentUids ?? [])].filter((id): id is string => !!id);
}

/** 從活人往上走，回傳只出現在窗外的祖先；同一人走得到窗內就算窗內 */
export function farAncestorUids(
    living: readonly LivingLineage[],
    cards: readonly Pick<SpiritCard, 'uid' | 'parentUids'>[],
    records: readonly Pick<CompactAncestorRecord, 'uid' | 'parentUids'>[] = [],
): string[] {
    const parents = new Map<string, readonly string[]>();
    for (const entry of [...records, ...cards]) parents.set(entry.uid, entry.parentUids ?? []);
    const livingIds = new Set(living.map((general) => general.id));
    const seen = new Set<string>();
    const far: string[] = [];
    let frontier: string[] = [];
    for (const general of living) frontier.push(...parentsOfLiving(general));
    for (let depth = 1; frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const uid of frontier) {
            if (seen.has(uid)) continue;
            seen.add(uid);
            if (depth > HOT_ANCESTOR_DEPTH && !livingIds.has(uid)) far.push(uid);
            for (const parent of parents.get(uid) ?? []) if (parent) next.push(parent);
        }
        frontier = next;
    }
    return far;
}

export function isCardCompactable(card: SpiritCard): boolean {
    if (card.lifecycleClass === GeneralLifecycleClass.Historical) return false;
    if (card.resurrectionEligible || card.isSpiritRelic) return false;
    return !card.bloodlineLevel && !card.spiritPower && !card.linkedTallyLevel;
}

function seedOf(uid: string): number {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
    return hash;
}

/** 代表因子挑星級最高的；L5 沒有資料時退回快照的因子順序 */
function topFactors(card: SpiritCard, body: CompactBody | undefined): string[] {
    const genes = (body?.genes ?? []).filter((gene) => !!gene.id);
    if (genes.length === 0) return (card.gene_refs ?? []).slice(0, MAX_COMPACT_FACTORS);
    return [...genes]
        .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
        .slice(0, MAX_COMPACT_FACTORS)
        .map((gene) => gene.id as string);
}

export function compactAncestorOf(card: SpiritCard, body?: CompactBody): CompactAncestorRecord {
    return {
        uid: card.uid,
        name: card.name,
        ...(card.birthYear !== undefined ? { birthYear: card.birthYear } : {}),
        ...(card.deathYear !== undefined ? { deathYear: card.deathYear } : {}),
        ep: card.ep_snapshot ?? 0,
        avatarSeed: seedOf(card.uid),
        factors: topFactors(card, body),
        parentUids: [card.parentUids?.[0] ?? '', card.parentUids?.[1] ?? ''],
    };
}

/** 對應 §I Archived_Ancestors_Compact_Count 與 Storage_Footprint_Bytes */
export function compactFootprint(records: readonly CompactAncestorRecord[]): { count: number; bytes: number } {
    return { count: records.length, bytes: JSON.stringify(records).length };
}
