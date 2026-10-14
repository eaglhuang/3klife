// @spec-source → 戰場適性系統.md (doc_spec_0041) §F 適性等級 / 適性計算公式 / 粉色因子→適性；數值系統.md E-5；決策題 Q16=C（重訂整張適性表）
/**
 * BattleAptitude — 戰場適性修正引擎（純邏輯，不依賴 cc）
 *
 * 武將有三維適性：兵種（騎/步/弓/機械）、地形（平原/山地/水域/林地/沙漠）、天氣（晴/雨/霧/風/夜/雷），
 * 每格 S~D。部隊在某格作戰時，取「指揮武將」的三維適性查表，得到攻防倍率、移動與命中修正：
 *
 *   final_attack  = base × (1 + terrain.atk) × (1 + weather.atk) × (1 + troop.atk)
 *   final_defense = base × (1 + terrain.def) × (1 + weather.def) × (1 + troop.def)
 *   final_move    = base + terrain.move + troop.move
 *   final_acc     = base + terrain.acc + weather.acc
 *
 * Q16=C 重訂整張表（2026-10-11，暫定）：
 *   舊表 B 級「無修正」與 Q35「B 級 -30%」互相矛盾，而且 B 比 C 還痛不連貫。
 *   重訂為單調遞減：S +20% / A +10% / B 0 / C -10% / D -30%；
 *   Q35 的「硬核 -30%」落在最低的 D 級，B 維持普通（粉色因子 ★2 = B 的語意）。
 *
 * Unity 對照：像 NavMesh 的 Area Cost 表 + 單位的 Affinity Matrix；
 * 戰鬥時 DamageCalculator 只要呼叫 Resolve(unit, cell, weather) 取得倍率，不用知道表怎麼排。
 */

import { normalizeWeather } from '../../shared/CommonEnums';

export type AptitudeGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export const APTITUDE_GRADES: readonly AptitudeGrade[] = ['S', 'A', 'B', 'C', 'D'];

export interface AptitudeModifier {
    /** 攻擊加成比例（0.2 = +20%） */
    atk: number;
    /** 防禦加成比例 */
    def: number;
    /** 移動格數修正 */
    move: number;
    /** 命中率修正（0.15 = +15%） */
    acc: number;
}

/** Q16=C 重訂適性表（暫定）；D 攻防依數值系統 F-5 APTITUDE_ATK_DEF 為 −0.25（PM 2026-10-13 決定） */
export const APTITUDE_MODIFIERS: Readonly<Record<AptitudeGrade, AptitudeModifier>> = {
    S: { atk: 0.2, def: 0.2, move: 1, acc: 0.15 },
    A: { atk: 0.1, def: 0.1, move: 0, acc: 0.1 },
    B: { atk: 0, def: 0, move: 0, acc: 0 },
    C: { atk: -0.1, def: -0.1, move: -1, acc: 0 },
    D: { atk: -0.25, def: -0.25, move: -2, acc: -0.15 },
};

/** 沒有資料的維度一律視為 B（普通、無修正） */
export const DEFAULT_APTITUDE_GRADE: AptitudeGrade = 'B';

export function normalizeAptitudeGrade(value: unknown): AptitudeGrade {
    if (typeof value !== 'string') return DEFAULT_APTITUDE_GRADE;
    const upper = value.trim().toUpperCase();
    return (APTITUDE_GRADES as readonly string[]).includes(upper) ? (upper as AptitudeGrade) : DEFAULT_APTITUDE_GRADE;
}

// ── 戰場代碼 → 適性表欄位 ───────────────────────────────────────────────────
// 每個戰場代碼對應「依序嘗試」的適性欄位；全部查不到就是 B。

/** 地形：river 對 WATER（舊資料有 RIVER 欄位時也接受）；fortress 規格沒有適性欄位 → B */
const TERRAIN_KEYS: Readonly<Record<string, readonly string[]>> = {
    plain: ['PLAIN'],
    river: ['WATER', 'RIVER'],
    mountain: ['MOUNTAIN'],
    forest: ['FOREST'],
    desert: ['DESERT'],
};

/** 兵種：盾 / 槍 / 醫療歸步兵；器械 = SIEGE（舊資料 ENGINEER）；水軍沒有欄位時視為 B */
const TROOP_KEYS: Readonly<Record<string, readonly string[]>> = {
    cavalry: ['CAVALRY'],
    infantry: ['INFANTRY'],
    shield: ['INFANTRY'],
    pikeman: ['INFANTRY'],
    medic: ['INFANTRY'],
    archer: ['ARCHER'],
    engineer: ['SIEGE', 'ENGINEER'],
    navy: ['NAVY'],
};

