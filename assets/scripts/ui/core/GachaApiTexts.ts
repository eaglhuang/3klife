// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-9024（轉蛋畫面文字改讀標準 API 的池資料）
/**
 * 把 GachaApi 的池資料轉成轉蛋畫面的節點文字（純函式，不依賴 cc）：
 * 單抽／十連價格、該池貨幣餘額、限定池焦點武將與剩餘時間、保底進度。
 *
 * Unity 對照：Presenter 把 DTO 轉成 View 的字串。
 */
import { pickPullCurrency, type GachaCurrencyId, type GachaPoolDto, type GachaWalletDto } from '../../core/gacha/GachaApi';
import { GACHA_NODES, GACHA_RATE_NODES, GACHA_RATE_ROWS, type GachaPoolDef } from './GachaScreenNodes';

export const GACHA_CURRENCY_LABEL: Readonly<Record<GachaCurrencyId, string>> = {
    gems: '靈玉', gold: '黃金', tickets: '召喚券', bronze: '銅錢符', oracle: '求籤令', mentorTickets: '支援券', scorePoints: '積分',
};

const HOUR_MS = 60 * 60 * 1000;

/** 剩餘時間：「剩 3 天 5 時」／「剩 5 時」 */
export function formatRemaining(endsAtMs: number, nowMs: number): string {
    const hours = Math.max(0, Math.floor((endsAtMs - nowMs) / HOUR_MS));
    const days = Math.floor(hours / 24);
    return days > 0 ? `剩 ${days} 天 ${hours % 24} 時` : `剩 ${hours} 時`;
}

/** 右側面板與橫幅的動態內容：文字、要顯示／隱藏的節點、保底條比例（0..1） */
export interface GachaApiView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    pityRatio: number;
}

/** 稀有度顯示順序：UP 最前，再由高到低（對齊原稿機率格） */
const RATE_ORDER = ['UP', 'SSR', 'SR', 'R'];

function percentText(value: number): string {
    return `${Math.round(value * 100) / 100}%`;
}

/**
 * 名稱「名將召喚」→ 說明框標題「名將池說明」。
 * 左上說明框同時是天命商店入口（紅顏池不累計天命值），要在框上寫明，玩家才知道可以點。
 */
function briefTagOf(name: string, hasDestinyShop: boolean): string {
    return `▸ ${name.replace(/召喚$/, '池')}說明${hasDestinyShop ? ' ・ 點此開天命商店' : ''}`;
}

/** 名字拆成兩字間留空（原稿「關　羽」的排法），三字以上照原樣 */
function spacedName(name: string): string {
    return name.length === 2 ? `${name[0]} ${name[1]}` : name;
}

/**
 * 橫幅主角武將：名字、立繪、說明框都從這一個函式取（PROG-2-9118）。
 * 限定池＝本期焦點武將；其他池＝池設定的展示武將。
 */
export function gachaHeroIdOf(pool: GachaPoolDef, dto: GachaPoolDto): string | null {
    return (pool.key === 'limited' ? dto.featuredGeneralIds[0] : dto.showcaseGeneralId) ?? null;
}

/** 十連鈕下方的保底小字節點（原稿 GachaDs3_div_37） */
export const GACHA_TEN_NOTE_NODE = 'GachaDs3_div_37';

