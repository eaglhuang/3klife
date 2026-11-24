/**
 * FriendshipActionEngine.test.ts — 友誼行為結算（PROG-2-9953，權重表 PROG-2-9866）
 *
 * 鎖住：權重表 36 項可解析、delta 結算與性格倍率（半數遠離 0）、每季次數上限與冷卻、
 * 玩家↔武將與武將↔武將配對分記、−100～100 夾制、事件 payload、存檔來回，
 * 以及 GameSession 掛點（穿戴賞賜、卸下剝奪）會發 FriendshipActionApplied。
 */
import { assert, TestSuite } from './TestRunner';
import { FriendshipService } from '../assets/scripts/core/services/FriendshipService';
import { FriendshipActionEngine, normalizeFriendshipActionTable, type FriendshipActionAppliedPayload } from '../assets/scripts/core/systems/FriendshipActionEngine';
import { GameSession, GAME_SESSION_EVENTS, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function loadTable() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'resources', 'data', 'friendship-action-weights.json'), 'utf-8')) as unknown;
    return { raw, table: normalizeFriendshipActionTable(raw)! };
}

function newEngine() {
    const service = new FriendshipService();
    const { table } = loadTable();
    return { service, engine: new FriendshipActionEngine(() => service, table) };
}

export function createFriendshipActionEngineSuite(): TestSuite {
    const suite = new TestSuite('FriendshipActionEngine (友誼行為結算 PROG-2-9953)');

    suite.test('權重表可解析：36 項、delta 整數且在 ±30 內', () => {
        const { table } = loadTable();
        const defs = Object.values(table.actions);
        assert.equals(defs.length, 36);
        assert.isTrue(defs.every((d) => Number.isInteger(d.delta) && Math.abs(d.delta) <= 30));
    });

    suite.test('加分行為：主將出戰 +8，寫進友誼表並回報 applied', () => {
        const { service, engine } = newEngine();
        const r = engine.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 1 });
        assert.isTrue(r.applied);
        assert.equals(r.delta, 8);
        assert.equals(service.get('G1'), 8);
    });

    suite.test('扣分行為：自告奮勇被拒 −8、剝奪寶物 −10', () => {
        const { service, engine } = newEngine();
        engine.apply({ actionId: 'admin_volunteer_rejected', generalId: 'G1', season: 1 });
        engine.apply({ actionId: 'equipment_strip_treasure', generalId: 'G1', season: 1 });
        assert.equals(service.get('G1'), -18);
    });

    suite.test('性格倍率：Brave 對 combat 1.5（8→12）；Loyal 對 combat 無倍率；半數遠離 0（−3×1.5→−5）', () => {
        const { engine } = newEngine();
        assert.equals(engine.apply({ actionId: 'combat_main_commander', generalId: 'B', season: 1, personality: 'Brave' }).delta, 12);
        assert.equals(engine.apply({ actionId: 'combat_main_commander', generalId: 'L', season: 1, personality: 'Loyal' }).delta, 8);
        assert.equals(engine.apply({ actionId: 'admin_post_mismatch', generalId: 'B', season: 1, personality: 'Brave' }).delta, -5);
    });

    suite.test('每季次數上限：同武將同行為本季第二次不計分；下一季恢復', () => {
        const { service, engine } = newEngine();
        engine.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 3 });
        const second = engine.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 3 });
        assert.isFalse(second.applied);
        assert.equals(second.reason ?? '', 'season-cap');
        assert.equals(service.get('G1'), 8);
        assert.isTrue(engine.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 4 }).applied);
    });

    suite.test('冷卻：combat_rescue_her 冷卻 1 季，隔一季被擋、隔兩季可用', () => {
        const { engine } = newEngine();
        assert.isTrue(engine.apply({ actionId: 'combat_rescue_her', generalId: 'G1', season: 5 }).applied);
        assert.equals(engine.apply({ actionId: 'combat_rescue_her', generalId: 'G1', season: 6 }).reason ?? '', 'cooldown');
        assert.isTrue(engine.apply({ actionId: 'combat_rescue_her', generalId: 'G1', season: 7 }).applied);
    });

    suite.test('未知 actionId 與沒載入權重表：不計分、不拋例外', () => {
        const { service, engine } = newEngine();
        assert.equals(engine.apply({ actionId: 'no_such', generalId: 'G1', season: 1 }).reason ?? '', 'unknown-action');
        const empty = new FriendshipActionEngine(() => service);
        assert.isFalse(empty.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 1 }).applied);
        assert.equals(service.get('G1'), 0);
    });

    suite.test('依對象分記：武將↔武將配對與玩家↔武將互不影響，配對與順序無關', () => {
        const { service, engine } = newEngine();
        engine.apply({ actionId: 'bonding_matchmaker_gift', generalId: 'A', season: 1 });
        const pair = engine.apply({ actionId: 'combat_victory_together', generalId: 'A', targetId: 'B', season: 1 });
        assert.equals(pair.targetId ?? '', 'B');
        assert.equals(service.get('A'), 7);
        assert.equals(service.getPair('A', 'B'), 5);
        assert.equals(service.getPair('B', 'A'), 5);
        assert.equals(service.get('B'), 0);
    });

    suite.test('夾制於 −100～100；次數照觸發計', () => {
        const { service, engine } = newEngine();
        service.add('G1', 98, 'seed');
        const r = engine.apply({ actionId: 'combat_main_commander', generalId: 'G1', season: 1 });
        assert.equals(service.get('G1'), 100);
        assert.equals(r.delta, 2);
        service.loadSnapshot({ G2: -98 });
        assert.equals(engine.apply({ actionId: 'equipment_strip_treasure', generalId: 'G2', season: 1 }).newValue, -100);
    });

    suite.test('監聽器收到 payload；例外不中斷結算；次數紀錄存檔來回後仍受限', () => {
        const { engine, service } = newEngine();
        const got: FriendshipActionAppliedPayload[] = [];
        engine.onApplied((p) => { got.push(p); });
        engine.onApplied(() => { throw new Error('boom'); });
        engine.apply({ actionId: 'reward_grant_treasure', generalId: 'G1', season: 2 });
        assert.equals(got.length, 1);
        assert.equals(got[0].actionId, 'reward_grant_treasure');
        const saved = engine.snapshot();
        const { table } = loadTable();
        const reloaded = new FriendshipActionEngine(() => service, table);
        reloaded.restore(saved);
        assert.equals(reloaded.apply({ actionId: 'reward_grant_treasure', generalId: 'G1', season: 2 }).reason ?? '', 'season-cap');
    });

    suite.test('FriendshipService 配對表：快照來回、壞值忽略', () => {
        const service = new FriendshipService();
        service.addPair('X', 'Y', 40, 't');
        const saved = service.exportPairs();
        const other = new FriendshipService();
        other.loadPairs({ ...saved, bad: Number.NaN });
        assert.equals(other.getPair('Y', 'X'), 40);
        assert.equals(Object.keys(other.exportPairs()).length, 1);
        assert.equals(service.addPair('X', 'X', 5, 't'), 0);
    });

    suite.test('GameSession 掛點：替武將穿戴＝賞賜加分、卸下＝剝奪扣分，並發 FriendshipActionApplied', () => {
        FriendshipService.resetInstance();
        const weapon = GEAR_DEFINITIONS.find((def) => def.slot === 'WEAPON')!.id;
        const session = new GameSession(4);
        session.setRosterStore(new InMemoryRosterStore([{ id: 'G1', name: 'G1', faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig]));
        (session as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [{
            Inventory_ID: 'W1', Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
            Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: weapon,
        } as InventoryRecord];
        session.setFriendshipWeights(loadTable().raw);
        const events: FriendshipActionAppliedPayload[] = [];
        session.setEventEmitter({ emit: (event: string, payload?: unknown) => { if (event === GAME_SESSION_EVENTS.FriendshipActionApplied) events.push(payload as FriendshipActionAppliedPayload); } });

        assert.isTrue(session.equipGear('W1', 'G1', 'WEAPON').ok);
        assert.isTrue(FriendshipService.getInstance().get('G1') > 0);
        assert.equals(events[0].actionId, 'reward_grant_equipment');
        const afterReward = FriendshipService.getInstance().get('G1');

        assert.isTrue(session.unequipGear('G1', 'WEAPON').ok);
        assert.isTrue(FriendshipService.getInstance().get('G1') < afterReward);
        assert.equals(events[1].actionId, 'equipment_strip_gear');
        FriendshipService.resetInstance();
    });

    return suite;
}
