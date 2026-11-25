// @spec-source → 見 docs/cross-reference-index.md
import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { TroopType } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import { attackSfxFor } from './AttackSfxMapping';
import { SfxThrottle, parseSfxThrottleConfig } from './SfxThrottle';
import {
  BattleAudioLayersConfig, DEFAULT_BATTLE_AUDIO_LAYERS, DieBoomStagger, FootstepCapState,
  createFootstepCapState, footstepClipFor, footstepDelayMs, jitterFootstepVolume, parseBattleAudioLayersConfig, tryAcquireFootstep,
} from './BattleAudioLayers';


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
  /** 主將普攻依武器分開：刀、槍、劍、弓、法術 */
  generalAttackBlade: 'general-attack-blade',
  generalAttackSpear: 'general-attack-spear',
  generalAttackSword: 'general-attack-sword',
  generalAttackBow: 'general-attack-bow',
  generalAttackCast: 'general-attack-cast',
  unitMove: 'unit-move',
  unitDeploy: 'unit-deploy',
  unitDie: 'unit-die',
  unitHeal: 'unit-heal',
  buffGained: 'buff-gained',
  /** 吃到減益格（PROG-2-9411）；暫用 teleport，待專用音效 */
  debuffGained: 'debuff-gained',
  unitDodge: 'unit-dodge',
  critHit: 'crit-hit',
  fortressDamaged: 'fortress-damaged',
  shieldBlock: 'shield-block',
  /** 放招蓄力（PROG-2-9438）：0.4 秒蓄力開始時播 */
  skillCharge: 'skill-charge',
  /** 放招出手（PROG-2-9438）：蓄力結束、特效打出去那一刻播 */
  skillRelease: 'skill-release',
  turnPlayerStart: 'turn-player-start',
  turnEnemyStart: 'turn-enemy-start',
  battleVictory: 'battle-victory',
  battleDefeat: 'battle-defeat',
  /** 燃燒回合扣血 tick（PROG-2-9862）：火格與燃燒共用 */
  dotBurnTick: 'dot-burn-tick',
  /** 中毒回合扣血 tick（PROG-2-9862） */
  dotPoisonTick: 'dot-poison-tick',
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
  // PROG-2-9580：騎兵攻擊原本借 footstep，和移動腳步同檔，被統一音效閘門（按檔名節流）當重複吃掉，幾乎聽不到。
  // 現改用專屬馬蹄聲 hoof_gallop（CC-BY 3.0 Alan McKinney，署名見 audio/_MANIFEST.md）；要換只改下一行。
  [BATTLE_AUDIO_CUE.unitAttackPrimary]: 'hoof_gallop',
  [BATTLE_AUDIO_CUE.unitAttackThrust]: 'bite',
  [BATTLE_AUDIO_CUE.unitAttackShield]: 'shield',
  [BATTLE_AUDIO_CUE.unitAttackSecondary]: 'weapon',
  [BATTLE_AUDIO_CUE.unitAttackCommon]: 'weapon',
  [BATTLE_AUDIO_CUE.unitAttackBow]: 'feijian',
  [BATTLE_AUDIO_CUE.generalHitCommon]: 'hurt',
  [BATTLE_AUDIO_CUE.generalAttackCommon]: 'weapon',
  // 主將普攻分風格（現有音檔對應，未實機聽過）：刀=weapon、槍=bite、弓=feijian；劍暫借 weapon、法術暫借 skill2，待補專屬音檔
  [BATTLE_AUDIO_CUE.generalAttackBlade]: 'weapon',
  [BATTLE_AUDIO_CUE.generalAttackSpear]: 'bite',
  [BATTLE_AUDIO_CUE.generalAttackSword]: 'weapon',
  [BATTLE_AUDIO_CUE.generalAttackBow]: 'feijian',
  [BATTLE_AUDIO_CUE.generalAttackCast]: 'skill2',
  [BATTLE_AUDIO_CUE.unitMove]: 'footstep',
  [BATTLE_AUDIO_CUE.unitDeploy]: 'start',
  [BATTLE_AUDIO_CUE.unitDie]: 'die',
  [BATTLE_AUDIO_CUE.unitHeal]: 'heal',
  [BATTLE_AUDIO_CUE.buffGained]: 'buff',
  [BATTLE_AUDIO_CUE.debuffGained]: 'teleport',
  [BATTLE_AUDIO_CUE.unitDodge]: 'wave',
  [BATTLE_AUDIO_CUE.critHit]: 'boom',
  [BATTLE_AUDIO_CUE.fortressDamaged]: 'boom',
  [BATTLE_AUDIO_CUE.shieldBlock]: 'shield',
  // PROG-2-9438：依音量包絡挑選（未實機聽過）。skill1 由弱漸強、約 0.4 秒到頂，配 0.4 秒蓄力；
  // skill7 一開頭就最響，當出手重音。兩個檔原本都沒被戰場用到，不合適只改這兩行。
  [BATTLE_AUDIO_CUE.skillCharge]: 'skill1',
  [BATTLE_AUDIO_CUE.skillRelease]: 'skill7',
  [BATTLE_AUDIO_CUE.turnPlayerStart]: 'light',
  [BATTLE_AUDIO_CUE.turnEnemyStart]: 'thunder',
  [BATTLE_AUDIO_CUE.battleVictory]: 'skill0',
  [BATTLE_AUDIO_CUE.battleDefeat]: 'die',
  // PROG-2-9862：回合扣血 tick 借既有 clip（火類用 fireball、毒用 hurt 輕量版），未實機聽過，不合適只改這兩行
  [BATTLE_AUDIO_CUE.dotBurnTick]: 'fireball',
  [BATTLE_AUDIO_CUE.dotPoisonTick]: 'hurt',
};

