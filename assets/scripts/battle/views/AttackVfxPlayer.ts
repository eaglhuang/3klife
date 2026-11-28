/**
 * AttackVfxPlayer — 戰場攻擊特效（View 層，零貼圖、加色混合的單一 Graphics 節點、全部數值來自 data/attack-vfx.json）。
 *
 * 設計：
 *   步兵 arcSlash   ：由上往下的弧形刀光，頭亮尾淡，命中處星形閃光＋火花。
 *   長槍兵 thrustLine：一道細長突刺線往前竄＋平行速度線，槍尖到點迸星芒。
 *   弓兵 arrowTrail ：箭矢身後的寬亮尾跡＋閃光點，命中星形閃光（箭矢本體仍是 ArrowShotView 的 Sprite）。
 *   盾兵 shieldWave ：命中時朝攻擊方向向外擴張的衝擊波弧＋碎光。
 *   騎兵 chargeRush ：衝撞速度線＋腳下前方土黃揚塵扇形（一般混合，另一個 Graphics）＋命中星形閃光。
 *   武將 = 武器模板（blade/spear/sword/bow/cast，同一批畫法放大）＋代表色＋名將獨特細節（signature）：
 *     關羽 moonBlade：青綠月牙刀光外加一道慢半拍的外圈月牙與飄起的青綠碎光；
 *     諸葛亮 bagua：施法法陣外圈八卦爻＋爆點羽扇弧。
 *
 * 亮度：主 Graphics 以 builtin-graphics 材質覆寫成加色混合（SRC_ALPHA, ONE）；每道筆畫三層眩光
 *   （外層寬低 alpha 的飽和色暈／中層飽和色（往白微提亮）／內層近白核心），不做全螢幕後處理。
 *   加色下 alpha 已接近 1，所以亮度靠「疊畫」：glow.passes（1~3，預設 2）讓三層每一道各畫 passes 次。
 *   passes=1 且 glow.lowEnd 有值時套用舊亮度覆寫（低階機降級）。建材質失敗退回一般混合並 warn 一次。
 *
 * 效能：加色 Graphics 一個（一次 drawcall），揚塵 Graphics 只在騎兵衝撞時才啟用（多 1 次 drawcall）；
 * 特效是池內的資料記錄而不是節點；全場同時特效數與粒子數有上限（JSON budget），超過就縮減粒子或略過。
 * update 內不配置新物件（共用暫存 Color、不建閉包）。沒有特效時不重畫、節點停用。
 *
 * 參考（只借節奏與寫法，沒有複製程式）：00GameDevs https://00gamedevs.com/ 的 flame-surge（火舌掃過＋邊緣碎火星）、
 *   arcane-matrix（符文方陣緩轉）、healing-field（擴散光圈）。
 *   Original code © 2026 00GameDevs (@00vchannel), MIT License。three.js © 2010-2026 three.js authors, MIT License。
 *   以下為依其節奏重新寫成 Cocos Graphics 的版本；依 MIT 條款保留上述版權聲明。
 *
 * Unity 對照：一個以程式繪製、Additive 材質的 LineRenderer／Mesh 特效管理器；attack-vfx.json 即 ScriptableObject。
 */
import { Color, gfx, Graphics, JsonAsset, Material, Node, resources } from 'cc';
import { AptitudeWeaponRule, buildGeneralWeaponTable, resolveGeneralWeapon, weaponByAptitude, weaponTemplateKeys } from '../shared/GeneralWeapon';

export interface AtkPalette { main: string; glow: string; core: string; accent: string }
type Params = Record<string, number | string | AtkPalette>;
export interface GlowConfig {
  /** 外層暈寬 = 核心寬 × 此倍數（約 4~6） */
  outerWidthMul: number;
  /** 外層暈 alpha 係數 0~1 */
  outerAlpha: number;
  /** 中層飽和色 alpha 係數 0~1 */
  midAlpha: number;
  /** 中層顏色往白色混合的比例 0~1（微提亮，保留飽和色相） */
  midWhiten: number;
  /** 內層核心寬 = 中層寬 × 此倍數 */
  coreWidthMul: number;
  /** 核心顏色往白色混合的比例 0~1 */
  coreWhiten: number;
  /** 弧形帶（刀光）外層／核心厚度相對本體的倍數 */
  stripOuterMul: number;
  stripCoreMul: number;
  /** 疊畫次數 1~3：三層每道筆畫各畫幾次（加色下越疊越亮）。1 = 舊亮度（配合 lowEnd） */
  passes: number;
  /** passes=1 時覆寫上面欄位（低階機降級用，填舊值） */
  lowEnd?: Partial<Omit<GlowConfig, 'lowEnd' | 'flash' | 'passes'>> & { flash?: Partial<GlowConfig['flash']> };
  /** 命中星形閃光（≤0.16 秒） */
  flash: { rays: number; lenPx: number; widthPx: number; coreRadiusPx: number; sec: number };
}
export interface AttackVfxConfig {
  enabled: boolean;
  /** 是否用加色混合（false 則退回一般混合） */
  additive?: boolean;
  glow: GlowConfig;
  budget: { maxEffects: number; maxParticles: number; minLinePx: number };
  troops: Record<string, Params & { kind: string; palette: AtkPalette }>;
  generalTemplates: Record<string, Params & { kind: string }>;
  /** 暴擊命中光（參數變體：金色、較大的星形閃光；不新增資源） */
  critBurst: Params & { kind: string; palette: AtkPalette };
  /** 單位倒下的漫畫式演出（衝擊線＋小星星）；troop=小兵、general=武將（較大較多）。沒設定就不播，不影響戰鬥流程 */
  defeatBurst?: { kind: string; delaySec: number; alphaMul: number; palette: AtkPalette; troop: Params; general: Params };
  signatures: Record<string, Params>;
  generalProfiles: Record<string, { weapon: string; signature?: string; palette: AtkPalette }>;
  fallback: { weaponByRole: Record<string, string>; aptitudeRule?: AptitudeWeaponRule; defaultWeapon: string; elementPalettes: Record<string, AtkPalette>; defaultPalette: AtkPalette };
}
export type AttackVfxTroop = 'slash' | 'thrust' | 'bow' | 'shield' | 'charge';
export interface GeneralVfxInfo { id: string; role?: string; element?: string; weapon?: string; troopAptitude?: Readonly<Record<string, string>> }

/** 量測用：效能報告與單元測試讀取（也掛在 globalThis.__ATK_VFX_STATS__） */
export const attackVfxStats = { activeFx: 0, particles: 0, peakFx: 0, peakParticles: 0, primitives: 0, drawOps: 0, peakDrawOps: 0, played: 0, skipped: 0, crit: 0, defeatTroop: 0, defeatGeneral: 0, defeatStars: 0, defeatLines: 0 };

interface Fx {
  active: boolean; kind: string; t: number; seed: number;
  ax: number; ay: number; bx: number; by: number; ang: number; angC: number; dist: number; flip: number;
  p: Params; pal: AtkPalette; sig: Params | null; sigName: string; particles: number; total: number;
  /** 不透明度倍率（來自 JSON alphaMul，預設 1） */
  alphaMul: number;
}

const DEFAULT_GLOW: GlowConfig = {
  outerWidthMul: 6, outerAlpha: 0.35, midAlpha: 1, midWhiten: 0, coreWidthMul: 0.4, coreWhiten: 0.8, stripOuterMul: 2, stripCoreMul: 0.4,
  passes: 2,
  flash: { rays: 5, lenPx: 40, widthPx: 4, coreRadiusPx: 10, sec: 0.11 },
};
let GL: GlowConfig = DEFAULT_GLOW;
/** 疊畫次數（已夾在 1~3）；每道筆畫的三層都重複這麼多次 */
let PASS = 2;
let minLine = 2;

