/**
 * types.ts — 武將作息與喜好引擎的型別（QLIFE-01 第 2、3.1～3.3 章，PROG-2-10213）
 *
 * 純邏輯、不依賴 Cocos。時段編號沿用規格書：1 晨、2 上午、3 午、4 下午、5 傍晚、6 夜、7 深夜。
 * Unity 對照：相當於一組 POCO／ScriptableObject 資料定義。
 */

/** 一天 7 個時段（1～7，與 life-scenes.json 的 openSlots 同一套編號）。 */
export type LifeSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type LifeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** 11 類場景標籤（規格書第 1 章）。 */
export type LifeSceneTag =
    | 'martial' | 'scholar' | 'drink' | 'family' | 'nature' | 'faith'
    | 'trade' | 'official' | 'play' | 'medical' | 'adventure';

export type LifeChronotype = 'day' | 'night';

/** 深夜（第 7 時段）仍營業的場景種類：睡覺、夜市、守夜。 */
export type LifeLateNightKind = 'sleep' | 'nightMarket' | 'watch';

// ───────────────────────── 資料檔型別 ─────────────────────────

/** life-profile.json 內單一武將。 */
export interface LifeGeneralProfile {
    homeScene?: string;
    affinityTag?: Partial<Record<LifeSceneTag, number>>;
    affinityScene?: Record<string, number>;
    chronotype?: LifeChronotype;
    sociability?: number;
    stubbornness?: number;
    /** 送禮偏好：標籤 id（如 tag_wine），不存中文。 */
    likes?: string[];
    dislikes?: string[];
    /** 在某場景預設拿的物品（搶物品標的）。 */
    props?: Record<string, string>;
}

export interface LifeProfileFile {
    schema: 'life-profile.v1';
    generals: Record<string, LifeGeneralProfile>;
    defaults: {
        chronotype: LifeChronotype;
        sociability: number;
        stubbornness: number;
        /** 武將資料沒給的標籤喜好用此值。 */
        affinityBase: number;
        homeScene: string;
    };
}

/** 套用 defaults 之後的完整武將資料。 */
export interface ResolvedLifeProfile {
    generalId: string;
    homeScene: string;
    affinityTag: Partial<Record<LifeSceneTag, number>>;
    affinityScene: Record<string, number>;
    affinityBase: number;
    chronotype: LifeChronotype;
    sociability: number;
    stubbornness: number;
    likes: string[];
    dislikes: string[];
    props: Record<string, string>;
}

export interface LifeSceneDef {
    id: string;
    area: string;
    nameKey: string;
    tag: LifeSceneTag[];
    /** 營業時段（1～7）。 */
    openSlots: number[];
    /** 時段偏重（key 為時段字串）。 */
    slotBias?: Record<string, number>;
    /** 夜貓武將才會多待的時段（例如酒館的第 7 時段）。 */
    nightOwlSlots?: number[];
    capacity: number;
    /** 深夜仍營業的種類（只有這三類在第 7 時段有分數）。 */
    lateNightKind?: LifeLateNightKind;
    /** 相鄰場景（時段中途 10% 換去的地方）；沒填則同大圖其他場景。 */
    adjacent?: string[];
}

export interface LifeScenesFile {
    schema: 'life-scenes.v1';
    scenes: LifeSceneDef[];
}

/** 8 種因素之外另加一種「傷勢」偏好（規格 6.4.1 生活層效果）。 */
export type LifeFactorKind =
    | 'office' | 'child' | 'season' | 'mood' | 'bond' | 'friendship'
    | 'worldEvent' | 'faction' | 'injury';

export type LifeWorldEvent = 'war' | 'plague' | 'harvest' | 'disaster';

export type LifeFaction = 'wei' | 'shu' | 'wu' | 'neutral';

export type LifeDynamicScenes =
    | 'workScenes' | 'bondScenes' | 'bondSharedScenes' | 'lordScenes' | 'avoidLordScenes';

export type LifeFactorCondition =
    | { kind: 'office'; change: 'promoted' | 'demoted' }
    | { kind: 'child'; nursing: boolean }
    | { kind: 'season'; season: LifeSeason }
    | { kind: 'moodAbove'; value: number }
    | { kind: 'moodBelow'; value: number }
    | { kind: 'angry' }
    | { kind: 'bond' }
    | { kind: 'friendshipAtLeast'; value: number }
    | { kind: 'friendshipAtMost'; value: number }
    | { kind: 'worldEvent'; event: LifeWorldEvent }
    | { kind: 'faction'; faction: LifeFaction }
    | { kind: 'injured' };

export interface LifeFactorEffect {
    scenes?: string[];
    areas?: string[];
    tags?: LifeSceneTag[];
    /** 動態場景集合（由狀態提供：工作地點、羈絆者所在地、主角常去地…）。 */
    dynamic?: LifeDynamicScenes;
    /** 只在這些時段生效；沒填＝全時段。 */
    slots?: number[];
    delta?: number;
    /** 每單位心情的調整（乘以 |mood|）。 */
    perMood?: number;
}

