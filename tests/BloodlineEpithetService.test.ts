import { TestSuite } from './TestRunner';
import { BloodlineEpithetService } from '../assets/scripts/core/systems/BloodlineEpithetService';

export function createBloodlineEpithetServiceSuite(): TestSuite {
    const suite = new TestSuite('BloodlineEpithetService');

    suite.test('天賦小名池共有 48 個、i18n 鍵與語意屬性正確', () => {
        const pool = BloodlineEpithetService.getPool();
        if (pool.length !== 48) {
            throw new Error(`預期 48 個天賦小名，實際 ${pool.length}`);
        }
        const strongMan = pool.find((p) => p.name === '舉鼎小力士');
        const listener = pool.find((p) => p.name === '愛聽里長講古');
        const popular = pool.find((p) => p.name === '街坊人氣王');
        if (!strongMan || strongMan.statKey !== 'str' || !strongMan.nameKey) {
            throw new Error('舉鼎小力士應為 str 且具 nameKey');
        }
        if (!listener || listener.statKey !== 'pol') {
            throw new Error('愛聽里長講古應為 pol');
        }
        if (!popular || popular.statKey !== 'cha') {
            throw new Error('街坊人氣王應為 cha');
        }
        const quirkyCount = pool.filter((p) => p.tier === 'quirky').length;
        if (quirkyCount < 14 || quirkyCount > 18) {
            throw new Error(`搞笑/偏弱但有別的玩法價值比例應約 1/3，實際 ${quirkyCount}/48`);
        }
    });

    suite.test('8 / 12 / 15 歲揭曉階段正確切換', () => {
        const ep = BloodlineEpithetService.drawBirthEpithet(0);
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
