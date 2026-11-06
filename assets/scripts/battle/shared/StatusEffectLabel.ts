/**
 * StatusEffectLabel — 戰場狀態效果的中文顯示名（主戰場UI規格書 §3.2 Buff/Debuff 飄字，PROG-2-1869）
 *
 * 用字沿用既有資料：暈眩、定身（RootSkillResolver）、緩速、虛弱、無敵、疾行、堅盾（CommonEnums 註解）。
 *
 * Unity 對照：StatusEffect enum 對應的 ScriptableObject displayName 表。
 */
import { StatusEffect } from '../../shared/CommonEnums';

export const STATUS_EFFECT_LABEL: Readonly<Record<StatusEffect, string>> = {
  [StatusEffect.Stun]: '暈眩',
  [StatusEffect.Rooted]: '定身',
  [StatusEffect.Slow]: '緩速',
  [StatusEffect.Weak]: '虛弱',
  [StatusEffect.Invincible]: '無敵',
  [StatusEffect.Haste]: '疾行',
  [StatusEffect.Fortified]: '堅盾',
};

/** 單位頭頂飄字；未知狀態回空字串（不飄） */
export function statusEffectFloatText(effect: StatusEffect | string): string {
  return STATUS_EFFECT_LABEL[effect as StatusEffect] ?? '';
}
