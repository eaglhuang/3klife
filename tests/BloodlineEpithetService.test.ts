import { TestSuite } from './TestRunner';
import { BloodlineEpithetService } from '../assets/scripts/core/systems/BloodlineEpithetService';

export function createBloodlineEpithetServiceSuite(): TestSuite {
    const suite = new TestSuite('BloodlineEpithetService');

    suite.test('天賦小名池共有 48 個且出生抽取正確', () => {
        const pool = BloodlineEpithetService.getPool();
        if (pool.length !== 48) {
            throw new Error(`預期 48 個天賦小名，實際 ${pool.length}`);
        }
        const drawn = BloodlineEpithetService.drawBirthEpithet(0);
        if (drawn.name !== '小霸王' || drawn.hiddenBonus !== 2) {
            throw new Error(`出生抽取結果異常: ${JSON.stringify(drawn)}`);
        }
    });

    suite.test('8 / 12 / 15 歲揭曉階段正確切換', () => {
        const ep = BloodlineEpithetService.drawBirthEpithet(1);
        const s7 = BloodlineEpithetService.getRevealStateAtAge(7, ep);
        const s8 = BloodlineEpithetService.getRevealStateAtAge(8, ep);
        const s12 = BloodlineEpithetService.getRevealStateAtAge(12, ep);
        const s15 = BloodlineEpithetService.getRevealStateAtAge(15, ep);
        if (s7.stage !== 'hidden' || s8.stage !== 'omen_8' || s12.stage !== 'trait_12' || s15.stage !== 'revealed_15' || !s15.isBonusActive) {
            throw new Error('年齡揭曉階段狀態錯誤');
        }
    });

    suite.test('成長拆解表確保小名隱藏 +2 只算一次', () => {
        const ep = BloodlineEpithetService.drawBirthEpithet(2);
        const first = BloodlineEpithetService.buildGrowthBreakdown(70, ep, false);
        const second = BloodlineEpithetService.buildGrowthBreakdown(72, ep, true);
        if (first.epithetBonusApplied !== 2 || first.finalTotal !== 72) {
            throw new Error(`首次計算應加 2，實際 ${JSON.stringify(first)}`);
        }
        if (second.epithetBonusApplied !== 0 || second.finalTotal !== 72 || !second.note.includes('只算一次')) {
            throw new Error(`重複計算不應再加，實際 ${JSON.stringify(second)}`);
        }
    });

    return suite;
}