const clampPasses = (n: number | undefined): number => Math.max(1, Math.min(3, Math.floor(n ?? 2)));
/** 解析眩光設定：passes 夾到 1~3；passes=1 且有 lowEnd 時套用舊亮度覆寫 */
function resolveGlow(g: GlowConfig): GlowConfig {
  PASS = clampPasses(g.passes);
  const lo = g.lowEnd;
  if (PASS > 1 || !lo) return g;
  return { ...g, ...lo, flash: { ...g.flash, ...lo.flash } };
}

let loaded: AttackVfxConfig | null = null;
let loading = false;
/** 讀 resources/data/attack-vfx.json（只讀一次）；讀到前回傳 null，呼叫端退回舊特效。 */
export function getAttackVfxConfig(): AttackVfxConfig | null {
  if (!loaded && !loading) {
    loading = true;
    resources.load('data/attack-vfx', JsonAsset, (err, asset) => {
      if (err || !asset) return;
      const cfg = asset.json as AttackVfxConfig;
      GL = resolveGlow(cfg.glow ?? DEFAULT_GLOW); minLine = cfg.budget?.minLinePx ?? 2;
      loaded = cfg;
    });
  }
  return loaded;
}

/** 新舊開關：網址 ?atkVfx=old／new 優先，否則看 JSON enabled */
export function isAttackVfxEnabled(cfg: AttackVfxConfig | null): boolean {
  if (!cfg) return false;
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const q = new URLSearchParams(search).get('atkVfx');
    if (q === 'old') return false;
    if (q === 'new') return true;
  } catch { /* 非網頁環境略過 */ }
  return cfg.enabled;
}

/** 武器表（generals.json weapon 欄位，id → 武器模板鍵）；讀到前為空表，呼叫端退回 profile／角色推算 */
const generalWeaponById = new Map<string, string>();
let generalWeaponsLoading = false;
/** 讀 resources/data/generals.json 建武器表（只做一次；武將設定本來就由戰場載入，沿用快取不另佔記憶體） */
function ensureGeneralWeapons(cfg: AttackVfxConfig): void {
  if (generalWeaponsLoading || generalWeaponById.size > 0) return;
  generalWeaponsLoading = true;
  resources.load('data/generals', JsonAsset, (err, asset) => {
    if (err || !asset || !Array.isArray(asset.json)) { generalWeaponsLoading = false; return; }
    const table = buildGeneralWeaponTable(asset.json as Array<{ id?: string; weapon?: string | null }>, weaponTemplateKeys(cfg.generalTemplates));
    table.forEach((w, id) => generalWeaponById.set(id, w));
  });
}


/** 武將武器（generals.json weapon → profile → 適性推算 → 角色預設；見 shared/GeneralWeapon.ts）；音效與弓箭演出共用 */
export function generalWeaponOf(g: GeneralVfxInfo): string | null {
  const cfg = getAttackVfxConfig();
  if (!cfg) return null;
  ensureGeneralWeapons(cfg);
  return resolveGeneralVfx(cfg, { ...g, weapon: g.weapon ?? generalWeaponById.get(g.id) }).weapon;
}

/** 依 weapon 欄位 → profile → 角色推算解析武將的武器模板；代表色與獨特細節仍走 profile／元素（量產：沒設定的武將自動有一套） */
export function resolveGeneralVfx(cfg: AttackVfxConfig, g: GeneralVfxInfo): { weapon: string; palette: AtkPalette; signature: string } {
  const prof = cfg.generalProfiles[g.id];
  const skip = !!g.role && (cfg.fallback.aptitudeRule?.skipRoles ?? []).includes(g.role);
  const aptitudeWeapon = skip ? null : weaponByAptitude(cfg.fallback.aptitudeRule, g.troopAptitude);
  const weapon = resolveGeneralWeapon(
    { weapon: g.weapon, profileWeapon: prof?.weapon, aptitudeWeapon, role: g.role },
    cfg.fallback,
    weaponTemplateKeys(cfg.generalTemplates),
  );
  if (prof) return { weapon, palette: prof.palette, signature: prof.signature ?? '' };
  const fb = cfg.fallback;
  return { weapon, palette: (g.element && fb.elementPalettes[g.element]) || fb.defaultPalette, signature: '' };
}

const rgbCache = new Map<string, [number, number, number]>();
const scratch = new Color();
function rgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) { const v = parseInt(hex.slice(1), 16); c = [(v >> 16) & 255, (v >> 8) & 255, v & 255]; rgbCache.set(hex, c); }
  return c;
}
/** 目前繪製中的特效不透明度倍率（每個特效由 attack-vfx.json 的 alphaMul 決定，騎兵／盾兵／法陣用來避免遮住部隊身形） */
let curAlphaMul = 1;
const a255 = (alpha: number): number => Math.max(0, Math.min(255, Math.round(alpha * curAlphaMul)));
function col(hex: string, alpha: number): Color {
  const c = rgb(hex);
  return scratch.set(c[0], c[1], c[2], a255(alpha));
}
/** 往白色混合 k（0~1）後的顏色，核心高亮用 */
function colW(hex: string, k: number, alpha: number): Color {
  const c = rgb(hex);
  return scratch.set(Math.round(c[0] + (255 - c[0]) * k), Math.round(c[1] + (255 - c[1]) * k), Math.round(c[2] + (255 - c[2]) * k), a255(alpha));
}
/** 依 JSON 的 sizeMul 縮放長度類參數（鍵名以 Px 結尾，腳下偏移與命中距離除外）；結果快取，不每次分配 */
const SIZE_SKIP = /Drop|Forward|hitDist|minLine/;
const scaledCache = new WeakMap<Params, Params>();
function scaleParams(p: Params): Params {
  const m = opt(p, 'sizeMul', 1);
  if (m === 1) return p;
  let r = scaledCache.get(p);
  if (r) return r;
  r = { ...p };
  for (const k of Object.keys(p)) {
    if (k.endsWith('Px') && typeof p[k] === 'number' && !SIZE_SKIP.test(k)) r[k] = (p[k] as number) * m;
  }
  if (typeof p.flashScale === 'number') r.flashScale = p.flashScale * m;
  scaledCache.set(p, r);
  return r;
}
/** 刀光寬度剖面：k=0（尾）→1（前緣），兩端為 0（收尖），峰值偏向前緣。 */
const slashProfile = (k: number): number => Math.sin(Math.PI * Math.pow(clamp01(k), 1.4));
const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);
const DEG = Math.PI / 180;
const num = (p: Params, k: string): number => p[k] as number;
const opt = (p: Params, k: string, d: number): number => (p[k] as number | undefined) ?? d;
const TRIGRAMS = [0b111, 0b000, 0b010, 0b101, 0b001, 0b110, 0b011, 0b100]; // 乾坤坎離震巽艮兌

let additiveWarned = false;

