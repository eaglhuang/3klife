/** PROG-2-0038：純 headless 虎符品質、名將死亡、招降與封賞測試。 */
import { TestSuite, assert } from './TestRunner';
import type { TigerTallyCard, TigerTallyQuality } from '../assets/scripts/core/models/TigerTallyCard';
import {
    awardTopTally, getTigerTallyScore, isTallyEligible, produceDeathTally,
    resolveTallyQuality, transferSurrenderTally,
} from '../assets/scripts/core/systems/TigerTally';

function makeCard(uid: string, quality: TigerTallyQuality, score: number): TigerTallyCard {
    return { uid, templateId: 'formal-template', sourceGeneralUid: 'general-1',
        quality, score, source: 'death', producedSeason: 4 };
}

export function createTigerTallySuite(): TestSuite {
    const suite = new TestSuite('TigerTally (虎符品質 / 死亡 / 招降 / 封賞)');
    const boundaries: Array<[number, TigerTallyQuality]> = [
        [39, 'R'], [40, 'SR'], [64, 'SR'], [65, 'SSR'], [84, 'SSR'], [85, 'UR'],
    ];
    for (const [score, quality] of boundaries) {
        suite.test(`品質邊界 ${score} → ${quality}`, () => assert.equals(quality, resolveTallyQuality(score)));
    }
    suite.test('戰績與傳承權重為 70 / 30', () => {
        assert.equals(70, getTigerTallyScore(100, 0));
        assert.equals(30, getTigerTallyScore(0, 100));
    });
    suite.test('每個輸入先夾住，不能讓超標戰績抵消負傳承', () => {
        assert.equals(70, getTigerTallyScore(200, -100));
        assert.equals(30, getTigerTallyScore(-100, 200));
        assert.equals(100, getTigerTallyScore(200, 200));
        assert.equals(0, getTigerTallyScore(-20, -10));
    });
    suite.test('加權後才四捨五入，無效分數保守處理', () => {
        assert.equals(40, getTigerTallyScore(39.5, 39.5));
        assert.equals(30, getTigerTallyScore(Number.NaN, 100));
        assert.equals(70, getTigerTallyScore(Infinity, -Infinity));
        assert.equals('R', resolveTallyQuality(Number.NaN));
    });
    suite.test('一般子嗣、只有分類或模板的非名將不產卡', () => {
        assert.equals(null, produceDeathTally({ id: 'child', characterCategory: 'general' }, 100, 100, 4));
        assert.isFalse(isTallyEligible({ id: 'unknown', templateId: 'template', characterCategory: 'famed' }));
    });
    suite.test('史實名將死亡產卡，來源 UID 與模板 ID 分開', () => {
        const card = produceDeathTally({ id: 'instance-1', uid: 'owned-1', templateId: 'cao-cao',
            isHistorical: true, troopType: 'CAVALRY' }, 100, 50, 4);
        assert.isTrue(card !== null);
        if (!card) return;
        assert.equals('cao-cao', card.templateId);
        assert.equals('owned-1', card.sourceGeneralUid);
        assert.equals(85, card.score);
        assert.equals('UR', card.quality);
        assert.equals('death', card.source);
        assert.equals(4, card.producedSeason);
        assert.equals('CAVALRY', card.troopType);
    });
    suite.test('史實名將沒有獨立模板時保留既有 id 契約', () => {
        const card = produceDeathTally({ id: 'guan-yu', isHistorical: true }, 0, 0, 0);
        assert.equals('guan-yu', card?.templateId);
        assert.equals('guan-yu', card?.sourceGeneralUid);
        assert.isFalse(Object.prototype.hasOwnProperty.call(card, 'troopType'));
    });
    suite.test('女性名將須同時有正式模板與名將分類', () => {
        const female = { id: 'female-1', gender: '女', characterCategory: 'famed', templateId: 'diao-chan' };
        assert.isTrue(isTallyEligible(female));
        assert.equals('death', produceDeathTally(female, 40, 40, 4)?.source);
        assert.isTrue(isTallyEligible({ ...female, gender: 'female' }));
        assert.isFalse(isTallyEligible({ ...female, templateId: ' ' }));
        assert.isFalse(isTallyEligible({ ...female, characterCategory: 'other' }));
        assert.isFalse(isTallyEligible({ ...female, gender: '男' }));
    });
    suite.test('正式史實旗標優先於平民分類，空白身分仍不得取得虎符', () => {
        assert.isTrue(isTallyEligible({ id: 'civilian', characterCategory: 'civilian', isHistorical: true }));
        assert.isFalse(isTallyEligible({ id: ' ', isHistorical: true }));
    });
    suite.test('死亡重試 UID 穩定，不同季節死亡 UID 不同', () => {
        const general = Object.freeze({ id: 'cao-cao', isHistorical: true });
        const first = produceDeathTally(general, 65, 65, 4);
        assert.equals(first?.uid, produceDeathTally(general, 65, 65, 4)?.uid);
        assert.notEquals(first?.uid, produceDeathTally(general, 65, 65, 5)?.uid);
    });
    suite.test('招降同季或較早季節不移交', () => {
        const card = makeCard('tally', 'SSR', 70);
        assert.equals(null, transferSurrenderTally(card, 4, 4));
        assert.equals(null, transferSurrenderTally(card, 4, 3));
    });
    suite.test('隔季與之後可移交，保留 UID、原產出季節與原卡', () => {
        const card = Object.freeze(makeCard('tally', 'SSR', 70));
        const transferred = transferSurrenderTally(card, 4, 5);
        assert.equals('surrender', transferred?.source);
        assert.equals('tally', transferred?.uid);
        assert.equals(4, transferred?.producedSeason);
        assert.equals(70, transferred?.score);
        assert.equals('death', card.source);
        assert.isTrue(transferred !== card);
        assert.equals('surrender', transferSurrenderTally(card, 4, 8)?.source);
    });
    suite.test('封賞只在勝利且無退路時成立', () => {
        const cards = [makeCard('tally', 'UR', 90)];
        assert.equals(null, awardTopTally(cards, false, true));
        assert.equals(null, awardTopTally(cards, true, false));
        assert.equals(null, awardTopTally(cards, false, false));
        assert.equals('reward', awardTopTally(cards, true, true)?.source);
    });
    suite.test('封賞品質優先於分數，同品質取最高分', () => {
        const cards = [makeCard('ssr', 'SSR', 100), makeCard('ur-low', 'UR', 85), makeCard('ur-high', 'UR', 90)];
        assert.equals('ur-high', awardTopTally(cards, true, true)?.uid);
        assert.equals(90, awardTopTally(cards, true, true)?.score);
    });
    suite.test('封賞品質順序完整，完全同分保持輸入順序', () => {
        assert.equals('sr', awardTopTally([makeCard('r', 'R', 100), makeCard('sr', 'SR', 40)], true, true)?.uid);
        assert.equals('ssr', awardTopTally([makeCard('sr', 'SR', 100), makeCard('ssr', 'SSR', 65)], true, true)?.uid);
        assert.equals('first', awardTopTally([makeCard('first', 'UR', 90), makeCard('second', 'UR', 90)], true, true)?.uid);
    });
    suite.test('封賞不變動清單與原卡，保留原始產出資料', () => {
        const card = Object.freeze(makeCard('tally', 'UR', 90));
        const cards = Object.freeze([card]);
        const reward = awardTopTally(cards, true, true);
        assert.equals('death', card.source);
        assert.equals(4, reward?.producedSeason);
        assert.equals('general-1', reward?.sourceGeneralUid);
        assert.isTrue(reward !== card);
        assert.equals(card, cards[0]);
    });
    suite.test('空清單不產生封賞', () => assert.equals(null, awardTopTally([], true, true)));
    return suite;
}
