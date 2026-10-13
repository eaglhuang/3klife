// @spec-source → 俘虜處理系統.md (doc_spec_0021) §A 傭兵豁免、§F 勸降率 / 招募消耗 / 放走回報 / 監獄產出、§I POW_Record、覆寫裁定（招募扣城市兵源）；Q74 試用傭兵絕對豁免
/**
 * PrisonerOfWar — 俘虜產生與四選一處置（純邏輯，不依賴 cc）
 *
 * 流程：
 *   1. 戰勝後 createPowRecord()：敗將變成 POW_Record（試用傭兵絕對豁免，回傳 null）。
 *      Record 內預先算好四個選項的成功率 / 消耗 / 產出 / 名聲，給四選一彈窗直接顯示。
 *   2. resolvePowDecision()：勸降擲骰、招募檢查黃金與城市兵源、無期徒刑檢查監獄格數、放走得名聲。
 *   3. 每季 prisonYieldOneSeason()：關押中的俘虜產出情報與資源。
 *
 * 全部是純函式；黃金錢包、名冊、城市兵源由 GameSession / UI 依結果寫回。
 *
 * Unity 對照：像戰後的 LootTable + DialogChoice：Record 是 ScriptableObject 快照，
 * Resolve() 只回傳結果結構，由 Presenter 決定怎麼改存檔與播動畫。
 */

export type PowDecision = 'persuade' | 'recruit' | 'imprison' | 'release';
export type PowRarity = 'R' | 'SR' | 'SSR';

/** 產生俘虜需要的最小武將資料 */
export interface PowTarget {
    id: string;
    name: string;
    cha?: number;
    luk?: number;
    int?: number;
    pol?: number;
    loyalty?: number | null;
    rarityTier?: string;
    hiddenFlags?: readonly string[];
    isMercenary?: boolean;
    templateFlag?: string;
}

export interface PowPersuader {
    cha?: number;
    luk?: number;
}

export interface PowOptions {
    /** 勸降成功率（0~100，%） */
    persuadeRate: number;
    recruitCost: { gold: number; troops: number };
    prisonYield: { intel: number; resource: number };
    releaseFame: number;
}

export interface PowRecord {
    targetUid: string;
    targetName: string;
    rarity: PowRarity;
    options: PowOptions;
    decision: PowDecision | null;
}

// ── 常數 ───────────────────────────────────────────────────────────────────

export const PERSUADE_BASE_RATE = 20;
/** 勸降率上下限（暫定：規格沒寫，避免必成或必敗） */
export const PERSUADE_RATE_MIN = 1;
export const PERSUADE_RATE_MAX = 95;
/** 俘虜沒有忠誠度資料時的預設（暫定） */
export const DEFAULT_TARGET_LOYALTY = 60;

export const RECRUIT_COST: Readonly<Record<PowRarity, { gold: number; troops: number }>> = {
    R: { gold: 500, troops: 200 },
    SR: { gold: 2000, troops: 500 },
    SSR: { gold: 8000, troops: 1500 },
};

/** 放走名聲 = Rarity × 100；以 POW_Record 範例（SSR → 500）推回 R=1、SR=3、SSR=5（暫定） */
export const RELEASE_FAME: Readonly<Record<PowRarity, number>> = { R: 100, SR: 300, SSR: 500 };
/** 放走後未來主動來投的機率（規格 5%） */
export const FUTURE_RETURN_CHANCE = 0.05;

/** 監獄初始格數（規格 3，付費可擴到 10） */
export const PRISON_SLOTS_INITIAL = 3;
export const PRISON_SLOTS_MAX = 10;

/** 試用傭兵旗標（傭兵系統 Template.Flag） */
export const MERC_TRIAL_FLAG = 'MERC_TRIAL';

// ── 產生 ───────────────────────────────────────────────────────────────────

/** 遊戲 rarityTier → 俘虜稀有度：legendary=SSR、epic=SR、其餘 R（暫定） */
export function powRarityOf(rarityTier: string | undefined): PowRarity {
    const tier = (rarityTier ?? '').toLowerCase();
    if (tier === 'legendary' || tier === 'ssr' || tier === 'ur') return 'SSR';
    if (tier === 'epic' || tier === 'sr') return 'SR';
    return 'R';
}

/** 試用傭兵（MERC-06 / Q74）：出戰不寫入永久紀錄（精力、戰績、功勳），戰敗必定安全撤退、不可被俘 */
export function isTrialMercenary(target: PowTarget): boolean {
    return Boolean(target.isMercenary)
        || target.templateFlag === MERC_TRIAL_FLAG
        || (target.hiddenFlags ?? []).includes(MERC_TRIAL_FLAG);
}

