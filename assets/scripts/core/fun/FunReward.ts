// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §1.3；獎勵框架 doc_spec_1186；PROG-2-10177
/**
 * FunReward — 樂趣功能的獎勵入帳（純邏輯，不依賴 cc）。
 * 不新增獎勵類型：只宣告套件，經 reward.claim 入帳；同一 grantKey 只入帳一次（重送回原結果）。
 * 失敗不丟例外，回 ok=false；演出被跳過不影響入帳。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { RewardGrantResult } from '../../shared/api/ApiCommands';

export interface FunClaimRequest {
    bundleId: string;
    grantKey: string;
    /** 來源種類（套件 sources 白名單）：fun01／fun02／fun03 */
    sourceKind: string;
    /** 來源參照：孩子 id／武將 id（handler 由此取得對象） */
    sourceRef: string;
}

export interface FunClaimOutcome {
    ok: boolean;
    /** 先前已入帳（本次沒有新入帳） */
    replayed: boolean;
    /** 本次新入帳的數量（effect 的 amount 加總；已到上限為 0） */
    applied: number;
}

export async function claimFunReward(api: Pick<IApiClient, 'cmd'>, req: FunClaimRequest): Promise<FunClaimOutcome> {
    try {
        const res = await api.cmd<RewardGrantResult>('reward.claim', {
            bundleId: req.bundleId,
            grantKey: req.grantKey,
            source: { kind: req.sourceKind, ref: req.sourceRef },
        });
        if (isApiFail(res)) return { ok: false, replayed: false, applied: 0 };
        if (res.result.replayed) return { ok: true, replayed: true, applied: 0 };
        const applied = res.result.plan.reduce((sum, line) => {
            const amount = line.applied.amount;
            return typeof amount === 'number' ? sum + amount : sum;
        }, 0);
        return { ok: true, replayed: false, applied };
    } catch {
        return { ok: false, replayed: false, applied: 0 };
    }
}
