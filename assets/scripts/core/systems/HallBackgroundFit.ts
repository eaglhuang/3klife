/** 幕府大廳底圖原尺寸（設計稿 1920×1480） */
const HALL_BG_WIDTH = 1920;
const HALL_BG_HEIGHT = 1480;

/** 讓底圖蓋滿畫面所需的放大倍率；不會小於 1，16:9 維持原樣（PROG-2-2193） */
export function hallBgCoverScale(screenWidth: number, screenHeight: number): number {
    return Math.max(1, screenWidth / HALL_BG_WIDTH, screenHeight / HALL_BG_HEIGHT);
}
