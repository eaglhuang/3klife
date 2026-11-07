// @spec-source → 英靈世家系統 (doc_spec_0022) §E-5 陳列室分組、大廳系統 §E-10 世家總覽以家族為主分組；WBS SPI-12；PROG-2-2077
/**
 * SpiritFamilyOverviewSummary — 大廳世家總覽的家族分組摘要（純邏輯，不依賴 cc）。
 *
 * 把收藏的英靈卡依 Spirit_Family_Key 分組，每組列出主卡、命槽與陳列室張數，
 * 排序沿用 FamilyOverviewHotspot.buildFamilyOverviewGroups（深度、名聲高到低，同分依 key）。
 * 主卡沿用人物頁命槽的「設為主卡」，本檔只顯示。
 *
 * 暫定：家族名聲與深度目前沒有存檔資料（皆為 0）；家族名取該家英靈卡武將的姓氏組「X氏」，
 * 查不到武將時退回 Spirit_Family_Key。
 * Unity 對照：像 Scroll View 的資料源，View 只把文字貼上去。
 */
import type { SpiritCardEntry } from '../../core/systems/ReadModelValidators';
import { buildSpiritFamilyState, groupByDisplayBucket } from '../../core/systems/SpiritFamilyReadModel';
import { buildFamilyOverviewGroups } from '../../core/systems/FamilyOverviewHotspot';
import { surnameOf } from '../../core/systems/VirtualAncestorGenerator';

export interface SpiritFamilyOverviewRow {
    familyKey: string;
    familyName: string;
    mainName: string | null;
    destinyCount: number;
    relicCount: number;
}

/** 摘要最多列幾家，其餘併成「…等 N 家」（暫定，配合說明區高度） */
export const SPIRIT_FAMILY_SUMMARY_MAX_ROWS = 4;

export const SPIRIT_FAMILY_SUMMARY_TEXTS = {
    progress: '收藏英靈卡 {cards} 張・{families} 個世家',
    tipTitle: '各家英靈',
    empty: '尚未收藏英靈卡。',
    row: '{family}｜主卡：{main}｜命槽 {destiny}・陳列 {relic}',
    noMain: '未設',
    more: '…等 {count} 家',
} as const;

export function buildSpiritFamilyOverviewRows(
    cards: readonly SpiritCardEntry[],
    generalName: (templateId: string) => string | undefined,
): SpiritFamilyOverviewRow[] {
    const keys = Array.from(new Set(cards.map((card) => card.Spirit_Family_Key)));
    const states = keys.map((key) => buildSpiritFamilyState(key, cards));
    const nameOf = (key: string): string | undefined => {
        const named = cards.find((card) => card.Spirit_Family_Key === key && generalName(card.General_Template_ID));
        return named ? `${surnameOf(generalName(named.General_Template_ID))}氏` : undefined;
    };
    return buildFamilyOverviewGroups(states, nameOf).map((group) => {
        const own = groupByDisplayBucket(cards.filter((card) => card.Spirit_Family_Key === group.familyKey));
        const main = group.mainSpiritUid ? cards.find((card) => card.Spirit_ID === group.mainSpiritUid) : undefined;
        return {
            familyKey: group.familyKey,
            familyName: group.familyName,
            mainName: main ? generalName(main.General_Template_ID) ?? main.General_Template_ID : null,
            destinyCount: own.DESTINY_SLOT.length,
            relicCount: own.CLAN_RELIC.length,
        };
    });
}

/** 大廳版世家總覽要覆寫的文字（節點 id → 文字） */
export function spiritFamilyOverviewSummaryTexts(rows: readonly SpiritFamilyOverviewRow[]): Record<string, string> {
    const t = SPIRIT_FAMILY_SUMMARY_TEXTS;
    const cardCount = rows.reduce((sum, row) => sum + row.destinyCount + row.relicCount, 0);
    const lines = rows.slice(0, SPIRIT_FAMILY_SUMMARY_MAX_ROWS).map((row) => t.row
        .replace('{family}', row.familyName)
        .replace('{main}', row.mainName ?? t.noMain)
        .replace('{destiny}', String(row.destinyCount))
        .replace('{relic}', String(row.relicCount)));
    if (rows.length > SPIRIT_FAMILY_SUMMARY_MAX_ROWS) lines.push(t.more.replace('{count}', String(rows.length)));
    return {
        ProgressLabel: t.progress.replace('{cards}', String(cardCount)).replace('{families}', String(rows.length)),
        TipTitle: t.tipTitle,
        TipBody: lines.length > 0 ? lines.join('\n') : t.empty,
    };
}
