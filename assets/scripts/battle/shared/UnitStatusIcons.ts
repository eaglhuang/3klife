// @spec-source → 見 docs/cross-reference-index.md；主戰場UI規格書 §3.2 頭頂狀態圖示（PROG-2-9399）
/**
 * UnitStatusIcons — 單位頭頂「buff／debuff 小圖示」的盤點與排序（純邏輯，不依賴 cc）。
 *
 * 從單位自身欄位與 BattleState 的各種狀態來源（BuffSystem 狀態、毒箭、全隊 aura、
 * 敵方全體減益、自身爆發、單挑勝方加成、被控制）算出「應該顯示哪些圖示」：
 * 增益／減益分類、剩餘回合、依優先序排序、最多顯示 4 個，超出的以「+N」表示。
 * 不改任何戰鬥邏輯與數值，只讀取。
 *
 * Unity 對照：Buff 圖示列的 ViewModel；View 層（UnitStatusIconBar）只負責把結果畫出來。
 */
import { StatusEffect } from '../../shared/CommonEnums';
import { MAX_DEBUFFS_PER_UNIT } from './StatusDebuffCap';

/** 圖示種類；顯示字與顏色由 STATUS_ICON_DEFS 決定 */
export type StatusIconKind =
  | 'stun' | 'rooted' | 'controlled' | 'poison' | 'burn' | 'weak' | 'fear' | 'slow' | 'no-shoot'
  | 'defense-down' | 'attack-down' | 'accuracy-down' | 'hp-down' | 'morale-down'
  | 'invincible' | 'shield' | 'attack-up' | 'defense-up' | 'hp-up' | 'morale-up'
  | 'haste' | 'crit-up' | 'kin-aura' | 'summoned';

export interface StatusIconDef {
  /** 圓底中央的單一中文字 */
  glyph: string;
  isDebuff: boolean;
  /** 排序用：數字小的排前面；減益整體在增益之前（見 compareStatusIcons） */
  order: number;
}

/** 圖示定義表：暫以程式繪製「圓底＋一字」，日後換美術圖只需換 View 層 */
export const STATUS_ICON_DEFS: Readonly<Record<StatusIconKind, StatusIconDef>> = {
  // 減益：控制類最優先（玩家最需要知道單位被卡住）
  'stun':          { glyph: '暈', isDebuff: true,  order: 0 },
  'rooted':        { glyph: '定', isDebuff: true,  order: 1 },
  'controlled':    { glyph: '控', isDebuff: true,  order: 2 },
  'poison':        { glyph: '毒', isDebuff: true,  order: 3 },
  'burn':          { glyph: '燃', isDebuff: true,  order: 3 },
  'weak':          { glyph: '弱', isDebuff: true,  order: 4 },
  'fear':          { glyph: '懼', isDebuff: true,  order: 4 }, // PROG-2-10253：獨立恐懼狀態，與虛弱同級
  'slow':          { glyph: '緩', isDebuff: true,  order: 5 },
  'no-shoot':      { glyph: '封', isDebuff: true,  order: 6 },
  'defense-down':  { glyph: '防', isDebuff: true,  order: 7 },
  'attack-down':   { glyph: '攻', isDebuff: true,  order: 8 },
  'accuracy-down': { glyph: '準', isDebuff: true,  order: 9 },
  'hp-down':       { glyph: '命', isDebuff: true,  order: 10 },
  'morale-down':   { glyph: '士', isDebuff: true,  order: 11 },
  // 增益
  'invincible':    { glyph: '無', isDebuff: false, order: 0 },
  'shield':        { glyph: '盾', isDebuff: false, order: 1 },
  'attack-up':     { glyph: '攻', isDebuff: false, order: 2 },
  'defense-up':    { glyph: '防', isDebuff: false, order: 3 },
  'hp-up':         { glyph: '命', isDebuff: false, order: 4 },
  'morale-up':     { glyph: '士', isDebuff: false, order: 5 },
  'haste':         { glyph: '疾', isDebuff: false, order: 6 },
  'crit-up':       { glyph: '暴', isDebuff: false, order: 7 },
  'kin-aura':      { glyph: '義', isDebuff: false, order: 8 },
  'summoned':      { glyph: '召', isDebuff: false, order: 9 }, // PROG-2-10253：召喚物（doc_spec_1359 §4）
};

