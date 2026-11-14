// @spec-source → Issue #2135（幕府大廳走動）；PROG-2-2251
/**
 * LobbyWanderSupport.test.ts — 座標換算、設定檔解析、速度與資料檔一致性
 *
 * 畫面層（HallStageCrowd）依賴 cc.sp.Skeleton，這裡測它用到的純邏輯與 data/hall-map/hall-wander.json。
 * Unity 對照：對 ScriptableObject 設定與座標換算工具做單元測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { WALK_GROUND_SPEED } from '../assets/scripts/shared/lobby/wanderCore';
import {
    actorSpeed,
    buildWanderConfig,
    clampWanderDt,
    parseHallWanderData,
    spinePathFor,
    stageToWander,
    wanderToStage,
} from '../assets/scripts/shared/lobby/wanderSupport';
import { TestSuite, assert } from './TestRunner';

const CANVAS = { width: 1920, height: 1080 };

function loadData(): unknown {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'hall-map', 'hall-wander.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function createLobbyWanderSupportSuite(): TestSuite {
    const suite = new TestSuite('LobbyWanderSupport (大廳走動周邊 Issue #2135)');

    suite.test('座標互換：舞台（中心、y 向上）與核心（左上、y 向下）來回一致', () => {
        const p = stageToWander(-320, -332, CANVAS);
        assert.equals(640, p.x);
        assert.equals(872, p.y);
        const back = wanderToStage(p, CANVAS);
        assert.equals(-320, back.x);
        assert.equals(-332, back.y);
    });

    suite.test('速度＝步幅常數 × 縮放；不接受負縮放；小兵常數不變', () => {
        assert.equals(WALK_GROUND_SPEED.general * 0.22, actorSpeed('general', 0.22));
        assert.equals(actorSpeed('general', 0.22), actorSpeed('general', -0.22));
        assert.equals(100, WALK_GROUND_SPEED.soldier);
        assert.equals(93.33, WALK_GROUND_SPEED.general);
    });

    suite.test('資料檔：hall-wander.json 解析成功，地板落在畫布內、梯形在矩形內', () => {
        const data = parseHallWanderData(loadData());
        assert.isTrue(data !== null);
        if (!data) return;
        assert.isTrue(data.floor.x0 >= 0 && data.floor.x1 <= CANVAS.width && data.floor.y0 >= 0 && data.floor.y1 <= CANVAS.height);
        for (const p of data.floorPolygon ?? []) {
            assert.isTrue(p.x >= data.floor.x0 && p.x <= data.floor.x1 && p.y >= data.floor.y0 && p.y <= data.floor.y1);
        }
        assert.equals(2, data.idleSeconds[0]);
        assert.equals(4, data.idleSeconds[1]);
    });

    suite.test('Spine 對照表：有列的回路徑，沒列的回 null（維持靜態小人）', () => {
        const data = parseHallWanderData(loadData())!;
        assert.equals('spine/generals/zhao_yun/zhao_v2', spinePathFor(data, 'zhao-yun'));
        assert.isTrue(spinePathFor(data, 'cao-cao') === null);
    });

    suite.test('設定壞掉一律回 null：缺地板、縮放 ≤0、停頓範圍顛倒', () => {
        const good = loadData() as Record<string, unknown>;
        assert.isTrue(parseHallWanderData(null) === null);
        assert.isTrue(parseHallWanderData({ ...good, floor: undefined }) === null);
        assert.isTrue(parseHallWanderData({ ...good, generalScale: 0 }) === null);
        assert.isTrue(parseHallWanderData({ ...good, idleSeconds: [4, 2] }) === null);
    });

    suite.test('組核心設定：起點換成核心座標、速度為 93.33×縮放、種子取自資料檔', () => {
        const data = parseHallWanderData(loadData())!;
        const cfg = buildWanderConfig(data, [{ id: 'zhao-yun', stageX: -320, stageY: -332 }], CANVAS);
        assert.equals(data.seed, cfg.seed);
        assert.equals(1, cfg.actors.length);
        assert.equals(640, cfg.actors[0].start.x);
        assert.equals(872, cfg.actors[0].start.y);
        assert.equals(actorSpeed('general', data.generalScale), cfg.actors[0].speed);
    });

    suite.test('dt 截斷：從停放回來的大 dt 不會讓角色瞬移；負值與非數字當 0', () => {
        assert.equals(0.1, clampWanderDt(5, 0.1));
        assert.equals(0.016, clampWanderDt(0.016, 0.1));
        assert.equals(0, clampWanderDt(-1, 0.1));
        assert.equals(0, clampWanderDt(Number.NaN, 0.1));
    });

    return suite;
}
