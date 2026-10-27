/**
 * PROG-2-1181：派遣板點列派遣（JRN-03 第四段）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { dispatchClickMessage } from '../assets/scripts/core/systems/DispatchCatalog';
import { DISPATCH_COOLDOWN_MS } from '../assets/scripts/core/systems/DispatchJobs';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const HOUR = 60 * 60 * 1000;

function hero(id: string, name: string, lea: number, careerClass = 'Warrior'): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 60, int: 60, lea, pol: 60, cha: 60, careerClass } as GeneralConfig;
}

export function createDispatchClickSuite(): TestSuite {
    const suite = new TestSuite('DispatchClick (PROG-2-1181 派遣板點列派遣)');

    suite.test('挑分數最高的武將派出；同任務再點回報執行中', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('weak', '弱將', 30, 'Scholar'), hero('zhao', '趙雲', 90)]);
        const result = session.dispatchJobById('PATROL', 0);
        assert.isTrue(result.ok);
        assert.equals('趙雲', result.generalName ?? '');
        assert.equals('趙雲出發執行「邊境巡查」。', dispatchClickMessage(result));
        const again = session.dispatchJobById('PATROL', 0);
        assert.equals('job-active', again.reason ?? '');
        assert.equals('「邊境巡查」由趙雲執行中。', dispatchClickMessage(again));
        assert.equals('PATROL', session.dispatchBoardRows(0)[0].id);
    });

    suite.test('略過忙碌與冷卻的武將；都不可用時回報無人可派', () => {
        const session = new GameSession(2);
        session.enrollGenerals([hero('zhao', '趙雲', 90)]);
        assert.isTrue(session.dispatchJobById('PATROL', 0).ok);
        const busy = session.dispatchJobById('FARM', 0);
        assert.equals('no-general', busy.reason ?? '');
        assert.equals('目前沒有可派遣的武將。', dispatchClickMessage(busy));
        session.settleDispatchJobs(4 * HOUR);
        assert.equals('no-general', session.dispatchJobById('FARM', 4 * HOUR).reason ?? '');
        assert.isTrue(session.dispatchJobById('FARM', 4 * HOUR + DISPATCH_COOLDOWN_MS).ok);
    });

    suite.test('高風險任務玩家親點可派；未知任務與空名冊', () => {
        const session = new GameSession(3);
        assert.equals('no-general', session.dispatchJobById('PATROL', 0).reason ?? '');
        session.enrollGenerals([hero('zhao', '趙雲', 90)]);
        assert.isTrue(session.dispatchJobById('RAID', 0).ok);
        const unknown = session.dispatchJobById('NOPE', 0);
        assert.equals('unknown-job', unknown.reason ?? '');
        assert.equals('無法派遣此任務。', dispatchClickMessage(unknown));
    });

    return suite;
}
