// @spec-source → 總PM 11/21 手感審核（受擊／音效清單：格擋沒接線）；PROG-2-9437
/**
 * BlockFeedback — 傷害被擋下（護盾吸收、無敵、敗逃無敵）時的演出規則，純資料、可單元測試。
 *
 * 以前：護盾把傷害整個吃掉時，畫面照樣飄「-N」紅字，玩家以為扣血了；
 * 無敵或敗逃無敵時結算直接略過、不發任何事件，攻擊方揮空也沒聲音沒字，看起來像當機。
 * 現在：
 *   - 跳字只顯示真的扣掉的生命；護盾吸收的部分另飄「格擋」並播盾擊聲。
 *   - 無敵擋下飄「無敵」、敗逃無敵飄「免戰」，都播盾擊聲。
 *
 * Unity 對照：像 DamageResult 加上 absorbed 欄位，由 HitPresenter 依結果選演出。
 */

/** 傷害被整個擋下的原因 */
export type DamageBlockReason = 'invincible' | 'flee-immune';

/** 擋下時飄的字 */
export const BLOCK_FLOAT_TEXT: Readonly<Record<DamageBlockReason | 'shield', string>> = {
  shield: '格擋',
  invincible: '無敵',
  'flee-immune': '免戰',
};

export interface ShieldHitFeedback {
  /** 真的扣掉的生命（跳字顯示這個；0 不飄數字） */
  hpLoss: number;
  /** 要不要播盾擊聲、飄「格擋」 */
  blocked: boolean;
}

/**
 * 一次命中裡護盾吃掉多少、生命掉多少。
 * @param damage 結算傷害（含護盾吸收的部分）
 * @param shieldAbsorbed 護盾吸收量；舊事件沒帶這個欄位時當 0
 */
export function shieldHitFeedback(damage: number, shieldAbsorbed: number | undefined): ShieldHitFeedback {
  const total = Math.max(0, damage);
  const absorbed = Math.max(0, Math.min(total, shieldAbsorbed ?? 0));
  return { hpLoss: total - absorbed, blocked: absorbed > 0 };
}
