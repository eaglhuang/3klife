// @spec-source → PROG-2-1107（武將小人頭；路徑規則見 data/general-art-paths.json）
/**
 * GeneralAvatarLoader — 依 GeneralArtPaths 的候選順序載入武將頭像／立繪 SpriteFrame。
 * 第一次使用時載入 data/general-art-paths.json；載不到就用預設規則。
 */
import type { SpriteFrame } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { BloodlineGraph } from '../../core/services/BloodlineGraph';
import {
    GENERAL_ART_PATHS_JSON,
    avatarCandidates,
    avatarPlaceholderPath,
    configureGeneralArtPaths,
    firstKnownGender,
    generalIdFromKey,
    resolveGeneralPortraitCandidates,
    type PortraitResourceTarget,
} from '../../core/systems/GeneralArtPaths';

let _configReady: Promise<void> | null = null;
let _genders: Promise<Map<string, string>> | null = null;

/** 未知頭像要分男女：名將從輕量的 generals-index 取；後代不在索引裡，改查名冊與血統圖。 */
function genderOf(id: string): Promise<string | undefined> {
    if (!_genders) {
        _genders = services().resource.loadJson('data/generals-index')
            .then((raw: any) => {
                const rows: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
                return new Map(rows.filter((r) => r?.uid && r.gender).map((r) => [r.uid, r.gender]));
            })
            .catch(() => new Map<string, string>());
    }
    return _genders.then((m) => firstKnownGender([
        () => m.get(id),
        () => services().session.roster.find((general) => general.id === id)?.gender,
        () => BloodlineGraph.getInstance().getPerson(id)?.gender,
    ]));
}

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
    return firstLoadable([avatarPlaceholderPath(await genderOf(generalIdFromKey(idOrPortraitKey)))]);
}

/** 血統樹 1、2 代先祖用的共用低解析度圖示：只依性別取剪影，整棵樹共用同兩張貼圖（BUI-07）。 */
export async function loadSharedAncestorIcon(id: string): Promise<SpriteFrame | null> {
    await ensureConfig();
    return firstLoadable([avatarPlaceholderPath(await genderOf(generalIdFromKey(id)))]);
}

/** 立繪：統一走 GeneralArtPaths.resolveGeneralPortraitResources（依性別／年齡退回，不跨性別）。 */
export async function loadGeneralPortrait(idOrTarget: string | PortraitResourceTarget): Promise<SpriteFrame | null> {
    await ensureConfig();
    if (typeof idOrTarget !== 'string') {
        return firstLoadable(resolveGeneralPortraitCandidates(idOrTarget));
    }
    const id = generalIdFromKey(idOrTarget);
    const rosterMatch = services().session.roster.find((g) => g.id === id) as (PortraitResourceTarget & { fatherId?: string; motherId?: string }) | undefined;
    const bloodlineMatch = BloodlineGraph.getInstance().getPerson(id);
    const gender = rosterMatch?.gender ?? bloodlineMatch?.gender ?? (await genderOf(id));
    const target: PortraitResourceTarget = {
        id: rosterMatch?.id ?? id,
        gender,
        age: rosterMatch?.age ?? null,
        fatherId: rosterMatch?.fatherId ?? null,
        motherId: rosterMatch?.motherId ?? null,
        portraitKey: rosterMatch?.portraitKey ?? (idOrTarget.includes('/') ? idOrTarget : null),
    };
    return firstLoadable(resolveGeneralPortraitCandidates(target));
}
