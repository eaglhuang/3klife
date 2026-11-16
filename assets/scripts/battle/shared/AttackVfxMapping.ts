// PROG-2-9353：兵種 → 攻擊特效種類。純函式、不依賴引擎，供單元測試。
export type AttackVfxKind = 'slash' | 'arrow';

/** 刀光用已有 prefab 且會被 prewarmVfxPools 預熱的 CFXR 斬擊方塊（PROG-2-9353：trail_slash_* 沒有 prefab，播不出來）。 */
export const ATTACK_SLASH_EFFECT_ID = 'p3d_cfxr_slash_ray';

/** 箭矢貼圖路徑（vfx_core bundle 內，對應登錄表 proj_arrow 的 texPath）。 */
export const ATTACK_ARROW_TEXTURE_PATH = 'textures/projectile/tex_proj_arrow';

export interface AttackVfx { kind: AttackVfxKind; effectId: string }

/** 弓兵（含連弩手，底兵種皆為 archer）射箭，其餘與未知兵種一律刀光，避免漏播。 */
export function attackVfxFor(troopType: string | null | undefined): AttackVfx {
  if (troopType === 'archer') return { kind: 'arrow', effectId: 'proj_arrow' };
  return { kind: 'slash', effectId: ATTACK_SLASH_EFFECT_ID };
}
