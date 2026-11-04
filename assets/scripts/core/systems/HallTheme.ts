// @spec-source → 大廳系統規格書 doc_spec_0002 E-6（晝夜與節慶氛圍替換，主題配置驅動）；UI-2-0144（UI-2-0123 子項）
/**
 * HallTheme — 幕府大廳該套哪一套主題，純 TS，不依賴 cc。
 *
 * 輸入目前季節（GameClock 的 1~4）、當地小時與進行中的節慶 id，依 hall-theme.json 算出：
 * 季節 key、晝夜、背景圖路徑、夜色遮罩、夏日光束、勢力圖季節色調、季節粒子要用哪一季，以及節慶裝飾槽。
 * 節慶只透過設定檔覆寫背景／裝飾／粒子三層，這裡不為任何節慶寫分支（E-6 第 4 條）。
 * Unity 對照：像一個 ScriptableObject 主題表＋查詢函式，View 只照結果切換 Sprite 與 GameObject.active。
 */
import type { HallSeason } from './HallSeasonFx';

export type HallDaypart = 'day' | 'night';

export interface HallTint {
    color: string;
    alpha: number;
}

export interface HallSeasonTint extends HallTint {
    blend: 'soft-light' | 'screen' | 'normal';
}

export interface HallFestivalTheme {
    /** 覆寫背景圖路徑（可含 {season}）；未填沿用季節背景。 */
    backgroundPath?: string;
    /** 節慶裝飾層的資源路徑；未填則裝飾槽隱藏。 */
    decorPath?: string;
    /** 覆寫前景粒子用哪一季的樣式。 */
    fxSeason?: HallSeason;
}

export interface HallThemeConfig {
    seasonKeys: Record<string, HallSeason>;
    backgroundPath: string;
    night: { startHour: number; endHour: number };
    nightTint: HallTint & { glowColor: string; glowAlpha: number };
    sunraySeasons: readonly HallSeason[];
    seasonTint: Record<HallSeason, HallSeasonTint>;
    festivals: Record<string, HallFestivalTheme>;
}

export interface HallThemeInput {
    /** GameClock 季節序號：1 春、2 夏、3 秋、4 冬。 */
    seasonIndex: number;
    /** 當地小時 0~23。 */
    hour: number;
    festivalId?: string | null;
}

export interface HallTheme {
    season: HallSeason;
    daypart: HallDaypart;
    backgroundPath: string;
    nightTint: (HallTint & { glowColor: string; glowAlpha: number }) | null;
    sunrays: boolean;
    seasonTint: HallSeasonTint;
    fxSeason: HallSeason;
    festivalId: string | null;
    decorPath: string | null;
}

/** lobby-hub.json Current_Theme.Festival_Theme_ID 表示「無節慶」的哨兵值。 */
export const HALL_NO_FESTIVAL_ID = 'NONE';

/** lobby-hub 的節慶 ID → 大廳主題的 festivalId；哨兵值、空字串或缺值為 null（UI-2-0155）。 */
export function hallFestivalIdOf(festivalThemeId: string | null | undefined): string | null {
    return festivalThemeId && festivalThemeId !== HALL_NO_FESTIVAL_ID ? festivalThemeId : null;
}

/** 跨午夜的區間（例如 18~6）也成立；start === end 視為沒有夜間。 */
export function hallDaypartOf(hour: number, night: Readonly<HallThemeConfig['night']>): HallDaypart {
    const h = ((Math.floor(hour) % 24) + 24) % 24;
    const { startHour: s, endHour: e } = night;
    if (s === e) return 'day';
    const inNight = s < e ? h >= s && h < e : h >= s || h < e;
    return inNight ? 'night' : 'day';
}

export function resolveHallTheme(input: Readonly<HallThemeInput>, config: Readonly<HallThemeConfig>): HallTheme {
    const season = config.seasonKeys[String(input.seasonIndex)] ?? config.seasonKeys['1'] ?? 'spring';
    const daypart = hallDaypartOf(input.hour, config.night);
    const festivalId = input.festivalId && config.festivals[input.festivalId] ? input.festivalId : null;
    const festival = festivalId ? config.festivals[festivalId] : null;
    const backgroundTemplate = festival?.backgroundPath ?? config.backgroundPath;
    return {
        season,
        daypart,
        backgroundPath: backgroundTemplate.replace('{season}', season),
        nightTint: daypart === 'night' ? { ...config.nightTint } : null,
        // 光束是日光：夜間不開
        sunrays: daypart === 'day' && config.sunraySeasons.includes(season),
        seasonTint: { ...config.seasonTint[season] },
        fxSeason: festival?.fxSeason ?? season,
        festivalId,
        decorPath: festival?.decorPath ?? null,
    };
}
