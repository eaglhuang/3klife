// @spec-source → 血統理論系統.md §E #6「簡化/專家 UI 切換：預設顯示父母 2 代，點擊展開 14 人全圖」；PROG-2-1731
/**
 * BloodlineTreeViewMode — 祖先樹的簡化／專家顯示模式（純邏輯，不依賴 cc）。
 *
 * - simple（簡化）：只顯示父母與祖父母兩代，共 6 人。
 * - expert（專家）：顯示父母、祖父母、曾祖父母三代，共 14 人。
 * - 世代用 PedigreeSlot 的長度判斷（F = 父母、FF = 祖父母、FFF = 曾祖父母）。
 *
 * 暫定：「父母 2 代」解讀為父母＋祖父母兩代；切換按鈕的位置與文字待版面定案後接上，
 * 在那之前面板預設維持 expert，避免既有頁面少掉曾祖父母。
 *
 * Unity 對照：像 Inspector 的 Simple / Advanced 折疊，只決定哪些列顯示，資料本身不變。
 */
import { pedigreeSlotGeneration, PEDIGREE_SLOTS, type PedigreeSlot } from '../services/BloodlineGraph';

export type BloodlineTreeViewMode = 'simple' | 'expert';

/** 規格預設模式（簡化） */
export const BLOODLINE_TREE_SPEC_DEFAULT_MODE: BloodlineTreeViewMode = 'simple';

const VISIBLE_GENERATIONS: Readonly<Record<BloodlineTreeViewMode, readonly (1 | 2 | 3)[]>> = {
    simple: [1, 2],
    expert: [1, 2, 3],
};

/** 切換按鈕文字：簡化時提示可展開，專家時提示可收合 */
export const BLOODLINE_TREE_TOGGLE_LABEL: Readonly<Record<BloodlineTreeViewMode, string>> = {
    simple: '展開全圖',
    expert: '收合',
};

export function isGenerationVisible(generation: 1 | 2 | 3, mode: BloodlineTreeViewMode): boolean {
    return VISIBLE_GENERATIONS[mode].includes(generation);
}

export function isPedigreeSlotVisible(slot: PedigreeSlot, mode: BloodlineTreeViewMode): boolean {
    return isGenerationVisible(pedigreeSlotGeneration(slot), mode);
}

/** 該模式下看得到的祖先格位（依 PEDIGREE_SLOTS 順序） */
export function visiblePedigreeSlots(mode: BloodlineTreeViewMode): PedigreeSlot[] {
    return PEDIGREE_SLOTS.filter((slot) => isPedigreeSlotVisible(slot, mode));
}

export function toggleBloodlineTreeMode(mode: BloodlineTreeViewMode): BloodlineTreeViewMode {
    return mode === 'simple' ? 'expert' : 'simple';
}
