// @spec-source → 戰場減益狀態持續視覺表現疊放上限與效能預算規格書 (doc_spec_1361)；PROG-2-10253
/**
 * StatusPersistVfx — 減益狀態「持續期間」的身上循環特效與顏色濾鏡（純邏輯，不依賴 cc，單元測試可直接跑）。
 *
 * 以前減益只有「上身當下」約 1 秒特效＋頭頂小圖示，戰場縮小後 2～3 回合看不出誰被減益。這裡補三件事：
 *   1. 表驅動（STATUS_PERSIST_VFX）：一行一種狀態，決定畫哪個動機、用哪組配色、要不要染色；缺表＝沒有持續表現。
 *   2. 取捨（pickPersistKind／selectLoopUnits）：每單位只播「主減益」一個循環、顏色濾鏡只取一個；
 *      全場同時播循環的單位數 ≤ MAX_LOOP_UNITS，超過依「我方主將 > 敵方主將 > 控制類 > 離盤面中央近」留下。
 *   3. 槽位狀態機（PersistLoopSlots）：固定 6 格預先配好，淡入 0.2 秒、淡出 0.3 秒、換主減益時舊的先淡出再換新的、
 *      陣亡立即回收；不 new 任何東西（View 只讀槽位畫圖）。
 *
 * Unity 對照：像 BuffVfxController 的「狀態 → 循環粒子預設」對照表，加上最多 6 個同時播放的槽位池。
 */
import { STATUS_ICON_DEFS, type StatusIconKind } from './UnitStatusIcons';
import type { Rgb, TacticVfxGroup } from './TacticVfxGroups';

/** 循環畫法動機（畫法在 views/TacticVfxPlayer.ts） */
export type PersistMotif = 'droop-mist' | 'shiver' | 'frost-ring' | 'ban-mark' | 'orbit-swirl' | 'stun-stars';

export interface PersistVfxDef {
  motif: PersistMotif;
  /** 引用既有特效分組的配色，不新增配色 */
  group: TacticVfxGroup;
  /** 每個單位的循環粒子數（規格 3～5，這裡 ≤ MAX_PARTICLES_PER_UNIT） */
  particles: number;
  /** 身上顏色濾鏡（Spine 骨架乘色）；null＝不染。乘色只能變暗變偏色，幅度刻意很小（規格 §2.1：±5%～20%） */
  tint: Rgb | null;
  /** 結束淡出秒數（規格建議 0.2～0.4） */
  fadeOutSec: number;
}

/** 全場同時播循環的單位數上限（規格 §7 問 2＝A：6 隻） */
export const MAX_LOOP_UNITS = 6;
/** 每單位循環粒子上限（規格 §5：3～5） */
export const MAX_PARTICLES_PER_UNIT = 4;
/** 全場循環粒子上限（規格 §5：32） */
export const MAX_LOOP_PARTICLES = 32;
/** 淡入秒數（規格 §2.2：換主減益時新循環 0.2 秒淡入） */
export const LOOP_FADE_IN_SEC = 0.2;

/** 持續表現表（純資料，之後可整表搬 JSON）。優先序直接引用 STATUS_ICON_DEFS 的 order，不另起一套排序。 */
export const STATUS_PERSIST_VFX: Readonly<Partial<Record<StatusIconKind, PersistVfxDef>>> = Object.freeze({
  'stun':       { motif: 'stun-stars',  group: 'stun',    particles: 3, tint: null,             fadeOutSec: 0.3 },
  'rooted':     { motif: 'stun-stars',  group: 'stun',    particles: 3, tint: null,             fadeOutSec: 0.3 },
  'controlled': { motif: 'orbit-swirl', group: 'confuse', particles: 4, tint: [255, 218, 255], fadeOutSec: 0.3 },
  'weak':       { motif: 'droop-mist',  group: 'weaken',  particles: 4, tint: [228, 218, 238], fadeOutSec: 0.3 },
  'fear':       { motif: 'shiver',      group: 'weaken',  particles: 4, tint: [226, 226, 242], fadeOutSec: 0.3 },
  'slow':       { motif: 'frost-ring',  group: 'ice',     particles: 4, tint: [210, 238, 255], fadeOutSec: 0.3 },
  'no-shoot':   { motif: 'ban-mark',    group: 'weaken',  particles: 2, tint: null,             fadeOutSec: 0.3 },
});

