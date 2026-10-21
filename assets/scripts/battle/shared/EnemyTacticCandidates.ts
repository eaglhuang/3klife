// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層；TacticAiRules.ts（PROG-2-0912 第 1 段）
/**
 * EnemyTacticCandidates — 敵方戰法候選來源（純邏輯，不依賴 cc）
 *
 * 從敵方武將的戰法槽與戰法庫，產生給 pickTacticByAiRule 的候選清單。
 * 只帶 tacticId 與類別；數值（預估傷害、效果值、場景條件）由下一段依戰況填入。
 *
 * Unity 對照：把 Inventory 的道具整理成 AI 可選的 Action 清單，數值之後再由戰場狀態填。
 */
import type { TacticAiCategory, TacticAiCandidate } from './TacticAiRules';

/** 暫定：戰法庫分類 → 戰法 AI 類別；未列出的分類不進候選 */
const LIBRARY_CATEGORY_TO_AI: Readonly<Record<string, TacticAiCategory>> = {
  support: 'buff-heal',
  formation: 'tile-scene',
  ambush: 'tile-scene',
  charge: 'single-damage',
  ranged: 'single-damage',
  scheme: 'single-damage',
  control: 'single-damage',
  duel: 'single-damage',
};

export interface EnemyTacticSlot {
    tacticId: string;
    source?: string;
}

export interface EnemyTacticLibraryEntry {
    id: string;
    category?: string;
}

export function tacticAiCategoryOf(libraryCategory: string | undefined): TacticAiCategory | null {
    if (!libraryCategory) return null;
    return LIBRARY_CATEGORY_TO_AI[libraryCategory] ?? null;
}

/** 依戰法槽與戰法庫產生候選；鎖定槽、戰法庫查不到的戰法、未知分類都不進清單，同一戰法只留一次 */
export function buildEnemyTacticCandidates(
    slots: readonly EnemyTacticSlot[],
    library: readonly EnemyTacticLibraryEntry[],
): TacticAiCandidate[] {
    const byId = new Map(library.map(entry => [entry.id, entry]));
    const seen = new Set<string>();
    const candidates: TacticAiCandidate[] = [];
    for (const slot of slots) {
        if (slot.source === 'locked') continue;
        if (seen.has(slot.tacticId)) continue;
        const category = tacticAiCategoryOf(byId.get(slot.tacticId)?.category);
        if (!category) continue;
        seen.add(slot.tacticId);
        candidates.push({ tacticId: slot.tacticId, category });
    }
    return candidates;
}
