/**
 * DaughterRouteFlow.test.ts — 女兒及笄接線（PROG-2-1787）
 *
 * 鎖住：結緣生女才登記、年末推進與事件、死去的女兒不再問、選路線同步名冊、彈窗節點對得上。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { DaughterRoutePopupController } from '../assets/scripts/ui/core/DaughterRoutePopupController';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, gender: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: `${id}名`, faction: 'player', gender, age, role: 'Combat', ...extra } as unknown as GeneralConfig;
}

function build(roster: GeneralConfig[]): { session: GameSession; store: InMemoryRosterStore; emitted: Array<{ name: string; payload: unknown }> } {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0);
    const emitted: Array<{ name: string; payload: unknown }> = [];
    session.setEventEmitter({ emit: (name, payload) => emitted.push({ name, payload }) });
    return { session, store, emitted };
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectIds(c as { id?: string; children?: unknown[] }, out);
    return out;
}

export function createDaughterRouteFlowSuite(): TestSuite {
    const suite = new TestSuite('DaughterRouteFlow (女兒及笄接線 PROG-2-1787)');

    suite.test('出生登記：只登記女兒，歲數取自名冊，重複呼叫不重複', async () => {
        const { session } = build([person('girl', '女', 0), person('boy', '男', 0)]);
        await session.recordBreedingRelations('f', 'm', 'girl');
        await session.recordBreedingRelations('f', 'm', 'girl');
        await session.recordBreedingRelations('f', 'm', 'boy');
        assert.equals('girl', session.daughters.map((d) => d.id).join(','));
        assert.equals(0, session.daughters[0].age);
    });

    suite.test('年末：13 歲女兒滿 14 歲發事件；前三季不發，下一年也不再發', async () => {
        const { session, emitted } = build([person('girl', '女', 13)]);
        await session.addDaughter({ id: 'girl', age: 13, role: null });
        const count = () => emitted.filter((e) => e.name === GAME_SESSION_EVENTS.DaughterComingOfAge).length;
        await session.advanceSeason();
        await session.advanceSeason();
        await session.advanceSeason();
        assert.equals(0, count());
        assert.equals(13, session.daughters[0].age);
        await session.advanceSeason();
        assert.equals(1, count());
        assert.equals(14, session.daughters[0].age);
        assert.equals('girl名', (emitted.find((e) => e.name === GAME_SESSION_EVENTS.DaughterComingOfAge)!.payload as Array<{ name: string }>)[0].name);
        await session.advanceYear();
        assert.equals(1, count());
    });

    suite.test('年齡和名冊武將同步：滿一年武將也長一歲', async () => {
        const { session, store } = build([person('girl', '女', 13)]);
        await session.addDaughter({ id: 'girl', age: 13, role: null });
        await session.advanceYear();
        assert.equals(14, session.daughters[0].age);
        assert.equals(14, store.getAll().find((g) => g.id === 'girl')!.age);
    });

    suite.test('死去的女兒與不在名冊的女兒都不問', async () => {
        const { session } = build([person('dead', '女', 14, { status: GENERAL_STATUS_DEAD }), person('live', '女', 14)]);
        await session.addDaughter({ id: 'dead', age: 14, role: null });
        await session.addDaughter({ id: 'gone', age: 14, role: null });
        await session.addDaughter({ id: 'live', age: 14, role: null });
        assert.equals('live', session.daughtersAwaitingChoice.map((d) => d.id).join(','));
    });

    suite.test('選路線：教官儲備同步名冊職能；後宮女官維持出生時的職能', async () => {
        const { session, store } = build([person('a', '女', 14), person('b', '女', 14)]);
        await session.addDaughter({ id: 'a', age: 14, role: null });
        await session.addDaughter({ id: 'b', age: 14, role: null });
        assert.equals(2, session.daughtersAwaitingChoice.length);
        await session.assignDaughterRouteFor('a', 'instructor');
        await session.assignDaughterRouteFor('b', 'palace');
        const role = (id: string) => store.getAll().find((g) => g.id === id)!.role;
        assert.equals('Mentor', role('a'));
        assert.equals('Combat', role('b'));
        assert.equals(0, session.daughtersAwaitingChoice.length);
    });

    suite.test('彈窗流程：台詞用 §G，選完換下一位，選完全部顯示空畫面', async () => {
        const { session } = build([person('a', '女', 14), person('b', '女', 14)]);
        await session.addDaughter({ id: 'a', age: 14, role: null });
        await session.addDaughter({ id: 'b', age: 14, role: null });
        const popup = new DaughterRoutePopupController({ session });
        assert.isTrue(popup.hasPending());
        assert.equals('a名 今日及笄，主公請為她選擇前路。', popup.getView().texts.drLine);
        assert.isFalse(popup.getView().actives.drEmptyHint);
        assert.equals('1 / 2', popup.getView().texts.drPager);
        popup.cycle(1);
        assert.equals('b名 今日及笄，主公請為她選擇前路。', popup.getView().texts.drLine);
        popup.cycle(1);
        assert.isTrue(await popup.choose('frontline'));
        assert.equals('a名 擇定前路：前線武將。', popup.getView().texts.drNotice);
        assert.equals('b名 今日及笄，主公請為她選擇前路。', popup.getView().texts.drLine);
        await popup.choose('palace');
        const empty = popup.getView();
        assert.isFalse(popup.hasPending());
        assert.isFalse(empty.actives.drPanel);
        assert.isTrue(empty.actives.drEmptyHint);
        assert.equals('關閉', empty.texts.closeDrLabel);
        assert.equals('b名 擇定前路：後宮女官。', empty.texts.drNotice);
        assert.isFalse(empty.enabled.btnFrontline);
    });

    suite.test('view key 全部對得到 daughter-route-main 的節點 id，screen 指向自己的 layout 與 skin', async () => {
        const dir = path.resolve(__dirname, '../assets/resources/ui-spec');
        const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
        const ids = collectIds(read('layouts/daughter-route-main.json').root, new Set<string>());
        const { session } = build([]);
        const view = new DaughterRoutePopupController({ session }).getView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key), `layout 缺節點 ${key}`);
        }
        const screen = read('screens/daughter-route-screen.json');
        assert.equals('daughter-route-main', screen.layout);
        assert.equals('daughter-route-screen.skin', screen.skin);
        assert.isTrue(fs.existsSync(path.join(dir, 'skins/daughter-route-screen.skin.json')));
    });

    return suite;
}