/** 圖示優先序（小＝優先），直接取自 STATUS_ICON_DEFS */
export function persistPriority(kind: StatusIconKind): number {
  return STATUS_ICON_DEFS[kind].order;
}

/**
 * 主減益：圖示清單（已依「減益在前、order 小在前」排好）中，第一個「是減益且有持續表現表」的種類。
 * 沒有回 null。毒、燃燒沒有表（沿用既有毒光罩與火焰），所以會跳過去看下一個。
 */
export function pickPersistKind(allKinds: readonly StatusIconKind[]): StatusIconKind | null {
  for (const kind of allKinds) {
    if (!STATUS_ICON_DEFS[kind].isDebuff) continue;
    if (STATUS_PERSIST_VFX[kind]) return kind;
  }
  return null;
}

/** 控制類（暈眩／定身／被控制）：名額吃緊時優先保留 */
export function isControlPersist(kind: StatusIconKind): boolean {
  return kind === 'stun' || kind === 'rooted' || kind === 'controlled';
}

export interface LoopCandidate {
  id: string;
  kind: StatusIconKind;
  /** 該單位是不是某陣營的主將；非主將為 null */
  generalOf: 'player' | 'enemy' | null;
  /** 離盤面中央的格距（|lane-中央|＋|depth-中央|），越小越優先 */
  centerDist: number;
}

function rankOf(c: LoopCandidate): number {
  if (c.generalOf === 'player') return 0;
  if (c.generalOf === 'enemy') return 1;
  return isControlPersist(c.kind) ? 2 : 3;
}

/**
 * 名額取捨：最多留 max 個。排序＝我方主將 > 敵方主將 > 控制類 > 其餘；同級離中央近者先；再同則 id 小者先（穩定）。
 * 回傳留下的 id 清單（新陣列；只在狀態變動時呼叫，不是每幀）。
 */
