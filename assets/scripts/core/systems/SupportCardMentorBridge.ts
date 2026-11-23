// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §19 物品化；教官系統（支援卡）(doc_spec_0027)；PROG-2-9871
/**
 * SupportCardMentorBridge — 把「物品庫存裡的學府支援卡」轉成培育／學府／教官卡清單吃的 MentorCard 視圖（純函式，不依賴 cc）。
 *
 * 背景：教官池走獎勵框架，抽到的支援卡（SUP_*）以 item.grant 寫進物品庫存（category=supportCard）；
 * 但大廳的教官卡清單、培育選卡、學府選卡仍只讀舊的 legacy 教官卡存檔，抽到的卡因此看不到也選不到。
 * 庫存是唯一真相（不另建教官卡副本），這裡每次讀時才由庫存列推導出視圖，不寫回任何存檔。
 *
 * Unity 對照：像把 ScriptableObject 卡牌庫存換成 UI 列表專用的 ViewModel，列表重讀就重算。
 */
import type { MentorCard } from '../models/MentorCard';
import type { SupportCardDef } from '../models/MentorSupportSchema';
import { SUPPORT_CARD_CATEGORY, type SupportCardV1, type SupportCardsConfigV1, type SupportFocus, type SupportRarity } from '../../shared/support/SupportCardConfig';
import type { ItemRowView } from '../../shared/api/ApiCommands';
import type { GeneralConfig } from '../models/GeneralUnit';
import type { TrainingKind } from './NurtureSystem';

/** 支援卡來源教官卡 uid 前綴（與武將教官卡的 mentor-<武將 id> 區隔，不會相撞） */
export const SUPPORT_MENTOR_UID_PREFIX = 'mentor-supcard-';

/** 主屬性 → 培育訓練科目（陣＝統率、醫與藝借智／魅，學府結算另有自己的映射，這裡只決定培育擅長科目） */
const FOCUS_KIND: Readonly<Record<SupportFocus, TrainingKind>> = Object.freeze({
    武: 'str', 智: 'int', 統: 'lea', 政: 'pol', 魅: 'cha', 陣: 'lea', 醫: 'int', 藝: 'cha',
});

/** 稀有度 → 主屬性快照值與 EP（教官卡換算 TP 加成用；暫定值，等學府接線 SUP-4 以正式公式取代） */
const RARITY_STAT: Readonly<Record<SupportRarity, { stat: number; ep: number }>> = Object.freeze({
    R: { stat: 60, ep: 300 }, SR: { stat: 75, ep: 500 }, SSR: { stat: 90, ep: 800 },
});
const MAX_STAR = 5;

function supportDefOf(card: SupportCardV1, kind: TrainingKind): SupportCardDef {
    const flat = [1, 1, 1, 1, 1, 1];
    return {
        supportId: card.cardId,
        name: card.name,
        rarity: card.rarity,
        teachingStyle: card.school,
        statBonus: {},
        tacticInspireEvents: [],
        passiveEffects: [],
        friendshipBonus: flat,
        trainingEffect: flat,
        trainingSlotAffinity: [kind],
        slotBurstRate: 0.4,
        synergyPartners: [],
        source: 'Gacha',
        roleBoundary: 'TeachingOnly',
    };
}

/** 一張庫存支援卡 → 教官卡視圖；limitBreak（傳承次數）當教官突破星等 */
export function supportCardAsMentorCard(card: SupportCardV1, limitBreak: number): MentorCard {
    const kind = FOCUS_KIND[card.focus];
    const base = RARITY_STAT[card.rarity];
    const stats: Record<TrainingKind, number> = { str: 40, int: 40, lea: 40, pol: 40, cha: 40 };
    stats[kind] = Math.round(base.stat * card.mult);
    const snapshot = {
        id: card.cardId, name: card.name, faction: 'neutral', gender: card.kind === 'beauty' ? '女' : '男', age: 40, hp: 1000,
        ...stats, luk: 50, careerClass: kind === 'str' ? 'Warrior' : 'Scholar',
    } as unknown as GeneralConfig;
    return {
        uid: `${SUPPORT_MENTOR_UID_PREFIX}${card.cardId}`,
        sourceGeneralId: card.projectionOf ?? card.cardId,
        name: card.name,
        faction: 'neutral',
        retiredAge: 0,
        retiredSeason: 0,
        retiredYear: 0,
        ep_snapshot: base.ep,
        gene_refs: [],
        parentUids: ['', ''],
        generalSnapshot: snapshot,
        support: supportDefOf(card, kind),
        source: 'Gacha',
        stars: Math.max(0, Math.min(MAX_STAR, Math.floor(limitBreak) || 0)),
    };
}

/** item.list 的列 → 教官卡視圖清單：只取 category=supportCard 且卡表有的卡；順序依庫存列（已依 itemId 排序） */
export function supportRowsAsMentorCards(config: SupportCardsConfigV1, rows: readonly ItemRowView[]): MentorCard[] {
    const byItem = new Map(config.cards.map((c) => [c.itemId, c] as const));
    const out: MentorCard[] = [];
    for (const row of rows) {
        if (row.category !== SUPPORT_CARD_CATEGORY || row.quantity <= 0) continue;
        const card = byItem.get(row.itemId);
        if (card) out.push(supportCardAsMentorCard(card, row.instance?.limitBreak ?? 0));
    }
    return out;
}

/** 舊教官卡存檔 + 庫存支援卡；uid 相同的以舊存檔為準（不重複列） */
export function mergeMentorCards(legacy: readonly MentorCard[], fromInventory: readonly MentorCard[]): MentorCard[] {
    const seen = new Set(legacy.map((c) => c.uid));
    return [...legacy, ...fromInventory.filter((c) => !seen.has(c.uid))];
}
