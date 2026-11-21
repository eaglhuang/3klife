// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12 轉蛋遷移；轉蛋系統.md (doc_spec_0042)；GCH-R4（PROG-2-9463）
/**
 * RewardGachaPull — 轉蛋抽取改走共通 API（reward.roll）的轉接層（純邏輯，不依賴 cc）。
 *
 * 一次抽卡 = wallet.balance 預檢 → reward.roll（抽取、保底、發武將 handler）→ wallet.spend 扣款 → 重複卡逐張 reward.claim 轉換 bundle。
 * 機率、保底、UP 全來自獎池 JSON（data/gacha-reward-pools.json）；這裡不含任何池規則。
 * 武將入名冊由 kind "general" 的發放 handler 負責（見 createGeneralGrantHandler），走宿主的名冊入口，不直接寫存檔。
 *
 * 舊路徑（LocalGachaService）仍在，由旗標決定走哪一條；兩條路徑回給畫面的結果型別相同（LocalGachaResultEntry）。
 */
import type { RewardGrantResult, RewardPityView, RewardPoolsResult, RewardTallyView } from '../../shared/api/ApiCommands';
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { IApiClient } from '../../shared/api/IApiClient';
import type { GeneralConfig } from '../models/GeneralUnit';
import type { RewardEffectHandler } from '../api/localserver/RewardCommands';
import type { LocalGachaResultEntry } from '../services/LocalGachaService';
import { formatDrawResultText, inferRarityTier } from './GachaRarity';
import type { GachaCurrencyId, GachaRateDto } from './GachaApi';

/** 發武將的宿主入口（單機＝GameSession 名冊）：同一個 id 第二次入冊要回報 duplicate */
export interface GeneralGrantHost {
    resolve(id: string): GeneralConfig | null;
    enroll(general: GeneralConfig): { duplicate: boolean };
}

/** kind "general" 的發放 handler：只經宿主名冊入口，重複者不入冊、以 trace DUPLICATE 標記交給轉換 bundle */
export function createGeneralGrantHandler(host: GeneralGrantHost): RewardEffectHandler {
    return (effect) => {
        const id = String(effect.generalId ?? effect.id ?? '');
        const general = id ? host.resolve(id) : null;
        if (!general) throw new Error(`找不到武將 ${id}`);
        const { duplicate } = host.enroll(general);
        return {
            applied: effect,
            trace: [duplicate ? 'DUPLICATE' : 'ENROLLED'],
            events: [{ evt: 'roster.granted', data: { generalId: id, duplicate } }],
        };
    };
}

export interface RewardGachaHost {
    resolveGeneral(id: string): GeneralConfig | null;
    /** 抽卡成功後（扣款、入冊都完成）：寫抽卡紀錄、存檔 */
    afterPull?(info: { poolId: string; currency: string; cost: number; results: LocalGachaResultEntry[]; added: GeneralConfig[]; duplicates: GeneralConfig[] }): void;
}

export interface RewardGachaPullArgs {
    /** 畫面沿用的池 id（例如 GENERAL_STANDARD_01） */
    poolId: string;
    count: number;
    currency: GachaCurrencyId;
    /** 這一次的總價（價格表仍在 gacha-main-pools.json；商店框架上線後改由商店命令報價） */
    cost: number;
    requestId?: string;
}

export interface RewardGachaPullOutcome {
    results: LocalGachaResultEntry[];
    currency: GachaCurrencyId;
    spent: number;
    added: GeneralConfig[];
    duplicates: GeneralConfig[];
    /** 重複卡轉換的 bundle（每張一筆） */
    converted: Array<{ generalId: string; bundleId: string }>;
    pities: RewardPityView[];
}

const TIER_BUNDLE = (tier: string): string => `BUNDLE_GACHA_DUP_${tier}`;

function failText(res: { message: string; errorCode: string }): string {
    return res.message || res.errorCode;
}

export class RewardGachaPort {
    private _seq = 0;

    public constructor(
        private readonly _api: IApiClient,
        private readonly _poolMap: Readonly<Record<string, string>>,
        private readonly _host: RewardGachaHost,
        private readonly _now: () => number = Date.now,
        /** true：重複卡不自動轉 bundle，原樣交回呼叫端走重複卡分流彈窗（復生重練／血脈灌注／升星，doc_spec_0331）；預設 false 維持自動轉換 */
        private readonly _deferDuplicates: boolean = false,
    ) {}

    public handles(legacyPoolId: string): boolean {
        return this._poolMap[legacyPoolId] !== undefined;
    }

    public rewardPoolOf(legacyPoolId: string): string | null {
        return this._poolMap[legacyPoolId] ?? null;
    }

