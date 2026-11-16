// @spec-source → 轉蛋系統.md §貨幣系統、§單抽 / 10 連 UI 流程、§死亡傳承提示；PROG-2-9117（轉蛋按鈕稽核）
/**
 * 轉蛋畫面按鈕規則與資源顯示（純邏輯，不依賴 cc）。
 *
 * - 單抽／十連／金幣召喚／召喚券各按鈕在哪個池能按、按了做什麼（planGachaButton）
 * - 按下前先查餘額，不足時給出「缺哪種、要多少、現有多少」（checkGachaAffordable）
 * - 轉蛋畫面要顯示的資源列與各池餘額文字
 * - 池詳情（「詳情 ›」）要顯示的內容列
 * 本檔只決定「能不能按、顯示什麼」，不改任何費用、機率、保底數字。
 *
 * Unity 對照：Presenter 層的 CanExecute() 與 ViewModel 字串，不碰 View。
 */
import { CURRENCY_LABELS } from '../services/GachaWalletRules';
import { DEATH_LEGACY_HINT } from '../systems/GachaPoolGuide';
import { normalizeGachaPoolType, type GachaConfig } from '../models/GachaConfig';
import {
    pickPullCurrency,
    type GachaCurrencyId, type GachaMainPoolConfig, type GachaPoolDto, type GachaWalletDto,
} from './GachaApi';

/** 結果畫面顯示「抽完還剩多少」：靈玉池（名將／限定／紅顏）同時列銅錢符，因為名將池兩種都能付 */
export function formatResultBalance(currency: 'gems' | 'gold' | 'tickets' | 'mentorTickets', wallet: Readonly<Partial<GachaWalletDto>>): string {
    return formatPoolBalance(currency === 'gems' ? ['gems', 'bronze'] : [currency], wallet);
}

export type GachaPoolKeyName = 'general' | 'limited' | 'legendary' | 'support';
export type GachaButtonKind = 'single' | 'ten' | 'gold' | 'ticket';

/** 金幣召喚每抽金幣數（與 LocalGachaService.performGoldSummon 的 500 相同；此處只用來預先檢查餘額） */
export const GACHA_GOLD_SUMMON_COST = 500;

/** 資源列顯示順序：抽卡主力幣在前，其次券類，最後金幣與道具 */
export const GACHA_WALLET_DISPLAY_ORDER: readonly GachaCurrencyId[] = ['gems', 'bronze', 'tickets', 'mentorTickets', 'gold', 'scorePoints', 'oracle'];

export function formatCurrencyAmount(value: number): string {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return safe.toLocaleString('zh-TW');
}

/** 全部資源（轉蛋畫面頂部資源列）：「靈玉 1,280　銅錢符 1,500　…」 */
export function formatGachaWalletStrip(wallet: Readonly<Partial<GachaWalletDto>>): string {
    return GACHA_WALLET_DISPLAY_ORDER.map((key) => `${CURRENCY_LABELS[key]} ${formatCurrencyAmount(wallet[key] ?? 0)}`).join('　');
}

/** 該池可用的資源餘額：「銅錢符 1,500 ・ 靈玉 1,280」 */
export function formatPoolBalance(currencies: readonly GachaCurrencyId[], wallet: Readonly<Partial<GachaWalletDto>>): string {
    return currencies.map((key) => `${CURRENCY_LABELS[key]} ${formatCurrencyAmount(wallet[key] ?? 0)}`).join(' ・ ');
}

export type GachaButtonPlan =
    | { run: 'pool'; count: 1 | 10 }
    | { run: 'gold' }
    | { run: 'ticket' }
    | { run: 'blocked'; message: string };

/**
 * 按鈕在各池的行為。
 * 金幣召喚、召喚券召喚是名將池專屬的快捷（扣金幣／召喚券抽名將池），其他池按了不能偷偷改成扣別種貨幣，明講原因。
 */
export function planGachaButton(pool: GachaPoolKeyName, kind: GachaButtonKind): GachaButtonPlan {
    if (kind === 'single') return { run: 'pool', count: 1 };
    if (kind === 'ten') return { run: 'pool', count: 10 };
    if (pool === 'general') return kind === 'gold' ? { run: 'gold' } : { run: 'ticket' };
    return { run: 'blocked', message: `${kind === 'gold' ? '金幣召喚' : '召喚券召喚'}只能在名將池使用，請先切到名將池。` };
}

export type GachaAffordability = { ok: true } | { ok: false; message: string };

