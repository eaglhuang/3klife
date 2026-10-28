// @spec-source → 教官系統（支援卡）.md (doc_spec_0027)；PROG-2-1429 依建檔紀錄補標出處
/**
 * MentorHoldingRows — 「我的教官卡」列表的列資料（PROG-2-1097，純邏輯，不依賴 cc）
 *
 * 持有教官卡 → 列文字（名稱、稀有度、星等、專長、TP 加成）與詳情資料；
 * 排序：稀有度高的在前，同稀有度星等高的在前。
 */
import type { MentorCard } from '../../core/models/MentorCard';
import { mentorFromCard } from '../../core/systems/NurtureSystem';
import { mentorToCardData, type MentorCardData } from '../../core/systems/MentorCardTabs';
import { STAT_LABELS } from './NurtureFlowController';

export interface MentorHoldingRow {
    uid: string;
    name: string;
    text: string;
    card: MentorCardData;
}

const RARITY_ORDER: Record<string, number> = { SSR: 0, SR: 1, R: 2 };

export function mentorHoldingRows(cards: readonly MentorCard[]): MentorHoldingRow[] {
    return cards
        .map((card) => {
            const mentor = mentorFromCard(card);
            const rarity = card.support?.rarity ?? '';
            const stars = mentor.stars ?? 0;
            const specialty = STAT_LABELS[mentor.specialty] ?? mentor.specialty;
            const head = [card.name, rarity, `★${stars}`].filter(Boolean).join('　');
            return {
                uid: card.uid,
                name: card.name,
                rarity,
                stars,
                text: `${head}\n專長 ${specialty}　TP +${mentor.tpBonus}`,
                card: mentorToCardData(mentor),
            };
        })
        .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9) || b.stars - a.stars)
        .map(({ uid, name, text, card }) => ({ uid, name, text, card }));
}
