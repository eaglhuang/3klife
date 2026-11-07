// @spec-source → WBS SCN-09；PROG-2-1972 #14 暫定裁決（離間＝敵方 2 格內兩隊互攻 1 回合）；PROG-2-1983、PROG-2-1985
/**
 * SpecialDiscordRule — 控制類格子戰法「離間」
 *
 * 目標敵兵在 2 格內（lane 差＋depth 差）找最近的另一隊敵兵；找到才生效，
 * 目標倒戈 1 回合（沿用 BattleState.controlUnit），兩隊因陣營相對而互攻，期滿由 tickControlledUnits 換回。
 */
import { BattleState } from '../../models/BattleState';
import { Faction } from '../../../core/config/Constants';
import type { TroopUnit } from '../../../core/models/TroopUnit';

export const DISCORD_RANGE = 2;
export const DISCORD_TURNS = 1;

export interface DiscordResult {
    applied: boolean;
    targetId: string | null;
    partnerId: string | null;
}

const NONE: DiscordResult = { applied: false, targetId: null, partnerId: null };

/** 在候選中找目標 2 格內最近、同陣營、存活的另一隊；沒有回 null（派發器 resolver 共用） */
export function pickDiscordPartner(target: TroopUnit, candidates: Iterable<TroopUnit>): TroopUnit | null {
    let partner: TroopUnit | null = null;
    let best = Infinity;
    for (const unit of candidates) {
        if (unit.id === target.id || unit.currentHp <= 0 || unit.faction !== target.faction) continue;
        const dist = Math.abs(unit.lane - target.lane) + Math.abs(unit.depth - target.depth);
        if (dist <= DISCORD_RANGE && dist < best) { best = dist; partner = unit; }
    }
    return partner;
}

export function applySpecialDiscord(state: BattleState, casterFaction: Faction, targetId: string): DiscordResult {
    const target = state.units.get(targetId);
    if (!target || target.currentHp <= 0 || target.faction === casterFaction) return NONE;
    const partner = pickDiscordPartner(target, state.units.values());
    if (!partner) return NONE;
    if (!state.controlUnit(target, casterFaction, DISCORD_TURNS)) return NONE;
    return { applied: true, targetId: target.id, partnerId: partner.id };
}