/** 按下前檢查餘額。不足時回傳玩家看得懂的原因（缺哪種、要多少、現有多少）。 */
export function checkGachaAffordable(
    plan: GachaButtonPlan,
    pool: Pick<GachaMainPoolConfig, 'currencies' | 'singleCost' | 'tenCost'> | null,
    wallet: Readonly<Partial<GachaWalletDto>>,
): GachaAffordability {
    if (plan.run === 'blocked') return { ok: false, message: plan.message };
    if (plan.run === 'gold') {
        const have = wallet.gold ?? 0;
        return have >= GACHA_GOLD_SUMMON_COST ? { ok: true } : { ok: false, message: `金幣不足：金幣召喚需要 ${formatCurrencyAmount(GACHA_GOLD_SUMMON_COST)}，目前 ${formatCurrencyAmount(have)}` };
    }
    if (plan.run === 'ticket') {
        const have = wallet.tickets ?? 0;
        return have >= 1 ? { ok: true } : { ok: false, message: `召喚券不足：召喚券召喚需要 1 張，目前 ${formatCurrencyAmount(have)} 張` };
    }
    if (!pool) return { ok: true }; // 池設定還沒載入時交給抽卡流程自己判斷
    const pick = pickPullCurrency(pool, plan.count, wallet);
    if (pick.ok) return { ok: true };
    const cost = plan.count === 10 ? pool.tenCost : pool.singleCost * plan.count;
    const names = pool.currencies.map((key) => CURRENCY_LABELS[key]).join('或');
    return { ok: false, message: `${names}不足：${plan.count === 10 ? '十連' : '單抽'}需要 ${formatCurrencyAmount(cost)}，目前 ${formatPoolBalance(pool.currencies, wallet)}` };
}

/**
 * 池價格以抽卡規則實際扣的為準（只改顯示，不改規則）：
 * 紅顏池設定為靈玉計價（FEM-03，gacha-config 的 currencyType=gem）時，beautyPoolRule 實際扣靈玉 singlePullCost × 抽數，
 * 畫面不能再寫「召喚券 1／10」。
 */
export function syncMainPoolCosts(pools: readonly GachaMainPoolConfig[], configs: readonly GachaConfig[] | null | undefined): GachaMainPoolConfig[] {
    return pools.map((pool) => {
        const cfg = (configs ?? []).find((entry) => entry.poolId === pool.poolId);
        const cost = cfg?.singlePullCost ?? 0;
        if (!cfg || normalizeGachaPoolType(cfg.poolType) !== 'heroine' || cfg.currencyType !== 'gem' || !(cost > 0)) return pool;
        // 說明文字跟著實際扣的貨幣走：資料檔寫「使用召喚券」，改靈玉計價後說明也要寫靈玉
        return { ...pool, currencies: ['gems'], singleCost: cost, tenCost: cost * 10, brief: pool.brief.replace(/召喚券/g, '靈玉') };
    });
}

export interface GachaDetailRow { title: string; detail: string }

/** 「詳情 ›」要顯示的內容：費用、持有、機率、保底、說明（名將池另附死亡傳承提示，規格 §13） */
export function buildPoolDetailRows(dto: GachaPoolDto, wallet: Readonly<Partial<GachaWalletDto>>): GachaDetailRow[] {
    const names = dto.currencies.map((key) => CURRENCY_LABELS[key]).join('、');
    const rows: GachaDetailRow[] = [
        { title: '召喚費用', detail: `單抽 ${formatCurrencyAmount(dto.singleCost)}　十連 ${formatCurrencyAmount(dto.tenCost)}（可用：${names}）` },
        { title: '目前持有', detail: formatPoolBalance(dto.currencies, wallet) },
        { title: '召喚機率', detail: dto.rates.map((rate) => `${rate.rarity} ${rate.percent}%`).join('　') },
        {
            title: '保底進度',
            detail: `${dto.pity.label} ${dto.pity.current} / ${dto.pity.max}；天命值 ${dto.pity.destinyCurrent} / ${dto.pity.destinyMax}（滿額可到天命商店兌換）`,
        },
        { title: '卡池說明', detail: dto.brief.replace(/\n/g, '　') },
    ];
    if (dto.key === 'general') rows.push({ title: '死亡傳承', detail: DEATH_LEGACY_HINT });
    return rows;
}

const ACTION_LABELS: Readonly<Record<string, string>> = {
    LOCAL_GACHA_PULL: '名將／限定召喚',
    LOCAL_GOLD_SUMMON: '金幣召喚',
    LOCAL_TICKET_SUMMON: '召喚券召喚',
    LOCAL_SUPPORT_SUMMON: '支援卡召喚',
    LOCAL_DESTINY_SHOP_EXCHANGE: '天命商店兌換',
};

/** 紀錄裡的動作代碼轉成玩家看得懂的名稱（不認識的代碼原樣顯示） */
export function describeGachaAction(actionType: string): string {
    return ACTION_LABELS[actionType] ?? actionType;
}
