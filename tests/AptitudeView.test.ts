/**
 * AptitudeView.test.ts — 人物頁「兵」頁的適性列與兵頁子面板（TSK-05 / PROG-2-1449）
 *
 * 鎖住：只列武將有的兵種、順序固定；等級 S～D 對應規格倍率（沿用 BATTLE_POWER_CONSTANTS）；
 * 非法等級顯示「—」；地形與天氣各 6 列且無資料；虎符槽預設「未裝備」；
 * CharacterDs3AptitudeChild 收到武將資料後更新 view（子面板是這份 view model 的呼叫端）。
 *
 * Unity 對照：Aptitude 頁的 Presenter，資料缺的欄位留空格，不猜值。
 */
import { assert, TestSuite } from './TestRunner';
import type { Node } from 'cc';
import type { UISkinResolver } from '../assets/scripts/ui/core/UISkinResolver';
import type { UITemplateBinder } from '../assets/scripts/ui/core/UITemplateBinder';
import {
    aptitudeEfficiencyText, aptitudeGradeOf, buildAptitudeView, TALLY_UNEQUIPPED_TEXT,
} from '../assets/scripts/core/systems/AptitudeView';
import { CharacterDs3AptitudeChild } from '../assets/scripts/ui/components/character-ds3/CharacterDs3AptitudeChild';

export function createAptitudeViewSuite(): TestSuite {
    const suite = new TestSuite('AptitudeView (兵頁適性 TSK-05 PROG-2-1449)');

    suite.test('兵種列只取武將有的兵種，順序固定為 AI_TROOP_CODES 的順序', () => {
        const view = buildAptitudeView({ NAVY: 'C', CAVALRY: 'S', ARCHER: 'B' });
        assert.equals('騎兵,弓兵,水軍', view.troopRows.map((r) => r.label).join(','));
        assert.equals('S,B,C', view.troopRows.map((r) => r.grade).join(','));
    });

    suite.test('等級對應規格倍率：S×1.20、A×1.10、B×1.00、C×0.90、D×0.80', () => {
        const view = buildAptitudeView({ CAVALRY: 'S', INFANTRY: 'A', ARCHER: 'B', SIEGE: 'C', NAVY: 'D' });
        assert.equals('×1.20,×1.10,×1.00,×0.90,×0.80', view.troopRows.map((r) => r.efficiencyText).join(','));
        assert.equals('×1.20', aptitudeEfficiencyText('S'));
    });

    suite.test('非法等級（非 S～D、非字串）顯示「—」，不猜值', () => {
        const view = buildAptitudeView({ CAVALRY: 'X', INFANTRY: 3, ARCHER: 'a' });
        assert.equals('—,—,—', view.troopRows.map((r) => r.efficiencyText).join(','));
        assert.isTrue(aptitudeGradeOf('X') === null);
        assert.isTrue(aptitudeGradeOf(undefined) === null);
    });

    suite.test('沒有兵種資料時兵種列為空；地形與天氣各 6 列且都是「—」', () => {
        const view = buildAptitudeView(undefined);
        assert.equals(0, view.troopRows.length);
        assert.equals(6, view.terrainRows.length);
        assert.equals(6, view.weatherRows.length);
        assert.equals('平原,山地,水域,林地,沙漠,城池', view.terrainRows.map((r) => r.label).join(','));
        assert.equals('—,—,—,—,—,—', view.terrainRows.map((r) => r.efficiencyText).join(','));
        assert.equals('晴,雨,霧,風,夜,雷', view.weatherRows.map((r) => r.label).join(','));
    });

    suite.test('虎符槽預設「未裝備」，可由呼叫端傳入文字', () => {
        assert.equals(TALLY_UNEQUIPPED_TEXT, buildAptitudeView({}).tallyLine);
        assert.equals('止啼符（SR）', buildAptitudeView({}, '止啼符（SR）').tallyLine);
    });

    suite.test('CharacterDs3AptitudeChild 收到武將資料後更新 view（子面板為呼叫端）', () => {
        const child = new CharacterDs3AptitudeChild({} as unknown as Node, {} as unknown as UISkinResolver, {} as unknown as UITemplateBinder);
        assert.equals(0, child.view.troopRows.length);
        child.onDataUpdate({ id: 'zhang-fei', troopAptitude: { CAVALRY: 'S', ARCHER: 'D' } });
        assert.equals('騎兵,弓兵', child.view.troopRows.map((r) => r.label).join(','));
        assert.equals('×1.20,×0.80', child.view.troopRows.map((r) => r.efficiencyText).join(','));
    });

    suite.test('子面板收到非物件資料時回到空 view，不拋錯', () => {
        const child = new CharacterDs3AptitudeChild({} as unknown as Node, {} as unknown as UISkinResolver, {} as unknown as UITemplateBinder);
        child.onDataUpdate({ troopAptitude: { CAVALRY: 'S' } });
        child.onDataUpdate(null);
        assert.equals(0, child.view.troopRows.length);
    });

    return suite;
}
