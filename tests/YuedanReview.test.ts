import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { isYuedanCandidate, yuedanBannerLines, yuedanFactors, yuedanFiltered, yuedanHealthTier, yuedanList, yuedanRevealLine } from '../assets/scripts/core/systems/YuedanReview';

const general = (id: string, ep: number, extra: Record<string, unknown> = {}): GeneralConfig => ({ id, name: id, age: 25, ep, ...extra } as unknown as GeneralConfig);
const dictionary = buildFactorDictionary([
    { id: 'gene_a', displayName: '神速', color: 'blue' },
    { id: 'gene_b', displayName: '勇烈', color: 'red' },
    { id: 'gene_c', displayName: '軍略', color: 'blue' },
    { id: 'gene_g', displayName: '戰法', color: 'green' },
] as never);

export function createYuedanReviewSuite(): TestSuite {
    const suite = new TestSuite('YuedanReview');

    suite.test('適齡未婚才入選：已故、未滿 20 歲、教官卡、有親傳紀錄都不算', () => {
        assert.isTrue(isYuedanCandidate(general('a', 50)));
        assert.isFalse(isYuedanCandidate(general('a', 50, { status: 'dead' })));
        assert.isFalse(isYuedanCandidate(general('a', 50, { age: 19 })));
        assert.isFalse(isYuedanCandidate(general('a', 50, { isMentorCard: true })));
        assert.isFalse(isYuedanCandidate(general('a', 50, { breedingCount: 1 })));
    });

    suite.test('取前 20%，EP 高者在前，至少 1 位，名冊順序不影響結果', () => {
        const ten = Array.from({ length: 10 }, (_, i) => general(`g${i}`, i * 10));
        assert.equals('g9,g8', yuedanList(ten).map((g) => g.id).join(','));
        assert.equals('g9,g8', yuedanList([...ten].reverse()).map((g) => g.id).join(','));
        assert.equals('solo', yuedanList([general('solo', 1)]).map((g) => g.id).join(','));
        assert.lengthEquals(0, yuedanList([general('kid', 90, { age: 10 })]));
    });

    suite.test('因子只揭露 3★ 以上的藍紅色，最多 2 項，星高者在前', () => {
        const g = general('a', 80, { genes: [{ id: 'gene_a', level: 3 }, { id: 'gene_b', level: 5 }, { id: 'gene_c', level: 4 }, { id: 'gene_g', level: 5 }] });
        assert.equals('勇烈 5★,軍略 4★', yuedanFactors(g, dictionary).join(','));
        assert.lengthEquals(0, yuedanFactors(general('b', 80, { genes: [{ id: 'gene_a', level: 2 }] }), dictionary));
    });

    suite.test('沒有 3★ 因子時不編造，只說榜上有名；健康檔位看精力比例', () => {
        assert.equals('月旦評：榜上有名｜康健', yuedanRevealLine(general('a', 80, { vitality: 80, maxVitality: 100 }), dictionary));
        assert.equals('尋常', yuedanHealthTier(general('a', 80, { vitality: 40, maxVitality: 100 })));
        assert.equals('孱弱', yuedanHealthTier(general('a', 80, { vitality: 10, maxVitality: 100 })));
    });

    suite.test('放榜句列榜首兩位與總數；榜上沒人時不放榜', () => {
        const ten = Array.from({ length: 10 }, (_, i) => general(`g${i}`, i * 10, { int: 90 }));
        const lines = yuedanBannerLines(ten);
        assert.lengthEquals(2, lines);
        assert.isTrue(lines[0].indexOf('g9【才思絕倫】、g8【才思絕倫】') >= 0);
        assert.isTrue(lines[1].indexOf('當代 2 位') >= 0);
        assert.isTrue(lines[1].indexOf('可於說親名冊中直接篩選') >= 0);
        assert.lengthEquals(0, yuedanBannerLines([general('kid', 90, { age: 10 })]));
    });

    suite.test('篩選只留榜上的人；榜上沒人時保留原清單', () => {
        const list = [general('a', 50), general('b', 60)];
        assert.equals('b', yuedanFiltered(list, ['b', 'other']).map((g) => g.id).join());
        assert.equals('a,b', yuedanFiltered(list, ['other']).map((g) => g.id).join());
    });

    return suite;
}
