// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-10239 戰場打擊感（命中頓格、鏡頭震動、跳字彈出）
/**
 * BattleJuice — 戰場打擊感參數與純計算（不依賴 cc 引擎，可直接單元測試）。
 *
 * 全部只是「表現層」：頓格只停骨架動畫、鏡頭震動只動攝影機節點、跳字只改縮放，
 * 不碰戰鬥結算、回合邏輯與格子位置資料。
 * 每一項都有 enabled 開關；關閉時回傳與舊版完全相同的數值（見 LEGACY_*），行為不變。
 * 參數在 data/battle-juice.json，讀不到或欄位錯誤時用預設值。
 * 受擊閃白曲線仍在 data/battle-hit-feedback.json（PROG-2-9483），這裡不重複。
 */

export type HitKind = 'normal' | 'crit' | 'ultimate';
export type ShakeTierName = 'light' | 'medium' | 'heavy';
export type HitStopScope = 'pair' | 'all';

export interface ShakeTier {
  /** 振幅（世界單位；一格約 1.0）。 */
  strength: number;
  /** 總秒數。 */
  durationSec: number;
  /** 震動頻率（Hz）。 */
  frequencyHz: number;
}

export interface BattleJuiceConfig {
  hitStop: {
    enabled: boolean;
    normalSec: number;
    critSec: number;
    ultimateSec: number;
    /** 單次頓格上限，避免設定檔寫錯讓畫面卡死。 */
    maxSec: number;
    /** pair：只停攻守雙方；all：整個戰場骨架動畫（受 minGapSec 限流）。 */
    scope: HitStopScope;
    /** scope=all 時，兩次全場頓格之間的最短間隔（秒），避免亂戰時一直卡。 */
    minGapSec: number;
    /** 奧義發動後，這段時間內的命中都算奧義命中（秒）。 */
    ultimateWindowSec: number;
  };
  cameraShake: {
    enabled: boolean;
    /** 衰減次方：1 線性、2 前段強後段快速收斂。 */
    decayPower: number;
    tiers: Record<ShakeTierName, ShakeTier>;
    /** 命中種類對應的震動等級；null 表示不震。 */
    heavy: ShakeTierName | null;
    crit: ShakeTierName | null;
    ultimate: ShakeTierName | null;
  };
  knockback: { enabled: boolean; ratioMul: number };
  floatPop: {
    enabled: boolean;
    /** 一般傷害字彈出峰值倍率（乘在樣式表的 peakScale 上）。 */
    normalPeakMul: number;
    heavyPeakMul: number;
    critPeakMul: number;
    /** 彈出秒數倍率（<1 更快）。 */
    popInMul: number;
  };
}

/** 舊版固定值（開關關閉時使用；與 BATTLE_VISUAL_TIMING 同值）。 */
export const LEGACY_HIT_STOP_SEC = 0.06;
export const LEGACY_SHAKE: ShakeTier = { strength: 0.05, durationSec: 0.12, frequencyHz: 16 };

export const DEFAULT_BATTLE_JUICE: BattleJuiceConfig = {
  hitStop: { enabled: true, normalSec: 0.05, critSec: 0.08, ultimateSec: 0.12, maxSec: 0.2, scope: 'pair', minGapSec: 0.35, ultimateWindowSec: 4 },
  cameraShake: {
    enabled: true,
    decayPower: 2,
    tiers: {
      light: { strength: 0.035, durationSec: 0.12, frequencyHz: 22 },
      medium: { strength: 0.07, durationSec: 0.18, frequencyHz: 20 },
      heavy: { strength: 0.12, durationSec: 0.28, frequencyHz: 17 },
    },
    heavy: 'light',
    crit: 'medium',
    ultimate: 'heavy',
  },
  knockback: { enabled: true, ratioMul: 1 },
  floatPop: { enabled: true, normalPeakMul: 1.1, heavyPeakMul: 1.1, critPeakMul: 1.15, popInMul: 1 },
};

let activeJuice: BattleJuiceConfig = DEFAULT_BATTLE_JUICE;
export function getBattleJuice(): BattleJuiceConfig { return activeJuice; }
export function setBattleJuice(cfg: BattleJuiceConfig): void { activeJuice = cfg; }

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, fb: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fb);
const bool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb);
const TIER_NAMES: ReadonlyArray<string> = ['light', 'medium', 'heavy'];
const tierRef = (v: unknown, fb: ShakeTierName | null): ShakeTierName | null => {
  if (v === null) return null;
  return typeof v === 'string' && TIER_NAMES.includes(v) ? (v as ShakeTierName) : fb;
};

