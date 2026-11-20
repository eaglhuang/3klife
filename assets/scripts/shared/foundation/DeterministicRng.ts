// @spec-source → 共用框架總綱規格書 (doc_spec_1182) 第 11 章 Q-A、§5.4／§5.5／§5.11；獎勵系統 Base 規格書 §3.5；PROG-2-9202
/**
 * DeterministicRng — 確定性亂數會話（零依賴純函式庫）。
 *
 * 狀態只有 `(seedHex, stepIndex)`：
 *   - 每次取樣 S(t+1) = SHA256(S(t) | salt # step)，取新狀態前 4 bytes 當 uint32；
 *   - 全部整數運算（拒絕取樣去除模數偏差），跨平台結果一致；
 *   - 存檔時只存 `{ seedHex, stepIndex }`，讀回即可 100% 重播（防 SL、重開自愈）。
 *
 * 【伺服器權威】（總綱 §5.5）
 *   正式結果（獎池、保底、開獎）只能由「本機伺服器 adapter」持有會話並推進；
 *   種子與步數不下發客戶端，客戶端不得自行 new 會話算「正式結果」。
 *   客戶端若要做預覽（例如抽獎動畫的假結果、機率顯示），請用 `createPreviewRng()`，
 *   它用與存檔無關的一次性種子，結果不具任何效力。
 *
 * Unity 對照：像自帶狀態的 System.Random，但狀態可序列化、跨平台結果一致。
 */
import { hmacSha256Hex, sha256, toHex, utf8Encode } from './Sha256';

const UINT32_RANGE = 0x100000000;
const SEED_HEX_PATTERN = /^[0-9a-f]{64}$/;

/** 可序列化的會話狀態（存伺服器側存檔；不進客戶端回應） */
export interface RngSessionState {
    seedHex: string;
    stepIndex: number;
}

/**
 * 隨機源最小介面：WeightedTable、各框架只依賴這個，不依賴具體實作，
 * 因此戰場種子、測試假隨機也能直接接上。
 */
export interface RandomSource {
    /** 回傳 [0, maxExclusive) 的整數；maxExclusive 必須是正整數 */
    nextInt(maxExclusive: number, salt: string): number;
}

/** 完整會話介面（供需要 chance／pickWeighted 的呼叫端使用） */
export interface IDeterministicRng extends RandomSource {
    readonly seedHex: string;
    readonly stepIndex: number;
    nextUint32(salt: string): number;
    chance(numerator: number, denominator: number, salt: string): boolean;
    pickWeighted(weights: readonly number[], salt: string): number;
}

/**
 * 由世界種子與識別字串推導根種子：HMAC-SHA256(key = worldSeed, message = parts 以 `|` 連接)。
 * 呼叫端自行決定 parts（例如存檔 id、系統名、起始回合），同一組輸入必得同一根種子。
 */
export function deriveRngSeed(worldSeed: string, ...parts: readonly (string | number)[]): string {
    return hmacSha256Hex(parts.join('|'), worldSeed);
}

/** 檢查種子格式（64 字元小寫 hex） */
export function isValidSeedHex(seedHex: unknown): seedHex is string {
    return typeof seedHex === 'string' && SEED_HEX_PATTERN.test(seedHex);
}

export class DeterministicRngSession implements IDeterministicRng {
    private _seedHex: string;
    private _stepIndex: number;

    public constructor(seedHex: string, stepIndex = 0) {
        if (!isValidSeedHex(seedHex)) {
            throw new Error(`DeterministicRngSession: 種子必須是 64 字元小寫 hex，收到 "${seedHex}"`);
        }
        if (!Number.isInteger(stepIndex) || stepIndex < 0) {
            throw new Error(`DeterministicRngSession: stepIndex 必須是非負整數，收到 ${stepIndex}`);
        }
        this._seedHex = seedHex;
        this._stepIndex = stepIndex;
    }

    /** 由存檔狀態還原（驗證格式，壞檔直接丟錯而不是默默從頭開始） */
    public static restore(state: RngSessionState): DeterministicRngSession {
        return new DeterministicRngSession(state.seedHex, state.stepIndex);
    }

    public get seedHex(): string { return this._seedHex; }
    public get stepIndex(): number { return this._stepIndex; }

    /** 目前狀態的拷貝，存檔用 */
    public snapshot(): RngSessionState {
        return { seedHex: this._seedHex, stepIndex: this._stepIndex };
    }

    /** 以目前狀態複製一份獨立會話；在複本上取樣不會推進本體（預覽、模擬用） */
    public clone(): DeterministicRngSession {
        return new DeterministicRngSession(this._seedHex, this._stepIndex);
    }

    /** 取一個 uint32 並推進一步；salt 是呼叫端標籤，不同用途請用不同標籤 */
    public nextUint32(salt: string): number {
        const next = sha256(utf8Encode(`${this._seedHex}|${salt}#${this._stepIndex}`));
        this._seedHex = toHex(next);
        this._stepIndex += 1;
        return ((next[0] << 24) | (next[1] << 16) | (next[2] << 8) | next[3]) >>> 0;
    }

    /** [0, maxExclusive) 整數；拒絕取樣，沒有模數偏差（拒絕時也會多推進步數，仍可重播） */
    public nextInt(maxExclusive: number, salt: string): number {
        if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
            throw new Error(`DeterministicRngSession.nextInt: 上限必須是正整數，收到 ${maxExclusive}`);
        }
        const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
        let value = this.nextUint32(salt);
        while (value >= limit) {
            value = this.nextUint32(salt);
        }
        return value % maxExclusive;
    }

    /** 機率判定：numerator／denominator（整數比，避免浮點） */
    public chance(numerator: number, denominator: number, salt: string): boolean {
        if (numerator <= 0) return false;
        if (numerator >= denominator) return true;
        return this.nextInt(denominator, salt) < numerator;
    }

    /** 依整數權重抽索引；權重須為非負整數且總和大於 0 */
    public pickWeighted(weights: readonly number[], salt: string): number {
        let total = 0;
        for (const w of weights) {
            if (!Number.isInteger(w) || w < 0) {
                throw new Error(`DeterministicRngSession.pickWeighted: 權重必須是非負整數，收到 ${w}`);
            }
            total += w;
        }
        if (total <= 0) {
            throw new Error('DeterministicRngSession.pickWeighted: 權重總和必須大於 0');
        }
        let roll = this.nextInt(total, salt);
        for (let i = 0; i < weights.length; i++) {
            if (roll < weights[i]) return i;
            roll -= weights[i];
        }
        return weights.length - 1;
    }
}

/**
 * 客戶端預覽用亂數：種子取自呼叫端提供的一次性字串（例如畫面開啟時間），
 * 與存檔會話無關，結果只能拿來做動畫與假預覽，**不可當正式結果**。
 */
export function createPreviewRng(previewTag: string): DeterministicRngSession {
    return new DeterministicRngSession(deriveRngSeed('preview-only', previewTag));
}
