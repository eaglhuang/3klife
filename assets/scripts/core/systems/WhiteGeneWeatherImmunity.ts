// @spec-source → 白色突變因子與極端天氣環境免疫規格書 (doc_spec_0324) §1~§3（APT-10、KIN-05，PROG-2-2001）
/**
 * WhiteGeneWeatherImmunity — 四大極端天候懲罰矩陣與白色因子免疫判定（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 大雨：陸移 -1、弓射程 -1、火攻失效；大霧：視野 1、命中 -25%、被伏擊傷害 +30%；
 *   暴雪：騎移 -2、每回合凍傷 5%、士氣 -5；沙塵暴：防 -15%、遠程命中 -30%、逆風射程 -2。
 * - 對應白因子主將持有時懲罰歸 0 並給環境 Buff；副將持有時全隊享 50% 效果（懲罰減半）。
 * - 狼性狂化：免疫極端天候士氣扣減；兵力每降 20% 攻擊 +10%。
 * - 晴天、陰天不生效。
 *
 * 暫定：BattleCombatResolver 接線另卡；副將「50% 效果」解讀為懲罰減半、Buff 減半，主副將同時持有取主將。
 * Unity 對照：像 static 的 modifier 計算器，回傳要套用的數值給戰鬥系統。
 */

export type BattleWeather = 'clear' | 'cloudy' | 'heavyRain' | 'denseFog' | 'snowstorm' | 'duststorm';

export interface WeatherPenalty {
    landMove: number;
    cavalryMove: number;
    archerRange: number;
    rangedRangeUpwind: number;
    visionCap: number | null;
    hitRate: number;
    rangedHitRate: number;
    defense: number;
    ambushDamageTaken: number;
    frostbiteTroopLossRate: number;
    moraleDecay: number;
    fireDisabled: boolean;
}

const NONE: WeatherPenalty = {
    landMove: 0, cavalryMove: 0, archerRange: 0, rangedRangeUpwind: 0, visionCap: null, hitRate: 0,
    rangedHitRate: 0, defense: 0, ambushDamageTaken: 0, frostbiteTroopLossRate: 0, moraleDecay: 0, fireDisabled: false,
};

export const WEATHER_PENALTIES: Readonly<Record<BattleWeather, WeatherPenalty>> = {
    clear: NONE,
    cloudy: NONE,
    heavyRain: { ...NONE, landMove: -1, archerRange: -1, fireDisabled: true },
    denseFog: { ...NONE, visionCap: 1, hitRate: -0.25, ambushDamageTaken: 0.3 },
    snowstorm: { ...NONE, cavalryMove: -2, frostbiteTroopLossRate: 0.05, moraleDecay: 5 },
    duststorm: { ...NONE, defense: -0.15, rangedHitRate: -0.3, rangedRangeUpwind: -2 },
};

export const WEATHER_IMMUNITY_GENE: Readonly<Partial<Record<BattleWeather, string>>> = {
    heavyRain: 'gene_rain_master',
    denseFog: 'gene_fog_seer',
    snowstorm: 'gene_snow_endure',
    duststorm: 'gene_sand_stalker',
};

export const WOLF_FERAL_GENE = 'gene_wolf_feral';
export const DEPUTY_EFFECT_RATIO = 0.5;
export const FOG_SEER_VISION = 3;

export interface WeatherBuff {
    attack: number;
    defense: number;
    critRate: number;
}

export interface WeatherResolution {
    penalty: WeatherPenalty;
    buff: WeatherBuff;
    immunity: 'main' | 'deputy' | 'none';
}

const ENV_BUFF: Readonly<Partial<Record<BattleWeather, WeatherBuff>>> = {
    heavyRain: { attack: 0.15, defense: 0.15, critRate: 0 },
    snowstorm: { attack: 0, defense: 0.2, critRate: 0 },
    duststorm: { attack: 0, defense: 0, critRate: 0.2 },
};

const ZERO_BUFF: WeatherBuff = { attack: 0, defense: 0, critRate: 0 };

function scalePenalty(p: WeatherPenalty, ratio: number): WeatherPenalty {
    const r = (v: number) => Math.round(v * ratio * 1e6) / 1e6;
    return {
        landMove: r(p.landMove), cavalryMove: r(p.cavalryMove), archerRange: r(p.archerRange),
        rangedRangeUpwind: r(p.rangedRangeUpwind), visionCap: p.visionCap, hitRate: r(p.hitRate),
        rangedHitRate: r(p.rangedHitRate), defense: r(p.defense), ambushDamageTaken: r(p.ambushDamageTaken),
        frostbiteTroopLossRate: r(p.frostbiteTroopLossRate), moraleDecay: r(p.moraleDecay),
        fireDisabled: p.fireDisabled && ratio > 0,
    };
}

/** 依主將／副將白色因子結算當前天候的懲罰與 Buff。 */
export function resolveWeatherForArmy(weather: BattleWeather, mainGenes: readonly string[], deputyGenes: readonly string[]): WeatherResolution {
    const base = WEATHER_PENALTIES[weather];
    const gene = WEATHER_IMMUNITY_GENE[weather];
    let penalty = base;
    let buff = ZERO_BUFF;
    let immunity: WeatherResolution['immunity'] = 'none';
    if (gene && mainGenes.includes(gene)) {
        penalty = { ...scalePenalty(base, 0), visionCap: weather === 'denseFog' ? FOG_SEER_VISION : null, fireDisabled: false };
        buff = ENV_BUFF[weather] ?? ZERO_BUFF;
        immunity = 'main';
    } else if (gene && deputyGenes.includes(gene)) {
        penalty = scalePenalty(base, 1 - DEPUTY_EFFECT_RATIO);
        const b = ENV_BUFF[weather] ?? ZERO_BUFF;
        buff = { attack: b.attack * DEPUTY_EFFECT_RATIO, defense: b.defense * DEPUTY_EFFECT_RATIO, critRate: b.critRate * DEPUTY_EFFECT_RATIO };
        immunity = 'deputy';
    }
    if (weather !== 'clear' && weather !== 'cloudy' && mainGenes.includes(WOLF_FERAL_GENE)) {
        penalty = { ...penalty, moraleDecay: 0 };
    }
    return { penalty, buff, immunity };
}

/** 狼性狂化：兵力每降 20% 攻擊 +10%。 */
export function wolfFeralAttackBonus(currentTroops: number, maxTroops: number): number {
    if (maxTroops <= 0) return 0;
    const lostRatio = Math.max(0, Math.min(1, 1 - currentTroops / maxTroops));
    return Math.floor(Math.round(lostRatio * 1e6) / 2e5) / 10;
}
