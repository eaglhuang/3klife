// @spec-source → 角色雙故事層補遺_2026-04-04.md §第一波規則（命鏡 / 覺醒頁：5 格命運帶）；武將人物介面規格書 §6 storyStripCells；STORY-04（PROG-2-1392，PM 暫定映射 2026-10-28）
/**
 * MirrorFateStrip — 命鏡頁的 5 格命運帶（純邏輯，不依賴 cc）。
 *
 * 來源是武將的 6 格故事條（storyStripCells：origin、faction、role、awakening、bloodline、future）。
 * PM 暫定映射（可逆）：
 * - 前 4 格（起源、勢力、定位、覺醒）各佔一格；
 * - 第 5 格 bloodline 與第 6 格 future 合併成一格，第 6 格沒有資料就只用第 5 格。
 *
 * 輸出順序即命鏡頁節點順序：origin、bloodline、trial、awakening、future（與 SpiritFamilyOverview 的 StoryStrip 節點一致）。
 * 標題依位置固定，內文來自上面的映射；沒有資料的格內文為空字串，由呼叫端決定要不要退回預設文字。
 *
 * Unity 對照：像把一組 6 欄的 DataTable 重新 Pack 成 5 欄的 ViewModel，合併欄位時用 Join，表本身不改。
 */
import type { GeneralDetailStoryCellConfig, GeneralDetailStorySlot } from '../models/GeneralUnit';

export interface MirrorFateCell {
    title: string;
    body: string;
}

/** 命鏡頁節點順序的標題（位置固定；內文依映射取） */
export const MIRROR_FATE_TITLES: readonly string[] = ['起源', '勢力', '定位', '覺醒', '血脈與未來'];

const FIRST_FOUR_SLOTS: readonly GeneralDetailStorySlot[] = ['origin', 'faction', 'role', 'awakening'];
const MERGED_SLOTS: readonly GeneralDetailStorySlot[] = ['bloodline', 'future'];
/** 合併時兩段文字之間的分隔（全形空白） */
const MERGE_SEPARATOR = '　';

function textOf(cells: readonly GeneralDetailStoryCellConfig[], slot: GeneralDetailStorySlot): string {
    return cells.find((cell) => cell.slot === slot)?.text?.trim() ?? '';
}

/** 依 6 格故事條產出 5 格命運帶（順序：起源、勢力、定位、覺醒、血脈與未來）。 */
export function buildMirrorFateStrip(cells: readonly GeneralDetailStoryCellConfig[] = []): MirrorFateCell[] {
    const bodies = [
        ...FIRST_FOUR_SLOTS.map((slot) => textOf(cells, slot)),
        MERGED_SLOTS.map((slot) => textOf(cells, slot)).filter((text) => text !== '').join(MERGE_SEPARATOR),
    ];
    return bodies.map((body, index) => ({ title: MIRROR_FATE_TITLES[index], body }));
}