/** 頭頂最多同時顯示的圖示數；超過顯示「+N」 */
export const STATUS_ICON_MAX_VISIBLE = 3; // PROG-2-9436：圖示放大到 48 後名牌寬只容得下 3 格

export interface StatusIconEntry {
  kind: StatusIconKind;
  glyph: string;
  isDebuff: boolean;
  /** 剩餘回合；沒有回合概念（例如永久加成）為 null */
  turns: number | null;
  /** 疊層數（PROG-2-9731，目前只有燃燒會疊）；沒有疊層概念為 null，畫面只在 ≥2 時顯示「×N」 */
  stacks: number | null;
}

export interface UnitStatusIconList {
  /** 依序要畫的圖示（最多 STATUS_ICON_MAX_VISIBLE 個） */
  icons: StatusIconEntry[];
  /** 被擠掉的圖示數量；0 不顯示「+N」 */
  overflow: number;
  /** 「+N」字樣；沒有溢出時為空字串 */
  overflowText: string;
  /** 全部（含被擠掉的）圖示種類鍵，用來判斷「新增了哪些狀態」 */
  allKinds: StatusIconKind[];
  /** 畫面是否需要重畫的簽名；內容相同即相同 */
  signature: string;
}

/** 單位自身欄位（TroopUnit 的子集） */
export interface UnitStatusSource {
  attackBonus: number;
  maxHpBonus: number;
  shield: number;
  morale: number;
  moraleTurns: number;
  /** 兄弟齊心光環（doc_spec_1358）：有就顯示「義」圖示 */
  kinAura?: boolean;
  /** 召喚物（PROG-2-10253）：施放者單位 id；有值就顯示「召」圖示 */
  summonedBy?: string | null;
}

/** 狀態來源（由呼叫端從 BattleState／BuffSystem 取出，缺的給 null／空陣列） */
export interface UnitStatusContext {
  /** BuffSystem 身上的狀態（暈眩、定身、疾行…） */
  effects: ReadonlyArray<{ effect: StatusEffect | string; remainingTurns: number }>;
  /** 毒箭 DOT */
  dot: { remainingTurns: number } | null;
  /** 燃燒（PROG-2-9726） */
  burn: { remainingTurns: number; stacks?: number } | null;
  /** 所屬陣營的全隊增益 aura */
  teamAura: {
    remainingTurns: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    damageReduction: number;
  } | null;
  /** 所屬陣營被掛上的全體減益 */
  massDebuff: {
    turnsLeft: number;
    accuracyPenalty: number;
    critPenalty: number;
    attackMultiplier: number;
    damageTakenMultiplier: number;
    dotPct: number;
  } | null;
  /** 所屬陣營的自身爆發窗口 */
  selfBurst: { remainingTurns: number; attackMultiplier: number; critRateBonus: number } | null;
  /** 單挑勝方的全軍暴擊加成 */
  duelVictory: { critBonus: number; remainingTurns: number } | null;
  /** 被挾天子令控制 */
  controlled: { turnsLeft: number } | null;
}

/** 空來源：沒有任何狀態 */
export function emptyStatusContext(): UnitStatusContext {
  return { effects: [], dot: null, burn: null, teamAura: null, massDebuff: null, selfBurst: null, duelVictory: null, controlled: null };
}

/** 比較順序：減益在前；同類依 order */
export function compareStatusIcons(a: StatusIconEntry, b: StatusIconEntry): number {
  if (a.isDebuff !== b.isDebuff) return a.isDebuff ? -1 : 1;
  return STATUS_ICON_DEFS[a.kind].order - STATUS_ICON_DEFS[b.kind].order;
}

