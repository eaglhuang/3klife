/**
 * 八陣圖持續防禦區（PROG-2-0760／0761）。
 *
 * 區域獨立存在於 BattleState.formationZones，不佔用格子狀態，所以可與火場等同格共存。
 * 倍率只對區域所屬陣營生效；每個陣營在自己的戰術階段倒數一次。
 * PM 暫定：持續 3 回合，到期或施放者陣亡即移除。
 */
import type { Faction } from '../../core/config/Constants';

export const FORMATION_ZONE_TURNS = 3;

export interface FormationZone {
  id: string;
  lane: number;
  depth: number;
  zoneFaction: Faction;
  casterUnitId: string;
  defenseMultiplier: number;
  remainingTurns: number;
}

/** 八陣圖防禦倍率：規格 All_Def +40%，與 SkillEffectFormulas 的 formationDefense 同值 */
export const FORMATION_ZONE_MULTIPLIER = 1.4;

/** 站在區域內、屬於所屬陣營的單位，防禦乘上倍率；其餘為 1 */
export function zoneDefenseMultiplier(zone: FormationZone | null | undefined, unitFaction: Faction): number {
  if (!zone || zone.zoneFaction !== unitFaction) return 1;
  return zone.defenseMultiplier;
}

/**
 * 推進某陣營的防禦區一回合：施放者不在場或已陣亡即移除，倒數歸零也移除。
 * 回傳被移除的格子 key，方便測試與紀錄。
 */
export function advanceFormationZonesOf(
  zones: Map<string, FormationZone>,
  faction: Faction,
  isCasterAlive: (casterUnitId: string) => boolean,
): string[] {
  const removed: string[] = [];
  for (const [key, zone] of zones) {
    if (zone.zoneFaction !== faction) continue;
    if (!isCasterAlive(zone.casterUnitId)) {
      zones.delete(key);
      removed.push(key);
      continue;
    }
    zone.remainingTurns -= 1;
    if (zone.remainingTurns <= 0) {
      zones.delete(key);
      removed.push(key);
    }
  }
  return removed;
}
