/**
 * 人物頁命分頁血統樹的左區幾何（純資料、不依賴 cc，方便單元測試）。
 *
 * 左區對應 character-ds3-main 版面的 bloodline-fullscreen 區（62% × 1920 設計寬，左貼齊）。
 */

/** 設計解析度寬度（版面根節點 1920×1080） */
export const DS3_DESIGN_WIDTH = 1920;

/** 左區寬（62% × 設計寬）：樹不可超過這個範圍，否則會蓋到右欄 ContentSlot（x 1200 起） */
export const DS3_BLOODLINE_LEFT_REGION_WIDTH = 1190;

/**
 * 左區樹根的中心 x（host 原點在中心）：左區貼齊主體左緣，不隨視窗變寬而右移。
 * 寬於設計寬時主體（host）被 Widget 撐寬，若仍以中心為基準，樹會壓到右欄的命紋靈獸／覺醒內容。
 */
export function ds3BloodlineTreeCenterX(hostWidth: number): number {
    return -hostWidth / 2 + DS3_BLOODLINE_LEFT_REGION_WIDTH / 2;
}
