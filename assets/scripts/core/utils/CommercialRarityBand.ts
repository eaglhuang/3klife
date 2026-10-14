// @spec-source → 名詞定義文件.md「商業稀有度分層 CommercialRarityBand」（白/綠/藍/紫/金/紅/彩七色展示層，不回寫戰力）；assets/resources/data/rarity-thresholds.json §commercialRarity；PROG-2-0320（WBS TERM-02）
/**
 * CommercialRarityBand — 商業化 7 色稀有度分層（純邏輯，不依賴 cc）
 *
 * 七色是展示層：由核心 tier 加上商業加分推出顏色，只給轉蛋視覺與角色包裝用，
 * 不寫回武將的平衡 tier，也不影響戰力。
 *
 * 計算順序與 tools_node/audit-generals-commercial-balance.js 一致：
 *   基礎分（tier）+ 角色分類 + 性別 + 數值門檻 + 魅力轉換 + 適性 → 分數 → 色階 → 規則夾限（精選名單、性別上限、平均值下限）
 *
 * Unity 對照：類似 ScriptableObject 的展示等級表（ShowcaseRarityTable），
 * 表格是資料，這裡只是查表與夾限的公式。
 */

export type CommercialBand = 'white' | 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'rainbow';

export interface CommercialRarityConfig {
    order: CommercialBand[];
    labels: Record<CommercialBand, string>;
    colors: Record<CommercialBand, string>;
    baseScoreByTier: Record<string, number>;
    categoryBonus: Record<string, number>;
    genderScoreBonus: Record<string, number>;
    charismaTransform: Record<string, 'sqrt10'>;
    thresholdBonus: {
        maxStat90: number;
        maxStat95: number;
        avg570: number;
        avg580: number;
        cha90: number;
        cha95: number;
    };
    aptitudeBonus: { aOrS2: number; aOrS5: number };
    featuredBandIds: Partial<Record<CommercialBand, string[]>>;
    premiumBandsRequireFeatured: CommercialBand[];
    premiumBandFallback: CommercialBand;
    maxBandByGender: Record<string, CommercialBand>;
    bandMinAvg5ByGender: Record<string, Partial<Record<CommercialBand, number>>>;
    scoreBands: Record<CommercialBand, number>;
}

/** 計算分層需要的武將欄位（只取需要的，避免綁死整個 GeneralConfig） */
export interface CommercialBandInput {
    id: string;
    gender?: string;
    characterCategory?: string;
    str?: number;
    int?: number;
    lea?: number;
    pol?: number;
    cha?: number;
    troopAptitude?: Record<string, string>;
    terrainAptitude?: Record<string, string>;
    weatherAptitude?: Record<string, string>;
    /** 核心平衡 tier（呼叫端用 resolveRarityTier 算出） */
    tier: string;
}

export interface CommercialBandResult {
    score: number;
    band: CommercialBand;
    label: string;
    color: string;
    commercialCha: number;
    forcedBand: CommercialBand | null;
    aptitudeTotal: number;
}

/**
 * 與 rarity-thresholds.json 的 commercialRarity 區塊同值。
 * 測試會比對這份常數與 JSON 檔，兩邊改一邊漏改會直接失敗。
 */
export const DEFAULT_COMMERCIAL_RARITY_CONFIG: CommercialRarityConfig = {
    order: ['white', 'green', 'blue', 'purple', 'gold', 'red', 'rainbow'],
    labels: {
        white: '白 / 基礎',
        green: '綠 / 進階',
        blue: '藍 / 精良',
        purple: '紫 / 菁英',
        gold: '金 / 招牌',
        red: '紅 / 限定級',
        rainbow: '彩 / 旗艦級',
    },
    colors: {
        white: '#D9D9D9',
        green: '#57B857',
        blue: '#3B82F6',
        purple: '#8B5CF6',
        gold: '#F5B301',
        red: '#E5484D',
        rainbow: '#FF6AD5',
    },
    baseScoreByTier: { common: 0, rare: 2, epic: 4, legendary: 6, mythic: 8 },
    categoryBonus: { civilian: 0, general: 0, famed: 1, titled: 2, mythical: 3 },
    genderScoreBonus: { 女: 1 },
    charismaTransform: { 女: 'sqrt10' },
    thresholdBonus: { maxStat90: 0, maxStat95: 1, avg570: 0, avg580: 1, cha90: 1, cha95: 1 },
    aptitudeBonus: { aOrS2: 0, aOrS5: 0 },
    featuredBandIds: {
        gold: ['cao-cao', 'liu-bei', 'sun-quan', 'zhuge-liang', 'zhou-yu', 'guan-yu', 'zhang-fei', 'zhao-yun', 'lu-bu', 'sima-yi'],
    },
    premiumBandsRequireFeatured: ['gold', 'red', 'rainbow'],
    premiumBandFallback: 'purple',
    maxBandByGender: { 女: 'purple' },
    bandMinAvg5ByGender: { 男: { purple: 69 } },
    scoreBands: { white: 0, green: 2, blue: 4, purple: 5, gold: 9, red: 12, rainbow: 14 },
};

