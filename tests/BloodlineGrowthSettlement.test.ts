/**
 * BloodlineGrowthSettlement.test.ts — 歲末結算接血統成長事件（PROG-2-10059）
 * 鎖住：歲末排程（只排 9～11 歲、一次性、不重複）、待決佇列 normalize（舊存檔相容）、選擇結算（屬性／好感／銀兩／聲望／碎片／同窗好友）、
 * 失敗不改狀態（不在待決、無此選項、銀兩不足）、存檔讀回、family.growthEvents／family.resolveGrowthEvent 命令。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { emptyChildLedger, childFavorOf, CHILD_FAVOR_DEFAULT } from '../assets/scripts/core/systems/BloodlineChildLedger';
import { emptyBloodlineEventState, loadBloodlineY3Y5Events } from '../assets/scripts/core/systems/BloodlineY3Y5Events';
import {
    applyBloodlineEffectsToLedger,
    applyBloodlineStatDeltas,
    BLOODLINE_STAT_CAP,
    normalizeBloodlineGrowthSave,
    normalizePendingBloodlineEvents,
    queueBloodlineGrowthEvents,
    resolvePendingBloodlineEvent,
} from '../assets/scripts/core/systems/BloodlineGrowthSettlement';
import { DEFAULT_STARTER_SEEDLING_CONFIG } from '../assets/scripts/core/services/StarterSeedlingService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { FamilyGrowthEventsResult, FamilyResolveGrowthEventResult } from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';

const ROOT = join(__dirname, '..');
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8'));
const generals = readJson('generals') as GeneralConfig[];
const SEEDLING_ID = DEFAULT_STARTER_SEEDLING_CONFIG.childId;
const table = loadBloodlineY3Y5Events();

/** 新局並往後過 n 季（亂數固定，避免隨機事件干擾孩子） */
async function sessionAfterSeasons(seasons: number): Promise<{ session: GameSession; save: PlayerSaveService }> {
    const save = new PlayerSaveService(new MemoryStorageAdapter());
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(save);
    session.setAutoSave(false);
    session.setRandomSource(() => 0.99);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('family-config'));
    await session.startNewGameWithStarters(5, generals, {});
    for (let i = 0; i < seasons; i++) await session.advanceSeason();
    return { session, save };
}

const seedling = (session: GameSession): GeneralConfig => session.roster.find((g) => g.id === SEEDLING_ID)!;