export interface LifeFactorRule {
    id: string;
    factor: LifeFactorKind;
    when: LifeFactorCondition;
    /** 漸退季數：效果 ×(1 − 已過季數/fadeQuarters)。 */
    fadeQuarters?: number;
    effects: LifeFactorEffect[];
}

export interface LifeFactorsFile {
    schema: 'life-factors.v1';
    /** 加權抽籤指數 k（規格 2.3：1.6）。 */
    drawExponent: number;
    /** 目前所在地加成（懶得動）。 */
    currentSceneBonus: number;
    /** 最近 2 個時段去過的扣分。 */
    recentScenePenalty: number;
    /** 時段中途換到相鄰場景的機率。 */
    adjacentMoveChance: number;
    /** 愛湊熱鬧加成滿額分數（人數滿載時）。 */
    sociabilityWeight: number;
    /** 深夜回家睡覺（homeScene）的加成。 */
    homeSleepBonus: number;
    /** 夜貓／日行對各時段的乘數（key 為時段字串）。 */
    chronotypeSlotFit: Record<LifeChronotype, Record<string, number>>;
    /** 占用種類預設的地點（占用資料沒給地點時用）。key 為 `kind` 或 `kind:sub`。 */
    occupancyDefaultScene: Record<string, string>;
    rules: LifeFactorRule[];
}

export interface LifeRosterEntry {
    id: string;
    kind: 'retainer' | 'visitor';
    faction: LifeFaction;
}

export interface LifeRosterFile {
    schema: 'life-roster.v1';
    /** 生活層看得到的武將類別（使用者 11/28 裁決：家臣＋本城訪客）。 */
    includeKinds: Array<'retainer' | 'visitor'>;
    generals: LifeRosterEntry[];
}

/** 引擎吃的整包資料。 */
export interface LifeData {
    profiles: LifeProfileFile;
    factors: LifeFactorsFile;
    scenes: LifeScenesFile;
    roster: LifeRosterFile;
}

// ───────────────────────── 執行期狀態 ─────────────────────────

/** 人員占用（只讀，來源是人員占用框架 doc_spec_1248）。 */
export interface LifeOccupancy {
    kind: string;
    sub?: string;
    /** 占用決定的地點；沒給就查 occupancyDefaultScene。 */
    sceneId?: string;
}

/** 單一武將在某時段的世界狀態。 */
export interface LifeGeneralState {
    generalId: string;
    faction: LifeFaction;
    occupancy?: LifeOccupancy | null;
    officeChange?: { change: 'promoted' | 'demoted'; quartersAgo: number } | null;
    /** 有未滿 5 歲子女。 */
    childUnder5?: boolean;
    /** 哺乳期母親。 */
    nursing?: boolean;
    /** 心情 −50～+50。 */
    mood?: number;
    angry?: boolean;
    /** 羈絆者（結義、夫妻、摯友）目前所在場景。 */
    bondScenes?: string[];
    /** 與羈絆者共同愛好的場景。 */
    bondSharedScenes?: string[];
    /** 跟主角友誼值。 */
    friendship?: number;
    /** 主角常去場景（含目前所在）。 */
    lordScenes?: string[];
    worldEvents?: LifeWorldEvent[];
    /** 官職對應的工作場景（太守府、點將台…）。 */
    workScenes?: string[];
    /** 上一個時段所在（目前所在地）。 */
    currentScene?: string | null;
    /** 最近 2 個時段去過的場景（不含目前所在地）。 */
    recentScenes?: string[];
}

export interface LifeChooseContext {
    data: LifeData;
    state: LifeGeneralState;
    /** 季度序號（遊戲季度，1 起算：1 春 2 夏 3 秋 4 冬 5 春…）。 */
    quarter: number;
    /** 時段序號：本季內從 0 起連續累計（換季歸零）。 */
    slotSeq: number;
    /** 各場景目前人數（不含自己）；沒給視為 0。 */
    occupants?: Record<string, number>;
}

export interface LifeSceneScore {
    sceneId: string;
    score: number;
    /** 各因素加總（除錯與測試用）。 */
    factorAdjust: number;
}

export type LifeChoiceReason = 'occupied' | 'chosen' | 'fallback';

export interface LifeChoice {
    generalId: string;
    sceneId: string;
    reason: LifeChoiceReason;
}

export interface LifeSnapshot {
    quarter: number;
    slotSeq: number;
    slot: LifeSlot;
    season: LifeSeason;
    choices: Record<string, LifeChoice>;
    /** 每位武將最近 3 個時段的場景（最新在前），用來帶入「目前所在／最近去過」。 */
    trail: Record<string, string[]>;
}
