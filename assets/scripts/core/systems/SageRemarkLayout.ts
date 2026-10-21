// @spec-source → 名士預言系統.md §K 血統模擬器嵌入與祖輩顯靈規格（結緣主介面：中央模擬器、左右批語區、底部求籤令入口）；WBS ORAC-05（PROG-2-1072）
/**
 * SageRemarkLayout — 結緣主介面的名士批語分欄與文字（純邏輯，不依賴 cc）
 *
 * 版面：中央是血統模擬器（父母樹），左右各一欄放名士批語，底部是求籤令入口。
 * 批語依序交替分到左、右兩欄，讓兩欄長度接近；文字格式與結緣畫面先前的單欄版本相同。
 *
 * 暫定（規格只寫左右分區，沒寫分欄規則）：
 *   - 依批語順序交替分欄：第 1、3 句在左，第 2 句在右。
 *
 * Unity 對照：像一個 static 的 Presenter 小函式，把資料陣列切成兩個 ScrollView 的內容，不改任何資料。
 */
import { getSage } from './SageDivination';
import type { SageRemark } from './SageRemarks';
import type { FactorColor } from './FactorInheritance';

/** 批語面板用的色系中文名 */
export const FACTOR_COLOR_NAME: Readonly<Record<FactorColor, string>> = { blue: '藍', pink: '粉', green: '綠', purple: '紫', white: '白', red: '紅' };

/** 解鎖名士不足時左欄顯示的提示 */
export const SAGE_REMARK_LOCKED_TEXT = '名士批語：需先解鎖 2 位名士';

export interface SageRemarkColumns {
    left: SageRemark[];
    right: SageRemark[];
}

/** 依順序交替分到左、右欄（第 0、2… 在左；第 1、3… 在右） */
export function splitSageRemarkColumns(remarks: readonly SageRemark[]): SageRemarkColumns {
    const left: SageRemark[] = [];
    const right: SageRemark[] = [];
    remarks.forEach((remark, index) => (index % 2 === 0 ? left : right).push(remark));
    return { left, right };
}

/** 單句批語文字：「諸葛亮：藍（關鍵詞）」，沒有關鍵詞時只列色系 */
export function sageRemarkLineText(remark: SageRemark): string {
    const name = getSage(remark.sageId)?.name ?? remark.sageId;
    return `${name}：${FACTOR_COLOR_NAME[remark.color]}${remark.keyword ? `（${remark.keyword}）` : ''}`;
}

/** 一欄的文字：每句一行；空欄回傳空字串 */
export function sageRemarkColumnText(remarks: readonly SageRemark[]): string {
    return remarks.map(sageRemarkLineText).join('\n');
}

/** 底部求籤令入口的文字 */
export function oracleTokenText(count: number): string {
    const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    return `求籤令 ×${safe}`;
}
