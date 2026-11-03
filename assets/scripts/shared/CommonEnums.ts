// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
/**
 * CommonEnums.ts — 全域共享的基礎列舉
 * 
 * 放在 shared/ 目錄下，確保 core, ui, battle, shared 都能引用，
 * 且不會造成模組邊界違規。
 */

export enum Faction {
    Player = "player",
    Enemy = "enemy",
}

export enum TroopType {
    Cavalry = "cavalry",
    Infantry = "infantry",
    Shield = "shield",
    Archer = "archer",
    Pikeman = "pikeman",
    Engineer = "engineer",
    Medic = "medic",
    Navy = "navy",
}

export enum TerrainType {
    Plain = "plain",
    River = "river",
    Mountain = "mountain",
    Fortress = "fortress",
    Desert = "desert",
    Forest = "forest",
}

/** encounters.json 中的地形配置：terrain[lane][depth] */
export type TerrainGrid = TerrainType[][];

/** 戰場天氣：規格六種（戰場適性系統.md §天氣適性定義）；值即規格代碼 */
export enum Weather {
    Clear   = "SUNNY",
    Rain    = "RAINY",
    Fog     = "FOG",
    Windy   = "WINDY",
    Night   = "NIGHT",
    Thunder = "THUNDER",
}

/** 舊資料的小寫代碼；snow / sandstorm 沒有規格對應，沿用既有暫定（雨 / 大風） */
const LEGACY_WEATHER_CODES: Readonly<Record<string, Weather>> = {
    clear: Weather.Clear,
    rain: Weather.Rain,
    fog: Weather.Fog,
    night: Weather.Night,
    snow: Weather.Rain,
    sandstorm: Weather.Windy,
};

/** 把規格代碼或舊字串轉成 Weather；認不得回傳 null（PROG-2-0402） */
export function normalizeWeather(value: unknown): Weather | null {
    if (typeof value !== 'string') return null;
    const exact = (Object.values(Weather) as string[]).find((code) => code === value);
    if (exact) return exact as Weather;
    return LEGACY_WEATHER_CODES[value.toLowerCase()] ?? null;
}

export enum BattleTactic {
    Normal       = "normal",
    FireAttack   = "fire-attack",
    FloodAttack  = "flood-attack",
    RockSlide    = "rock-slide",
    AmbushAttack = "ambush-attack",
    NightRaid    = "night-raid",
    /** 攻城戰（PROG-2-1589 最小版，暫定） */
    Siege        = "siege",
}

export enum TurnPhase {
    PlayerDeploy = "player-deploy",
    AutoMove = "auto-move",
    BattleResolve = "battle-resolve",
    SpecialResolve = "special-resolve",
    TurnEnd = "turn-end",
}

export enum StatusEffect {
    Stun = "stun",
    Rooted = "rooted",
    Slow = "slow",
    Weak = "weak",
    /** 無敵（白馬銀槍·不滅）：本回合結算的傷害歸零 */
    Invincible = "invincible",
    /** 疾行（靈感戰法，PROG-2-1600 暫定）：移動力 +1 */
    Haste = "haste",
    /** 堅盾（靈感戰法，PROG-2-1600 暫定）：防禦 ×1.2 */
    Fortified = "fortified",
}

export enum SceneName {
    Login   = "LoginScene",
    Loading = "LoadingScene",
    Lobby   = "LobbyScene",
    Battle = "BattleScene",
}
