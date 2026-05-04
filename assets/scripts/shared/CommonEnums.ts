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

export enum Weather {
    Clear     = "clear",
    Rain      = "rain",
    Fog       = "fog",
    Snow      = "snow",
    Sandstorm = "sandstorm",
    Night     = "night",
}

export enum BattleTactic {
    Normal       = "normal",
    FireAttack   = "fire-attack",
    FloodAttack  = "flood-attack",
    RockSlide    = "rock-slide",
    AmbushAttack = "ambush-attack",
    NightRaid    = "night-raid",
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
}

export enum SceneName {
    Login   = "LoginScene",
    Loading = "LoadingScene",
    Lobby   = "LobbyScene",
    Battle = "BattleScene",
}
