// @spec-source → 治理模式他國AI系統.md（doc_spec_0020）E-1、E-2、E-3、E-5、E-7、E-12；PROG-2-1087、PROG-2-1502、PROG-2-1503
/**
 * RivalNations — 他國 AI 勢力的純邏輯：勢力清單、與玩家的邦交、外交指令、季度行動、自動模擬戰鬥。
 * 不依賴 cc；狀態是可序列化的純資料，所有函式都回傳新狀態，不改輸入。
 *
 * MVP 簡化（使用者裁定 2026-10-25）：
 * - 只記「各勢力 ↔ 玩家」的邦交，勢力彼此之間的外交延後。
 * - 戰鬥不進戰場，直接用武將五維與勢力兵力自動模擬，算出勝負與結算。
 *
 * Unity 對照：像 Campaign AI 的資料層（ScriptableObject + 純 C# 規則），畫面只讀狀態、送指令。
 */

export type NationProfile =
    | 'MILITARIST' | 'DIPLOMAT' | 'GUARDIAN' | 'WARLORD'
    | 'EXPANSIONIST' | 'PASSIVE' | 'CAVALRY_LORD' | 'RAIDER';

import {
    AI_STARTING_RESOURCES, INTEL_CAP, NATION_PRIMARY_TASK, RULER_GOVERNANCE_STATS, aiGovernanceTick,
    rollRecruitQuality, shouldRecruitThisSeason, type NationResources, type RecruitQuality,
} from './RivalGovernance';
import { clampResource } from './ResourceCap';
import { SeededRandom } from './SeededRandom';
import { bondStep, type AiGeneral, type BondPair } from './RivalBonding';

export interface NationDef {
    readonly id: string;
    readonly name: string;
    /** 君主武將 id（generals.json） */
    readonly leaderId: string;
    readonly profile: NationProfile;
    readonly territories: number;
    readonly troops: number;
    /** 與玩家的初始邦交 */
    readonly relation: number;
}

/** 規格 E-1；初始邦交依 E-5「史實宿敵 -30／史實盟友 +20」，玩家家族以蜀漢舊部出身 */
export const NATION_DEFS: readonly NationDef[] = [
    { id: 'wei', name: '魏', leaderId: 'cao-cao', profile: 'MILITARIST', territories: 5, troops: 9000, relation: -30 },
    { id: 'shu', name: '蜀', leaderId: 'liu-bei', profile: 'DIPLOMAT', territories: 3, troops: 5000, relation: 20 },
    { id: 'wu', name: '吳', leaderId: 'sun-quan', profile: 'GUARDIAN', territories: 4, troops: 7000, relation: 20 },
    { id: 'lvbu', name: '呂布軍', leaderId: 'lu-bu', profile: 'WARLORD', territories: 1, troops: 4000, relation: -30 },
    { id: 'yuan', name: '袁紹軍', leaderId: 'yuan-shao', profile: 'EXPANSIONIST', territories: 4, troops: 8000, relation: 0 },
    { id: 'liuzhang', name: '劉璋軍', leaderId: 'liu-zhang', profile: 'PASSIVE', territories: 2, troops: 3000, relation: 0 },
    { id: 'mateng', name: '馬騰軍', leaderId: 'ma-teng', profile: 'CAVALRY_LORD', territories: 2, troops: 4000, relation: 0 },
    { id: 'nanman', name: '南蠻', leaderId: 'meng-huo', profile: 'RAIDER', territories: 2, troops: 3500, relation: -10 },
];

