/**
 * SageFavor.test.ts — 名士好感等級與劇情解鎖（暫定，11/06 裁決 #10，PROG-2-1951）
 *
 * 鎖住：好感門檻 [100, 250, 500, 850, 1300] 對應 Lv1～Lv5；準確率每級 +1%、上限 95%；
 * 龐統以官階 3、左慈以遊戲第 5 年為劇情錨點，與占卜次數任一達成即解鎖；
 * sage-progress.json 驗證通過才覆寫，失敗不動內建值；GameSession 以官階／年份判斷名士可用。
 */
import { assert, TestSuite } from './TestRunner';
import {
    installSageProgressTable,
    isSageAvailable,
    isSageStoryUnlocked,
    nextSageFavorExp,
    sageAccuracyWithFavor,
    sageFavorLevel,
    SAGE_FAVOR_ACCURACY,
    SAGE_FAVOR_LEVEL_EXP,
    SAGE_STORY_UNLOCKS,
} from '../assets/scripts/core/systems/SageFavor';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { OFFICER_TIER_EXP_THRESHOLDS } from '../assets/scripts/core/systems/OfficerState';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/data/sage-progress.json'), 'utf8'));

/** 測試會改全域表，每次跑完還原內建值 */
function withBuiltins(run: () => void): () => void {
    return () => {
        const exp = [...SAGE_FAVOR_LEVEL_EXP];
        const acc = { ...SAGE_FAVOR_ACCURACY };
        const unlocks = { ...SAGE_STORY_UNLOCKS };
        try {
            run();
        } finally {
            SAGE_FAVOR_LEVEL_EXP.splice(0, SAGE_FAVOR_LEVEL_EXP.length, ...exp);
            Object.assign(SAGE_FAVOR_ACCURACY, acc);
            for (const key of Object.keys(SAGE_STORY_UNLOCKS)) delete (SAGE_STORY_UNLOCKS as Record<string, unknown>)[key];
            Object.assign(SAGE_STORY_UNLOCKS, unlocks);
        }
    };
}

