/**
 * AiTallyPool.test.ts — AI 虎符池與配發（PROG-2-1337）
 *
 * 覆蓋：各難度配發張數、候選依敵將適性兵種過濾（大小寫不分）、無適性紀錄退回全表、
 * 不重複配發、候選不足時少配、模板目錄轉池（品質對照、停用模板不進池）。
 */
import type { TallyCardData } from '../assets/scripts/shared/TallyCardContract';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import {
    AI_TALLY_COUNT_BY_DIFFICULTY,
    aiTallyCandidates,
    allocateAiTallies,
    buildAiTallyPool,
} from '../assets/scripts/core/systems/AiTallyPool';
import { TestSuite, assert } from './TestRunner';

function tally(templateId: string, troopType: string, quality: TigerTallyCard['quality'] = 'SR'): TigerTallyCard {
    return {
        uid: `ai-tally:${templateId}`, templateId, sourceGeneralUid: '', quality, score: 0,
        source: 'reward', producedSeason: 0, troopType, stars: 1,
    };
}

function catalogEntry(unitType: string, rarity: string, isDisabled = false): TallyCardData {
    return { unitType, rarity, isDisabled } as unknown as TallyCardData;
}

const lubu = { templateId: 'lu-bu', troopAptitude: { CAVALRY: 'S', INFANTRY: 'B' } };

export function createAiTallyPoolSuite(): TestSuite {
    const suite = new TestSuite('AiTallyPool (AI 虎符池與配發 PROG-2-1337)');

    suite.test('各難度配發張數：easy 0、normal 1、hard 2、nightmare 2、hell 3', () => {
        assert.equals(0, AI_TALLY_COUNT_BY_DIFFICULTY.easy);
        assert.equals(1, AI_TALLY_COUNT_BY_DIFFICULTY.normal);
        assert.equals(2, AI_TALLY_COUNT_BY_DIFFICULTY.hard);
        assert.equals(2, AI_TALLY_COUNT_BY_DIFFICULTY.nightmare);
        assert.equals(3, AI_TALLY_COUNT_BY_DIFFICULTY.hell);
    });

    suite.test('候選只留敵將有適性紀錄的兵種（大小寫不分）', () => {
        const pool = [tally('a', 'cavalry'), tally('b', 'archer'), tally('c', 'INFANTRY')];
        const candidates = aiTallyCandidates(lubu, pool).map(t => t.templateId);
        assert.equals(2, candidates.length);
        assert.isTrue(candidates.includes('a'));
        assert.isTrue(candidates.includes('c'));
        assert.isFalse(candidates.includes('b'));
    });

    suite.test('敵將沒有任何適性紀錄時退回全表', () => {
        const pool = [tally('a', 'cavalry'), tally('b', 'archer')];
        assert.equals(2, aiTallyCandidates({ templateId: 'x', troopAptitude: {} }, pool).length);
    });

    suite.test('配發不重複，依評分取前 N 張', () => {
        const pool = [tally('ur', 'cavalry', 'UR'), tally('sr', 'cavalry', 'SR'), tally('r', 'infantry', 'R')];
        const allocated = allocateAiTallies(lubu, pool, 'hard').map(t => t.templateId);
        assert.equals(2, allocated.length);
        assert.equals('ur', allocated[0]);
        assert.equals('sr', allocated[1]);
    });

    suite.test('候選不足時少配，不會拿到池外的卡', () => {
        const pool = [tally('only', 'cavalry')];
        assert.equals(1, allocateAiTallies(lubu, pool, 'hell').length);
    });

    suite.test('easy 不配發', () => {
        assert.equals(0, allocateAiTallies(lubu, [tally('a', 'cavalry')], 'easy').length);
    });

    suite.test('模板目錄轉池：品質對照稀有度，停用模板不進池，兵種保留', () => {
        const catalog = new Map<string, TallyCardData>([
            ['t-normal', catalogEntry('cavalry', 'normal')],
            ['t-mythic', catalogEntry('shield', 'mythic')],
            ['t-off', catalogEntry('archer', 'rare', true)],
        ]);
        const pool = buildAiTallyPool(catalog);
        assert.equals(2, pool.length);
        const normal = pool.find(t => t.templateId === 't-normal')!;
        assert.equals('R', normal.quality);
        assert.equals('cavalry', normal.troopType);
        assert.equals(1, normal.stars);
        assert.equals('UR', pool.find(t => t.templateId === 't-mythic')!.quality);
    });

    return suite;
}
