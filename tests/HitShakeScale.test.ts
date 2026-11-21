/**
 * HitShakeScale — 受擊抖動／後退的格寬基準（PROG-2-9482）
 *
 * 覆蓋：量格寬的相鄰排不可跑出棋盤；最後一排改量往內一排，幅度才不會放大 4 倍。
 *
 * Unity 對照：EditMode 測試邊界格的取樣索引不越界。
 */
import { assert, TestSuite } from './TestRunner';
import { hitScaleNeighborDepth, BATTLE_VISUAL_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';

export function createHitShakeScaleSuite(): TestSuite {
    const suite = new TestSuite('HitShakeScale (受擊幅度格寬基準 PROG-2-9482)');

    suite.test('一般排量往後一排', () => {
        assert.equals(1, hitScaleNeighborDepth(0, 8));
        assert.equals(4, hitScaleNeighborDepth(3, 8));
        assert.equals(7, hitScaleNeighborDepth(6, 8));
    });

    suite.test('最後一排（敵方出兵排）改量往內一排，不跑出棋盤', () => {
        const last = GAME_CONFIG.GRID_DEPTH - 1;
        const n = hitScaleNeighborDepth(last, GAME_CONFIG.GRID_DEPTH);
        assert.equals(last - 1, n);
        assert.isTrue(n >= 0 && n < GAME_CONFIG.GRID_DEPTH, '相鄰排必須在棋盤內');
    });

    suite.test('每一排的相鄰排都在棋盤內', () => {
        for (let d = 0; d < GAME_CONFIG.GRID_DEPTH; d += 1) {
            const n = hitScaleNeighborDepth(d, GAME_CONFIG.GRID_DEPTH);
            assert.isTrue(n >= 0 && n < GAME_CONFIG.GRID_DEPTH && n !== d, `depth ${d} → ${n}`);
        }
    });

    suite.test('單排棋盤不越界', () => {
        assert.equals(0, hitScaleNeighborDepth(0, 1));
    });

    suite.test('後退距離＝格寬 12%，抖動＝格寬 5%（比例不變，只修基準）', () => {
        assert.equals(0.12, BATTLE_VISUAL_TIMING.hitRecoilRatio);
        assert.equals(0.05, BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio);
    });

    return suite;
}