/** 試用傭兵（Q74）：戰敗必定安全撤退，不可被俘 */
export function isPowExempt(target: PowTarget): boolean {
    return isTrialMercenary(target);
}

function num(value: number | null | undefined, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Persuade_Rate = 20% + (說客 CHR − 俘虜 CHR) × 0.5 + 說客 LUK × 0.2% − 俘虜忠誠 × 0.3% + 道具加成；夾在 1%~95%。
 * 回傳百分比（保留一位小數）。
 */
export function persuadeRate(persuader: PowPersuader, target: PowTarget, itemBonus = 0): number {
    const chrBonus = (num(persuader.cha) - num(target.cha)) * 0.5;
    const lukBonus = num(persuader.luk) * 0.2;
    const loyaltyPenalty = num(target.loyalty, DEFAULT_TARGET_LOYALTY) * 0.3;
    const raw = PERSUADE_BASE_RATE + chrBonus + lukBonus - loyaltyPenalty + num(itemBonus);
    return Math.round(Math.max(PERSUADE_RATE_MIN, Math.min(PERSUADE_RATE_MAX, raw)) * 10) / 10;
}

/** 監獄每季：情報 = INT × 0.1、資源 = 50 + POL × 0.5（取整） */
export function prisonYieldOf(target: PowTarget): { intel: number; resource: number } {
    return { intel: Math.floor(num(target.int) * 0.1), resource: Math.floor(50 + num(target.pol) * 0.5) };
}

/** 戰勝後敗將 → POW_Record；試用傭兵回傳 null */
export function createPowRecord(target: PowTarget, persuader: PowPersuader, itemBonus = 0): PowRecord | null {
    if (isPowExempt(target)) return null;
    const rarity = powRarityOf(target.rarityTier);
    return {
        targetUid: target.id,
        targetName: target.name,
        rarity,
        options: {
            persuadeRate: persuadeRate(persuader, target, itemBonus),
            recruitCost: { ...RECRUIT_COST[rarity] },
            prisonYield: prisonYieldOf(target),
            releaseFame: RELEASE_FAME[rarity],
        },
        decision: null,
    };
}

// ── 處置 ───────────────────────────────────────────────────────────────────

export type PowFailReason = 'PERSUADE_FAILED' | 'GOLD_SHORT' | 'CITY_TROOPS_SHORT' | 'PRISON_FULL' | 'ALREADY_DECIDED';

export interface PowResolveContext {
    /** 0~1 的亂數（勸降擲骰用；可注入） */
    random: () => number;
    gold: number;
    cityTroops: number;
    prisonUsed: number;
    prisonSlots?: number;
}

export interface PowResolution {
    decision: PowDecision;
    ok: boolean;
    reasons: PowFailReason[];
    /** 俘虜加入麾下（勸降成功或招募） */
    joined: boolean;
    imprisoned: boolean;
    released: boolean;
    goldSpent: number;
    cityTroopsSpent: number;
    fameGained: number;
    /** 勸降擲出的值（0~100），方便 UI 與測試 */
    roll?: number;
    record: PowRecord;
}

function resolved(record: PowRecord, decision: PowDecision, patch: Partial<PowResolution>): PowResolution {
    const ok = (patch.reasons ?? []).length === 0;
    return {
        decision,
        ok,
        reasons: [],
        joined: false,
        imprisoned: false,
        released: false,
        goldSpent: 0,
        cityTroopsSpent: 0,
        fameGained: 0,
        ...patch,
        // 勸降失敗也算做過決定（俘虜寧死不屈，後續可改關押或放走）；資源不足或已處置則 record 不變
        record: ok || patch.roll !== undefined ? { ...record, decision } : record,
    };
}

/**
 * 四選一處置。資源不足（黃金 / 城市兵源 / 監獄）時不扣任何東西、record 保持未決定，UI 可讓玩家改選；
 * 勸降失敗會記下決定（不能重擲），俘虜仍在手上，可再選關押或放走。
 */
export function resolvePowDecision(record: PowRecord, decision: PowDecision, ctx: PowResolveContext): PowResolution {
    if (record.decision !== null && record.decision !== 'persuade') {
        return resolved(record, decision, { reasons: ['ALREADY_DECIDED'] });
    }
    if (record.decision === 'persuade' && decision === 'persuade') {
        return resolved(record, decision, { reasons: ['ALREADY_DECIDED'] });
    }
    switch (decision) {
        case 'persuade': {
            const roll = Math.round(ctx.random() * 1000) / 10;
            const success = roll < record.options.persuadeRate;
            return resolved(record, decision, success ? { joined: true, roll } : { reasons: ['PERSUADE_FAILED'], roll });
        }
        case 'recruit': {
            const { gold, troops } = record.options.recruitCost;
            const reasons: PowFailReason[] = [];
            if (ctx.gold < gold) reasons.push('GOLD_SHORT');
            if (ctx.cityTroops < troops) reasons.push('CITY_TROOPS_SHORT');
            if (reasons.length > 0) return resolved(record, decision, { reasons });
            return resolved(record, decision, { joined: true, goldSpent: gold, cityTroopsSpent: troops });
        }
        case 'imprison': {
            const slots = ctx.prisonSlots ?? PRISON_SLOTS_INITIAL;
            if (ctx.prisonUsed >= slots) return resolved(record, decision, { reasons: ['PRISON_FULL'] });
            return resolved(record, decision, { imprisoned: true });
        }
        case 'release':
        default:
            return resolved(record, 'release', { released: true, fameGained: record.options.releaseFame });
    }
}

// ── 監獄 ───────────────────────────────────────────────────────────────────

export interface PrisonEntry {
    targetUid: string;
    targetName: string;
    imprisonedSeason: number;
    yieldPerSeason: { intel: number; resource: number };
}

/** 關押中的俘虜每季產出合計 */
export function prisonYieldOneSeason(prisoners: readonly PrisonEntry[]): { intel: number; resource: number } {
    return prisoners.reduce(
        (sum, p) => ({ intel: sum.intel + p.yieldPerSeason.intel, resource: sum.resource + p.yieldPerSeason.resource }),
        { intel: 0, resource: 0 },
    );
}

// ── 字串（俘虜處理 §G / §H） ────────────────────────────────────────────────

export function powOptionLabels(record: PowRecord): Record<PowDecision, string> {
    return {
        persuade: `勸降（成功率 ${record.options.persuadeRate}%）`,
        recruit: `招募（消耗 ${record.options.recruitCost.gold} 黃金 + ${record.options.recruitCost.troops} 城市兵源）`,
        imprison: '無期徒刑（每季獲得情報）',
        release: `放走（獲得 ${record.options.releaseFame} 名聲）`,
    };
}

export const POW_FAIL_TEXT: Readonly<Record<PowFailReason, string>> = {
    PERSUADE_FAILED: '勸降失敗…寧死不屈。',
    GOLD_SHORT: '黃金不足',
    CITY_TROOPS_SHORT: '城市兵源不足',
    PRISON_FULL: '監獄已滿',
    ALREADY_DECIDED: '此俘虜已處置',
};

export function powResultLine(resolution: PowResolution): string {
    const name = resolution.record.targetName;
    if (!resolution.ok) return resolution.reasons.map((r) => (r === 'PERSUADE_FAILED' ? `${name}：寧死不降！` : POW_FAIL_TEXT[r])).join('、');
    switch (resolution.decision) {
        case 'persuade': return `${name}：主公仁義，${name} 願效死命！`;
        case 'recruit': return `以金帛厚禮招攬 ${name}，${name} 勉強就範。`;
        case 'imprison': return `${name} 被投入大牢，每日審訊取得情報。`;
        case 'release':
        default: return `主公義釋 ${name}，${name}：此恩必報！`;
    }
}

// ── 存檔狀態 ───────────────────────────────────────────────────────────────

/** 待處置的俘虜：record + 被俘當下的武將資料（加入麾下時寫進名冊） */
export interface PendingPrisoner<T = unknown> {
    record: PowRecord;
    target: T;
}

export interface PrisonState<T = unknown> {
    pending: PendingPrisoner<T>[];
    prisoners: PrisonEntry[];
    slots: number;
    /** 玩家名聲（放走俘虜累積） */
    fame: number;
    /** 累積情報（監獄產出） */
    intel: number;
}

export function createPrisonState<T = unknown>(): PrisonState<T> {
    return { pending: [], prisoners: [], slots: PRISON_SLOTS_INITIAL, fame: 0, intel: 0 };
}

function nonNegInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** 舊存檔沒有欄位時回傳空監獄；壞掉的項目略過 */
export function normalizePrisonState<T = unknown>(raw: unknown): PrisonState<T> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createPrisonState<T>();
    const r = raw as Partial<PrisonState<T>>;
    const pending = Array.isArray(r.pending)
        ? r.pending.filter((p): p is PendingPrisoner<T> => Boolean(p && p.record && typeof p.record.targetUid === 'string'))
        : [];
    const prisoners = Array.isArray(r.prisoners)
        ? r.prisoners.filter((p): p is PrisonEntry => Boolean(p && typeof p.targetUid === 'string' && p.yieldPerSeason))
        : [];
    return {
        pending,
        prisoners,
        slots: Math.min(PRISON_SLOTS_MAX, Math.max(PRISON_SLOTS_INITIAL, nonNegInt(r.slots, PRISON_SLOTS_INITIAL))),
        fame: nonNegInt(r.fame, 0),
        intel: nonNegInt(r.intel, 0),
    };
}