export interface NationState {
    readonly id: string;
    readonly troops: number;
    readonly territories: number;
    readonly relation: number;
    readonly allied: boolean;
    readonly atWar: boolean;
    /** 最近一次交易的季序號（E-6 每季上限，PROG-2-1358） */
    readonly tradeSeason?: number;
    /** 該季已交易次數 */
    readonly tradeCount?: number;
    /** 內政資源（RAI-01）；舊存檔缺漏時補 AI_STARTING_RESOURCES */
    readonly resources?: NationResources;
    /** 已完成的內政季數（RAI-03 招募每 2 季一次的計數） */
    readonly governedSeasons?: number;
    /** 累計招募品質數（E-7，各品質一次一名） */
    readonly recruits?: Readonly<Record<RecruitQuality, number>>;
    /** 待命池：招募後尚未結緣的武將（RAI-08，PROG-2-1507） */
    readonly roster?: readonly AiGeneral[];
    /** 已結緣的配對紀錄（RAI-08，PROG-2-1507） */
    readonly bonds?: readonly BondPair[];
}

/** 招募擲骰的獨立亂數（依勢力與季數定種子），不消耗局內亂數流，免得改動其他既有擲骰結果 */
function recruitRandom(id: string, seasons: number): () => number {
    let seed = seasons;
    for (const ch of id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
    const rng = new SeededRandom(seed);
    return () => rng.next();
}

export const EMPTY_RECRUITS: Readonly<Record<RecruitQuality, number>> = Object.freeze({ S: 0, A: 0, B: 0, C: 0 });

export interface RivalWorld {
    readonly nations: readonly NationState[];
}

export type RelationTier = 'ally' | 'friendly' | 'neutral' | 'cold' | 'hostile' | 'nemesis';

export const RELATION_TIER_LABEL: Readonly<Record<RelationTier, string>> = {
    ally: '同盟', friendly: '友好', neutral: '中立', cold: '冷淡', hostile: '敵對', nemesis: '宿敵',
};

/** 送禮花費與邦交增加（規格 +10~+30 依價值，MVP 固定一檔） */
export const GIFT_GOLD_COST = 1000;
export const GIFT_RELATION_GAIN = 15;
export const ALLIANCE_MIN_RELATION = 40;
export const ALLIANCE_RELATION_GAIN = 30;
/** 每季邦交向 0 回歸 */
export const RELATION_DRIFT = 2;

const clampRelation = (value: number): number => Math.max(-100, Math.min(100, Math.round(value)));

export function createRivalWorld(defs: readonly NationDef[] = NATION_DEFS): RivalWorld {
    return {
        nations: defs.map((def) => ({
            id: def.id, troops: def.troops, territories: def.territories,
            relation: def.relation, allied: false, atWar: false, resources: { ...AI_STARTING_RESOURCES },
            governedSeasons: 0, recruits: { ...EMPTY_RECRUITS }, roster: [], bonds: [],
        })),
    };
}

export function nationDef(id: string): NationDef | undefined {
    return NATION_DEFS.find((def) => def.id === id);
}

export function relationTier(nation: Pick<NationState, 'relation' | 'allied'>): RelationTier {
    const v = nation.relation;
    if (nation.allied || v >= 80) return 'ally';
    if (v >= 40) return 'friendly';
    if (v >= 0) return 'neutral';
    if (v >= -39) return 'cold';
    if (v >= -79) return 'hostile';
    return 'nemesis';
}

function updateNation(world: RivalWorld, id: string, fn: (n: NationState) => NationState): RivalWorld {
    return { nations: world.nations.map((n) => (n.id === id ? fn(n) : n)) };
}

function findNation(world: RivalWorld, id: string): NationState {
    const nation = world.nations.find((n) => n.id === id);
    if (!nation) throw new Error(`[RivalNations] 找不到勢力 ${id}`);
    return nation;
}

export interface DiplomacyResult {
    readonly ok: boolean;
    readonly world: RivalWorld;
    /** 給玩家看的結果句 */
    readonly message: string;
    /** 這個指令花掉的金幣 */
    readonly goldSpent: number;
}

/** 送禮：花金幣提升邦交；宿敵（≤ -80）拒收 */
export function sendGift(world: RivalWorld, id: string, gold: number): DiplomacyResult {
    const nation = findNation(world, id);
    const name = nationDef(id)?.name ?? id;
    if (nation.relation <= -80) return { ok: false, world, goldSpent: 0, message: `${name} 視我方為宿敵，拒收禮物` };
    if (gold < GIFT_GOLD_COST) return { ok: false, world, goldSpent: 0, message: `金幣不足，送禮需要 ${GIFT_GOLD_COST}` };
    const next = updateNation(world, id, (n) => ({ ...n, relation: clampRelation(n.relation + GIFT_RELATION_GAIN) }));
    return { ok: true, world: next, goldSpent: GIFT_GOLD_COST, message: `向 ${name} 送禮，邦交 +${GIFT_RELATION_GAIN}` };
}

/** 結盟：邦交 ≥ 40 且不在交戰中 */
export function proposeAlliance(world: RivalWorld, id: string): DiplomacyResult {
    const nation = findNation(world, id);
    const def = nationDef(id);
    const name = def?.name ?? id;
    if (nation.allied) return { ok: false, world, goldSpent: 0, message: `已與 ${name} 結盟` };
    if (def?.profile === 'WARLORD' || def?.profile === 'RAIDER') return { ok: false, world, goldSpent: 0, message: `${name} 不與任何人結盟` };
    if (nation.atWar) return { ok: false, world, goldSpent: 0, message: `正與 ${name} 交戰，無法結盟` };
    if (nation.relation < ALLIANCE_MIN_RELATION) {
        return { ok: false, world, goldSpent: 0, message: `邦交需達 ${ALLIANCE_MIN_RELATION} 才能結盟（目前 ${nation.relation}）` };
    }
    const next = updateNation(world, id, (n) => ({ ...n, allied: true, relation: clampRelation(n.relation + ALLIANCE_RELATION_GAIN) }));
    return { ok: true, world: next, goldSpent: 0, message: `與 ${name} 結為同盟` };
}

/** 宣戰：邦交歸 -100、解除同盟、進入交戰 */
export function declareWar(world: RivalWorld, id: string): DiplomacyResult {
    findNation(world, id);
    const name = nationDef(id)?.name ?? id;
    const next = updateNation(world, id, (n) => ({ ...n, relation: -100, allied: false, atWar: true }));
    return { ok: true, world: next, goldSpent: 0, message: `向 ${name} 宣戰！` };
}

/** 各性格每季兵力成長率與對玩家發動進攻的機率（敵對以下才會打） */
const PROFILE_TUNING: Readonly<Record<NationProfile, { growth: number; attack: number }>> = {
    MILITARIST: { growth: 0.04, attack: 0.3 },
    DIPLOMAT: { growth: 0.02, attack: 0.05 },
    GUARDIAN: { growth: 0.03, attack: 0.1 },
    WARLORD: { growth: 0.05, attack: 0.5 },
    EXPANSIONIST: { growth: 0.04, attack: 0.25 },
    PASSIVE: { growth: 0.02, attack: 0 },
    CAVALRY_LORD: { growth: 0.03, attack: 0.2 },
    RAIDER: { growth: 0.03, attack: 0.2 },
};

export interface SeasonEvent {
    readonly nationId: string;
    readonly kind: 'attack';
    readonly message: string;
}

export interface SeasonTickResult {
    readonly world: RivalWorld;
    /** 本季對玩家發動的進攻（呼叫端用自動戰鬥結算） */
    readonly events: SeasonEvent[];
}

/** 季度推進：兵力成長、內政結算（RAI-03）、邦交向 0 回歸（交戰中不回歸）、敵對勢力依性格擲骰進攻玩家 */
export function advanceRivalSeason(world: RivalWorld, random: () => number): SeasonTickResult {
    const events: SeasonEvent[] = [];
    const nations = world.nations.map((n) => {
        const def = nationDef(n.id);
        const profile = def?.profile ?? 'PASSIVE';
        const tuning = PROFILE_TUNING[profile];
        const troops = Math.round(n.troops * (1 + tuning.growth));
        // 兵力傳 0 作為基底，只取內政產出的增量，封頂不會誤砍既有兵力
        const governed = aiGovernanceTick(
            { ...(n.resources ?? AI_STARTING_RESOURCES), troops: 0 },
            profile,
            [{ type: NATION_PRIMARY_TASK[profile], general: RULER_GOVERNANCE_STATS }],
        );
        let relation = n.relation;
        if (!n.atWar && !n.allied) {
            relation = relation > 0 ? Math.max(0, relation - RELATION_DRIFT) : Math.min(0, relation + RELATION_DRIFT);
        }
        const hostile = n.atWar || relation <= -40;
        if (hostile && !n.allied && random() < tuning.attack) {
            events.push({ nationId: n.id, kind: 'attack', message: `${def?.name ?? n.id} 率軍來犯！` });
        }
        const resources = { food: governed.food, gold: governed.gold, fame: governed.fame, intel: governed.intel };
        const governedSeasons = (n.governedSeasons ?? 0) + 1;
        const recruits = { ...(n.recruits ?? EMPTY_RECRUITS) };
        const roster = [...(n.roster ?? [])];
        // E-7 每 2 季招募 1 名，品質依名聲擲骰；新武將進待命池
        if (shouldRecruitThisSeason(governedSeasons)) {
            const quality = rollRecruitQuality(resources.fame, recruitRandom(n.id, governedSeasons));
            recruits[quality] += 1;
            roster.push({ id: `${n.id}-${governedSeasons}`, quality, recruitedSeason: governedSeasons });
        }
        // E-7 結緣：糧草達門檻時從待命池配對（RAI-08 最小切片）
        const bonded = bondStep(roster, n.bonds ?? [], resources.food, governedSeasons);
        return {
            ...n,
            troops: troops + governed.troops,
            relation,
            resources,
            governedSeasons,
            recruits,
            roster: bonded.roster,
            bonds: bonded.bonds,
        };
    });
    return { world: { nations }, events };
}

/** 出戰武將的戰力：五維加權（武力、統率為主） */
export interface BattleGeneral {
    readonly name: string;
    readonly str: number;
    readonly int: number;
    readonly lea: number;
}

export function generalPower(g: BattleGeneral): number {
    return Math.round((g.str ?? 0) * 0.4 + (g.lea ?? 0) * 0.4 + (g.int ?? 0) * 0.2);
}

/** 1 點戰力折合多少兵力（隊伍戰力 × 此值 = 我方等效兵力） */
export const TROOPS_PER_POWER = 80;

export interface AutoBattleResult {
    readonly win: boolean;
    readonly world: RivalWorld;
    /** 我方等效兵力與敵方兵力，給結算畫面顯示 */
    readonly playerStrength: number;
    readonly enemyStrength: number;
    readonly enemyLosses: number;
    readonly goldReward: number;
    /** 打贏且敵方領地 > 0 時奪得 1 塊領地 */
    readonly territoryGained: boolean;
    readonly lines: string[];
}

/**
 * 自動模擬戰鬥：我方等效兵力 = Σ 武將戰力 × 80 × 浮動(0.8~1.2)，敵方 = 兵力 × 浮動(0.8~1.2)。
 * 我方較高則勝：敵方損失 30% 兵力、我方得金幣、奪 1 塊領地；敗則敵方只損失 10%。
 * 開戰即視為交戰狀態（邦交 -50，最低 -100）。
 */
export function autoResolveBattle(
    world: RivalWorld,
    id: string,
    generals: readonly BattleGeneral[],
    random: () => number,
): AutoBattleResult {
    const nation = findNation(world, id);
    const name = nationDef(id)?.name ?? id;
    const power = generals.reduce((sum, g) => sum + generalPower(g), 0);
    const playerStrength = Math.round(power * TROOPS_PER_POWER * (0.8 + random() * 0.4));
    const enemyStrength = Math.round(nation.troops * (0.8 + random() * 0.4));
    const win = generals.length > 0 && playerStrength > enemyStrength;
    const enemyLosses = Math.round(nation.troops * (win ? 0.3 : 0.1));
    const territoryGained = win && nation.territories > 0;
    const goldReward = win ? 500 + Math.round(enemyLosses / 10) : 0;
    const next = updateNation(world, id, (n) => ({
        ...n,
        troops: Math.max(0, n.troops - enemyLosses),
        territories: territoryGained ? n.territories - 1 : n.territories,
        relation: clampRelation(n.relation - 50),
        allied: false,
        atWar: true,
    }));
    const lines = [
        `我方 ${generals.map((g) => g.name).join('、') || '無人出戰'}：等效兵力 ${playerStrength}`,
        `${name}：兵力 ${enemyStrength}`,
        win ? `大勝！${name} 折損 ${enemyLosses} 兵，獲得金幣 ${goldReward}${territoryGained ? '，奪下一塊領地' : ''}`
            : `敗北……${name} 僅折損 ${enemyLosses} 兵`,
    ];
    return { win, world: next, playerStrength, enemyStrength, enemyLosses, goldReward, territoryGained, lines };
}

/** 讀存檔：缺漏的勢力補初始值，未知勢力丟棄，數值夾在合法範圍 */
export function normalizeRivalWorld(raw: unknown): RivalWorld {
    const base = createRivalWorld();
    const list = Array.isArray((raw as { nations?: unknown } | null)?.nations) ? (raw as { nations: unknown[] }).nations : [];
    const saved = new Map<string, Record<string, unknown>>();
    for (const item of list) {
        if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
            saved.set((item as { id: string }).id, item as Record<string, unknown>);
        }
    }
    const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    const count = (v: unknown): number => Math.max(0, Math.floor(num(v, 0)));
    const recruitsOf = (raw: unknown): Record<RecruitQuality, number> => {
        const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        return { S: count(r.S), A: count(r.A), B: count(r.B), C: count(r.C) };
    };
    const rosterOf = (raw: unknown): AiGeneral[] => (Array.isArray(raw) ? raw : [])
        .filter((g): g is AiGeneral => !!g && typeof g.id === 'string' && ['S', 'A', 'B', 'C'].includes(g.quality))
        .map((g) => ({ id: g.id, quality: g.quality, recruitedSeason: count(g.recruitedSeason) }));
    const bondsOf = (raw: unknown): BondPair[] => (Array.isArray(raw) ? raw : [])
        .filter((b): b is BondPair => !!b && typeof b.first === 'string' && typeof b.second === 'string')
        .map((b) => ({ first: b.first, second: b.second, season: count(b.season) }));
    const resourcesOf = (raw: unknown): NationResources => {
        const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const whole = (v: unknown, fallback: number): number => Math.max(0, Math.round(num(v, fallback)));
        return {
            food: clampResource('food', whole(r.food, AI_STARTING_RESOURCES.food)),
            gold: clampResource('gold', whole(r.gold, AI_STARTING_RESOURCES.gold)),
            fame: clampResource('fame', whole(r.fame, AI_STARTING_RESOURCES.fame)),
            intel: Math.min(INTEL_CAP, whole(r.intel, AI_STARTING_RESOURCES.intel)),
        };
    };
    return {
        nations: base.nations.map((n) => {
            const s = saved.get(n.id);
            if (!s) return n;
            return {
                id: n.id,
                troops: Math.max(0, Math.round(num(s.troops, n.troops))),
                territories: Math.max(0, Math.round(num(s.territories, n.territories))),
                relation: clampRelation(num(s.relation, n.relation)),
                allied: s.allied === true,
                atWar: s.atWar === true,
                resources: resourcesOf(s.resources),
                governedSeasons: count(s.governedSeasons),
                recruits: recruitsOf(s.recruits),
                roster: rosterOf(s.roster),
                bonds: bondsOf(s.bonds),
                ...(typeof s.tradeSeason === 'number' && Number.isFinite(s.tradeSeason)
                    ? { tradeSeason: Math.floor(s.tradeSeason), tradeCount: Math.max(0, Math.floor(num(s.tradeCount, 0))) }
                    : {}),
            };
        }),
    };
}
