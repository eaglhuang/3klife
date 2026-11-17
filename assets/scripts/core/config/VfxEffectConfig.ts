import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md
export interface VfxEffectNotifyDef {
    readonly type: 'floatText';
    readonly textKey: string;
    readonly color?: string;
}

/**
 * 多層積木序列中的單個 Block 條目（v2）
 * 允許在一個技能特效中疊加多個積木，各自帶延遲與獨立參數。
 */
export interface VfxBlockEntry {
    /** 對應 VFX_BLOCK_REGISTRY 中的 id */
    readonly blockId: string;
    /** 相對於特效起始的延遲秒數（0 = 立即播放） */
    readonly delay: number;
    /** 此 Block 的持續秒數；省略時沿用父 effect 的 lifetime */
    readonly duration?: number;
    /** 色調覆寫（hex，例如 '#FF0000'）；省略時不套用 */
    readonly tintHex?: string;
    /** 縮放倍率（1.0 = 不縮放）；省略時不覆寫 */
    readonly scale?: number;
    /** 位置偏移 [x, y, z]（世界單位）；省略時與父 effect 同座標 */
    readonly offset?: [number, number, number];
}

/**
 * 鏡頭震動參數（v2）
 */
export interface VfxCameraShakeDef {
    /** 震動振幅（世界單位） */
    readonly strength: number;
    /** 震動持續秒數 */
    readonly duration: number;
}

export interface VfxEffectDef {
    readonly blockId: string;
    readonly audio?: string;
    readonly notify?: VfxEffectNotifyDef;
    readonly lifetime?: number;
    /**
     * 多層積木序列（v2）。
     * 若存在且不為空，則 playFullEffect 改用 playComposite() 依序播放，
     * 並忽略頂層的 blockId（blockId 僅作 fallback 保留）。
     */
    readonly blocks?: readonly VfxBlockEntry[];
    /** 鏡頭震動（v2）；省略時不震動 */
    readonly cameraShake?: VfxCameraShakeDef;
}

export interface VfxEffectTable {
    version: number;
    effects: Record<string, VfxEffectDef>;
}

export const CURRENT_VFX_EFFECT_TABLE_VERSION = 2;

/**
 * 內建備援：特效表缺欄位、或版本比客戶端新而讀不懂時，用這裡的值補上。
 * 只放戰場現行、有 prefab 的效果。舊的 12 個通用與武將技能定義（hit_enemy、skill_zhang_fei…）
 * 用的是只有貼圖、沒有 prefab 的特效，戰場上播不出來也沒有人呼叫，已於 PROG-2-9371 移除；
 * 這張表會併進正式特效表，留著等於刪不掉。
 */
export const DEFAULT_VFX_EFFECTS: Record<string, VfxEffectDef> = {
    battle_hit_default: {
        blockId: 'p3d_common_light',
        lifetime: 0.7,
    },
};

export function normalizeVfxEffectTable(raw: unknown): VfxEffectTable {
    const migrated = migrateToLatestSchema(raw);
    const source = asRecord(migrated.effects);
    const effects: Record<string, VfxEffectDef> = {};
    const keys = new Set<string>([
        ...Object.keys(DEFAULT_VFX_EFFECTS),
        ...Object.keys(source),
    ]);

    keys.forEach(key => {
        const normalized = normalizeEffectDef(asRecord(source[key]), DEFAULT_VFX_EFFECTS[key]);
        if (normalized) {
            effects[key] = normalized;
        }
    });

    return {
        version: CURRENT_VFX_EFFECT_TABLE_VERSION,
        effects,
    };
}

function migrateToLatestSchema(raw: unknown): VfxEffectTable {
    const root = asRecord(raw);
    const sourceVersion = detectSchemaVersion(root);

    if (sourceVersion > CURRENT_VFX_EFFECT_TABLE_VERSION) {
        UCUFLogger.warn(LogCategory.DATA, 
            `[VfxEffectConfig] 偵測到較新的 schema version=${sourceVersion}，` +
            `目前客戶端只支援到 ${CURRENT_VFX_EFFECT_TABLE_VERSION}，改用內建 fallback。`,
        );
        return {
            version: CURRENT_VFX_EFFECT_TABLE_VERSION,
            effects: cloneEffects(DEFAULT_VFX_EFFECTS),
        };
    }

    if (sourceVersion <= 0) {
        // v0：effects 直接掛在 root，無 version 欄位
        return migrateV0ToV1(root);
    }

    if (sourceVersion === 1) {
        // v1→v2：結構相容，blocks[] 與 cameraShake 為新增可選欄位，直接升版
        return migrateV1ToV2(root);
    }

    // v2（或更高但已在上方截斷）：直接使用
    return {
        version: CURRENT_VFX_EFFECT_TABLE_VERSION,
        effects: asRecord(root.effects) as Record<string, VfxEffectDef>,
    };
}

