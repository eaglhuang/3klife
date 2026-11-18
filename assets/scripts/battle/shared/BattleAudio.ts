// @spec-source → 見 docs/cross-reference-index.md
import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { TroopType } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import { attackSfxFor } from './AttackSfxMapping';


/**
 * 戰鬥音效邏輯鍵。
 *
 * 這一層只表達「戰鬥語意」，不直接綁實體檔名；實體 clip 名稱統一在下方映射。
 * 之後只要換掉對應 clip，就能整批替換同類戰鬥音效。
 */
export const BATTLE_AUDIO_CUE = {
  unitHitPrimary: 'unit-hit-primary',
  unitHitSecondary: 'unit-hit-secondary',
  unitHitCommon: 'unit-hit-common',
  unitAttackPrimary: 'unit-attack-primary',
  unitAttackSecondary: 'unit-attack-secondary',
  unitAttackCommon: 'unit-attack-common',
  unitAttackBow: 'unit-attack-bow',
  unitAttackThrust: 'unit-attack-thrust',
  unitAttackShield: 'unit-attack-shield',
  generalHitCommon: 'general-hit-common',
  generalAttackCommon: 'general-attack-common',
  unitMove: 'unit-move',
  unitDeploy: 'unit-deploy',
  unitDie: 'unit-die',
  unitHeal: 'unit-heal',
  buffGained: 'buff-gained',
  unitDodge: 'unit-dodge',
  critHit: 'crit-hit',
  fortressDamaged: 'fortress-damaged',
  shieldBlock: 'shield-block',
  turnPlayerStart: 'turn-player-start',
  turnEnemyStart: 'turn-enemy-start',
  battleVictory: 'battle-victory',
  battleDefeat: 'battle-defeat',
} as const;

export type BattleAudioCue = typeof BATTLE_AUDIO_CUE[keyof typeof BATTLE_AUDIO_CUE];

// 邏輯鍵 → 具體 AudioClip 名稱。
// 目前先以既有 audio bundle 的 clip 為主，未來若新增 hit/attack 變體，只要改這裡。
export const BATTLE_AUDIO_CLIP_MAP: Record<BattleAudioCue, string> = {
  [BATTLE_AUDIO_CUE.unitHitPrimary]: 'hurt',
  [BATTLE_AUDIO_CUE.unitHitSecondary]: 'thunder',
  [BATTLE_AUDIO_CUE.unitHitCommon]: 'hurt',
  // PROG-2-9357：騎兵／弓兵改用不同 clip；以下 clip 皆依檔名推測，未實機聽過，不合適只改這張表
  // PROG-2-9400：騎兵改用腳步類（馬蹄的最近似，待補專屬馬蹄衝撞聲）、槍兵突刺用 bite、盾兵盾擊用 shield（原本沒被使用）
  [BATTLE_AUDIO_CUE.unitAttackPrimary]: 'footstep',
  [BATTLE_AUDIO_CUE.unitAttackThrust]: 'bite',
  [BATTLE_AUDIO_CUE.unitAttackShield]: 'shield',
  [BATTLE_AUDIO_CUE.unitAttackSecondary]: 'weapon',
  [BATTLE_AUDIO_CUE.unitAttackCommon]: 'weapon',
  [BATTLE_AUDIO_CUE.unitAttackBow]: 'feijian',
  [BATTLE_AUDIO_CUE.generalHitCommon]: 'hurt',
  [BATTLE_AUDIO_CUE.generalAttackCommon]: 'weapon',
  [BATTLE_AUDIO_CUE.unitMove]: 'footstep',
  [BATTLE_AUDIO_CUE.unitDeploy]: 'start',
  [BATTLE_AUDIO_CUE.unitDie]: 'die',
  [BATTLE_AUDIO_CUE.unitHeal]: 'heal',
  [BATTLE_AUDIO_CUE.buffGained]: 'buff',
  [BATTLE_AUDIO_CUE.unitDodge]: 'wave',
  [BATTLE_AUDIO_CUE.critHit]: 'boom',
  [BATTLE_AUDIO_CUE.fortressDamaged]: 'boom',
  [BATTLE_AUDIO_CUE.shieldBlock]: 'shield',
  [BATTLE_AUDIO_CUE.turnPlayerStart]: 'light',
  [BATTLE_AUDIO_CUE.turnEnemyStart]: 'thunder',
  [BATTLE_AUDIO_CUE.battleVictory]: 'skill0',
  [BATTLE_AUDIO_CUE.battleDefeat]: 'die',
};

export function resolveBattleUnitAttackSfxKey(unitType: TroopType): BattleAudioCue {
  return attackSfxFor(unitType);
}

export function resolveBattleUnitHitSfxKey(damageSource?: string): BattleAudioCue {
  return damageSource === 'night-raid-opening-strike'
    ? BATTLE_AUDIO_CUE.unitHitSecondary
    : BATTLE_AUDIO_CUE.unitHitCommon;
}

export function resolveBattleGeneralAttackSfxKey(): BattleAudioCue {
  return BATTLE_AUDIO_CUE.generalAttackCommon;
}

export function resolveBattleGeneralHitSfxKey(): BattleAudioCue {
  return BATTLE_AUDIO_CUE.generalHitCommon;
}

export function playBattleAudio(cue: BattleAudioCue, volume = 1.0): void {
  const clipName = BATTLE_AUDIO_CLIP_MAP[cue];
  if (!clipName) {
    UCUFLogger.warn(LogCategory.LIFECYCLE, `[BattleAudio] 音效 cue 缺少 clip 對應 cue=${cue}`);
    return;
  }

  // 音效系統未就緒或缺檔都靜音略過，不可丟例外（PROG-2-9357）
  try { services().audio.playSfx(clipName, volume); } catch { /* 靜音 */ }
}