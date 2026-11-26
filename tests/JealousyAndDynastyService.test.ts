import { TestSuite } from './TestRunner';
import { JealousyAndDynastyService, JealousyState } from '../assets/scripts/core/systems/JealousyAndDynastyService';

export function createJealousyAndDynastyServiceSuite(): TestSuite {
    const suite = new TestSuite('JealousyAndDynastyService');

    suite.test('吃醋 A/B 選項機率與年度價格縮放正確', () => {
        const baseState: JealousyState = {
            favor: 50,
            stamina: 50,
            gold: 1000,
            caughtCount: 0,
            unlockedTitles: [],
            spouseYearTriggerCount: {},
        };

        const aOk = JealousyAndDynastyService.resolveJealousyOption(baseState, 'A', 1, 'sp1', 10);
        const aFail = JealousyAndDynastyService.resolveJealousyOption(baseState, 'A', 1, 'sp2', 80);
        if (aOk.favorDelta !== 5 || aFail.favorDelta !== -3) {
            throw new Error('A 選項 70% +5 / 30% -3 異常');
        }

        if (JealousyAndDynastyService.getOptionBPrice(1) !== 200 || JealousyAndDynastyService.getOptionBPrice(3) !== 300) {
            throw new Error('B 選項價格縮放異常');
        }
        const bRes = JealousyAndDynastyService.resolveJealousyOption(baseState, 'B', 2, 'sp3', 0);
        if (bRes.goldCost !== 250 || bRes.favorDelta !== 10) {
            throw new Error('B 選項第 2 年扣款與好感異常');
        }
    });

    suite.test('吃醋 C 選項 50% 銀兩 +30、50% 抓包 -6 且每位配偶每年限 1 次，抓包 3 次解鎖府中睡神', () => {
        let state: JealousyState = {
            favor: 50,
            stamina: 50,
            gold: 1000,
            caughtCount: 0,
            unlockedTitles: [],
            spouseYearTriggerCount: {},
        };

        const cSleep = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 1, 'sp1', 10);
        if (cSleep.nextState.gold !== 1030 || cSleep.favorDelta !== 0 || cSleep.triggeredComedyStory) {
            throw new Error('C 選項 50% 睡著應銀兩 +30 且好感 0');
        }
        state = cSleep.nextState;

        const blocked = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 1, 'sp1', 90);
        if (!blocked.blockedByYearlyLimit) {
            throw new Error('同配偶同一年不應觸發第 2 次');
        }

        // 跨年抓包 3 次
        state = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 2, 'sp1', 90).nextState;
        state = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 3, 'sp1', 90).nextState;
        const r3 = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 4, 'sp1', 90);
        if (r3.newlyUnlockedTitle !== '府中睡神' || !r3.triggeredComedyStory) {
            throw new Error('抓包 3 次應解鎖「府中睡神」並觸發搞笑劇情');
        }
    });

    suite.test('三連霸「天下名門」徽章：首年不觸發，連霸 3 年解鎖私塾 +5%、俸祿 +10%', () => {
        const y1 = JealousyAndDynastyService.checkDynastyBadge(1, 3);
        const y3 = JealousyAndDynastyService.checkDynastyBadge(3, 3);
        if (y1.unlocked || y1.academyBonusPct !== 0 || y1.salaryBonusPct !== 0) {
            throw new Error('首年不應觸發三連霸徽章');
        }
        if (!y3.unlocked || y3.badgeTitle !== '天下名門' || y3.academyBonusPct !== 5 || y3.salaryBonusPct !== 10) {
            throw new Error(`第 3 年連霸 3 次應解鎖私塾 +5%、俸祿 +10%，實際 ${JSON.stringify(y3)}`);
        }
    });

    return suite;
}
