// PROG-2-9400：兵種 → 普攻風格。純函式、不依賴引擎，供單元測試。
// 動畫、特效、音效三處都看這一份分類，避免各自寫一套兵種判斷。
import { ActionClip } from './UnitPresentationCore';

/** 普攻風格：槍兵突刺、盾兵盾擊、步兵劈砍、弓弩射箭、騎兵衝撞；generic 為武將與未知兵種，維持原本的通用演出。 */
export type AttackStyle = 'thrust' | 'shield' | 'slash' | 'bow' | 'charge' | 'generic';

/**
 * 兵種（TroopType 字串值）對應風格。
 * 工兵、醫護、水軍的素材動作本來就是下劈，歸劈砍；連弩手底兵種為 archer，歸射箭；
 * 精銳（大戟士、陷陣營）以底兵種判斷。武將（'general'）與未知兵種回 generic。
 */
export function attackStyleFor(troopType: string | null | undefined): AttackStyle {
  switch (troopType) {
    case 'pikeman': return 'thrust';
    case 'shield': return 'shield';
    case 'infantry':
    case 'engineer':
    case 'medic':
    case 'navy': return 'slash';
    case 'archer': return 'bow';
    case 'cavalry': return 'charge';
    default: return 'generic';
  }
}

/**
 * 各風格優先播的 Spine 分動作名（小兵共用骨架內的動作）。
 * generic 為 null，沿用設定檔的通用攻擊動作；騎兵暫用槍兵素材，所以同槍兵的突刺（持槍衝撞）。
 */
export const ATTACK_SPINE_CLIP: Readonly<Record<AttackStyle, string | null>> = {
  thrust: 'attack_spear',
  shield: 'attack_shield',
  slash: 'attack_slash',
  bow: 'attack_bow',
  charge: 'attack_spear',
  generic: null,
};

/**
 * 決定這次攻擊要播的動作片段：該風格的分動作存在就用它（時長沿用通用攻擊的長度，
 * 才不會因分動作長度不同而改變回合節奏），缺動作或沒有指定時退回通用攻擊動作。
 */
export function pickAttackClip(style: AttackStyle, generic: ActionClip, hasAnimation: (name: string) => boolean): ActionClip {
  const name = ATTACK_SPINE_CLIP[style];
  if (name && hasAnimation(name)) return { name, loop: false, duration: generic.duration };
  return generic;
}
