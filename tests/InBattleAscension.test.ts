/**
 * InBattleAscension／TroopCounterTactics — 戰場即時升階與兵種戰術相剋（doc_spec_0309 TC-ASC-01～03，PROG-2-1905）
 *
 * Unity 對照：EditMode Test 直接驗證純函式。
 */
import { assert, TestSuite } from './TestRunner';
import { TerrainType, TroopType } from '../assets/scripts/core/config/Constants';
import {
    applyBattleFame,
    ASCEND_CUTSCENE,
    BattleFameSource,
    IN_BATTLE_ASCEND_SURGES,
    mergeAscendSurges,
} from '../assets/scripts/battle/shared/InBattleAscension';
import {
    counterReflectDamage,
    evaluateTroopCounter,
    resolveNanmanRoar,
    troopMoveModifier,
    troopRangeBonus,
} from '../assets/scripts/battle/shared/TroopCounterTactics';

export function createInBattleAscensionSuite(): TestSuite {
    const suite = new TestSuite('InBattleAscension (戰場即時升階 PROG-2-1905)');

    suite.test('TC-ASC-01：名聲 90 斬將 +20 → 升裨將，帶兵 4000→6000', () => {
        const { general, event } = applyBattleFame({ uid: 'g1', name: '趙雲', generalFame: 90, generalRank: 0 }, [BattleFameSource.COMMANDER_KILL]);
        assert.equals(110, general.generalFame);
        assert.isTrue(event !== null);
        assert.equals(0, event!.oldRank);
        assert.equals(1, event!.newRank);
        assert.equals(6000, event!.newTroopCap);
        assert.equals('趙雲', event!.generalName);
        assert.equals(1000, mergeAscendSurges(event!.surges).troopRefill);
    });

    suite.test('TC-ASC-02：名聲 290 斬將＋單挑 → 偏將軍，全軍士氣拉滿', () => {
        const { event } = applyBattleFame({ uid: 'g1', name: '趙雲', generalFame: 290, generalRank: 1 },
            [BattleFameSource.COMMANDER_KILL, BattleFameSource.DUEL_VICTORY]);
        assert.equals(325, event!.currentTotalFame);
        assert.equals(35, event!.fameDelta);
        assert.equals(2, event!.newRank);
        assert.equals('偏將軍', event!.newRankTitle);
        assert.isTrue(mergeAscendSurges(event!.surges).moraleToMax);
    });

    suite.test('沒跨門檻不發事件；一次跨兩階合併兩筆激勵', () => {
        assert.equals(null, applyBattleFame({ uid: 'g', name: 'x', generalFame: 10, generalRank: 0 }, [BattleFameSource.VICTORY]).event);
        const { event } = applyBattleFame({ uid: 'g', name: 'x', generalFame: 95, generalRank: 0 },
            [BattleFameSource.BOSS_OR_NATIVE, BattleFameSource.BOSS_OR_NATIVE, BattleFameSource.BOSS_OR_NATIVE,
                BattleFameSource.BOSS_OR_NATIVE, BattleFameSource.BOSS_OR_NATIVE, BattleFameSource.BOSS_OR_NATIVE]);
        assert.equals(2, event!.newRank);
        assert.equals('1,2', event!.surges.map((s) => s.rank).join(','));
        const merged = mergeAscendSurges(event!.surges);
        assert.equals(1000, merged.troopRefill);
        assert.isTrue(merged.moraleToMax);
    });

    suite.test('五階激勵與定格參數依規格', () => {
        assert.equals(5, IN_BATTLE_ASCEND_SURGES.length);
        const all = mergeAscendSurges(IN_BATTLE_ASCEND_SURGES);
        assert.equals(1, all.moveBonus);
        assert.equals(-15, all.enemyMoraleDelta);
        assert.equals(20, all.critRatePct);
        assert.equals(0, ASCEND_CUTSCENE.freezeTimeScale);
        assert.equals(1.5, ASCEND_CUTSCENE.holdSec);
    });

    suite.test('TC-ASC-03：騎兵正面衝鋒槍兵 → 傷害 0、反傷 120%、停滯 1 回合', () => {
        const out = evaluateTroopCounter({ attackerTroop: TroopType.Cavalry, defenderTroop: TroopType.Pikeman, attackerTerrain: TerrainType.Plain, isCharge: true, frontal: true });
        assert.equals('JUMA_PIKE_WALL', out.mechanic);
        assert.equals(0, out.damagePct);
        assert.equals(1200, counterReflectDamage(1000, out));
        assert.equals(1, out.attackerStalledTurns);
        const flank = evaluateTroopCounter({ attackerTroop: TroopType.Cavalry, defenderTroop: TroopType.Pikeman, attackerTerrain: TerrainType.Plain, isCharge: true, frontal: false });
        assert.equals(null, flank.mechanic);
    });

    suite.test('縱深突襲與高地射程', () => {
        const raid = evaluateTroopCounter({ attackerTroop: TroopType.Cavalry, defenderTroop: TroopType.Archer, attackerTerrain: TerrainType.Plain });
        assert.equals(135, raid.damagePct);
        assert.isTrue(raid.forceCrit);
        assert.equals(1, raid.defenderNoShootTurns);
        const high = evaluateTroopCounter({ attackerTroop: TroopType.Archer, defenderTroop: TroopType.Infantry, attackerTerrain: TerrainType.Mountain });
        assert.equals(125, high.damagePct);
        const shielded = evaluateTroopCounter({ attackerTroop: TroopType.Archer, defenderTroop: TroopType.Infantry, attackerTerrain: TerrainType.Mountain, defenderShielded: true });
        assert.equals(100, shielded.damagePct);
        assert.equals(1, troopRangeBonus(TroopType.Archer, TerrainType.Mountain));
        assert.equals(0, troopRangeBonus(TroopType.Archer, TerrainType.Plain));
    });

    suite.test('南蠻：豹騎林地疾襲、蠻王狂嘯範圍與怒氣', () => {
        const leap = evaluateTroopCounter({ attackerTroop: TroopType.Cavalry, defenderTroop: TroopType.Shield, attackerTag: 'nanman-leopard', attackerTerrain: TerrainType.Forest });
        assert.equals('FOREST_RAID', leap.mechanic);
        assert.equals(1.5, leap.critMultiplier);
        assert.equals(2, troopMoveModifier('nanman-leopard', TerrainType.Forest).moveBonus);
        assert.equals(0, troopMoveModifier('nanman-leopard', TerrainType.Plain).moveBonus);
        assert.equals(null, resolveNanmanRoar({ lane: 0, depth: 0 }, 49, []));
        const roar = resolveNanmanRoar({ lane: 1, depth: 2 }, 80, [
            { uid: 'a', pos: { lane: 3, depth: 4 } },
            { uid: 'b', pos: { lane: 4, depth: 2 } },
        ])!;
        assert.equals(30, roar.rageAfter);
        assert.equals('a', roar.affectedUids.join(','));
        assert.equals(-20, roar.debuff.attackPct);
        assert.equals(2, roar.debuff.turns);
    });

    return suite;
}
