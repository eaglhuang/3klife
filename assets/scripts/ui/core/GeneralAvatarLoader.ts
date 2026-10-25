// @spec-source → PROG-2-1107（武將小人頭；路徑規則見 data/general-art-paths.json）
/**
 * GeneralAvatarLoader — 依 GeneralArtPaths 的候選順序載入武將頭像／立繪 SpriteFrame。
 * 第一次使用時載入 data/general-art-paths.json；載不到就用預設規則。
 */
import type { SpriteFrame } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import {
    GENERAL_ART_PATHS_JSON,
    avatarCandidates,
    avatarPlaceholderPath,
    configureGeneralArtPaths,
    portraitCandidates,
} from '../../core/systems/GeneralArtPaths';

let _configReady: Promise<void> | null = null;

function ensureConfig(): Promise<void> {
    if (!_configReady) {
        _configReady = services().resource.loadJson(GENERAL_ART_PATHS_JSON)
            .then((raw) => { configureGeneralArtPaths(raw); })
            .catch(() => undefined);
    }
    return _configReady;
}

async function firstLoadable(paths: readonly string[]): Promise<SpriteFrame | null> {
    const res = services().resource;
    for (const p of paths) {
        const frame = await res.loadSpriteFrame(p).catch(() => null);
        if (frame) return frame;
    }
    return null;
}

/** 頭像：正式頭像 → 自動裁切 →（withPlaceholder 時）剪影。 */
export async function loadGeneralAvatar(idOrPortraitKey: string, withPlaceholder = true): Promise<SpriteFrame | null> {
    await ensureConfig();
    const frame = await firstLoadable(avatarCandidates(idOrPortraitKey));
    if (frame || !withPlaceholder) return frame;
    return firstLoadable([avatarPlaceholderPath()]);
}

/** 立繪：依標準路徑規則。 */
export async function loadGeneralPortrait(idOrPortraitKey: string): Promise<SpriteFrame | null> {
    await ensureConfig();
    return firstLoadable(portraitCandidates(idOrPortraitKey));
}
