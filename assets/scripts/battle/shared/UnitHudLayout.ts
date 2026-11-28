/**
 * UnitHudLayout — 部隊頭頂 HUD 版面常數與畫面比例（PROG-2-10266，純資料，不依賴 cc，可單測）。
 *
 * 單行「兵種圓章＋兵數」，無底板。座標為名牌座標：原點＝HUD 中心；名牌節點再縮 hudScaleFor(畫面尺寸)。
 * 全部走相對比例（畫面基準 1920x1080，取較短邊比例），不寫死橫式；直式時等比縮小但不低於 0.7 倍。
 */
export const UNIT_HUD_W = 100;
export const UNIT_HUD_ROW_H = 32;
export const UNIT_HUD_ICON_D = 30;
export const UNIT_HUD_ICON_X = -35;
export const UNIT_HUD_NUM_X = 15;
export const UNIT_HUD_NUM_W = 62;
export const UNIT_HUD_FONT = 30;
export const UNIT_HUD_BASE_SCALE = 0.7;
/** 血條：數字列正下方的細條，受傷才顯示 */
export const UNIT_HP_BAR_W = 100;
export const UNIT_HP_BAR_H = 5;
export const UNIT_HP_BAR_Y = -(UNIT_HUD_ROW_H / 2 + 5);

/** 畫面基準 1920x1080；較短邊比例夾在 0.7～1.2，乘上基準縮放 */
export function hudScaleFor(rootW: number, rootH: number): number {
  if (!(rootW > 0) || !(rootH > 0)) return UNIT_HUD_BASE_SCALE;
  const k = Math.min(rootW / 1920, rootH / 1080);
  return UNIT_HUD_BASE_SCALE * Math.max(0.7, Math.min(1.2, k));
}
