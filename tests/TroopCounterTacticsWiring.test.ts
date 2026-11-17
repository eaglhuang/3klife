/**
 * TroopCounterTacticsWiring — 兵種動態相剋接進戰鬥結算（doc_spec_0309 §3，PROG-2-9368）。
 *
 * 驗三個機制在結算裡真的生效，以及開關關閉（教學戰）時結果與原本相同。
 * 兵種數值取 DEFAULT_TROOP_STATS：騎 攻40 防20 命100｜弓 攻30 防15 命80｜槍 攻32 防22 命110｜步 攻35 防25 命120。
 */
import { EVENT_NAMES, Faction, StatusEffect, TerrainType, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { DEFAULT_TROOP_STATS } from '../assets/scripts/battle/runtime/BattleUnitSpawner';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function makeGeneral(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 50, int: 50, lea: 60, luk: 0, skillId: 'none', battlePrimarySkillId: 'none' });
}

let serial = 0;
function makeTroop(type: TroopType, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(`tc-${faction}-${type}-${++serial}`, type, faction, DEFAULT_TROOP_STATS[type]);
    unit.moveTo(lane, depth);
    return unit;
}

function makeWorld(enabled: boolean): { state: BattleState; resolver: BattleCombatResolver; lines: string[]; off: () => void } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const state = new BattleState();
    state.reset(makeGeneral('p-gen', Faction.Player), makeGeneral('e-gen', Faction.Enemy));
    const resolver = new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => {},
        setEnemyGeneralUnitId: () => {},
        isTroopCounterTacticsEnabled: () => enabled,
    });
    const lines: string[] = [];
    const off = services().event.on(EVENT_NAMES.TroopCounterLine, (line: string) => { lines.push(line); });
    return { state, resolver, lines, off };
}

interface HitResult { defenderLoss: number; attackerLoss: number; attackerRooted: boolean; defenderNoShoot: boolean; lines: string[]; }

function hit(enabled: boolean, att: TroopType, def: TroopType, opts: { charge?: number; attackerTerrain?: TerrainType; defLane?: number } = {}): HitResult {
    const w = makeWorld(enabled);
    const a = makeTroop(att, Faction.Player, 2, 3);
    const d = makeTroop(def, Faction.Enemy, opts.defLane ?? 2, 4);
    w.state.addUnit(a);
    w.state.addUnit(d);
    a.chargeCells = opts.charge ?? 0;
    if (opts.attackerTerrain) {
        const cell = w.state.getCell(2, 3);
        if (cell) cell.terrain = opts.attackerTerrain;
    }
    const aHp = a.currentHp;
    const dHp = d.currentHp;
    w.resolver.resolveCombat(a, d, services());
    w.off();
    return {
        defenderLoss: dHp - d.currentHp,
        attackerLoss: aHp - a.currentHp,
        attackerRooted: services().buff.hasBuff(a.id, StatusEffect.Rooted),
        defenderNoShoot: services().buff.hasBuff(d.id, StatusEffect.NoShoot),
        lines: [...w.lines],
    };
}

export function createTroopCounterTacticsWiringSuite(): TestSuite {
    const suite = new TestSuite('TroopCounterTacticsWiring（兵種動態相剋接線，PROG-2-9368）');

    suite.test('拒馬槍陣：騎兵衝鋒正面撞槍兵，槍兵不扣血、騎兵吃反傷並停滯', () => {
        const off = hit(false, TroopType.Cavalry, TroopType.Pikeman, { charge: 2 });
        const on = hit(true, TroopType.Cavalry, TroopType.Pikeman, { charge: 2 });
        assert.equals(on.defenderLoss, 0, '槍兵不扣血');
        assert.equals(on.attackerLoss, Math.max(1, Math.floor(off.defenderLoss * 1.2)), '反傷 = 原傷害 × 120%');
        assert.isTrue(on.attackerRooted, '騎兵停滯');
        assert.isTrue(on.lines.some((l) => l.includes('拒馬槍陣')), '戰報有拒馬槍陣');
        assert.isTrue(off.defenderLoss > 0 && off.attackerLoss === 0 && !off.attackerRooted, '開關關閉時照原本結算');
        // eslint-disable-next-line no-console
        console.log(`[相剋數字] 騎衝槍：關閉 槍兵 -${off.defenderLoss}；啟用 槍兵 -${on.defenderLoss}、騎兵 -${on.attackerLoss}、停滯 1 回合`);
    });

    suite.test('拒馬槍陣：騎兵沒有移動（不是衝鋒）就照一般結算', () => {
        const on = hit(true, TroopType.Cavalry, TroopType.Pikeman, { charge: 0 });
        assert.isTrue(on.defenderLoss > 0, '槍兵照常扣血');
        assert.equals(on.attackerLoss, 0, '騎兵不吃反傷');
        assert.isFalse(on.attackerRooted, '騎兵不停滯');
    });

    suite.test('縱深突襲：騎兵打弓兵，傷害 +35% 再必暴，弓兵被封射', () => {
        const off = hit(false, TroopType.Cavalry, TroopType.Archer);
        const on = hit(true, TroopType.Cavalry, TroopType.Archer);
        assert.equals(on.defenderLoss, Math.floor(Math.floor(off.defenderLoss * 1.35) * 1.5), '原傷害 ×1.35 後暴擊 ×1.5');
        assert.isTrue(on.defenderNoShoot, '弓兵被封射');
        assert.isTrue(on.defenderLoss < DEFAULT_TROOP_STATS[TroopType.Archer].hp, '滿血弓兵不會一擊陣亡');
        assert.isFalse(off.defenderNoShoot, '開關關閉時不封射');
        // eslint-disable-next-line no-console
        console.log(`[相剋數字] 騎打弓：關閉 弓兵 -${off.defenderLoss}；啟用 弓兵 -${on.defenderLoss}（弓兵生命 ${DEFAULT_TROOP_STATS[TroopType.Archer].hp}）、下回合不能射擊`);
    });

    suite.test('高地射程：弓兵在山地打步兵 +25%，平地不加', () => {
        const flat = hit(true, TroopType.Archer, TroopType.Infantry);
        const offHill = hit(false, TroopType.Archer, TroopType.Infantry, { attackerTerrain: TerrainType.Mountain });
        const hill = hit(true, TroopType.Archer, TroopType.Infantry, { attackerTerrain: TerrainType.Mountain });
        assert.equals(hill.defenderLoss, Math.max(1, Math.floor(offHill.defenderLoss * 1.25)), '山地 ×1.25');
        assert.isTrue(hill.lines.some((l) => l.includes('高地射程')), '戰報有高地射程');
        assert.isFalse(flat.lines.some((l) => l.includes('高地射程')), '平地不觸發');
        // eslint-disable-next-line no-console
        console.log(`[相剋數字] 弓在山地打步：關閉 步兵 -${offHill.defenderLoss}；啟用 步兵 -${hill.defenderLoss}`);
    });

    return suite;
}
