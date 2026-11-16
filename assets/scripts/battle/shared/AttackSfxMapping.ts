// PROG-2-9357：兵種 → 攻擊音效鍵。純函式、不依賴引擎，供單元測試；原本所有兵種都播同一個 weapon。
import { TroopType } from '../../shared/CommonEnums';

/** 攻擊音效邏輯鍵（與 BattleAudio 的 BATTLE_AUDIO_CUE 同字串，實體 clip 由 BATTLE_AUDIO_CLIP_MAP 決定）。 */
export const ATTACK_SFX_KEY = {
  /** 近戰（步兵、盾兵、槍兵、工兵、醫護、水軍）與未知兵種的通用攻擊聲 */
  melee: 'unit-attack-common',
  /** 弓兵放箭 */
  bow: 'unit-attack-bow',
  /** 騎兵衝鋒 */
  cavalry: 'unit-attack-primary',
} as const;

export type AttackSfxKey = typeof ATTACK_SFX_KEY[keyof typeof ATTACK_SFX_KEY];

/** 弓兵放箭、騎兵衝鋒，其餘與未知兵種一律回通用近戰聲，避免漏播。 */
export function attackSfxFor(troopType: TroopType | string | null | undefined): AttackSfxKey {
  if (troopType === TroopType.Archer) return ATTACK_SFX_KEY.bow;
  if (troopType === TroopType.Cavalry) return ATTACK_SFX_KEY.cavalry;
  return ATTACK_SFX_KEY.melee;
}
