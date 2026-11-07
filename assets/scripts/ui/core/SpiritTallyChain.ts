// @spec-source → 英靈虎符視覺契約（spirit-tally-and-elite-troop-contract-v1）名將→血脈卡→虎符→軍隊；WBS SPV-04；PROG-2-2080
/**
 * SpiritTallyChain — 英靈卡詳情串上同一名將的虎符與特種軍隊欄（純邏輯，不依賴 cc）。
 *
 * spirit-tally-detail-screen 一頁有英靈、虎符、軍隊三欄；原本從英靈卡打開時虎符與軍隊欄是空的。
 * 這裡依英靈卡的武將 uid 找出同一名將產出的虎符（sourceGeneralUid 相同），
 * 再用虎符目錄依兵種取卡面資料，三欄共用同一位名將（同一血脈標識）。
 *
 * 暫定：同一名將有多張虎符時取星級最高者，同星依 uid 排序；找不到對應虎符時，虎符欄顯示提示句、數值留空。
 * Unity 對照：像詳情 Prefab 依角色 id 去背包撈出關聯的道具，三個區塊吃同一個 key。
 */
import type { TigerTallyCard } from '../../core/models/TigerTallyCard';
import type { SpiritCard } from '../../core/models/SpiritCard';
import type { TallyCardData } from '../../shared/TallyCardContract';
import { fallbackSpiritCardDetailText, type SpiritCardDetailLookup } from './SpiritCardDetailTexts';
import { spiritTallyDetailOfSpirit, spiritTallyDetailOfTally, type SpiritTallyDetailView } from './SpiritTallyDetailView';

export const SPIRIT_TALLY_CHAIN_TEXTS = {
    noTally: '此英靈尚未留下虎符',
    linked: '{base}｜{tally}',
} as const;

/** 虎符與軍隊欄的節點名稱：找不到虎符時要清空，避免殘留上一張卡的內容 */
export const TALLY_COLUMN_KEYS = [
    'UnitName', 'UnitSub', 'RarityLabel', 'StarsLabel', 'SourceFaction', 'SourceLine',
    'SourceOriginValue', 'SourceTypeValue', 'SourceObtainValue', 'LoreTitle', 'LoreSummary', 'LoreBody',
    'AtkValue', 'DefValue', 'HpValue', 'SpdValue', 'CostValue', 'SummaryText',
] as const;

/** 同一名將產出的虎符：星級高者優先，同星依 uid */
export function linkedTallyOf(
    generalUid: string,
    tallies: readonly TigerTallyCard[],
): TigerTallyCard | null {
    const own = tallies.filter((t) => t.sourceGeneralUid === generalUid);
    own.sort((a, b) => (b.stars ?? 1) - (a.stars ?? 1) || a.uid.localeCompare(b.uid));
    return own[0] ?? null;
}

/** 虎符實例 → 卡面資料：依兵種取目錄卡，帶上實例的品質、星級與 uid；目錄沒有該兵種時回傳 null */
export function tallyCardDataOf(
    tally: TigerTallyCard,
    catalog: Iterable<TallyCardData>,
): TallyCardData | null {
    for (const card of catalog) {
        if (card.unitType !== tally.troopType) continue;
        return {
            ...card,
            rarityLabel: tally.quality,
            stars: '★'.repeat(Math.max(1, Math.floor(tally.stars ?? 1))),
            instanceUid: tally.uid,
        };
    }
    return null;
}

/** 英靈卡詳情整頁：英靈欄沿用原規則，虎符與軍隊欄改填同一名將的虎符 */
export function spiritTallyChainView(
    spirit: SpiritCard,
    tallies: readonly TigerTallyCard[],
    catalog: Iterable<TallyCardData>,
    lookup?: SpiritCardDetailLookup,
): SpiritTallyDetailView {
    const base = spiritTallyDetailOfSpirit(spirit, lookup);
    const tally = linkedTallyOf(spirit.uid, tallies);
    const data = tally ? tallyCardDataOf(tally, catalog) : null;
    const texts: Record<string, string> = { ...base.texts };
    if (data) {
        Object.assign(texts, spiritTallyDetailOfTally(data).texts);
        if (texts.linkedTallyLabel) {
            texts.linkedTallyLabel = SPIRIT_TALLY_CHAIN_TEXTS.linked
                .replace('{base}', texts.linkedTallyLabel)
                .replace('{tally}', data.unitName);
        }
    } else {
        for (const key of TALLY_COLUMN_KEYS) texts[key] = '';
        texts.UnitName = SPIRIT_TALLY_CHAIN_TEXTS.noTally;
    }
    return { texts, infuseEnabled: base.infuseEnabled };
}

/**
 * 虎符詳情的「虎符層級」行（DUP-03，PROG-2-2081）：依虎符實例的來源名將找英靈卡，讀血脈灌注累積的 linkedTallyLevel。
 * 找不到虎符實例或英靈卡時回空字串（不顯示）；灌注後重開詳情即讀到新值。
 */
export function tallyLinkedLevelText(
    instanceUid: string | undefined,
    tallies: Readonly<Record<string, TigerTallyCard>>,
    spirits: readonly SpiritCard[],
    lookup: SpiritCardDetailLookup = fallbackSpiritCardDetailText,
): string {
    const source = instanceUid ? tallies[instanceUid]?.sourceGeneralUid : undefined;
    const spirit = source ? spirits.find((s) => s.uid === source) : undefined;
    if (!spirit) return '';
    const raw = spirit.linkedTallyLevel;
    const level = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    return lookup('ui.spirit_card.linked_tally_level', String(level));
}
