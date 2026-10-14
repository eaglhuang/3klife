/**
 * 家族關係（動態關係）：事件建立與存檔快照（KIN-06）。
 *
 * 規格：docs/遊戲規格文件/系統規格書/家族關係（史實相性）系統.md §5、§I
 * Unity 對照：DynamicRelationBook 像一個 ScriptableObject 持有的關係表，事件進來時 Upsert；
 * snapshot / restore 像 JsonUtility 的序列化與反序列化，無效資料會被略過。
 *
 * 純邏輯，不碰場景與存檔。事件呼叫端與 GameSession 欄位另卡接線。
 */
import {
    DynamicRelation,
    DynamicRelationType,
    parseDynamicRelation,
} from './KinRelation';

/** 暫定（規格未寫）：新建動態關係的起始親密度 */
export const DYNAMIC_RELATION_INITIAL_INTIMACY = 30;
/** 暫定（規格未寫）：事件建立時寫入的每季衰減值（PROG-2-0521） */
export const DYNAMIC_RELATION_DECAY_RATE = 2;
/** 暫定（規格未寫）：一次互動回補的親密度（PROG-2-0521） */
export const DYNAMIC_RELATION_INTERACT_GAIN = 10;

export type DynamicRelationEventKind = 'battle-comrade' | 'mercenary-oath' | 'bonding' | 'parentage';

/** 事件 → 關係型別（規格 §5：戰場共鬥→戰友、結義傭兵→義兄弟、結緣→夫妻；WBS 另列親子） */
export const DYNAMIC_RELATION_BY_EVENT: Readonly<Record<DynamicRelationEventKind, DynamicRelationType>> = {
    'battle-comrade': 'COMRADE',
    'mercenary-oath': 'DYNAMIC_SWORN',
    bonding: 'SPOUSE',
    parentage: 'PARENT_CHILD',
};

export type DynamicRelationResult =
    | { ok: true; relation: DynamicRelation; created: boolean }
    | { ok: false; reason: string };

/** 配對鍵與順序無關：A-B 與 B-A 視為同一對 */
export function pairKeyOf(uidA: string, uidB: string): string {
    return uidA < uidB ? `${uidA}|${uidB}` : `${uidB}|${uidA}`;
}

/** 由事件建立一筆動態關係（未寫入任何表）。自我配對、未知事件、資料不合法都會回傳 reason。 */
export function dynamicRelationForEvent(
    kind: DynamicRelationEventKind,
    uidA: string,
    uidB: string,
    season: number,
): DynamicRelationResult {
    const type = DYNAMIC_RELATION_BY_EVENT[kind];
    if (!type) return { ok: false, reason: 'unknown-event' };
    const parsed = parseDynamicRelation({
        uidA,
        uidB,
        type,
        intimacy: DYNAMIC_RELATION_INITIAL_INTIMACY,
        createdSeason: season,
        decayRate: DYNAMIC_RELATION_DECAY_RATE,
    });
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    return { ok: true, relation: parsed.value, created: true };
}

/**
 * 關係加成是否生效（PM 裁定 2026-10-14）：親密度 > 0 才有加成；歸 0 時關係本身保留（夫妻、親子等身分不變）。
 * 只判定，不改資料；各加成的實際效果由呼叫端套用。
 */
export function isDynamicBonusActive(relation: DynamicRelation): boolean {
    return relation.intimacy > 0;
}

export class DynamicRelationBook {
    private readonly relations = new Map<string, DynamicRelation>();

    /** 記錄事件；同一對武將、同一型別只保留第一筆（created = false 表示已存在，原資料不變） */
    record(kind: DynamicRelationEventKind, uidA: string, uidB: string, season: number): DynamicRelationResult {
        const built = dynamicRelationForEvent(kind, uidA, uidB, season);
        if (!built.ok) return built;
        const key = `${pairKeyOf(uidA, uidB)}#${built.relation.type}`;
        const existing = this.relations.get(key);
        if (existing) return { ok: true, relation: existing, created: false };
        this.relations.set(key, built.relation);
        return built;
    }

    /** 列出與某武將有關的所有動態關係（依建立季度與配對鍵排序，輸出穩定） */
    listFor(uid: string): DynamicRelation[] {
        return Array.from(this.relations.values())
            .filter((r) => r.uidA === uid || r.uidB === uid)
            .sort((a, b) => a.createdSeason - b.createdSeason || pairKeyOf(a.uidA, a.uidB).localeCompare(pairKeyOf(b.uidA, b.uidB)));
    }

    size(): number {
        return this.relations.size;
    }

    /** 每季衰退：每筆依 decayRate 減親密度，下限 0；回傳實際改動的筆數（KIN-10） */
    decaySeason(): number {
        let changed = 0;
        for (const [key, relation] of this.relations) {
            const next = Math.max(0, relation.intimacy - relation.decayRate);
            if (next === relation.intimacy) continue;
            this.relations.set(key, { ...relation, intimacy: next });
            changed += 1;
        }
        return changed;
    }

    /** 互動回補親密度，上限 100；同一對有多種關係時回補所有型別。沒有關係回傳空陣列（KIN-10） */
    interact(uidA: string, uidB: string, gain: number = DYNAMIC_RELATION_INTERACT_GAIN): DynamicRelation[] {
        const pair = pairKeyOf(uidA, uidB);
        const updated: DynamicRelation[] = [];
        for (const [key, relation] of this.relations) {
            if (pairKeyOf(relation.uidA, relation.uidB) !== pair) continue;
            const next = { ...relation, intimacy: Math.min(100, relation.intimacy + gain) };
            this.relations.set(key, next);
            updated.push({ ...next });
        }
        return updated;
    }

    /** 存檔用快照：回傳新陣列，不共享內部物件 */
    snapshot(): DynamicRelation[] {
        return Array.from(this.relations.values()).map((r) => ({ ...r }));
    }

    /**
     * 從快照還原。每筆都重新驗證，無效或重複項目略過；回傳實際載入數與略過數。
     * 還原會清空目前內容。
     */
    restore(raw: unknown[]): { loaded: number; skipped: number } {
        this.relations.clear();
        let loaded = 0;
        let skipped = 0;
        for (const item of raw) {
            const parsed = parseDynamicRelation(item);
            if (!parsed.ok) {
                skipped += 1;
                continue;
            }
            const key = `${pairKeyOf(parsed.value.uidA, parsed.value.uidB)}#${parsed.value.type}`;
            if (this.relations.has(key)) {
                skipped += 1;
                continue;
            }
            this.relations.set(key, parsed.value);
            loaded += 1;
        }
        return { loaded, skipped };
    }
}
