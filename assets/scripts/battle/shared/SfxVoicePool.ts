// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-10134.md（戰場音訊：音效池與同時發聲上限）
/**
 * SfxVoicePool — 戰場音效「發聲池」（PROG-2-10134）。不碰 cc，單元測試可直接跑。
 *
 * 大量小兵混戰時，每個攻擊、受擊都想出聲，全播會爆音、全部丟給引擎也會每次配置物件。這裡用固定大小、
 * 預先配置好的發聲槽（voice slot）管理：
 * 1. 同時發聲數有上限（maxVoices）。槽的結束時間＝播放時間＋clip 長度，到期自動釋放並重用，不產生新物件。
 * 2. 優先級：致命／重擊／擋下 > 一般受擊／放招 > 攻擊出手 > 腳步。槽滿時，高優先級可搶走最低優先級的槽，
 *    同級或低級直接丟棄——所以「受擊優先於揮空」。攻擊出手另外不能佔用最後 attackReserve 個槽（留給受擊）。
 * 3. 各類別每秒上限（perSecond）。
 * 4. 人多自動降音量：目前發聲數越多，新聲音音量越小（duck），混戰不再疊成一坨。
 * 5. 計數（stats）：每類別 requested／played／dropped／stolen 與各 clip 播放次數，給畫面驗證與 debug 用。
 * 時間由呼叫端傳入（毫秒）。
 */

export type SfxCategory = 'hit-heavy' | 'hit' | 'cast' | 'attack' | 'footstep' | 'other';

export const SFX_CATEGORIES: readonly SfxCategory[] = ['hit-heavy', 'hit', 'cast', 'attack', 'footstep', 'other'];

const PRIORITY: Record<SfxCategory, number> = { 'hit-heavy': 3, hit: 2, cast: 2, attack: 1, footstep: 0, other: 2 };

export interface SfxVoicePoolConfig {
  /** 同時發聲上限（受池管理的類別合計） */
  maxVoices: number;
  /** 攻擊出手不能佔用的保留槽數（留給受擊） */
  attackReserve: number;
  /** 不受發聲槽限制的類別（腳步有自己的節流；other 是 UI／提示等重要音） */
  voiceExempt: SfxCategory[];
  /** 各類別每秒上限；沒列＝不限 */
  perSecond: Partial<Record<SfxCategory, number>>;
  /** 沒登記長度的 clip 預設占槽毫秒數 */
  defaultDurationMs: number;
  /** clip → 占槽毫秒數 */
  clipDurationMs: Record<string, number>;
  /** 人多降音量：每個進行中發聲降低 perVoice，最低到 minScale */
  duck: { perVoice: number; minScale: number };
}

export const DEFAULT_SFX_VOICE_POOL: SfxVoicePoolConfig = {
  maxVoices: 8,
  attackReserve: 3,
  voiceExempt: ['footstep', 'other'],
  perSecond: { attack: 5, hit: 7 },
  defaultDurationMs: 450,
  clipDurationMs: {
    sfx_atk_blade: 420, sfx_atk_thrust: 400, sfx_atk_bow: 480, sfx_atk_arrow_whoosh: 500, sfx_atk_shield: 400, sfx_atk_charge: 550,
    sfx_hit_blade: 400, sfx_hit_pierce: 350, sfx_hit_arrow: 300, sfx_hit_clash: 450, sfx_hit_wood: 400, sfx_hit_body_a: 450, sfx_hit_body_b: 450,
  },
  duck: { perVoice: 0.06, minScale: 0.6 },
};

export interface SfxCategoryStats { requested: number; played: number; dropped: number; stolen: number }

export interface SfxAcquireResult {
  ok: boolean;
  /** 人多降音量後的倍率（0~1）；不能播時為 0 */
  volumeScale: number;
  reason: 'ok' | 'stolen' | 'voices-full' | 'attack-reserve' | 'per-second';
}

