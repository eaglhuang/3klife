/**
 * KinTestFixtures.ts — 羈絆戰場效果測試共用的建場工具（doc_spec_1358；不是測試檔，不會被自動掃描）。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { KinPairLike } from '../assets/scripts/core/systems/KinBattleEffects';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';

export function kinHero(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60, luk: 0,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [], ultimateSlots: [],
    });
}

/** 部隊；tallyId 同時當來源武將 id（見 openKinBattle） */
export function kinTroop(id: string, faction: Faction, lane: number, depth: number, tallyId: string | null, hp = 1000): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
    u.moveTo(lane, depth);
    u.tallyId = tallyId;
    return u;
}

export const SWORN_PAIR = (a: string, b: string): KinPairLike => ({ uidA: a, uidB: b, type: 'DYNAMIC_SWORN' });
export const COMRADE_PAIR = (a: string, b: string): KinPairLike => ({ uidA: a, uidB: b, type: 'COMRADE' });
export const SPOUSE_PAIR = (a: string, b: string): KinPairLike => ({ uidA: a, uidB: b, type: 'SPOUSE' });

export function openKinBattle(dynamic: KinPairLike[]): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(kinHero('liu-bei', Faction.Player), kinHero('e', Faction.Enemy));
    ctrl.dynamicRelations = dynamic;
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: tallyId } as unknown as TallyBattleInfo);
    return ctrl;
}

export function kinResolverOf(ctrl: BattleController): BattleCombatResolver {
    return (ctrl as unknown as { combatResolver: BattleCombatResolver }).combatResolver;
}
