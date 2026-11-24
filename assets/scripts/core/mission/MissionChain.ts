// @spec-source → 大廳任務規格 doc_spec_1178 §7.3（連鎖）；PROG-2-9966
/**
 * MissionChain — 連鎖任務的「第幾段／最多幾段」推算（純邏輯，不 import 'cc'）。
 *
 * 連鎖是靠結果樹裡的 spawn 效果串起來的（定義 A 的某個結果會生出定義 B）。
 * 定義之間可能繞圈（巡查烽燧 → 搗毀細作網 → 巡查烽燧），所以「總段數」取
 * 「從這張卡往後、不重複走同一個定義的最長路徑」，只作為玩家看的「連續任務 2/4」分母。
 */
import type { MissionDefinition, MissionNode } from './MissionTypes';

/** 走遍結果樹，收集所有 spawn 效果指到的定義 id（去重、保持首次出現順序） */
export function chainSpawnTargets(def: Pick<MissionDefinition, 'branches'>): string[] {
    const found: string[] = [];
    const walk = (node: MissionNode | undefined): void => {
        if (!node) return;
        switch (node.kind) {
            case 'roll':
                for (const child of Object.values(node.tiers)) walk(child);
                break;
            case 'chance':
                walk(node.hit);
                walk(node.miss);
                break;
            case 'switch':
                for (const c of node.cases) walk(c.then);
                walk(node.else);
                break;
            case 'seq':
                for (const child of node.nodes) walk(child);
                break;
            case 'effects':
                for (const e of node.effects) if (e.kind === 'spawn' && !found.includes(e.defId)) found.push(e.defId);
                break;
        }
    };
    for (const branch of def.branches) walk(branch.outcome);
    return found;
}

/** 搜尋深度上限：避免資料出現超大環時爆炸（目前資料最長路徑不到 10） */
const MAX_CHAIN_SEARCH = 16;
const _extraCache = new WeakMap<object, Map<string, number>>();

/** 從 defId 往後最多還能再走幾個「不重複的定義」 */
function longestExtra(defs: ReadonlyMap<string, MissionDefinition>, defId: string): number {
    let cache = _extraCache.get(defs);
    if (!cache) { cache = new Map(); _extraCache.set(defs, cache); }
    const hit = cache.get(defId);
    if (hit !== undefined) return hit;
    const visit = (id: string, seen: Set<string>): number => {
        if (seen.size >= MAX_CHAIN_SEARCH) return 0;
        const def = defs.get(id);
        if (!def) return 0;
        let best = 0;
        for (const next of chainSpawnTargets(def)) {
            if (seen.has(next) || !defs.has(next)) continue;
            seen.add(next);
            best = Math.max(best, 1 + visit(next, seen));
            seen.delete(next);
        }
        return best;
    };
    const result = visit(defId, new Set([defId]));
    cache.set(defId, result);
    return result;
}

/** 連續任務總段數（分母）：目前是第 depth 段，往後最多再有幾段；至少等於 depth */
export function chainTotalOf(defs: ReadonlyMap<string, MissionDefinition>, defId: string, depth: number): number {
    return Math.max(1, depth) + longestExtra(defs, defId);
}

/** 「連續任務 2/3」標記字樣；t 由呼叫端注入（i18n），沒給時用繁中預設 */
export function chainTagText(depth: number, total: number, t?: (key: string, ...args: Array<string | number>) => string): string {
    return t ? t('ui.hallMission.chain.tag', depth, total) : `連續任務 ${depth}/${total}`;
}
