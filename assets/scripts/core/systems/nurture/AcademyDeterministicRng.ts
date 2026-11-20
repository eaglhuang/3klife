// @spec-source → ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md (doc_spec_0302) §2.1 確定性 PRNG 種子管線（PROG-2-1902）
/**
 * AcademyDeterministicRng — 學府培育的防 SL 種子鏈（純邏輯，不依賴 cc）。
 *
 * - 根種子：S0 = HMAC-SHA256(key = WorldSeed, ClanUUID + ChildID + AcademyID + AdmissionTurn)。
 * - 每次取樣：S(t+1) = SHA256(S(t) ‖ StepSalt)，StepSalt = 呼叫端標籤 + 步數；取新狀態前 4 bytes 當 uint32。
 * - 全部整數運算：nextInt 用拒絕取樣去除模數偏差，pickWeighted 用整數累積權重。
 * - 狀態只有 (seedHex, stepIndex)，存檔後讀回即可 100% 重播。
 * - PROG-2-9202：演算法本體已搬到 shared/foundation/DeterministicRng.ts（DeterministicRngSession），
 *   本檔只保留學府專屬的根種子推導與相容類別名；結果與舊實作逐位元相同。
 *
 * Unity 對照：像自帶狀態的 System.Random，但狀態可序列化、跨平台結果一致。
 */
import { hmacSha256Hex } from '../../../shared/foundation/Sha256';
import { DeterministicRngSession } from '../../../shared/foundation/DeterministicRng';
import { AcademyId } from './AcademyTypes';

export function deriveAcademyRootSeed(
    worldSeed: string, clanUuid: string, childId: string, academyId: AcademyId, admissionTurn: number,
): string {
    return hmacSha256Hex(`${clanUuid}${childId}${academyId}${admissionTurn}`, worldSeed);
}

/** 學府亂數：沿用共通底層工具層的會話（IDeterministicRng 結構相容，既有呼叫端不用改） */
export class AcademyRng extends DeterministicRngSession {}
