/**
 * ClanHeritage — 宗族家風傳承（doc_spec_0326；PROG-2-2003）
 */
import { assert, TestSuite } from './TestRunner';
import { clanHeritageBuff, eligibleClanHeritages, selectClanHeritages } from '../assets/scripts/core/systems/ClanHeritage';

export function createClanHeritageSuite(): TestSuite {
    const suite = new TestSuite('ClanHeritage (家風傳承 doc_spec_0326 PROG-2-2003)');

    suite.test('兩類標籤合計 5 個點亮；只計前 14 人', () => {
        const four = [['智謀'], ['內政'], ['智謀'], ['內政']];
        assert.equals(0, eligibleClanHeritages(four).length);
        assert.equals('scholarly', eligibleClanHeritages([...four, ['智謀', '武力']])[0]);
        const late: string[][] = [['經商'], ['經商'], ['經商'], ['經商']];
        for (let i = 0; i < 10; i++) late.push([]);
        late.push(['理財']);
        assert.equals(0, eligibleClanHeritages(late).length);
    });

    suite.test('最多啟用 2 個；未點亮不能選；稱號全取', () => {
        const s = selectClanHeritages(['scholarly', 'martial', 'loyal'], ['loyal', 'merchant', 'loyal', 'martial', 'scholarly']);
        assert.equals(2, s.activeHeritages.length);
        assert.equals('loyal', s.activeHeritages[0]);
        assert.equals('martial', s.activeHeritages[1]);
        assert.equals(3, s.unlockedTitles.length);
        assert.isTrue(s.unlockedTitles.includes('義薄雲天'));
    });

    suite.test('被動合併', () => {
        const b = clanHeritageBuff(['martial', 'merchant']);
        assert.equals(15, b.sortieMorale);
        assert.equals(0.8, b.shopPriceRate);
        assert.equals(0.15, b.seasonFoodRate);
        assert.equals(0, b.loyaltyFloor);
        assert.equals(60, clanHeritageBuff(['loyal']).loyaltyFloor);
    });

    return suite;
}
