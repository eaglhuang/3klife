// PROG-2-9367：近戰刀光的外觀設定與每一刻的姿態。純資料與純函式、不依賴引擎，供單元測試。
// 以前刀光走粒子特效（p3d_mep_charge_slash），看起來是一團光不像一刀；刀光貼圖又沒有 prefab、進不了特效池。
// 改成和飛箭一樣在畫面層直接畫一張月牙貼圖：一閃即逝、朝著被打的那一邊掃過去。

/** 刀光演出設定。貼圖路徑在 vfx_core bundle 內；artBulgeDeg 是貼圖裡月牙鼓起那一側的方向（度，0 為右）。 */
export const ATTACK_SLASH_SHOT = {
  texturePath: 'textures/shapes/mep_shape_slash',
  size: 132,
  durationSec: 0.24,
  startScale: 0.7,
  endScale: 1.2,
  /** 揮動幅度：整段演出繞中心轉過的角度（度），讓刀光有「掃過去」的感覺。 */
  sweepDeg: 50,
  artBulgeDeg: 180,
  color: { r: 255, g: 244, b: 214 },
} as const;

export interface SlashPose { angle: number; scale: number; opacity: number }

/**
 * 刀光在進度 t（0～1）時的角度、大小與透明度。
 * @param dirDeg 攻擊者指向目標的方向（度）
 */
export function slashPoseAt(t: number, dirDeg: number, config: typeof ATTACK_SLASH_SHOT = ATTACK_SLASH_SHOT): SlashPose {
  const p = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));
  const eased = 1 - (1 - p) * (1 - p); // 先快後慢
  return {
    // 月牙鼓起的一側朝向目標，再從 -半幅 掃到 +半幅
    angle: dirDeg - config.artBulgeDeg + (eased - 0.5) * config.sweepDeg,
    scale: config.startScale + (config.endScale - config.startScale) * eased,
    // 前 35% 全亮，之後淡出到 0
    opacity: p < 0.35 ? 255 : Math.round(255 * (1 - (p - 0.35) / 0.65)),
  };
}
