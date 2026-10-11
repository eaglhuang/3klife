/**
 * BattleDeckLoading.test.ts — 戰場依玩家選定卡組建立虎符手牌（headless）
 *
 * Unity 對照：EditMode Test，直接呼叫 BattleHandManager.BuildInitialHand(deckIds)，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import {
    buildTallyCards,
    getDefaultTallyDeckIds,
    getTallyCardCatalogIds,
    resolveTallyDeckIds,
    TALLY_HAND_SIZE,
} from '../assets/scripts/battle/views/BattleSceneLoader';

function ids(cards: { tacticId?: string }[]): string {
    return cards.map((card) => card.tacticId).join(',');
}

export function createBattleDeckLoadingSuite(): TestSuite {
    const suite = new TestSuite('BattleDeckLoading (玩家選定卡組)');
    const catalog = getTallyCardCatalogIds();
    const defaults = getDefaultTallyDeckIds();

    suite.test('目錄至少有一張卡，預設卡組不超過手牌上限', () => {
        assert.isTrue(catalog.length > 0, '卡片目錄不應為空');
        assert.isTrue(defaults.length > 0 && defaults.length <= TALLY_HAND_SIZE, '預設卡組張數應在 1..手牌上限');
    });

    suite.test('未指定卡組時使用預設卡組', () => {
        assert.equals(defaults.join(','), ids(buildTallyCards()));
        assert.equals(defaults.join(','), ids(buildTallyCards([])));
    });

    suite.test('依玩家選定順序建立手牌', () => {
        const picked = [catalog[catalog.length - 1], catalog[0]];
        const cards = buildTallyCards(picked);
        assert.equals(picked.join(','), ids(cards));
        assert.equals(2, cards.length);
        assert.isTrue(cards.every((card) => card.isDisabled === false && card.cost > 0), '卡片應帶完整資料');
    });

    suite.test('未知 ID 會被略過，保留其他有效卡', () => {
        assert.equals(catalog[1], resolveTallyDeckIds(['no-such-card', catalog[1], '']).join(','));
    });

    suite.test('全部無效時退回預設卡組', () => {
        assert.equals(defaults.join(','), resolveTallyDeckIds(['no-such-card', 'another-missing']).join(','));
    });

    suite.test('同款卡可重複上手，且各自為獨立物件', () => {
        const cards = buildTallyCards([catalog[0], catalog[0]]);
        assert.equals(`${catalog[0]},${catalog[0]}`, ids(cards));
        cards[0].isDisabled = true;
        assert.equals(false, cards[1].isDisabled);
        assert.equals(false, buildTallyCards([catalog[0]])[0].isDisabled);
    });

    suite.test('超過手牌上限的部分截掉', () => {
        const many = Array.from({ length: TALLY_HAND_SIZE + 3 }, (_, i) => catalog[i % catalog.length]);
        assert.equals(TALLY_HAND_SIZE, buildTallyCards(many).length);
    });

    return suite;
}
