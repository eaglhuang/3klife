/**
 * QFaceData.ts — q-face-expressions.json／q-face-anchors.json 解析驗證（QFACE-01 §1、§2）
 *
 * 純邏輯。新增表情、活動對應、心情只改 JSON，這裡只負責檢查引用是否完整（壞資料直接丟錯）。
 */
import {
    FaceAnchor, FaceAnchorSet, FaceBlinkDef, FaceMoodDef, FacePartDef, FacePresetDef, FaceSpeakDef, PlaceholderShape,
    QFaceData,
} from './types';

/** 圖集裡必備的眼（11）與嘴（8）：缺任何一個都視為資料壞掉 */
export const REQUIRED_EYES = [
    'eye_open', 'eye_blink', 'eye_squint', 'eye_happy', 'eye_angry', 'eye_sad', 'eye_wide', 'eye_dizzy',
    'eye_half', 'eye_heart', 'eye_side',
];
export const REQUIRED_MOUTHS = [
    'mouth_closed', 'mouth_open_s', 'mouth_open_m', 'mouth_open_l', 'mouth_smile', 'mouth_frown', 'mouth_o',
    'mouth_wavy',
];
export const BLUSH_PART = 'blush';

const SHAPES: readonly PlaceholderShape[] = [
    'ring', 'ring_side', 'bar', 'arc_up', 'arc_down', 'slash', 'droop', 'disc', 'spiral', 'half', 'heart',
    'ellipse_s', 'ellipse_m', 'ellipse_l', 'wave', 'drop', 'cross', 'star',
];

function isObj(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, what: string): number {
    if (typeof v !== 'number' || !isFinite(v)) throw new Error(`q-face：${what} 必須是數字`);
    return v;
}

export function parseFaceData(raw: unknown): QFaceData {
    if (!isObj(raw)) throw new Error('q-face-expressions：根必須是物件');
    const a = raw.atlas;
    if (!isObj(a) || !isObj(a.parts) || !Array.isArray(a.partSets)) throw new Error('q-face-expressions：缺 atlas');
    const cellSize = num(a.cellSize, 'atlas.cellSize');
    const columns = num(a.columns, 'atlas.columns');
    const setStride = num(a.setStride, 'atlas.setStride');
    const partSets = a.partSets as string[];
    if (partSets.length * setStride > columns * columns) throw new Error('q-face：partSets 超出圖集容量');
    const parts: Record<string, FacePartDef> = {};
    const used = new Set<number>();
    for (const [name, p] of Object.entries(a.parts)) {
        const d = p as FacePartDef;
        if (!isObj(d) || typeof d.cell !== 'number' || !SHAPES.includes(d.shape)) {
            throw new Error(`atlas 部件 ${name}：需要 cell 與合法 shape`);
        }
        if (d.cell < 0 || d.cell >= setStride) throw new Error(`atlas 部件 ${name}：格位超出 setStride`);
        if (used.has(d.cell)) throw new Error(`atlas 部件 ${name}：格位 ${d.cell} 重複`);
        used.add(d.cell);
        parts[name] = { cell: d.cell, shape: d.shape, scale: typeof d.scale === 'number' ? d.scale : undefined };
    }
    for (const id of [...REQUIRED_EYES, ...REQUIRED_MOUTHS, BLUSH_PART]) {
        if (!parts[id]) throw new Error(`atlas 缺必備部件 ${id}`);
    }
    const blink = raw.blink as FaceBlinkDef;
    if (!isObj(blink) || !(blink.minSec > 0) || blink.maxSec < blink.minSec || !(blink.durationSec > 0)) {
        throw new Error('q-face：blink 設定不合法');
    }
    for (const e of [...blink.blinkableEyes, blink.blinkEye]) {
        if (!parts[e]) throw new Error(`blink 引用不存在的部件 ${e}`);
    }
    const speak = raw.speak as FaceSpeakDef;
    if (!isObj(speak) || !(speak.beatMinSec > 0) || speak.beatMaxSec < speak.beatMinSec) throw new Error('q-face：speak 設定不合法');
    for (const lv of ['low', 'mid', 'high'] as const) {
        const seq = speak.intensity?.[lv];
        if (!Array.isArray(seq) || seq.length === 0) throw new Error(`speak.intensity.${lv} 為空`);
        for (const m of seq) if (!parts[m]) throw new Error(`speak.${lv} 引用不存在的部件 ${m}`);
    }
    if (!parts[speak.closedMouth]) throw new Error('speak.closedMouth 不存在');
    const presets = raw.presets as Record<string, FacePresetDef>;
    if (!isObj(presets) || !presets.neutral) throw new Error('q-face：presets 必須含 neutral');
    for (const [name, p] of Object.entries(presets)) {
        if (!parts[p.eye]) throw new Error(`preset ${name}：眼 ${p.eye} 不存在`);
        if (!parts[p.mouth]) throw new Error(`preset ${name}：嘴 ${p.mouth} 不存在`);
        for (const m of p.marks ?? []) if (!parts[m]) throw new Error(`preset ${name}：標記 ${m} 不存在`);
    }
    const activityMap = (raw.activityMap ?? {}) as Record<string, string>;
    for (const [act, pr] of Object.entries(activityMap)) {
        if (!presets[pr]) throw new Error(`activityMap ${act}：preset ${pr} 不存在`);
    }
    const moods = (raw.moods ?? {}) as Record<string, FaceMoodDef>;
    for (const [m, d] of Object.entries(moods)) {
        if (typeof d.tint !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(d.tint)) throw new Error(`mood ${m}：tint 需 #RRGGBB`);
        if (d.preset && !presets[d.preset]) throw new Error(`mood ${m}：preset ${d.preset} 不存在`);
    }
    const easing = raw.easing as QFaceData['easing'];
    if (!isObj(easing)) throw new Error('q-face：缺 easing');
    return {
        atlas: { cellSize, columns, setStride, partSets, parts },
        blink, speak, easing, presets, activityMap, moods,
    };
}

