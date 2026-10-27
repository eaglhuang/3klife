/**
 * MercenaryIllustration.test.ts — 傭兵插畫五階段（MERC-08 / PROG-2-0968，RET-01 / PROG-2-1400）
 *
 * 鎖住：規格解鎖表（1 場戰鬥、戰勝 3 場、好感 ≥ 40、轉永久）、各階段邊界、插畫階段只進不退。
 *
 * Unity 對照：Animator 狀態機的 EditMode 測試，只驗各條 Transition 的條件。
 */
import { assert, TestSuite } from './TestRunner';
import {
    advanceIllustrationStage,
    illustrationStageOf,
    IllustrationProgress,
    ILLUSTRATION_AFFECTION_FOR_STAGE_4,
    ILLUSTRATION_BATTLES_FOR_STAGE_2,
    ILLUSTRATION_BOND_MAX,
    ILLUSTRATION_WINS_FOR_STAGE_3,
} from '../assets/scripts/core/systems/MercenaryIllustration';

const NEW: IllustrationProgress = { battles: 0, wins: 0, affection: 0, bonded: false };

function progress(patch: Partial<IllustrationProgress>): IllustrationProgress {
    return { ...NEW, ...patch };
}

export function createMercenaryIllustrationSuite(): TestSuite {
    const suite = new TestSuite('MercenaryIllustration (傭兵插畫 MERC-08 / RET-01)');

    suite.test('規格門檻常數與留存系統 §F 一致', () => {
        assert.equals(1, ILLUSTRATION_BATTLES_FOR_STAGE_2);
        assert.equals(3, ILLUSTRATION_WINS_FOR_STAGE_3);
        assert.equals(40, ILLUSTRATION_AFFECTION_FOR_STAGE_4);
        assert.equals(60, ILLUSTRATION_BOND_MAX);
    });

    suite.test('新傭兵只有階段 1（見面）', () => {
        assert.equals(1, illustrationStageOf(NEW));
    });

    suite.test('階段 2 交手：參與 1 場戰鬥即達成，0 場不達成', () => {
        assert.equals(2, illustrationStageOf(progress({ battles: 1 })));
        assert.equals(1, illustrationStageOf(progress({ battles: 0, wins: 0 })));
    });

    suite.test('階段 3 認同：戰勝 3 場達成，2 場不達成', () => {
        assert.equals(3, illustrationStageOf(progress({ battles: 3, wins: 3 })));
        assert.equals(2, illustrationStageOf(progress({ battles: 3, wins: 2 })));
    });

    suite.test('階段 4 信任：好感 ≥ 40 達成，39 不達成', () => {
        assert.equals(4, illustrationStageOf(progress({ affection: 40 })));
        assert.equals(1, illustrationStageOf(progress({ affection: 39 })));
    });

    suite.test('階段 5 結義：轉為永久即達成，最高到 5', () => {
        assert.equals(5, illustrationStageOf(progress({ bonded: true })));
        assert.equals(5, illustrationStageOf(progress({ bonded: true, affection: ILLUSTRATION_BOND_MAX, wins: 9, battles: 9 })));
    });

    suite.test('好感高但沒有戰鬥，仍直接取得階段 4（各階段條件獨立）', () => {
        assert.equals(4, illustrationStageOf(progress({ affection: 60 })));
    });

    suite.test('異常值：戰鬥數為 NaN 時不達成階段 2', () => {
        assert.equals(1, illustrationStageOf(progress({ battles: Number.NaN })));
    });

    suite.test('插畫階段只進不退：既有階段保留較大值', () => {
        assert.equals(4, advanceIllustrationStage(4, NEW));
        assert.equals(3, advanceIllustrationStage(1, progress({ battles: 3, wins: 3 })));
        assert.equals(1, advanceIllustrationStage(Number.NaN, NEW));
        assert.equals(5, advanceIllustrationStage(9, NEW));
    });

    return suite;
}