/** 讀 data/battle-juice.json；缺漏或格式錯誤的欄位逐項用預設值，不丟例外。 */
export function parseBattleJuice(raw: unknown): BattleJuiceConfig {
  const d = DEFAULT_BATTLE_JUICE;
  const src = isRec(raw) ? raw : {};
  const hs = isRec(src.hitStop) ? src.hitStop : {};
  const cs = isRec(src.cameraShake) ? src.cameraShake : {};
  const tiersRaw = isRec(cs.tiers) ? cs.tiers : {};
  const tier = (name: ShakeTierName): ShakeTier => {
    const t = isRec(tiersRaw[name]) ? tiersRaw[name] as Rec : {};
    const f = d.cameraShake.tiers[name];
    return { strength: num(t.strength, 0, 2, f.strength), durationSec: num(t.durationSec, 0.02, 2, f.durationSec), frequencyHz: num(t.frequencyHz, 1, 60, f.frequencyHz) };
  };
  const kb = isRec(src.knockback) ? src.knockback : {};
  const fp = isRec(src.floatPop) ? src.floatPop : {};
  return {
    hitStop: {
      enabled: bool(hs.enabled, d.hitStop.enabled),
      normalSec: num(hs.normalSec, 0, 1, d.hitStop.normalSec),
      critSec: num(hs.critSec, 0, 1, d.hitStop.critSec),
      ultimateSec: num(hs.ultimateSec, 0, 1, d.hitStop.ultimateSec),
      maxSec: num(hs.maxSec, 0, 1, d.hitStop.maxSec),
      scope: hs.scope === 'all' ? 'all' : 'pair',
      minGapSec: num(hs.minGapSec, 0, 10, d.hitStop.minGapSec),
      ultimateWindowSec: num(hs.ultimateWindowSec, 0, 30, d.hitStop.ultimateWindowSec),
    },
    cameraShake: {
      enabled: bool(cs.enabled, d.cameraShake.enabled),
      decayPower: num(cs.decayPower, 0.5, 6, d.cameraShake.decayPower),
      tiers: { light: tier('light'), medium: tier('medium'), heavy: tier('heavy') },
      heavy: tierRef(cs.heavy, d.cameraShake.heavy),
      crit: tierRef(cs.crit, d.cameraShake.crit),
      ultimate: tierRef(cs.ultimate, d.cameraShake.ultimate),
    },
    knockback: { enabled: bool(kb.enabled, d.knockback.enabled), ratioMul: num(kb.ratioMul, 0, 5, d.knockback.ratioMul) },
    floatPop: {
      enabled: bool(fp.enabled, d.floatPop.enabled),
      normalPeakMul: num(fp.normalPeakMul, 0.5, 3, d.floatPop.normalPeakMul),
      heavyPeakMul: num(fp.heavyPeakMul, 0.5, 3, d.floatPop.heavyPeakMul),
      critPeakMul: num(fp.critPeakMul, 0.5, 3, d.floatPop.critPeakMul),
      popInMul: num(fp.popInMul, 0.2, 3, d.floatPop.popInMul),
    },
  };
}

/** 這一下的命中種類：奧義時間窗內算奧義，否則爆擊，否則一般。 */
export function resolveHitKind(isCrit: boolean, ultimateActive: boolean): HitKind {
  if (ultimateActive) return 'ultimate';
  return isCrit ? 'crit' : 'normal';
}

/** 命中頓格秒數；開關關閉回舊版固定值；其餘受 maxSec 限制。 */
export function hitStopSecFor(kind: HitKind, cfg: BattleJuiceConfig = activeJuice): number {
  const h = cfg.hitStop;
  if (!h.enabled) return LEGACY_HIT_STOP_SEC;
  const sec = kind === 'ultimate' ? h.ultimateSec : kind === 'crit' ? h.critSec : h.normalSec;
  return Math.min(Math.max(0, sec), h.maxSec);
}

/** 這一下要震的等級；null 表示不震。heavy = 重擊（非爆擊）。開關關閉時沿用舊規則：只有重擊／爆擊震一種。 */
export function shakeTierFor(kind: HitKind, heavy: boolean, cfg: BattleJuiceConfig = activeJuice): ShakeTierName | null {
  const c = cfg.cameraShake;
  if (!c.enabled) return heavy ? 'medium' : null;
  if (kind === 'ultimate') return c.ultimate;
  if (kind === 'crit') return c.crit;
  return heavy ? c.heavy : null;
}

