// @spec-source → 使用者裁定 2026-10-25（頭像要能隨立繪迭代、立繪走標準路徑）；PROG-2-1107
/**
 * GeneralArtPaths — 武將立繪／頭像的資源路徑規則（純邏輯，不依賴 cc）
 *
 * 路徑樣板的唯一來源是 data/general-art-paths.json；開機載入後呼叫 configureGeneralArtPaths。
 * 這裡的預設值只在 JSON 還沒載入時墊底，內容與 JSON 相同（測試會比對）。
 */

export interface PortraitAgeBandFallback {
    maxAge: number;
    id: string;
}

export interface PortraitGenderFallback {
    default: string;
    ageBands?: readonly PortraitAgeBandFallback[];
}

export interface GeneralArtPathConfig {
    portrait: readonly string[];
    battle: readonly string[];
    avatar: readonly string[];
    avatarPlaceholder: string;
    portraitFallbacks?: {
        female: PortraitGenderFallback;
        male: PortraitGenderFallback;
    };
    /** 舊 id → 名冊 id（PROG-2-2246）：同一人舊檔名已刪，支援卡等舊 id 改讀新圖 */
    aliases: Readonly<Record<string, string>>;
}

export const GENERAL_ART_PATHS_JSON = 'data/general-art-paths';

const DEFAULT_CONFIG: GeneralArtPathConfig = {
    portrait: ['sprites/generals/{file}_portrait'],
    battle: ['sprites/generals/{file}_battle'],
    avatar: ['sprites/generals/avatars/{file}_avatar', 'sprites/ui_avatars/cropped/{file}_avatar'],
    avatarPlaceholder: 'sprites/ui_avatars/unknown_avatar_{gender}',
    portraitFallbacks: {
        female: { default: 'da-qiao', ageBands: [] },
        male: { default: 'zhang-fei', ageBands: [] },
    },
    aliases: { 'huang-yueying': 'huang-yue-ying', 'cai-wenji': 'cai-yan', 'zhen-mi': 'zhen-ji' },
};

let _config: GeneralArtPathConfig = DEFAULT_CONFIG;

export function defaultGeneralArtPaths(): GeneralArtPathConfig {
    return DEFAULT_CONFIG;
}

/** 以 JSON 內容覆蓋路徑規則；欄位缺漏時保留預設。 */
export function configureGeneralArtPaths(raw: Partial<GeneralArtPathConfig> | null | undefined): void {
    if (!raw) return;
    _config = {
        portrait: Array.isArray(raw.portrait) && raw.portrait.length ? raw.portrait : DEFAULT_CONFIG.portrait,
        battle: Array.isArray(raw.battle) && raw.battle.length ? raw.battle : DEFAULT_CONFIG.battle,
        avatar: Array.isArray(raw.avatar) && raw.avatar.length ? raw.avatar : DEFAULT_CONFIG.avatar,
        avatarPlaceholder: typeof raw.avatarPlaceholder === 'string' ? raw.avatarPlaceholder : DEFAULT_CONFIG.avatarPlaceholder,
        portraitFallbacks: raw.portraitFallbacks ?? DEFAULT_CONFIG.portraitFallbacks,
        aliases: raw.aliases && typeof raw.aliases === 'object' ? raw.aliases : DEFAULT_CONFIG.aliases,
    };
}

export function resetGeneralArtPaths(): void {
    _config = DEFAULT_CONFIG;
}

/** 'portraits/generals/cao-cao'（portraitKey）或 'cao-cao' → 'cao-cao' */
export function generalIdFromKey(idOrPortraitKey: string): string {
    const parts = idOrPortraitKey.split('/');
    const id = parts[parts.length - 1];
    return _config.aliases[id] ?? id;
}

function fill(template: string, generalId: string): string {
    return template.replace(/\{file\}/g, generalId.replace(/-/g, '_')).replace(/\{id\}/g, generalId);
}

/** 立繪候選路徑（依序嘗試）。可傳武將 id 或 portraitKey。 */
export function portraitCandidates(idOrPortraitKey: string): string[] {
    const id = generalIdFromKey(idOrPortraitKey);
    return _config.portrait.map((t) => fill(t, id));
}

/** 主要立繪路徑（同步場合用，例如 view model）。 */
export function portraitPathOf(idOrPortraitKey: string): string {
    return portraitCandidates(idOrPortraitKey)[0];
}

/** 戰鬥立繪候選路徑（依序嘗試）；沒有戰鬥版時由呼叫端退回站姿。 */
export function battleCandidates(idOrPortraitKey: string): string[] {
    const id = generalIdFromKey(idOrPortraitKey);
    return _config.battle.map((t) => fill(t, id));
}