/** 武將的三維適性（與 GeneralConfig 欄位同名） */
export interface AptitudeProfile {
    troopAptitude?: Readonly<Record<string, string>> | null;
    terrainAptitude?: Readonly<Record<string, string>> | null;
    weatherAptitude?: Readonly<Record<string, string>> | null;
}

export interface AptitudeContext {
    troopType?: string | null;
    terrain?: string | null;
    weather?: string | null;
}

function lookup(table: Readonly<Record<string, string>> | null | undefined, keys: readonly string[] | undefined): AptitudeGrade {
    if (!table || !keys) return DEFAULT_APTITUDE_GRADE;
    for (const key of keys) {
        if (table[key] !== undefined) return normalizeAptitudeGrade(table[key]);
    }
    return DEFAULT_APTITUDE_GRADE;
}

function codeOf(value: string | null | undefined): string {
    return typeof value === 'string' ? value.toLowerCase() : '';
}

export function terrainGradeOf(profile: AptitudeProfile | null | undefined, terrain: string | null | undefined): AptitudeGrade {
    return lookup(profile?.terrainAptitude, TERRAIN_KEYS[codeOf(terrain)]);
}

export function weatherGradeOf(profile: AptitudeProfile | null | undefined, weather: string | null | undefined): AptitudeGrade {
    const code = normalizeWeather(weather);
    return lookup(profile?.weatherAptitude, code ? [code] : undefined);
}

export function troopGradeOf(profile: AptitudeProfile | null | undefined, troopType: string | null | undefined): AptitudeGrade {
    return lookup(profile?.troopAptitude, TROOP_KEYS[codeOf(troopType)]);
}

export interface ResolvedAptitude {
    troop: AptitudeGrade;
    terrain: AptitudeGrade;
    weather: AptitudeGrade;
    /** 攻擊倍率 = (1+地形)(1+天氣)(1+兵種) */
    attackMultiplier: number;
    /** 防禦倍率 = (1+地形)(1+天氣)(1+兵種) */
    defenseMultiplier: number;
    /** 移動修正 = 地形 + 兵種 */
    moveDelta: number;
    /** 命中修正 = 地形 + 天氣 */
    accuracyDelta: number;
}

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

/** 取武將在某兵種 / 地形 / 天氣下的最終修正；profile 為 null（無指揮武將）時全部 B */
export function resolveAptitude(profile: AptitudeProfile | null | undefined, context: AptitudeContext): ResolvedAptitude {
    const troop = troopGradeOf(profile, context.troopType);
    const terrain = terrainGradeOf(profile, context.terrain);
    const weather = weatherGradeOf(profile, context.weather);
    const t = APTITUDE_MODIFIERS[terrain];
    const w = APTITUDE_MODIFIERS[weather];
    const r = APTITUDE_MODIFIERS[troop];
    return {
        troop,
        terrain,
        weather,
        attackMultiplier: round3((1 + t.atk) * (1 + w.atk) * (1 + r.atk)),
        defenseMultiplier: round3((1 + t.def) * (1 + w.def) * (1 + r.def)),
        moveDelta: t.move + r.move,
        accuracyDelta: round3(t.acc + w.acc),
    };
}

// ── 移動與命中（PROG-2-0080） ──────────────────────────────────────────────

/**
 * 基礎命中率（暫定 100%）：規格只給「final_acc = base + 地形 + 天氣」沒有基礎值。
 * 取 100% 讓 B 級以上永遠命中、舊戰場行為不變；只有負修正（C/D）才會出現未命中。
 */
export const BASE_HIT_RATE = 1;
/** 命中率下限（暫定 50%）：D 地形 + D 天氣也不會打不到人 */
export const MIN_HIT_RATE = 0.5;

/** 最終命中率 = clamp(基礎 + 適性命中修正, 下限, 100%) */
export function hitRateOf(accuracyDelta: number): number {
    const delta = Number.isFinite(accuracyDelta) ? accuracyDelta : 0;
    return round3(Math.max(MIN_HIT_RATE, Math.min(1, BASE_HIT_RATE + delta)));
}

