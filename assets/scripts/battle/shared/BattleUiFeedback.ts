// @spec-source → 總PM 11/22 手感審核（名牌／狀態圖示／奧義暫代／毒箭／治療時序）；PROG-2-9731
/**
 * BattleUiFeedback — 戰場 UI 演出的數值表與純規則（不依賴 cc，可單元測試）。
 *
 * 五件事要用的秒數、顏色、大小，全部讀 data/battle-ui-feedback.json（讀不到用內建預設，兩者由測試比對一致）：
 *   1. 名牌戰鬥淡出：戰鬥演出播放時名牌淡到 combatAlpha，結束後等 restoreDelaySec 再淡回。
 *   2. 狀態圖示角標：層數（×N）與剩餘回合數。
 *   3. 奧義暫代分鏡：中央大字招式名。
 *   4. 毒箭上身：紫綠閃光與「中毒」字。
 *   5. 治療時序：治療光 → 綠字 → 血條增加，依序錯開。
 *
 * Unity 對照：像一份 ScriptableObject 調校表＋一個只算數字的 Presenter 規則。
 */

export type Rgba = readonly [number, number, number, number];

export interface BattleUiFeedbackConfig {
  nameplate: { combatAlpha: number; fadeOutSec: number; fadeInSec: number; restoreDelaySec: number };
  statusBadge: {
    turnsFontSize: number; stackFontSize: number; turnsColor: Rgba; stackColor: Rgba; outlineColor: Rgba;
    outlineWidth: number; stackPrefix: string; stackFloatSuffix: string;
  };
  ultPlaceholder: { skillFontRatio: number; skillColor: Rgba; skillOutlineColor: Rgba; tagFontRatio: number; tagColor: Rgba };
  poisonHit: {
    floatText: string; flashFillColor: Rgba; flashEdgeColor: Rgba; flashPeakAlpha: number; flashSec: number;
    flashRadiusX: number; flashRadiusY: number; flashRise: number;
    float: { color: Rgba; outlineColor: Rgba; fontSize: number; durationMs: number };
  };
  heal: {
    lightFillColor: Rgba; lightEdgeColor: Rgba; lightPeakAlpha: number; lightSec: number; lightRadiusX: number; lightRadiusY: number;
    lightRise: number; floatDelaySec: number; hpBarDelaySec: number; queueStaggerSec: number;
  };
}

/** 內建預設；與 battle-ui-feedback.json 一致（測試比對），JSON 讀不到時用它 */
export const DEFAULT_BATTLE_UI_FEEDBACK: BattleUiFeedbackConfig = {
  nameplate: { combatAlpha: 0.12, fadeOutSec: 0.12, fadeInSec: 0.3, restoreDelaySec: 0.35 },
  statusBadge: {
    turnsFontSize: 22, stackFontSize: 22, turnsColor: [255, 255, 255, 255], stackColor: [255, 220, 90, 255],
    outlineColor: [20, 10, 20, 255], outlineWidth: 3, stackPrefix: '×', stackFloatSuffix: ' ×',
  },
  ultPlaceholder: {
    skillFontRatio: 0.17, skillColor: [255, 236, 160, 255], skillOutlineColor: [60, 20, 90, 255],
    tagFontRatio: 0.035, tagColor: [214, 200, 240, 255],
  },
  poisonHit: {
    floatText: '中毒', flashFillColor: [110, 255, 90, 255], flashEdgeColor: [160, 80, 230, 255], flashPeakAlpha: 150,
    flashSec: 0.5, flashRadiusX: 38, flashRadiusY: 56, flashRise: 10,
    float: { color: [170, 255, 110, 255], outlineColor: [70, 20, 100, 255], fontSize: 46, durationMs: 1300 },
  },
  heal: {
    lightFillColor: [120, 255, 170, 255], lightEdgeColor: [230, 255, 235, 255], lightPeakAlpha: 170, lightSec: 0.5,
    lightRadiusX: 34, lightRadiusY: 52, lightRise: 26, floatDelaySec: 0.22, hpBarDelaySec: 0.5, queueStaggerSec: 0.1,
  },
};

const num = (v: unknown, d: number, lo = 0, hi = Number.POSITIVE_INFINITY): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
const str = (v: unknown, d: string): string => (typeof v === 'string' && v.length > 0 ? v : d);
const rgba = (v: unknown, d: Rgba): Rgba => {
  if (!Array.isArray(v) || v.length < 3) return d;
  const c = (i: number, def: number): number => num(v[i], def, 0, 255);
  return [c(0, d[0]), c(1, d[1]), c(2, d[2]), v.length > 3 ? c(3, d[3]) : d[3]];
};
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' ? v as Record<string, any> : {});

