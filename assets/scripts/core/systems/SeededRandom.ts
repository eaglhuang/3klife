/** 養成共用亂數游標；演算法版本不可原地替換，以免既有存檔改變結果。 */
export interface RandomState {
    algorithm: 'mulberry32-v1';
    state: number;
}

/** 舊存檔沒有亂數歷史，只能從固定起點開始；無法還原遷移前的結果。 */
export const LEGACY_RANDOM_SEED = 0x6d2b79f5;

export function validateRandomState(raw: unknown): RandomState {
    const value = raw as Partial<RandomState> | null;
    if (!value || value.algorithm !== 'mulberry32-v1' ||
        !Number.isInteger(value.state) || value.state! < 0 || value.state! > 0xffffffff) {
        throw new Error('[SeededRandom] 不支援或損壞的亂數狀態');
    }
    return { algorithm: 'mulberry32-v1', state: value.state! };
}

export class SeededRandom {
    private _state: number;

    constructor(seed: number) {
        this._state = validateRandomState({ algorithm: 'mulberry32-v1', state: seed }).state;
    }

    public next(): number {
        this._state = (this._state + 0x6d2b79f5) >>> 0;
        let t = this._state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    public snapshot(): RandomState {
        return { algorithm: 'mulberry32-v1', state: this._state };
    }

    public restore(raw: unknown): void {
        this._state = validateRandomState(raw).state;
    }
}