/** 擲骰判定命中；命中率 100% 時不消耗亂數（保持確定性） */
export function rollHit(accuracyDelta: number, random: () => number = Math.random): boolean {
    const rate = hitRateOf(accuracyDelta);
    if (rate >= 1) return true;
    return random() < rate;
}

/**
 * 套用適性移動修正：原本會走（≥1 格）的部隊，修正後至少還能走 1 格，
 * 避免 C/D 級步兵（基礎 1 格）整場站著不動（暫定）；原本就不能走的維持不動。
 */
export function applyAptitudeMove(baseMove: number, moveDelta: number): number {
    if (baseMove <= 0) return baseMove;
    const delta = Number.isFinite(moveDelta) ? Math.trunc(moveDelta) : 0;
    return Math.max(1, baseMove + delta);
}

// ── 粉色因子 → 適性 ────────────────────────────────────────────────────────

/** 14 人血統中至少幾人攜帶同一適性因子時升一級 */
export const SAME_APTITUDE_ANCESTOR_UPGRADE = 5;

/**
 * 粉色因子星等 → 適性：★0→D、★1→C、★2→B、★3→A；
 * 14 人血統中 ≥5 人攜帶同一適性因子時再升一級（最高 S）。
 */
export function pinkFactorAptitude(stars: number, sameFactorAncestors = 0): AptitudeGrade {
    const star = Math.max(0, Math.min(3, Math.floor(Number.isFinite(stars) ? stars : 0)));
    const base: AptitudeGrade[] = ['D', 'C', 'B', 'A'];
    let index = APTITUDE_GRADES.indexOf(base[star]);
    if (sameFactorAncestors >= SAME_APTITUDE_ANCESTOR_UPGRADE) index = Math.max(0, index - 1);
    return APTITUDE_GRADES[index];
}

// ── 字串（戰場適性 §H） ─────────────────────────────────────────────────────

export const APTITUDE_GRADE_TEXT: Readonly<Record<AptitudeGrade, string>> = {
    S: '★★★ 極強',
    A: '★★☆ 擅長',
    B: '★☆☆ 普通',
    C: '☆☆☆ 不擅長',
    D: '✗ 極差',
};

// ── 粉色因子接線（APT-09）──────────────────────────────────────────────────

/** 粉色地形因子 id → 地形適性鍵（與 generals.json terrainAptitude 的 key 一致；gene-dictionary 的粉色因子只有這三個） */
export const PINK_TERRAIN_FACTOR_KEYS: Readonly<Record<string, string>> = {
    gene_naval: 'WATER',
    gene_mountain: 'MOUNTAIN',
    gene_forest: 'FOREST',
};

export interface PinkAptitudeGene {
    id?: string;
    level?: number;
}

/**
 * 粉色因子覆寫地形適性：粉色因子存在時，該地形的適性由因子等級決定（規格：適性由粉色因子決定），
 * 沒有粉色因子的地形保留原值。回傳新物件，不改來源。
 * 14 人血統的同因子祖先數由呼叫端傳入（key 為因子 id）；沒傳入視為 0，不升級。
 */
export function applyPinkTerrainAptitude(
    base: Readonly<Record<string, string>> | null | undefined,
    genes: readonly PinkAptitudeGene[] | null | undefined,
    ancestorCounts: Readonly<Record<string, number>> = {},
): Record<string, string> {
    const result: Record<string, string> = { ...(base ?? {}) };
    for (const gene of genes ?? []) {
        const id = gene.id ?? '';
        if (!Object.prototype.hasOwnProperty.call(PINK_TERRAIN_FACTOR_KEYS, id)) continue;
        const ancestors = Object.prototype.hasOwnProperty.call(ancestorCounts, id) ? ancestorCounts[id] : 0;
        result[PINK_TERRAIN_FACTOR_KEYS[id]] = pinkFactorAptitude(gene.level ?? 0, ancestors);
    }
    return result;
}

/** 戰場計算適性用的 profile：武將的兵種／天氣適性照舊，地形適性經粉色因子覆寫（APT-09） */
export function battleAptitudeProfileOf(
    general: (AptitudeProfile & { genes?: readonly PinkAptitudeGene[] }) | null | undefined,
): AptitudeProfile | null {
    if (!general) return null;
    return {
        troopAptitude: general.troopAptitude,
        weatherAptitude: general.weatherAptitude,
        terrainAptitude: applyPinkTerrainAptitude(general.terrainAptitude, general.genes),
    };
}
