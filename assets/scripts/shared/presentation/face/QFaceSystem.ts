/**
 * QFaceSystem.ts — Q 臉部表情核心（QFACE-01，PROG-2-10233）
 *
 * 引擎中立。每張臉＝眼＋嘴＋紅暈＋情緒標記＋頭圖乘色，只做「換部件＋縮放＋透明度」，不逐幀動畫。
 * - 眨眼：每張臉用自己的 seed 排程（mulberry32），間隔 2.5～6 秒、閉眼 0.10 秒；同 seed 時間序列相同，
 *   不同 seed 相位錯開，不會全場同時眨。眨眼亂數與說話亂數分流，說話不會改變眨眼時間。
 * - LOD：LOD2 不眨眼、不跑說話節拍（臉凍結）；LOD1 眨眼照跑。LOD 可由 setLod 指定，或掛動畫管理器的 getLod。
 * - 資料驅動：預設表情、活動對應、心情對應都在 q-face-expressions.json，新增表情只改 JSON。
 * - 物件池：臉狀態槽位用世代把手，註銷再註冊 1000 次不增加物件數。
 * Unity 對照：相當於 Animator 的表情層＋BlendShape 驅動器，套用端才是 SkinnedMeshRenderer。
 */
import { BLUSH_PART, cellOf, parseHexColor } from './QFaceData';
import {
    createFaceState, FaceHandle, FaceIntensity, INVALID_FACE, IQFaceView, QFaceData, QFaceState, QLodLevel,
} from './types';

/** mulberry32：小型確定性亂數（0～1） */
export function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 往目標靠近，單位時間最多走 1/sec（sec<=0 直接到位） */
function approach(cur: number, target: number, dt: number, sec: number): number {
    if (sec <= 0) return target;
    const step = dt / sec;
    if (cur < target) return Math.min(target, cur + step);
    return Math.max(target, cur - step);
}

interface FaceSlot {
    gen: number;
    alive: boolean;
    view: IQFaceView | null;
    partSet: string;
    lod: QLodLevel;
    getLod: (() => number) | null;
    rngBlink: () => number;
    rngSpeak: () => number;
    autoBlink: boolean;
    /** 距離下次眨眼的秒數 */
    blinkIn: number;
    /** 眨眼剩餘秒數（>0 = 閉眼中） */
    blinkLeft: number;
    baseEye: string;
    baseMouth: string;
    marks: string[];
    blushTarget: number;
    tintTarget: [number, number, number];
    boostTarget: number;
    eyeScaleTarget: number;
    speakLeft: number;
    speakBeat: number;
    speakIdx: number;
    speakSeq: string[] | null;
    dizzyAngle: number;
    dirty: boolean;
    state: QFaceState;
}

export interface QFaceSystemOptions {
    /** 同時存活臉數上限（池上限） */
    maxFaces?: number;
}

export class QFaceSystem {
    private readonly data: QFaceData;
    private readonly slots: FaceSlot[] = [];
    private readonly free: number[] = [];
    private readonly maxFaces: number;
    /** 已建立的槽位總數（測試用：驗證 1000 次切換不增長） */
    created = 0;
    inUse = 0;

    constructor(data: QFaceData, opts: QFaceSystemOptions = {}) {
        this.data = data;
        this.maxFaces = opts.maxFaces ?? 64;
    }

    getData(): Readonly<QFaceData> {
        return this.data;
    }

    private makeSlot(): FaceSlot {
        this.created++;
        return {
            gen: 0, alive: false, view: null, partSet: '', lod: 0, getLod: null, rngBlink: makeRng(0), rngSpeak: makeRng(0),
            autoBlink: true, blinkIn: 0, blinkLeft: 0, baseEye: '', baseMouth: '', marks: [], blushTarget: 0,
            tintTarget: [255, 255, 255], boostTarget: 0, eyeScaleTarget: 1, speakLeft: 0, speakBeat: 0, speakIdx: 0,
            speakSeq: null, dizzyAngle: 0, dirty: true, state: createFaceState(),
        };
    }

    /** 註冊一張臉；達上限回 INVALID_FACE（呼叫端降級，不是新增節點） */
    register(view: IQFaceView, seed: number, partSet?: string): FaceHandle {
        if (this.inUse >= this.maxFaces) return INVALID_FACE;
        let idx = this.free.pop();
        if (idx === undefined) {
            idx = this.slots.length;
            this.slots.push(this.makeSlot());
        }
        const s = this.slots[idx];
        s.alive = true;
        s.view = view;
        s.partSet = partSet ?? this.data.atlas.partSets[0];
        s.lod = 0;
        s.getLod = null;
        s.rngBlink = makeRng(seed);
        s.rngSpeak = makeRng((seed ^ 0x9e3779b9) >>> 0);
        s.autoBlink = true;
        s.blinkLeft = 0;
        // 首次眨眼相位：0～maxSec 內由 seed 決定，讓同場的臉錯開
        s.blinkIn = s.rngBlink() * this.data.blink.maxSec;
        s.speakLeft = 0;
        s.speakSeq = null;
        s.dizzyAngle = 0;
        this.applyPresetInto(s, 'neutral');
        const t = s.state;
        t.blush = 0;
        t.eyeScale = s.eyeScaleTarget;
        [t.tintR, t.tintG, t.tintB] = s.tintTarget;
        t.brightBoost = 0;
        s.dirty = true;
        this.inUse++;
        this.flush(s);
        return ((s.gen & 0xffff) << 16) | idx;
    }

