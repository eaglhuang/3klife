// @spec-source → Data Schema 文件 §2-1 #4／#4b（Spirit_Card_Collection、Spirit_Family_State）、英靈世家系統 §E-5（TSK-09，PROG-2-1965）
/**
 * SpiritFamilyReadModel — 英靈卡集合補共鳴欄位、家族級 read model 與 Display_Bucket 分組（純邏輯，不依賴 cc）。
 *
 * - Spirit_Card_Collection：InventoryProjection 已推導基本欄位，這裡依裝配者補 Resonance_Band／Glow_State
 *   （沿用 SpiritResonance）；未裝配的卡兩欄為 null。
 * - Spirit_Family_State：主卡取 Family_Primary_Flag = true 的那張；池、名聲、深度、展示焦點由存檔傳入。
 * - Display_Bucket：DESTINY_SLOT／CLAN_RELIC 分組，供人物頁命槽與陳列室各取所需。
 *
 * 暫定：Contribution_Mode 規格只有範例值 ACTIVE_MAIN_CARD；沒有主卡時本卡另用 NO_MAIN_CARD（池保留不灌）。
 * Unity 對照：像從存檔資料組 ViewModel，資料本身不存這些衍生欄位。
 */
import type { SpiritCardEntry } from './ReadModelValidators';
import { glowStateOf, resonanceBandOf, type GlowState, type ResonanceBand, type ResonanceWearer } from './SpiritResonance';

export interface SpiritCardReadRow extends SpiritCardEntry {
    Resonance_Band: ResonanceBand | null;
    Glow_State: GlowState | null;
}

export type ContributionMode = 'ACTIVE_MAIN_CARD' | 'NO_MAIN_CARD';

export interface SpiritFamilyStateReadRow {
    Spirit_Family_Key: string;
    Family_Contribution_Pool: number;
    Family_Fame: number;
    Family_Depth: number;
    Active_Main_Spirit_UID: string | null;
    Main_Spirit_LineageScore: number | null;
    Contribution_Mode: ContributionMode;
    Featured_Archive_Spirit_UIDs: string[];
}

/** 存檔中家族層自己保存的數值。 */
export interface SpiritFamilyStoredState {
    Family_Contribution_Pool?: number;
    Family_Fame?: number;
    Family_Depth?: number;
    Featured_Archive_Spirit_UIDs?: readonly string[];
}

function nonNegative(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** 依裝配者補共鳴階與光效；找不到裝配者（未裝配）時兩欄為 null。 */
export function withResonance(
    cards: readonly SpiritCardEntry[], wearerOf: (generalUid: string) => ResonanceWearer | null,
): SpiritCardReadRow[] {
    return cards.map((card) => {
        const wearer = card.Equipped_General_UID ? wearerOf(card.Equipped_General_UID) : null;
        if (!wearer) return { ...card, Resonance_Band: null, Glow_State: null };
        const band = resonanceBandOf(card, wearer);
        return { ...card, Resonance_Band: band, Glow_State: glowStateOf(band) };
    });
}

/** 組一個家族的 Spirit_Family_State；展示焦點只留本家族存在的卡，空時預設主卡。 */
export function buildSpiritFamilyState(
    familyKey: string, cards: readonly SpiritCardEntry[], stored: Readonly<SpiritFamilyStoredState> = {},
): SpiritFamilyStateReadRow {
    const own = cards.filter((c) => c.Spirit_Family_Key === familyKey);
    const main = own.find((c) => c.Family_Primary_Flag) ?? null;
    const ownIds = new Set(own.map((c) => c.Spirit_ID));
    const featured = (stored.Featured_Archive_Spirit_UIDs ?? []).filter((id) => ownIds.has(id));
    return {
        Spirit_Family_Key: familyKey,
        Family_Contribution_Pool: nonNegative(stored.Family_Contribution_Pool),
        Family_Fame: nonNegative(stored.Family_Fame),
        Family_Depth: nonNegative(stored.Family_Depth),
        Active_Main_Spirit_UID: main?.Spirit_ID ?? null,
        Main_Spirit_LineageScore: main?.LineageScore ?? null,
        Contribution_Mode: main ? 'ACTIVE_MAIN_CARD' : 'NO_MAIN_CARD',
        Featured_Archive_Spirit_UIDs: featured.length > 0 ? featured : main ? [main.Spirit_ID] : [],
    };
}

/** 依 Display_Bucket 分組（各組依 Spirit_ID 排序，結果穩定）。 */
export function groupByDisplayBucket(cards: readonly SpiritCardEntry[]): Record<SpiritCardEntry['Display_Bucket'], SpiritCardEntry[]> {
    const groups: Record<SpiritCardEntry['Display_Bucket'], SpiritCardEntry[]> = { DESTINY_SLOT: [], CLAN_RELIC: [] };
    for (const card of cards) groups[card.Display_Bucket].push(card);
    for (const list of Object.values(groups)) list.sort((a, b) => (a.Spirit_ID < b.Spirit_ID ? -1 : a.Spirit_ID > b.Spirit_ID ? 1 : 0));
    return groups;
}
