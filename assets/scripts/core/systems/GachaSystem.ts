// @spec-source → 轉蛋系統.md §L；PROG-2-9020 統一轉蛋入口
import type { GachaConfig } from '../models/GachaConfig';
import type { GeneralConfig } from '../models/GeneralUnit';
import type { LocalGachaResultEntry } from '../services/LocalGachaService';
import { resolveGachaPoolPresentation, type GachaPoolPresentation } from './GachaPoolPresentation';

/** 一次抽卡請求：哪一池、抽幾張、候選武將（呼叫端先依池篩好）。 */
export interface GachaPullRequest {
    poolId: string;
    drawCount: number;
    generals: GeneralConfig[];
    /** 池設定還沒載入（或舊池 id 不在設定檔）時用來選規則的池類型 */
    poolTypeHint?: string;
}

/** 各池規則只回傳抽到的結果；呈現由池設定決定。 */
export interface GachaPoolRule {
    pull(request: Readonly<GachaPullRequest>, pool: Readonly<GachaConfig> | null): Promise<LocalGachaResultEntry[]>;
}

/** 抽卡結果＋該池呈現設定，交給結果畫面統一顯示。 */
export interface GachaPullOutcome {
    poolId: string;
    drawCount: number;
    results: LocalGachaResultEntry[];
    presentation: GachaPoolPresentation;
}

/**
 * 轉蛋系統（引擎中立）：所有抽卡（武將池、紅顏池、支援卡池、宿命池…）都是這裡的一池。
 * 規則以 poolType 註冊（也可用 poolId 覆寫單一池），新增池只要加設定或註冊規則，不另寫抽卡流程。
 *
 * Unity 對照：ScriptableObject 池設定 + 策略模式（IPoolRule）。
 */
export class GachaSystem {
    private readonly _rulesByType = new Map<string, GachaPoolRule>();
    private readonly _rulesById = new Map<string, GachaPoolRule>();

    constructor(private readonly _pools: () => readonly GachaConfig[]) {}

    registerType(poolType: string, rule: GachaPoolRule): this { this._rulesByType.set(poolType, rule); return this; }
    registerPool(poolId: string, rule: GachaPoolRule): this { this._rulesById.set(poolId, rule); return this; }

    pool(poolId: string): GachaConfig | null {
        return this._pools().find(p => p.poolId === poolId) ?? null;
    }

    presentation(poolId: string): GachaPoolPresentation {
        return resolveGachaPoolPresentation(this.pool(poolId), poolId);
    }

    hasRule(poolId: string): boolean {
        const pool = this.pool(poolId);
        return this._rulesById.has(poolId) || (!!pool && this._rulesByType.has(pool.poolType));
    }

    async pull(request: Readonly<GachaPullRequest>): Promise<GachaPullOutcome> {
        const pool = this.pool(request.poolId);
        const type = pool?.poolType ?? request.poolTypeHint;
        const rule = this._rulesById.get(request.poolId) ?? (type ? this._rulesByType.get(type) : undefined);
        if (!rule) throw new Error(`[GachaSystem] 沒有可用的抽卡規則：${request.poolId}`);
        const results = await rule.pull(request, pool);
        return { poolId: request.poolId, drawCount: request.drawCount, results, presentation: resolveGachaPoolPresentation(pool, request.poolId) };
    }
}
