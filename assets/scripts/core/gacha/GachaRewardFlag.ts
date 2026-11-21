// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12 轉蛋遷移；GCH-R4（PROG-2-9463）
/**
 * 轉蛋抽取走共通 API 的旗標（純函式，不依賴 cc）。
 *
 * 預設開（新路徑 reward.roll）；網址帶 ?gachaReward=0 就退回舊路徑（LocalGachaService）。
 * 大廳只讀網址參數（偏好值不另存）；stored 參數留給測試與日後的伺服器下發旗標。兩條路徑並行，確認穩定後再刪舊路徑。
 */
export const GACHA_REWARD_FLAG_KEY = '3k.gachaReward';

function parse(value: string | null | undefined): boolean | null {
    if (value === undefined || value === null) return null;
    if (value === '0' || value === 'false' || value === 'off') return false;
    if (value === '1' || value === 'true' || value === 'on') return true;
    return null;
}

/** search 是網址 query 字串（含或不含開頭問號）；stored 是本機存值 */
export function gachaRewardEnabled(search: string | null | undefined, stored?: string | null): boolean {
    const match = /(?:^|[?&])gachaReward=([^&]*)/.exec(search ?? '');
    const fromUrl = parse(match ? decodeURIComponent(match[1]) : null);
    if (fromUrl !== null) return fromUrl;
    return parse(stored) ?? true;
}
