// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9439.md（戰鬥音效疊音節流）
/**
 * SfxThrottle — 戰鬥音效節流（PROG-2-9439）。
 *
 * 問題：三隊同時前進時腳步聲會在同一毫秒播三份，一回合播 50～75 次，音量暴衝又發糊。
 * 規則（數值放 data/battle-audio.json，讀不到用預設）：
 * 1. 同一個 clip 在 sameClipWindowMs 內只播一次（同時多份合成一份）。
 * 2. 單一 clip 每秒上限（perClipMaxPerSecond，只列需要限的 clip，例如 footstep）。
 * 3. 全部音效每秒上限（maxPerSecond）；exemptClips 列出的 clip（勝敗、回合開始等重要提示）不受 2、3 限制。
 * 純狀態，時間由呼叫端傳入，方便測試。
 *
 * Unity 對照：AudioManager 裡的 voice limiting（同一 AudioClip 的最小間隔＋同時發聲數上限）。
 */

export interface SfxThrottleConfig {
  sameClipWindowMs: number;
  maxPerSecond: number;
  perClipMaxPerSecond: Record<string, number>;
  exemptClips: string[];
}

export const DEFAULT_SFX_THROTTLE: SfxThrottleConfig = {
  sameClipWindowMs: 60,
  maxPerSecond: 16,
  perClipMaxPerSecond: { footstep: 6 },
  exemptClips: [],
};

function finiteNonNegative(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** 讀設定檔內容；欄位缺漏或格式不對就用預設值，不丟例外。 */
export function parseSfxThrottleConfig(raw: unknown): SfxThrottleConfig {
  const src = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).sfxThrottle : null) as Record<string, unknown> | null;
  if (!src || typeof src !== 'object') return { ...DEFAULT_SFX_THROTTLE, perClipMaxPerSecond: { ...DEFAULT_SFX_THROTTLE.perClipMaxPerSecond } };
  const perClip: Record<string, number> = {};
  const rawPer = src.perClipMaxPerSecond;
  if (rawPer && typeof rawPer === 'object') {
    for (const [clip, n] of Object.entries(rawPer as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) perClip[clip] = n;
    }
  } else {
    Object.assign(perClip, DEFAULT_SFX_THROTTLE.perClipMaxPerSecond);
  }
  const exempt = Array.isArray(src.exemptClips) ? src.exemptClips.filter((c): c is string => typeof c === 'string') : [];
  return {
    sameClipWindowMs: finiteNonNegative(src.sameClipWindowMs, DEFAULT_SFX_THROTTLE.sameClipWindowMs),
    maxPerSecond: finiteNonNegative(src.maxPerSecond, DEFAULT_SFX_THROTTLE.maxPerSecond),
    perClipMaxPerSecond: perClip,
    exemptClips: exempt,
  };
}

export class SfxThrottle {
  private readonly lastByClip = new Map<string, number>();
  private readonly recentByClip = new Map<string, number[]>();
  private recentAll: number[] = [];

  constructor(private config: SfxThrottleConfig = DEFAULT_SFX_THROTTLE) {}

  public setConfig(config: SfxThrottleConfig): void { this.config = config; }

  /** 這次可以播嗎？可以就記一筆並回傳 true。 */
  public allow(clip: string, nowMs: number): boolean {
    const cfg = this.config;
    const last = this.lastByClip.get(clip);
    if (last !== undefined && nowMs - last >= 0 && nowMs - last < cfg.sameClipWindowMs) return false;

    const exempt = cfg.exemptClips.includes(clip);
    const since = nowMs - 1000;
    const clipRecent = (this.recentByClip.get(clip) ?? []).filter(t => t > since);
    this.recentAll = this.recentAll.filter(t => t > since);
    if (!exempt) {
      const clipCap = cfg.perClipMaxPerSecond[clip];
      if (clipCap !== undefined && clipRecent.length >= clipCap) { this.recentByClip.set(clip, clipRecent); return false; }
      if (this.recentAll.length >= cfg.maxPerSecond) { this.recentByClip.set(clip, clipRecent); return false; }
    }
    clipRecent.push(nowMs);
    this.recentByClip.set(clip, clipRecent);
    this.recentAll.push(nowMs);
    this.lastByClip.set(clip, nowMs);
    return true;
  }

  public reset(): void {
    this.lastByClip.clear();
    this.recentByClip.clear();
    this.recentAll = [];
  }
}
