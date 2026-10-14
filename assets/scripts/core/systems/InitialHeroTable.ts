// @spec-source → WBS v5 OPEN-02（初始六名將資料表）；史實校正與因子標籤清單（初始六將）；開場程式規格書 §3.1 HeroBase（暫定）
/**
 * InitialHeroTable — 初始六名將資料表的驗證，純 TS，不依賴 cc。
 *
 * 資料檔 initial-heroes.json 只放史實欄位（id、名字、稱號、出生地、核心因子標籤）。
 * introLine、portraitKey、battleVoiceKey 與稀有度、屬性規格未給值，這裡不驗證，待內容決定後再補。
 * Unity 對照：像 ScriptableObject 的進場檢查，載入時一次檢查欄位完整，不合格就拒絕整包資料。
 */

export const INITIAL_HERO_IDS = ['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning'] as const;

export interface InitialHero {
    id: string;
    name: string;
    title: string;
    originRegion: string;
    coreFactorTags: string[];
    coreFactorTag: string;
}

export interface InitialHeroIssue {
    path: string;
    message: string;
}

export type InitialHeroValidation =
    | { ok: true; heroes: InitialHero[]; issues: [] }
    | { ok: false; heroes: []; issues: InitialHeroIssue[] };

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
        const id = entry.id;
        if (!isNonEmptyString(id)) {
            issues.push({ path: `${at}.id`, message: '必須為非空字串' });
            return;
        }
        if (seen.has(id)) issues.push({ path: `${at}.id`, message: `重複的 id ${id}` });
        seen.add(id);
        if (!knownIds.has(id)) issues.push({ path: `${at}.id`, message: `generals.json 中找不到 ${id}` });
        if (!isNonEmptyString(entry.name)) issues.push({ path: `${at}.name`, message: '必須為非空字串' });
        if (!isNonEmptyString(entry.title)) issues.push({ path: `${at}.title`, message: '必須為非空字串' });
        if (!isNonEmptyString(entry.originRegion)) issues.push({ path: `${at}.originRegion`, message: '必須為非空字串' });

        const tags = entry.coreFactorTags;
        const tagsValid = Array.isArray(tags) && tags.length > 0 && tags.every(isNonEmptyString);
        if (!tagsValid) {
            issues.push({ path: `${at}.coreFactorTags`, message: '必須為至少一個非空字串的陣列' });
        } else if (!isNonEmptyString(entry.coreFactorTag) || !(tags as string[]).includes(entry.coreFactorTag)) {
            issues.push({ path: `${at}.coreFactorTag`, message: '主因子必須是 coreFactorTags 之一' });
        }

        if (tagsValid && isNonEmptyString(entry.name) && isNonEmptyString(entry.title) && isNonEmptyString(entry.originRegion)
            && isNonEmptyString(entry.coreFactorTag) && (tags as string[]).includes(entry.coreFactorTag)) {
            byId.set(id, {
                id,
                name: entry.name,
                title: entry.title,
                originRegion: entry.originRegion,
                coreFactorTags: [...(tags as string[])],
                coreFactorTag: entry.coreFactorTag,
            });
        }
    });

    for (const requiredId of INITIAL_HERO_IDS) {
        if (!seen.has(requiredId)) issues.push({ path: 'heroes', message: `缺少初始名將 ${requiredId}` });
    }
    if (issues.length > 0) return fail();

    return { ok: true, heroes: INITIAL_HERO_IDS.map(id => byId.get(id)!), issues: [] };
}