export function createBloodlineGrowthSettlementSuite(): TestSuite {
    const suite = new TestSuite('BloodlineGrowthSettlement (歲末結算接成長事件 PROG-2-10059)');

    suite.test('歲末排程：只排 9～11 歲、同孩子同事件不重複、已觸發不再排、取整歲', () => {
        const state = emptyBloodlineEventState();
        const kids = [{ id: 'a', age: 9 }, { id: 'b', age: 8 }, { id: 'c', age: 12 }, { id: 'd', age: 10.75 }, { id: 'e' }];
        const first = queueBloodlineGrowthEvents(table, state, [], kids, 3);
        assert.equals(2, first.added.length);
        assert.equals('child_y3_stove_sugar', first.added.find((p) => p.childId === 'a')!.eventId);
        assert.equals('child_y4_academy_nap', first.added.find((p) => p.childId === 'd')!.eventId);
        assert.equals(3, first.added[0].year);
        const again = queueBloodlineGrowthEvents(table, state, first.pending, kids, 3);
        assert.equals(0, again.added.length, '已在佇列的不重複排');
        assert.equals(2, again.pending.length);
        const done = { records: [{ childId: 'a', eventId: 'child_y3_stove_sugar', optionId: 'A' as const, year: 3 }] };
        assert.equals(0, queueBloodlineGrowthEvents(table, done, [], [{ id: 'a', age: 9 }], 3).added.length, '已觸發過不再排');
    });

    suite.test('待決佇列 normalize：舊存檔缺欄位回空、壞資料丟棄、重複只留第一筆', () => {
        assert.equals(0, normalizePendingBloodlineEvents(undefined).length);
        assert.equals(0, normalizeBloodlineGrowthSave(undefined).pending.length);
        assert.equals(0, normalizeBloodlineGrowthSave({}).state.records.length);
        const clean = normalizePendingBloodlineEvents([{ childId: 'a', eventId: 'e1', year: 3 }, { childId: 'a', eventId: 'e1', year: 4 }, { childId: '', eventId: 'e1' }, null, { childId: 'b', eventId: 'e2' }]);
        assert.equals(2, clean.length);
        assert.equals(3, clean[0].year);
        assert.equals(0, clean[1].year);
    });

    suite.test('選擇結算（純邏輯）：必須在待決佇列；成功寫紀錄並移出佇列；失敗不改狀態', () => {
        const state = emptyBloodlineEventState();
        const pending = [{ childId: 'a', eventId: 'child_y3_stove_sugar', year: 3 }];
        const notPending = resolvePendingBloodlineEvent(table, state, pending, 'a', 'child_y4_academy_nap', 'A', 3);
        assert.isTrue(!notPending.ok && notPending.reason === 'not-pending');
        const badOption = resolvePendingBloodlineEvent(table, state, pending, 'a', 'child_y3_stove_sugar', 'Z', 3);
        assert.isTrue(!badOption.ok && badOption.reason === 'unknown-option');
        const ok = resolvePendingBloodlineEvent(table, state, pending, 'a', 'child_y3_stove_sugar', 'B', 3);
        assert.isTrue(ok.ok);
        if (!ok.ok) return;
        assert.equals(0, ok.pending.length);
        assert.equals(1, ok.state.records.length);
        assert.equals('B', ok.state.records[0].optionId);
        assert.equals(1, pending.length, '傳入的佇列不被改動');
        assert.equals(0, state.records.length, '傳入的狀態不被改動');
    });

    suite.test('效果落地（純邏輯）：好感、碎片、同窗好友入帳；屬性加減夾在 0~100', () => {
        const ledger = applyBloodlineEffectsToLedger(emptyChildLedger(), 'a', { favor: 5, epithetFragments: 1, friendUnlocked: true, silver: -50, prestige: 3 });
        assert.equals(CHILD_FAVOR_DEFAULT + 5, childFavorOf(ledger, 'a'));
        assert.equals(1, ledger.epithetFragments);
        assert.equals(1, ledger.classmateFriends.a);
        const down = applyBloodlineEffectsToLedger(emptyChildLedger(), 'a', { favor: -2 });
        assert.equals(CHILD_FAVOR_DEFAULT - 2, childFavorOf(down, 'a'));
        const stats = { str: 99, int: 0, lea: 10, pol: 10, cha: 10 };
        const up = applyBloodlineStatDeltas(stats, { str: 5, int: -3, pol: 1 });
        assert.equals(BLOODLINE_STAT_CAP, up!.str);
        assert.equals(0, up!.int);
        assert.equals(11, up!.pol);
        assert.isTrue(applyBloodlineStatDeltas(stats, { favor: 3 }) === null, '沒有屬性效果回 null');
    });

    suite.test('新局第 2 年底（幼苗 9 歲）排出第 3 年事件；第 1 年底還沒有', async () => {
        const { session } = await sessionAfterSeasons(0);
        for (let i = 0; i < 3; i++) await session.advanceSeason();
        const y1 = await session.advanceSeason();
        assert.equals(8, seedling(session).age);
        assert.equals(0, session.pendingBloodlineEvents().length);
        assert.isTrue(y1.growthEventsQueued === undefined);
        for (let i = 0; i < 3; i++) await session.advanceSeason();
        const y2 = await session.advanceSeason();
        assert.equals(9, seedling(session).age);
        const queued = y2.growthEventsQueued ?? [];
        assert.equals(1, queued.filter((p) => p.childId === SEEDLING_ID).length);
        assert.equals('child_y3_stove_sugar', queued.find((p) => p.childId === SEEDLING_ID)!.eventId);
        assert.equals(1, session.pendingBloodlineEvents().filter((p) => p.childId === SEEDLING_ID).length);
    });

    suite.test('選第 3 年事件 B：好感 +5、碎片 +1、紀錄寫入、佇列清掉；再選一次被擋', async () => {
        const { session } = await sessionAfterSeasons(8);
        const before = session.childFavor(SEEDLING_ID);
        const out = session.resolveBloodlineEvent(SEEDLING_ID, 'child_y3_stove_sugar', 'B');
        assert.isTrue(out.ok);
        assert.equals(before + 5, session.childFavor(SEEDLING_ID));
        assert.equals(1, session.childLedger().epithetFragments);
        assert.equals(0, session.pendingBloodlineEvents().length);
        assert.equals('B', session.bloodlineEventRecords()[0].optionId);
        const second = session.resolveBloodlineEvent(SEEDLING_ID, 'child_y3_stove_sugar', 'A');
        assert.isTrue(!second.ok && second.reason === 'not-pending');
        assert.equals(before + 5, session.childFavor(SEEDLING_ID), '第二次不再入帳');
    });

    suite.test('選第 3 年事件 A：屬性 +1（寫回名冊）、好感 -2', async () => {
        const { session } = await sessionAfterSeasons(8);
        const polBefore = seedling(session).pol ?? 0;
        const favorBefore = session.childFavor(SEEDLING_ID);
        assert.isTrue(session.resolveBloodlineEvent(SEEDLING_ID, 'child_y3_stove_sugar', 'A').ok);
        assert.equals(polBefore + 1, seedling(session).pol);
        assert.equals(polBefore + 1, seedling(session).stats?.pol);
        assert.equals(favorBefore - 2, session.childFavor(SEEDLING_ID));
    });

    suite.test('第 4 年事件 A 扣 50 銀兩（走銀兩帳本）；銀兩不足整件不生效、待決保留', async () => {
        const { session } = await sessionAfterSeasons(12);
        assert.isTrue(session.pendingBloodlineEvents().some((p) => p.eventId === 'child_y4_academy_nap'));
        const poor = session.silverLedger.silverBalance();
        assert.isTrue(session.silverLedger.spendSilver(poor - 10));
        const intBefore = seedling(session).int ?? 0;
        const refused = session.resolveBloodlineEvent(SEEDLING_ID, 'child_y4_academy_nap', 'A');
        assert.isTrue(!refused.ok && refused.reason === 'silver-low');
        assert.equals(10, session.silverLedger.silverBalance(), '銀兩不變');
        assert.equals(intBefore, seedling(session).int, '屬性不變');
        assert.isTrue(session.pendingBloodlineEvents().some((p) => p.eventId === 'child_y4_academy_nap'), '待決保留');
        session.silverLedger.creditSilver(poor);
        const rich = session.silverLedger.silverBalance();
        const ok = session.resolveBloodlineEvent(SEEDLING_ID, 'child_y4_academy_nap', 'A');
        assert.isTrue(ok.ok);
        assert.equals(rich - 50, session.silverLedger.silverBalance());
        assert.equals(intBefore + 1, seedling(session).int);
        if (ok.ok) assert.equals(50, ok.result.silverSpent);
    });

    suite.test('第 5 年事件：A 屬性 +1 與家族聲望 +3；B 屬性 +1 與同窗好友', async () => {
        const a = await sessionAfterSeasons(16);
        const prestige = a.session.clanPrestige;
        const strBefore = seedling(a.session).str ?? 0;
        assert.isTrue(a.session.resolveBloodlineEvent(SEEDLING_ID, 'child_y5_push_cart', 'A').ok);
        assert.equals(prestige + 3, a.session.clanPrestige);
        assert.equals(strBefore + 1, seedling(a.session).str);
        const b = await sessionAfterSeasons(16);
        const chaBefore = seedling(b.session).cha ?? 0;
        assert.isTrue(b.session.resolveBloodlineEvent(SEEDLING_ID, 'child_y5_push_cart', 'B').ok);
        assert.equals(chaBefore + 1, seedling(b.session).cha);
        assert.equals(1, b.session.childLedger().classmateFriends[SEEDLING_ID]);
    });

    suite.test('每名孩子每年最多排一件：沒選的事件留著，隔年只新增當年那件', async () => {
        const { session } = await sessionAfterSeasons(12);
        const mine = session.pendingBloodlineEvents().filter((p) => p.childId === SEEDLING_ID);
        assert.equals(2, mine.length);
        assert.equals(2, new Set(mine.map((p) => p.year)).size, '兩件分屬不同年');
    });

    suite.test('存檔讀回：待決佇列與已觸發紀錄都在；舊存檔沒有欄位讀回空', async () => {
        const { session, save } = await sessionAfterSeasons(12);
        assert.isTrue(session.resolveBloodlineEvent(SEEDLING_ID, 'child_y3_stove_sugar', 'B').ok);
        await session.save();
        const loaded = new GameSession(9);
        loaded.setRosterStore(new InMemoryRosterStore());
        loaded.setSaveService(save);
        assert.isTrue(await loaded.load());
        assert.equals(1, loaded.bloodlineEventRecords().length);
        assert.equals('child_y4_academy_nap', loaded.pendingBloodlineEvents()[0].eventId);
        assert.equals(1, loaded.childLedger().epithetFragments);

        const snapshot = JSON.parse(JSON.stringify(await save.load())) as Record<string, unknown>;
        assert.isTrue('bloodlineGrowthEvents' in snapshot, '新存檔帶成長事件欄位');
        delete snapshot.bloodlineGrowthEvents;
        const oldStorage = new PlayerSaveService(new MemoryStorageAdapter());
        await oldStorage.save(snapshot as never);
        const old = new GameSession(9);
        old.setRosterStore(new InMemoryRosterStore());
        old.setSaveService(oldStorage);
        assert.isTrue(await old.load());
        assert.equals(0, old.pendingBloodlineEvents().length);
        assert.equals(0, old.bloodlineEventRecords().length);
    });

    suite.test('命令：family.growthEvents 列待決；family.resolveGrowthEvent 結算；錯誤碼與禁帶欄位', async () => {
        const { session } = await sessionAfterSeasons(8);
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        const unbound = await bundle.api.query<FamilyGrowthEventsResult>('family.growthEvents', {});
        assert.isTrue(isApiFail(unbound) && unbound.errorCode === 'E360');
        bundle.setChildGrowthHost(session.childGrowthHost);
        let seq = 0;
        const cmd = (args: Record<string, unknown>) => bundle.api.cmd<FamilyResolveGrowthEventResult>('family.resolveGrowthEvent', args, { idemKey: `g:${seq++}` });

        const list = await bundle.api.query<FamilyGrowthEventsResult>('family.growthEvents', {});
        assert.isTrue(!isApiFail(list));
        const view = (list as { result: FamilyGrowthEventsResult }).result.pending.find((p) => p.childId === SEEDLING_ID)!;
        assert.equals('child_y3_stove_sugar', view.eventId);
        assert.equals(2, view.options.length);
        assert.equals('bloodline.event.y3.title', view.titleKey);

        const extra = await cmd({ childId: SEEDLING_ID, eventId: view.eventId, optionId: 'B', favor: 99 });
        assert.isTrue(isApiFail(extra) && extra.errorCode === 'E103', '不得自帶數值');
        const badOption = await cmd({ childId: SEEDLING_ID, eventId: view.eventId, optionId: 'Z' });
        assert.isTrue(isApiFail(badOption) && badOption.errorCode === 'E371');
        const notPending = await cmd({ childId: SEEDLING_ID, eventId: 'child_y5_push_cart', optionId: 'A' });
        assert.isTrue(isApiFail(notPending) && notPending.errorCode === 'E370');

        const favorBefore = session.childFavor(SEEDLING_ID);
        const ok = await cmd({ childId: SEEDLING_ID, eventId: view.eventId, optionId: 'B' });
        assert.isTrue(!isApiFail(ok));
        const result = (ok as { result: FamilyResolveGrowthEventResult }).result;
        assert.equals('B', result.optionId);
        assert.equals(5, result.effects.favor);
        assert.equals(favorBefore + 5, session.childFavor(SEEDLING_ID));
        const after = await bundle.api.query<FamilyGrowthEventsResult>('family.growthEvents', {});
        assert.equals(0, (after as { result: FamilyGrowthEventsResult }).result.pending.length);
    });

    return suite;
}
