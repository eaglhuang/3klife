// @spec-source → 英靈卡詳情版面（DUP-02，PROG-2-1142）；虎符詳情抽屜（TSK-12，PROG-2-1504）
/**
 * SpiritTallyDetailView — 英靈卡與虎符兩個詳情入口共用 spirit-tally-detail-screen 的文字組裝（純邏輯，不依賴 cc）。
 *
 * 輸出的 key 是版面節點的 id 或節點名稱（UITemplateBinder 兩種都認）。
 * 虎符文字沿用 TigerTallyDetailComposite 原本的規則（缺值的預設句、典故與摘要的組法），搬到這裡以便測試。
 *
 * Unity 對照：同一個 Prefab 由兩種資料來源填欄位，Presenter 只負責把資料轉成欄位文字。
 */
import type { TallyCardData } from '../../shared/TallyCardContract';
import type { SpiritCard } from '../../core/models/SpiritCard';
import { buildSpiritCardDetailView, type SpiritCardDetailLookup } from './SpiritCardDetailTexts';

export const SPIRIT_TALLY_DETAIL_SCREEN_ID = 'spirit-tally-detail-screen';

export interface SpiritTallyDetailView {
    readonly texts: Record<string, string>;
    /** 只有正式英靈卡能灌注血脈 */
    readonly infuseEnabled: boolean;
}

/** 英靈卡：名稱與「名｜死亡年 年」標題放進 HeroName／TallyTitle，血脈、靈力、連結虎符沿用既有 key。 */
export function spiritTallyDetailOfSpirit(card: SpiritCard, lookup?: SpiritCardDetailLookup): SpiritTallyDetailView {
    const view = buildSpiritCardDetailView(card, lookup);
    const { spiritCardDetailTitle, closeSpiritCardDetailLabel, ...rest } = view.texts;
    return {
        texts: {
            ...rest,
            HeroName: card.name,
            TallyTitle: spiritCardDetailTitle,
            closeSpiritCardDetailLabel,
        },
        infuseEnabled: view.infuseEnabled,
    };
}

/** 虎符典故內文：有內文用內文，否則給固定提示句。 */
export function tallyLoreBodyText(data: TallyCardData): string {
    const blocks: string[] = [];
    if (data.lore?.body) blocks.push(data.lore.body);
    if (blocks.length === 0) {
        blocks.push('此虎符目前尚未補齊完整典故敘述。');
    }
    return blocks.join('\n');
}

/** 虎符摘要：描述加取得條件，兩行以上換行。 */
export function tallySummaryText(data: TallyCardData): string {
    const lines: string[] = [];
    if (data.desc) lines.push(data.desc);
    if (data.source?.obtainHint) lines.push(`取得：${data.source.obtainHint}`);
    return lines.join('\n');
}

/** 虎符：卡面、來源、典故與基礎數值的文字，key 對應版面節點名稱。 */
export function spiritTallyDetailOfTally(data: TallyCardData): SpiritTallyDetailView {
    return {
        texts: {
            UnitName: data.unitName,
            UnitSub: data.unitSub,
            RarityLabel: data.rarityLabel ?? '',
            StarsLabel: data.stars ?? '',
            SourceFaction: data.source?.faction ?? '未設定陣營',
            SourceLine: [data.source?.origin, data.source?.sourceType].filter(Boolean).join(' / '),
            SourceOriginValue: data.source?.origin ?? '未設定來源',
            SourceTypeValue: data.source?.sourceType ?? '未設定取得類型',
            SourceObtainValue: data.source?.obtainHint ?? '未提供取得條件',
            LoreTitle: data.lore?.title ?? '虎符典故',
            LoreSummary: data.lore?.summary ?? '尚未提供典故摘要',
            LoreBody: tallyLoreBodyText(data),
            AtkValue: `${data.atk}`,
            DefValue: `${data.def}`,
            HpValue: `${data.hp}`,
            SpdValue: `${data.spd}`,
            CostValue: `${data.cost}`,
            SummaryText: tallySummaryText(data),
        },
        infuseEnabled: false,
    };
}