/** 部件在圖集中的全域格位（partSet 偏移＋套組內格位） */
export function cellOf(data: QFaceData, partSet: string, part: string): number {
    const def = data.atlas.parts[part];
    if (!def) throw new Error(`未知部件 ${part}`);
    const idx = data.atlas.partSets.indexOf(partSet);
    return (idx < 0 ? 0 : idx) * data.atlas.setStride + def.cell;
}

export function parseHexColor(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function anchorOf(raw: unknown, base: FaceAnchor): FaceAnchor {
    if (!isObj(raw)) return base;
    return {
        x: typeof raw.x === 'number' ? raw.x : base.x,
        y: typeof raw.y === 'number' ? raw.y : base.y,
        scale: typeof raw.scale === 'number' ? raw.scale : base.scale,
        disabled: raw.disabled === true ? true : base.disabled,
    };
}

/** 查某武將的臉部錨點（缺的欄位用 defaults 補；夏侯惇式眼罩走 disabled＋asymmetric） */
export function resolveAnchors(raw: unknown, generalId: string): FaceAnchorSet {
    if (!isObj(raw) || !isObj(raw.defaults)) throw new Error('q-face-anchors：缺 defaults');
    const d = raw.defaults;
    const dflt = (k: string): FaceAnchor => anchorOf(d[k], { x: 0.5, y: 0.5 });
    const g = isObj(raw.generals) && isObj(raw.generals[generalId]) ? (raw.generals[generalId] as Record<string, unknown>) : {};
    const pick = (k: string): FaceAnchor => anchorOf(g[k], dflt(k));
    const flags = isObj(g.flags) ? g.flags : {};
    return {
        partSet: typeof g.partSet === 'string' ? g.partSet : typeof d.partSet === 'string' ? d.partSet : 'std_male_a',
        eyeL: pick('eyeL'), eyeR: pick('eyeR'), mouth: pick('mouth'), blushL: pick('blushL'), blushR: pick('blushR'),
        asymmetric: flags.asymmetric === true,
    };
}
