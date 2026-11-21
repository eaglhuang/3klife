// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §16 四池總表、§18 重複卡「傳承 +1／學分 +N」；SUP-10（PROG-2-9243）
/**
 * SupportCardGachaView — 教官池抽到的支援卡在轉蛋結果畫面的呈現轉接（純函式，不依賴 cc）。
 *
 * 轉蛋結果畫面的資料型別是武將（LocalGachaResultEntry.general）；支援卡是「教學投影」，不是武將本人，也不入名冊。
 * 這裡把一張支援卡包成只給畫面用的結果物件：id 用卡號（SUP_*，不會與任何武將 id 相撞，所以不會誤觸舊教官卡流程）、
 * 名稱附上 reward.roll 的結算（傳承 +1／學分 +N），稀有度換成畫面認得的階。抽獎與入庫已由獎池與 supportCard 效果完成，這裡不改任何數值。
 *
 * Unity 對照：像把 ScriptableObject 卡牌轉成 UI 用的 ViewModel。
 */
import type { GeneralConfig, GeneralDetailRarityTier } from '../models/GeneralUnit';
import type { ItemMember } from '../../shared/reward/RewardRoster';
import { SUPPORT_CARD_CATEGORY, type SupportCardV1, type SupportRarity } from '../../shared/support/SupportCardConfig';

/** 支援卡稀有度 → 轉蛋畫面的稀有度階（SSR＝legendary、SR＝epic、R＝rare；與名冊對照同一套） */
export const SUPPORT_VIEW_TIER: Readonly<Record<SupportRarity, GeneralDetailRarityTier>> = Object.freeze({
    SSR: 'legendary', SR: 'epic', R: 'rare',
});

/** supportCard 效果的結算 trace → 玩家看得懂的結果字樣；新入學回 null（不加註） */
export function supportOutcomeLabel(trace: readonly string[]): string | null {
    for (const t of trace) {
        const brk = /^LIMIT_BREAK (\d+)$/.exec(t);
        if (brk) return '傳承 +1';
        const credit = /^CREDIT (\d+)$/.exec(t);
        if (credit) return `學分 +${credit[1]}`;
    }
    return null;
}

/** 把一張支援卡與它這一抽的結算包成結果畫面用的物件（不是武將，不入名冊） */
export function supportCardAsResult(card: SupportCardV1, trace: readonly string[]): GeneralConfig {
    const note = supportOutcomeLabel(trace);
    return {
        id: card.cardId,
        name: note ? `${card.name}（${note}）` : card.name,
        rarityTier: SUPPORT_VIEW_TIER[card.rarity],
        description: '教學投影・只用於學府修業',
    } as unknown as GeneralConfig;
}

/** 支援卡表 → 獎池 itemQuery 的物品目錄（教官池的卡由此展開成逐張項目；卡表是唯一真相，獎池 JSON 不手寫卡） */
export function supportCardItemMembers(cards: readonly SupportCardV1[]): ItemMember[] {
    return cards.map((c) => ({ id: c.cardId, itemId: c.itemId, category: SUPPORT_CARD_CATEGORY, rarity: c.rarity, nameKey: c.nameKey }));
}