export function selectLoopUnits(candidates: readonly LoopCandidate[], max = MAX_LOOP_UNITS): string[] {
  const sorted = candidates.slice().sort((a, b) =>
    rankOf(a) - rankOf(b) || a.centerDist - b.centerDist || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted.slice(0, Math.max(0, max)).map((c) => c.id);
}

/**
 * 預算核可：施放特效優先，循環讓位。
 * 回傳這一幀最多可畫幾個循環（依槽位順序取前 k 個）：每個循環算 1 筆特效、perLoop 顆粒子，
 * 與施放特效共用同一份上限（fxCap／particleCap），另受全場循環粒子上限 MAX_LOOP_PARTICLES 限制。
 */
export function grantLoopCount(wantLoops: number, castFx: number, castParticles: number, fxCap: number, particleCap: number, perLoop = MAX_PARTICLES_PER_UNIT): number {
  const per = Math.max(1, perLoop);
  const byFx = Math.max(0, fxCap - castFx);
  const byParticles = Math.max(0, Math.floor((particleCap - castParticles) / per));
  const byLoopCap = Math.floor(MAX_LOOP_PARTICLES / per);
  return Math.max(0, Math.min(wantLoops, byFx, byParticles, byLoopCap));
}

export interface LoopSlot {
  /** 單位 id；null＝空槽 */
  key: string | null;
  /** 目前畫的種類（換主減益時，舊種類先淡出） */
  kind: StatusIconKind | null;
  /** 淡出完成後要換成的種類 */
  pendingKind: StatusIconKind | null;
  /** 0（看不見）～1（全亮） */
  fade: number;
  /** 目標：1＝要顯示、0＝淡出中 */
  target: 0 | 1;
  /** 本輪是否被 offer（end() 用來判斷哪些要淡出） */
  offered: boolean;
  /** 腳點（疊層座標）、格寬縮放（1＝64px）、朝向 */
  x: number;
  y: number;
  scale: number;
  facing: 1 | -1;
  seed: number;
  t: number;
  /** 本槽淡出秒數（取目前種類的表值） */
  fadeOutSec: number;
}

/** 循環槽位池：固定 MAX_LOOP_UNITS 格，全程不配置新物件。 */
export class PersistLoopSlots {
  public readonly slots: LoopSlot[] = [];
  private seedCounter = 1;

  constructor(size = MAX_LOOP_UNITS) {
    for (let i = 0; i < size; i++) {
      this.slots.push({ key: null, kind: null, pendingKind: null, fade: 0, target: 0, offered: false, x: 0, y: 0, scale: 1, facing: 1, seed: 0, t: 0, fadeOutSec: 0.3 });
    }
  }

  /** 每幀開頭：清「本輪已 offer」旗標 */
  public begin(): void {
    for (const s of this.slots) s.offered = false;
  }

  /** 登記一個要顯示的單位；回傳 false＝沒有空槽（呼叫端已用 selectLoopUnits 限制，理論上不會發生） */
  public offer(key: string, kind: StatusIconKind, x: number, y: number, scale: number, facing: 1 | -1): boolean {
    let slot: LoopSlot | null = null;
    let free: LoopSlot | null = null;
    for (const s of this.slots) {
      if (s.key === key) { slot = s; break; }
      if (s.key === null && !free) free = s;
    }
    if (!slot) {
      if (!free) return false;
      slot = free;
      slot.key = key; slot.kind = kind; slot.pendingKind = null; slot.fade = 0; slot.target = 1; slot.t = 0;
      slot.seed = this.seedCounter++;
      slot.fadeOutSec = STATUS_PERSIST_VFX[kind]?.fadeOutSec ?? 0.3;
    }
    slot.offered = true;
    slot.x = x; slot.y = y; slot.scale = scale; slot.facing = facing;
    if (slot.kind === kind) {
      slot.pendingKind = null;
      slot.target = 1;
    } else if (slot.pendingKind !== kind) {
      // 換主減益：舊的先淡出，淡完換新的再淡入（規格 §2.2）
      slot.pendingKind = kind;
      slot.target = 0;
    }
    return true;
  }

  /** 每幀 offer 完呼叫：沒被 offer 的槽開始淡出 */
  public end(): void {
    for (const s of this.slots) if (s.key !== null && !s.offered) { s.target = 0; s.pendingKind = null; }
  }

  /** 立即或淡出釋放某單位（陣亡＝立即） */
  public release(key: string, instant: boolean): void {
    for (const s of this.slots) {
      if (s.key !== key) continue;
      if (instant) this.clear(s); else { s.target = 0; s.pendingKind = null; }
    }
  }

  /** 推進淡入淡出；淡完的空槽回收 */
  public step(dt: number): void {
    for (const s of this.slots) {
      if (s.key === null) continue;
      s.t += dt;
      if (s.target === 1) {
        s.fade = Math.min(1, s.fade + dt / LOOP_FADE_IN_SEC);
      } else {
        s.fade = Math.max(0, s.fade - dt / Math.max(0.05, s.fadeOutSec));
        if (s.fade <= 0) {
          if (s.pendingKind) {
            s.kind = s.pendingKind; s.pendingKind = null; s.target = 1; s.t = 0;
            s.fadeOutSec = STATUS_PERSIST_VFX[s.kind]?.fadeOutSec ?? 0.3;
          } else this.clear(s);
        }
      }
    }
  }

  /** 目前佔用的槽數（含淡出中） */
  public activeCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.key !== null) n++;
    return n;
  }

  public clearAll(): void { for (const s of this.slots) this.clear(s); }

  private clear(s: LoopSlot): void {
    s.key = null; s.kind = null; s.pendingKind = null; s.fade = 0; s.target = 0; s.offered = false; s.t = 0;
  }
}
