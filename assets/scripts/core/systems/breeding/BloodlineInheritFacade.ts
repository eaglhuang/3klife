/**
 * 家族子嗣血統遺傳 Facade 三介面與家門奇才判定（PROG-2-9604）
 * 嚴格遵循 doc_spec_1243（家族子嗣與血統總規格書）§5.2 與 §5.4：
 * 1. inheritPotential(parentA, parentB, seed): 回傳五維潛力（星等 1~5）
 * 2. inheritBloodline(parentA, parentB, seed): 回傳遺傳因子與家傳奧義候選
 * 3. rollGenius(parentA, parentB, familyState, seed): 家門奇才突變判定（含雙親EP加成、近親懲罰折半、12人保底）
 */

export interface ParentCandidate {
  id: string;
  name?: string;
  ep?: number;
  isConsanguineous?: boolean; // 近親判定未通過標記 (doc_spec_0532, 1090)
  potentials?: {
    str?: number;
    int?: number;
    lea?: number;
    pol?: number;
    cha?: number;
  };
  genes?: string[];
  secretArts?: string[];
}

export interface FamilyBreedingState {
  consecutiveNonGeniusCount: number; // 家族親生連續非奇才計數
}

export interface ChildPotentialStats {
  str: number;
  int: number;
  lea: number;
  pol: number;
  cha: number;
}

export interface ChildBloodlineResult {
  inheritedGenes: string[];
  secretArtCandidates: string[];
}

export interface ChildGeniusResult {
  isGenius: boolean;
  geniusChance: number;
  isPityTriggered: boolean;
  boostedStatKey?: 'str' | 'int' | 'lea' | 'pol' | 'cha';
  extraSecretArtSlot: boolean;
  honorTitle: string | null;
  updatedFamilyState: FamilyBreedingState;
}

/** 偽隨機數產生器（基於種子） */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * 1. 介面一：繼承五維潛力（星等 1~5）
 */
export function inheritPotential(
  parentA: ParentCandidate,
  parentB: ParentCandidate,
  seed: number = 1000
): ChildPotentialStats {
  const rng = seededRandom(seed);
  const stats: ('str' | 'int' | 'lea' | 'pol' | 'cha')[] = ['str', 'int', 'lea', 'pol', 'cha'];
  const result: any = {};

  for (const stat of stats) {
    const potA = parentA.potentials?.[stat] ?? 2;
    const potB = parentB.potentials?.[stat] ?? 2;
    // 父母平均 +/- 隨機擾動 0~1 星，夾在 1~5 星
    const avg = (potA + potB) / 2;
    const jitter = (rng() - 0.5) * 1.2;
    result[stat] = Math.max(1, Math.min(5, Math.round(avg + jitter)));
  }

  return result as ChildPotentialStats;
}

/**
 * 2. 介面二：繼承血統因子與家傳奧義候選
 */
export function inheritBloodline(
  parentA: ParentCandidate,
  parentB: ParentCandidate,
  seed: number = 2000
): ChildBloodlineResult {
  const rng = seededRandom(seed);
  const genesA = parentA.genes ?? [];
  const genesB = parentB.genes ?? [];
  const allGenes = Array.from(new Set([...genesA, ...genesB]));

  // 各有 50% 機率遺傳雙親因子
  const inheritedGenes: string[] = [];
  for (const g of allGenes) {
    if (rng() < 0.6) {
      inheritedGenes.push(g);
    }
  }

  const artsA = parentA.secretArts ?? [];
  const artsB = parentB.secretArts ?? [];
  const allArts = Array.from(new Set([...artsA, ...artsB]));
  const secretArtCandidates = allArts.filter(() => rng() < 0.5);

  return {
    inheritedGenes,
    secretArtCandidates
  };
}

/**
 * 3. 介面三：家門奇才判定（隨機突變）（doc_spec_1243 §5.2）
 * 規則：
 * - 基礎機率 3%
 * - 雙親加成：任一方 EP ≥ 85 -> +1%；兩方都是 -> +2%；上限 6%
 * - 同血脈劣化：近親判定未通過 -> 機率 ×0.5
 * - 保底：家族每 12 位親生子嗣若無奇才，第 12 位必出（consecutiveNonGeniusCount >= 11 時出第 12 位必中）
 * - 效果：一項隨機潛力星等 +1（上限 5 星）、加一個家傳奧義候選槽、稱號「家門奇才」
 * - 義子：不判定（isAdopted 時回傳 isGenius=false）
 */
export function rollGenius(
  parentA: ParentCandidate,
  parentB: ParentCandidate,
  familyState?: FamilyBreedingState,
  seed: number = 3000,
  isAdopted: boolean = false
): ChildGeniusResult {
  const currentCount = familyState?.consecutiveNonGeniusCount ?? 0;

  // 義子不判定
  if (isAdopted) {
    return {
      isGenius: false,
      geniusChance: 0,
      isPityTriggered: false,
      extraSecretArtSlot: false,
      honorTitle: null,
      updatedFamilyState: { consecutiveNonGeniusCount: currentCount }
    };
  }

  // 保底檢查：每 12 位親生子嗣（累計第 11 次失敗後，第 12 位必出）
  if (currentCount >= 11) {
    const stats: ('str' | 'int' | 'lea' | 'pol' | 'cha')[] = ['str', 'int', 'lea', 'pol', 'cha'];
    const rng = seededRandom(seed);
    const boostedStatKey = stats[Math.floor(rng() * stats.length)];

    return {
      isGenius: true,
      geniusChance: 1.0,
      isPityTriggered: true,
      boostedStatKey,
      extraSecretArtSlot: true,
      honorTitle: '家門奇才',
      updatedFamilyState: { consecutiveNonGeniusCount: 0 }
    };
  }

  // 1. 基礎機率 3%
  let chance = 0.03;

  // 2. 雙親 EP 加成
  const epA = parentA.ep ?? 0;
  const epB = parentB.ep ?? 0;
  let epBonus = 0;
  if (epA >= 85 && epB >= 85) {
    epBonus = 0.02;
  } else if (epA >= 85 || epB >= 85) {
    epBonus = 0.01;
  }
  chance += epBonus;

  // 雙親加成後上限 6%
  chance = Math.min(0.06, chance);

  // 3. 近親懲罰劣化（機率折半）
  if (parentA.isConsanguineous || parentB.isConsanguineous) {
    chance *= 0.5;
  }

  // 4. 抽取隨機數
  const rng = seededRandom(seed);
  const roll = rng();
  const isGenius = roll < chance;

  if (isGenius) {
    const stats: ('str' | 'int' | 'lea' | 'pol' | 'cha')[] = ['str', 'int', 'lea', 'pol', 'cha'];
    const boostedStatKey = stats[Math.floor(rng() * stats.length)];
    return {
      isGenius: true,
      geniusChance: chance,
      isPityTriggered: false,
      boostedStatKey,
      extraSecretArtSlot: true,
      honorTitle: '家門奇才',
      updatedFamilyState: { consecutiveNonGeniusCount: 0 }
    };
  }

  return {
    isGenius: false,
    geniusChance: chance,
    isPityTriggered: false,
    extraSecretArtSlot: false,
    honorTitle: null,
    updatedFamilyState: { consecutiveNonGeniusCount: currentCount + 1 }
  };
}
