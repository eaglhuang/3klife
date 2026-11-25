// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §4 結算層、§11 伺服器 API；共用框架總綱 (doc_spec_1182) §5.4 冪等、§5.5 權威、§12 RWD-M；PROG-2-9205
/**
 * RewardCommands — 獎勵命令（reward.roll／claim／pools／pity）在本機 adapter 的處理器。
 *
 * 抽取、保底、縮放、入帳、懲罰截斷都在這層；玩法只送「抽哪個池／領哪個套件、憑什麼來源、去重鍵」。
 * 亂數會話與保底計數存在 RewardAuthority 的 meta（隨存檔保存、不下發客戶端），所以重開遊戲也不能重抽。
 *
 * 入帳規則：道具一律呼叫物品庫存命令層（item.grant／consume），貨幣走錢包 port，
 * 宿主自訂種類（技能、聲望、劇情…）用 registerEffectHandler 掛 handler；全部成功才算給獎，
 * 中途失敗就反向撤銷已入帳的部分並回 E325，亂數步數與保底計數都不前進（整筆不生效）。
 * 純邏輯，不 import cc。
 */
import {
    WALLET_CURRENCIES, type RewardGrantResult, type RewardPlanLine,
} from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import type { ApiDeltaOp } from '../../../shared/api/ApiProtocol';
import { type Condition } from '../../../shared/foundation/Condition';
import { DeterministicRngSession, deriveRngSeed } from '../../../shared/foundation/DeterministicRng';
import { weightedTotal } from '../../../shared/foundation/WeightedTable';
import { pityViewsOf, poolViewOf, tallyViewsOf } from '../../../shared/reward/RewardDisclosure';
import {
    findBundle, findPool, type RewardBundleDef, type RewardConfigV1, type RewardEffectDef, type RewardPoolDef, type RewardPresentationDef,
} from '../../../shared/reward/RewardConfig';
import {
    capLoss, emptyRewardMeta, planBundle, REWARD_GRANT_LIMIT, rollPool, scaleEffect,
    type RewardMeta, type RewardPlanItem,
} from '../../../shared/reward/RewardRules';
import type { HandlerOutcome, LocalApiAdapter } from './LocalApiAdapter';
import type { WalletAuthority } from './WalletCommands';

/** 權威端的獎勵狀態存放 port：單機由 GameSession 實作（存檔欄位 rewardMeta）；連線時由伺服器取代 */
export interface RewardAuthority {
    meta(): RewardMeta;
    setMeta(meta: RewardMeta): void;
}

/** 效果套用的結果：實際入帳量、溢出、增量與事件、撤銷函式 */
export interface RewardEffectOutcome {
    applied?: RewardEffectDef;
    trace?: string[];
    overflow?: Array<{ itemId: string; units: number; currency: string; amount: number }>;
    delta?: ApiDeltaOp[];
    events?: Array<{ evt: string; data?: unknown }>;
    /** 後面的效果失敗時反向撤銷；盡力而為，不得丟錯 */
    undo?: () => Promise<void>;
}

export interface RewardEffectEnv {
    refId: string;
    /** 本次發放的來源（reward.claim 的 source）；宿主 handler 可讀 ref 取得對象，例如台詞成就的武將 id（PROG-2-9864） */
    source?: { kind: string; ref?: string };
    wallet: WalletAuthority | null;
    /** 呼叫其他命令層（item.*）；不得繞過它直接改庫存 */
    invoke: LocalApiAdapter['invoke'];
}

/** 宿主種類 handler（技能習得、聲望、劇情觸發…）：不認識的種類由這裡接，框架不改 */
export type RewardEffectHandler = (effect: RewardEffectDef, env: RewardEffectEnv) => Promise<RewardEffectOutcome> | RewardEffectOutcome;

export interface RewardPorts {
    authority: RewardAuthority | null;
    wallet: WalletAuthority | null;
    config: RewardConfigV1;
    /** 條件評估（伺服器權威存檔上評估）；獎池有 condition 而這裡沒給就視為未開放 */
    evaluate?: (condition: Condition) => boolean;
    /** 倍率（特質、道具、難度）：由宿主依來源提供，客戶端不可傳 */
    modifiers?: (source: { kind: string; ref?: string }, refId: string) => { reward?: number; risk?: number };
    /** 宿主種類 handler */
    handlers?: Readonly<Record<string, RewardEffectHandler>>;
    /** 首次建立亂數會話的熵來源（測試可固定） */
    entropy?: () => string;
}

