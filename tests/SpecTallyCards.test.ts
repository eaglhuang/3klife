/**
 * 規格表虎符卡模板（PROG-2-1592）headless 測試
 *
 * 覆蓋：規格表 34 張虎符都能在目錄查到（2 張與手寫卡同名不重複）；兵種、品質取規格欄；
 * demo 預設卡組（目錄前幾張）不變。
 */
import { TestSuite, assert } from './TestRunner';
import { buildTallyCardCatalog, SPEC_TALLY_TROOP_TYPE } from '../assets/scripts/core/config/TallyCardCatalog';
import { TIGER_TALLY_SPEC_TACTICS } from '../assets/scripts/core/config/TigerTallySpecTactics';
import { TroopType } from '../assets/scripts/core/config/Constants';

export function createSpecTallyCardsSuite(): TestSuite {
    const suite = new TestSuite('SpecTallyCards (規格表虎符卡模板 PROG-2-1592)');

    suite.test('規格表 34 張虎符：32 張新卡＋2 張沿用手寫卡', () => {
        const catalog = buildTallyCardCatalog();
        assert.equals(6 + 32, catalog.size);
        const missing = TIGER_TALLY_SPEC_TACTICS.filter((s) => !catalog.has(s.tacticId)).map((s) => s.tacticId).sort();
        assert.equals('tiger-tally-bai-ma-yi-cong,tiger-tally-xiao-ji-fu', missing.join(','));
    });

    suite.test('龍膽符：騎兵、SSR、名將專屬', () => {
        const card = buildTallyCardCatalog().get('tiger-tally-long-dan');
        assert.equals(TroopType.Cavalry, card?.unitType);
        assert.equals('SSR', card?.rarityLabel);
        assert.equals('名將專屬虎符', card?.source?.sourceType);
        assert.equals('七進七出', card?.abilities?.[0]);
    });

    suite.test('工甲符是工兵、麒麟符是長槍兵、吳國是水軍', () => {
        assert.equals(TroopType.Engineer, SPEC_TALLY_TROOP_TYPE['tiger-tally-gong-jia-fu']);
        assert.equals(TroopType.Pikeman, SPEC_TALLY_TROOP_TYPE['tiger-tally-qi-lin-fu']);
        assert.equals(TroopType.Navy, SPEC_TALLY_TROOP_TYPE['tiger-tally-wu-guo']);
    });

    suite.test('手寫卡維持在目錄最前面', () => {
        const ids = Array.from(buildTallyCardCatalog().keys()).slice(0, 4);
        assert.equals('tiger-tally-cavalry-shock', ids[0]);
    });

    return suite;
}
