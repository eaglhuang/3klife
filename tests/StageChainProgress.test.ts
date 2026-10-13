// @spec-source → 關卡設計系統.md §C-1 連環破主鏈（PROG-2-0214）
/**
 * StageChainProgress — 連環破主鏈順序解鎖的 headless 測試（PROG-2-0214）
 *
 * 範例主鏈取規格原文：要擊敗曹操，必須先過典韋、許褚兩關。
 */
import { TestSuite, assert } from './TestRunner';
import { ChainStage, isStageUnlocked, markStageCleared } from '../assets/scripts/core/systems/StageChainProgress';

const STAGES: ChainStage[] = [
    { id: 'dianwei', chainId: 'cao-cao-chain', order: 1 },
    { id: 'xuchu', chainId: 'cao-cao-chain', order: 2 },
    { id: 'cao-cao', chainId: 'cao-cao-chain', order: 3 },
    { id: 'solo' },
];

const NONE: ReadonlySet<string> = new Set();

export function createStageChainProgressSuite(): TestSuite {
    const suite = new TestSuite('StageChainProgress');

    suite.test('主鏈第一關一律可進入；之後的關卡要前一關通關才開', () => {
        assert.isTrue(isStageUnlocked('dianwei', STAGES, NONE), '典韋');
        assert.isFalse(isStageUnlocked('xuchu', STAGES, NONE), '許褚未解');
        assert.isTrue(isStageUnlocked('xuchu', STAGES, new Set(['dianwei'])), '典韋過了，許褚開');
    });

    suite.test('連環破順序：曹操要典韋與許褚都過了才開，只過典韋不夠', () => {
        assert.isFalse(isStageUnlocked('cao-cao', STAGES, new Set(['dianwei'])), '只過典韋');
        assert.isTrue(isStageUnlocked('cao-cao', STAGES, new Set(['dianwei', 'xuchu'])), '典韋與許褚都過');
    });

    suite.test('跳關不算：許褚沒過，即使曹操已標通關，曹操仍不解鎖', () => {
        // 前一關是許褚；許褚未過，曹操仍鎖住
        assert.isFalse(isStageUnlocked('cao-cao', STAGES, new Set(['dianwei', 'cao-cao'])), '跳過許褚通關曹操，不能視為鏈已完成');
    });

    suite.test('獨立關卡（沒有 chainId）永遠可進入', () => {
        assert.isTrue(isStageUnlocked('solo', STAGES, NONE));
    });

    suite.test('找不到的關卡不解鎖', () => {
        assert.isFalse(isStageUnlocked('no-such-stage', STAGES, new Set(['dianwei'])));
    });

    suite.test('標記通關回傳新集合，原集合不變', () => {
        const before: ReadonlySet<string> = new Set(['dianwei']);
        const after = markStageCleared(before, 'xuchu');
        assert.isTrue(after.has('xuchu'));
        assert.isTrue(after.has('dianwei'));
        assert.isFalse(before.has('xuchu'), '原集合不應被改');
    });

    return suite;
}
