/**
 * 天氣強約束：遠程命中與遠程射程（戰場適性系統 §Weather Constraints，PROG-2-1460）headless 測試
 *
 * 覆蓋：雨 -20%／霧 -30%／夜 -25% 只扣遠程命中；近戰不受影響；夜襲場景不與夜戰疊加；
 * 大霧免疫仍必中；大風遠程射程 -2（最少 1 格），近戰射程不變。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { EVENT_NAMES, Faction, TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { weatherRangedHitDelta, weatherRangedRangeDelta } from '../assets/scripts/core/systems/WeatherTacticRestriction';

function setup(weather: Weather) {
    services().initialize();
    const general = new GeneralUnit({ id: 'g-w', name: 'g', faction: Faction.Player, hp: 1000, str: 80, lea: 80 });
    const enemyGeneral = new GeneralUnit({ id: 'e-w', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
    const ctrl = new BattleController();
    ctrl.initBattle(general, enemyGeneral, undefined, weather);
    ctrl.state.weather = weather;
    const archer = new TroopUnit('p-arc', TroopType.Archer, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 1, attackRange: 3 });
    const infantry = new TroopUnit('p-inf', TroopType.Infantry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 1, attackRange: 1 });
    const defender = new TroopUnit('e-inf', TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 30, defense: 15, moveRange: 1, attackRange: 1 });
    archer.moveTo(1, 2);
    infantry.moveTo(2, 3);
    defender.moveTo(2, 4);
    ctrl.state.addUnit(archer);
    ctrl.state.addUnit(infantry);
    ctrl.state.addUnit(defender);
    return { ctrl, archer, infantry, defender, resolver: ctrl['combatResolver'] };
}

/** 讓攻擊必定落空，回傳 UnitAttackMissed 回報的命中率；命中率 100% 不擲骰時回傳 1 */
function hitRateOf(weather: Weather, pick: 'archer' | 'infantry', nightRaid = false): number {
    const bundle = setup(weather);
    bundle.ctrl.state.sceneFlags.nightRaid = nightRaid;
    const missed: number[] = [];
    const off = services().event.on(EVENT_NAMES.UnitAttackMissed, (data?: { hitRate: number }) => { if (data) missed.push(data.hitRate); });
    bundle.resolver.hitRandom = () => 0.999;
    bundle.resolver.resolveCombat(bundle[pick], bundle.defender, services());
    off();
    return missed.length > 0 ? missed[0] : 1;
}

export function createWeatherRangedConstraintSuite(): TestSuite {
    const suite = new TestSuite('WeatherRangedConstraint (天氣強約束遠程命中／射程 PROG-2-1460)');

    suite.test('純函式：雨 -0.2、霧 -0.3、夜 -0.25、其他 0；大風射程 -2', () => {
        assert.equals(-0.2, weatherRangedHitDelta(Weather.Rain));
        assert.equals(-0.3, weatherRangedHitDelta(Weather.Fog));
        assert.equals(-0.25, weatherRangedHitDelta(Weather.Night));
        assert.equals(0, weatherRangedHitDelta(Weather.Clear));
        assert.equals(0, weatherRangedHitDelta(Weather.Windy));
        assert.equals(-2, weatherRangedRangeDelta(Weather.Windy));
        assert.equals(0, weatherRangedRangeDelta(Weather.Rain));
    });

    suite.test('遠程攻擊命中：雨 80%、霧 70%、夜 75%，晴天 100%', () => {
        assert.equals(0.8, hitRateOf(Weather.Rain, 'archer'));
        assert.equals(0.7, hitRateOf(Weather.Fog, 'archer'));
        assert.equals(0.75, hitRateOf(Weather.Night, 'archer'));
        assert.equals(1, hitRateOf(Weather.Clear, 'archer'));
    });

    suite.test('近戰攻擊不受天氣遠程命中修正', () => {
        assert.equals(1, hitRateOf(Weather.Rain, 'infantry'));
        assert.equals(1, hitRateOf(Weather.Fog, 'infantry'));
    });

    suite.test('夜襲場景已有全局 -25%：夜戰天氣不再疊加遠程 -25%', () => {
        assert.equals(1, hitRateOf(Weather.Night, 'archer', true), '只關掉天氣這一層，場景命中由行為表負責（此處未設 battleTactic）');
    });

    suite.test('大霧免疫：有免疫效果的遠程部隊仍必中', () => {
        const bundle = setup(Weather.Fog);
        bundle.archer.factorEffects = ['fog-immunity'];
        const missed: number[] = [];
        const off = services().event.on(EVENT_NAMES.UnitAttackMissed, (data?: { hitRate: number }) => { if (data) missed.push(data.hitRate); });
        bundle.resolver.hitRandom = () => 0.999;
        bundle.resolver.resolveCombat(bundle.archer, bundle.defender, services());
        off();
        assert.equals(0, missed.length);
    });

    suite.test('大風：遠程射程 3 → 1；近戰射程維持 1；晴天遠程不變', () => {
        const windy = setup(Weather.Windy);
        assert.equals(1, windy.resolver['getEffectiveAttackRange'](windy.archer));
        assert.equals(1, windy.resolver['getEffectiveAttackRange'](windy.infantry));
        const clear = setup(Weather.Clear);
        assert.equals(3, clear.resolver['getEffectiveAttackRange'](clear.archer));
    });

    return suite;
}