/** 解析 JSON：缺欄位、型別不對、超出範圍的值一律退回預設，不丟例外 */
export function parseBattleUiFeedback(raw: unknown): BattleUiFeedbackConfig {
  const d = DEFAULT_BATTLE_UI_FEEDBACK;
  const r = obj(raw);
  const np = obj(r.nameplate); const sb = obj(r.statusBadge); const up = obj(r.ultPlaceholder);
  const ph = obj(r.poisonHit); const phf = obj(ph.float); const hl = obj(r.heal);
  return {
    nameplate: {
      combatAlpha: num(np.combatAlpha, d.nameplate.combatAlpha, 0, 1),
      fadeOutSec: num(np.fadeOutSec, d.nameplate.fadeOutSec, 0.01, 5),
      fadeInSec: num(np.fadeInSec, d.nameplate.fadeInSec, 0.01, 5),
      restoreDelaySec: num(np.restoreDelaySec, d.nameplate.restoreDelaySec, 0, 5),
    },
    statusBadge: {
      turnsFontSize: num(sb.turnsFontSize, d.statusBadge.turnsFontSize, 8, 64),
      stackFontSize: num(sb.stackFontSize, d.statusBadge.stackFontSize, 8, 64),
      turnsColor: rgba(sb.turnsColor, d.statusBadge.turnsColor),
      stackColor: rgba(sb.stackColor, d.statusBadge.stackColor),
      outlineColor: rgba(sb.outlineColor, d.statusBadge.outlineColor),
      outlineWidth: num(sb.outlineWidth, d.statusBadge.outlineWidth, 0, 8),
      stackPrefix: str(sb.stackPrefix, d.statusBadge.stackPrefix),
      stackFloatSuffix: str(sb.stackFloatSuffix, d.statusBadge.stackFloatSuffix),
    },
    ultPlaceholder: {
      skillFontRatio: num(up.skillFontRatio, d.ultPlaceholder.skillFontRatio, 0.04, 0.4),
      skillColor: rgba(up.skillColor, d.ultPlaceholder.skillColor),
      skillOutlineColor: rgba(up.skillOutlineColor, d.ultPlaceholder.skillOutlineColor),
      tagFontRatio: num(up.tagFontRatio, d.ultPlaceholder.tagFontRatio, 0.01, 0.1),
      tagColor: rgba(up.tagColor, d.ultPlaceholder.tagColor),
    },
    poisonHit: {
      floatText: str(ph.floatText, d.poisonHit.floatText),
      flashFillColor: rgba(ph.flashFillColor, d.poisonHit.flashFillColor),
      flashEdgeColor: rgba(ph.flashEdgeColor, d.poisonHit.flashEdgeColor),
      flashPeakAlpha: num(ph.flashPeakAlpha, d.poisonHit.flashPeakAlpha, 0, 255),
      flashSec: num(ph.flashSec, d.poisonHit.flashSec, 0.05, 3),
      flashRadiusX: num(ph.flashRadiusX, d.poisonHit.flashRadiusX, 4, 200),
      flashRadiusY: num(ph.flashRadiusY, d.poisonHit.flashRadiusY, 4, 200),
      flashRise: num(ph.flashRise, d.poisonHit.flashRise, 0, 100),
      float: {
        color: rgba(phf.color, d.poisonHit.float.color),
        outlineColor: rgba(phf.outlineColor, d.poisonHit.float.outlineColor),
        fontSize: num(phf.fontSize, d.poisonHit.float.fontSize, 12, 120),
        durationMs: num(phf.durationMs, d.poisonHit.float.durationMs, 300, 5000),
      },
    },
    heal: {
      lightFillColor: rgba(hl.lightFillColor, d.heal.lightFillColor),
      lightEdgeColor: rgba(hl.lightEdgeColor, d.heal.lightEdgeColor),
      lightPeakAlpha: num(hl.lightPeakAlpha, d.heal.lightPeakAlpha, 0, 255),
      lightSec: num(hl.lightSec, d.heal.lightSec, 0.05, 3),
      lightRadiusX: num(hl.lightRadiusX, d.heal.lightRadiusX, 4, 200),
      lightRadiusY: num(hl.lightRadiusY, d.heal.lightRadiusY, 4, 200),
      lightRise: num(hl.lightRise, d.heal.lightRise, 0, 100),
      floatDelaySec: num(hl.floatDelaySec, d.heal.floatDelaySec, 0, 3),
      hpBarDelaySec: num(hl.hpBarDelaySec, d.heal.hpBarDelaySec, 0, 3),
      queueStaggerSec: num(hl.queueStaggerSec, d.heal.queueStaggerSec, 0, 2),
    },
  };
}

