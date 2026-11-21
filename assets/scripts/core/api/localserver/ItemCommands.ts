// @spec-source → 物品庫存系統 Base 框架規格書 (doc_spec_1184) §4 唯一寫入口、§11 伺服器 API；共用框架總綱 (doc_spec_1182) §5.5；PROG-2-9203
/**
 * ItemCommands — 物品庫存命令（item.grant／consume／settlePeriodic／count／list／ledger）在本機 adapter 的處理器。
 *
 * 數量、堆疊上限、溢出折金、綁定、帳本都在這層判定；玩法程式只送「對誰、哪個物品、多少、為什麼」。
 * 實際存放位置由 ItemAuthority port 提供（家庭倉庫＝GameSession 既有的 PlayerInventory 表），所以存檔形狀不變。
 * 失敗一律整筆不生效（先預檢、再寫入）。純邏輯，不 import cc。
 *
 * 注意：規格 §11.1 寫「客戶端沒有 item.grant」。單機的本機伺服器與玩法同進程，這裡先提供；
 * 連線版 adapter 必須把 item.grant 改成只允許伺服器內部（獎勵／商店／任務／系統）呼叫，列為待決。
 */
import type { ItemGrantResult, ItemListResult, ItemRowView, ItemSettlePeriodicResult, ItemUseResult } from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import { nextGrantIndex, periodsDue } from '../../../shared/foundation/GameClock';
import {
    DEFAULT_CONTAINER_ID, HOUSEHOLD_HOLDER, type HolderRef, type ItemConfigV1,
} from '../../../shared/item/ItemConfig';
import {
    appendLedger, applyInstanceExp, expToCapOf, levelCapOf, findContainerRule, findHolderRule, findItemDef, findPeriodicGrant, isDeployableItem, ITEM_GRANT_SOURCES, parseHolder, planConsume, planGrant,
    withInstance, withoutInstance, type ItemMeta, type ItemRuleFailure,
} from '../../../shared/item/ItemRules';
import type { ApiDeltaOp } from '../../../shared/api/ApiProtocol';
import type { LocalApiAdapter } from './LocalApiAdapter';
import type { WalletAuthority } from './WalletCommands';

/** 一個持有者容器目前的存量表（id → 正整數數量） */
export type StockTable = Readonly<Record<string, number>>;

/** 權威端的存放 port：家庭倉庫由 GameSession 實作；測試用記憶體版本；連線時由伺服器取代 */
export interface ItemAuthority {
    /** 讀某持有者容器；不認識的持有者回 null */
    read(holder: HolderRef, container: string): StockTable | null;
    /** 整表寫回；source 為取得來源或消耗去向，給取得紀錄與事件用 */
    write(holder: HolderRef, container: string, next: StockTable, why: { itemId: string; delta: number; reason: string }): void;
    meta(): ItemMeta;
    setMeta(meta: ItemMeta): void;
}

export interface ItemPorts {
    authority: ItemAuthority | null;
    wallet: WalletAuthority | null;
    config: ItemConfigV1;
}

const FAILURE_KEY: Record<ItemRuleFailure, ApiErrorKey> = {
    HOLDER_UNKNOWN: 'ITEM_HOLDER_UNKNOWN',
    ITEM_NOT_ACCEPTED: 'ITEM_NOT_ACCEPTED',
    ITEM_BOUND: 'ITEM_BOUND',
    ITEM_FULL: 'ITEM_FULL',
    ITEM_INSUFFICIENT: 'ITEM_INSUFFICIENT',
};

function pathOf(holder: HolderRef, container: string, itemId: string): string {
    return holder.kind === 'household' && container === DEFAULT_CONTAINER_ID
        ? `/inventory/${itemId}`
        : `/holders/${holder.kind}/${holder.id}/${container}/${itemId}`;
}

function distinct(table: StockTable): number {
    return Object.keys(table).filter((id) => table[id] > 0).length;
}

