/**
 * 出陣精力帶入（LIFE-10，PROG-2-0427）
 *
 * 覆蓋：名冊武將的實際精力（session 上的 vitality / maxVitality）經 buildBattleConfig
 * 帶進戰場 GeneralUnit，閘門才會依真實精力判定；缺值時仍預設滿值。
 */
import { assert, TestSuite } from './TestRunner';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { vitalityBandOf } from '../assets/scripts/core/systems/VitalityBattleGate';

/** 最小可用的名冊武將；只放出陣轉換會用到的欄位 */
function rosterGeneral(extra: Record<string, unknown>): Record<string, unknown> {
    return { id: 'roster-hero', name: '名冊武將', faction: Faction.Player, hp: 1000, str: 80, lea: 80, int: 60, pol: 60, cha: 60, luk: 50, ...extra };
}

export function createBattleDeployVitalitySuite(): TestSuite {
    const suite = new TestSuite('BattleDeployVitality (出陣精力帶入 LIFE-10)');

    suite.test('名冊精力帶進戰場：vitality 30 / maxVitality 100 出陣後仍為 30 / 100', () => {
        const config = buildBattleConfig(rosterGeneral({ vitality: 30, maxVitality: 100 }) as never, Faction.Player);
        const unit = new GeneralUnit(config);
        assert.equals(30, unit.vitality);
        assert.equals(100, unit.maxVitality);
    });

    suite.test('出陣後的區間正確：精力 30/100 為中段，不再被誤判為滿值', () => {
        const config = buildBattleConfig(rosterGeneral({ vitality: 30, maxVitality: 100 }) as never, Faction.Player);
        const unit = new GeneralUnit(config);
        assert.equals('mid', vitalityBandOf(unit.vitality, unit.maxVitality));
    });

    suite.test('名冊武將缺精力資料：出陣後預設滿值，與既有行為一致', () => {
        const config = buildBattleConfig(rosterGeneral({}) as never, Faction.Player);
        const unit = new GeneralUnit(config);
        assert.equals(100, unit.vitality);
        assert.equals(100, unit.maxVitality);
    });

    return suite;
}
