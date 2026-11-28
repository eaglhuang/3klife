// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-10239 戰場打擊感（命中頓格、鏡頭震動、跳字彈出）；PROG-2-10243 第二批（閃白、擊退、三段緩動、衝擊環、刀光殘影、輝光）
/**
 * BattleJuice — 戰場打擊感參數與純計算（不依賴 cc 引擎，可直接單元測試）。
 *
 * 全部只是「表現層」：頓格只停骨架動畫、鏡頭震動只動攝影機節點、跳字只改縮放，
 * 不碰戰鬥結算、回合邏輯與格子位置資料。
 * 每一項都有 enabled 開關；關閉時回傳與舊版完全相同的數值（見 LEGACY_*），行為不變。
 * 參數在 data/battle-juice.json，讀不到或欄位錯誤時用預設值。
 * 受擊閃白的基本曲線仍在 data/battle-hit-feedback.json（PROG-2-9483）；第二批這裡只放「依命中種類覆寫」的閃白曲線。
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

export type Rgb = [number, number, number];
export type EaseName = 'linear' | 'quadIn' | 'quadOut' | 'quadInOut' | 'sineIn' | 'sineOut' | 'sineInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'backOut';
export interface FlashCurveSpec { holdFrames: number; fadeSec: number; fadePower: number }
/** 衝擊環／輝光共用的一組外觀參數。 */
export interface FxSpec { radiusPx: number; sec: number; widthPx: number; color: Rgb; alpha: number }
export interface AttackEase {
  windUpSec: number; strikeSec: number; holdSec: number; recoverSec: number;
  /** 預備往後拉的像素（攻擊方的反方向）。 */
  windUpPx: number;
  /** 出手往前衝的像素。 */
  forwardPx: number;
  windUpEase: EaseName; strikeEase: EaseName; recoverEase: EaseName;
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
  /** 依命中種類覆寫閃白曲線（全白停幾格、退色秒數與次方）；關閉時沿用 battle-hit-feedback.json 的單一曲線。 */
  flash: { enabled: boolean; normal: FlashCurveSpec; crit: FlashCurveSpec; ultimate: FlashCurveSpec };
  knockback: { enabled: boolean; ratioMul: number; critMul: number; ultimateMul: number };
  /** 緩動：攻擊三段（預備後拉→出手前衝→收招回位）與移動起步。 */
  ease: { enabled: boolean; attack: AttackEase; move: { startEase: EaseName; continueEase: EaseName } };
  /** 命中衝擊環（擴散圓環，加色混合）。 */
  impactRing: { enabled: boolean; maxActive: number; normal: FxSpec; crit: FxSpec; ultimate: FxSpec };
  /** 命中輝光（一團加色光暈，比衝擊環更短更亮）。 */
  glow: { enabled: boolean; maxActive: number; normal: FxSpec; crit: FxSpec; ultimate: FxSpec };
  /** 刀光拖尾：近戰攻擊時畫一道漸隱的弧形劍光（尾端淡、頭端亮）。 */
  bladeTrail: { enabled: boolean; maxActive: number; sec: number; arcRadiusPx: number; sweepDeg: number; widthPx: number; yOffsetPx: number; color: Rgb; alpha: number };
  /** 殘影：攻擊衝刺時留在身後的速度殘影（漸隱的色塊，不複製骨架）。 */
  afterimage: { enabled: boolean; maxActive: number; count: number; sec: number; spacingPx: number; widthPx: number; heightPx: number; yOffsetPx: number; color: Rgb; alpha: number };
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
  flash: {
    enabled: true,
    normal: { holdFrames: 2, fadeSec: 0.05, fadePower: 2 },
    crit: { holdFrames: 3, fadeSec: 0.08, fadePower: 2 },
    ultimate: { holdFrames: 4, fadeSec: 0.12, fadePower: 1.5 },
  },
  knockback: { enabled: true, ratioMul: 1, critMul: 1.4, ultimateMul: 2 },
  ease: {
    enabled: true,
    attack: { windUpSec: 0.06, strikeSec: 0.07, holdSec: 0.04, recoverSec: 0.16, windUpPx: 5, forwardPx: 11, windUpEase: 'sineOut', strikeEase: 'cubicIn', recoverEase: 'backOut' },
    move: { startEase: 'sineInOut', continueEase: 'linear' },
  },
  impactRing: {
    enabled: true, maxActive: 8,
    normal: { radiusPx: 44, sec: 0.22, widthPx: 4, color: [255, 238, 200], alpha: 0.8 },
    crit: { radiusPx: 72, sec: 0.3, widthPx: 6, color: [255, 210, 90], alpha: 0.95 },
    ultimate: { radiusPx: 108, sec: 0.4, widthPx: 8, color: [255, 150, 70], alpha: 1 },
  },
  glow: {
    enabled: true, maxActive: 8,
    normal: { radiusPx: 30, sec: 0.12, widthPx: 0, color: [255, 240, 210], alpha: 0.5 },
    crit: { radiusPx: 46, sec: 0.16, widthPx: 0, color: [255, 215, 110], alpha: 0.7 },
    ultimate: { radiusPx: 70, sec: 0.22, widthPx: 0, color: [255, 160, 80], alpha: 0.85 },
  },
  bladeTrail: { enabled: true, maxActive: 4, sec: 0.18, arcRadiusPx: 40, sweepDeg: 120, widthPx: 8, yOffsetPx: 26, color: [255, 255, 255], alpha: 0.75 },
  afterimage: { enabled: true, maxActive: 4, count: 3, sec: 0.22, spacingPx: 14, widthPx: 16, heightPx: 40, yOffsetPx: 24, color: [190, 225, 255], alpha: 0.32 },
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

const EASE_NAMES: ReadonlyArray<string> = ['linear', 'quadIn', 'quadOut', 'quadInOut', 'sineIn', 'sineOut', 'sineInOut', 'cubicIn', 'cubicOut', 'cubicInOut', 'backOut'];
const easeRef = (v: unknown, fb: EaseName): EaseName => (typeof v === 'string' && EASE_NAMES.includes(v) ? (v as EaseName) : fb);
const rgb = (v: unknown, fb: Rgb): Rgb => (Array.isArray(v) && v.length >= 3 && v.slice(0, 3).every(c => typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 255) ? [v[0], v[1], v[2]] : [fb[0], fb[1], fb[2]]);
const flashSpec = (v: unknown, fb: FlashCurveSpec): FlashCurveSpec => {
  const r = isRec(v) ? v : {};
  return { holdFrames: Math.round(num(r.holdFrames, 0, 12, fb.holdFrames)), fadeSec: num(r.fadeSec, 0, 1, fb.fadeSec), fadePower: num(r.fadePower, 0.1, 6, fb.fadePower) };
};
const fxSpec = (v: unknown, fb: FxSpec): FxSpec => {
  const r = isRec(v) ? v : {};
  return { radiusPx: num(r.radiusPx, 1, 400, fb.radiusPx), sec: num(r.sec, 0.02, 3, fb.sec), widthPx: num(r.widthPx, 0, 60, fb.widthPx), color: rgb(r.color, fb.color), alpha: num(r.alpha, 0, 1, fb.alpha) };
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
  const fl = isRec(src.flash) ? src.flash : {};
  const ez = isRec(src.ease) ? src.ease : {};
  const ea = isRec(ez.attack) ? ez.attack : {};
  const em = isRec(ez.move) ? ez.move : {};
  const ir = isRec(src.impactRing) ? src.impactRing : {};
  const gl = isRec(src.glow) ? src.glow : {};
  const bt = isRec(src.bladeTrail) ? src.bladeTrail : {};
  const ai = isRec(src.afterimage) ? src.afterimage : {};
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
    flash: {
      enabled: bool(fl.enabled, d.flash.enabled),
      normal: flashSpec(fl.normal, d.flash.normal), crit: flashSpec(fl.crit, d.flash.crit), ultimate: flashSpec(fl.ultimate, d.flash.ultimate),
    },
    knockback: {
      enabled: bool(kb.enabled, d.knockback.enabled),
      ratioMul: num(kb.ratioMul, 0, 5, d.knockback.ratioMul),
      critMul: num(kb.critMul, 0, 5, d.knockback.critMul),
      ultimateMul: num(kb.ultimateMul, 0, 5, d.knockback.ultimateMul),
    },
    ease: {
      enabled: bool(ez.enabled, d.ease.enabled),
      attack: {
        windUpSec: num(ea.windUpSec, 0, 0.5, d.ease.attack.windUpSec), strikeSec: num(ea.strikeSec, 0.01, 0.5, d.ease.attack.strikeSec),
        holdSec: num(ea.holdSec, 0, 0.5, d.ease.attack.holdSec), recoverSec: num(ea.recoverSec, 0.01, 1, d.ease.attack.recoverSec),
        windUpPx: num(ea.windUpPx, 0, 60, d.ease.attack.windUpPx), forwardPx: num(ea.forwardPx, 0, 80, d.ease.attack.forwardPx),
        windUpEase: easeRef(ea.windUpEase, d.ease.attack.windUpEase), strikeEase: easeRef(ea.strikeEase, d.ease.attack.strikeEase), recoverEase: easeRef(ea.recoverEase, d.ease.attack.recoverEase),
      },
      move: { startEase: easeRef(em.startEase, d.ease.move.startEase), continueEase: easeRef(em.continueEase, d.ease.move.continueEase) },
    },
    impactRing: { enabled: bool(ir.enabled, d.impactRing.enabled), maxActive: Math.round(num(ir.maxActive, 1, 32, d.impactRing.maxActive)), normal: fxSpec(ir.normal, d.impactRing.normal), crit: fxSpec(ir.crit, d.impactRing.crit), ultimate: fxSpec(ir.ultimate, d.impactRing.ultimate) },
    glow: { enabled: bool(gl.enabled, d.glow.enabled), maxActive: Math.round(num(gl.maxActive, 1, 32, d.glow.maxActive)), normal: fxSpec(gl.normal, d.glow.normal), crit: fxSpec(gl.crit, d.glow.crit), ultimate: fxSpec(gl.ultimate, d.glow.ultimate) },
    bladeTrail: {
      enabled: bool(bt.enabled, d.bladeTrail.enabled), maxActive: Math.round(num(bt.maxActive, 1, 16, d.bladeTrail.maxActive)),
      sec: num(bt.sec, 0.02, 2, d.bladeTrail.sec), arcRadiusPx: num(bt.arcRadiusPx, 4, 200, d.bladeTrail.arcRadiusPx), sweepDeg: num(bt.sweepDeg, 10, 300, d.bladeTrail.sweepDeg),
      widthPx: num(bt.widthPx, 1, 60, d.bladeTrail.widthPx), yOffsetPx: num(bt.yOffsetPx, -100, 200, d.bladeTrail.yOffsetPx), color: rgb(bt.color, d.bladeTrail.color), alpha: num(bt.alpha, 0, 1, d.bladeTrail.alpha),
    },
    afterimage: {
      enabled: bool(ai.enabled, d.afterimage.enabled), maxActive: Math.round(num(ai.maxActive, 1, 16, d.afterimage.maxActive)), count: Math.round(num(ai.count, 1, 6, d.afterimage.count)),
      sec: num(ai.sec, 0.02, 2, d.afterimage.sec), spacingPx: num(ai.spacingPx, 1, 80, d.afterimage.spacingPx), widthPx: num(ai.widthPx, 2, 120, d.afterimage.widthPx), heightPx: num(ai.heightPx, 2, 160, d.afterimage.heightPx),
      yOffsetPx: num(ai.yOffsetPx, -100, 200, d.afterimage.yOffsetPx), color: rgb(ai.color, d.afterimage.color), alpha: num(ai.alpha, 0, 1, d.afterimage.alpha),
    },
    floatPop: {
      enabled: bool(fp.enabled, d.floatPop.enabled),
      normalPeakMul: num(fp.normalPeakMul, 0.5, 3, d.floatPop.normalPeakMul),
      heavyPeakMul: num(fp.heavyPeakMul, 0.5, 3, d.floatPop.heavyPeakMul),
      critPeakMul: num(fp.critPeakMul, 0.5, 3, d.floatPop.critPeakMul),
      popInMul: num(fp.popInMul, 0.2, 3, d.floatPop.popInMul),
    },
  };
}

