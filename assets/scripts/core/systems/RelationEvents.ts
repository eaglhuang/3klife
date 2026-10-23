// @spec-source → 家族關係（史實相性）系統.md §A 功能清單 #7「關係事件觸發」、§G 劇本相關；WBS KIN-08（PROG-2-1068）
/**
 * RelationEvents — 關係組合在戰場／治理場景觸發專屬事件（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 場景內在場的武將兩兩比對史實配對表（HistoricalPairTable）。
 *   - 命中某事件的關係型別、且場景相符，回傳一筆事件（只給劇本 Key，文字與演出交給 UI）。
 *   - 同一事件、同一對武將、同一場景實例（例如同一場戰役、同一季）只觸發一次，由 RelationEventLedger 記錄。
 *
 * 暫定（規格未寫，記進待辦檔）：
 *   - 場景與事件對應：戰場 → 名將契合（COUPLE）、義兄弟合攻（SWORN）；治理（配種）→ 宿敵配種（RIVAL）。
 *   - 「關係圖鑑完成」「家風傳承」需要整套圖鑑或家風資料，本卡不做。
 *   - 血脈共鳴需要祖先標籤引擎，本卡不做。
 *
 * Unity 對照：像一組 ScriptableObject 的事件規則表；RelationEventLedger 像每場戰役一份的 HashSet，
 * 用來保證 OneShot（同一條件只播一次）。
 */
import type { HistoricalPairTable } from './HistoricalPairs';
import type { HistoricalRelationType } from './KinRelation';

export type RelationEventScene = 'battle' | 'governance';

export interface RelationEventDef {
    /** 事件代碼（唯一） */
    eventId: string;
    scene: RelationEventScene;
    /** 命中的史實關係型別；任一符合即觸發 */
    relationTypes: readonly HistoricalRelationType[];
    /** 劇本字串 Key（文字由 UI 字串表解析，見規格 §G） */
    loreKey: string;
}

export const RELATION_EVENT_DEFS: readonly RelationEventDef[] = [
    { eventId: 'famous-match', scene: 'battle', relationTypes: ['COUPLE'], loreKey: 'LORE_REL_EVENT_FAMOUS_MATCH' },
    { eventId: 'sworn-combo', scene: 'battle', relationTypes: ['SWORN'], loreKey: 'LORE_REL_EVENT_SWORN_COMBO' },
    { eventId: 'rival-breed', scene: 'governance', relationTypes: ['RIVAL'], loreKey: 'LORE_REL_EVENT_RIVAL_BREED' },
];

export interface RelationEventHit {
    eventId: string;
    loreKey: string;
    scene: RelationEventScene;
    /** 配對鍵（與順序無關，已排序） */
    pairKey: string;
    templateA: string;
    templateB: string;
    relationType: HistoricalRelationType;
}

export interface RelationEventContext {
    scene: RelationEventScene;
    /** 場景內在場的武將 Template_ID（戰場：出陣武將；治理：配種的父母） */
    templateIds: readonly string[];
}

/** 配對鍵：兩個 Template_ID 排序後以 | 連接 */
export function relationPairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * 找出場景內所有命中的關係事件。
 * 同一對武將若同時命中多個事件，各自回傳一筆；重複的 Template_ID 只比對一次。
 */
export function detectRelationEvents(
    table: HistoricalPairTable,
    context: RelationEventContext,
    defs: readonly RelationEventDef[] = RELATION_EVENT_DEFS,
): RelationEventHit[] {
    const ids = Array.from(new Set(context.templateIds)).sort();
    const hits: RelationEventHit[] = [];
    for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
            const relation = table.relationBetween(ids[i], ids[j]);
            if (!relation) continue;
            for (const def of defs) {
                if (def.scene !== context.scene) continue;
                if (!def.relationTypes.includes(relation.type)) continue;
                hits.push({
                    eventId: def.eventId,
                    loreKey: def.loreKey,
                    scene: def.scene,
                    pairKey: relationPairKey(ids[i], ids[j]),
                    templateA: ids[i],
                    templateB: ids[j],
                    relationType: relation.type,
                });
            }
        }
    }
    return hits;
}

/**
 * 一次性記錄：scopeKey 為場景實例（例如戰役 ID、季度）。
 * tryFire 第一次回傳 true，之後同一鍵回傳 false。
 */
export class RelationEventLedger {
    private readonly fired = new Set<string>();

    static keyOf(scopeKey: string, hit: Pick<RelationEventHit, 'eventId' | 'pairKey'>): string {
        return `${scopeKey}#${hit.eventId}#${hit.pairKey}`;
    }

    tryFire(scopeKey: string, hit: Pick<RelationEventHit, 'eventId' | 'pairKey'>): boolean {
        const key = RelationEventLedger.keyOf(scopeKey, hit);
        if (this.fired.has(key)) return false;
        this.fired.add(key);
        return true;
    }

    /** 只回傳這次真正要播放的事件（已播過的過濾掉），並同時登記 */
    takeNew(scopeKey: string, hits: readonly RelationEventHit[]): RelationEventHit[] {
        return hits.filter((hit) => this.tryFire(scopeKey, hit));
    }

    size(): number {
        return this.fired.size;
    }

    snapshot(): string[] {
        return Array.from(this.fired).sort();
    }

    /** 存檔讀回：非字串項目略過 */
    restore(raw: unknown): void {
        this.fired.clear();
        if (!Array.isArray(raw)) return;
        for (const item of raw) {
            if (typeof item === 'string' && item.length > 0) this.fired.add(item);
        }
    }
}
