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

    suite.test('扣分可以扣到負值（-100～100 範圍），且不會低於 -100', () => {
        const service = new FriendshipService();
        service.add('general_zhang_fei', 10, 'initial');
        const v = service.add('general_zhang_fei', -25, 'scolded');
        assert.equals(v, -15, '10 扣 25 應為 -15（負值為敵意區間）');
        assert.isTrue(service.hasInteracted('general_zhang_fei'), '負值仍算互動');

        const v2 = service.add('general_zhang_fei', -200, 'captured_ally');
        assert.equals(v2, -100, '低於下限應夾制於 -100');
        assert.equals(service.add('general_zhang_fei', -5, 'x'), -100, '已在下限再扣仍為 -100');
    });

    suite.test('負值變更事件的 delta 為實際變動量（夾制後）', () => {
        const service = new FriendshipService();
        service.add('gen_neg', -90, 'init');
        const logs: any[] = [];
        service.onFriendshipChanged((ev) => logs.push(ev));
        service.add('gen_neg', -30, 'drop');
        assert.equals(logs[0].oldValue, -90);
        assert.equals(logs[0].newValue, -100);
        assert.equals(logs[0].delta, -10, '實際只扣 10');
    });

    suite.test('舊存檔相容：全 ≥0 的舊快照原樣載入；新存檔的負值可還原', () => {
        const legacy = new FriendshipService();
        legacy.loadSnapshot({ gen_a: 0, gen_b: 45, gen_c: 100 });
        assert.equals(legacy.get('gen_a'), 0);
        assert.equals(legacy.get('gen_b'), 45);
        assert.equals(legacy.get('gen_c'), 100);

        const fresh = new FriendshipService();
        fresh.loadSnapshot({ gen_d: -60, gen_e: -100 });
        assert.equals(fresh.get('gen_d'), -60, '負值存檔應還原');
        assert.equals(fresh.get('gen_e'), -100);
    });

    suite.test('載入快照的越界值夾制於 [-100, 100]，非數字略過', () => {
        const service = new FriendshipService();
        service.loadSnapshot({ hi: 500, lo: -500, bad: NaN as unknown as number });
        assert.equals(service.get('hi'), 100);
        assert.equals(service.get('lo'), -100);
        assert.isFalse(service.hasInteracted('bad'), 'NaN 不寫入');
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