/** 回合扣血 tick 音量（PROG-2-9862）：比命中音輕，免得每回合疊成噪音。 */
export const DOT_TICK_SFX = {
  burn: { cue: BATTLE_AUDIO_CUE.dotBurnTick, volume: 0.4 },
  poison: { cue: BATTLE_AUDIO_CUE.dotPoisonTick, volume: 0.3 },
} as const;

export interface DotTickSfx { cue: BattleAudioCue; volume: number }

/**
 * 回合扣血 tick 的專屬音（PROG-2-9862）：燃燒、火格、中毒、群體減益的持續傷害。
 * 不是 DOT 來源回傳 null，照舊走一般受擊音。
 */
export function resolveBattleDotTickSfx(damageSource?: string): DotTickSfx | null {
  if (damageSource === 'burn' || damageSource === 'hazard-fire') return DOT_TICK_SFX.burn;
  if (damageSource === 'poison' || damageSource === 'mass-debuff-dot') return DOT_TICK_SFX.poison;
  return null;
}

/**
 * 同一單位在視窗內只響一次 DOT tick（PROG-2-9862）：同一回合火格＋中毒同時扣血時不疊兩聲。
 * 呼叫端在事件到達的當下傳入時間（毫秒）。
 */
export class DotTickSfxThrottle {
  private readonly lastPlayedMs = new Map<string, number>();
  constructor(private readonly windowMs = 1000) {}

  shouldPlay(unitId: string, nowMs: number): boolean {
    const last = this.lastPlayedMs.get(unitId);
    if (last !== undefined && nowMs - last < this.windowMs) return false;
    this.lastPlayedMs.set(unitId, nowMs);
    return true;
  }

  reset(): void {
    this.lastPlayedMs.clear();
  }
}

/** 放招音效音量（PROG-2-9438）：蓄力壓低一點，出手重音略大，都不蓋過命中聲。 */
export const SKILL_CAST_SFX = {
  charge: { cue: BATTLE_AUDIO_CUE.skillCharge, volume: 0.7 },
  release: { cue: BATTLE_AUDIO_CUE.skillRelease, volume: 0.85 },
} as const;

export function resolveBattleUnitAttackSfxKey(unitType: TroopType): BattleAudioCue {
  return attackSfxFor(unitType);
}

export function resolveBattleUnitHitSfxKey(damageSource?: string): BattleAudioCue {
  return damageSource === 'night-raid-opening-strike'
    ? BATTLE_AUDIO_CUE.unitHitSecondary
    : BATTLE_AUDIO_CUE.unitHitCommon;
}

/** 主將普攻音效：依武器（刀／槍／劍／弓／法術）；未知或無武器回通用聲 */
export function resolveBattleGeneralAttackSfxKey(weapon?: string | null): BattleAudioCue {
  switch (weapon) {
    case 'blade': return BATTLE_AUDIO_CUE.generalAttackBlade;
    case 'spear': return BATTLE_AUDIO_CUE.generalAttackSpear;
    case 'sword': return BATTLE_AUDIO_CUE.generalAttackSword;
    case 'bow': return BATTLE_AUDIO_CUE.generalAttackBow;
    case 'cast': return BATTLE_AUDIO_CUE.generalAttackCast;
    default: return BATTLE_AUDIO_CUE.generalAttackCommon;
  }
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

  // PROG-2-9729：倒地聲與暴擊聲不同幀疊播，後到的延後 staggerMs
  if (cue === BATTLE_AUDIO_CUE.unitDie || cue === BATTLE_AUDIO_CUE.critHit) {
    ensureAudioLayersConfig();
    const wait = dieBoomStagger.delayFor(cue === BATTLE_AUDIO_CUE.unitDie ? 'die' : 'boom', nowMs());
    if (wait > 0) { setTimeout(() => playBattleClip(clipName, volume), wait); return; }
  }
  playBattleClip(clipName, volume);
}