const ROLL_ARGS = ['poolId', 'count', 'grantKey', 'source'];
const CLAIM_ARGS = ['bundleId', 'grantKey', 'source'];
const REDEEM_ARGS = ['poolId', 'counterKey', 'grantKey'];

function requireText(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new ApiError('INVALID_SCHEMA', `${field} 不可為空`);
    return value;
}

function requireSource(value: unknown): { kind: string; ref?: string } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ApiError('INVALID_SCHEMA', 'source 必須是物件');
    const src = value as Record<string, unknown>;
    const kind = requireText(src.kind, 'source.kind');
    if (src.ref !== undefined && typeof src.ref !== 'string') throw new ApiError('INVALID_SCHEMA', 'source.ref 必須是字串');
    return { kind, ...(typeof src.ref === 'string' ? { ref: src.ref } : {}) };
}

/** 只收意圖欄位；多帶的一律當作想夾帶結果（規格 §11.3） */
function rejectExtra(args: Record<string, unknown>, allowed: readonly string[]): void {
    const extra = Object.keys(args).find((k) => allowed.indexOf(k) < 0);
    if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
}

function numberField(effect: RewardEffectDef, field: 'amount' | 'qty'): number {
    const value = effect[field];
    return typeof value === 'number' ? value : 0;
}

/** 內建 currency handler：正數入帳、負數扣款（截到餘額，截斷寫 trace） */
const currencyHandler: RewardEffectHandler = (effect, env) => {
    const currency = String(effect.id);
    const amount = numberField(effect, 'amount');
    const wallet = env.wallet;
    if (!wallet) throw new ApiError('WALLET_UNAVAILABLE', '錢包尚未就緒');
    if (amount > 0) {
        if (!wallet.credit) throw new ApiError('WALLET_UNAVAILABLE', '錢包不接受入帳');
        wallet.credit(currency, amount);
        return {
            applied: effect,
            delta: [{ path: `/gachaWallet/${currency}`, op: 'replace', value: wallet.balance(currency) }],
            events: [{ evt: 'inventory.changed', data: { currency, balance: wallet.balance(currency), reason: 'REWARD' } }],
            undo: async () => { wallet.spend(currency, amount); },
        };
    }
    const have = wallet.balance(currency);
    const take = Math.min(have, -amount);
    const trace = take < -amount ? [`TRUNCATED ${amount}=>${-take} (balance ${have})`] : [];
    if (take > 0 && !wallet.spend(currency, take)) throw new ApiError('INSUFFICIENT_BALANCE', `${currency} 扣款失敗`);
    return {
        applied: { ...effect, amount: -take },
        trace,
        delta: take > 0 ? [{ path: `/gachaWallet/${currency}`, op: 'replace', value: wallet.balance(currency) }] : [],
        events: take > 0 ? [{ evt: 'inventory.changed', data: { currency, balance: wallet.balance(currency), reason: 'PENALTY' } }] : [],
        undo: async () => { if (take > 0 && wallet.credit) wallet.credit(currency, take); },
    };
};

/** 內建 item handler：全部經物品庫存命令層，不直接碰庫存表 */
const itemHandler: RewardEffectHandler = async (effect, env) => {
    const itemId = String(effect.itemId);
    const qty = numberField(effect, 'qty');
    const target: Record<string, unknown> = {
        ...(effect.holder !== undefined ? { holder: effect.holder } : {}),
        ...(effect.container !== undefined ? { container: effect.container } : {}),
    };
    if (qty > 0) {
        const out = await env.invoke('item.grant', {
            ...target, itemId, qty,
            source: typeof effect.itemSource === 'string' ? effect.itemSource : 'REWARD',
            sourceRef: env.refId,
        });
        const res = out.result as { granted: number; overflow: { units: number; currency: string; amount: number } | null };
        return {
            applied: effect,
            overflow: res.overflow ? [{ itemId, ...res.overflow }] : [],
            delta: out.delta,
            events: out.events,
            undo: async () => {
                if (res.granted > 0) {
                    try { await env.invoke('item.consume', { ...target, itemId, qty: res.granted, sink: 'REWARD_ROLLBACK' }); } catch { /* 盡力而為 */ }
                }
            },
        };
    }
    // 負數＝失去物品：有多少扣多少
    const have = (await env.invoke('item.count', { ...target, itemId })).result as { count: number };
    const take = Math.min(have.count, -qty);
    const trace = take < -qty ? [`TRUNCATED ${qty}=>${-take} (have ${have.count})`] : [];
    if (take <= 0) return { applied: { ...effect, qty: 0 }, trace };
    const out = await env.invoke('item.consume', { ...target, itemId, qty: take, sink: 'PENALTY' });
    return {
        applied: { ...effect, qty: -take },
        trace,
        delta: out.delta,
        events: out.events,
        undo: async () => {
            try { await env.invoke('item.grant', { ...target, itemId, qty: take, source: 'REFUND' }); } catch { /* 盡力而為 */ }
        },
    };
};

