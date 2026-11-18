// PROG-2-9353：兵種 → 攻擊特效種類。純函式、不依賴引擎，供單元測試。
// PROG-2-9400：依兵種分開——槍兵直線刺光、盾兵衝擊圈、步兵弧形刀光、弓弩飛箭＋命中小爆、騎兵塵土加衝擊。
import { AttackStyle, attackStyleFor } from './AttackStyle';
import { ATTACK_SHOTS, AttackShotSpec } from './AttackShotStyle';

/** 特效種類：arrow 另走飛箭演出；其餘皆為畫面層閃光，貼圖沒載好時退回 effectId 的粒子刀光。 */
export type AttackVfxKind = 'slash' | 'arrow' | 'thrust' | 'bash' | 'charge';

/**
 * 刀光用已有 prefab 且會被 prewarmVfxPools 預熱的斬擊方塊（PROG-2-9353：trail_slash_* 沒有 prefab，播不出來）。
 * PROG-2-9361：原本用的 p3d_cfxr_slash_ray 粒子是拉伸模式但長度與速度倍率都是 0，等於沒有面積、線上看不到，改用設定正常的這一個。
 */
export const ATTACK_SLASH_EFFECT_ID = 'p3d_mep_charge_slash';

/** 箭矢貼圖路徑（vfx_core bundle 內，對應登錄表 proj_arrow 的 texPath）。 */
export const ATTACK_ARROW_TEXTURE_PATH = 'textures/projectile/tex_proj_arrow';

/**
 * 箭矢演出的大小與飛行時間（PROG-2-9364）。
 * 原本 64×16、0.25 秒：在 1920 寬的戰場上箭太小、飛太快，玩家幾乎看不到弓兵有射箭。
 * 飛箭只是畫面演出、流程不等它飛完，拉長飛行時間不會拖慢回合。
 */
export const ATTACK_ARROW_SHOT = { width: 96, height: 24, flightSec: 0.35 } as const;

export interface AttackVfx {
  kind: AttackVfxKind;
  /** 粒子特效 id：arrow 為箭矢；其餘為貼圖未就緒時的後備刀光。 */
  effectId: string;
  style: AttackStyle;
  /** 畫面層閃光清單（弓兵為命中小爆，箭矢本體不在內）。 */
  shots: readonly AttackShotSpec[];
}

const KIND_BY_STYLE: Readonly<Record<AttackStyle, AttackVfxKind>> = {
  thrust: 'thrust', shield: 'bash', slash: 'slash', bow: 'arrow', charge: 'charge', generic: 'slash',
};

/** 依兵種選特效；弓兵（含連弩手，底兵種皆為 archer）射箭，未知兵種與武將回通用刀光，避免漏播。 */
export function attackVfxFor(troopType: string | null | undefined): AttackVfx {
  const style = attackStyleFor(troopType);
  const kind = KIND_BY_STYLE[style];
  return { kind, effectId: kind === 'arrow' ? 'proj_arrow' : ATTACK_SLASH_EFFECT_ID, style, shots: ATTACK_SHOTS[style] };
}
