/**
 * WhiteGeneWeatherImmunity — 白色因子極端天候免疫（doc_spec_0324；PROG-2-2001）
 */
import { assert, TestSuite } from './TestRunner';
import {
    resolveWeatherForArmy, WEATHER_PENALTIES, wolfFeralAttackBonus,
} from '../assets/scripts/core/systems/WhiteGeneWeatherImmunity';

export function createWhiteGeneWeatherImmunitySuite(): TestSuite {
    const suite = new TestSuite('WhiteGeneWeatherImmunity (白色因子天候免疫 doc_spec_0324 PROG-2-2001)');

    suite.test('四大天候懲罰矩陣；晴天無懲罰', () => {
        assert.isTrue(WEATHER_PENALTIES.heavyRain.fireDisabled);
        assert.equals(-2, WEATHER_PENALTIES.snowstorm.cavalryMove);
        assert.equals(1, WEATHER_PENALTIES.denseFog.visionCap);
        const r = resolveWeatherForArmy('clear', ['gene_rain_master'], []);
        assert.equals('none', r.immunity);
        assert.equals(0, r.buff.attack);
    });

    suite.test('主將免疫歸零並給 Buff；副將減半', () => {
        const snow = resolveWeatherForArmy('snowstorm', ['gene_snow_endure'], []);
        assert.equals('main', snow.immunity);
        assert.equals(0, snow.penalty.frostbiteTroopLossRate);
        assert.equals(0.2, snow.buff.defense);
        const fog = resolveWeatherForArmy('denseFog', ['gene_fog_seer'], []);
        assert.equals(3, fog.penalty.visionCap);
        assert.equals(0, fog.penalty.hitRate);
        const dep = resolveWeatherForArmy('snowstorm', [], ['gene_snow_endure']);
        assert.equals('deputy', dep.immunity);
        assert.equals(0.025, dep.penalty.frostbiteTroopLossRate);
        assert.equals(-1, dep.penalty.cavalryMove);
        const none = resolveWeatherForArmy('heavyRain', ['gene_fog_seer'], []);
        assert.isTrue(none.penalty.fireDisabled);
    });

    suite.test('狼性狂化：免疫士氣衰減；兵力每降 20% 攻擊 +10%', () => {
        assert.equals(0, resolveWeatherForArmy('snowstorm', ['gene_wolf_feral'], []).penalty.moraleDecay);
        assert.equals(0, wolfFeralAttackBonus(1000, 1000));
        assert.equals(0.3, wolfFeralAttackBonus(400, 1000));
        assert.equals(0.5, wolfFeralAttackBonus(0, 1000));
    });

    return suite;
}
