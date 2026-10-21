/**
 * 史實相性配對表（KIN-02）與爆發力／受孕率接線（KIN-04）。
 *
 * 規格：docs/遊戲規格文件/系統規格書/家族關係（史實相性）系統.md §F、§I
 * Unity 對照：HistoricalPairTable 像一張 ScriptableObject 查表資料，載入時逐筆驗證；
 * affinityResolverOf / conceptionModBetween 是純函式的查詢介面，配種流程只讀結果。
 *
 * 名單目前為暫定（data/historical-relations.json），正式名單待企劃替換。
 */
import { HistoricalRelation, parseHistoricalRelation } from './KinRelation';
import type { AffinityResolver } from './BreedingSystem';

export interface HistoricalPairLoadResult {
    table: HistoricalPairTable;
    loaded: number;
    skipped: number;
}

/** 接受陣列，或 { relations: [...] } 形式（與 JSON 資料檔同格式） */
function listOf(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { relations?: unknown }).relations)) {
        return (raw as { relations: unknown[] }).relations;
    }
    return [];
}

export class HistoricalPairTable {
    private readonly byPair = new Map<string, HistoricalRelation>();

    /** 從 JSON 資料載入；無效或同一對已存在的項目略過並計數 */
    static load(raw: unknown): HistoricalPairLoadResult {
        const table = new HistoricalPairTable();
        let loaded = 0;
        let skipped = 0;
        for (const item of listOf(raw)) {
            const parsed = parseHistoricalRelation(item);
            if (!parsed.ok || table.byPair.has(pairKey(parsed.value.templateA, parsed.value.templateB))) {
                skipped += 1;
                continue;
            }
            table.byPair.set(pairKey(parsed.value.templateA, parsed.value.templateB), parsed.value);
            loaded += 1;
        }
        return { table, loaded, skipped };
    }

    /** 查兩位武將的史實關係（順序無關）；沒有則回傳 null */
    relationBetween(templateA: string, templateB: string): HistoricalRelation | null {
        return this.byPair.get(pairKey(templateA, templateB)) ?? null;
    }

    size(): number {
        return this.byPair.size;
    }
}

function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * 名將契合：史實配對（夫妻、義兄弟、師徒、主從）算契合；宿敵不算（規格 §F：宿敵不直接給 EP）。
 * 回傳 AffinityResolver，與 BreedingSystem 既有的 isHistoricalPair 介面相容。
 */
export function affinityResolverOf(table: HistoricalPairTable): AffinityResolver {
    return (father, mother) => {
        const relation = table.relationBetween(father.id, mother.id);
        return relation !== null && relation.type !== 'RIVAL';
    };
}

/** 受孕率倍率：取自該配對資料的 conceptionRateMod；沒有配對或沒有欄位回傳 1 */
export function conceptionModBetween(table: HistoricalPairTable, templateA: string, templateB: string): number {
    const mod = table.relationBetween(templateA, templateB)?.extraEffects.conceptionRateMod;
    return mod !== undefined && Number.isFinite(mod) && mod > 0 ? mod : 1;
}

/**
 * 戰場合攻用：兩個部隊背後武將（模板 id）的史實關係，回傳陣列供 comboChanceOfPair 使用。
 * 任一端沒有模板 id、沒有配對表、或沒有配對都回傳空陣列（不觸發合攻）。
 */
export function combatRelationsBetween(
    table: HistoricalPairTable | null,
    templateA: string | null,
    templateB: string | null,
): HistoricalRelation[] {
    if (!table || !templateA || !templateB) return [];
    const relation = table.relationBetween(templateA, templateB);
    return relation ? [relation] : [];
}
