// @spec-source → 總PM 11/21 手感審核（放招／跳字／buff 前三名）；PROG-2-9435
/**
 * StatusApplyFeedback — 狀態上身（BuffApplied）的演出規則，純資料、可單元測試。
 *
 * 以前狀態上身是「事件一到就飄字」：奧義施放時事件比漫畫分鏡早到，飄字整段被分鏡蓋住，
 * 分鏡收掉時字已經淡完，玩家看不出自己的奧義讓誰暈了；而且增益、減益一律播同一聲 buff。
 * 這裡決定三件事：
 *   1. 極性：控制（暈眩／定身）、減益（緩速／虛弱／封射）、增益（無敵／疾行／堅盾）。
 *   2. 控制與減益要讓目標「縮一下」（受擊動作），增益不縮。
 *   3. 同一次施放打到多個目標時，依離施放方的遠近錯開，像一道震波由近往遠掃過去。
 *
 * Unity 對照：像把 StatusEffect 的 ScriptableObject 加上 polarity 欄位，再由 Presenter 依 polarity 選演出。
 */
import { StatusEffect } from '../../shared/CommonEnums';
import { BURN_STATUS_ID } from './BurnStatus';
import { POISON_STATUS_ID } from './StatusEffectLabel';

export type StatusPolarity = 'control' | 'debuff' | 'buff';

const STATUS_POLARITY: Readonly<Record<StatusEffect, StatusPolarity>> = {
  [StatusEffect.Stun]: 'control',
  [StatusEffect.Rooted]: 'control',
  [StatusEffect.Slow]: 'debuff',
  [StatusEffect.Weak]: 'debuff',
  [StatusEffect.NoShoot]: 'debuff',
  [StatusEffect.Invincible]: 'buff',
  [StatusEffect.Haste]: 'buff',
  [StatusEffect.Fortified]: 'buff',
};

/** 狀態極性；未知狀態當增益（不讓目標縮、不播減益聲），寧可少演也不演錯 */
export function statusPolarityOf(effect: StatusEffect | string): StatusPolarity {
  if (effect === BURN_STATUS_ID || effect === POISON_STATUS_ID) return 'debuff'; // PROG-2-9726、9730
  return STATUS_POLARITY[effect as StatusEffect] ?? 'buff';
}

/** 狀態飄字樣式：增益金綠、減益橘紅、控制紫（PROG-2-9857） */
export function statusFloatTypeOf(polarity: StatusPolarity): 'status_buff' | 'status_debuff' | 'status_control' {
  return polarity === 'control' ? 'status_control' : polarity === 'debuff' ? 'status_debuff' : 'status_buff';
}

/** 控制與減益讓目標做受擊動作（縮一下）；增益不做 */
export function statusMakesTargetFlinch(polarity: StatusPolarity): boolean {
  return polarity !== 'buff';
}

/** 震波每往前一格多延遲的秒數 */
export const STATUS_WAVE_STEP_SEC = 0.05;
/** 震波最大延遲（8 格縱深約 0.35 秒），整段不拖慢回合 */
export const STATUS_WAVE_MAX_SEC = 0.35;

/**
 * 震波延遲：目標離施放方越遠越晚。
 * 減益／控制由對手施放（對手從另一側打過來）；增益由自己這一方施放（從自己這一側往前推）。
 * @param unitIsPlayer 目標是不是我方
 * @param depth 目標縱深（0 = 我方底線，maxDepth = 敵方底線）
 */
export function statusWaveDelaySec(polarity: StatusPolarity, unitIsPlayer: boolean, depth: number, maxDepth = 7): number {
  const d = Math.max(0, Math.min(maxDepth, depth));
  const casterIsPlayer = polarity === 'buff' ? unitIsPlayer : !unitIsPlayer;
  const cells = casterIsPlayer ? d : maxDepth - d;
  return Math.min(STATUS_WAVE_MAX_SEC, cells * STATUS_WAVE_STEP_SEC);
}

/**
 * 同一聲在這個視窗內只播一次：一招打到五個目標不要疊五聲變成噪音。
 * 呼叫端傳入現在時間（毫秒），回傳這次要不要播。
 */
export class StatusCueThrottle {
  private readonly lastPlayedMs = new Map<string, number>();
  constructor(private readonly windowMs = 120) {}

  shouldPlay(cue: string, nowMs: number): boolean {
    const last = this.lastPlayedMs.get(cue);
    if (last !== undefined && nowMs - last < this.windowMs) return false;
    this.lastPlayedMs.set(cue, nowMs);
    return true;
  }
}
