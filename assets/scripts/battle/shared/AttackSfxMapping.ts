// PROG-2-9357：兵種 → 攻擊音效鍵。純函式、不依賴引擎，供單元測試；原本所有兵種都播同一個 weapon。
// PROG-2-9400：槍兵突刺、盾兵盾擊各用自己的聲音，與步兵劈砍分開。
import { TroopType } from '../../shared/CommonEnums';
import { attackStyleFor } from './AttackStyle';

/** 攻擊音效邏輯鍵（與 BattleAudio 的 BATTLE_AUDIO_CUE 同字串，實體 clip 由 BATTLE_AUDIO_CLIP_MAP 決定）。 */
export const ATTACK_SFX_KEY = {
  /** 劈砍（步兵、工兵、醫護、水軍）與未知兵種、武將的通用攻擊聲 */
  melee: 'unit-attack-common',
  /** 槍兵突刺 */
  thrust: 'unit-attack-thrust',
  /** 盾兵盾擊 */
  shield: 'unit-attack-shield',
  /** 弓兵放箭 */
  bow: 'unit-attack-bow',
  /** 騎兵衝鋒 */
  cavalry: 'unit-attack-primary',
} as const;

export type AttackSfxKey = typeof ATTACK_SFX_KEY[keyof typeof ATTACK_SFX_KEY];

/** 依兵種選攻擊聲；未知與空值一律回通用近戰聲，避免漏播。 */
export function attackSfxFor(troopType: TroopType | string | null | undefined): AttackSfxKey {
  switch (attackStyleFor(troopType)) {
    case 'thrust': return ATTACK_SFX_KEY.thrust;
    case 'shield': return ATTACK_SFX_KEY.shield;
    case 'bow': return ATTACK_SFX_KEY.bow;
    case 'charge': return ATTACK_SFX_KEY.cavalry;
    default: return ATTACK_SFX_KEY.melee;
  }
}
