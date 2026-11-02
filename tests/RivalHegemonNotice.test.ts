import { TestSuite, assert } from './TestRunner';
import { newAiHegemonOf } from '../assets/scripts/core/systems/RivalHegemony';
import { formatHegemonRise } from '../assets/scripts/core/systems/RivalRulerLines';

export function createRivalHegemonNoticeSuite(): TestSuite {
    const suite = new TestSuite('RivalHegemonNotice (AI 稱霸提示 PROG-2-1710)');
    const spread = [{ id: 'wei', territories: 2 }, { id: 'wu', territories: 2 }, { id: 'player', territories: 2 }, { id: 'shu', territories: 2 }];
    const weiRise = [{ id: 'wei', territories: 5 }, { id: 'wu', territories: 2 }, { id: 'player', territories: 2 }, { id: 'shu', territories: 2 }];

    suite.test('他國新過 30% 才提示', () => {
        assert.equals('wei', newAiHegemonOf(spread, weiRise, 'player'));
    });

    suite.test('同一霸主連續多季不重複提示', () => {
        assert.equals(null, newAiHegemonOf(weiRise, weiRise, 'player'));
    });

    suite.test('玩家成為霸主不發 AI 稱霸提示', () => {
        const playerRise = [{ id: 'wei', territories: 2 }, { id: 'player', territories: 5 }, { id: 'wu', territories: 2 }];
        assert.equals(null, newAiHegemonOf(spread, playerRise, 'player'));
    });

    suite.test('文案照規格 G-1', () => {
        assert.equals('魏 勢力空前強大！天下諸侯密謀結盟對抗霸主。', formatHegemonRise('魏'));
    });

    return suite;
}