function nonNeg(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** 讀設定（battle-audio-layers.json 的 pool 區塊）；缺漏用預設，不丟例外。 */
export function parseSfxVoicePoolConfig(raw: unknown): SfxVoicePoolConfig {
  const d = DEFAULT_SFX_VOICE_POOL;
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const perSecond: Partial<Record<SfxCategory, number>> = { ...d.perSecond };
  if (src.perSecond && typeof src.perSecond === 'object') {
    for (const c of SFX_CATEGORIES) if (typeof src.perSecond[c] === 'number' && src.perSecond[c] >= 0) perSecond[c] = src.perSecond[c];
  }
  const clipDurationMs: Record<string, number> = { ...d.clipDurationMs };
  if (src.clipDurationMs && typeof src.clipDurationMs === 'object') {
    for (const [k, v] of Object.entries(src.clipDurationMs as Record<string, unknown>)) if (typeof v === 'number' && v > 0) clipDurationMs[k] = v;
  }
  const exempt = Array.isArray(src.voiceExempt)
    ? src.voiceExempt.filter((c: unknown): c is SfxCategory => SFX_CATEGORIES.includes(c as SfxCategory))
    : d.voiceExempt;
  return {
    maxVoices: Math.max(1, Math.floor(nonNeg(src.maxVoices, d.maxVoices))),
    attackReserve: Math.floor(nonNeg(src.attackReserve, d.attackReserve)),
    voiceExempt: exempt,
    perSecond,
    defaultDurationMs: nonNeg(src.defaultDurationMs, d.defaultDurationMs) || d.defaultDurationMs,
    clipDurationMs,
    duck: {
      perVoice: Math.min(0.5, nonNeg(src.duck?.perVoice, d.duck.perVoice)),
      minScale: Math.min(1, nonNeg(src.duck?.minScale, d.duck.minScale)),
    },
  };
}

const RING = 32; // 每秒上限環形緩衝長度，需 >= 任何類別的 perSecond

export class SfxVoicePool {
  private cfg: SfxVoicePoolConfig;
  private endMs: Float64Array;
  private prio: Int8Array;
  /** 各類別最近一秒的播放時間（環形緩衝，預先配置） */
  private readonly ring: Record<SfxCategory, Float64Array>;
  private readonly ringHead: Record<SfxCategory, number>;
  public readonly stats: Record<SfxCategory, SfxCategoryStats>;
  /** 各 clip 實際播放次數（debug／證據用） */
  public readonly clipPlayed: Record<string, number> = {};
  /** 同時發聲數的歷史最大值（證據：節流後上限） */
  public peakVoices = 0;

  constructor(cfg: SfxVoicePoolConfig = DEFAULT_SFX_VOICE_POOL) {
    this.cfg = cfg;
    this.endMs = new Float64Array(cfg.maxVoices);
    this.prio = new Int8Array(cfg.maxVoices);
    this.ring = {} as Record<SfxCategory, Float64Array>;
    this.ringHead = {} as Record<SfxCategory, number>;
    this.stats = {} as Record<SfxCategory, SfxCategoryStats>;
    for (const c of SFX_CATEGORIES) {
      this.ring[c] = new Float64Array(RING).fill(Number.NEGATIVE_INFINITY);
      this.ringHead[c] = 0;
      this.stats[c] = { requested: 0, played: 0, dropped: 0, stolen: 0 };
    }
  }

  public setConfig(cfg: SfxVoicePoolConfig): void {
    this.cfg = cfg;
    if (this.endMs.length !== cfg.maxVoices) { this.endMs = new Float64Array(cfg.maxVoices); this.prio = new Int8Array(cfg.maxVoices); }
  }

  public getConfig(): SfxVoicePoolConfig { return this.cfg; }

  /** 目前進行中的發聲數 */
  public activeVoices(nowMs: number): number {
    let n = 0;
    for (let i = 0; i < this.endMs.length; i++) if (this.endMs[i] > nowMs) n++;
    return n;
  }

  /** 要播一個聲音：回傳能不能播與音量倍率；能播就占一個槽（到期自動釋放）。 */
  public acquire(category: SfxCategory, clip: string, nowMs: number): SfxAcquireResult {
    const st = this.stats[category];
    st.requested++;
    const cfg = this.cfg;
    const cap = cfg.perSecond[category];
    if (cap !== undefined) {
      const ring = this.ring[category];
      let used = 0;
      for (let i = 0; i < RING; i++) if (nowMs - ring[i] < 1000 && nowMs >= ring[i]) used++;
      if (used >= Math.min(cap, RING)) { st.dropped++; return { ok: false, volumeScale: 0, reason: 'per-second' }; }
    }

    let reason: SfxAcquireResult['reason'] = 'ok';
    let volumeScale = 1;
    if (!cfg.voiceExempt.includes(category)) {
      const p = PRIORITY[category];
      let free = -1, freeCount = 0, lowest = -1;
      for (let i = 0; i < this.endMs.length; i++) {
        if (this.endMs[i] <= nowMs) { if (free < 0) free = i; freeCount++; }
        else if (lowest < 0 || this.prio[i] < this.prio[lowest] || (this.prio[i] === this.prio[lowest] && this.endMs[i] < this.endMs[lowest])) lowest = i;
      }
      let slot = free;
      if (category === 'attack' && freeCount <= cfg.attackReserve) { st.dropped++; return { ok: false, volumeScale: 0, reason: 'attack-reserve' }; }
      if (slot < 0) {
        if (lowest >= 0 && this.prio[lowest] < p) { slot = lowest; reason = 'stolen'; st.stolen++; }
        else { st.dropped++; return { ok: false, volumeScale: 0, reason: 'voices-full' }; }
      }
      const dur = cfg.clipDurationMs[clip] ?? cfg.defaultDurationMs;
      this.endMs[slot] = nowMs + dur;
      this.prio[slot] = p;
      const active = this.activeVoices(nowMs);
      if (active > this.peakVoices) this.peakVoices = active;
      volumeScale = Math.max(cfg.duck.minScale, 1 - cfg.duck.perVoice * (active - 1));
    }
    if (cap !== undefined) {
      const ring = this.ring[category];
      ring[this.ringHead[category]] = nowMs;
      this.ringHead[category] = (this.ringHead[category] + 1) % RING;
    }
    st.played++;
    this.clipPlayed[clip] = (this.clipPlayed[clip] ?? 0) + 1;
    return { ok: true, volumeScale, reason };
  }

  public resetStats(): void {
    for (const c of SFX_CATEGORIES) this.stats[c] = { requested: 0, played: 0, dropped: 0, stolen: 0 };
    for (const k of Object.keys(this.clipPlayed)) delete this.clipPlayed[k];
    this.peakVoices = 0;
  }

  /** 清空槽與環形緩衝（離開戰場時；不清計數，證據要留到下次 reset） */
  public clear(): void {
    this.endMs.fill(0);
    this.prio.fill(0);
    for (const c of SFX_CATEGORIES) { this.ring[c].fill(Number.NEGATIVE_INFINITY); this.ringHead[c] = 0; }
  }
}