export function gachaApiView(
    pool: GachaPoolDef,
    dto: GachaPoolDto,
    wallet: Readonly<GachaWalletDto>,
    nameOf: (generalId: string) => string,
    nowMs: number,
): GachaApiView {
    const limited = pool.key === 'limited';
    // 限定池原稿顯示「天命值」（滿額換限定 SSR）；其他池顯示距小保底的進度
    const meterCur = limited ? dto.pity.destinyCurrent : dto.pity.current;
    const meterMax = limited ? dto.pity.destinyMax : dto.pity.max;
    // 「我的餘額」顯示下一次單抽會扣的那種貨幣（銅錢符不夠就顯示靈玉）；全部資源在畫面頂部資源列
    const spend = pickPullCurrency(dto, 1, wallet);
    const mainCurrency = spend.ok ? spend.currency : dto.currencies[0];
    const heroId = gachaHeroIdOf(pool, dto);
    const heroName = heroId ? nameOf(heroId) : '';
    const [briefFirst] = dto.brief.split('\n');

    const texts: Record<string, string> = {
        [GACHA_NODES.poolNameStrip]: dto.name,
        [GACHA_NODES.briefTag]: briefTagOf(dto.name, pool.key !== 'legendary'),
        [GACHA_NODES.briefLine]: limited && heroName ? `${briefFirst}\n本期 UP：${heroName}　機率提升` : dto.brief,
        [GACHA_NODES.rpPoolName]: dto.name,
        [GACHA_NODES.rpPoolSub]: dto.sub,
        [GACHA_NODES.rpPoolBadge]: dto.badge,
        [GACHA_NODES.pityTitle]: limited ? '天命值' : dto.pity.label,
        [GACHA_NODES.pityRemain]: String(Math.max(0, meterMax - meterCur)),
        [GACHA_NODES.pityFillLabel]: `${meterCur} / ${meterMax}`,
        // 價格框是原稿的窄數字框（貨幣圖示在框外），只放數字
        [GACHA_NODES.pullSingleCost]: String(dto.singleCost),
        [GACHA_NODES.pullTenCost]: String(dto.tenCost),
        [GACHA_NODES.pullTenOriginalCost]: String(dto.singleCost * 10),
        [GACHA_NODES.balance]: `${GACHA_CURRENCY_LABEL[mainCurrency]} ${(wallet[mainCurrency] ?? 0).toLocaleString('zh-TW')}`,
        // 十連鈕下方小字：只寫程式真的有的保底（累計每 N 抽必出 SR 以上；十連本身沒有額外保底，原稿「必得 SR 以上 1 名」程式沒做）
        [GACHA_TEN_NOTE_NODE]: `每 ${dto.pity.max} 抽必得 SR 以上`,
        [GACHA_NODES.goldSummonLabel]: '×500',
        [GACHA_NODES.ticketSummonLabel]: `持有 ${(wallet.tickets ?? 0).toLocaleString('zh-TW')}`,
        [pool.eventChip]: limited
            ? `★ 本期限定 · ${dto.endsAtMs ? formatRemaining(dto.endsAtMs, nowMs) : '期間限定'}`
            : dto.series,
        [pool.guarantee]: limited
            ? `👑 ${dto.pity.destinyMax} 抽可換限定 SSR`
            : `✦ ${dto.pity.label.replace(/進度$/, '')} ${dto.pity.max} 抽`,
    };
    if (heroName) texts[pool.heroName] = spacedName(heroName);
    if (limited) texts[pool.heroTitle] = '本期限定 · 限定 SSR';
    // 原稿稱號是示意主角的（支援卡池原稿寫「吳宮秘書」卻展示別人），沒有逐人稱號資料前改成不指名的池別稱號
    else if (pool.key === 'support') texts[pool.heroTitle] = '培育後盾 · SSR 教官卡';

    const actives: Record<string, boolean> = {
        // 十連沒打折時不顯示刪除線原價
        [GACHA_NODES.pullTenOriginalCost]: dto.singleCost * 10 !== dto.tenCost,
        // 黃金召喚、召喚券召喚只有名將池能用，其他池看得到卻按不動的鈕直接隱藏（PROG-2-9118）
        [GACHA_NODES.goldSummon]: pool.key === 'general',
        [GACHA_NODES.ticketSummon]: pool.key === 'general',
    };
    const rates = dto.rates.slice().sort((a, b) => RATE_ORDER.indexOf(a.rarity) - RATE_ORDER.indexOf(b.rarity));
    for (let i = 0; i < GACHA_RATE_ROWS; i++) {
        const nodes = GACHA_RATE_NODES(i);
        const rate = rates[i];
        actives[nodes.item] = !!rate;
        if (!rate) continue;
        texts[nodes.rarity] = rate.rarity;
        texts[nodes.pct] = percentText(rate.percent);
    }
    return { texts, actives, pityRatio: meterMax > 0 ? Math.min(1, meterCur / meterMax) : 0 };
}

/** 相容舊呼叫：只要文字 */
export function gachaApiTexts(
    pool: GachaPoolDef,
    dto: GachaPoolDto,
    wallet: Readonly<GachaWalletDto>,
    nameOf: (generalId: string) => string,
    nowMs: number,
): Record<string, string> {
    return gachaApiView(pool, dto, wallet, nameOf, nowMs).texts;
}

/** 原稿固定寬度、但改填長度不一的動態文字的節點；畫面要讓它們依內容撐開，避免被裁 */
export function gachaAutoSizeNodes(pool: GachaPoolDef): string[] {
    return [
        GACHA_NODES.pullSingleCost, GACHA_NODES.pullTenCost, GACHA_NODES.pullTenOriginalCost,
        GACHA_NODES.poolNameStrip, GACHA_NODES.briefTag, GACHA_NODES.briefLine,
        GACHA_NODES.rpPoolName, GACHA_NODES.rpPoolSub, GACHA_NODES.rpPoolBadge,
        GACHA_NODES.pityTitle, GACHA_NODES.pityRemain, GACHA_NODES.pityFillLabel,
        GACHA_NODES.goldSummonLabel, GACHA_NODES.ticketSummonLabel,
        pool.eventChip, pool.heroName, pool.heroTitle, pool.guarantee,
        ...Array.from({ length: GACHA_RATE_ROWS }, (_, i) => [GACHA_RATE_NODES(i).rarity, GACHA_RATE_NODES(i).pct]).flat(),
    ];
}