/** 等級對應的震動參數；開關關閉回舊版固定震動。 */
export function shakeParamsFor(tier: ShakeTierName, cfg: BattleJuiceConfig = activeJuice): ShakeTier {
  return cfg.cameraShake.enabled ? cfg.cameraShake.tiers[tier] : LEGACY_SHAKE;
}

/** 衰減包絡：progress 為 0～1 的進度，回 1→0。 */
export function shakeEnvelope(progress: number, decayPower: number): number {
  if (!(progress > 0)) return 1;
  if (progress >= 1) return 0;
  return Math.pow(1 - progress, decayPower);
}

export interface ShakeOffset { x: number; y: number }

/**
 * 鏡頭震動在第 elapsedSec 秒的位移（寫進呼叫端提供的 out，不配置物件）。
 * 水平主振、垂直 0.6 倍且相位錯開，振幅隨包絡衰減到 0；結束後回 0,0。
 */
export function sampleShake(elapsedSec: number, tier: ShakeTier, decayPower: number, out: ShakeOffset): ShakeOffset {
  if (!(elapsedSec >= 0) || elapsedSec >= tier.durationSec || !(tier.strength > 0)) { out.x = 0; out.y = 0; return out; }
  const amp = shakeEnvelope(elapsedSec / tier.durationSec, decayPower) * tier.strength;
  const w = Math.PI * 2 * tier.frequencyHz * elapsedSec;
  out.x = amp * Math.sin(w);
  out.y = amp * 0.6 * Math.sin(w * 1.3 + 1.1);
  return out;
}

/** 目前震動剩餘強度（含衰減）；沒有進行中的震動回 0。 */
export function shakeRemainingStrength(elapsedSec: number, tier: ShakeTier, decayPower: number): number {
  if (!(elapsedSec >= 0) || elapsedSec >= tier.durationSec) return 0;
  return shakeEnvelope(elapsedSec / tier.durationSec, decayPower) * tier.strength;
}

/** 重疊震動的合併：新的比目前剩餘強度大才取代，否則忽略（不疊加，鏡頭不會漂）。 */
export function shouldReplaceShake(activeRemainingStrength: number, incoming: ShakeTier): boolean {
  return incoming.strength > activeRemainingStrength;
}

/** 跳字彈出倍率；開關關閉回 1、1（維持樣式表原值）。 */
export function floatPopMul(kind: 'normal' | 'heavy' | 'crit', cfg: BattleJuiceConfig = activeJuice): { peak: number; popIn: number } {
  const f = cfg.floatPop;
  if (!f.enabled) return { peak: 1, popIn: 1 };
  const peak = kind === 'crit' ? f.critPeakMul : kind === 'heavy' ? f.heavyPeakMul : f.normalPeakMul;
  return { peak, popIn: f.popInMul };
}

/** 受擊後退距離倍率；關閉時為 1（舊版距離）。 */
export function knockbackMul(cfg: BattleJuiceConfig = activeJuice): number {
  return cfg.knockback.enabled ? cfg.knockback.ratioMul : 1;
}

/** 全場頓格限流：兩次之間至少隔 minGapSec。 */
export class HitStopGate {
  private lastAt = -Infinity;
  allow(nowSec: number, minGapSec: number): boolean {
    if (nowSec - this.lastAt < minGapSec) return false;
    this.lastAt = nowSec;
    return true;
  }
  reset(): void { this.lastAt = -Infinity; }
}

/** 奧義時間窗：發動時 mark，之後 windowSec 內查詢為 true。 */
export class UltimateWindow {
  private until = -Infinity;
  mark(nowSec: number, windowSec: number): void { this.until = nowSec + windowSec; }
  isActive(nowSec: number): boolean { return nowSec < this.until; }
  reset(): void { this.until = -Infinity; }
}

/** 全戰場共用的奧義時間窗與全場頓格限流（單例；離開戰場不必清，視窗幾秒後自己過期）。 */
export const battleUltimateWindow = new UltimateWindow();
export const battleHitStopGate = new HitStopGate();

/** 現在這一刻（秒）；集中一處方便測試以外的呼叫端取用。 */
export function juiceNowSec(): number { return Date.now() / 1000; }

// 除錯探針（實機驗證用）：讓無頭瀏覽器腳本能直接標記奧義時間窗，與 __BATTLE_PERF__ 同類，不影響邏輯。
(globalThis as { __BATTLE_JUICE__?: unknown }).__BATTLE_JUICE__ = { ultimateWindow: battleUltimateWindow, hitStopGate: battleHitStopGate };