let current: BattleUiFeedbackConfig = DEFAULT_BATTLE_UI_FEEDBACK;
/** 目前生效的設定（載入前是預設） */
export function getBattleUiFeedback(): BattleUiFeedbackConfig { return current; }
/** 載入完成或測試時換掉目前設定 */
export function setBattleUiFeedback(cfg: BattleUiFeedbackConfig): void { current = cfg; }

/** 治療演出的三個時點（距治療開始的秒數）：治療光 0 → 綠字 floatDelaySec → 血條 hpBarDelaySec，保證嚴格遞增 */
export interface HealStepPlan { lightAtSec: number; floatAtSec: number; hpBarAtSec: number }
export function planHealSteps(cfg: BattleUiFeedbackConfig['heal']): HealStepPlan {
  const floatAt = Math.max(0.02, cfg.floatDelaySec);
  const hpAt = Math.max(floatAt + 0.05, cfg.hpBarDelaySec);
  return { lightAtSec: 0, floatAtSec: floatAt, hpBarAtSec: hpAt };
}

/** 角標文字：層數 ≥2 才顯示「×N」；回合數 null（永久）或 0 不顯示 */
export function statusBadgeTexts(stacks: number | null, turns: number | null, stackPrefix = '×'): { stack: string; turns: string } {
  return {
    stack: stacks !== null && stacks >= 2 ? `${stackPrefix}${Math.floor(stacks)}` : '',
    turns: turns !== null && turns > 0 ? `${Math.floor(turns)}` : '',
  };
}

/** 狀態飄字加層數：第 2 層起飄「燃燒 ×2」 */
export function statusFloatWithStacks(text: string, stacks: number | null | undefined, suffix = ' ×'): string {
  return text && typeof stacks === 'number' && stacks >= 2 ? `${text}${suffix}${Math.floor(stacks)}` : text;
}

/**
 * 名牌戰鬥淡出：演出開始（begin）名牌在 fadeOutSec 內淡到 combatAlpha；
 * 全部演出結束（end 到 0 計數）後先等 restoreDelaySec（避免連續打擊之間閃爍），再用 fadeInSec 淡回 1。
 * 純時間推進，由 UnitRenderer.lateUpdate 餵 dt。
 */
export class NameplateCombatFade {
  private level = 1;
  private depth = 0;
  private holdLeft = 0;

  constructor(private readonly cfg: () => BattleUiFeedbackConfig['nameplate'] = () => getBattleUiFeedback().nameplate) {}

  begin(): void { this.depth += 1; this.holdLeft = this.cfg().restoreDelaySec; }
  end(): void { this.depth = Math.max(0, this.depth - 1); this.holdLeft = this.cfg().restoreDelaySec; }
  /** 放掉所有淡出計數並立刻開始淡回（治療要讓玩家看血條、佇列清空保底） */
  releaseNow(): void { this.depth = 0; this.holdLeft = 0; }
  /** 強制回到一般狀態（換場景） */
  reset(): void { this.depth = 0; this.holdLeft = 0; this.level = 1; }

  get alpha(): number { return this.level; }
  get isActive(): boolean { return this.depth > 0 || this.holdLeft > 0 || this.level < 1; }

  /** 推進 dt 秒，回傳目前名牌不透明度比例（0~1） */
  step(dt: number): number {
    const c = this.cfg();
    const dtSafe = Math.max(0, dt);
    if (this.depth > 0) {
      this.level = Math.max(c.combatAlpha, this.level - ((1 - c.combatAlpha) / c.fadeOutSec) * dtSafe);
      return this.level;
    }
    if (this.holdLeft > 0) {
      this.holdLeft = Math.max(0, this.holdLeft - dtSafe);
      return this.level;
    }
    this.level = Math.min(1, this.level + ((1 - c.combatAlpha) / c.fadeInSec) * dtSafe);
    return this.level;
  }
}

/** 哪些戰鬥動畫佇列任務算「攻擊、受擊演出」，期間名牌淡出（PROG-2-9731） */
export function isPlateFadeTask(label: string): boolean {
  return label.startsWith('unit-damage:') || label.startsWith('unit-miss:') || label.startsWith('unit-blocked:')
    || label.startsWith('general-damage:') || label.startsWith('general-dodge:');
}

/** 啟動時讀一次 data/battle-ui-feedback.json（失敗沿用預設）；FloatTextStyle 的毒字樣式也跟著套用 */
export function ensureBattleUiFeedbackLoaded(load: () => Promise<unknown>, onLoaded?: (cfg: BattleUiFeedbackConfig) => void): void {
  if (loadRequested) return;
  loadRequested = true;
  try {
    load().then((raw) => { const cfg = parseBattleUiFeedback(raw); setBattleUiFeedback(cfg); onLoaded?.(cfg); }).catch(() => { /* 讀不到用預設 */ });
  } catch { /* 資源系統未就緒：用預設 */ }
}
let loadRequested = false;