const BUILTIN_HANDLERS: Readonly<Record<string, RewardEffectHandler>> = Object.freeze({ currency: currencyHandler, item: itemHandler });

/** 把 RewardPlanItem 轉成 API 回應的一行（效果欄位原樣複製，避免外面改到內部物件） */
function toLine(item: RewardPlanItem): RewardPlanLine {
    return { entryId: item.entryId, tier: item.tier, effect: { ...item.effect }, applied: { ...item.applied }, trace: [...item.trace] };
}

function presentationOf(def: RewardPresentationDef): RewardGrantResult['presentation'] {
    return { type: def.type, args: { ...def.args }, skippable: def.skippable };
}

function defaultEntropy(): string {
    return `${Date.now()}:${Math.random()}:${Math.random()}`;
}

export function registerRewardCommands(adapter: LocalApiAdapter, getPorts: () => RewardPorts): void {
    const authorityOf = (): RewardAuthority => {
        const authority = getPorts().authority;
        if (!authority) throw new ApiError('REWARD_UNAVAILABLE', '獎勵系統尚未就緒');
        return authority;
    };

    /** 獎池此刻能不能抽：停用、沒有可抽項目、條件不成立都算未開放 */
    const isPoolOpen = (pool: RewardPoolDef): boolean => {
        if (!pool.enabled || weightedTotal(pool.entries) <= 0) return false;
        if (pool.condition === null) return true;
        const evaluate = getPorts().evaluate;
        return evaluate ? evaluate(pool.condition) : false;
    };

    /** 簡版（第一條階梯），保留給舊呼叫端；完整欄位看 pities */
    const pityView = (pool: RewardPoolDef, pity: Readonly<Record<string, number>>): RewardGrantResult['pity'] => {
        const first = pityViewsOf(pool, pity)[0];
        return first ? { counterKey: first.counterKey, count: first.count, hardAt: first.hardAt } : null;
    };

    const requireSourceAllowed = (allowed: readonly string[], source: { kind: string }): void => {
        if (allowed.length > 0 && allowed.indexOf(source.kind) < 0) throw new ApiError('REWARD_NO_TICKET', `來源 ${source.kind} 無權領取`);
    };

    /** 同 grantKey 重送：回原結果；鍵被別的獎池／套件用過是呼叫端 bug，回 E327 */
    const replayOf = (meta: RewardMeta, key: string, kind: 'pool' | 'bundle', refId: string): HandlerOutcome | null => {
        const hit = meta.grants.find((g) => g.key === key);
        if (!hit) return null;
        if (hit.kind !== kind || hit.refId !== refId) throw new ApiError('REWARD_GRANT_KEY_CONFLICT', `grantKey ${key} 已被 ${hit.refId} 使用`);
        return { result: { ...hit.result, replayed: true } };
    };

    /** 預檢：每個效果必須有 handler、貨幣必須認得；在動任何帳之前全部檢查完 */
    const precheck = (items: readonly RewardPlanItem[]): void => {
        const handlers = getPorts().handlers ?? {};
        for (const item of items) {
            const kind = item.applied.kind;
            if (!BUILTIN_HANDLERS[kind] && !handlers[kind]) throw new ApiError('REWARD_EFFECT_UNSUPPORTED', `沒有 ${kind} 效果的 handler`);
            if (kind === 'currency' && WALLET_CURRENCIES.indexOf(String(item.applied.id)) < 0) {
                throw new ApiError('CURRENCY_UNKNOWN', `未知幣別 ${String(item.applied.id)}`);
            }
        }
    };

    /**
     * 結算：縮放→截斷→預檢→逐項入帳。任何一項失敗就反向撤銷已入帳的部分並回 E325。
     * 回傳套用後的行、溢出、增量與事件；呼叫端確認成功後才推進亂數與保底。
     */
    const settle = async (
        items: RewardPlanItem[], refId: string, source: { kind: string; ref?: string }, bundle: RewardBundleDef | null,
    ): Promise<{ lines: RewardPlanLine[]; overflow: RewardGrantResult['overflow']; delta: ApiDeltaOp[]; events: Array<{ evt: string; data?: unknown }> }> => {
        const ports = getPorts();
        const mul = ports.modifiers ? ports.modifiers(source, refId) : {};
        for (const item of items) {
            const scaled = scaleEffect(item.applied, mul);
            if (scaled.trace) item.trace.push(scaled.trace);
            item.applied = scaled.effect;
            if (bundle) {
                const capped = capLoss(item.applied, bundle);
                if (capped.trace) item.trace.push(capped.trace);
                item.applied = capped.effect;
            }
        }
        precheck(items);
        const handlers = ports.handlers ?? {};
        const env: RewardEffectEnv = { refId, source, wallet: ports.wallet, invoke: (name, args) => adapter.invoke(name, args) };
        const undos: Array<() => Promise<void>> = [];
        const overflow: RewardGrantResult['overflow'] = [];
        const delta: ApiDeltaOp[] = [];
        const events: Array<{ evt: string; data?: unknown }> = [];
        try {
            for (const item of items) {
                const handler = BUILTIN_HANDLERS[item.applied.kind] ?? handlers[item.applied.kind];
                const out = await handler(item.applied, env);
                if (out.undo) undos.push(out.undo);
                if (out.applied) item.applied = out.applied;
                if (out.trace) item.trace.push(...out.trace);
                if (out.overflow) overflow.push(...out.overflow);
                if (out.delta) delta.push(...out.delta);
                if (out.events) events.push(...out.events);
            }
        } catch (error) {
            for (const undo of undos.reverse()) {
                try { await undo(); } catch { /* 撤銷盡力而為 */ }
            }
            const reason = error instanceof ApiError ? `${error.def.code} ${error.message}` : (error instanceof Error ? error.message : String(error));
            throw new ApiError('REWARD_SETTLE_ROLLBACK', `入帳失敗，整筆回滾：${reason}`);
        }
        return { lines: items.map(toLine), overflow, delta, events };
    };

    /** 先結算成功才把新的 meta 寫回（含發放紀錄），所以失敗不會留下半套保底或亂數步數 */
    const commit = (
        meta: RewardMeta, key: string, kind: 'pool' | 'bundle', refId: string, result: RewardGrantResult,
        extra: Partial<RewardMeta>,
    ): void => {
        const grants = [...meta.grants, { key, kind, refId, result: result as unknown as Record<string, unknown> }].slice(-REWARD_GRANT_LIMIT);
        authorityOf().setMeta({ ...meta, ...extra, v: 1, seq: meta.seq + 1, grants });
    };

    adapter.register('reward.roll', async (args) => {
        rejectExtra(args, ROLL_ARGS);
        const poolId = requireText(args.poolId, 'poolId');
        const grantKey = requireText(args.grantKey, 'grantKey');
        const source = requireSource(args.source);
        const config = getPorts().config;
        const pool = findPool(config, poolId);
        if (!pool) throw new ApiError('REWARD_POOL_NOT_FOUND', `找不到獎池 ${poolId}`);
        const meta = authorityOf().meta();
        const replay = replayOf(meta, grantKey, 'pool', poolId);
        if (replay) return replay;
        const count = args.count === undefined ? 1 : args.count;
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > pool.maxCount) {
            throw new ApiError('REWARD_INVALID_COUNT', `count 必須是 1～${pool.maxCount} 的整數`);
        }
        if (!isPoolOpen(pool)) throw new ApiError('REWARD_POOL_CLOSED', `獎池 ${poolId} 未開放`);
        requireSourceAllowed(pool.sources, source);

        const base = meta.rng ?? { seedHex: deriveRngSeed((getPorts().entropy ?? defaultEntropy)(), 'reward-session'), stepIndex: 0 };
        const session = DeterministicRngSession.restore(base);
        const rolled = rollPool(pool, count, session, meta.pity);
        const settled = await settle(rolled.items, poolId, source, null);
        const grantId = `gr_${meta.seq + 1}`;
        const result: RewardGrantResult = {
            grantId, grantKey, kind: 'pool', refId: poolId, plan: settled.lines, settled: true, overflow: settled.overflow,
            presentation: presentationOf(pool.presentation), pity: pityView(pool, rolled.pity), pities: pityViewsOf(pool, rolled.pity), replayed: false,
        };
        commit(meta, grantKey, 'pool', poolId, result, { rng: session.snapshot(), pity: rolled.pity });
        const events = [
            ...settled.events,
            { evt: 'reward.granted', data: { grantId, kind: 'pool', refId: poolId, source, presentation: result.presentation } },
            ...(pool.pity.length > 0 ? [{ evt: 'reward.pity.changed', data: { poolId, ...result.pity } }] : []),
        ];
        return { result, delta: settled.delta, events };
    });

    adapter.register('reward.claim', async (args) => {
        rejectExtra(args, CLAIM_ARGS);
        const bundleId = requireText(args.bundleId, 'bundleId');
        const grantKey = requireText(args.grantKey, 'grantKey');
        const source = requireSource(args.source);
        const bundle = findBundle(getPorts().config, bundleId);
        if (!bundle) throw new ApiError('REWARD_BUNDLE_NOT_FOUND', `找不到獎勵套件 ${bundleId}`);
        const meta = authorityOf().meta();
        const replay = replayOf(meta, grantKey, 'bundle', bundleId);
        if (replay) return replay;
        requireSourceAllowed(bundle.sources, source);

        const settled = await settle(planBundle(bundle), bundleId, source, bundle);
        const grantId = `gr_${meta.seq + 1}`;
        const result: RewardGrantResult = {
            grantId, grantKey, kind: 'bundle', refId: bundleId, plan: settled.lines, settled: true, overflow: settled.overflow,
            presentation: presentationOf(bundle.presentation), pity: null, replayed: false,
        };
        commit(meta, grantKey, 'bundle', bundleId, result, {});
        const events = [
            ...settled.events,
            { evt: 'reward.granted', data: { grantId, kind: 'bundle', refId: bundleId, source, presentation: result.presentation } },
        ];
        return { result, delta: settled.delta, events };
    });

    adapter.register('reward.pools', () => {
        const ports = getPorts();
        const pity = ports.authority ? ports.authority.meta().pity : emptyRewardMeta().pity;
        return { result: { pools: ports.config.pools.map((pool) => poolViewOf(pool, isPoolOpen(pool), pity)) } };
    });

    adapter.register('reward.pity', (args) => {
        const poolId = requireText(args.poolId, 'poolId');
        const pool = findPool(getPorts().config, poolId);
        if (!pool) throw new ApiError('REWARD_POOL_NOT_FOUND', `找不到獎池 ${poolId}`);
        const counters = authorityOf().meta().pity;
        return { result: { poolId, pity: pityView(pool, counters), pities: pityViewsOf(pool, counters), tallies: tallyViewsOf(pool, counters) } };
    });

    /**
     * 兌換一次累計資格（天命商店）：資格 = floor(累計 / creditEvery) − 已兌換；足夠才把 spentKey 加 1。
     * 只動兌換次數，不動累計與保底階梯；同 grantKey 重送回原結果、不重複扣資格。發放什麼由呼叫端（商店）另走 reward.claim／宿主入冊。
     */
    adapter.register('reward.pity.redeem', (args) => {
        rejectExtra(args, REDEEM_ARGS);
        const poolId = requireText(args.poolId, 'poolId');
        const grantKey = requireText(args.grantKey, 'grantKey');
        const pool = findPool(getPorts().config, poolId);
        if (!pool) throw new ApiError('REWARD_POOL_NOT_FOUND', `找不到獎池 ${poolId}`);
        const meta = authorityOf().meta();
        const replay = replayOf(meta, grantKey, 'bundle', `redeem:${poolId}`);
        if (replay) return replay;
        const wanted = args.counterKey === undefined ? null : requireText(args.counterKey, 'counterKey');
        const tally = pool.tallies.find((t) => wanted === null || t.counterKey === wanted);
        if (!tally) throw new ApiError('REWARD_POOL_NOT_FOUND', `獎池 ${poolId} 沒有累計計數`);
        const before = tallyViewsOf(pool, meta.pity).find((t) => t.counterKey === tally.counterKey)!;
        if (before.credits < 1) throw new ApiError('REWARD_NO_TICKET', `兌換資格不足，還差 ${before.toNext} 抽`);
        const pity = { ...meta.pity, [tally.spentKey]: before.spent + 1 };
        const after = tallyViewsOf(pool, pity).find((t) => t.counterKey === tally.counterKey)!;
        const result: RewardGrantResult = {
            grantId: `gr_${meta.seq + 1}`, grantKey, kind: 'bundle', refId: `redeem:${poolId}`, plan: [], settled: true, overflow: [],
            presentation: { type: 'instant', args: {}, skippable: true }, pity: null, replayed: false,
        };
        commit(meta, grantKey, 'bundle', `redeem:${poolId}`, result, { pity });
        return { result: { ...result, tally: after }, events: [{ evt: 'reward.pity.changed', data: { poolId, counterKey: tally.counterKey, credits: after.credits } }] };
    });
}
