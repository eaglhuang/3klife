// @spec-source → WBS v16.3 HALL-09（晝夜與節慶主題配置驅動）；系統規格書：大廳系統 §E-6
/**
 * LobbyThemeResolver — 大廳晝夜與節慶三層的解析（純邏輯，不依賴 cc）。
 *
 * - 輸入是 Lobby_Hub.Current_Theme 與節慶層配置表，輸出一張扁平的 HallThemeFrame。
 * - 主程式不認識任何節慶名稱：節慶是否顯示只看 Festival_Theme_ID 能否在配置表找到。
 * - 查不到的節慶 ID 視為未啟用（平時隱藏的插槽），不丟錯，也不沿用上一個節慶的圖層。
 *
 * Unity 對照：像 Addressables 的 label 切換。場景只持有一個 Theme 入口，
 * 換 Theme_ID 就載入另一組背景、裝飾、粒子的 AssetReference，不在 Scene 腳本裡寫 if。
 */
import { HALL_DAY_NIGHT_MODES, LobbyHub } from './LobbyHubSchema';

export type HallDayNightMode = (typeof HALL_DAY_NIGHT_MODES)[number];

/** 節慶插槽 Festival_Slot 的三層：背景、裝飾、前景粒子；缺的層為 null 或空陣列。 */
export interface HallFestivalLayers {
    backgroundId: string | null;
    decorationIds: string[];
    particleId: string | null;
}

export interface HallThemeCatalog {
    festivals: Record<string, HallFestivalLayers>;
}

/** 解析結果：場景每次刷新只讀這裡，不再回頭看 Current_Theme。 */
export interface HallThemeFrame {
    dayNight: HallDayNightMode;
    overlayTint: string;
    /** 基礎背景（Current_Theme.Background_ID）；節慶有背景層時由節慶背景覆蓋顯示。 */
    baseBackgroundId: string;
    festivalActive: boolean;
    layers: {
        background: string;
        decorationIds: string[];
        particleId: string | null;
    };
}

export const HALL_EMPTY_THEME_CATALOG: HallThemeCatalog = { festivals: {} };

/** 節慶未啟用時的 Festival_Theme_ID 哨兵值（與 lobby-hub.json 一致）。 */
const NO_FESTIVAL_ID = 'NONE';

export function resolveHallTheme(
    theme: LobbyHub['Current_Theme'],
    catalog: HallThemeCatalog = HALL_EMPTY_THEME_CATALOG,
): HallThemeFrame {
    const festival = theme.Festival_Theme_ID !== NO_FESTIVAL_ID
        && Object.prototype.hasOwnProperty.call(catalog.festivals, theme.Festival_Theme_ID)
        ? catalog.festivals[theme.Festival_Theme_ID]
        : undefined;
    const festivalActive = festival !== undefined;
    return {
        dayNight: theme.Day_Night_Mode,
        overlayTint: theme.Overlay_Tint,
        baseBackgroundId: theme.Background_ID,
        festivalActive,
        layers: {
            background: festival?.backgroundId ?? theme.Background_ID,
            decorationIds: festival ? [...festival.decorationIds] : [],
            particleId: festival?.particleId ?? null,
        },
    };
}
