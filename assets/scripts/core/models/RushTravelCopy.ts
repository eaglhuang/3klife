// @spec-source → 正式版劇本文案 §5 紅顏趕路、§6 商業化提示；WBS COPY-04（PROG-2-1269）
/**
 * RushTravelCopy — 紅顏趕路與商業化提示的文案配置（純資料，不依賴 cc）
 *
 * 四段文案：趕路、0.99 提示、29.99 提示、倒數提示。彈窗與提示只依 key 取字，不在畫面程式裡寫死文字。
 *
 * 暫定：文案先放在本檔常數表；cc 端改讀語系 JSON 待 i18n 卡接線。
 *
 * Unity 對照：像一張 ScriptableObject 文案表，畫面只持有 key，改文案不用改程式。
 */

export type RushTravelCopyKey = 'rushTravel' | 'promo099' | 'promo2999' | 'countdown';

export const RUSH_TRAVEL_COPY: Readonly<Record<RushTravelCopyKey, string>> = {
    rushTravel:
        '主公，妾身正在路上。\n\n若您願意等待，妾身終將抵達；若您不願等待，也可以讓相逢更早到來。\n\n只要一點盤纏，便能縮短這段旅途。',
    promo099: '只差一步，便能讓你的陣容更完整。',
    promo2999: '若要一次補齊文武核心，這是最直接的選擇。',
    countdown: '她正在趕來。請給她一點時間；若不想等待，也可以立即相見。',
};

/** 依 key 取文案；未知 key 退回趕路文案，不丟錯 */
export function rushTravelCopy(key: string): string {
    return Object.prototype.hasOwnProperty.call(RUSH_TRAVEL_COPY, key)
        ? RUSH_TRAVEL_COPY[key as RushTravelCopyKey]
        : RUSH_TRAVEL_COPY.rushTravel;
}