export class AttackVfxPlayer {
  private node: Node | null = null;
  private g: Graphics | null = null;
  /** 揚塵專用（一般混合）；只在騎兵衝撞時啟用 */
  private dustNode: Node | null = null;
  private dg: Graphics | null = null;
  private dustUsed = false;
  private readonly pool: Fx[] = [];
  private seedCounter = 1;
  private flipCounter = 0;
  private dirty = false;
  /** 本幀實際送出的 stroke／fill 次數（每次 update 重算） */
  private ops = 0;

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) { getAttackVfxConfig(); }

  /** 該兵種是否由本播放器負責（設定已載入且開關開啟） */
  public handles(style: string): style is AttackVfxTroop {
    const cfg = getAttackVfxConfig();
    return !!cfg && isAttackVfxEnabled(cfg) && !!cfg.troops[style];
  }

  /** 小兵攻擊特效。座標為畫面層（uiRoot）。回傳是否已播出。 */
  public playTroop(style: string, ax: number, ay: number, bx: number, by: number, ratio: number): boolean {
    if (!this.handles(style)) return false;
    const cfg = getAttackVfxConfig()!; const spec = cfg.troops[style];
    return this.spawn(cfg, spec.kind, spec, spec.palette, null, '', ax, ay, bx, by, ratio);
  }

  /** 暴擊命中光：金色、較大的星形閃光（JSON critBurst，同一套閃光參數的變體）；回傳是否已播出 */
  public playCrit(bx: number, by: number): boolean {
    const cfg = getAttackVfxConfig();
    if (!cfg || !isAttackVfxEnabled(cfg) || !cfg.critBurst) return false;
    attackVfxStats.crit++;
    return this.spawn(cfg, cfg.critBurst.kind, cfg.critBurst, cfg.critBurst.palette, null, '', bx, by, bx, by, 1);
  }

  /**
   * 單位倒下：衝擊線＋小星星往上飄散（漫畫式、無血腥）。strong=true 是武將（較大較多）。
   * 座標為畫面層（uiRoot）；回傳是否已排進播放（預算滿時視為已處理）。
   */
  public playDefeat(bx: number, by: number, strong: boolean): boolean {
    const cfg = getAttackVfxConfig();
    const d = cfg?.defeatBurst;
    if (!cfg || !d || !isAttackVfxEnabled(cfg)) return false;
    const p: Params = { delaySec: d.delaySec, alphaMul: d.alphaMul, ...(strong ? d.general : d.troop) };
    const before = attackVfxStats.played;
    const ok = this.spawn(cfg, d.kind, p, d.palette, null, '', bx, by, bx, by, 1);
    if (ok && attackVfxStats.played > before) {
      if (strong) attackVfxStats.defeatGeneral++; else attackVfxStats.defeatTroop++;
      attackVfxStats.defeatStars += num(p, 'starCount');
      attackVfxStats.defeatLines += num(p, 'impactLines');
      (globalThis as { __ATK_VFX_STATS__?: unknown }).__ATK_VFX_STATS__ = attackVfxStats;
    }
    return ok;
  }

  /** 武將攻擊／施法特效：武器模板＋代表色＋名將獨特細節 */
  public playGeneral(info: GeneralVfxInfo, ax: number, ay: number, bx: number, by: number): boolean {
    const cfg = getAttackVfxConfig();
    if (!cfg || !isAttackVfxEnabled(cfg)) return false;
    ensureGeneralWeapons(cfg);
    const r = resolveGeneralVfx(cfg, { ...info, weapon: info.weapon ?? generalWeaponById.get(info.id) });
    const tpl = cfg.generalTemplates[r.weapon];
    if (!tpl) return false;
    const sig = r.signature ? cfg.signatures[r.signature] ?? null : null;
    // 武將與目標常隔很遠：刀光只落在身前 hitDistPx 處，不跟著飛到對面
    const hit = tpl.hitDistPx as number | undefined;
    const dist = Math.hypot(bx - ax, by - ay) || 1;
    return this.spawn(cfg, tpl.kind, tpl, r.palette, sig, r.signature, ax, ay, bx, by, hit ? Math.min(1, hit / dist) : 1);
  }

  private spawn(cfg: AttackVfxConfig, kind: string, p: Params, pal: AtkPalette, sig: Params | null, sigName: string,
    ax: number, ay: number, bx: number, by: number, ratio: number): boolean {
    try {
      const parent = this.getParent();
      if (!parent?.isValid) return false;
      let used = 0, activeN = 0;
      let slot: Fx | null = null;
      for (const f of this.pool) { if (f.active) { used += f.particles; activeN++; } else if (!slot) slot = f; }
      if (activeN >= cfg.budget.maxEffects) { attackVfxStats.skipped++; return true; } // 已滿：略過但視為已處理，不退回舊特效疊畫
      if (!slot) { slot = { active: false, kind: '', t: 0, seed: 0, ax: 0, ay: 0, bx: 0, by: 0, ang: 0, angC: 0, dist: 0, flip: 1, p, pal, sig: null, sigName: '', particles: 0, total: 0, alphaMul: 1 }; this.pool.push(slot); }
      const want = this.wantParticles(kind, p, sig);
      slot.particles = Math.max(0, Math.min(want, cfg.budget.maxParticles - used));
      slot.total = want;
      const dx = bx - ax, dy = by - ay;
      slot.alphaMul = opt(p, 'alphaMul', 1);
      slot.kind = kind; slot.p = scaleParams(p); slot.pal = pal; slot.sig = sig; slot.sigName = sigName;
      slot.t = 0; slot.seed = this.seedCounter++ * 7.31; slot.flip = (this.flipCounter++ & 1) ? -1 : 1;
      slot.ang = Math.atan2(dy, dx); slot.dist = Math.hypot(dx, dy);
      slot.ax = ax; slot.ay = ay;
      // 近戰類（刀光／盾擊／衝撞）的命中點：目標方向上 ratio 處；其餘種類 b 就是目標
      const near = kind === 'arcSlash' || kind === 'shieldWave' || kind === 'chargeRush';
      const rr = kind === 'arcSlash' && opt(p, 'hitOnTarget', 0) ? 1 : ratio;
      slot.bx = near ? ax + dx * rr : bx; slot.by = near ? ay + dy * rr : by;
      slot.active = true;
      slot.angC = slot.ang;
      this.ensureNode(parent);
      attackVfxStats.played++;
      return true;
    } catch (error) { console.warn('[AttackVfxPlayer] 攻擊特效略過', error); return false; }
  }

  private wantParticles(kind: string, p: Params, sig: Params | null): number {
    let n = (p.sparkCount as number | undefined) ?? 0;
    if (kind === 'thrustLine' || kind === 'chargeRush') n += num(p, 'speedLines');
    if (kind === 'arrowTrail') n += num(p, 'glints');
    if (kind === 'defeatBurst') n = num(p, 'impactLines') + num(p, 'starCount');
    if (kind === 'castOrb') n = num(p, 'burstRays') + num(p, 'spiralArms');
    if (sig?.motes) n += num(sig, 'motes');
    if (sig?.featherArcs) n += num(sig, 'featherArcs');
    return n;
  }

  public update(dt: number): void {
    const g = this.g;
    if (!g || !this.node?.isValid) return;
    let any = false, parts = 0, fxN = 0, prims = 0;
    for (const f of this.pool) if (f.active) { any = true; break; }
    if (!any) {
      if (this.dirty) {
        g.clear(); this.dg?.clear(); this.dirty = false; this.node.active = false;
        if (this.dustNode?.isValid) this.dustNode.active = false;
      }
      return;
    }
    this.node.active = true;
    g.clear(); this.dg?.clear(); this.dirty = true; this.dustUsed = false;
    this.ops = 0;
    for (const f of this.pool) {
      if (!f.active) continue;
      f.t += dt;
      // 命中閃光可能在主動畫結束前後才起跳，生命週期多留一段閃光時間，避免閃光被截斷
      const dur = num(f.p, 'delaySec') + num(f.p, 'durationSec') + GL.flash.sec;
      if (f.t >= dur) { f.active = false; continue; }
      fxN++; parts += f.particles;
      const t = f.t - num(f.p, 'delaySec');
      if (t < 0) continue;
      const u = clamp01(t / num(f.p, 'durationSec'));
      curAlphaMul = f.alphaMul;
      switch (f.kind) {
        case 'arcSlash': prims += this.drawArcSlash(g, f, t, u); break;
        case 'thrustLine': prims += this.drawThrust(g, f, t, u); break;
        case 'arrowTrail': prims += this.drawArrow(g, f, t, u); break;
        case 'castOrb': prims += this.drawCast(g, f, t, u); break;
        case 'shieldWave': prims += this.drawShield(g, f, t, u); break;
        case 'chargeRush': prims += this.drawCharge(g, f, t, u); break;
        case 'defeatBurst': prims += this.drawDefeat(g, f, t, u); break;
        case 'critBurst': prims += this.flash(g, f, f.bx, f.by, clamp01(t / GL.flash.sec), opt(f.p, 'flashScale', 1)); break;
      }
    }
    curAlphaMul = 1;
    if (this.dustNode?.isValid) this.dustNode.active = this.dustUsed;
    attackVfxStats.activeFx = fxN; attackVfxStats.particles = parts; attackVfxStats.primitives = prims;
    attackVfxStats.drawOps = this.ops; if (this.ops > attackVfxStats.peakDrawOps) attackVfxStats.peakDrawOps = this.ops;
    if (fxN > attackVfxStats.peakFx) attackVfxStats.peakFx = fxN;
    if (parts > attackVfxStats.peakParticles) attackVfxStats.peakParticles = parts;
    (globalThis as { __ATK_VFX_STATS__?: unknown }).__ATK_VFX_STATS__ = attackVfxStats;
  }

  public destroy(): void {
    if (this.node?.isValid) this.node.destroy();
    if (this.dustNode?.isValid) this.dustNode.destroy();
    this.node = null; this.g = null; this.dustNode = null; this.dg = null; this.pool.length = 0;
  }

  private needAdditive = false;
  private ensureNode(parent: Node): void {
    if (!this.node?.isValid) {
      const n = new Node('AttackVfx');
      n.layer = this.layer();
      this.g = n.addComponent(Graphics);
      this.g.lineJoin = Graphics.LineJoin.ROUND;
      this.g.lineCap = Graphics.LineCap.ROUND;
      this.needAdditive = true;
      this.node = n;
    }
    if (!this.dustNode?.isValid) {
      const d = new Node('AttackVfxDust');
      d.layer = this.layer();
      this.dg = d.addComponent(Graphics);
      this.dg.lineJoin = Graphics.LineJoin.ROUND;
      this.dg.lineCap = Graphics.LineCap.ROUND;
      d.active = false;
      this.dustNode = d;
    }
    // 揚塵在下、加色光在上
    if (this.dustNode.parent !== parent) parent.addChild(this.dustNode);
    if (this.node.parent !== parent) parent.addChild(this.node);
    this.dustNode.setSiblingIndex(parent.children.length - 1);
    this.node.setSiblingIndex(parent.children.length - 1);
    this.node.active = true;
    if (this.needAdditive && this.g) { this.needAdditive = false; this.applyAdditive(this.g); }
  }

  /** 對 Graphics 的材質實例覆寫混合狀態為加色（SRC_ALPHA, ONE）。不用 customMaterial（網頁版 Graphics.clear 會因此崩潰）；失敗退回一般混合並 warn 一次 */
  private applyAdditive(g: Graphics): void {
    const cfg = loaded;
    if (cfg && cfg.additive === false) return;
    try {
      const mi = g.getMaterialInstance(0);
      mi?.overridePipelineStates({
        blendState: { targets: [{
          blend: true,
          blendSrc: gfx.BlendFactor.SRC_ALPHA, blendDst: gfx.BlendFactor.ONE,
          blendSrcAlpha: gfx.BlendFactor.SRC_ALPHA, blendDstAlpha: gfx.BlendFactor.ONE,
        }] },
      });
    } catch (error) {
      if (!additiveWarned) { additiveWarned = true; console.warn('[AttackVfxPlayer] 加色材質覆寫失敗，退回一般混合', error); }
    }
  }

  // ───────────── 共用畫法 ─────────────

  /** 送出一次描邊／填色並計數（stroke／fill 次數即每幀繪製指令數，供量測與預算） */
  private stk(g: Graphics): void { g.stroke(); this.ops++; }
  private fil(g: Graphics): void { g.fill(); this.ops++; }

  /** 設定三層眩光其中一層（0=外暈 1=中層 2=核心）的線寬與顏色。w 為中層寬。 */
  private layer3(g: Graphics, f: Fx, L: number, w: number, a: number, alt = false): void {
    if (L === 0) { g.lineWidth = Math.max(minLine, w * GL.coreWidthMul * GL.outerWidthMul); g.strokeColor = col(f.pal.glow, 255 * GL.outerAlpha * a); }
    else if (L === 1) { g.lineWidth = Math.max(minLine, w); g.strokeColor = colW(alt ? f.pal.accent : f.pal.main, GL.midWhiten, 255 * GL.midAlpha * a); }
    else { g.lineWidth = Math.max(minLine, w * GL.coreWidthMul); g.strokeColor = colW(f.pal.main, GL.coreWhiten, 255 * a); }
  }

  /** 三層眩光直線；每層畫 PASS 次（加色疊畫） */
  private line(g: Graphics, f: Fx, x0: number, y0: number, x1: number, y1: number, w: number, a: number, alt = false): void {
    for (let L = 0; L < 3; L++) {
      this.layer3(g, f, L, w, a, alt);
      for (let k = 0; k < PASS; k++) { g.moveTo(x0, y0); g.lineTo(x1, y1); this.stk(g); }
    }
  }

  /** 三層眩光橢圓（圓環）；每層畫 PASS 次 */
  private ring(g: Graphics, f: Fx, cx: number, cy: number, rx: number, ry: number, w: number, a: number): void {
    for (let L = 0; L < 3; L++) {
      this.layer3(g, f, L, w, a);
      for (let k = 0; k < PASS; k++) { g.ellipse(cx, cy, rx, ry); this.stk(g); }
    }
  }

  /** 三層眩光圓點（填色）：外暈圓＋飽和圓＋白核圓；每層畫 PASS 次 */
  private dot(g: Graphics, f: Fx, x: number, y: number, r: number, a: number): void {
    for (let k = 0; k < PASS; k++) { g.fillColor = col(f.pal.glow, 255 * GL.outerAlpha * a); g.circle(x, y, r * 2.4); this.fil(g); }
    for (let k = 0; k < PASS; k++) { g.fillColor = colW(f.pal.main, GL.midWhiten, 255 * a); g.circle(x, y, r); this.fil(g); }
    for (let k = 0; k < PASS; k++) { g.fillColor = colW(f.pal.main, GL.coreWhiten, 255 * a); g.circle(x, y, r * 0.5); this.fil(g); }
  }

  /** 一段環帶（弧形刀光）：外徑固定，內徑從 in0 線性變到 in1，角度 a0→a1。 */
  private strip(g: Graphics, cx: number, cy: number, rOut: number, in0: number, in1: number, a0: number, a1: number): void {
    const S = 3;
    for (let i = 0; i <= S; i++) {
      const a = a0 + (a1 - a0) * i / S;
      const x = cx + Math.cos(a) * rOut, y = cy + Math.sin(a) * rOut;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = S; i >= 0; i--) {
      const a = a0 + (a1 - a0) * i / S; const r = in0 + (in1 - in0) * i / S;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.close(); this.fil(g);
  }

  /** 一根收尖的放射芒：根部寬 w、尖端為 0 的細長菱形（比等寬圓頭線條乾淨，不會像被切斷的短棒）。三層眩光。 */
  private spike(g: Graphics, f: Fx, x: number, y: number, ang: number, len: number, w: number, a: number): void {
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
    for (let L = 0; L < 3; L++) {
      const tk = L === 0 ? GL.outerWidthMul * 0.45 : L === 1 ? 1 : 0.4;
      const lk = L === 0 ? 1.15 : L === 1 ? 1 : 0.85; // 外暈稍長、白核稍短，疊起來尖端漸層
      g.fillColor = L === 0 ? col(f.pal.glow, 255 * GL.outerAlpha * a) : L === 1 ? colW(f.pal.main, GL.midWhiten, 255 * a) : colW(f.pal.main, GL.coreWhiten, 255 * a);
      for (let k = 0; k < PASS; k++) {
        const hw = Math.max(0.6, w * tk * 0.5);
        g.moveTo(x - ca * len * 0.08 + nx * hw, y - sa * len * 0.08 + ny * hw);
        g.lineTo(x + ca * len * lk * 0.22 + nx * hw * 0.8, y + sa * len * lk * 0.22 + ny * hw * 0.8);
        g.lineTo(x + ca * len * lk, y + sa * len * lk);
        g.lineTo(x + ca * len * lk * 0.22 - nx * hw * 0.8, y + sa * len * lk * 0.22 - ny * hw * 0.8);
        g.lineTo(x - ca * len * 0.08 - nx * hw, y - sa * len * 0.08 - ny * hw);
        g.close(); this.fil(g);
      }
    }
  }

  /** 命中星形閃光：k=0→1 在 flash.sec 內完成。中心亮點＋收尖放射芒（長短相間），回傳圖元數 */
  private flash(g: Graphics, f: Fx, x: number, y: number, k: number, scale: number): number {
    if (k <= 0 || k >= 1) return 0;
    const F = GL.flash; const fade = 1 - k * k; const e = easeOut(k);
    const n = F.rays; const len = F.lenPx * scale * (0.5 + 0.5 * e);
    const rot = hash(f.seed) * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = rot + i * Math.PI * 2 / n;
      this.spike(g, f, x, y, a, len * (i & 1 ? 0.6 : 1), F.widthPx * scale * 1.6 * (1 - k * 0.5), fade);
    }
    this.dot(g, f, x, y, F.coreRadiusPx * scale * (1.1 - 0.4 * k), fade);
    return n * 3 + 3;
  }

  /** 命中火花＋光圈：k 由 0→1 展開。count 受粒子上限，回傳圖元數 */
  private burst(g: Graphics, f: Fx, x: number, y: number, k: number, count: number, lenPx: number, wPx: number, ringPx: number, baseAng: number, spread: number): number {
    if (k <= 0) return 0;
    let prims = 0; const fade = 1 - k;
    for (let i = 0; i < count; i++) {
      const a = baseAng + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread) + (hash(f.seed + i) - 0.5) * 0.5;
      const len = lenPx * (0.7 + hash(f.seed + i * 3) * 0.6);
      const ca = Math.cos(a), sa = Math.sin(a);
      const r0 = len * 0.25 * easeOut(k), r1 = len * easeOut(k);
      this.spike(g, f, x + ca * r0, y + sa * r0, a, r1 - r0, wPx * (1 - k * 0.5) * 1.6, fade);
      prims++;
    }
    if (ringPx > 0) {
      this.ring(g, f, x, y, ringPx * 0.3 + ringPx * 0.7 * easeOut(k), ringPx * 0.3 + ringPx * 0.7 * easeOut(k), 4, fade * 0.9); prims++;
    }
    return prims;
  }

  // ───────────── defeatBurst（單位倒下） ─────────────
  /** 衝擊線（前 0.24 秒由中心炸開）＋小星星（四芒閃星，朝上方扇形飄散、漸隱）。不用任何貼圖。 */
  private drawDefeat(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const kLine = clamp01(t / 0.24);
    if (kLine < 1) prims += this.burst(g, f, f.bx, f.by, kLine, num(p, 'impactLines'), num(p, 'impactLenPx'), num(p, 'impactWidthPx'), num(p, 'ringPx'), 0, Math.PI * 2);
    const n = num(p, 'starCount'), size = num(p, 'starSizePx'), rise = num(p, 'riseOutPx');
    const fade = 1 - u * u, e = easeOut(u);
    for (let i = 0; i < n; i++) {
      const ang = Math.PI / 2 + ((n === 1 ? 0 : i / (n - 1) - 0.5) * Math.PI * 0.95) + (hash(f.seed + i * 5.1) - 0.5) * 0.4;
      const dist = rise * (0.55 + 0.45 * hash(f.seed + i * 2.3)) * e;
      const sx = f.bx + Math.cos(ang) * dist, sy = f.by + Math.sin(ang) * dist + rise * 0.3 * u;
      const s = size * (0.7 + 0.3 * hash(f.seed + i * 9.7)) * (1 - 0.4 * u) * (0.85 + 0.15 * Math.sin(t * 16 + i * 2));
      const alt = (i & 1) === 1;
      this.line(g, f, sx - s, sy, sx + s, sy, 2.4, fade, alt);
      this.line(g, f, sx, sy - s, sx, sy + s, 2.4, fade, alt);
      this.dot(g, f, sx, sy, s * 0.22, fade);
      prims += 3;
    }
    return prims;
  }

  // ───────────── arcSlash ─────────────
  private drawArcSlash(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const R = num(p, 'radiusPx'), thick = num(p, 'thickPx'), K = num(p, 'trailSegments');
    // 揮砍方向加一點隨機偏角（上下左右都有變體）；弧心放在「目標往攻擊者退 R×centerBack」處，centerBack=1 時弧頂正好壓在被擊單位身上
    const angC = f.ang + (hash(f.seed * 1.7) - 0.5) * opt(p, 'tiltRad', 0.9);
    const cx = f.bx - Math.cos(angC) * R * num(p, 'centerBack');
    const cy = f.by - Math.sin(angC) * R * num(p, 'centerBack');
    f.angC = angC;
    prims += this.slashPass(g, f, cx, cy, R, thick, K, u, 1, f.flip);
    // 劍：第二道反向短弧，慢半拍跟上（雙弧）
    if (p.doubleArc) {
      const lag = num(p, 'doubleLagFrac');
      if (u > lag) prims += this.slashPass(g, f, cx, cy, R * 0.9, thick * 0.9, K, clamp01((u - lag) / (1 - lag)), 0.9, -f.flip);
    }
    const sig = f.sig;
    if (sig && f.sigName === 'moonBlade') {
      const lag = num(sig, 'echoLagSec') / num(p, 'durationSec');
      if (u > lag) prims += this.slashPass(g, f, cx, cy, R * num(sig, 'echoRadiusScale'), thick * num(sig, 'echoThickScale'), K, u - lag, num(sig, 'echoAlpha'), f.flip);
      // 青綠碎光：從刀光弧上冒出，往上飄、左右輕擺
      const life = num(sig, 'moteLifeFrac');
      const n = Math.min(num(sig, 'motes'), f.particles);
      for (let i = 0; i < n; i++) {
        const s0 = 0.25 + hash(f.seed + i * 5) * 0.4;
        const k = clamp01((u - s0) / life);
        if (k <= 0 || k >= 1) continue;
        const a = f.ang + f.flip * (hash(f.seed + i) - 0.5) * (num(p, 'sweepDeg') * DEG);
        const mx = cx + Math.cos(a) * R + Math.sin(t * 9 + i * 2) * num(sig, 'moteSwayPx') * k;
        const my = cy + Math.sin(a) * R + num(sig, 'moteRisePx') * easeOut(k);
        const sz = num(sig, 'moteSizePx') * (1 - k * 0.5);
        const fa = 1 - k * k;
        g.fillColor = col(f.pal.glow, 255 * GL.outerAlpha * fa); g.circle(mx, my, sz * 1.9); this.fil(g);
        g.fillColor = i & 1 ? col(f.pal.accent, 255 * fa) : colW(f.pal.main, GL.midWhiten, 255 * fa);
        g.moveTo(mx, my + sz); g.lineTo(mx + sz * 0.6, my); g.lineTo(mx, my - sz); g.lineTo(mx - sz * 0.6, my); g.close(); this.fil(g); prims += 2;
      }
    }
    // 命中：刀光掃到底之後星形閃光＋火花
    const tHit = num(p, 'headFrac') * 0.9 * num(p, 'durationSec');
    prims += this.flash(g, f, f.bx, f.by, (t - tHit) / GL.flash.sec, opt(p, 'flashScale', 1));
    const hk = clamp01((u - num(p, 'headFrac') * 0.9) / (1 - num(p, 'headFrac') * 0.9));
    const nSpark = Math.min(num(p, 'sparkCount'), f.particles);
    prims += this.burst(g, f, f.bx, f.by, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang + Math.PI, 2.2);
    return prims;
  }

  /**
   * 一道弧形刀光（外暈＋本體＋白芯三層）。flip 決定劈的方向。
   * 形狀：細長月牙——外緣是一道圓弧，內緣依寬度剖面往內收，兩端寬度都收到 0（尖端），中段最寬；
   * 動態：前緣 headFrac 內劃到終點，尾端晚 tailLagSec 才跟上（所以尾端消失比前緣晚），中間的帶子由尾亮度漸層（尾透明→前緣亮白）。
   */
  private slashPass(g: Graphics, f: Fx, cx: number, cy: number, R: number, thick: number, K: number, u: number, alpha: number, flip: number): number {
    const p = f.p; let prims = 0;
    const sweep = num(p, 'sweepDeg') * DEG;
    const dur = num(p, 'durationSec');
    const headFrac = num(p, 'headFrac');
    const lagFrac = opt(p, 'tailLagSec', 0.08) / dur;
    const hp = easeOut(clamp01(u / headFrac));
    const tp = easeOut(clamp01((u - lagFrac) / headFrac));
    if (hp - tp <= 0.002) return 0;
    const aC = f.angC;
    const aStart = aC + flip * sweep / 2, aEnd = aC - flip * sweep / 2;
    const aHead = aStart + (aEnd - aStart) * hp;
    const aTail = aStart + (aEnd - aStart) * tp;
    const fs = num(p, 'fadeStart');
    const fade = u > fs ? 1 - (u - fs) / (1 - fs) : 1;
    if (fade <= 0) return 0;
    for (let L = 0; L < 3; L++) {
      const tk = L === 0 ? GL.stripOuterMul : L === 1 ? 1 : GL.stripCoreMul;
      const la = L === 0 ? GL.outerAlpha : 1;
      const rOut = R + thick * 0.06 * tk;
      for (let j = 0; j < K; j++) {
        const k0 = j / K, k1 = (j + 1) / K;
        const a0 = aTail + (aHead - aTail) * k0, a1 = aTail + (aHead - aTail) * k1;
        // 顏色：尾端透明→前緣亮；前緣最後一段再往白拉（最前緣亮白細線）
        const al = 255 * la * fade * alpha * Math.pow(k1, 1.4);
        g.fillColor = L === 0 ? col(f.pal.glow, al) : L === 1 ? colW(f.pal.main, GL.midWhiten + (k1 > 0.8 ? 0.35 : 0), al) : colW(f.pal.main, GL.coreWhiten, al);
        const w0 = thick * tk * slashProfile(k0), w1 = thick * tk * slashProfile(k1);
        for (let k = 0; k < PASS; k++) this.strip(g, cx, cy, rOut, rOut - w0, rOut - w1, a0, a1);
        prims++;
      }
    }
    return prims;
  }

  // ───────────── thrustLine ─────────────
  private drawThrust(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const L = num(p, 'lengthPx'), W = num(p, 'widthPx');
    const maxReach = (p.maxReachPx as number | undefined) ?? Infinity;
    const reach = Math.max(num(p, 'startOffPx') + 20, Math.min(maxReach, f.dist * num(p, 'reachFrac')));
    const h = clamp01(u / num(p, 'headFrac')); const e = easeOut(h);
    const head = num(p, 'startOffPx') + (reach - num(p, 'startOffPx')) * e;
    const tail = Math.max(num(p, 'startOffPx') * 0.5, head - L * (0.4 + 0.6 * e));
    const fade = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), nx = -sa, ny = ca;
    if (fade > 0) {
      // 三層：外暈寬（核心寬 × outerWidthMul 的一半，因菱形寬度為半寬）、飽和本體、白核
      this.tri(g, f, tail, head, W * 0.3 * GL.outerWidthMul * 0.5, 0, col(f.pal.glow, 255 * GL.outerAlpha * fade));
      this.tri(g, f, tail, head, W * 0.62, 0, col(f.pal.main, 255 * GL.midAlpha * fade));
      this.tri(g, f, tail + (head - tail) * 0.15, head, W * 0.3, 0, colW(f.pal.main, GL.coreWhiten, 255 * fade));
      prims += 3;
      const n = Math.min(num(p, 'speedLines'), f.particles);
      for (let i = 0; i < n; i++) {
        const side = (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1) * num(p, 'speedLineGapPx');
        const sl = (head - tail) * num(p, 'speedLineScale');
        const s1 = head - (hash(f.seed + i) * 0.25) * L * 0.5, s0 = Math.max(0, s1 - sl);
        this.line(g, f, f.ax + ca * s0 + nx * side, f.ay + sa * s0 + ny * side, f.ax + ca * s1 + nx * side, f.ay + sa * s1 + ny * side, 4, fade * Math.max(0.35, 1 - i * 0.12), true); prims++;
      }
    }
    const tHit = num(p, 'headFrac') * num(p, 'durationSec');
    const tipX = f.ax + ca * head, tipY = f.ay + sa * head;
    prims += this.flash(g, f, tipX, tipY, (t - tHit) / GL.flash.sec, opt(p, 'flashScale', 1));
    const hk = clamp01((u - num(p, 'headFrac')) / (1 - num(p, 'headFrac')));
    const nSpark = Math.min(num(p, 'sparkCount'), Math.max(0, f.particles - num(p, 'speedLines')));
    prims += this.burst(g, f, tipX, tipY, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang, Math.PI * 1.4);
    return prims;
  }

  /** 沿攻擊方向的菱形（槍刺光）：t0→t1 為長，w 為半寬 */
  private tri(g: Graphics, f: Fx, t0: number, t1: number, w: number, off: number, color: Color): void {
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), nx = -sa, ny = ca;
    g.fillColor = color;
    for (let k = 0; k < PASS; k++) {
      g.moveTo(f.ax + ca * t0 + nx * off, f.ay + sa * t0 + ny * off);
      g.lineTo(f.ax + ca * (t1 - w * 2) + nx * (off + w), f.ay + sa * (t1 - w * 2) + ny * (off + w));
      g.lineTo(f.ax + ca * t1 + nx * off, f.ay + sa * t1 + ny * off);
      g.lineTo(f.ax + ca * (t1 - w * 2) + nx * (off - w), f.ay + sa * (t1 - w * 2) + ny * (off - w));
      g.close(); this.fil(g);
    }
  }

  // ───────────── arrowTrail ─────────────
  private drawArrow(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const flight = num(p, 'flightSec');
    const k = clamp01(t / flight);
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
    const hx = f.ax + (f.bx - f.ax) * k, hy = f.ay + (f.by - f.ay) * k;
    if (t < flight + 0.08) {
      const S = num(p, 'trailSegments'); const len = Math.min(num(p, 'trailLenPx'), f.dist * k + 8);
      const post = t > flight ? 1 - (t - flight) / 0.08 : 1;
      for (let i = 0; i < S; i++) {
        const k0 = i / S, k1 = (i + 1) / S; // k0 靠尾端
        this.line(g, f, hx - ca * len * (1 - k0), hy - sa * len * (1 - k0), hx - ca * len * (1 - k1), hy - sa * len * (1 - k1), num(p, 'trailWidthPx') * (0.15 + 0.85 * k1), post * (0.25 + 0.75 * k1));
        prims++;
      }
      const n = Math.min(num(p, 'glints'), f.particles);
      for (let i = 0; i < n; i++) {
        const back = (0.15 + hash(f.seed + i) * 0.8) * len;
        const wob = Math.sin(t * 24 + i * 2.3) * 8;
        const life = 1 - (back / len) * 0.8;
        this.dot(g, f, hx - ca * back - sa * wob, hy - sa * back + ca * wob, Math.max(2, num(p, 'glintSizePx') * life), life * post); prims++;
      }
      this.dot(g, f, hx, hy, num(p, 'glintSizePx') * 1.6, post); prims++; // 箭頭亮點
    }
    prims += this.flash(g, f, f.bx, f.by, (t - flight) / GL.flash.sec, opt(p, 'flashScale', 1));
    const hk = clamp01((t - flight) / (num(p, 'durationSec') - flight));
    const nSpark = Math.min(num(p, 'sparkCount'), f.particles);
    prims += this.burst(g, f, f.bx, f.by, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang + Math.PI, Math.PI * 1.2);
    return prims;
  }

  // ───────────── shieldWave（盾兵） ─────────────
  private drawShield(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const R = num(p, 'waveRadiusPx'), half = num(p, 'waveArcDeg') * DEG / 2;
    const waves = num(p, 'waves'), lag = num(p, 'waveLagFrac');
    // 衝擊波弧：以命中點為圓心，朝攻擊方向的扇形弧向外擴張，後一圈慢半拍
    for (let w = 0; w < waves; w++) {
      const k = clamp01((u - w * lag) / (1 - (waves - 1) * lag));
      if (k <= 0 || k >= 1) continue;
      const r = R * (0.25 + 0.75 * easeOut(k)) * (1 - w * 0.2);
      const fade = (1 - k) * (w === 0 ? 1 : 0.8);
      const wid = num(p, 'waveWidthPx') * (1 - k * 0.55);
      for (let L = 0; L < 3; L++) {
        this.layer3(g, f, L, wid, fade);
        for (let k = 0; k < PASS; k++) {
          g.moveTo(f.bx + Math.cos(f.ang - half) * r, f.by + Math.sin(f.ang - half) * r);
          g.arc(f.bx, f.by, r, f.ang - half, f.ang + half, true);
          this.stk(g);
        }
      }
      prims++;
    }
    // 碎光：朝前半圓飛出
    const k2 = clamp01(u / 0.85);
    const n = Math.min(num(p, 'sparkCount'), f.particles);
    if (k2 < 1) {
      for (let i = 0; i < n; i++) {
        const a = f.ang + ((n === 1 ? 0.5 : i / (n - 1)) - 0.5) * half * 2.2 + (hash(f.seed + i) - 0.5) * 0.3;
        const len = num(p, 'sparkLenPx') * (0.7 + hash(f.seed + i * 3) * 0.6);
        const r0 = R * 0.3 + len * 0.5 * easeOut(k2), r1 = r0 + len * (1 - k2 * 0.6);
        this.line(g, f, f.bx + Math.cos(a) * r0, f.by + Math.sin(a) * r0, f.bx + Math.cos(a) * r1, f.by + Math.sin(a) * r1, num(p, 'sparkWidthPx') * (1 - k2 * 0.5), 1 - k2, (i & 1) === 1); prims++;
      }
    }
    prims += this.flash(g, f, f.bx, f.by, t / GL.flash.sec, opt(p, 'flashScale', 1));
    return prims;
  }

  // ───────────── chargeRush（騎兵） ─────────────
  private drawCharge(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const reach = Math.hypot(f.bx - f.ax, f.by - f.ay);
    const hf = num(p, 'headFrac');
    const head = reach * easeOut(clamp01(u / hf));
    const fade = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), nx = -sa, ny = ca;
    // 速度線：自騎兵身後追到衝撞點，平行排開，長短不一
    const n = Math.min(num(p, 'speedLines'), f.particles);
    if (fade > 0) {
      for (let i = 0; i < n; i++) {
        const side = (i - (n - 1) / 2) * num(p, 'speedLineGapPx');
        const len = num(p, 'speedLineLenPx') * (0.55 + hash(f.seed + i) * 0.45);
        const s1 = head - hash(f.seed + i * 5) * 16, s0 = Math.max(0, s1 - len);
        this.line(g, f, f.ax + ca * s0 + nx * side, f.ay + sa * s0 + ny * side, f.ax + ca * s1 + nx * side, f.ay + sa * s1 + ny * side, num(p, 'speedLineWidthPx'), fade, (i & 1) === 1); prims++;
      }
    }
    // 揚塵扇形：騎兵腳下前方、一般混合（不用加色，才不會發白）。畫在另一個 Graphics
    const d = this.dg;
    if (d) {
      const du = clamp01(t / num(p, 'durationSec'));
      const dfade = du < 0.3 ? 1 : 1 - (du - 0.3) / 0.7;
      const hex = p.dustColor as string, al = num(p, 'dustAlpha');
      const ox = f.ax + ca * num(p, 'dustForwardPx'), oy = f.ay - num(p, 'footDropPx') + sa * num(p, 'dustForwardPx') * 0.5;
      const fanR = num(p, 'dustFanLenPx') * easeOut(clamp01(du / 0.7)), fanH = num(p, 'dustFanDeg') * DEG / 2;
      if (dfade > 0) {
        this.dustUsed = true;
        d.fillColor = col(hex, al * 0.8 * dfade);
        d.moveTo(ox, oy);
        for (let i = 0; i <= 5; i++) { const a = f.ang - fanH + (fanH * 2) * i / 5; d.lineTo(ox + Math.cos(a) * fanR, oy + Math.sin(a) * fanR * 0.6); }
        d.close(); this.fil(d); prims++;
        const puffs = num(p, 'dustPuffs');
        for (let i = 0; i < puffs; i++) {
          const a = f.ang + ((puffs === 1 ? 0.5 : i / (puffs - 1)) - 0.5) * fanH * 1.8;
          const rr = fanR * (0.45 + hash(f.seed + i) * 0.55);
          const sz = num(p, 'dustPuffSizePx') * (0.6 + 0.8 * du) * (0.8 + hash(f.seed + i * 7) * 0.4);
          d.fillColor = col(hex, al * dfade);
          d.circle(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr * 0.6 + du * 18, sz); this.fil(d); prims++;
        }
      }
    }
    // 命中：星形閃光＋火花＋光圈
    const tHit = hf * num(p, 'durationSec');
    prims += this.flash(g, f, f.bx, f.by, (t - tHit) / GL.flash.sec, opt(p, 'flashScale', 1));
    const hk = clamp01((u - hf) / (1 - hf));
    const nSpark = Math.min(num(p, 'sparkCount'), Math.max(0, f.particles - num(p, 'speedLines')));
    prims += this.burst(g, f, f.bx, f.by, hk, nSpark, num(p, 'sparkLenPx'), num(p, 'sparkWidthPx'), num(p, 'ringPx'), f.ang + Math.PI, 2.4);
    return prims;
  }

  // ───────────── castOrb ─────────────
  private drawCast(g: Graphics, f: Fx, t: number, u: number): number {
    const p = f.p; let prims = 0;
    const rise = clamp01(t / num(p, 'ringRiseSec'));
    const orbT = (t - num(p, 'orbStartSec')) / num(p, 'orbFlightSec');
    const burstK = clamp01((t - num(p, 'orbStartSec') - num(p, 'orbFlightSec')) / num(p, 'burstSec'));
    const out = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
    const rcx = f.ax, rcy = f.ay - num(p, 'ringDropPx'); // 武將節點在身體中心，法陣畫在腳下
    // 腳下法陣：外圈（粗、帶眩光）＋內圈＋緩轉刻度
    const rx = num(p, 'ringRxPx') * easeOut(rise), ry = num(p, 'ringRyPx') * easeOut(rise);
    this.ring(g, f, rcx, rcy, rx, ry, num(p, 'ringWidthPx'), out);
    this.ring(g, f, rcx, rcy, rx * 0.72, ry * 0.72, num(p, 'ringWidthPx') * 0.6, out * 0.9);
    g.fillColor = col(f.pal.glow, 90 * out); g.ellipse(rcx, rcy, rx * 0.72, ry * 0.72); this.fil(g); prims += 3;
    const spin = t * num(p, 'ringSpinDegPerSec') * DEG;
    const ticks = num(p, 'ringTicks');
    for (let L = 0; L < 3; L++) {
      this.layer3(g, f, L, 4.5, out, true);
      for (let k = 0; k < PASS; k++) {
        for (let i = 0; i < ticks; i++) {
          const a = spin + i * Math.PI * 2 / ticks;
          g.moveTo(rcx + Math.cos(a) * rx * 0.8, rcy + Math.sin(a) * ry * 0.8);
          g.lineTo(rcx + Math.cos(a) * rx * 0.97, rcy + Math.sin(a) * ry * 0.97);
        }
        this.stk(g);
      }
    }
    prims++;
    if (f.sig && f.sigName === 'bagua') prims += this.drawBagua(g, f, rcx, rcy, rx, ry, spin, out);
    // 氣旋球：螺旋尾跡
    if (orbT > 0 && orbT < 1.12) {
      const k = clamp01(orbT);
      const nx = -Math.sin(f.ang);
      const tl = num(p, 'trailLenFrac'); const fadeEnd = orbT > 1 ? 1 - (orbT - 1) / 0.12 : 1;
      const arms = Math.min(num(p, 'spiralArms'), f.particles);
      for (let a = 0; a < arms; a++) {
        const ph = a * Math.PI * 2 / Math.max(1, arms);
        for (let L = 0; L < 3; L++) {
          this.layer3(g, f, L, 5, fadeEnd, (a & 1) === 1);
          const N = 8;
          for (let q = 0; q < PASS; q++) {
            for (let i = 0; i <= N; i++) {
              const kk = clamp01(k - tl * (1 - i / N));
              const rad = num(p, 'spiralRadiusPx') * (i / N) * (1 - 0.3 * kk);
              const ang = ph + kk * num(p, 'spiralTurns') * Math.PI * 2 * 2;
              const x = f.ax + (f.bx - f.ax) * easeOut(kk) + nx * Math.cos(ang) * rad;
              const y = f.ay + (f.by - f.ay) * easeOut(kk) + 34 * Math.sin(Math.PI * kk) + Math.sin(ang) * rad * 0.9;
              if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            this.stk(g);
          }
        }
        prims++;
      }
      const ox = f.ax + (f.bx - f.ax) * easeOut(k), oy = f.ay + (f.by - f.ay) * easeOut(k) + 34 * Math.sin(Math.PI * k);
      this.dot(g, f, ox, oy, num(p, 'orbRadiusPx') * 1.2, fadeEnd); prims += 3;
    }
    // 爆點：星形閃光＋光圈＋放射光芒＋羽扇弧
    const tBurst = num(p, 'orbStartSec') + num(p, 'orbFlightSec');
    prims += this.flash(g, f, f.bx, f.by, (t - tBurst) / GL.flash.sec, opt(p, 'flashScale', 1.3));
    if (burstK > 0) {
      const fade = 1 - burstK;
      const br = num(p, 'burstRingPx') * (0.2 + 0.8 * easeOut(burstK));
      this.ring(g, f, f.bx, f.by, br, br, 6, fade);
      g.fillColor = col(f.pal.glow, 130 * fade); g.circle(f.bx, f.by, num(p, 'burstRingPx') * 0.7 * easeOut(burstK)); this.fil(g); prims += 2;
      const n = Math.min(num(p, 'burstRays'), f.particles);
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n + f.seed;
        const ca = Math.cos(a), sa = Math.sin(a), L1 = num(p, 'burstRayLenPx') * easeOut(burstK), L0 = L1 * 0.3;
        this.line(g, f, f.bx + ca * L0, f.by + sa * L0, f.bx + ca * L1, f.by + sa * L1, num(p, 'sparkWidthPx') * (1 - burstK * 0.5), fade, (i & 1) === 1); prims++;
      }
      if (f.sig && f.sigName === 'bagua') {
        const sg = f.sig; const arcs = num(sg, 'featherArcs');
        for (let L = 0; L < 3; L++) {
          this.layer3(g, f, L, num(sg, 'featherWidthPx'), fade, true);
          for (let k = 0; k < PASS; k++) {
            for (let i = 0; i < arcs; i++) {
              const base = f.ang + Math.PI + (i - (arcs - 1) / 2) * 0.55;
              const r0 = 10 + 18 * easeOut(burstK), r1 = num(sg, 'featherLenPx') * easeOut(burstK);
              g.moveTo(f.bx + Math.cos(base) * r0, f.by + Math.sin(base) * r0);
              g.quadraticCurveTo(f.bx + Math.cos(base + 0.5) * (r0 + r1) * 0.6, f.by + Math.sin(base + 0.5) * (r0 + r1) * 0.6, f.bx + Math.cos(base + 0.18) * r1, f.by + Math.sin(base + 0.18) * r1);
            }
            this.stk(g);
          }
        }
        prims += arcs;
      }
    }
    return prims;
  }

  /** 八卦爻：法陣外圈八組三爻，連爻一條、斷爻兩截，隨法陣緩轉；三層眩光（外圈暈＋飽和＋白芯）。 */
  private drawBagua(g: Graphics, f: Fx, rcx: number, rcy: number, rx: number, ry: number, spin: number, out: number): number {
    const sg = f.sig!;
    const bar = num(sg, 'barLenPx'), gap = num(sg, 'barGapPx'), s = num(sg, 'trigramRadiusScale');
    // 八卦外圈（外圈眩光）：貼在爻外側的一圈橢圓
    this.ring(g, f, rcx, rcy, rx * (s + 0.2), ry * (s + 0.2), 3, out * 0.8);
    for (let L = 0; L < 3; L++) {
      this.layer3(g, f, L, num(sg, 'barWidthPx'), out, true);
      for (let q = 0; q < PASS; q++) {
      for (let i = 0; i < 8; i++) {
        const a = spin * 0.35 + i * Math.PI / 4;
        const ca = Math.cos(a), sa = Math.sin(a);
        const tx = -sa * rx, ty = ca * ry; const tl = Math.hypot(tx, ty) || 1; const tdx = tx / tl, tdy = ty / tl; // 切線
        const rdx = ca * rx, rdy = sa * ry; const rl = Math.hypot(rdx, rdy) || 1; // 徑向
        for (let b = 0; b < 3; b++) {
          const off = (b - 1) * gap;
          const cx = rcx + ca * rx * s + (rdx / rl) * off, cy = rcy + sa * ry * s + (rdy / rl) * off;
          const half = bar / 2;
          if ((TRIGRAMS[i] >> b) & 1) { g.moveTo(cx - tdx * half, cy - tdy * half); g.lineTo(cx + tdx * half, cy + tdy * half); }
          else {
            g.moveTo(cx - tdx * half, cy - tdy * half); g.lineTo(cx - tdx * 2, cy - tdy * 2);
            g.moveTo(cx + tdx * 2, cy + tdy * 2); g.lineTo(cx + tdx * half, cy + tdy * half);
          }
        }
      }
      this.stk(g);
      }
    }
    return 4;
  }
}
