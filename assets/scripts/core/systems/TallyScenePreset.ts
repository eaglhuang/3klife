// @spec-source → 虎符套裝羈絆與戰場部署調配規格書 (doc_spec_0313) §2~§3（DEP-12、TERM-07，PROG-2-2005）
/**
 * TallyScenePreset — 四種戰場場景的保留槽位與兵種推薦權重，及規格版虎符出陣糧耗公式（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 城池攻防（Siege）：強制保留器械槽；步兵、盾兵、器械權重 +30%；騎兵 -20%。
 * - 開闊野戰（Plains）：無保留；騎兵、長槍 +30%；器械 -20%。
 * - 長江水戰（Naval）：強制保留水軍槽；水軍、弓兵 +30%；騎兵、盾兵 -20%。
 * - 險隘山林（Mountain）：無保留；弓兵（連弩）+30%；騎兵、器械（投石車）-20%。
 * - 出陣糧耗 = BaseCost(R100/SR200/SSR350) × (1 + 星級 × 0.15)，無條件捨去；虎符不設冷卻。
 *
 * 暫定：
 * - 規格寫的樓船、藤甲、南蠻、重騎等細分兵種，先對應到既有兵種代碼（NAVY、ARCHER、CAVALRY、SIEGE）；
 *   藤甲與南蠻是虎符特殊兵，不在一般兵種代碼內，先不加權。
 * - 既有 SortieDeploy.TALLY_GRAIN_COST 是逐星查表（R★1=20），與本規格公式（R★0=100）差距大，
 *   本檔另立 specTallyDeployGrainCost，不改既有出陣結算，待裁決統一；UR 規格未列，回 null。
 * - 既有 SCENE_PRESET_SIEGE 對應 'SCENE_SIEGE'，本檔沿用同一字串。
 * Unity 對照：像一張 ScriptableObject 場景設定表，出兵介面與 AI 依表加權排序。
 */

export type TallyScenePresetId = 'SCENE_SIEGE' | 'SCENE_PLAINS' | 'SCENE_NAVAL' | 'SCENE_MOUNTAIN';

export interface TallyScenePresetDef {
    id: TallyScenePresetId;
    name: string;
    reservedSlot: string | null;
    preferred: readonly string[];
    penalized: readonly string[];
}

export const SCENE_PREFERRED_WEIGHT = 1.3;
export const SCENE_PENALIZED_WEIGHT = 0.8;

export const TALLY_SCENE_PRESETS: Readonly<Record<TallyScenePresetId, TallyScenePresetDef>> = {
    SCENE_SIEGE: { id: 'SCENE_SIEGE', name: '城池攻防戰', reservedSlot: 'SIEGE', preferred: ['INFANTRY', 'SHIELD', 'SIEGE'], penalized: ['CAVALRY'] },
    SCENE_PLAINS: { id: 'SCENE_PLAINS', name: '開闊野戰', reservedSlot: null, preferred: ['CAVALRY', 'PIKE'], penalized: ['SIEGE'] },
    SCENE_NAVAL: { id: 'SCENE_NAVAL', name: '長江水戰', reservedSlot: 'NAVY', preferred: ['NAVY', 'ARCHER'], penalized: ['CAVALRY', 'SHIELD'] },
    SCENE_MOUNTAIN: { id: 'SCENE_MOUNTAIN', name: '險隘山林', reservedSlot: null, preferred: ['ARCHER'], penalized: ['CAVALRY', 'SIEGE'] },
};

function presetOf(id: string | null | undefined): TallyScenePresetDef | null {
    return id && Object.prototype.hasOwnProperty.call(TALLY_SCENE_PRESETS, id) ? TALLY_SCENE_PRESETS[id as TallyScenePresetId] : null;
}

/** 兵種在該場景的部署權重：推薦 1.3、限制 0.8、其餘或無場景 1。 */
export function sceneUnitWeight(presetId: string | null | undefined, unitType: string): number {
    const p = presetOf(presetId);
    if (!p) return 1;
    const t = unitType.toUpperCase();
    if (p.preferred.includes(t)) return SCENE_PREFERRED_WEIGHT;
    if (p.penalized.includes(t)) return SCENE_PENALIZED_WEIGHT;
    return 1;
}

/** 場景強制保留的槽位兵種；沒有則 null。 */
export function sceneReservedSlot(presetId: string | null | undefined): string | null {
    return presetOf(presetId)?.reservedSlot ?? null;
}

/** 出陣編成是否滿足場景保留槽位。 */
export function meetsSceneReservation(presetId: string | null | undefined, unitTypes: readonly string[]): boolean {
    const slot = sceneReservedSlot(presetId);
    return slot === null || unitTypes.some((t) => t.toUpperCase() === slot);
}

/** 依場景權重排序候選兵種（權重高者在前，同權重保持原順序）。 */
export function rankUnitsForScene(presetId: string | null | undefined, unitTypes: readonly string[]): string[] {
    return unitTypes
        .map((t, i) => ({ t, i, w: sceneUnitWeight(presetId, t) }))
        .sort((a, b) => b.w - a.w || a.i - b.i)
        .map((x) => x.t);
}

export const SPEC_TALLY_BASE_GRAIN: Readonly<Record<string, number>> = { R: 100, SR: 200, SSR: 350 };
export const SPEC_TALLY_STAR_GRAIN_RATE = 0.15;

/** 規格版出陣糧耗：BaseCost × (1 + 星 × 0.15) 捨去；未列品質回 null。 */
export function specTallyDeployGrainCost(rarity: string, star: number): number | null {
    const base = SPEC_TALLY_BASE_GRAIN[rarity];
    if (base === undefined) return null;
    const s = Math.max(0, Math.floor(Number.isFinite(star) ? star : 0));
    return Math.floor(Math.round(base * (1 + s * SPEC_TALLY_STAR_GRAIN_RATE) * 1e6) / 1e6);
}

/** 糧草是否足夠出陣。 */
export function canAffordTallyDeploy(food: number, cost: number | null): boolean {
    return cost !== null && food >= cost;
}
