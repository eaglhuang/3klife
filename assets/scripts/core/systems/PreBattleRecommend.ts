// @spec-source → 戰場部署系統.md (doc_spec_0040) §出征前編制槽（參謀官 / 後勤官）、§參謀官／後勤官公式；PROG-2-9910 戰前一鍵推薦編制
/**
 * 戰前一鍵推薦編制（純邏輯，無 UI、無 cc 依賴）。
 *
 * 輸入：可出戰的主將候選、參謀官／後勤官（副將）候選、虎符出戰卡組候選。
 * 輸出：推薦的主將、參謀官、後勤官（副將）、虎符卡組，以及每個選擇的理由 i18n key。
 *
 * 規則（決定論：同輸入同輸出；分數相同時依武將 id／卡號字典序由小到大取第一個）：
 *   1. 主將：LEA×w + STR×w 綜合最高。若該關卡指定主將且在候選內，直接採用。
 *   2. 參謀官：INT×0.7 + POL×0.5 最高（與 SortieDeploy 的參謀官計謀點公式同係數），排除主將與同血統者。
 *   3. 後勤官（副將）：LEA×1.0 + POL×0.6 最高（與後勤官軍糧公式同比例），排除已選武將與同血統者。
 *   4. 虎符卡組：依稀有度分數貪婪選取，每選一張時若兵種未出現過則加「兵種不重複」加分，直到 deckSize 張。
 *
 * 權重與關卡覆寫放在 assets/resources/data/prebattle-recommend-weights.json，
 * 由呼叫端讀入後經 parsePreBattleWeights 驗證；本模組不寫死數值。
 */

export interface PreBattleCommanderCandidate {
    id: string;
    str: number;
    int: number;
    lea: number;
    pol: number;
    /** 同名武將系統：同一血統 ID 不可同場 */
    bloodlineId?: string;
}

export interface PreBattleTallyCandidate {
    cardId: string;
    unitType: string;
    rarity: string;
}

export interface PreBattleRosterInput {
    commanders: readonly PreBattleCommanderCandidate[];
    strategists: readonly PreBattleCommanderCandidate[];
    deputies: readonly PreBattleCommanderCandidate[];
    tallies: readonly PreBattleTallyCandidate[];
}

export interface PreBattleEncounterRef {
    id: string;
    playerGeneralId?: string;
}

export interface PreBattleEncounterOverride {
    skipStrategist?: boolean;
    skipDeputy?: boolean;
}

export interface PreBattleWeights {
    commander: { lea: number; str: number };
    strategist: { int: number; pol: number };
    deputy: { lea: number; pol: number };
    tally: {
        deckSize: number;
        rarityScore: Readonly<Record<string, number>>;
        newUnitTypeBonus: number;
    };
    encounterOverrides: Readonly<Record<string, PreBattleEncounterOverride>>;
}

export type PreBattleIssue =
    | 'NO_COMMANDER'
    | 'NO_STRATEGIST'
    | 'NO_DEPUTY'
    | 'TALLY_SHORTAGE'
    | 'UNKNOWN_ENCOUNTER'
    | 'ENCOUNTER_LEAD_UNAVAILABLE';

export interface PreBattleGeneralPick {
    id: string;
    score: number;
    reasonKey: string;
}

export interface PreBattleTallyPick {
    cardId: string;
    unitType: string;
    score: number;
    reasonKey: string;
}

export interface PreBattleRecommendation {
    commander: PreBattleGeneralPick | null;
    strategist: PreBattleGeneralPick | null;
    deputy: PreBattleGeneralPick | null;
    tallyCards: PreBattleTallyPick[];
    /** 卡組還差幾張才到 deckSize（0 表示已滿） */
    tallyShortfall: number;
    issues: PreBattleIssue[];
}

/** 理由文案 key（四語系檔需含這些 key，見測試） */
export const PREBATTLE_REASON_KEYS = {
    commanderStatBlend: 'prebattle.reason.commander.statBlend',
    commanderEncounterFixed: 'prebattle.reason.commander.encounterFixed',
    strategistIntPol: 'prebattle.reason.strategist.intPol',
    deputyLeaPol: 'prebattle.reason.deputy.leaPol',
    tallyRarityDiversity: 'prebattle.reason.tally.rarityDiversity',
} as const;

