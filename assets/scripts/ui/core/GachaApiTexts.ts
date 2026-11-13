// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-9024（轉蛋畫面文字改讀標準 API 的池資料）
/**
 * 把 GachaApi 的池資料轉成轉蛋畫面的節點文字（純函式，不依賴 cc）：
 * 單抽／十連價格、該池貨幣餘額、限定池焦點武將與剩餘時間、保底進度。
 *
 * Unity 對照：Presenter 把 DTO 轉成 View 的字串。
 */
import type { GachaCurrencyId, GachaPoolDto, GachaWalletDto } from '../../core/gacha/GachaApi';
import { GACHA_NODES, type GachaPoolDef } from './GachaScreenNodes';

export const GACHA_CURRENCY_LABEL: Readonly<Record<GachaCurrencyId, string>> = {
    gems: '靈玉', gold: '金幣', tickets: '召喚券', bronze: '銅錢符', oracle: '求籤令', mentorTickets: '支援券', scorePoints: '積分',
};

const HOUR_MS = 60 * 60 * 1000;

/** 剩餘時間：「剩 3 天 5 時」／「剩 5 時」 */
export function formatRemaining(endsAtMs: number, nowMs: number): string {
    const hours = Math.max(0, Math.floor((endsAtMs - nowMs) / HOUR_MS));
    const days = Math.floor(hours / 24);
    return days > 0 ? `剩 ${days} 天 ${hours % 24} 時` : `剩 ${hours} 時`;
}

export function gachaApiTexts(
    pool: GachaPoolDef,
    dto: GachaPoolDto,
    wallet: Readonly<GachaWalletDto>,
    nameOf: (generalId: string) => string,
    nowMs: number,
): Record<string, string> {
    // 價格框是原稿的窄數字框（貨幣圖示在框外），只放數字
    const texts: Record<string, string> = {
        [GACHA_NODES.pullSingleCost]: String(dto.singleCost),
        [GACHA_NODES.pullTenCost]: String(dto.tenCost),
        [GACHA_NODES.balance]: dto.currencies.map((c) => `${GACHA_CURRENCY_LABEL[c]} ${(wallet[c] ?? 0).toLocaleString('zh-TW')}`).join('  '),
    };
    const pity = `${dto.pity.label} ${dto.pity.current}/${dto.pity.max} · 天命值 ${dto.pity.destinyCurrent}/${dto.pity.destinyMax}`;
    if (pool.key === 'limited') {
        const featured = dto.featuredGeneralIds[0];
        const up = dto.rates.find((r) => r.rarity === 'UP');
        texts[pool.eventChip] = `★ 限定召喚 · ${dto.endsAtMs ? formatRemaining(dto.endsAtMs, nowMs) : '期間限定'}`;
        if (featured) texts[pool.heroName] = nameOf(featured);
        texts[pool.heroTitle] = `本期限定 · UP ${up ? up.percent : 0}%（僅限靈玉）`;
        texts[pool.guarantee] = pity;
    } else if (pool.key !== 'legendary') {
        texts[pool.guarantee] = pity;
    }
    return texts;
}

/** 原稿固定寬度、但改填長度不一的動態文字的節點；畫面要讓它們依內容撐開，避免被裁 */
export function gachaAutoSizeNodes(pool: GachaPoolDef): string[] {
    return [GACHA_NODES.pullSingleCost, GACHA_NODES.pullTenCost, pool.eventChip, pool.heroName, pool.heroTitle, pool.guarantee];
}
