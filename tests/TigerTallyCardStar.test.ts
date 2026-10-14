/**
 * TigerTallyCardStar — 卡片實例上的星級與戰鬥經驗（TRP-10 接線，PROG-2-0571）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { applyBattleExpToCard, readCardStarState, tallyBattleOutcome } from '../assets/scripts/core/systems/TigerTallyStar';
import { normalizeTallyCardsMap } from '../assets/scripts/core/services/PlayerSaveService';

export function createTigerTallyCardStarSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyCardStar (卡片實例星級 TRP-10 接線)');

    suite.test('舊存檔缺欄位時讀回 1★ / 0 經驗', () => {
        const state = readCardStarState({ quality: 'SSR' });
        assert.equals(1, state.star);
        assert.equals(0, state.exp);
    });

    suite.test('星級超出 1~5 夾回範圍，經驗為負或非有限值時回 0', () => {
        assert.equals(5, readCardStarState({ quality: 'UR', stars: 9 }).star);
        assert.equals(1, readCardStarState({ quality: 'UR', stars: 0 }).star);
        assert.equals(0, readCardStarState({ quality: 'UR', battleExp: -5 }).exp);
        assert.equals(0, readCardStarState({ quality: 'UR', battleExp: Number.NaN }).exp);
    });

    suite.test('戰鬥勝利經驗寫回卡片實例，累積到門檻升星', () => {
        const next = applyBattleExpToCard({ quality: 'SSR', stars: 1, battleExp: 90 }, 'win');
        assert.equals(2, next.stars);
        assert.equals(105, next.battleExp);
    });

    suite.test('R 虎符即使經驗夠也不超過 3★', () => {
        const next = applyBattleExpToCard({ quality: 'R', stars: 3, battleExp: 340 }, 'win');
        assert.equals(3, next.stars);
    });

    suite.test('normalizeTallyCardsMap 會補上缺少的星級欄位', () => {
        const map = normalizeTallyCardsMap({
            t1: { uid: 't1', templateId: 'TROOP_X', sourceGeneralUid: 'g', quality: 'SR', score: 1, source: 'death', producedSeason: 1 },
        });
        assert.equals(1, map.t1.stars ?? 0);
        assert.equals(0, map.t1.battleExp ?? -1);
    });

    suite.test('讀回時 R 虎符即使存檔是 5★ 也夾回 3★（QA 複查：品質封頂）', () => {
        assert.equals(3, readCardStarState({ quality: 'R', stars: 5 }).star);
        assert.equals(4, readCardStarState({ quality: 'SR', stars: 5 }).star);
        assert.equals(5, readCardStarState({ quality: 'SSR', stars: 5 }).star);
    });

    suite.test('戰場結果轉虎符經驗結果：勝、敗、平對應，進行中不結算', () => {
        assert.equals('win', tallyBattleOutcome('player-win') ?? '');
        assert.equals('lose', tallyBattleOutcome('enemy-win') ?? '');
        assert.equals('draw', tallyBattleOutcome('draw') ?? '');
        assert.isTrue(tallyBattleOutcome('ongoing') === null);
    });

    return suite;
}