export function createSageFavorSuite(): TestSuite {
    const suite = new TestSuite('SageFavor (名士好感與劇情解鎖 暫定 11/06 裁決 #10 PROG-2-1951)');

    suite.test('好感門檻 100／250／500／850／1300 對應 Lv1～Lv5，未滿 100 為 Lv0', () => {
        assert.equals('100,250,500,850,1300', SAGE_FAVOR_LEVEL_EXP.join(','));
        assert.equals(0, sageFavorLevel(0));
        assert.equals(0, sageFavorLevel(99));
        assert.equals(1, sageFavorLevel(100));
        assert.equals(2, sageFavorLevel(250));
        assert.equals(3, sageFavorLevel(849));
        assert.equals(4, sageFavorLevel(850));
        assert.equals(5, sageFavorLevel(1300));
        assert.equals(5, sageFavorLevel(99999));
        assert.equals(0, sageFavorLevel(-50));
        assert.equals(0, sageFavorLevel(Number.NaN));
    });

    suite.test('下一級門檻；滿級回傳 null', () => {
        assert.equals(100, nextSageFavorExp(0) ?? -1);
        assert.equals(1300, nextSageFavorExp(4) ?? -1);
        assert.isTrue(nextSageFavorExp(5) === null);
    });

    suite.test('準確率每級 +1%，上限 95%；基準已高於上限時維持基準', () => {
        assert.equals(0.85, sageAccuracyWithFavor(0.85, 0));
        assert.equals(0.88, sageAccuracyWithFavor(0.85, 3));
        assert.equals(0.9, sageAccuracyWithFavor(0.85, 5));
        assert.equals(0.9, sageAccuracyWithFavor(0.85, 9));
        assert.equals(0.95, sageAccuracyWithFavor(0.93, 5));
        assert.equals(0.97, sageAccuracyWithFavor(0.97, 5));
    });

    suite.test('劇情錨點：龐統官階 3、左慈第 5 年；與占卜次數任一達成即可用', () => {
        assert.isFalse(isSageStoryUnlocked('pang-tong', { officerTier: 2, year: 99 }));
        assert.isTrue(isSageStoryUnlocked('pang-tong', { officerTier: 3, year: 1 }));
        assert.isFalse(isSageStoryUnlocked('zuo-ci', { officerTier: 5, year: 4 }));
        assert.isTrue(isSageStoryUnlocked('zuo-ci', { officerTier: 1, year: 5 }));
        assert.isFalse(isSageStoryUnlocked('zhuge-liang', { officerTier: 5, year: 99 }), '沒有劇情錨點');
        assert.isTrue(isSageAvailable('zhuge-liang', { divinationCount: 0, officerTier: 1, year: 1 }));
        assert.isFalse(isSageAvailable('pang-tong', { divinationCount: 49, officerTier: 2, year: 1 }));
        assert.isTrue(isSageAvailable('pang-tong', { divinationCount: 50, officerTier: 1, year: 1 }));
        assert.isTrue(isSageAvailable('pang-tong', { divinationCount: 0, officerTier: 3, year: 1 }));
        assert.isFalse(isSageAvailable('cao-cao', { divinationCount: 999, officerTier: 5, year: 99 }));
    });

    suite.test('真實 sage-progress.json 通過驗證且與內建暫定值一致', withBuiltins(() => {
        const before = JSON.stringify([SAGE_FAVOR_LEVEL_EXP, SAGE_FAVOR_ACCURACY, SAGE_STORY_UNLOCKS]);
        assert.isTrue(installSageProgressTable(REAL).ok);
        assert.equals(before, JSON.stringify([SAGE_FAVOR_LEVEL_EXP, SAGE_FAVOR_ACCURACY, SAGE_STORY_UNLOCKS]));
    }));

    suite.test('JSON 覆寫：門檻、準確率、錨點可改；null 移除錨點；沒列的名士維持內建', withBuiltins(() => {
        const result = installSageProgressTable({
            favorLevelExp: [10, 20, 30, 40, 50],
            favorAccuracy: { perLevel: 0.02, cap: 0.9 },
            storyUnlocks: { 'pang-tong': { type: 'year', minYear: 3 }, 'zuo-ci': null },
        });
        assert.isTrue(result.ok);
        assert.equals(5, sageFavorLevel(50));
        assert.equals(0.9, sageAccuracyWithFavor(0.85, 5));
        assert.isTrue(isSageStoryUnlocked('pang-tong', { officerTier: 1, year: 3 }));
        assert.isFalse(isSageStoryUnlocked('pang-tong', { officerTier: 5, year: 2 }));
        assert.isFalse(isSageStoryUnlocked('zuo-ci', { officerTier: 5, year: 99 }));
    }));

    suite.test('JSON 驗證失敗時整份不套用並列出原因', withBuiltins(() => {
        const result = installSageProgressTable({
            favorLevelExp: [10, 5, 30, 40, 50],
            favorAccuracy: { perLevel: 0.5, cap: 0.9 },
            storyUnlocks: { 'pang-tong': { type: 'officer-tier', minTier: 9 }, 'cao-cao': { type: 'year', minYear: 1 } },
        });
        assert.isFalse(result.ok);
        assert.equals(4, result.ok ? 0 : result.issues.length);
        assert.equals('100,250,500,850,1300', SAGE_FAVOR_LEVEL_EXP.join(','));
        assert.equals(0.01, SAGE_FAVOR_ACCURACY.perLevel);
        const pang = SAGE_STORY_UNLOCKS['pang-tong'];
        assert.equals(3, pang?.type === 'officer-tier' ? pang.minTier : -1);
        assert.isFalse(installSageProgressTable(null).ok);
        assert.isFalse(installSageProgressTable({ storyUnlocks: [] }).ok);
    }));

    suite.test('GameSession：官階升到 3 或遊戲第 5 年即解鎖對應名士（存檔往返）', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        assert.isFalse(session.isSageUnlocked('pang-tong'));
        assert.isFalse(session.isSageUnlocked('zuo-ci'));
        const base = session.createSnapshot();
        await new PlayerSaveService(adapter).save({
            ...base,
            officerState: { currentTier: 3, officerExp: OFFICER_TIER_EXP_THRESHOLDS[3], unlockHistory: [1, 2, 3] },
        });
        assert.isTrue(await session.load());
        assert.isTrue(session.isSageUnlocked('pang-tong'));
        assert.isFalse(session.isSageUnlocked('zuo-ci'));
        await new PlayerSaveService(adapter).save({ ...base, gameTime: { ...base.gameTime, currentYear: 5 } });
        assert.isTrue(await session.load());
        assert.isFalse(session.isSageUnlocked('pang-tong'));
        assert.isTrue(session.isSageUnlocked('zuo-ci'));
    });

    return suite;
}