/**
 * 從單位與狀態來源算出圖示清單。
 * 同一種類只留一個（多個來源取剩餘回合較長者；有永久來源〔null〕視為最長）。
 */
export function computeUnitStatusIcons(unit: UnitStatusSource, ctx: UnitStatusContext, maxVisible = STATUS_ICON_MAX_VISIBLE): UnitStatusIconList {
  const byKind = new Map<StatusIconKind, StatusIconEntry>();
  const add = (kind: StatusIconKind, turns: number | null, stacks: number | null = null): void => {
    const def = STATUS_ICON_DEFS[kind];
    const normalized = turns !== null && Number.isFinite(turns) ? Math.max(0, Math.floor(turns)) : null;
    const prev = byKind.get(kind);
    if (!prev) {
      byKind.set(kind, { kind, glyph: def.glyph, isDebuff: def.isDebuff, turns: normalized, stacks });
      return;
    }
    if (stacks !== null) prev.stacks = Math.max(prev.stacks ?? 0, stacks);
    // 永久（null）優先，否則取較長回合
    if (prev.turns === null) return;
    prev.turns = normalized === null ? null : Math.max(prev.turns, normalized);
  };

  // 1) 單位自身欄位（地形 buff 格吃到的攻擊／生命加成也落在這裡）
  if (unit.attackBonus > 0) add('attack-up', null);
  else if (unit.attackBonus < 0) add('attack-down', null);
  if (unit.maxHpBonus > 0) add('hp-up', null);
  else if (unit.maxHpBonus < 0) add('hp-down', null);
  if (unit.shield > 0) add('shield', null);
  if (unit.kinAura) add('kin-aura', null);
  if (unit.summonedBy) add('summoned', null);
  if (unit.morale > 0) add('morale-up', unit.moraleTurns > 0 ? unit.moraleTurns : null);
  else if (unit.morale < 0) add('morale-down', unit.moraleTurns > 0 ? unit.moraleTurns : null);

  // 2) BuffSystem 狀態
  for (const e of ctx.effects) {
    if (!(e.remainingTurns > 0)) continue;
    switch (e.effect) {
      case StatusEffect.Stun: add('stun', e.remainingTurns); break;
      case StatusEffect.Rooted: add('rooted', e.remainingTurns); break;
      case StatusEffect.Slow: add('slow', e.remainingTurns); break;
      case StatusEffect.Weak: add('weak', e.remainingTurns); break;
      case StatusEffect.Fear: add('fear', e.remainingTurns); break;
      case StatusEffect.NoShoot: add('no-shoot', e.remainingTurns); break;
      case StatusEffect.Invincible: add('invincible', e.remainingTurns); break;
      case StatusEffect.Haste: add('haste', e.remainingTurns); break;
      case StatusEffect.Fortified: add('defense-up', e.remainingTurns); break;
      default: break;
    }
  }

  // 3) 毒箭、被控制
  if (ctx.dot && ctx.dot.remainingTurns > 0) add('poison', ctx.dot.remainingTurns);
  if (ctx.burn && ctx.burn.remainingTurns > 0) add('burn', ctx.burn.remainingTurns, ctx.burn.stacks ?? null);
  if (ctx.controlled && ctx.controlled.turnsLeft > 0) add('controlled', ctx.controlled.turnsLeft);

  // 4) 全隊增益 aura
  const aura = ctx.teamAura;
  if (aura && aura.remainingTurns > 0) {
    if (aura.attackMultiplier > 1) add('attack-up', aura.remainingTurns);
    if (aura.defenseMultiplier > 1 || aura.damageReduction > 0) add('defense-up', aura.remainingTurns);
  }

  // 5) 自身爆發窗口、單挑勝方暴擊加成
  const burst = ctx.selfBurst;
  if (burst && burst.remainingTurns > 0) {
    if (burst.attackMultiplier > 1) add('attack-up', burst.remainingTurns);
    if (burst.critRateBonus > 0) add('crit-up', burst.remainingTurns);
  }
  const duel = ctx.duelVictory;
  if (duel && duel.remainingTurns > 0 && duel.critBonus > 0) add('crit-up', duel.remainingTurns);

  // 6) 敵方全體減益
  const mass = ctx.massDebuff;
  if (mass && mass.turnsLeft > 0) {
    if (mass.attackMultiplier < 1) add('attack-down', mass.turnsLeft);
    if (mass.damageTakenMultiplier > 1) add('defense-down', mass.turnsLeft);
    if (mass.accuracyPenalty > 0 || mass.critPenalty > 0) add('accuracy-down', mass.turnsLeft);
    if (mass.dotPct > 0) add('poison', mass.turnsLeft);
  }

  // PROG-2-10253：同一單位減益最多 6 個（排序後取前 6，被擠掉的是優先序最低者）
  let debuffSeen = 0;
  const all = Array.from(byKind.values()).sort(compareStatusIcons).filter((i) => !i.isDebuff || ++debuffSeen <= MAX_DEBUFFS_PER_UNIT);
  const limit = Math.max(0, maxVisible);
  const icons = all.slice(0, limit);
  const overflow = Math.max(0, all.length - icons.length);
  return {
    icons,
    overflow,
    overflowText: overflow > 0 ? `+${overflow}` : '',
    allKinds: all.map((i) => i.kind),
    signature: all.map((i) => `${i.kind}:${i.turns ?? 'x'}${i.stacks !== null && i.stacks >= 2 ? `*${i.stacks}` : ''}`).join('|') + `#${limit}`,
  };
}