function num(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function byScoreThenId<T extends { score: number; id: string }>(a: T, b: T): number {
    if (b.score !== a.score) return b.score - a.score;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** 驗證並正規化權重 JSON；欄位缺失或型別錯誤直接拋錯，避免靜默用錯數值。 */
export function parsePreBattleWeights(raw: unknown): PreBattleWeights {
    const r = raw as Partial<PreBattleWeights> | null;
    if (!r || typeof r !== 'object') throw new Error('prebattle weights: 不是物件');
    const pick = (v: unknown, path: string): number => {
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`prebattle weights: ${path} 必須是有限數字`);
        return v;
    };
    const commander = r.commander as { lea?: unknown; str?: unknown } | undefined;
    const strategist = r.strategist as { int?: unknown; pol?: unknown } | undefined;
    const deputy = r.deputy as { lea?: unknown; pol?: unknown } | undefined;
    const tally = r.tally as { deckSize?: unknown; rarityScore?: unknown; newUnitTypeBonus?: unknown } | undefined;
    if (!commander || !strategist || !deputy || !tally) throw new Error('prebattle weights: 缺少區段');
    const deckSize = pick(tally.deckSize, 'tally.deckSize');
    if (deckSize < 1 || Math.floor(deckSize) !== deckSize) throw new Error('prebattle weights: tally.deckSize 必須是正整數');
    if (!tally.rarityScore || typeof tally.rarityScore !== 'object') throw new Error('prebattle weights: tally.rarityScore 缺失');
    const rarityScore: Record<string, number> = {};
    for (const [k, v] of Object.entries(tally.rarityScore as Record<string, unknown>)) {
        rarityScore[k] = pick(v, `tally.rarityScore.${k}`);
    }
    return {
        commander: { lea: pick(commander.lea, 'commander.lea'), str: pick(commander.str, 'commander.str') },
        strategist: { int: pick(strategist.int, 'strategist.int'), pol: pick(strategist.pol, 'strategist.pol') },
        deputy: { lea: pick(deputy.lea, 'deputy.lea'), pol: pick(deputy.pol, 'deputy.pol') },
        tally: {
            deckSize,
            rarityScore,
            newUnitTypeBonus: pick(tally.newUnitTypeBonus, 'tally.newUnitTypeBonus'),
        },
        encounterOverrides: (r.encounterOverrides ?? {}) as Readonly<Record<string, PreBattleEncounterOverride>>,
    };
}

function commanderScore(g: PreBattleCommanderCandidate, w: PreBattleWeights['commander']): number {
    return num(g.lea) * w.lea + num(g.str) * w.str;
}

function strategistScore(g: PreBattleCommanderCandidate, w: PreBattleWeights['strategist']): number {
    return num(g.int) * w.int + num(g.pol) * w.pol;
}

function deputyScore(g: PreBattleCommanderCandidate, w: PreBattleWeights['deputy']): number {
    return num(g.lea) * w.lea + num(g.pol) * w.pol;
}

/** 依分數（高到低）與 id（小到大）排序後，取第一個不與既有血統衝突且不在排除名單內的候選。 */
function pickSupport(
    pool: readonly PreBattleCommanderCandidate[],
    score: (g: PreBattleCommanderCandidate) => number,
    excludeIds: ReadonlySet<string>,
    usedBloodlines: ReadonlySet<string>,
): { candidate: PreBattleCommanderCandidate; score: number } | null {
    const ranked = pool
        .filter((g) => !excludeIds.has(g.id))
        .filter((g) => !g.bloodlineId || !usedBloodlines.has(g.bloodlineId))
        .map((g) => ({ id: g.id, score: score(g), g }))
        .sort(byScoreThenId);
    if (ranked.length === 0) return null;
    return { candidate: ranked[0].g, score: ranked[0].score };
}

function dedupeTallies(tallies: readonly PreBattleTallyCandidate[]): PreBattleTallyCandidate[] {
    const seen = new Set<string>();
    const out: PreBattleTallyCandidate[] = [];
    for (const t of tallies) {
        if (seen.has(t.cardId)) continue;
        seen.add(t.cardId);
        out.push(t);
    }
    return out;
}

function recommendTally(
    tallies: readonly PreBattleTallyCandidate[],
    weights: PreBattleWeights['tally'],
): { picks: PreBattleTallyPick[]; shortfall: number } {
    const pool = dedupeTallies(tallies).sort((a, b) => (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0));
    const picks: PreBattleTallyPick[] = [];
    const usedTypes = new Set<string>();
    const remaining = [...pool];
    while (picks.length < weights.deckSize && remaining.length > 0) {
        let bestIndex = -1;
        let bestScore = -Infinity;
        remaining.forEach((t, index) => {
            const base = num(weights.rarityScore[t.rarity]);
            const bonus = usedTypes.has(t.unitType) ? 0 : weights.newUnitTypeBonus;
            const score = base + bonus;
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });
        const chosen = remaining.splice(bestIndex, 1)[0];
        usedTypes.add(chosen.unitType);
        picks.push({ cardId: chosen.cardId, unitType: chosen.unitType, score: bestScore, reasonKey: PREBATTLE_REASON_KEYS.tallyRarityDiversity });
    }
    return { picks, shortfall: weights.deckSize - picks.length };
}

/** 一鍵推薦編制（決定論）。候選不足時回傳 null／較少卡牌並列出 issues，不拋錯。 */
export function recommendPreBattleLoadout(
    input: PreBattleRosterInput,
    weights: PreBattleWeights,
    forcedCommanderId?: string,
    override: PreBattleEncounterOverride = {},
): PreBattleRecommendation {
    const issues: PreBattleIssue[] = [];
    const usedBloodlines = new Set<string>();
    const excluded = new Set<string>();

    let commander: PreBattleGeneralPick | null = null;
    const commanderPool = input.commanders;
    if (forcedCommanderId !== undefined) {
        const forced = commanderPool.find((g) => g.id === forcedCommanderId);
        if (forced) {
            commander = { id: forced.id, score: commanderScore(forced, weights.commander), reasonKey: PREBATTLE_REASON_KEYS.commanderEncounterFixed };
        } else {
            issues.push('ENCOUNTER_LEAD_UNAVAILABLE');
        }
    }
    if (!commander) {
        const best = pickSupport(commanderPool, (g) => commanderScore(g, weights.commander), excluded, usedBloodlines);
        if (best) {
            commander = { id: best.candidate.id, score: best.score, reasonKey: PREBATTLE_REASON_KEYS.commanderStatBlend };
        } else {
            issues.push('NO_COMMANDER');
        }
    }
    if (commander) {
        excluded.add(commander.id);
        const cg = commanderPool.find((g) => g.id === commander!.id);
        if (cg?.bloodlineId) usedBloodlines.add(cg.bloodlineId);
    }

    let strategist: PreBattleGeneralPick | null = null;
    if (!override.skipStrategist) {
        const best = pickSupport(input.strategists, (g) => strategistScore(g, weights.strategist), excluded, usedBloodlines);
        if (best) {
            strategist = { id: best.candidate.id, score: best.score, reasonKey: PREBATTLE_REASON_KEYS.strategistIntPol };
            excluded.add(best.candidate.id);
            if (best.candidate.bloodlineId) usedBloodlines.add(best.candidate.bloodlineId);
        } else {
            issues.push('NO_STRATEGIST');
        }
    }

    let deputy: PreBattleGeneralPick | null = null;
    if (!override.skipDeputy) {
        const best = pickSupport(input.deputies, (g) => deputyScore(g, weights.deputy), excluded, usedBloodlines);
        if (best) {
            deputy = { id: best.candidate.id, score: best.score, reasonKey: PREBATTLE_REASON_KEYS.deputyLeaPol };
        } else {
            issues.push('NO_DEPUTY');
        }
    }

    const tally = recommendTally(input.tallies, weights.tally);
    if (input.tallies.length === 0) issues.push('TALLY_SHORTAGE');
    else if (tally.shortfall > 0) issues.push('TALLY_SHORTAGE');

    return {
        commander,
        strategist,
        deputy,
        tallyCards: tally.picks,
        tallyShortfall: tally.shortfall,
        issues,
    };
}

/**
 * 首戰（或任一關卡）預填推薦。關卡 id 不存在時退回一般推薦並標記 UNKNOWN_ENCOUNTER。
 * 關卡的 playerGeneralId 若在主將候選內，主將固定為該武將；覆寫設定（例如首戰不派參謀／後勤）由權重檔提供。
 */
export function recommendForEncounter(
    encounterId: string,
    input: PreBattleRosterInput,
    encounters: readonly PreBattleEncounterRef[],
    weights: PreBattleWeights,
): PreBattleRecommendation {
    const encounter = encounters.find((e) => e.id === encounterId);
    const override = weights.encounterOverrides[encounterId] ?? {};
    const rec = recommendPreBattleLoadout(input, weights, encounter?.playerGeneralId, override);
    if (!encounter) rec.issues.unshift('UNKNOWN_ENCOUNTER');
    return rec;
}
