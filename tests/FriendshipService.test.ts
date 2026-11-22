import { TestSuite, assert } from './TestRunner';
import { FriendshipService } from '../assets/scripts/core/services/FriendshipService';

export function createFriendshipServiceSuite(): TestSuite {
    const suite = new TestSuite('FriendshipService (第8共用框架種子：武將友誼)');

    suite.test('初始查詢未接觸武將友誼值為 0，且非互動狀態', () => {
        const service = new FriendshipService();
        assert.equals(service.get('general_zhao_yun'), 0, '預設友誼應為 0');
        assert.isFalse(service.hasInteracted('general_zhao_yun'), '初始應為未互動');
    });

    suite.test('增加友誼值正確累加並夾制於上限 100', () => {
        const service = new FriendshipService();
        
        const v1 = service.add('general_guan_yu', 5, 'annual_praise');
        assert.equals(v1, 5, '第 1 次加 5 應為 5');
        assert.isTrue(service.hasInteracted('general_guan_yu'), '互動狀態應為 true');

        const v2 = service.add('general_guan_yu', 40, 'gift');
        assert.equals(v2, 45, '45');

        const v3 = service.add('general_guan_yu', 60, 'battle_together');
        assert.equals(v3, 100, '超過上限應夾制於 100');
    });

    suite.test('減少友誼值下限夾制於 0', () => {
        const service = new FriendshipService();
        service.add('general_zhang_fei', 10, 'initial');
        const v = service.add('general_zhang_fei', -25, 'scolded');
        assert.equals(v, 0, '低於下限應夾制於 0');
    });

    suite.test('友誼變更事件正常派發且可解除註冊', () => {
        const service = new FriendshipService();
        const logs: any[] = [];
        const unsubscribe = service.onFriendshipChanged((ev) => {
            logs.push(ev);
        });

        service.add('general_liu_bei', 5, 'congratulate');
        assert.equals(logs.length, 1, '應收到 1 次事件');
        assert.equals(logs[0].generalId, 'general_liu_bei');
        assert.equals(logs[0].oldValue, 0);
        assert.equals(logs[0].newValue, 5);
        assert.equals(logs[0].delta, 5);
        assert.equals(logs[0].reason, 'congratulate');

        unsubscribe();
        service.add('general_liu_bei', 10, 'mission');
        assert.equals(logs.length, 1, '解除註冊後不應再收到事件');
    });

    suite.test('稀疏存檔導出與載入還原', () => {
        const service = new FriendshipService();
        service.add('gen_1', 35, 'test');
        service.add('gen_2', 70, 'test');

        const snapshot = service.exportSnapshot();
        assert.equals(Object.keys(snapshot).length, 2, '稀疏存檔只存有互動的 2 位');
        assert.equals(snapshot['gen_1'], 35);
        assert.equals(snapshot['gen_2'], 70);

        const newService = new FriendshipService();
        newService.loadSnapshot(snapshot);
        assert.equals(newService.get('gen_1'), 35);
        assert.equals(newService.get('gen_2'), 70);
        assert.equals(newService.get('gen_unseen'), 0);
    });

    return suite;
}