/**
 * 玩家偏好（設定面板用，存 localStorage）：命中頓格、鏡頭震動預設開啟，玩家可個別關掉。
 * 偏好只會「關閉」功能，不會把 battle-juice.json 裡關掉的項目打開。
 */
export interface JuicePrefs { hitStop: boolean; cameraShake: boolean }
export const JUICE_PREFS_KEY = '3klife.juicePrefs';
export const DEFAULT_JUICE_PREFS: Readonly<JuicePrefs> = { hitStop: true, cameraShake: true };

/** 讀存檔字串；格式不對或欄位缺漏時用預設（全部開啟）。 */
export function parseJuicePrefs(raw: string | null | undefined): JuicePrefs {
  if (!raw) return { ...DEFAULT_JUICE_PREFS };
  try {
    const d = JSON.parse(raw) as Partial<JuicePrefs> | null;
    return { hitStop: d?.hitStop !== false, cameraShake: d?.cameraShake !== false };
  } catch { return { ...DEFAULT_JUICE_PREFS }; }
}

/** 把玩家偏好疊在設定檔上，回傳新設定（不改傳入物件）。 */
export function applyJuicePrefs(cfg: BattleJuiceConfig, prefs: JuicePrefs): BattleJuiceConfig {
  return {
    ...cfg,
    hitStop: { ...cfg.hitStop, enabled: cfg.hitStop.enabled && prefs.hitStop },
    cameraShake: { ...cfg.cameraShake, enabled: cfg.cameraShake.enabled && prefs.cameraShake },
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

/** 受擊後退距離倍率（依命中種類：爆擊、奧義退更遠）；關閉時為 1（舊版距離）。 */
export function knockbackMul(kind: HitKind = 'normal', cfg: BattleJuiceConfig = activeJuice): number {
  const k = cfg.knockback;
  if (!k.enabled) return 1;
  return k.ratioMul * (kind === 'ultimate' ? k.ultimateMul : kind === 'crit' ? k.critMul : 1);
}

/** 這一下的閃白曲線；關閉時回 null，由呼叫端沿用 battle-hit-feedback.json 的單一曲線。 */
export function flashCurveFor(kind: HitKind, cfg: BattleJuiceConfig = activeJuice): FlashCurveSpec | null {
  const f = cfg.flash;
  if (!f.enabled) return null;
  return kind === 'ultimate' ? f.ultimate : kind === 'crit' ? f.crit : f.normal;
}

const EASE_FN: Record<EaseName, (t: number) => number> = {
  linear: t => t,
  quadIn: t => t * t,
  quadOut: t => t * (2 - t),
  quadInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  sineIn: t => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: t => Math.sin((t * Math.PI) / 2),
  sineInOut: t => -(Math.cos(Math.PI * t) - 1) / 2,
  cubicIn: t => t * t * t,
  cubicOut: t => { const u = t - 1; return u * u * u + 1; },
  cubicInOut: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  backOut: t => { const s = 1.70158; const u = t - 1; return u * u * ((s + 1) * u + s) + 1; },
};
/** 緩動值（t 夾在 0～1）。名稱與 cc.tween 的 easing 字串同名，可直接交給 tween 使用。 */
export function easeValue(name: EaseName, t: number): number {
  return EASE_FN[name](t <= 0 ? 0 : t >= 1 ? 1 : t);
}

/** 攻擊三段的總秒數。 */
export function attackLungeTotalSec(a: AttackEase): number { return a.windUpSec + a.strikeSec + a.holdSec + a.recoverSec; }

/**
 * 攻擊三段緩動在第 t 秒的「往前位移」（像素；往後拉為負）：
 * 預備（0→-windUpPx）→ 出手（-windUpPx→+forwardPx）→ 停頓（保持）→ 收招（+forwardPx→0）。純函式。
 */
export function sampleAttackLunge(t: number, a: AttackEase): number {
  if (!(t > 0)) return 0;
  let u = t;
  if (u < a.windUpSec) return -a.windUpPx * easeValue(a.windUpEase, u / a.windUpSec);
  u -= a.windUpSec;
  if (u < a.strikeSec) return -a.windUpPx + (a.forwardPx + a.windUpPx) * easeValue(a.strikeEase, u / a.strikeSec);
  u -= a.strikeSec;
  if (u < a.holdSec) return a.forwardPx;
  u -= a.holdSec;
  if (u < a.recoverSec) return a.forwardPx * (1 - easeValue(a.recoverEase, u / a.recoverSec));
  return 0;
}

/** 攻擊三段緩動目前採用的參數；關閉回 null（維持舊版）。 */
export function attackEaseFor(cfg: BattleJuiceConfig = activeJuice): AttackEase | null {
  return cfg.ease.enabled ? cfg.ease.attack : null;
}

/** 單位移動一段的緩動名：靜止起步用 startEase，行進中接續用 continueEase；關閉時 linear（舊版）。 */
export function moveEaseFor(wasMoving: boolean, cfg: BattleJuiceConfig = activeJuice): EaseName {
  if (!cfg.ease.enabled) return 'linear';
  return wasMoving ? cfg.ease.move.continueEase : cfg.ease.move.startEase;
}

/** 命中輝光／衝擊環外觀（依命中種類）。 */
export function fxSpecFor(group: 'impactRing' | 'glow', kind: HitKind, cfg: BattleJuiceConfig = activeJuice): FxSpec {
  const g = cfg[group];
  return kind === 'ultimate' ? g.ultimate : kind === 'crit' ? g.crit : g.normal;
}

export interface RingSample { radius: number; alpha: number; width: number }
/** 衝擊環在進度 u（0～1）的半徑、不透明度與線寬：半徑先快後慢外擴、越擴越淡越細。寫進 out，不配置。 */
export function sampleRing(u: number, spec: FxSpec, out: RingSample): RingSample {
  const k = u <= 0 ? 0 : u >= 1 ? 1 : u;
  out.radius = spec.radiusPx * (0.25 + 0.75 * easeValue('quadOut', k));
  out.alpha = spec.alpha * Math.pow(1 - k, 1.4);
  out.width = Math.max(0.5, spec.widthPx * (1 - 0.7 * k));
  return out;
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