export function registerItemCommands(adapter: LocalApiAdapter, getPorts: () => ItemPorts): void {
    const authorityOf = (): ItemAuthority => {
        const authority = getPorts().authority;
        if (!authority) throw new ApiError('ITEM_HOLDER_UNKNOWN', '物品庫存尚未就緒');
        return authority;
    };

    /** 解析持有者與容器；缺省＝家庭倉庫 main。設定沒有這個容器或 port 不認識持有者都回 E310 */
    const resolveTarget = (args: Record<string, unknown>): { holder: HolderRef; container: string; stock: StockTable } => {
        const holder = args.holder === undefined ? HOUSEHOLD_HOLDER : parseHolder(args.holder);
        if (!holder) throw new ApiError('INVALID_SCHEMA', 'holder 格式錯誤');
        const container = args.container === undefined ? DEFAULT_CONTAINER_ID : args.container;
        if (typeof container !== 'string' || container.length === 0) throw new ApiError('INVALID_SCHEMA', 'container 格式錯誤');
        if (!findContainerRule(getPorts().config, holder, container)) throw new ApiError('ITEM_HOLDER_UNKNOWN', `沒有容器規則 ${holder.kind}/${container}`);
        const stock = authorityOf().read(holder, container);
        if (!stock) throw new ApiError('ITEM_HOLDER_UNKNOWN', `找不到持有者 ${holder.kind}:${holder.id}`);
        return { holder, container, stock };
    };

    const requireItemId = (value: unknown): string => {
        if (typeof value !== 'string' || value.length === 0) throw new ApiError('INVALID_SCHEMA', 'itemId 不可為空');
        return value;
    };
    const requireQty = (value: unknown): number => {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw new ApiError('INVALID_SCHEMA', 'qty 必須是正整數');
        return value;
    };
    const requireReason = (value: unknown, field: string): string => {
        if (typeof value !== 'string' || value.length === 0) throw new ApiError('INVALID_SCHEMA', `${field} 不可為空`);
        return value;
    };

    /** 溢出折金需要錢包能入帳；沒有就整筆拒絕，避免收了物品卻丟了錢 */
    const requireCredit = (): WalletAuthority & { credit: NonNullable<WalletAuthority['credit']> } => {
        const wallet = getPorts().wallet;
        if (!wallet || !wallet.credit) throw new ApiError('WALLET_UNAVAILABLE', '錢包尚未就緒，無法折算溢出');
        return wallet as WalletAuthority & { credit: NonNullable<WalletAuthority['credit']> };
    };

    adapter.register('item.grant', (args) => {
        const itemId = requireItemId(args.itemId);
        const qty = requireQty(args.qty);
        const source = requireReason(args.source, 'source');
        if ((ITEM_GRANT_SOURCES as readonly string[]).indexOf(source) < 0) throw new ApiError('ITEM_SOURCE_INVALID', `未知取得來源 ${source}`);
        const { holder, container, stock } = resolveTarget(args);
        const have = stock[itemId] ?? 0;
        const plan = planGrant(getPorts().config, holder, container, itemId, qty, have, distinct(stock), source === 'REFUND');
        if (!plan.ok) throw new ApiError(FAILURE_KEY[plan.reason], `${itemId} 無法放入 ${holder.kind}/${container}：${plan.reason}`);
        const wallet = plan.overflow ? requireCredit() : null;
        const authority = authorityOf();
        const count = have + plan.added;
        if (plan.added > 0) {
            authority.write(holder, container, { ...stock, [itemId]: count }, { itemId, delta: plan.added, reason: source });
        }
        let nextMeta = appendLedger(authority.meta(), { itemId, holder, delta: plan.added > 0 ? plan.added : qty, reason: source, overflowAmount: plan.overflow?.amount ?? 0 });
        // unique 物品第一次入庫：建立實例狀態（支援卡 Lv1、經驗 0、傳承 0）
        const instanceDefault = findItemDef(getPorts().config, itemId).instanceState;
        if (plan.added > 0 && instanceDefault && !nextMeta.instances?.[itemId]) nextMeta = withInstance(nextMeta, itemId, instanceDefault);
        authority.setMeta(nextMeta);
        const delta: ApiDeltaOp[] = [{ path: pathOf(holder, container, itemId), op: 'replace', value: count }];
        const events: Array<{ evt: string; data?: unknown }> = [{ evt: 'inventory.changed', data: { holder, container, itemId, count, reason: source } }];
        if (plan.overflow && wallet) {
            wallet.credit(plan.overflow.currency, plan.overflow.amount);
            delta.push({ path: `/gachaWallet/${plan.overflow.currency}`, op: 'replace', value: wallet.balance(plan.overflow.currency) });
            events.push({ evt: 'inventory.overflow', data: { holder, container, itemId, ...plan.overflow } });
        }
        const result: ItemGrantResult = { itemId, granted: plan.added, count, overflow: plan.overflow };
        return { result, delta, events };
    });

    adapter.register('item.consume', (args) => {
        const itemId = requireItemId(args.itemId);
        const qty = requireQty(args.qty);
        const sink = requireReason(args.sink, 'sink');
        const { holder, container, stock } = resolveTarget(args);
        const have = stock[itemId] ?? 0;
        const check = planConsume(have, qty);
        if (!check.ok) throw new ApiError(FAILURE_KEY[check.reason], `${itemId} 不足：需要 ${qty}，目前 ${have}`);
        const next: Record<string, number> = { ...stock };
        const count = have - qty;
        if (count > 0) next[itemId] = count;
        else delete next[itemId];
        const authority = authorityOf();
        authority.write(holder, container, next, { itemId, delta: -qty, reason: sink });
        const ledgered = appendLedger(authority.meta(), { itemId, holder, delta: -qty, reason: sink, overflowAmount: 0 });
        authority.setMeta(count > 0 ? ledgered : withoutInstance(ledgered, itemId));
        return {
            result: { itemId, consumed: qty, count },
            delta: [{ path: pathOf(holder, container, itemId), op: 'replace', value: count }],
            events: [{ evt: 'inventory.changed', data: { holder, container, itemId, count, reason: sink } }],
        };
    });

    adapter.register('item.use', (args) => {
        const itemId = requireItemId(args.itemId);
        const qty = requireQty(args.qty);
        const targetArg = args.target as Record<string, unknown> | null | undefined;
        const targetId = requireItemId(targetArg?.itemId);
        const { holder, container, stock } = resolveTarget(args);
        const config = getPorts().config;
        const effect = findItemDef(config, itemId).useEffect;
        if (!effect) throw new ApiError('ITEM_USE_INVALID', `${itemId} 沒有使用效果`);
        const growth = findItemDef(config, targetId).growth;
        const meta = authorityOf().meta();
        const instance = meta.instances?.[targetId];
        if (!growth || !instance || (stock[targetId] ?? 0) <= 0) throw new ApiError('ITEM_USE_INVALID', `${targetId} 不是已持有的可升級物品`);
        const need = expToCapOf(growth, instance);
        if (need <= 0) throw new ApiError('ITEM_AT_CAP', `${targetId} 已在等級上限，請先傳承`);
        // 只扣升到上限需要的個數；最後一個超出的經驗不算（不退）
        const units = Math.min(qty, Math.ceil(need / effect.exp));
        const have = stock[itemId] ?? 0;
        const check = planConsume(have, units);
        if (!check.ok) throw new ApiError(FAILURE_KEY[check.reason], `${itemId} 不足：需要 ${units}，目前 ${have}`);
        const applied = applyInstanceExp(growth, instance, units * effect.exp);
        const next: Record<string, number> = { ...stock };
        const count = have - units;
        if (count > 0) next[itemId] = count;
        else delete next[itemId];
        const authority = authorityOf();
        authority.write(holder, container, next, { itemId, delta: -units, reason: 'USE' });
        authority.setMeta(withInstance(appendLedger(meta, { itemId, holder, delta: -units, reason: 'USE', overflowAmount: 0 }), targetId, applied.state));
        const result: ItemUseResult = {
            itemId, target: targetId, consumed: units, count, expGained: applied.absorbed, levelsGained: applied.levelsGained,
            level: applied.state.level, exp: applied.state.exp, atCap: applied.atCap,
        };
        return {
            result,
            delta: [
                { path: pathOf(holder, container, itemId), op: 'replace', value: count },
                { path: `/itemInstances/${targetId}`, op: 'replace', value: { ...applied.state } },
            ],
            events: [
                { evt: 'inventory.changed', data: { holder, container, itemId, count, reason: 'USE' } },
                { evt: 'inventory.instanceChanged', data: { holder, container, itemId: targetId, ...applied.state, levelsGained: applied.levelsGained } },
            ],
        };
    });

    adapter.register('item.breakthrough', (args) => {
        const itemId = requireItemId(args.itemId);
        const { holder, container, stock } = resolveTarget(args);
        const growth = findItemDef(getPorts().config, itemId).growth;
        const meta = authorityOf().meta();
        const instance = meta.instances?.[itemId];
        if (!growth || !instance || (stock[itemId] ?? 0) <= 0) throw new ApiError('ITEM_USE_INVALID', `${itemId} 不是已持有的可傳承物品`);
        const rollback = args.rollback === true;
        if (rollback ? instance.limitBreak <= 0 : instance.limitBreak >= growth.maxBreak) {
            throw new ApiError(rollback ? 'ITEM_USE_INVALID' : 'ITEM_AT_CAP', rollback ? `${itemId} 沒有可撤銷的傳承` : `${itemId} 傳承已滿（${growth.maxBreak} 次）`);
        }
        const state = { ...instance, limitBreak: instance.limitBreak + (rollback ? -1 : 1) };
        authorityOf().setMeta(withInstance(meta, itemId, state));
        return {
            result: { itemId, ...state, levelCap: levelCapOf(growth, state.limitBreak), maxBreak: growth.maxBreak },
            delta: [{ path: `/itemInstances/${itemId}`, op: 'replace', value: { ...state } }],
            events: [{ evt: 'inventory.instanceChanged', data: { holder, container, itemId, ...state, breakthrough: rollback ? -1 : 1 } }],
        };
    });

    adapter.register('item.instance', (args) => {
        const itemId = requireItemId(args.itemId);
        const { stock } = resolveTarget(args);
        const growth = findItemDef(getPorts().config, itemId).growth;
        const instance = authorityOf().meta().instances?.[itemId];
        if (!growth || !instance || (stock[itemId] ?? 0) <= 0) throw new ApiError('ITEM_USE_INVALID', `${itemId} 不是已持有的可成長物品`);
        return { result: { itemId, ...instance, levelCap: levelCapOf(growth, instance.limitBreak), maxBreak: growth.maxBreak } };
    });

    adapter.register('item.settlePeriodic', (args) => {
        const ruleId = requireReason(args.ruleId, 'ruleId');
        const nowIndex = args.nowIndex;
        if (typeof nowIndex !== 'number' || !Number.isInteger(nowIndex) || nowIndex < 0) throw new ApiError('INVALID_SCHEMA', 'nowIndex 必須是非負整數');
        const rule = findPeriodicGrant(getPorts().config, ruleId);
        if (!rule) throw new ApiError('ITEM_RULE_UNKNOWN', `未知定期發放規則 ${ruleId}`);
        const authority = authorityOf();
        const meta = authority.meta();
        const last = Object.prototype.hasOwnProperty.call(meta.periodic, ruleId) ? meta.periodic[ruleId] : null;
        // 單次最多補 40 期，避免壞掉的時鐘造成無窮迴圈；高水位照實際發放的期數往前推
        const periods = Math.min(40, periodsDue(last, nowIndex, rule.everySeasons));
        const { holder, container, stock } = resolveTarget({ holder: rule.holder, container: rule.container });
        const empty: ItemSettlePeriodicResult = { ruleId, periods: 0, granted: 0, count: stock[rule.itemId] ?? 0, overflow: null };
        if (periods <= 0) return { result: empty };

        let have = stock[rule.itemId] ?? 0;
        let added = 0;
        let units = 0;
        let amount = 0;
        let currency = '';
        for (let i = 0; i < periods; i += 1) {
            const plan = planGrant(getPorts().config, holder, container, rule.itemId, rule.count, have, distinct(stock), false);
            if (!plan.ok) throw new ApiError(FAILURE_KEY[plan.reason], `${rule.itemId} 定期發放失敗：${plan.reason}`);
            have += plan.added;
            added += plan.added;
            if (plan.overflow) { units += plan.overflow.units; amount += plan.overflow.amount; currency = plan.overflow.currency; }
        }
        const wallet = amount > 0 ? requireCredit() : null;
        if (added > 0) authority.write(holder, container, { ...stock, [rule.itemId]: have }, { itemId: rule.itemId, delta: added, reason: 'SEASON' });
        let nextMeta = appendLedger(authority.meta(), { itemId: rule.itemId, holder, delta: added > 0 ? added : rule.count * periods, reason: 'SEASON', overflowAmount: amount });
        nextMeta = { ...nextMeta, periodic: { ...nextMeta.periodic, [ruleId]: nextGrantIndex(last, nowIndex, rule.everySeasons, periods) } };
        authority.setMeta(nextMeta);
        const delta: ApiDeltaOp[] = [{ path: pathOf(holder, container, rule.itemId), op: 'replace', value: have }];
        const events: Array<{ evt: string; data?: unknown }> = [{ evt: 'inventory.changed', data: { holder, container, itemId: rule.itemId, count: have, reason: 'SEASON' } }];
        const overflow = amount > 0 ? { units, currency, amount } : null;
        if (overflow && wallet) {
            wallet.credit(currency, amount);
            delta.push({ path: `/gachaWallet/${currency}`, op: 'replace', value: wallet.balance(currency) });
            events.push({ evt: 'inventory.overflow', data: { holder, container, itemId: rule.itemId, ...overflow } });
        }
        return { result: { ruleId, periods, granted: added, count: have, overflow } satisfies ItemSettlePeriodicResult, delta, events };
    });

    adapter.register('item.count', (args) => {
        const itemId = requireItemId(args.itemId);
        const { stock } = resolveTarget(args);
        return { result: { itemId, count: stock[itemId] ?? 0 } };
    });

    adapter.register('item.list', (args) => {
        const { holder, container, stock } = resolveTarget(args);
        const config = getPorts().config;
        // forDeploy=true：出征、守城、派遣編制讀物品時用，academyOnly（支援卡）一律排除
        const forDeploy = args.forDeploy === true;
        const instances = authorityOf().meta().instances ?? {};
        const rows = Object.keys(stock).filter((id) => stock[id] > 0 && (!forDeploy || isDeployableItem(config, id))).sort().map((id) => {
            const def = findItemDef(config, id);
            const row: ItemRowView = { itemId: id, quantity: stock[id], kind: def.kind, stackMax: def.stack.max };
            if (def.category) row.category = def.category;
            if (instances[id]) row.instance = { ...instances[id] };
            return row;
        });
        const result: ItemListResult = { holder, container, aliasKey: findHolderRule(config, holder)?.aliasKey ?? '', rows };
        return { result };
    });

    adapter.register('item.ledger', (args) => {
        const limit = typeof args.limit === 'number' && Number.isInteger(args.limit) && args.limit > 0 ? Math.min(args.limit, 100) : 20;
        const ledger = authorityOf().meta().ledger;
        return { result: { records: ledger.slice(-limit) } };
    });
}
