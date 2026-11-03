// @spec-source → 見 docs/cross-reference-index.md
/**
 * ScreenBackdrop — 全螢幕背景圖設定（引擎中立）。
 *
 * 讀 data/ui-screen-backdrops.json，決定某個畫面要不要在最底層鋪一張可替換的全景背景圖。
 * 純函式、不依賴引擎：Cocos／Unity 各自負責載圖與鋪滿。
 *
 * 規則：背景圖取代大容器的不透明底色（覆蓋畫面比例 ≥ replaceFillCoverRatio 的節點）；
 * 半透明光暈、漸暗等修飾層保留，疊在背景圖上襯托 UI。
 */

export interface ScreenBackdropTable {
    version?: number;
    /** 未列在 screens 的畫面用這張；null／省略則維持原本底色。 */
    default?: string | null;
    /** 畫面 id（layout id）→ 背景圖 id；值為 null 表示該畫面明確不用背景圖。 */
    screens?: Record<string, string | null>;
    backdrops?: Record<string, ScreenBackdropEntry>;
}

export interface ScreenBackdropEntry {
    /** resources 下的 SpriteFrame 路徑（不含副檔名）。 */
    sprite: string;
    /** 覆蓋畫面比例達此值的容器，其不透明底色改由背景圖取代；預設 0.5。 */
    replaceFillCoverRatio?: number;
}

export interface ResolvedScreenBackdrop {
    id: string;
    sprite: string;
    replaceFillCoverRatio: number;
}

export const SCREEN_BACKDROP_TABLE_PATH = 'data/ui-screen-backdrops';
const DEFAULT_REPLACE_FILL_COVER_RATIO = 0.5;

export function resolveScreenBackdrop(
    table: ScreenBackdropTable | null | undefined,
    screenId: string | null | undefined,
): ResolvedScreenBackdrop | null {
    if (!table) return null;
    const screens = table.screens ?? {};
    const id = screenId && Object.prototype.hasOwnProperty.call(screens, screenId)
        ? screens[screenId]
        : table.default;
    if (!id) return null;
    const entry = table.backdrops?.[id];
    if (!entry || typeof entry.sprite !== 'string' || !entry.sprite) return null;
    const ratio = entry.replaceFillCoverRatio;
    return {
        id,
        sprite: entry.sprite,
        replaceFillCoverRatio: typeof ratio === 'number' && ratio > 0 ? ratio : DEFAULT_REPLACE_FILL_COVER_RATIO,
    };
}

/** 背景圖等比放大到蓋滿畫面（CSS background-size: cover），回傳顯示尺寸。 */
export function coverSize(
    imageWidth: number,
    imageHeight: number,
    screenWidth: number,
    screenHeight: number,
): { width: number; height: number } {
    if (!(imageWidth > 0) || !(imageHeight > 0)) return { width: screenWidth, height: screenHeight };
    const scale = Math.max(screenWidth / imageWidth, screenHeight / imageHeight);
    return { width: imageWidth * scale, height: imageHeight * scale };
}
