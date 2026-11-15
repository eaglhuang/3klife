/**
 * 人物頁命分頁血統樹的左區幾何（純資料、不依賴 cc，方便單元測試）。
 *
 * 右欄（CharacterDs3Main_div_6：內容 560 + 分頁鈕 160）固定 720 寬、貼齊主體右上下；
 * 左區就是主體扣掉右欄後剩下的整塊，視窗變寬或變高都跟著撐滿，不露出底下人物圖。
 */

/** 設計解析度（版面根節點 1920×1080） */
export const DS3_DESIGN_WIDTH = 1920;
export const DS3_DESIGN_HEIGHT = 1080;

/** 右欄寬：左區不可超過「主體寬 − 這個值」，否則會蓋到右欄 ContentSlot */
export const DS3_RIGHT_COLUMN_WIDTH = 720;

export interface Ds3BloodlineRegion {
    /** 左區中心 x（host 原點在中心） */
    x: number;
    width: number;
    height: number;
}

/** 依主體尺寸算出左區：左貼齊主體左緣、右貼齊右欄、上下撐滿 */
export function ds3BloodlineRegion(hostWidth: number, hostHeight: number): Ds3BloodlineRegion {
    const width = Math.max(0, hostWidth - DS3_RIGHT_COLUMN_WIDTH);
    return { x: -hostWidth / 2 + width / 2, width, height: hostHeight };
}