/** 本次相對上次新增的圖示種類（上次為 null 代表第一次畫，不算新增，避免出陣時整排彈出） */
export function newlyGainedKinds(previous: readonly StatusIconKind[] | null, current: readonly StatusIconKind[]): StatusIconKind[] {
  if (previous === null) return [];
  const had = new Set(previous);
  return current.filter((k) => !had.has(k));
}

/** 新增的種類裡是否含增益／減益，供決定光環顏色 */
export function gainedTones(kinds: readonly StatusIconKind[]): { buff: boolean; debuff: boolean } {
  let buff = false;
  let debuff = false;
  for (const k of kinds) {
    if (STATUS_ICON_DEFS[k].isDebuff) debuff = true;
    else buff = true;
  }
  return { buff, debuff };
}

/** 從 BattleState／單位組出狀態來源（結構型別，免依賴 cc；缺的欄位視為沒有） */
export interface StatusStateLike {
  unitDots?: ReadonlyMap<string, { remainingTurns: number }>;
  unitBurns?: ReadonlyMap<string, { remainingTurns: number; stacks?: number }>;
  teamAuras?: ReadonlyMap<string, UnitStatusContext['teamAura']>;
  massDebuffs?: ReadonlyMap<string, UnitStatusContext['massDebuff']>;
  selfBursts?: ReadonlyMap<string, UnitStatusContext['selfBurst']>;
  duelVictoryBuffs?: ReadonlyMap<string, UnitStatusContext['duelVictory']>;
  controlledUnits?: ReadonlyMap<string, { turnsLeft: number }>;
}

export function buildUnitStatusContext(
  unit: { id: string; faction: string },
  state: StatusStateLike | null | undefined,
  buffEntries: UnitStatusContext['effects'],
): UnitStatusContext {
  if (!state) return { ...emptyStatusContext(), effects: buffEntries };
  return {
    effects: buffEntries,
    dot: state.unitDots?.get(unit.id) ?? null,
    burn: state.unitBurns?.get(unit.id) ?? null,
    teamAura: state.teamAuras?.get(unit.faction) ?? null,
    massDebuff: state.massDebuffs?.get(unit.faction) ?? null,
    selfBurst: state.selfBursts?.get(unit.faction) ?? null,
    duelVictory: state.duelVictoryBuffs?.get(unit.faction) ?? null,
    controlled: state.controlledUnits?.get(unit.id) ?? null,
  };
}
