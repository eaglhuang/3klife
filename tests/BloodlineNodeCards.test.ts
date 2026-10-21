/**
 * BloodlineNodeCards.test.ts — 血統樹 14 位先祖節點卡映射（PROG-2-1028，BUI-02）
 *
 * 鎖住：固定 14 張且順序與排數 8/4/2 符合規格；缺資料留空卡不拋例外；
 * 只有父母掛真立繪；因子星數正規化；輸出與來源資料不共用參考。
 */
import { TestSuite, assert } from './TestRunner';
import { PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import {
    NODE_CARD_ICON,
    buildNodeCards,
    type AncestorSource,
    type NodeCardView,
} from '../assets/scripts/core/systems/BloodlineNodeCards';

function source(name: string, overrides: Partial<AncestorSource> = {}): AncestorSource {
    return {
        name,
        location: '幽州',
        factorStars: 3,
        portraitPath: 'portrait/' + name,
        stats: { force: 4, command: 2 },
        genes: [{ label: '戰法種子', colorCode: 'rarityGreen' }],
        tags: ['義'],
        ...overrides,
    };
}

function cardAt(cards: NodeCardView[], slot: string): NodeCardView {
    const found = cards.find((card) => card.slot === slot);
    if (!found) throw new Error('缺少卡片 ' + slot);
    return found;
}

export function createBloodlineNodeCardsSuite(): TestSuite {
    const suite = new TestSuite('BloodlineNodeCards (血統樹節點卡 PROG-2-1028)');

    suite.test('固定產出 14 張卡，順序與 PEDIGREE_SLOTS 一致，排數為 8/4/2', () => {
        const cards = buildNodeCards({});
        assert.equals(14, cards.length);
        assert.equals(PEDIGREE_SLOTS.join(','), cards.map((card) => card.slot).join(','));
        assert.equals(8, cards.filter((card) => card.row === 1).length);
        assert.equals(4, cards.filter((card) => card.row === 2).length);
        assert.equals(2, cards.filter((card) => card.row === 3).length);
        assert.equals(1, cardAt(cards, 'FFF').row);
        assert.equals(3, cardAt(cards, 'M').row);
    });

    suite.test('缺來源或名稱為空時回傳 empty 卡，不拋例外', () => {
        const cards = buildNodeCards({ F: source('父'), FF: null, MM: source('   ') });
        assert.isTrue(cardAt(cards, 'FF').empty);
        assert.isTrue(cardAt(cards, 'MM').empty);
        assert.isFalse(cardAt(cards, 'F').empty);
        assert.isTrue(cardAt(cards, 'FMF').empty);
    });

    suite.test('只有父母掛真立繪，其餘先祖用共用 icon', () => {
        const cards = buildNodeCards({ F: source('父'), FF: source('祖父') });
        const father = cardAt(cards, 'F');
        const grandfather = cardAt(cards, 'FF');
        if (father.empty || grandfather.empty) throw new Error('應有資料');
        assert.equals('SPRITE', father.portrait.kind);
        assert.equals('ICON', grandfather.portrait.kind);
        if (grandfather.portrait.kind === 'ICON') assert.equals(NODE_CARD_ICON, grandfather.portrait.key);
    });

    suite.test('父母缺 portraitPath 時也退回共用 icon', () => {
        const cards = buildNodeCards({ M: source('母', { portraitPath: null }) });
        const mother = cardAt(cards, 'M');
        if (mother.empty) throw new Error('應有資料');
        assert.equals('ICON', mother.portrait.kind);
    });

    suite.test('因子星數負數、NaN 為 0，小數無條件捨去', () => {
        const cards = buildNodeCards({
            F: source('a', { factorStars: -2 }),
            M: source('b', { factorStars: Number.NaN }),
            FF: source('c', { factorStars: 4.9 }),
        });
        const values = ['F', 'M', 'FF'].map((slot) => {
            const card = cardAt(cards, slot);
            return card.empty ? -1 : card.factorStars;
        });
        assert.equals('0,0,4', values.join(','));
    });

    suite.test('輸出複製來源資料，改動輸出不影響來源', () => {
        const src = source('父');
        const cards = buildNodeCards({ F: src });
        const father = cardAt(cards, 'F');
        if (father.empty) throw new Error('應有資料');
        father.genes[0].label = '被改';
        father.tags.push('被加');
        father.stats.force = 99;
        assert.equals('戰法種子', src.genes[0].label);
        assert.equals(1, src.tags.length);
        assert.equals(4, src.stats.force);
    });

    return suite;
}
