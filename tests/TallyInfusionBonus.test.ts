/**
 * 虎符灌注層級攻防加成（PROG-2-1998）：攻防 ×(1+0.06×層級)，與星級倍率相乘；層級夾 0~5；
 * 戰場綁虎符時讀 tallyInfoOf 回傳的 infusionLevel（沒帶視為 0，舊行為不變）。
 */
import { TestSuite, assert } from './TestRunner';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { starStatMultiplier, tallyBattleInfoOf } from '../assets/scripts/core/systems/TigerTallyStar';
import { clampTallyInfusionLevel, tallyInfusionStatMultiplier } from '../assets/scripts/core/systems/TallyInfusionBonus';

const TEMPLATE = 'tiger-tally-bai-ma';

function card(stars: number): TigerTallyCard {
    return { uid: 'tally-1', templateId: TEMPLATE, sourceGeneralUid: 'src', quality: 'SSR', score: 0, source: 'reward', producedSeason: 1, troopType: 'cavalry', stars };
}

function hero(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [], ultimateSlots: [], rebirthCount: 0,
    });
}

function deployWith(infusionLevel: number | undefined, stars: number): number {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(hero('p', Faction.Player), hero('e', Faction.Enemy));
    ctrl.tallyInfoOf = () => (infusionLevel === undefined ? tallyBattleInfoOf(card(stars)) : tallyBattleInfoOf(card(stars), infusionLevel));
    ctrl.placeGeneralOnBoard(2, 2);
    const result = ctrl.tryDeployTroop(TroopType.Cavalry, 1, undefined, { tally: { cardUid: 'tally-1', templateId: TEMPLATE } });
    assert.isTrue(result.ok, '出陣：' + String(result.reason));
    return result.unit!.tallyStarMultiplier;
}

export function createTallyInfusionBonusSuite(): TestSuite {
    const suite = new TestSuite('TallyInfusionBonus（虎符灌注層級攻防 +6%/層，PROG-2-1998）');

    suite.test('倍率：0 層 1、每層 +0.06、5 層封頂 1.3', () => {
        assert.equals(1, tallyInfusionStatMultiplier(0));
        assert.equals(1, tallyInfusionStatMultiplier(undefined));
        assert.isTrue(Math.abs(tallyInfusionStatMultiplier(3) - 1.18) < 1e-9);
        assert.isTrue(Math.abs(tallyInfusionStatMultiplier(5) - 1.3) < 1e-9);
        assert.isTrue(Math.abs(tallyInfusionStatMultiplier(9) - 1.3) < 1e-9, '超過 5 層不再增加');
    });

    suite.test('層級夾 0~5；負數、NaN、小數處理', () => {
        assert.equals(0, clampTallyInfusionLevel(-2));
        assert.equals(0, clampTallyInfusionLevel(Number.NaN));
        assert.equals(2, clampTallyInfusionLevel(2.9));
        assert.equals(5, clampTallyInfusionLevel(99));
    });

    suite.test('tallyBattleInfoOf：預設層級 0，可帶入層級', () => {
        assert.equals(0, tallyBattleInfoOf(card(2)).infusionLevel);
        assert.equals(4, tallyBattleInfoOf(card(2), 4).infusionLevel);
    });

    suite.test('戰場：星級倍率 × 灌注倍率；沒帶層級與舊行為相同', () => {
        const base = deployWith(undefined, 3);
        assert.isTrue(Math.abs(base - starStatMultiplier(3)) < 1e-9, '沒帶層級＝只有星級倍率');
        const infused = deployWith(3, 3);
        assert.isTrue(Math.abs(infused - starStatMultiplier(3) * 1.18) < 1e-9, '3 層灌注＝星級 × 1.18');
        const capped = deployWith(8, 2);
        assert.isTrue(Math.abs(capped - starStatMultiplier(2) * 1.3) < 1e-9, '層級 8 夾到 5 層 × 1.3');
    });

    return suite;
}
