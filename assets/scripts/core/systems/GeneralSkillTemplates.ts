// @spec-source → 戰法系統.md；武將技能補齊方案 PROG-2-10240（skill-data-plan §2、§3）；PROG-2-10246
/**
 * GeneralSkillTemplates — 武將天生戰法／奧義的「模板＋覆寫」解析（純函式，不依賴 cc）
 *
 * 資料：data/master/general-skill-templates.json（模板，批量套用）、general-skill-overrides.json（專屬覆寫）。
 * 優先序：覆寫 > 模板 > 武將原本的天生戰法（只在模板選不出時墊底）。
 * 持有人數上限：每種戰法（battleSkillId）、每種奧義，持有人數不得超過武將總數的 capRatio（預設 15%）。
 * 特效與音效由 battleSkillId 自動對應，本模組不碰；招式數值沿用既有招式 profile。
 *
 * Unity 對照：像 ScriptableObject 的 Loadout 規則表，輸入角色屬性、輸出技能欄位。
 */

export type SkillTemplateStat = 'str' | 'int' | 'lea' | 'pol' | 'cha';

export interface SkillTemplateMatch {
    role?: string[];
    gender?: string[];
    /** 最高屬性（str/int/lea/pol/cha，同分依此順序） */
    topStat?: SkillTemplateStat;
    minStat?: Partial<Record<SkillTemplateStat, number>>;
    /** 只有這個兵種是 A（含 S），其他兵種都不是 A */
    troopUniqueA?: string;
}

export interface SkillTemplateSlots {
    tactic1: string[];
    tactic2: string[];
    ultimate: string[];
}

export interface GeneralSkillTemplate {
    templateId: string;
    name: string;
    priority: number;
    match: SkillTemplateMatch;
    /** 各欄位候選：放 battleSkillId，依武將代號雜湊輪轉起點後取第一個「未滿員」者 */
    slots: SkillTemplateSlots;
}

export interface GeneralSkillTemplatesData {
    version: number;
    /** 每種戰法／奧義的持有人數上限比例 */
    capRatio: number;
    /** 奧義最低稀有度（含）；低於此的武將不補奧義 */
    ultimateMinRarity: string;
    /** 模板選不出來（候選全滿或重複）時的後備戰法池 */
    fallbackTactics: string[];
    fallbackUltimates: string[];
    templates: GeneralSkillTemplate[];
}

export interface GeneralSkillOverride {
    tactic1?: string;
    tactic2?: string;
    ultimate?: string;
}

export interface GeneralSkillOverridesData {
    version: number;
    overrides: Record<string, GeneralSkillOverride>;
}

/** 解析器需要的武將欄位（generals-base／generals.json 都滿足） */
export interface SkillTemplateGeneral {
    id: string;
    gender?: string;
    role?: string;
    rarityTier?: string;
    str?: number; int?: number; lea?: number; pol?: number; cha?: number;
    troopAptitude?: Record<string, string>;
    tacticSlots?: Array<{ tacticId: string }>;
    ultimateSlots?: Array<{ ultimateId: string }>;
}

export interface GeneralSkillResolution {
    generalId: string;
    templateId: string;
    /** battleSkillId（戰法 1、2） */
    tacticSkills: string[];
    /** 沿用既有奧義、或補奧義的 battleSkillId；沒有奧義為 null */
    ultimateSkill: string | null;
    /** true = 沿用武將原有奧義（不動 ultimateSlots） */
    keepsExistingUltimate: boolean;
}

export interface GeneralSkillResolveContext {
    /** 武將原有奧義 id → battleSkillId（只用來統計持有人數，查不到視為未知） */
    existingUltimateSkillOf: (ultimateId: string) => string | null | undefined;
    /** 原有戰法 id → battleSkillId（墊底用） */
    existingTacticSkillOf: (tacticId: string) => string | null | undefined;
    /** battleSkillId 是否可當戰法／奧義（存在且非殼） */
    isCastableSkill: (skillId: string) => boolean;
}

export const GENERAL_SKILL_CAP_RATIO = 0.15;
const RARITY_RANK: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
const STAT_ORDER: SkillTemplateStat[] = ['str', 'int', 'lea', 'pol', 'cha'];

export function rarityRankOf(tier: string | undefined): number {
    return RARITY_RANK[tier ?? ''] ?? 0;
}

export function topStatOf(g: SkillTemplateGeneral): SkillTemplateStat {
    let best: SkillTemplateStat = 'str';
    for (const s of STAT_ORDER) if ((g[s] ?? 0) > (g[best] ?? 0)) best = s;
    return best;
}

function isTroopA(grade: string | undefined): boolean {
    return grade === 'A' || grade === 'S';
}

export function matchesTemplate(g: SkillTemplateGeneral, m: SkillTemplateMatch): boolean {
    if (m.role && !m.role.includes(g.role ?? '')) return false;
    if (m.gender && !m.gender.includes(g.gender ?? '')) return false;
    if (m.topStat && topStatOf(g) !== m.topStat) return false;
    if (m.minStat) {
        for (const [stat, min] of Object.entries(m.minStat)) {
            if ((g[stat as SkillTemplateStat] ?? 0) < (min ?? 0)) return false;
        }
    }
    if (m.troopUniqueA) {
        const aTroops = Object.entries(g.troopAptitude ?? {}).filter(([, grade]) => isTroopA(grade)).map(([k]) => k);
        if (aTroops.length !== 1 || aTroops[0] !== m.troopUniqueA) return false;
    }
    return true;
}

/** 依 priority 大者先中；全部不中時回傳 null（資料應含一個空 match 的兜底模板，所以正常不會 null） */
export function matchTemplate(g: SkillTemplateGeneral, templates: readonly GeneralSkillTemplate[]): GeneralSkillTemplate | null {
    const sorted = [...templates].sort((a, b) => b.priority - a.priority);
    return sorted.find((t) => matchesTemplate(g, t.match)) ?? null;
}

