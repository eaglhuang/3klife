import { TestSuite } from './TestRunner';
import { JealousyAndDynastyService, JealousyState } from '../assets/scripts/core/systems/JealousyAndDynastyService';
import jealousyI18n from '../assets/resources/data/master/jealousy-i18n-keys.json';

export function createJealousyPopupPanelSuite(): TestSuite {
    const suite = new TestSuite('JealousyPopupPanel');

    suite.test('10033 i18n 鍵完整且第 1/2/3 次抓包對應三段不同台詞鍵', () => {
        if (jealousyI18n.caughtComedyKeys.length !== 3) {
            throw new Error('應有 3 段不同抓包台詞鍵');
        }
        if (!jealousyI18n.sleepGodTitleKey || !jealousyI18n.dynastyBadgeDescKey) {
            throw new Error('缺少稱號或徽章 i18n 鍵');
        }

        let state: JealousyState = {
            favor: 50,
            stamina: 50,
            gold: 1000,
            caughtCount: 0,
            unlockedTitles: [],
            spouseYearTriggerCount: {},
        };

        const keys: string[] = [];
        for (let y = 1; y <= 3; y++) {
            const res = JealousyAndDynastyService.resolveJealousyOption(state, 'C', y, 'sp1', 90);
            state = res.nextState;
            const idx = Math.min(state.caughtCount, jealousyI18n.caughtComedyKeys.length) - 1;
            keys.push(jealousyI18n.caughtComedyKeys[idx]);
        }

        if (keys[0] === keys[1] || keys[1] === keys[2]) {
            throw new Error(`三段抓包台詞鍵應不同: ${JSON.stringify(keys)}`);
        }
    });

    return suite;
}
