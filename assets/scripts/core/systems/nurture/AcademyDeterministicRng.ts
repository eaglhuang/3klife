// @spec-source → ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md (doc_spec_0302) §2.1 確定性 PRNG 種子管線（PROG-2-1902）
/**
 * AcademyDeterministicRng — 學府培育的防 SL 種子鏈（純邏輯，不依賴 cc）。
 *
 * - 根種子：S0 = HMAC-SHA256(key = WorldSeed, ClanUUID + ChildID + AcademyID + AdmissionTurn)。
 * - 每次取樣：S(t+1) = SHA256(S(t) ‖ StepSalt)，StepSalt = 呼叫端標籤 + 步數；取新狀態前 4 bytes 當 uint32。
 * - 全部整數運算：nextInt 用拒絕取樣去除模數偏差，pickWeighted 用整數累積權重。
 * - 狀態只有 (seedHex, stepIndex)，存檔後讀回即可 100% 重播。
 *
 * Unity 對照：像自帶狀態的 System.Random，但狀態可序列化、跨平台結果一致。
 */
import { hmacSha256Hex, sha256, utf8Encode } from '../SyncHash';
import { AcademyId, IDeterministicRng } from './AcademyTypes';

const UINT32_RANGE = 0x100000000;

function bytesToHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

export function deriveAcademyRootSeed(
    worldSeed: string, clanUuid: string, childId: string, academyId: AcademyId, admissionTurn: number,
): string {
    return hmacSha256Hex(`${clanUuid}${childId}${academyId}${admissionTurn}`, worldSeed);
}

export class AcademyRng implements IDeterministicRng {
    private _seedHex: string;
    private _stepIndex: number;

    constructor(seedHex: string, stepIndex = 0) {
        if (!/^[0-9a-f]{64}$/.test(seedHex)) {
            throw new Error(`AcademyRng: 種子必須是 64 字元小寫 hex，收到 "${seedHex}"`);
        }
        this._seedHex = seedHex;
        this._stepIndex = stepIndex;
    }

    get seedHex(): string { return this._seedHex; }
    get stepIndex(): number { return this._stepIndex; }

    nextUint32(salt: string): number {
        const next = sha256(utf8Encode(`${this._seedHex}|${salt}#${this._stepIndex}`));
        this._seedHex = bytesToHex(next);
        this._stepIndex += 1;
        return ((next[0] << 24) | (next[1] << 16) | (next[2] << 8) | next[3]) >>> 0;
    }

    nextInt(maxExclusive: number, salt: string): number {
        if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
            throw new Error(`AcademyRng.nextInt: 上限必須是正整數，收到 ${maxExclusive}`);
        }
        const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
        let value = this.nextUint32(salt);
        while (value >= limit) {
            value = this.nextUint32(salt);
        }
        return value % maxExclusive;
    }

    chance(numerator: number, denominator: number, salt: string): boolean {
        if (numerator <= 0) return false;
        if (numerator >= denominator) return true;
        return this.nextInt(denominator, salt) < numerator;
    }

    pickWeighted(weights: readonly number[], salt: string): number {
        let total = 0;
        for (const w of weights) {
            if (!Number.isInteger(w) || w < 0) {
                throw new Error(`AcademyRng.pickWeighted: 權重必須是非負整數，收到 ${w}`);
            }
            total += w;
        }
        if (total <= 0) {
            throw new Error('AcademyRng.pickWeighted: 權重總和必須大於 0');
        }
        let roll = this.nextInt(total, salt);
        for (let i = 0; i < weights.length; i++) {
            if (roll < weights[i]) return i;
            roll -= weights[i];
        }
        return weights.length - 1;
    }
}
