// @spec-source → WBS v5 OPEN-02（初始六名將資料表）；史實校正與因子標籤清單（初始六將）；開場程式規格書 §3.1 HeroBase（暫定）
/**
 * InitialHeroTable — 初始六名將資料表的驗證與鍵值推導，純 TS，不依賴 cc。
 *
 * 資料檔 initial-heroes.json 只存 generalId 引用與史實欄位（出生地、核心因子標籤）。
 * 稱號、稀有度、屬性一律以 generals.json 為唯一來源，這裡不重複存。
 * 立繪與語音 key 依既有命名慣例由 generalId 推導，不另存。
 * introLine 目前留空字串，等企劃提供台詞再填（PM 裁定，不自行編寫）。
 * Unity 對照：像 ScriptableObject 只存引用（GUID），顯示資料由 Prefab 本體取得，避免兩處各存一份。
 */

export const INITIAL_HERO_IDS = ['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning'] as const;

export interface InitialHero {
    generalId: string;
    originRegion: string;
    coreFactorTags: string[];
    coreFactorTag: string;
    introLine: string;
}

export interface InitialHeroIssue {
    path: string;
    message: string;
}

export type InitialHeroValidation =
    | { ok: true; heroes: InitialHero[]; issues: [] }
    | { ok: false; heroes: []; issues: InitialHeroIssue[] };

/** 立繪鍵：portraits/generals/<generalId>，與既有資料的 portraitKey 格式一致。 */
export function portraitKeyOf(generalId: string): string {
    return `portraits/generals/${generalId}`;
}

/** 戰鬥語音鍵：audio/voice/generals/<generalId>/battle，與既有資料的 battleVoiceKey 格式一致。 */
export function battleVoiceKeyOf(generalId: string): string {
    return `audio/voice/generals/${generalId}/battle`;
}

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 驗證初始六名將資料。knownIds 是 generals.json 中實際存在的武將 id。
 * 通過時回傳強型別的六人清單（依 INITIAL_HERO_IDS 順序），失敗時列出所有問題且不回傳資料。
 */
export function validateInitialHeroes(raw: unknown, knownIds: ReadonlySet<string>): InitialHeroValidation {
    const issues: InitialHeroIssue[] = [];
    const fail = (): InitialHeroValidation => ({ ok: false, heroes: [], issues });
    if (!isRecord(raw) || !Array.isArray(raw.heroes)) {
        issues.push({ path: 'heroes', message: '必須為陣列' });
        return fail();
    }

    const seen = new Set<string>();
    const byId = new Map<string, InitialHero>();
    raw.heroes.forEach((entry, index) => {
        const at = `heroes[${index}]`;
        if (!isRecord(entry)) {
            issues.push({ path: at, message: '必須為物件' });
            return;
        }
        const generalId = entry.generalId;
        if (!isNonEmptyString(generalId)) {
            issues.push({ path: `${at}.generalId`, message: '必須為非空字串' });
            return;
        }
        if (seen.has(generalId)) issues.push({ path: `${at}.generalId`, message: `重複的 generalId ${generalId}` });
        seen.add(generalId);
        if (!knownIds.has(generalId)) issues.push({ path: `${at}.generalId`, message: `generals.json 中找不到 ${generalId}` });
        if (!isNonEmptyString(entry.originRegion)) issues.push({ path: `${at}.originRegion`, message: '必須為非空字串' });
        if (typeof entry.introLine !== 'string') issues.push({ path: `${at}.introLine`, message: '必須為字串（可為空）' });

        const tags = entry.coreFactorTags;
        const tagsValid = Array.isArray(tags) && tags.length > 0 && tags.every(isNonEmptyString);
        if (!tagsValid) {
            issues.push({ path: `${at}.coreFactorTags`, message: '必須為至少一個非空字串的陣列' });
        } else if (!isNonEmptyString(entry.coreFactorTag) || !(tags as string[]).includes(entry.coreFactorTag)) {
            issues.push({ path: `${at}.coreFactorTag`, message: '主因子必須是 coreFactorTags 之一' });
        }

        if (tagsValid && isNonEmptyString(entry.originRegion) && typeof entry.introLine === 'string'
            && isNonEmptyString(entry.coreFactorTag) && (tags as string[]).includes(entry.coreFactorTag)) {
            byId.set(generalId, {
                generalId,
                originRegion: entry.originRegion,
                coreFactorTags: [...(tags as string[])],
                coreFactorTag: entry.coreFactorTag,
                introLine: entry.introLine,
            });
        }
    });

    for (const requiredId of INITIAL_HERO_IDS) {
        if (!seen.has(requiredId)) issues.push({ path: 'heroes', message: `缺少初始名將 ${requiredId}` });
    }
    if (issues.length > 0) return fail();

    return { ok: true, heroes: INITIAL_HERO_IDS.map(id => byId.get(id)!), issues: [] };
}
