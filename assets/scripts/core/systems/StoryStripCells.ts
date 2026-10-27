// @spec-source → 武將資料管線規格書 §5 R7 故事格式、§6 檢查項（6 格）；WBS GDP-09 結構部分（PROG-2-1272）
/**
 * StoryStripCells — 故事條 6 格的結構檢查（純邏輯，不依賴 cc）
 *
 * 只檢查結構：格數為 6、每格 slot 與 text 非空、slot 不重複。
 * 不檢查敘事內容好不好、連不連貫（那是人工審核）。
 *
 * Unity 對照：像 Prefab 的結構驗證，檢查六個子節點都在、都有名字，不判斷文案寫得好不好。
 */

export const STORY_STRIP_CELL_COUNT = 6;

export interface StoryStripCell {
    slot?: unknown;
    text?: unknown;
}

/** 回傳結構錯誤的描述清單；空陣列代表結構正確 */
export function storyStripStructureErrors(cells: readonly StoryStripCell[] | null | undefined): string[] {
    if (!Array.isArray(cells)) return ['storyStripCells 不是陣列'];
    const errors: string[] = [];
    if (cells.length !== STORY_STRIP_CELL_COUNT) {
        errors.push(`格數為 ${cells.length}，應為 ${STORY_STRIP_CELL_COUNT}`);
    }
    const seen = new Set<string>();
    cells.forEach((cell, index) => {
        const slot = typeof cell?.slot === 'string' ? cell.slot.trim() : '';
        const text = typeof cell?.text === 'string' ? cell.text.trim() : '';
        if (slot === '') errors.push(`第 ${index + 1} 格 slot 為空`);
        if (text === '') errors.push(`第 ${index + 1} 格 text 為空`);
        if (slot !== '' && seen.has(slot)) errors.push(`slot "${slot}" 重複`);
        seen.add(slot);
    });
    return errors;
}
