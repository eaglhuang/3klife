// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §5.3 傳承、§5.4 溢出轉換；獎勵系統 Base 框架規格書 (doc_spec_1186)；PROG-2-9242
/**
 * SupportCardEffect — 獎勵效果種類 "supportCard" 的發放 handler（純邏輯，不 import cc）。
 *
 * 獎池抽到一張支援卡時：
 *   沒持有        → item.grant（入學，建立 Lv1 實例），trace ENROLLED
 *   持有、傳承未滿 → item.breakthrough（傳承 +1），trace LIMIT_BREAK n
 *   持有、傳承已滿 → item.grant 學分（數量依稀有度，來自 support-rules.json 的 creditOverflow），trace CREDIT
 * 全部走 item.* 命令，不直接改庫存；後面的效果失敗時由 undo 反向撤銷。
 * 同一次 reward.roll 抽到同一張卡多次時，每一抽依序處理（第一抽入學、之後傳承、傳承滿後轉學分）。
 *
 * Unity 對照：像抽卡結果處理器：新卡進背包、重複卡升突破、滿突破轉碎片。
 */
import { ApiError } from '../../../shared/api/ApiErrors';
import { findSupportCard, type SupportCardsConfigV1 } from '../../../shared/support/SupportCardConfig';
import { ITEM_SUP_CREDIT, planSupportDuplicate, type SupportRulesV1 } from '../../../shared/support/SupportRules';
import type { RewardEffectHandler } from './RewardCommands';

export const SUPPORT_CARD_EFFECT_KIND = 'supportCard';

/** getter 形式：設定重載（卡表、規則換檔）後下一次發放就讀到新值 */
export function createSupportCardHandler(get: () => { cards: SupportCardsConfigV1; rules: SupportRulesV1 }): RewardEffectHandler {
    return async (effect, env) => {
        const { cards, rules } = get();
        const id = String(effect.itemId ?? effect.cardId ?? '');
        const card = id ? findSupportCard(cards, id) : null;
        if (!card) throw new ApiError('ITEM_RULE_UNKNOWN', `未知支援卡 ${id}`);
        const itemId = card.itemId;
        const count = (await env.invoke('item.count', { itemId })).result as { count: number };
        const held = count.count > 0;
        let limitBreak = 0;
        if (held) limitBreak = ((await env.invoke('item.instance', { itemId })).result as { limitBreak: number }).limitBreak;
        const plan = planSupportDuplicate(rules, card.rarity, held, limitBreak);

        if (plan.action === 'enroll') {
            const out = await env.invoke('item.grant', { itemId, qty: 1, source: 'REWARD', sourceRef: env.refId });
            return {
                applied: { ...effect, itemId }, trace: ['ENROLLED'], delta: out.delta, events: out.events,
                undo: async () => { try { await env.invoke('item.consume', { itemId, qty: 1, sink: 'REWARD_ROLLBACK' }); } catch { /* 盡力而為 */ } },
            };
        }
        if (plan.action === 'limitBreak') {
            const out = await env.invoke('item.breakthrough', { itemId });
            return {
                applied: { ...effect, itemId }, trace: [`LIMIT_BREAK ${plan.limitBreak}`], delta: out.delta, events: out.events,
                undo: async () => { try { await env.invoke('item.breakthrough', { itemId, rollback: true }); } catch { /* 盡力而為 */ } },
            };
        }
        const out = await env.invoke('item.grant', { itemId: ITEM_SUP_CREDIT, qty: plan.qty, source: 'REWARD', sourceRef: env.refId });
        const granted = (out.result as { granted: number }).granted;
        return {
            applied: { ...effect, itemId }, trace: [`CREDIT ${plan.qty}`], delta: out.delta, events: out.events,
            undo: async () => {
                if (granted > 0) try { await env.invoke('item.consume', { itemId: ITEM_SUP_CREDIT, qty: granted, sink: 'REWARD_ROLLBACK' }); } catch { /* 盡力而為 */ }
            },
        };
    };
}
