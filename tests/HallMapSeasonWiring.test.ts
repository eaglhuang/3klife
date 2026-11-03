/**
 * HallMapSeasonWiring.test.ts — 季度推進發出他國事件，接到大廳勢力圖聚焦序列（UI-2-0130，UI-2-0123 子項）
 *
 * Unity 對照：PlayMode 前的 EditMode 接線測試，只驗證事件從 GameSession 一路流到鏡頭序列，不碰畫面。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, GAME_SESSION_EVENTS, RivalSeasonEventsPayload } from '../assets/scripts/core/managers/GameSession';
import { createRivalWorld, nationDef } from '../assets/scripts/core/systems/RivalNations';
import { HallMapEventCatalog, mapSeasonEventsToHallMap } from '../assets/scripts/core/systems/HallMapEventMapper';
import { HallMapLayout, planHallMapTurn, readProvinceCentroids } from '../assets/scripts/core/systems/HallMapFocusPlanner';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

async function sessionWithHostileWei(): Promise<{ session: GameSession; payloads: RivalSeasonEventsPayload[] }> {
    const session = new GameSession();
    session.setAutoSave(false);
    const world = createRivalWorld();
    await session.setRivals({
        nations: world.nations.map((n) => n.id === 'wei'
            ? { ...n, atWar: true, relation: -100, troops: 50000, resources: { food: 99999, gold: 99999, fame: 50, intel: 100 } }
            : n),
    });
    session.setRandomSource(() => 0);
    const payloads: RivalSeasonEventsPayload[] = [];
    session.setEventEmitter({
        emit: (name: string, payload: unknown) => {
            if (name === GAME_SESSION_EVENTS.RivalSeasonEvents) payloads.push(payload as RivalSeasonEventsPayload);
        },
    });
    return { session, payloads };
}

export function createHallMapSeasonWiringSuite(): TestSuite {
    const suite = new TestSuite('HallMapSeasonWiring');

    suite.test('他國來犯時，季度推進發出 RivalSeasonEvents（含迎戰結果）', async () => {
        const { session, payloads } = await sessionWithHostileWei();
        await session.advanceSeason();
        assert.equals(1, payloads.length);
        const wei = payloads[0].events.find((e) => e.nationId === 'wei');
        assert.isTrue(!!wei, '缺魏國事件');
        assert.equals('attack', wei!.kind);
        assert.equals('boolean', typeof wei!.playerWon);
    });

    suite.test('沒有他國來犯的季度不發事件', async () => {
        const session = new GameSession();
        session.setAutoSave(false);
        session.setRandomSource(() => 0.99);
        let count = 0;
        session.setEventEmitter({ emit: (name: string) => { if (name === GAME_SESSION_EVENTS.RivalSeasonEvents) count++; } });
        await session.advanceSeason();
        assert.equals(0, count);
    });

    suite.test('事件一路轉成勢力圖聚焦序列：先聚焦魏國根據地，最後回到 mini', async () => {
        const { session, payloads } = await sessionWithHostileWei();
        await session.advanceSeason();
        const catalog = loadJson<HallMapEventCatalog>('assets/resources/data/hall-map/hall-map-events.json');
        const layout = loadJson<HallMapLayout>('assets/resources/data/hall-map/hall-map-layout.json');
        const provinces = loadJson<{ provinces: { id: string; name: string; centroid?: number[] }[] }>(
            'assets/resources/data/hall-map/han13-provinces.json',
        ).provinces;
        const mapEvents = mapSeasonEventsToHallMap(payloads[0].events, catalog, {
            nationName: (id) => nationDef(id)?.name,
            provinceName: (id) => provinces.find((p) => p.id === id)?.name,
        });
        const steps = planHallMapTurn(mapEvents, readProvinceCentroids(provinces), layout);
        const weiStep = steps.find((s) => s.focus?.provinceId === catalog.nationSeats.wei);
        assert.isTrue(!!weiStep, '序列中沒有聚焦魏國根據地');
        assert.equals('mini', steps[steps.length - 1].mode);
    });

    return suite;
}
