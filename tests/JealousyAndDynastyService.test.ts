import { TestSuite } from './TestRunner';
import { JealousyAndDynastyService, JealousyState } from '../assets/scripts/core/systems/JealousyAndDynastyService';

export function createJealousyAndDynastyServiceSuite(): TestSuite {
    const suite = new TestSuite('JealousyAndDynastyService');

    suite.test('吃醋 B 選項價格依年度縮放公式 200*(1+0.25*(Year-1)) 正確計算', () => {
        if (JealousyAndDynastyService.getOptionBPrice(1) !== 200) throw new Error('第 1 年應為 200');
        if (JealousyAndDynastyService.getOptionBPrice(2) !== 250) throw new Error('第 2 年應為 250');
        if (JealousyAndDynastyService.getOptionBPrice(3) !== 300) throw new Error('第 3 年應為 300');
        if (JealousyAndDynastyService.getOptionBPrice(5) !== 400) throw new Error('第 5 年應為 400');
    });

    suite.test('吃醋 C 選項抓包 3 次解鎖「府中睡神」稱號', () => {
        let state: JealousyState = {
            favor: 50,
            gold: 1000,
            caughtCount: 0,
            unlockedTitles: [],
        };
        const r1 = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 1);
        state = r1.nextState;
        const r2 = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 1);
        state = r2.nextState;
        const r3 = JealousyAndDynastyService.resolveJealousyOption(state, 'C', 1);

        if (r1.newlyUnlockedTitle !== null || r2.newlyUnlockedTitle !== null) {
            throw new Error('前 2 次不應解鎖稱號');
        }
        if (r3.newlyUnlockedTitle !== '府中睡神' || !r3.nextState.unlockedTitles.includes('府中睡神')) {
            throw new Error(`第 3 次應解鎖「府中睡神」，實際 ${JSON.stringify(r3)}`);
        }
    });

    suite.test('三連霸「天下名門」徽章：首年不會觸發，連續 3 年第一名才解鎖', () => {
        const y1 = JealousyAndDynastyService.checkDynastyBadge(1, 3);
        const y2 = JealousyAndDynastyService.checkDynastyBadge(2, 2);
        const y3 = JealousyAndDynastyService.checkDynastyBadge(3, 3);

        if (y1.unlocked) throw new Error('首年不應觸發三連霸徽章');
        if (y2.unlocked) throw new Error('連霸 2 年不應觸發');
        if (!y3.unlocked || y3.badgeTitle !== '天下名門') {
            throw new Error(`第 3 年連霸 3 次應解鎖「天下名門」，實際 ${JSON.stringify(y3)}`);
        }
    });

    return suite;
}
