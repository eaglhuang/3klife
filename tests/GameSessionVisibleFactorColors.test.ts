/**
 * GameSessionVisibleFactorColors.test.ts — 玩家層級已開放的因子色（LUK-04，PROG-2-0883）
 *
 * 檢查：新局 Lv1 只開放藍粉；與 FactorMask 的 visibleFactorColors 口徑一致。
 * 畫面端的灰階遮罩在 cc 元件（FactorHexGraphic），headless 不測，由 Codex 實機驗收。
 *
 * Unity 對照：像讀取角色等級查一張圖鑑開放表，表是純資料，畫面只拿結果去著色。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { visibleFactorColors } from '../assets/scripts/core/systems/FactorMask';

export function createGameSessionVisibleFactorColorsSuite(): TestSuite {
    const suite = new TestSuite('GameSession 可見因子色 (LUK-04)');

    suite.test('新局 Lv1：只開放藍粉', () => {
        const session = new GameSession();
        assert.equals('blue,pink', session.visibleFactorColors().join(','));
    });

    suite.test('與 FactorMask 的規則一致（同一層級同一結果）', () => {
        const session = new GameSession();
        assert.equals(visibleFactorColors(session.discoveryLevel).join(','), session.visibleFactorColors().join(','));
    });

    return suite;
}