function rankOf(order: readonly string[], value: string): number {
    return order.indexOf(value);
}

function countAOrS(block: Record<string, string> | undefined): number {
    if (!block) return 0;
    return Object.values(block).filter((grade) => grade === 'A' || grade === 'S').length;
}

function finiteOrZero(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** 數值平衡：最高五圍與五圍平均（平均取到小數一位，與審計工具一致） */
function balanceOf(input: CommercialBandInput): { maxStat: number; avg5: number } {
    const stats = [finiteOrZero(input.str), finiteOrZero(input.int), finiteOrZero(input.lea), finiteOrZero(input.pol), finiteOrZero(input.cha)];
    const maxStat = Math.max(...stats);
    const avg5 = Number((stats.reduce((sum, value) => sum + value, 0) / stats.length).toFixed(1));
    return { maxStat, avg5 };
}

/** 魅力商業轉換：女將走 sqrt10 曲線補正，只用於商業分層，不改原始 cha */
function commercialChaOf(input: CommercialBandInput, cfg: CommercialRarityConfig): number {
    const rawCha = finiteOrZero(input.cha);
    const transform = cfg.charismaTransform[input.gender ?? ''];
    if (transform === 'sqrt10') {
        return Math.round(Math.sqrt(Math.max(0, rawCha)) * 10);
    }
    return rawCha;
}

/** 精選名單：同一人若列在多個色階，取較高者 */
function featuredBandOf(id: string, cfg: CommercialRarityConfig): CommercialBand | null {
    let best: CommercialBand | null = null;
    for (const [band, ids] of Object.entries(cfg.featuredBandIds) as Array<[CommercialBand, string[] | undefined]>) {
        if (!Array.isArray(ids) || !ids.includes(id)) continue;
        if (!best || rankOf(cfg.order, band) > rankOf(cfg.order, best)) best = band;
    }
    return best;
}

/** 分數對應色階：取分數達到門檻的最高色階 */
function bandOfScore(score: number, cfg: CommercialRarityConfig): CommercialBand {
    let result = cfg.order[0];
    for (const band of cfg.order) {
        if (score >= cfg.scoreBands[band]) result = band;
    }
    return result;
}

/** 規則夾限：精選名單直接定色；否則依高階限制、性別上限與平均值下限往下壓 */
function clampBand(
    input: CommercialBandInput,
    avg5: number,
    band: CommercialBand,
    cfg: CommercialRarityConfig,
    forcedBand: CommercialBand | null,
): CommercialBand {
    if (forcedBand) return forcedBand;

    let result = band;
    if (cfg.premiumBandsRequireFeatured.includes(result)) {
        result = cfg.premiumBandFallback;
    }

    const maxBand = cfg.maxBandByGender[input.gender ?? ''];
    if (maxBand && rankOf(cfg.order, result) > rankOf(cfg.order, maxBand)) {
        result = maxBand;
    }

    const minAvg5 = cfg.bandMinAvg5ByGender[input.gender ?? '']?.[result];
    if (typeof minAvg5 === 'number' && avg5 < minAvg5) {
        const lowerBands = cfg.order.filter((item) => rankOf(cfg.order, item) < rankOf(cfg.order, result));
        result = lowerBands[lowerBands.length - 1] ?? cfg.order[0];
    }

    return result;
}

/** 計算一位武將的商業化色階；缺欄位給安全預設，不丟錯。 */
export function resolveCommercialBand(
    input: CommercialBandInput,
    cfg: CommercialRarityConfig = DEFAULT_COMMERCIAL_RARITY_CONFIG,
): CommercialBandResult {
    const { maxStat, avg5 } = balanceOf(input);
    const category = input.characterCategory ?? 'general';
    const commercialCha = commercialChaOf(input, cfg);

    let score = cfg.baseScoreByTier[input.tier] ?? 0;
    score += cfg.categoryBonus[category] ?? 0;
    score += cfg.genderScoreBonus[input.gender ?? ''] ?? 0;
    if (maxStat >= 90) score += cfg.thresholdBonus.maxStat90;
    if (maxStat >= 95) score += cfg.thresholdBonus.maxStat95;
    if (avg5 >= 70) score += cfg.thresholdBonus.avg570;
    if (avg5 >= 80) score += cfg.thresholdBonus.avg580;
    if (commercialCha >= 90) score += cfg.thresholdBonus.cha90;
    if (commercialCha >= 95) score += cfg.thresholdBonus.cha95;

    const aptitudeTotal = countAOrS(input.troopAptitude) + countAOrS(input.terrainAptitude) + countAOrS(input.weatherAptitude);
    if (aptitudeTotal >= 2) score += cfg.aptitudeBonus.aOrS2;
    if (aptitudeTotal >= 5) score += cfg.aptitudeBonus.aOrS5;

    const forcedBand = featuredBandOf(input.id, cfg);
    const band = clampBand(input, avg5, bandOfScore(score, cfg), cfg, forcedBand);

    return {
        score,
        band,
        label: cfg.labels[band],
        color: cfg.colors[band],
        commercialCha,
        forcedBand,
        aptitudeTotal,
    };
}