    public async pull(args: RewardGachaPullArgs): Promise<RewardGachaPullOutcome> {
        const rewardPoolId = this.rewardPoolOf(args.poolId);
        if (!rewardPoolId) throw new Error(`轉蛋池 ${args.poolId} 沒有對應的獎池`);
        const bal = await this._api.query<Record<string, number>>('wallet.balance', { currency: args.currency });
        if (isApiFail(bal)) throw new Error(failText(bal));
        if ((bal.result[args.currency] ?? 0) < args.cost) throw new Error(`餘額不足，還差 ${args.cost - (bal.result[args.currency] ?? 0)}`);

        this._seq += 1;
        const grantKey = `gacha:${args.poolId}:${args.requestId ?? `${this._now()}-${this._seq}`}`;
        const roll = await this._api.cmd<RewardGrantResult>('reward.roll', {
            poolId: rewardPoolId, count: args.count, grantKey, source: { kind: 'shop', ref: args.poolId },
        });
        if (isApiFail(roll)) throw new Error(failText(roll));
        const grant = roll.result;

        const spend = await this._api.cmd('wallet.spend', { currency: args.currency, amount: args.cost, reason: `gacha:${args.poolId}` });
        if (isApiFail(spend)) throw new Error(failText(spend));

        const results: LocalGachaResultEntry[] = [];
        const added: GeneralConfig[] = [];
        const duplicates: GeneralConfig[] = [];
        const converted: Array<{ generalId: string; bundleId: string }> = [];
        for (let i = 0; i < grant.plan.length; i += 1) {
            const line = grant.plan[i];
            const id = String(line.applied.generalId ?? '');
            const general = this._host.resolveGeneral(id);
            if (!general) continue;
            const rarityTier = inferRarityTier(general);
            results.push({
                general, rarityTier, drawIndex: i + 1, displayText: formatDrawResultText(i, general, rarityTier),
                poolId: args.poolId, actionType: 'LOCAL_GACHA_PULL', currencyKey: args.currency as LocalGachaResultEntry['currencyKey'],
            });
            if (line.trace.indexOf('DUPLICATE') < 0) { added.push(general); continue; }
            duplicates.push(general);
            if (this._deferDuplicates) continue;
            const bundleId = TIER_BUNDLE(line.tier);
            const claim = await this._api.cmd<RewardGrantResult>('reward.claim', {
                bundleId, grantKey: `${grantKey}:dup:${i}`, source: { kind: 'gacha', ref: args.poolId },
            });
            if (!isApiFail(claim)) converted.push({ generalId: id, bundleId });
        }
        this._host.afterPull?.({ poolId: args.poolId, currency: args.currency, cost: args.cost, results, added, duplicates });
        return { results, currency: args.currency, spent: args.cost, added, duplicates, converted, pities: grant.pities ?? [] };
    }

    /** 天命商店進度（reward.pity 的累計計數）：每滿 creditEvery 抽得 1 次資格；沒有累計計數的池回 null */
    public async tally(legacyPoolId: string): Promise<RewardTallyView | null> {
        const rewardPoolId = this.rewardPoolOf(legacyPoolId);
        if (!rewardPoolId) return null;
        const res = await this._api.query<{ tallies?: RewardTallyView[] }>('reward.pity', { poolId: rewardPoolId });
        if (isApiFail(res)) return null;
        return res.result.tallies?.[0] ?? null;
    }

    /** 兌換一次天命商店資格（reward.pity.redeem）；成功回 true，資格不足回 false。武將入冊由呼叫端接著做 */
    public async redeem(legacyPoolId: string, requestId?: string): Promise<boolean> {
        const rewardPoolId = this.rewardPoolOf(legacyPoolId);
        if (!rewardPoolId) return false;
        this._seq += 1;
        const res = await this._api.cmd('reward.pity.redeem', {
            poolId: rewardPoolId, grantKey: `redeem:${legacyPoolId}:${requestId ?? `${this._now()}-${this._seq}`}`,
        });
        return !isApiFail(res);
    }

    /** 池詳情：等階機率與 SSR 保底進度，與抽樣同一份資料（reward.pools）；查不到回 null */
    public async view(legacyPoolId: string): Promise<{ rates: GachaRateDto[]; pity: { current: number; max: number } | null } | null> {
        const rewardPoolId = this.rewardPoolOf(legacyPoolId);
        if (!rewardPoolId) return null;
        const res = await this._api.query<RewardPoolsResult>('reward.pools', {});
        if (isApiFail(res)) return null;
        const pool = res.result.pools.find((p) => p.poolId === rewardPoolId);
        if (!pool) return null;
        const rates: GachaRateDto[] = pool.tiers
            .filter((t) => t.tier === 'SSR' || t.tier === 'SR' || t.tier === 'R')
            .map((t) => ({ rarity: t.tier as 'SSR' | 'SR' | 'R', percent: Math.round(t.baseRate * 10000) / 100 }));
        const ssr = pool.pities.find((p) => p.tier === 'SSR');
        return { rates, pity: ssr ? { current: ssr.counter, max: ssr.hardAt } : null };
    }
}
