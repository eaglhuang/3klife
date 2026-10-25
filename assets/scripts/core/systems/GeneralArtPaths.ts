// @spec-source → 使用者裁定 2026-10-25（頭像要能隨立繪迭代、立繪走標準路徑）；PROG-2-1107
/**
 * GeneralArtPaths — 武將立繪／頭像的資源路徑規則（純邏輯，不依賴 cc）
 *
 * 路徑樣板的唯一來源是 data/general-art-paths.json；開機載入後呼叫 configureGeneralArtPaths。
 * 這裡的預設值只在 JSON 還沒載入時墊底，內容與 JSON 相同（測試會比對）。
 */

export interface GeneralArtPathConfig {
    portrait: readonly string[];
    avatar: readonly string[];
    avatarPlaceholder: string;
}

export const GENERAL_ART_PATHS_JSON = 'data/general-art-paths';

const DEFAULT_CONFIG: GeneralArtPathConfig = {
    portrait: ['sprites/generals/{file}_portrait'],
    avatar: ['sprites/generals/avatars/{file}_avatar', 'sprites/ui_avatars/cropped/{file}_avatar'],
    avatarPlaceholder: 'sprites/ui_avatars/unknown_avatar',
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
        avatar: Array.isArray(raw.avatar) && raw.avatar.length ? raw.avatar : DEFAULT_CONFIG.avatar,
        avatarPlaceholder: typeof raw.avatarPlaceholder === 'string' ? raw.avatarPlaceholder : DEFAULT_CONFIG.avatarPlaceholder,
    };
}

export function resetGeneralArtPaths(): void {
    _config = DEFAULT_CONFIG;
}

/** 'portraits/generals/cao-cao'（portraitKey）或 'cao-cao' → 'cao-cao' */
export function generalIdFromKey(idOrPortraitKey: string): string {
    const parts = idOrPortraitKey.split('/');
    return parts[parts.length - 1];
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

/** 頭像候選路徑：正式頭像 → 自動裁切頭像；全部失敗時由呼叫端用 avatarPlaceholder。 */
export function avatarCandidates(idOrPortraitKey: string): string[] {
    const id = generalIdFromKey(idOrPortraitKey);
    return _config.avatar.map((t) => fill(t, id));
}

export function avatarPlaceholderPath(): string {
    return _config.avatarPlaceholder;
}
