/**
 * MissionRng — 任務亂數：mulberry32 + 依（存檔種子, 任務 id, 用途）衍生獨立串流
 *
 * 目的：結算結果只取決於輸入，與「哪個任務先結算、呼叫幾次」無關，server 重算必同。
 * 不使用 Date.now / Math.random。
 */

/** mulberry32：回傳 [0,1) 與下一個種子狀態（演算法同舊 nextHallRandom） */
export function mulberry32Next(seed: number): { value: number; seed: number } {
    const next = (seed + 0x6d2b79f5) >>> 0;
    let t = next;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** FNV-1a 字串雜湊（32 位元無號） */
export function hashText(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** 由（存檔種子, 任務 id, 用途）衍生種子；用途字串不同即為獨立串流 */
export function deriveSeed(saveSeed: number, missionId: string, purpose: string): number {
    const mixed = hashText(`${saveSeed >>> 0}|${missionId}|${purpose}`);
    // 再過一次 mulberry32 打散，避免相近字串得到相近種子
    return mulberry32Next(mixed).seed;
}

/** 以衍生種子取「單一」[0,1) 值（無狀態；同輸入永遠同值） */
export function deriveUnit(saveSeed: number, missionId: string, purpose: string): number {
    return mulberry32Next(deriveSeed(saveSeed, missionId, purpose)).value;
}

export interface MissionRng {
    next(): number;
    /** 目前種子狀態（可存檔） */
    readonly state: number;
}

export function createMissionRng(seed: number): MissionRng {
    let s = seed >>> 0;
    return {
        next(): number {
            const r = mulberry32Next(s);
            s = r.seed;
            return r.value;
        },
        get state(): number { return s; },
    };
}

export function deriveRng(saveSeed: number, missionId: string, purpose: string): MissionRng {
    return createMissionRng(deriveSeed(saveSeed, missionId, purpose));
}

/** 依權重抽一項；weights 全為 0 時取第一項。u 為 [0,1) */
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, u: number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return items[0];
    let acc = 0;
    const target = u * total;
    for (const it of items) {
        acc += Math.max(0, weightOf(it));
        if (target < acc) return it;
    }
    return items[items.length - 1];
}
