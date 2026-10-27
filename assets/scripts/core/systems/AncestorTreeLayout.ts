// @spec-source → 武將人物介面規格書 §6.2 左半區（14 人祖先圖、三代節點、detail peek、未揭露顯示鎖與傾向）；WBS GDUI-04（PROG-2-1265）
/**
 * AncestorTreeLayout — 命頁左半區 14 人祖先圖的節點位置與 detail peek 文字（純邏輯，不依賴 cc）
 *
 * 三代：父母 2 人、祖父母 4 人、曾祖輩 8 人，共 14 個節點。位置為左半區的相對座標（0..1）。
 * 未揭露的祖先不顯示假資料：只顯示鎖、問號與血脈傾向（core_tags）。
 *
 * 暫定：
 *   - 節點位置為固定版面，cc 掛載時依實際左半區大小換算。
 *   - 文字暫定寫在本檔，待正式 i18n key 補齊後改由語系表取值。
 *
 * Unity 對照：像一個固定的 Grid 版面加上 Tooltip，點擊時只打開小面板。
 */

export interface AncestorSlot {
    /** 0 = 父母；1 = 祖父母；2 = 曾祖輩 */
    generation: 0 | 1 | 2;
    /** 相對左半區的座標（0..1） */
    x: number;
    y: number;
}

/** 14 個祖先節點的固定位置（父母 2、祖父母 4、曾祖輩 8） */
export const ANCESTOR_TREE_SLOTS: readonly AncestorSlot[] = [
    { generation: 0, x: 0.3, y: 0.2 },
    { generation: 0, x: 0.7, y: 0.2 },
    { generation: 1, x: 0.15, y: 0.5 },
    { generation: 1, x: 0.4, y: 0.5 },
    { generation: 1, x: 0.6, y: 0.5 },
    { generation: 1, x: 0.85, y: 0.5 },
    { generation: 2, x: 0.08, y: 0.8 },
    { generation: 2, x: 0.22, y: 0.8 },
    { generation: 2, x: 0.36, y: 0.8 },
    { generation: 2, x: 0.44, y: 0.8 },
    { generation: 2, x: 0.56, y: 0.8 },
    { generation: 2, x: 0.64, y: 0.8 },
    { generation: 2, x: 0.78, y: 0.8 },
    { generation: 2, x: 0.92, y: 0.8 },
];

/** peek 需要的祖先資料（PersonRecord 的子集） */
export interface AncestorPeekSource {
    name: string;
    faction: string;
    core_tags?: string[];
}

export interface AncestorPeekView {
    title: string;
    /** 血脈傾向；沒有標籤時為「—」，不補假資料 */
    tendency: string;
    lines: string[];
    locked: boolean;
}

/**
 * 祖先是否已揭露（暫定）：虛擬祖先是系統補全的佔位，沒有真實資料可揭露；真實祖先視為已揭露。
 * 目前沒有逐位祖先的揭露欄位，PM 裁定前以此為準。
 */
export function isAncestorRevealed(person: { is_virtual: boolean }): boolean {
    return !person.is_virtual;
}

/** 點擊祖先節點的小型 peek：未揭露只顯示鎖與問號，血脈傾向仍可見 */
export function ancestorPeekView(source: AncestorPeekSource | null, revealed: boolean): AncestorPeekView {
    const tags = source?.core_tags ?? [];
    const tendency = tags.length > 0 ? tags.join('、') : '—';
    if (!source || !revealed) {
        return { title: '？？？', tendency, lines: ['鎖定：尚未揭露'], locked: true };
    }
    return {
        title: source.name,
        tendency,
        lines: [`勢力：${source.faction}`],
        locked: false,
    };
}
