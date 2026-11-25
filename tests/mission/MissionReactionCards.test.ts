// @spec-source → 大廳任務規格 doc_spec_1178 §7.3、§9；PROG-2-9966（派出與回報反應、牆上置頂、連鎖標記）
import { TestSuite, assert } from '../TestRunner';
import { chainSpawnTargets, chainTagText, chainTotalOf } from '../../assets/scripts/core/mission/MissionChain';
import {
    buildPinnedMissions, fallbackLineKey, friendshipText, missionContextKey, resolveCardLines, rewardParts,
    type HallMissionReportCard,
} from '../../assets/scripts/core/mission/MissionReactionCards';
import { buildLobbyHallWallView } from '../../assets/scripts/core/systems/LobbyHallWallView';
import { realBundle } from './missionTestKit';

const t = (key: string, ...args: Array<string | number>) => `${key}|${args.join(',')}`;
const card = (over: Partial<HallMissionReportCard> = {}): HallMissionReportCard => ({
    missionId: 'M1', title: '巡防', generalId: 'G1', generalName: '甲將', tier: 'success',
    gains: { grain: 90, gold: 0, silver: 0, generalExp: 12 }, friendship: 0, ...over,
});

export function createMissionReactionCardsSuite(): TestSuite {
    const suite = new TestSuite('MissionReactionCards (派出／回報反應、置頂、連鎖標記，PROG-2-9966)');

    suite.test('情境鍵：派出一個、返回依成敗分兩個', () => {
        assert.equals('mission-dispatch', missionContextKey('dispatch'));
        assert.equals('mission-return', missionContextKey('return', 'critical'));
        assert.equals('mission-return', missionContextKey('return', 'success'));
        assert.equals('mission-return-bad', missionContextKey('return', 'fail'));
        assert.equals('mission-return-bad', missionContextKey('return', 'disaster'));
    });

    suite.test('本機預設台詞鍵：派出一組、返回依結果各一組，pick 取餘不越界', () => {
        assert.equals('ui.hallMission.line.dispatch.1', fallbackLineKey('dispatch', undefined, 0));
        assert.equals('ui.hallMission.line.critical.3', fallbackLineKey('return', 'critical', 2));
        assert.equals('ui.hallMission.line.fail.1', fallbackLineKey('return', 'fail', 3));
        assert.equals('ui.hallMission.line.disaster.3', fallbackLineKey('return', 'disaster', -1));
    });

    suite.test('獎勵與友誼文字：零不顯示、損失帶負號', () => {
        const parts = rewardParts(card({ gains: { grain: -30, gold: 0, silver: 5, generalExp: 0 } }), t);
        assert.equals(2, parts.length);
        assert.isTrue(parts[0].includes('-30'));
        assert.equals(0, rewardParts(card({ gains: { grain: 0, gold: 0, silver: 0, generalExp: 0 } }), t).length);
        assert.equals('', friendshipText(card({ friendship: 0 }), t));
        assert.isTrue(friendshipText(card({ friendship: 3 }), t).includes('+3'));
    });

    suite.test('回報台詞：台詞系統有句用它，空句、失敗、逾時都靜默退回本機預設', async () => {
        const cards = [card({ missionId: 'A' }), card({ missionId: 'B' }), card({ missionId: 'C' }), card({ missionId: 'D' })];
        const fetcher = (c: HallMissionReportCard): Promise<string | null> => {
            if (c.missionId === 'A') return Promise.resolve('  好啊  ');
            if (c.missionId === 'B') return Promise.resolve('   ');
            if (c.missionId === 'C') return Promise.reject(new Error('net'));
            return new Promise(() => undefined); // 永不回應 → 逾時
        };
        const out = await resolveCardLines(cards, fetcher, (c) => `fb-${c.missionId}`, 20);
        assert.equals('好啊,fb-B,fb-C,fb-D', out.map((c) => c.line).join(','));
        const none = await resolveCardLines(cards.slice(0, 1), null, () => 'local', 20);
        assert.equals('local', none[0].line);
    });

    suite.test('牆上置頂：只列進行中、剩餘季數由近到遠、最多 3 個、其餘併成 +N', () => {
        const mk = (id: string, ret: number, status = 'ACTIVE') => ({ id, title: id, status, executorId: `g-${id}`, executorName: `將${id}`, returnSeason: ret });
        const view = buildPinnedMissions([mk('a', 9), mk('b', 6), mk('open', 0, 'OPEN'), mk('c', 7), mk('d', 8), mk('e', 12)], 5);
        assert.equals('b,c,d', view.items.map((i) => i.missionId).join(','));
        assert.equals(1, view.items[0].seasonsLeft);
        assert.equals(2, view.more);
        const empty = buildPinnedMissions([mk('x', 3, 'OPEN')], 1);
        assert.equals(0, empty.items.length);
        assert.equals(0, empty.more);
    });

    suite.test('牆面列：連鎖標記加在獎勵前，沒有連鎖不加', () => {
        const row = (taskId: string) => ({ taskId, title: taskId, rewardText: '糧 +90', requiredRankText: '', difficultyText: '易', accepted: false });
        const view = buildLobbyHallWallView([row('a'), row('b')] as never, 4, (r) => (r.taskId === 'a' ? '連續任務 2/3' : ''));
        assert.equals('連續任務 2/3・糧 +90', view.rows[0].meta);
        assert.equals('糧 +90', view.rows[1].meta);
    });

    suite.test('連鎖總段數：真實資料每條連鎖的分母都不小於目前段數，且標記字樣正確', () => {
        const defs = realBundle().defs;
        let chained = 0;
        for (const def of defs.values()) {
            const targets = chainSpawnTargets(def);
            for (const id of targets) assert.isTrue(defs.has(id), `${def.id} 指到不存在的定義 ${id}`);
            if (targets.length > 0) {
                chained += 1;
                assert.isTrue(chainTotalOf(defs, def.id, 1) >= 2, `${def.id} 有後續卻分母 < 2`);
            }
            assert.equals(3, chainTotalOf(defs, def.id, 3) >= 3 ? 3 : 0);
        }
        assert.isTrue(chained > 0, '資料裡應該有連鎖任務');
        assert.equals('連續任務 2/3', chainTagText(2, 3));
    });

    return suite;
}
