// @spec-source → 重複卡分流與血脈灌注補遺_2026-04-04.md §第一波 UI 落點 2（英靈卡詳情）；WBS DUP-02（PROG-2-1141）
/**
 * SpiritCardDetailTexts — 英靈卡詳情的血脈灌注區文字（純邏輯，不依賴 cc）
 *
 * 只組文字與入口可否點擊；灌注本身由 GameSession.infuseSpiritCard 處理（PROG-2-1074）。
 * 舊卡缺血脈欄位時顯示 0。
 *
 * 暫定：灌注入口只看是否為正式英靈卡；重複卡來源未定，本檔不接實際灌注。
 */
import type { SpiritCard } from '../../core/models/SpiritCard';

export type SpiritCardDetailLookup = (key: string, ...args: string[]) => string;

export const SPIRIT_CARD_DETAIL_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.spirit_card.title': '{0}｜{1} 年',
    'ui.spirit_card.year_unknown': '年份未知',
    'ui.spirit_card.bloodline_level': '血脈等級 {0}',
    'ui.spirit_card.spirit_power': '英靈濃度 {0}',
    'ui.spirit_card.linked_tally_level': '虎符層級 {0}',
    'ui.spirit_card.infuse': '血脈灌注',
    'ui.spirit_card.close': '關閉',
};

function fillTemplate(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設 */
export function fallbackSpiritCardDetailText(key: string, ...args: string[]): string {
    const template = SPIRIT_CARD_DETAIL_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillTemplate(template, args);
}

/** 語系表未載入（回傳 key 本身）時改用 zh-TW 預設 */
export function withSpiritCardDetailFallback(lookup: SpiritCardDetailLookup): SpiritCardDetailLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackSpiritCardDetailText(key, ...args) : localized;
    };
}

function countOrZero(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export interface SpiritCardInfusionTexts {
    texts: Record<string, string>;
    infuseEnabled: boolean;
}

/** 英靈卡詳情血脈區：key 對應 layout 節點 id */
export function buildSpiritCardInfusionTexts(
    card: SpiritCard,
    lookup: SpiritCardDetailLookup = fallbackSpiritCardDetailText,
): SpiritCardInfusionTexts {
    return {
        texts: {
            bloodlineLevelLabel: lookup('ui.spirit_card.bloodline_level', String(countOrZero(card.bloodlineLevel))),
            spiritPowerLabel: lookup('ui.spirit_card.spirit_power', String(countOrZero(card.spiritPower))),
            linkedTallyLabel: lookup('ui.spirit_card.linked_tally_level', String(countOrZero(card.linkedTallyLevel))),
            infuseButtonLabel: lookup('ui.spirit_card.infuse'),
        },
        infuseEnabled: card.isSpiritRelic === true,
    };
}

export interface SpiritCardDetailView extends SpiritCardInfusionTexts {
    texts: Record<string, string>;
}

/** 英靈卡詳情整頁文字，key 等於 spirit-card-detail-main.json 的節點 id；標題為「名｜死亡年 年」 */
export function buildSpiritCardDetailView(
    card: SpiritCard,
    lookup: SpiritCardDetailLookup = fallbackSpiritCardDetailText,
): SpiritCardDetailView {
    const infusion = buildSpiritCardInfusionTexts(card, lookup);
    const year = card.deathYear ?? card.deathContext?.year;
    const yearText = typeof year === 'number' && Number.isFinite(year) ? String(year) : lookup('ui.spirit_card.year_unknown');
    return {
        texts: {
            ...infusion.texts,
            spiritCardDetailTitle: lookup('ui.spirit_card.title', card.name, yearText),
            closeSpiritCardDetailLabel: lookup('ui.spirit_card.close'),
        },
        infuseEnabled: infusion.infuseEnabled,
    };
}
