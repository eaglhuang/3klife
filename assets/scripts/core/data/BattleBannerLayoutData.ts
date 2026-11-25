/**
 * 戰場橫幅（提示條、招式名橫幅）的版面資料（PROG-2-10025）。
 *
 * 全部用「畫面比例」＋「錨點／對齊規則」表達，程式不寫死像素與畫面寬高，
 * 日後改直式或手機橫式時只換這份資料（或依畫面方向挑另一組規則）。
 * 比例座標：原點左上，x、y、寬、高皆為 0～1（佔容器的比例）。
 */
export interface BannerAlignRule {
    /** 貼齊容器哪一邊 */
    anchor: 'top' | 'bottom';
    /** 離錨點邊緣的距離（容器高度的比例） */
    insetRatio: number;
    /** 水平偏移（容器寬度的比例，正右負左；0＝置中） */
    xOffsetRatio: number;
}

export interface RatioRect { x: number; y: number; width: number; height: number }

export interface BattleBannerLayout {
    toast: BannerAlignRule;
    skillBanner: BannerAlignRule;
    /** 橫幅不可蓋住的 HUD 區域（保留區） */
    reserved: Record<string, RatioRect>;
}

/** 橫向 16:9 的實測保留區（1280x720 虎牢關首戰）；橫幅落在標題列與教學頁籤之間的空帶 */
export const BATTLE_BANNER_LAYOUT: BattleBannerLayout = {
    toast: { anchor: 'top', insetRatio: 0.064, xOffsetRatio: -0.04 },
    skillBanner: { anchor: 'top', insetRatio: 0.07, xOffsetRatio: -0.04 },
    reserved: {
        topBar: { x: 0, y: 0, width: 1, height: 0.06 },
        coachTab: { x: 0.42, y: 0.17, width: 0.16, height: 0.06 },
        summaryPanel: { x: 0, y: 0.08, width: 0.12, height: 0.18 },
        enemyInfo: { x: 0.67, y: 0.1, width: 0.2, height: 0.2 },
        wisdomBar: { x: 0.81, y: 0.1, width: 0.19, height: 0.04 },
    },
};
