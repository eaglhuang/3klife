// @spec-source → 大廳系統規格書 doc_spec_0002 E-5；QA 11/25 體驗 2（小人同臉、名牌互疊）
/**
 * HallCrowdVariant — 大廳小人的外觀變體與名牌防疊，純 TS，不依賴 cc。
 *
 * 沒有專屬 Q 版圖的武將共用 generic 素體：依武將 id 雜湊挑一組色調（乘色），重用同一張貼圖，不增加圖集。
 * 名牌互疊：把位置相近的名牌分到不同列（往下錯開），列數有上限，位置全由輸入座標算出，不寫死。
 * Unity 對照：像 SpriteRenderer.color 的色調表加上一個簡單的標籤排版器。
 */

export interface TintRgb { r: number; g: number; b: number }

/** 乘色色盤：偏亮的柔和色，避免素體變暗；第 0 組是原色（不改色），讓一部分人保留原樣。 */
export const CROWD_TINTS: readonly TintRgb[] = [
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 226, b: 204 },
    { r: 214, g: 232, b: 255 },
    { r: 222, g: 255, b: 214 },
    { r: 255, g: 214, b: 232 },
    { r: 238, g: 214, b: 255 },
    { r: 255, g: 244, b: 196 },
    { r: 204, g: 240, b: 240 },
];

/** FNV-1a 32 位元雜湊，同一個 id 永遠得到同一個值。 */
export function crowdHash(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** 依武將 id 挑色調；空色盤回傳原色。 */
export function crowdTintFor(id: string, palette: readonly TintRgb[] = CROWD_TINTS): TintRgb {
    if (palette.length === 0) return { r: 255, g: 255, b: 255 };
    return palette[crowdHash(id) % palette.length];
}

export interface TagBox {
    id: string;
    /** 名牌中心 x、基準 y（舞台座標，y 向上） */
    x: number;
    y: number;
    /** 名牌寬度（px） */
    width: number;
}

export interface TagStaggerOptions {
    /** 每一列往下錯開的高度（px），通常是名牌字高 */
    rowHeight: number;
    /** 最多幾列，超過就留在最後一列 */
    maxRows: number;
}

/**
 * 回傳每張名牌要往下偏移幾列（0 表示不動）。
 * 依 x、再依 id 排序後逐張貪婪分配：選最小的列，使它不與已分配、水平相交的名牌垂直重疊。
 * 排序只看位置與 id，輸入順序不影響結果。
 */
export function staggerTagRows(tags: readonly TagBox[], opt: Readonly<TagStaggerOptions>): Map<string, number> {
    const rows = new Map<string, number>();
    if (opt.rowHeight <= 0 || opt.maxRows <= 0) {
        for (const t of tags) rows.set(t.id, 0);
        return rows;
    }
    const sorted = [...tags].sort((a, b) => (a.x - b.x) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const placed: Array<{ x: number; w: number; y: number }> = [];
    for (const tag of sorted) {
        let row = 0;
        for (; row < opt.maxRows - 1; row++) {
            const y = tag.y - row * opt.rowHeight;
            const clash = placed.some(p =>
                Math.abs(p.x - tag.x) < (p.w + tag.width) / 2 && Math.abs(p.y - y) < opt.rowHeight);
            if (!clash) break;
        }
        rows.set(tag.id, row);
        placed.push({ x: tag.x, w: tag.width, y: tag.y - row * opt.rowHeight });
    }
    return rows;
}

/** 平滑追隨：dt 秒內以指數衰減靠近目標，避免名牌在列間跳動。 */
export function smoothToward(current: number, target: number, dt: number, rate = 10): number {
    const k = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
    return current + (target - current) * k;
}
