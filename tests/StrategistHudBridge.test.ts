/**
 * StrategistHudBridge — 軍師 HUD 事件驅動與迷霧隔離（doc_spec_0352；PROG-2-2038）
 */
import { assert, TestSuite } from './TestRunner';
import { StrategistHudBridge, filterHudVisibleUnits, type StrategistHudState } from '../assets/scripts/battle/shared/StrategistHudBridge';

export function createStrategistHudBridgeSuite(): TestSuite {
    const suite = new TestSuite('StrategistHudBridge (軍師 HUD doc_spec_0352 PROG-2-2038)');

    suite.test('§3 事件才更新，只送有變動的欄位，相同內容不重送', () => {
        const bridge = new StrategistHudBridge();
        const patches: Partial<StrategistHudState>[] = [];
        const off = bridge.subscribe((p) => patches.push(p));
        bridge.onTileStateChanged([{ tag: 'hazard_fire', label: '火海延燒 3格', turnsLeft: 2 }]);
        bridge.onTileStateChanged([{ tag: 'hazard_fire', label: '火海延燒 3格', turnsLeft: 2 }]);
        bridge.onObjectChanged('敵糧倉', 45.4, 'Damaged');
        bridge.onObjectChanged('敵糧倉', 45, 'Damaged');
        assert.equals(2, patches.length);
        assert.equals('themeHazards', Object.keys(patches[0]).join(','));
        assert.equals(45, patches[1].interactiveObjects![0].hpPercent);
        off();
        bridge.onLoadoutGapsChanged(['缺少水戰適性部隊']);
        assert.equals(2, patches.length);
        assert.equals('缺少水戰適性部隊', bridge.snapshot().loadoutGaps[0]);
    });

    suite.test('§2 隱匿中的敵軍不進 HUD', () => {
        const visible = filterHudVisibleUnits([
            { unitId: 'e1', isEnemy: true, concealed: true, x: 3, y: 4, hp: 900, troop: 'cavalry' },
            { unitId: 'e2', isEnemy: true, concealed: false },
            { unitId: 'p1', isEnemy: false, concealed: true },
        ]);
        assert.equals('e2,p1', visible.map((u) => u.unitId).join(','));
        assert.isFalse(JSON.stringify(visible).includes('cavalry'));
    });

    suite.test('§4-3 戰後打撈與 HUD 累計一致', () => {
        const bridge = new StrategistHudBridge();
        bridge.onSalvageGained({ stone: 200 });
        bridge.onSalvageGained({ grain: 450, wood: -5 });
        const report = bridge.salvageForReport();
        assert.equals(JSON.stringify(bridge.snapshot().accumulatedSalvage), JSON.stringify(report));
        assert.equals(200, report.stone);
        assert.equals(450, report.grain);
        assert.equals(0, report.wood);
    });

    return suite;
}
