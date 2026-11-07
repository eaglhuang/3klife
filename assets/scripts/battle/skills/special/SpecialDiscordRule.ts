// @spec-source → WBS SCN-09；PROG-2-1972 #14 暫定裁決（離間＝敵方 2 格內兩隊互攻 1 回合）；PROG-2-1983
/**
 * SpecialDiscordRule — 控制類格子戰法「離間」
 *
 * 目標敵兵在 2 格內（lane 差＋depth 差）找最近的另一隊敵兵；找到才生效，
 * 目標倒戈 1 回合（沿用 BattleState.controlUnit），兩隊因陣營相對而互攻，期滿由 tickControlledUnits 換回。
 */
import { BattleState } from '../../models/BattleState';
import { Faction } from '../../../core/config/Constants';

export const DISCORD_RANGE = 2;
export const DISCORD_TURNS = 1;

export interface DiscordResult {
    applied: boolean;
    targetId: string | null;
    partnerId: string | null;
}

const NONE: DiscordResult = { applied: false, targetId: null, partnerId: null };

export function applySpecialDiscord(state: BattleState, casterFaction: Faction, targetId: string): DiscordResult {
    const target = state.units.get(targetId);
    if (!target || target.currentHp <= 0 || target.faction === casterFaction) return NONE;
    let partnerId: string | null = null;
    let best = Infinity;
    for (const unit of state.units.values()) {
        if (unit.id === target.id || unit.currentHp <= 0 || unit.faction !== target.faction) continue;
        const dist = Math.abs(unit.lane - target.lane) + Math.abs(unit.depth - target.depth);
        if (dist <= DISCORD_RANGE && dist < best) { best = dist; partnerId = unit.id; }
    }
    if (!partnerId) return NONE;
    if (!state.controlUnit(target, casterFaction, DISCORD_TURNS)) return NONE;
    return { applied: true, targetId: target.id, partnerId };
}