    unregister(h: FaceHandle): void {
        const s = this.resolve(h);
        if (!s) return;
        s.alive = false;
        s.view = null;
        s.getLod = null;
        s.gen = (s.gen + 1) & 0xffff;
        this.free.push(h & 0xffff);
        this.inUse--;
    }

    private resolve(h: FaceHandle): FaceSlot | null {
        if (h < 0) return null;
        const s = this.slots[h & 0xffff];
        if (!s || !s.alive || s.gen !== ((h >>> 16) & 0xffff)) return null;
        return s;
    }

    /** 掛上外部 LOD 來源（例如動畫管理器的 getLod）；設定後每次 update 都讀它 */
    attachLod(h: FaceHandle, getLod: () => number): void {
        const s = this.resolve(h);
        if (s) s.getLod = getLod;
    }

    setLod(h: FaceHandle, lod: QLodLevel): void {
        const s = this.resolve(h);
        if (!s) return;
        s.getLod = null;
        this.changeLod(s, lod);
    }

    getLod(h: FaceHandle): number {
        const s = this.resolve(h);
        return s ? s.lod : -1;
    }

    private changeLod(s: FaceSlot, lod: QLodLevel): void {
        if (s.lod === lod) return;
        s.lod = lod;
        if (lod === 2) {
            // 凍結：臉回到不眨眼、不說話的穩定狀態
            s.blinkLeft = 0;
            s.speakLeft = 0;
            s.speakSeq = null;
            s.dirty = true;
        }
    }

    // ---- 表情設定 ----

    private applyPresetInto(s: FaceSlot, name: string): void {
        const p = this.data.presets[name] ?? this.data.presets.neutral;
        s.baseEye = p.eye;
        s.baseMouth = p.mouth;
        s.marks = p.marks ? p.marks.slice(0, 2) : [];
        s.blushTarget = p.blush ?? 0;
        s.eyeScaleTarget = this.data.atlas.parts[p.eye].scale ?? 1;
        s.dirty = true;
    }

    /** 套用預設表情（資料表 presets）。未知名稱退回 neutral */
    setPreset(h: FaceHandle, name: string, fadeSec?: number): void {
        const s = this.resolve(h);
        if (!s) return;
        this.applyPresetInto(s, name);
        if (fadeSec === 0) {
            s.state.blush = s.blushTarget;
            s.state.eyeScale = s.eyeScaleTarget;
        }
    }

    /** 活動 → 預設表情（activityMap）。未知活動回 false，不改表情 */
    setActivity(h: FaceHandle, activity: string): boolean {
        const pr = this.data.activityMap[activity];
        if (!pr) return false;
        this.setPreset(h, pr);
        return true;
    }

    setEye(h: FaceHandle, eyeId: string): void {
        const s = this.resolve(h);
        const def = this.data.atlas.parts[eyeId];
        if (!s || !def) return;
        s.baseEye = eyeId;
        s.eyeScaleTarget = def.scale ?? 1;
        s.dirty = true;
    }

    setMouth(h: FaceHandle, mouthId: string): void {
        const s = this.resolve(h);
        if (!s || !this.data.atlas.parts[mouthId]) return;
        s.baseMouth = mouthId;
        s.dirty = true;
    }

    setBlush(h: FaceHandle, strength: number): void {
        const s = this.resolve(h);
        if (!s) return;
        s.blushTarget = Math.max(0, Math.min(1, strength));
        s.dirty = true;
    }

    /** 心情乘色（moods 表）；同時套心情對應的預設表情 */
    setMood(h: FaceHandle, mood: string, applyPreset = true): boolean {
        const s = this.resolve(h);
        const m = this.data.moods[mood];
        if (!s || !m) return false;
        s.tintTarget = parseHexColor(m.tint);
        s.boostTarget = m.brightBoost;
        if (applyPreset && m.preset) this.applyPresetInto(s, m.preset);
        s.dirty = true;
        return true;
    }

    /** 只換乘色，不動表情 */
    setMoodTint(h: FaceHandle, mood: string): boolean {
        return this.setMood(h, mood, false);
    }

    setAutoBlink(h: FaceHandle, enabled: boolean): void {
        const s = this.resolve(h);
        if (!s) return;
        s.autoBlink = enabled;
        if (!enabled) {
            s.blinkLeft = 0;
            s.dirty = true;
        }
    }

