/**
 * AiTallySelection.test.ts — AI 虎符選擇邏輯（PROG-2-1467）
 *
 * 覆蓋：共鳴虎符優先、適性 × 品質 × 星級評分、缺兵種／缺適性預設 B、大小寫不分、同分取先、空清單。
 */
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { aiSelectTally, scoreTallyForAi, type AiTallyGeneral } from '../assets/scripts/core/systems/AiTallySelection';
import { TestSuite, assert } from './TestRunner';

function tally(uid: string, fields: Partial<TigerTallyCard> = {}): TigerTallyCard {
    return {
        uid, templateId: `src-${uid}`, sourceGeneralUid: `src-${uid}`, quality: 'SR', score: 50,
        source: 'retire', producedSeason: 1, troopType: 'CAVALRY', stars: 1, ...fields,
    };
}

const lubu: AiTallyGeneral = { templateId: 'lu-bu', troopAptitude: { CAVALRY: 'S', INFANTRY: 'B', ARCHER: 'D' } };

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createAiTallySelectionSuite(): TestSuite {
    const suite = new TestSuite('AiTallySelection (AI 虎符選擇 E-6b PROG-2-1467)');

    suite.test('自己名號的虎符優先，即使評分較低', () => {
        const own = tally('own', { templateId: 'lu-bu', quality: 'R', troopType: 'ARCHER' });
        const strong = tally('strong', { quality: 'UR', stars: 5 });
        assert.equals('own', aiSelectTally(lubu, [strong, own])?.uid);
    });

    suite.test('評分：適性效率 × 品質 × (1 + 星級 × 0.08)', () => {
        near(1.2 * 1.15 * 1.08, scoreTallyForAi(lubu, tally('a')));
        near(0.8 * 1.5 * 1.24, scoreTallyForAi(lubu, tally('b', { troopType: 'ARCHER', quality: 'UR', stars: 3 })));
    });

    suite.test('沒有共鳴時取最高分：S 適性 SR 勝過 D 適性 UR', () => {
        const cav = tally('cav');
        const archer = tally('archer', { troopType: 'ARCHER', quality: 'UR' });
        assert.equals('cav', aiSelectTally(lubu, [archer, cav])?.uid);
    });

    suite.test('缺兵種或缺適性時視為 B；兵種大小寫不分', () => {
        near(1.0 * 1.15 * 1.08, scoreTallyForAi(lubu, tally('none', { troopType: undefined })));
        near(1.0 * 1.15 * 1.08, scoreTallyForAi(lubu, tally('navy', { troopType: 'NAVY' })));
        near(1.2 * 1.15 * 1.08, scoreTallyForAi(lubu, tally('lower', { troopType: 'cavalry' })));
    });

    suite.test('星級沿用卡片讀法：缺欄位 1★、R 封頂 3★', () => {
        near(scoreTallyForAi(lubu, tally('a', { stars: 1 })), scoreTallyForAi(lubu, tally('b', { stars: undefined })));
        near(scoreTallyForAi(lubu, tally('c', { quality: 'R', stars: 3 })), scoreTallyForAi(lubu, tally('d', { quality: 'R', stars: 5 })));
    });

    suite.test('同分取先出現者；空清單回 null', () => {
        assert.equals('first', aiSelectTally(lubu, [tally('first'), tally('second')])?.uid);
        assert.equals(null, aiSelectTally(lubu, []));
    });

    return suite;
}