function hashOf(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

/** 持有人數上限（無條件捨去，至少 1） */
export function skillHoldCap(total: number, ratio = GENERAL_SKILL_CAP_RATIO): number {
    return Math.max(1, Math.floor(total * ratio));
}

function pickFromRing(pool: readonly string[], seed: string, ok: (skill: string) => boolean): string | null {
    if (pool.length === 0) return null;
    const start = hashOf(seed) % pool.length;
    for (let i = 0; i < pool.length; i++) {
        const skill = pool[(start + i) % pool.length];
        if (ok(skill)) return skill;
    }
    return null;
}

/**
 * 全武將一次解析。處理順序：有覆寫者先（先佔名額）→ 稀有度高者 → 資料順序，確保結果可重現。
 * 每位至少 2 個不同的天生戰法；奧義只補「稀有度 ≥ ultimateMinRarity 且原本沒有奧義」者。
 */
export function resolveAllGeneralSkills(
    generals: readonly SkillTemplateGeneral[],
    templates: GeneralSkillTemplatesData,
    overrides: GeneralSkillOverridesData,
    ctx: GeneralSkillResolveContext,
): Map<string, GeneralSkillResolution> {
    const cap = skillHoldCap(generals.length, templates.capRatio);
    const minUltRank = rarityRankOf(templates.ultimateMinRarity);
    const tacticCount = new Map<string, number>();
    const ultimateCount = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string): void => { m.set(k, (m.get(k) ?? 0) + 1); };
    const room = (m: Map<string, number>, k: string): boolean => (m.get(k) ?? 0) < cap;

    const indexed = generals.map((g, i) => ({ g, i }));
    indexed.sort((a, b) => {
        const oa = overrides.overrides[a.g.id] ? 0 : 1;
        const ob = overrides.overrides[b.g.id] ? 0 : 1;
        if (oa !== ob) return oa - ob;
        const ra = rarityRankOf(b.g.rarityTier) - rarityRankOf(a.g.rarityTier);
        return ra !== 0 ? ra : a.i - b.i;
    });

    const out = new Map<string, GeneralSkillResolution>();
    for (const { g } of indexed) {
        const tpl = matchTemplate(g, templates.templates);
        const ov = overrides.overrides[g.id] ?? {};
        const castable = (s: string): boolean => ctx.isCastableSkill(s);

        const tactics: string[] = [];
        const take = (slotName: 'tactic1' | 'tactic2', forced: string | undefined): void => {
            const ok = (s: string): boolean => castable(s) && !tactics.includes(s) && room(tacticCount, s);
            let skill: string | null = forced && castable(forced) && !tactics.includes(forced) ? forced : null;
            if (!skill && tpl) skill = pickFromRing(tpl.slots[slotName], `${g.id}|${slotName}`, ok);
            if (!skill) skill = pickFromRing(templates.fallbackTactics, `${g.id}|${slotName}|fb`, ok);
            if (!skill) {
                const own = (g.tacticSlots ?? []).map((t) => ctx.existingTacticSkillOf(t.tacticId)).filter((s): s is string => !!s);
                skill = own.find((s) => castable(s) && !tactics.includes(s)) ?? null;
            }
            if (skill) { tactics.push(skill); bump(tacticCount, skill); }
        };
        take('tactic1', ov.tactic1);
        take('tactic2', ov.tactic2);

        const existingUlt = (g.ultimateSlots ?? [])[0]?.ultimateId;
        let ultimateSkill: string | null = null;
        let keeps = false;
        if (ov.ultimate && castable(ov.ultimate)) {
            ultimateSkill = ov.ultimate;
            bump(ultimateCount, ov.ultimate);
        } else if (existingUlt) {
            keeps = true;
            ultimateSkill = ctx.existingUltimateSkillOf(existingUlt) ?? null;
            if (ultimateSkill) bump(ultimateCount, ultimateSkill);
        } else if (rarityRankOf(g.rarityTier) >= minUltRank) {
            const ok = (s: string): boolean => castable(s) && room(ultimateCount, s);
            ultimateSkill = (tpl ? pickFromRing(tpl.slots.ultimate, `${g.id}|ult`, ok) : null)
                ?? pickFromRing(templates.fallbackUltimates, `${g.id}|ult|fb`, ok);
            if (ultimateSkill) bump(ultimateCount, ultimateSkill);
        }
        out.set(g.id, { generalId: g.id, templateId: tpl?.templateId ?? 'NONE', tacticSkills: tactics, ultimateSkill, keepsExistingUltimate: keeps });
    }
    return out;
}

export interface SkillHoldRow { skillId: string; holders: number; ratio: number }

/** 持有分佈（人數大到小） */
export function holdDistribution(skillLists: ReadonlyArray<readonly string[]>, total: number): SkillHoldRow[] {
    const count = new Map<string, number>();
    for (const list of skillLists) for (const s of Array.from(new Set(list))) count.set(s, (count.get(s) ?? 0) + 1);
    return Array.from(count.entries())
        .map(([skillId, holders]) => ({ skillId, holders, ratio: holders / Math.max(1, total) }))
        .sort((a, b) => b.holders - a.holders || a.skillId.localeCompare(b.skillId));
}

/** 超過上限的招式（空陣列代表通過） */
export function holdCapViolations(rows: readonly SkillHoldRow[], total: number, ratio = GENERAL_SKILL_CAP_RATIO): SkillHoldRow[] {
    const cap = skillHoldCap(total, ratio);
    return rows.filter((r) => r.holders > cap);
}