function migrateV0ToV1(root: Record<string, unknown>): VfxEffectTable {
    return {
        version: CURRENT_VFX_EFFECT_TABLE_VERSION,
        effects: root as Record<string, unknown> as Record<string, VfxEffectDef>,
    };
}

/**
 * v1 → v2：blocks[] 與 cameraShake 為新增可選欄位，現有 v1 資料結構完全相容。
 * 升版後 normalizeEffectDef 會自動將 blocks/cameraShake 納入正規化流程。
 */
function migrateV1ToV2(root: Record<string, unknown>): VfxEffectTable {
    return {
        version: CURRENT_VFX_EFFECT_TABLE_VERSION,
        effects: asRecord(root.effects) as Record<string, VfxEffectDef>,
    };
}

function detectSchemaVersion(root: Record<string, unknown>): number {
    const explicitVersion = toFiniteNumber(root.version, NaN);
    if (Number.isFinite(explicitVersion)) {
        return Math.floor(explicitVersion);
    }

    if (isRecord(root.effects)) {
        return 1;
    }

    return 0;
}

function normalizeEffectDef(
    raw: Record<string, unknown>,
    fallback?: VfxEffectDef,
): VfxEffectDef | null {
    const blockId = pickString(raw.blockId, fallback?.blockId);
    if (!blockId) {
        return null;
    }

    const notify = normalizeNotify(asRecord(raw.notify), fallback?.notify);
    const lifetime = toPositiveNumber(raw.lifetime, fallback?.lifetime ?? 2.0);
    const audio = pickString(raw.audio, fallback?.audio);

    // v2：正規化 blocks[] 多層積木
    const blocks = normalizeBlockEntries(raw.blocks);

    // v2：正規化 cameraShake
    const cameraShake = normalizeCameraShake(asRecord(raw.cameraShake));

    return {
        blockId,
        ...(audio ? { audio } : {}),
        ...(notify ? { notify } : {}),
        lifetime,
        ...(blocks.length > 0 ? { blocks } : {}),
        ...(cameraShake ? { cameraShake } : {}),
    };
}

function normalizeBlockEntries(raw: unknown): VfxBlockEntry[] {
    if (!Array.isArray(raw)) return [];
    const result: VfxBlockEntry[] = [];
    for (const item of raw) {
        const entry = asRecord(item);
        const blockId = pickString(entry.blockId);
        if (!blockId) continue;
        const delay = toNonNegativeNumber(entry.delay, 0);
        const duration = typeof entry.duration === 'number' && entry.duration > 0
            ? entry.duration : undefined;
        const tintHex = pickString(entry.tintHex);
        const scale = typeof entry.scale === 'number' && entry.scale > 0
            ? entry.scale : undefined;
        const offset = normalizeOffset(entry.offset);
        result.push({
            blockId,
            delay,
            ...(duration !== undefined ? { duration } : {}),
            ...(tintHex ? { tintHex } : {}),
            ...(scale !== undefined ? { scale } : {}),
            ...(offset ? { offset } : {}),
        });
    }
    return result;
}

function normalizeOffset(raw: unknown): [number, number, number] | undefined {
    if (!Array.isArray(raw) || raw.length < 3) return undefined;
    const [x, y, z] = raw;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return undefined;
    return [x, y, z];
}

function normalizeCameraShake(raw: Record<string, unknown>): VfxCameraShakeDef | undefined {
    const strength = toPositiveNumber(raw.strength, 0);
    const duration = toPositiveNumber(raw.duration, 0);
    if (strength <= 0 || duration <= 0) return undefined;
    return { strength, duration };
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
    const n = toFiniteNumber(value, fallback);
    return n >= 0 ? n : fallback;
}

function normalizeNotify(
    raw: Record<string, unknown>,
    fallback?: VfxEffectNotifyDef,
): VfxEffectNotifyDef | undefined {
    const type = pickString(raw.type, fallback?.type);
    const textKey = pickString(raw.textKey, fallback?.textKey);
    if (type !== 'floatText' || !textKey) {
        return fallback ? { ...fallback } : undefined;
    }

    const color = pickString(raw.color, fallback?.color);
    return {
        type: 'floatText',
        textKey,
        ...(color ? { color } : {}),
    };
}

function cloneEffects(source: Record<string, VfxEffectDef>): Record<string, VfxEffectDef> {
    const clone: Record<string, VfxEffectDef> = {};
    Object.entries(source).forEach(([key, value]) => {
        clone[key] = {
            ...value,
            ...(value.notify ? { notify: { ...value.notify } } : {}),
        };
    });
    return clone;
}

function pickString(value: unknown, fallback?: string): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function toPositiveNumber(value: unknown, fallback: number): number {
    const numeric = toFiniteNumber(value, fallback);
    return numeric > 0 ? numeric : fallback;
}

function toFiniteNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}