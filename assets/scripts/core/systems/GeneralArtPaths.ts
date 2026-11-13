// @spec-source → 使用者裁定 2026-10-25（頭像要能隨立繪迭代、立繪走標準路徑）；PROG-2-1107
/**
 * GeneralArtPaths — 武將立繪／頭像的資源路徑規則（純邏輯，不依賴 cc）
 *
 * 路徑樣板的唯一來源是 data/general-art-paths.json；開機載入後呼叫 configureGeneralArtPaths。
 * 這裡的預設值只在 JSON 還沒載入時墊底，內容與 JSON 相同（測試會比對）。
 */

export interface GeneralArtPathConfig {
    portrait: readonly string[];
    battle: readonly string[];
    avatar: readonly string[];
    avatarPlaceholder: string;
    /** 舊 id → 名冊 id（PROG-2-2246）：同一人舊檔名已刪，支援卡等舊 id 改讀新圖 */
    aliases: Readonly<Record<string, string>>;
}

export const GENERAL_ART_PATHS_JSON = 'data/general-art-paths';

const DEFAULT_CONFIG: GeneralArtPathConfig = {
    portrait: ['sprites/generals/{file}_portrait'],
    battle: ['sprites/generals/{file}_battle'],
    avatar: ['sprites/generals/avatars/{file}_avatar', 'sprites/ui_avatars/cropped/{file}_avatar'],
    avatarPlaceholder: 'sprites/ui_avatars/unknown_avatar_{gender}',
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
