// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-10134.md（戰場 BGM 三段）
/**
 * BattleBgm — 戰場背景音樂狀態機（PROG-2-10134）。不碰 cc，單元測試可直接跑；實際播放由 AudioSystem 經 BgmPort 注入。
 *
 * 三段：
 * 1. start  開戰：號角＋戰鼓前奏（不循環），淡入。
 * 2. tense  緊張：戰鼓循環，從開戰段尾端交叉淡入；開戰段約剩 tenseLeadSec 時切入。
 * 3. victory／defeat  戰場結束：交叉淡入勝利號角／敗北短曲（不循環）；平手則淡出。
 * 離開戰場（stop）立即停止並淡出。BGM 音量遠低於音效（預設 0.2～0.35 對音效 0.5～1.0），
 * 且遵守玩家在設定面板關閉音樂的偏好（由 AudioSystem 處理）。
 * 素材全部是 CC0（Freesound），見 assets/bundles/audio/clips/LICENSES-cc0.md。
 */

export type BgmPhase = 'idle' | 'start' | 'tense' | 'victory' | 'defeat';

export interface BattleBgmConfig {
  enabled: boolean;
  /** 各段使用的 clip 名稱 */
  clips: { start: string; tense: string; victory: string; defeat: string };
  /** 各段 BGM 音量 0~1 */
  volume: { start: number; tense: number; victory: number; defeat: number };
  /** 開戰段 clip 長度（秒），用來排程切到緊張段 */
  startLengthSec: number;
  /** 開戰段淡入秒數 */
  fadeInSec: number;
  /** 開戰→緊張、緊張→結果 的交叉淡入秒數 */
  crossfadeSec: number;
  /** 開戰段結束前多少秒開始切到緊張段 */
  tenseLeadSec: number;
  /** 離開戰場／平手時的淡出秒數 */
  stopFadeSec: number;
}

export const DEFAULT_BATTLE_BGM: BattleBgmConfig = {
  enabled: true,
  clips: { start: 'bgm_battle_start', tense: 'bgm_battle_tense', victory: 'bgm_battle_victory', defeat: 'bgm_battle_defeat' },
  volume: { start: 0.32, tense: 0.22, victory: 0.4, defeat: 0.32 },
  startLengthSec: 9,
  fadeInSec: 1.2,
  crossfadeSec: 1.5,
  tenseLeadSec: 1.5,
  stopFadeSec: 1.0,
};

function unit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback;
}
function pos(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}
function name(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** 讀設定（battle-audio-layers.json 的 bgm 區塊）；缺漏用預設，不丟例外。 */
export function parseBattleBgmConfig(raw: unknown): BattleBgmConfig {
  const d = DEFAULT_BATTLE_BGM;
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const c = (src.clips ?? {}) as Record<string, unknown>;
  const v = (src.volume ?? {}) as Record<string, unknown>;
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : d.enabled,
    clips: { start: name(c.start, d.clips.start), tense: name(c.tense, d.clips.tense), victory: name(c.victory, d.clips.victory), defeat: name(c.defeat, d.clips.defeat) },
    volume: { start: unit(v.start, d.volume.start), tense: unit(v.tense, d.volume.tense), victory: unit(v.victory, d.volume.victory), defeat: unit(v.defeat, d.volume.defeat) },
    startLengthSec: pos(src.startLengthSec, d.startLengthSec) || d.startLengthSec,
    fadeInSec: pos(src.fadeInSec, d.fadeInSec),
    crossfadeSec: pos(src.crossfadeSec, d.crossfadeSec),
    tenseLeadSec: pos(src.tenseLeadSec, d.tenseLeadSec),
    stopFadeSec: pos(src.stopFadeSec, d.stopFadeSec),
  };
}

export interface BgmPlayOptions { volume: number; fadeSec: number; loop: boolean }

/** 播放端口：由 AudioSystem 實作；測試用假物件。 */
export interface BgmPort {
  hasClip(name: string): boolean;
  /** 交叉淡入新曲（舊曲同時淡出）；從無聲開始時等同淡入 */
  crossfadeTo(clip: string, options: BgmPlayOptions): void;
  /** 淡出並停止 */
  fadeOut(sec: number): void;
  /** 立刻停止 */
  stop(): void;
}

export interface BgmTimerPort {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface BgmTransition { phase: BgmPhase; clip: string; volume: number; loop: boolean }

export class BattleBgmController {
  public phase: BgmPhase = 'idle';
  /** 轉場紀錄（debug／證據用） */
  public readonly transitions: BgmTransition[] = [];
  private timer: unknown = null;

  constructor(private readonly port: BgmPort, private readonly timers: BgmTimerPort, private getConfig: () => BattleBgmConfig) {}

  /** 戰場開始：播開戰段，排程切到緊張段。重複呼叫無效。 */
  public startBattle(): void {
    const cfg = this.getConfig();
    if (!cfg.enabled || this.phase !== 'idle') return;
    if (!this.enter('start', cfg.clips.start, cfg.volume.start, cfg.fadeInSec, false)) return;
    const waitMs = Math.max(0, cfg.startLengthSec - cfg.tenseLeadSec) * 1000;
    this.timer = this.timers.set(() => { this.timer = null; this.toTense(); }, waitMs);
  }

  private toTense(): void {
    if (this.phase !== 'start') return;
    const cfg = this.getConfig();
    this.enter('tense', cfg.clips.tense, cfg.volume.tense, cfg.crossfadeSec, true);
  }

  /** 戰場結束：勝利／敗北換結果曲，平手淡出。沒開始過（idle）不播。 */
  public setResult(result: 'player-win' | 'enemy-win' | 'draw' | string): void {
    const cfg = this.getConfig();
    if (!cfg.enabled || this.phase === 'idle' || this.phase === 'victory' || this.phase === 'defeat') return;
    this.clearTimer();
    if (result === 'player-win') this.enter('victory', cfg.clips.victory, cfg.volume.victory, cfg.crossfadeSec, false);
    else if (result === 'enemy-win') this.enter('defeat', cfg.clips.defeat, cfg.volume.defeat, cfg.crossfadeSec, false);
    else this.fadeOutAndIdle(cfg.stopFadeSec);
  }

  /** 離開戰場：停止。immediate 為 true 立刻停（場景銷毀），否則淡出。 */
  public stop(immediate = false): void {
    this.clearTimer();
    if (this.phase === 'idle') return;
    if (immediate) { this.port.stop(); this.phase = 'idle'; } else this.fadeOutAndIdle(this.getConfig().stopFadeSec);
  }

  private fadeOutAndIdle(sec: number): void {
    this.port.fadeOut(sec);
    this.phase = 'idle';
  }

  private enter(phase: BgmPhase, clip: string, volume: number, fadeSec: number, loop: boolean): boolean {
    if (!this.port.hasClip(clip)) return false; // 缺檔靜音略過，不崩
    this.port.crossfadeTo(clip, { volume, fadeSec, loop });
    this.phase = phase;
    this.transitions.push({ phase, clip, volume, loop });
    return true;
  }

  private clearTimer(): void {
    if (this.timer !== null) { this.timers.clear(this.timer); this.timer = null; }
  }
}