/** 直接用 clip 名稱播（受擊分層、腳步變調版本用）；閘門與靜音規則同 playBattleAudio。 */
export function playBattleClip(clipName: string, volume = 1.0): void {
  // PROG-2-9439／9481：節流改在 AudioSystem 的統一閘門做，這裡只確保閘門已裝上，不再自己判斷（避免算兩次）
  // 音效系統未就緒或缺檔都靜音略過，不可丟例外（PROG-2-9357）
  try {
    installBattleSfxGate();
    services().audio.playSfx(clipName, volume);
  } catch { /* 靜音 */ }
}

/** 戰鬥音效分層設定（PROG-2-9729）；data/battle-audio-layers.json，讀到之前用預設。 */
export let battleAudioLayers: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS;
const dieBoomStagger = new DieBoomStagger();
const footstepCap: FootstepCapState = createFootstepCapState();
let layersConfigRequested = false;

export function ensureAudioLayersConfig(): void {
  if (layersConfigRequested) return;
  layersConfigRequested = true;
  try {
    services().resource.loadJson<unknown>('data/battle-audio-layers', { tags: ['battle'] })
      .then(raw => { battleAudioLayers = parseBattleAudioLayersConfig(raw); dieBoomStagger.setStaggerMs(battleAudioLayers.dieBoom.staggerMs); })
      .catch(() => { /* 讀不到用預設 */ });
  } catch { /* 資源系統未就緒：用預設 */ }
}

/**
 * 播一拍腳步（PROG-2-9729）：依兵種挑變調 clip、音量隨機、整體總量上限（所有兵種合計）。
 * 沒有兵種對應（水軍）就退回原本的 cue。回傳 true 表示有播（或已排程）。
 */
export function playBattleFootstep(troopType: string, fallbackCue: BattleAudioCue, baseVolume: number, nowMsValue: number = nowMs()): boolean {
  ensureAudioLayersConfig();
  if (!tryAcquireFootstep(footstepCap, nowMsValue, battleAudioLayers)) return false;
  const clip = footstepClipFor(troopType, battleAudioLayers);
  const volume = jitterFootstepVolume(baseVolume, battleAudioLayers);
  const delay = footstepDelayMs(battleAudioLayers);
  const play = (): void => { if (clip) playBattleClip(clip, volume); else playBattleAudio(fallbackCue, volume); };
  if (delay <= 1) play(); else setTimeout(play, delay);
  return true;
}

/**
 * 戰場統一音效閘門（PROG-2-9481）：特效、奧義演出、動作序列、戰鬥 cue 全部從 AudioSystem.playSfx 出去，
 * 都經過這個閘門，沒有旁路。
 */
export function battleSfxGate(clip: string): boolean {
  ensureSfxThrottleConfig();
  return battleSfxThrottle.allow(clip, nowMs());
}

/** 戰場開始時裝上閘門；重複呼叫不會重裝。音效系統未就緒就略過。 */
export function installBattleSfxGate(): void {
  try {
    const audio = services().audio;
    if (typeof audio?.setSfxGate !== 'function') return;
    if (audio.getSfxGate() !== battleSfxGate) audio.setSfxGate(battleSfxGate);
  } catch { /* 音效系統未就緒 */ }
}

/** 離開戰場時拆掉閘門並清空計數，其他場景回到內建 50ms 防重複。 */
export function uninstallBattleSfxGate(): void {
  try {
    const audio = services().audio;
    if (typeof audio?.getSfxGate === 'function' && audio.getSfxGate() === battleSfxGate) audio.setSfxGate(null);
  } catch { /* 音效系統未就緒 */ }
  battleSfxThrottle.reset();
  dieBoomStagger.reset();
}

/** 戰鬥音效節流（PROG-2-9439）；數值在 data/battle-audio.json，讀到之前用預設值。 */
export const battleSfxThrottle = new SfxThrottle();
let sfxThrottleConfigRequested = false;

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function ensureSfxThrottleConfig(): void {
  if (sfxThrottleConfigRequested) return;
  sfxThrottleConfigRequested = true;
  try {
    services().resource.loadJson<unknown>('data/battle-audio', { tags: ['battle'] })
      .then(raw => battleSfxThrottle.setConfig(parseSfxThrottleConfig(raw)))
      .catch(() => { /* 讀不到用預設 */ });
  } catch { /* 資源系統未就緒：用預設 */ }
}