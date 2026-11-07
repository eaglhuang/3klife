// @spec-source → 英靈卡與虎符紋章視覺契約與血脈紋樣規格書.md（doc_spec_0345）；PROG-2-2031
/**
 * SigilRegistry — 血脈圖騰（Sigil_Pattern_ID）登錄表與四件組視覺契約（純資料＋檢核，不依賴 cc）
 *
 * 四件組（血脈槽位／英靈卡／虎符紋章／戰場旗牌）共用同一個 Sigil_Pattern_ID（§1）。
 * 資產路徑只是約定，是否真的存在由呼叫端注入的 exists() 判斷（§4-1、§4-3）。
 */

export interface SigilEntry {
    id: string;
    beast: string;
    faction: string;
    bannerPalette: string;
    tokenStyle: string;
}

/** §2 四大圖騰 */
export const SIGIL_REGISTRY: Readonly<Record<string, SigilEntry>> = {
    SIGIL_AZURE_DRAGON: { id: 'SIGIL_AZURE_DRAGON', beast: '青龍', faction: '蜀漢·劉氏宗親', bannerPalette: '黛綠底·流金盤龍邊', tokenStyle: '鎏金龍鱗牌' },
    SIGIL_SCARLET_PHOENIX: { id: 'SIGIL_SCARLET_PHOENIX', beast: '朱雀', faction: '東吳·孫氏宗親', bannerPalette: '絳紅底·烈焰羽翼邊', tokenStyle: '赤銅雀牌' },
    SIGIL_GOLDEN_QILIN: { id: 'SIGIL_GOLDEN_QILIN', beast: '麒麟', faction: '曹魏·曹夏侯氏', bannerPalette: '玄黑底·紫金麒麟邊', tokenStyle: '玄鐵牌' },
    SIGIL_BLACK_TORTOISE: { id: 'SIGIL_BLACK_TORTOISE', beast: '玄武', faction: '北方·公孫氏', bannerPalette: '霜白底·青蒼冰晶邊', tokenStyle: '銀絲連環牌' },
};

/** §3 圖層堆疊順序（由下到上） */
export const SIGIL_LAYER_ORDER = ['base', 'sigil-decal', 'character-or-crest', 'frame', 'vfx'] as const;
export type SigilLayer = (typeof SIGIL_LAYER_ORDER)[number];

/** §3 Layer 1 家族暗紋透明度 */
export const SIGIL_DECAL_OPACITY = 0.3;
/** §3 Layer 4 粒子特效只在這些稀有度啟用 */
export const SIGIL_VFX_RARITIES: readonly string[] = ['SSR', 'UR'];

/** §4-2 資產尺寸 */
export const SIGIL_ASSET_SIZE = {
    crest: { width: 128, height: 128 },
    banner: { width: 64, height: 128 },
} as const;

export type SigilAssetKind = 'crest' | 'banner' | 'decal';

export function isRegisteredSigil(id: string | null | undefined): boolean {
    return !!id && Object.prototype.hasOwnProperty.call(SIGIL_REGISTRY, id);
}

/** 資產路徑約定：sprites/sigils/<id 小寫>/<kind>（resources 相對路徑、不含副檔名） */
export function sigilAssetPath(id: string, kind: SigilAssetKind): string {
    return `sprites/sigils/${id.toLowerCase()}/${kind}`;
}

export function layerIndex(layer: SigilLayer): number {
    return SIGIL_LAYER_ORDER.indexOf(layer);
}

export function sigilVfxEnabled(rarity: string): boolean {
    return SIGIL_VFX_RARITIES.includes(rarity);
}

export interface SigilRef {
    /** 物件識別（卡 uid、虎符 id 等），只用於報告 */
    owner: string;
    sigilPatternId: string;
}

/** §4-1 找出引用未登錄圖騰的物件 */
export function findOrphanSigilRefs(refs: readonly SigilRef[]): SigilRef[] {
    return refs.filter((ref) => !isRegisteredSigil(ref.sigilPatternId));
}

/** §1 四件組：同一組的四個 ID 必須相同且已登錄 */
export function isSigilQuadConsistent(quad: { bloodline: string; spiritCard: string; tallyCrest: string; troopBanner: string }): boolean {
    const ids = [quad.bloodline, quad.spiritCard, quad.tallyCrest, quad.troopBanner];
    return isRegisteredSigil(ids[0]) && ids.every((id) => id === ids[0]);
}

/** §4-3 列出登錄表中缺少資產的路徑；exists 由呼叫端注入 */
export function findMissingSigilAssets(exists: (path: string) => boolean, kinds: readonly SigilAssetKind[] = ['crest', 'banner', 'decal']): string[] {
    const missing: string[] = [];
    for (const id of Object.keys(SIGIL_REGISTRY)) {
        for (const kind of kinds) {
            const path = sigilAssetPath(id, kind);
            if (!exists(path)) missing.push(path);
        }
    }
    return missing;
}