/** 依序嘗試候選資源路徑，回傳第一個成功載入的資源。 */
export async function loadFirstAvailableArtCandidate<T>(paths: readonly string[], load: (path: string) => Promise<T | null>): Promise<T | null> {
    for (const path of paths) {
        try {
            const value = await load(path);
            if (value) return value;
        } catch {
            // 單一路徑載入失敗時，繼續嘗試下一個候選。
        }
    }
    return null;
}

/** 頭像候選路徑：正式頭像 → 自動裁切頭像；全部失敗時由呼叫端用 avatarPlaceholder。 */
export function avatarCandidates(idOrPortraitKey: string): string[] {
    const id = generalIdFromKey(idOrPortraitKey);
    return _config.avatar.map((t) => fill(t, id));
}

/** 依序查各來源，第一個有值的性別為準；查詢丟例外視同查不到（服務還沒就緒時不擋頭像）。 */
export function firstKnownGender(sources: ReadonlyArray<() => string | null | undefined>): string | undefined {
    for (const source of sources) {
        try {
            const gender = source();
            if (gender) return gender;
        } catch {
            // 換下一個來源
        }
    }
    return undefined;
}

/** 未知頭像：依性別挑男女版；沒有性別資料一律用男版。 */
export function avatarPlaceholderPath(gender?: string | null): string {
    const g = gender === '女' || gender === 'f' || gender === 'female' ? 'f' : 'm';
    return _config.avatarPlaceholder.replace(/\{gender\}/g, g);
}

export interface PortraitResourceTarget {
    id: string;
    gender?: string | null;
    age?: number | null;
    fatherId?: string | null;
    motherId?: string | null;
    portraitKey?: string | null;
}

function isFemaleGender(gender?: string | null): boolean {
    return gender === '女' || gender === 'f' || gender === 'female';
}

function pickAgeBandFallback(rule: PortraitGenderFallback, age?: number | null): string | undefined {
    if (typeof age !== 'number' || !Number.isFinite(age) || !rule.ageBands?.length) return undefined;
    const sorted = [...rule.ageBands].sort((a, b) => a.maxAge - b.maxAge);
    return sorted.find((band) => age <= band.maxAge)?.id;
}

/**
 * 統一立繪解析器（PROG-2-9178）：
 * 1. 有專屬 portraitKey 或非動態子嗣（非 child_ 開頭）先嘗試專屬圖；
 * 2. 退回候選嚴格依性別挑選：只試同性別親代（非 child_）、資料檔同性別年齡段圖（若有）與同性別預設立繪，
 *    絕不跨性別退回異性親代（避免女子嗣誤用男性蓄鬍立繪）。
 */
export function resolveGeneralPortraitResources(target: PortraitResourceTarget): {
    primary: string;
    fallbacks: string[];
} {
    const isFemale = isFemaleGender(target.gender);
    const fallbackRules = _config.portraitFallbacks ?? DEFAULT_CONFIG.portraitFallbacks!;
    const genderRule = isFemale ? fallbackRules.female : fallbackRules.male;
    const ageBandId = pickAgeBandFallback(genderRule, target.age);
    const defaultId = genderRule.default;
    const candidateIds: string[] = [];

    const pushCandidateId = (raw?: string | null): void => {
        const trimmed = raw?.trim();
        if (!trimmed) return;
        const normalized = generalIdFromKey(trimmed);
        if (!candidateIds.includes(normalized)) candidateIds.push(normalized);
    };

    const isChildWithoutCustomArt = target.id.startsWith('child_') && !target.portraitKey?.trim();
    if (target.portraitKey?.trim()) {
        pushCandidateId(target.portraitKey);
    } else if (!isChildWithoutCustomArt) {
        pushCandidateId(target.id);
    }

    // 僅允許退回同性別親代；嚴禁跨性別退回
    if (isFemale) {
        if (target.motherId && !target.motherId.startsWith('child_')) pushCandidateId(target.motherId);
    } else {
        if (target.fatherId && !target.fatherId.startsWith('child_')) pushCandidateId(target.fatherId);
    }
    if (ageBandId) pushCandidateId(ageBandId);
    pushCandidateId(defaultId);

    const paths = candidateIds.map((id) => portraitPathOf(id));
    return {
        primary: paths[0],
        fallbacks: paths.slice(1),
    };
}

/** 回傳完整立繪載入候選清單 [primary, ...fallbacks]，供非同步載入器直接遍歷。 */
export function resolveGeneralPortraitCandidates(target: PortraitResourceTarget): string[] {
    const resolved = resolveGeneralPortraitResources(target);
    return [resolved.primary, ...resolved.fallbacks];
}