    /** 說話：durationSec 內依節拍切嘴幀，結束回原嘴型（不做真口型同步） */
    speak(h: FaceHandle, durationSec: number, intensity: FaceIntensity = 'mid'): void {
        const s = this.resolve(h);
        if (!s || durationSec <= 0 || s.lod === 2) return; // LOD2 不說話
        s.speakLeft = durationSec;
        s.speakSeq = this.data.speak.intensity[intensity];
        s.speakIdx = 0;
        s.speakBeat = 0;
        s.dirty = true;
    }

    getState(h: FaceHandle): Readonly<QFaceState> | null {
        const s = this.resolve(h);
        return s ? s.state : null;
    }

    isBlinking(h: FaceHandle): boolean {
        const s = this.resolve(h);
        return !!s && s.blinkLeft > 0;
    }

    // ---- 每幀 ----

    update(dt: number): void {
        if (dt <= 0) return;
        const b = this.data.blink;
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i];
            if (!s.alive) continue;
            if (s.getLod) this.changeLod(s, Math.max(0, Math.min(2, s.getLod())) as QLodLevel);
            const frozen = s.lod === 2;
            if (!frozen) {
                // 眨眼
                if (s.blinkLeft > 0) {
                    s.blinkLeft -= dt;
                    if (s.blinkLeft <= 0) {
                        s.blinkLeft = 0;
                        s.dirty = true;
                    }
                } else if (s.autoBlink && b.blinkableEyes.includes(s.baseEye)) {
                    s.blinkIn -= dt;
                    if (s.blinkIn <= 0) {
                        s.blinkLeft = b.durationSec;
                        s.blinkIn = b.minSec + s.rngBlink() * (b.maxSec - b.minSec);
                        s.dirty = true;
                    }
                }
                // 說話節拍
                if (s.speakLeft > 0 && s.speakSeq) {
                    s.speakLeft -= dt;
                    s.speakBeat -= dt;
                    if (s.speakBeat <= 0) {
                        s.speakBeat = this.data.speak.beatMinSec
                            + s.rngSpeak() * (this.data.speak.beatMaxSec - this.data.speak.beatMinSec);
                        s.speakIdx = (s.speakIdx + 1) % s.speakSeq.length;
                        s.dirty = true;
                    }
                    if (s.speakLeft <= 0) {
                        s.speakLeft = 0;
                        s.speakSeq = null;
                        s.dirty = true;
                    }
                }
                if (s.baseEye === 'eye_dizzy') {
                    s.dizzyAngle = (s.dizzyAngle + dt * 360) % 360;
                    s.dirty = true;
                }
            }
            // 數值漸變（紅暈、乘色、眼縮放）：即使 LOD2 也收斂到目標，之後不再變動
            const st = s.state;
            const e = this.data.easing;
            const nb = approach(st.blush, s.blushTarget, dt, e.blushSec);
            const ns = approach(st.eyeScale, s.eyeScaleTarget, dt, e.eyeScaleSec);
            const nr = approach(st.tintR, s.tintTarget[0], dt * 255, e.tintSec);
            const ng = approach(st.tintG, s.tintTarget[1], dt * 255, e.tintSec);
            const nbl = approach(st.tintB, s.tintTarget[2], dt * 255, e.tintSec);
            const nbo = approach(st.brightBoost, s.boostTarget, dt, e.tintSec);
            if (nb !== st.blush || ns !== st.eyeScale || nr !== st.tintR || ng !== st.tintG || nbl !== st.tintB || nbo !== st.brightBoost) {
                st.blush = nb;
                st.eyeScale = ns;
                st.tintR = nr;
                st.tintG = ng;
                st.tintB = nbl;
                st.brightBoost = nbo;
                s.dirty = true;
            }
            if (s.dirty) this.flush(s);
        }
    }

    /** 把槽位內部狀態整理成 QFaceState 交給套用端（只有變動時才呼叫 view.apply） */
    private flush(s: FaceSlot): void {
        const d = this.data;
        const st = s.state;
        const eye = s.blinkLeft > 0 ? d.blink.blinkEye : s.baseEye;
        const mouth = s.speakLeft > 0 && s.speakSeq ? s.speakSeq[s.speakIdx] : s.baseMouth;
        st.eye = eye;
        st.mouth = mouth;
        st.eyeCell = cellOf(d, s.partSet, eye);
        st.mouthCell = cellOf(d, s.partSet, mouth);
        st.blushCell = cellOf(d, s.partSet, BLUSH_PART);
        st.eyeRot = s.baseEye === 'eye_dizzy' ? s.dizzyAngle : 0;
        st.mouthScaleY = 1;
        st.markCell0 = s.marks.length > 0 ? cellOf(d, s.partSet, s.marks[0]) : -1;
        st.markCell1 = s.marks.length > 1 ? cellOf(d, s.partSet, s.marks[1]) : -1;
        s.dirty = false;
        if (s.view) s.view.apply(st);
    }
}
