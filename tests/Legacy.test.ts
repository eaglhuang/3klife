/**
 * Legacy.test.ts — 退役、死亡歸檔、季結排程與「祖→父→子」三代循環 headless 測試（PROG-2-0029）
 *
 * Unity 對照：等同 EditMode Test，不開 Scene，直接驗證純 C# 的世代傳承流程。
 */
import { TestSuite, assert } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore, SeasonAdvancedPayload } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { LegacyError, LegacyService, STORE_MENTOR_CARDS } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

type TestGeneral = BreedingGeneral & AgingGeneral;

function makeGeneral(id: string, gender: '男' | '女', age: number, extra: Partial<TestGeneral> = {}): TestGeneral {
    return {
        id,
        name: id,
        faction: 'shu',
        gender,
        age,
        hp: 1000,
        vitality: 100,
        maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as TestGeneral;
}

async function assertRejects(fn: () => Promise<unknown>, message: string): Promise<void> {
    let threw = false;
    try {
        await fn();
    } catch (error) {
        threw = error instanceof LegacyError;
    }
    assert.isTrue(threw, message);
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): { session: GameSession; legacy: LegacyService; events: Array<[string, unknown]> } {
    const session = new GameSession();
    const legacy = new LegacyService(adapter);
    const events: Array<[string, unknown]> = [];
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(legacy);
    session.setEventEmitter({ emit: (name, payload) => events.push([name, payload]) });
    session.setRandomSource(() => 0);
    return { session, legacy, events };
}

async function advanceUntil(session: GameSession, stop: (payload: SeasonAdvancedPayload) => boolean, limit = 400): Promise<SeasonAdvancedPayload> {
    for (let i = 0; i < limit; i++) {
        const payload = await session.advanceSeason();
        if (stop(payload)) return payload;
    }
    throw new Error(`推進 ${limit} 季仍未達成條件`);
}

export function createLegacySuite(): TestSuite {
    const suite = new TestSuite('Legacy (退役 / 死亡歸檔 / 三代傳承)');

    suite.test('新邏輯檔案不 import cc', () => {
        const files = [
            'assets/scripts/core/services/LegacyService.ts',
            'assets/scripts/core/models/MentorCard.ts',
            'assets/scripts/core/managers/GameSession.ts',
        ];
        for (const file of files) {
            const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
            assert.isFalse(/from\s+['"]cc['"]/.test(text), `${file} 不應 import cc`);
        }
    });

    suite.test('退役：未滿 65 歲、已故、已退役、不在名冊都拒絕', async () => {
        const { session } = createSession(new MemoryStorageAdapter(), [
            makeGeneral('young', '男', 64.5),
            makeGeneral('gone', '男', 70, { status: 'dead' }),
            makeGeneral('old', '男', 65),
        ]);
        await assertRejects(() => session.retireGeneral('young'), '未滿 65 歲不可退役');
        await assertRejects(() => session.retireGeneral('gone'), '已故不可退役');
        await assertRejects(() => session.retireGeneral('nobody'), '不在名冊不可退役');
        await session.retireGeneral('old');
        await assertRejects(() => session.retireGeneral('old'), '不可重複退役');
    });

    suite.test('退役：產生教官傳承資料、不產生英靈卡、武將留在名冊並標記', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, legacy, events } = createSession(adapter, [makeGeneral('old', '男', 66, { fatherId: 'f', motherId: 'm', ep: 77 })]);
        const card = await session.retireGeneral('old');

        assert.equals('mentor-old', card.uid);
        assert.equals('Retire', card.source!, '退役轉化的教官卡標記為 Retire');
        assert.equals(66, card.retiredAge);
        assert.equals(77, card.ep_snapshot);
        assert.equals('f', card.parentUids[0]);
        const stored = await adapter.get<MentorCard[]>(STORE_MENTOR_CARDS);
        assert.equals(1, stored!.length);
        assert.equals(0, (await legacy.getArchiver().getAllSpiritCards()).length);
        assert.isTrue((session.roster[0] as BreedingGeneral).isMentorCard === true, '名冊內武將應標記為教官');
        assert.isTrue(events.some(([name]) => name === GAME_SESSION_EVENTS.GeneralRetired));
        assert.isTrue(events.every(([name]) => name !== GAME_SESSION_EVENTS.SpiritCardCreated));
        assert.isTrue(await adapter.get('player.save') !== null, '退役後應自動存檔');
    });

    suite.test('退役分流（FATE-08）：武職→戰技教官、文職→智識教官、雙職能→全能教官、未定職能→UNKNOWN_CLASS', async () => {
        const { session } = createSession(new MemoryStorageAdapter(), [
            makeGeneral('warrior', '男', 66, { primaryClass: 'Warrior' } as Partial<TestGeneral>),
            makeGeneral('scholar', '男', 66, { primaryClass: 'Scholar' } as Partial<TestGeneral>),
            makeGeneral('dual', '男', 66, { primaryClass: 'Warrior', subClass: 'Scholar' } as Partial<TestGeneral>),
            makeGeneral('unknown', '男', 66),
        ]);
        const warrior = await session.retireGeneral('warrior');
        const scholar = await session.retireGeneral('scholar');
        const dual = await session.retireGeneral('dual');
        const unknown = await session.retireGeneral('unknown');

        assert.equals('tactic_mentor', warrior.mentorRoute!.destination);
        assert.equals('WARRIOR', warrior.mentorRoute!.reason);
        assert.equals('wisdom_mentor', scholar.mentorRoute!.destination);
        assert.equals('SCHOLAR', scholar.mentorRoute!.reason);
        assert.equals('all_round_mentor', dual.mentorRoute!.destination);
        assert.equals('DUAL_CLASS', dual.mentorRoute!.reason);
        assert.equals('UNKNOWN_CLASS', unknown.mentorRoute!.reason);
    });

    suite.test('一般角色死亡：建立快照而非英靈卡、寫入 L5、教官保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, legacy, events } = createSession(adapter, [
            makeGeneral('elder', '男', 70, { maxLifespan: 70 }),
            makeGeneral('bystander', '男', 30),
        ]);
        await session.retireGeneral('elder');
        const payload = await advanceUntil(session, (p) => p.agingEvents.some((e) => e.type === 'died'));

        assert.equals(0, payload.lifecycle!.spiritCards.length);
        assert.equals(1, payload.lifecycle!.archivedSnapshots!.length);
        const card = payload.lifecycle!.archivedSnapshots![0];
        assert.equals('elder', card.uid);
        assert.equals('age', card.deathContext.cause);
        assert.isTrue(session.roster.every((g) => g.id !== 'elder'), '死者應離開名冊');
        assert.equals(1, session.roster.length);
        const archiver = legacy.getArchiver();
        assert.equals('elder', (await archiver.getSpiritCard('elder'))!.uid);
        assert.equals('elder', (await archiver.getArchivedGeneral('elder'))!['id'] as string);
        assert.equals(1, (await legacy.getMentorCards()).length, '退役後再死亡，教官資料仍保留');
        assert.isTrue(events.every(([name]) => name !== GAME_SESSION_EVENTS.SpiritCardCreated));
    });

    suite.test('死亡：有存活後代 → C 類（進待刪隔離）；無後代 → D 類', async () => {
        const { session, legacy } = createSession(new MemoryStorageAdapter(), [
            makeGeneral('dad', '男', 80, { maxLifespan: 70 }),
            makeGeneral('kid', '男', 10, { fatherId: 'dad', motherId: 'mom' }),
            makeGeneral('lonely', '男', 80, { maxLifespan: 70 }),
        ]);
        const payload = await session.advanceSeason();
        const byUid = new Map(payload.lifecycle!.archivedSnapshots!.map((c) => [c.uid, c]));
        assert.equals('C', byUid.get('dad')!.lifecycleClass as string);
        assert.equals('D', byUid.get('lonely')!.lifecycleClass as string);
        assert.equals(2, (await legacy.getArchiver().getAllSpiritCards()).length);
    });

    suite.test('季結：每季跑 onSeasonEnd，跨年那一季另跑 onYearEnd', async () => {
        const { session } = createSession(new MemoryStorageAdapter(), [makeGeneral('a', '男', 20)]);
        const results: SeasonAdvancedPayload[] = [];
        for (let i = 0; i < 5; i++) results.push(await session.advanceSeason());

        assert.equals(1, results[0].lifecycle!.seasonEnd!.season);
        assert.equals(4, results[3].lifecycle!.seasonEnd!.season);
        assert.equals(1, results[3].lifecycle!.seasonEnd!.year);
        assert.equals(2, results[4].lifecycle!.seasonEnd!.year);
        assert.isTrue(results[0].lifecycle!.yearEnd === null, '年中不應跑年底壓縮');
        assert.equals(1, results[3].lifecycle!.yearEnd!.year);
        assert.isTrue(results[4].lifecycle!.yearEnd === null);
    });

    suite.test('未掛 SeasonLifecycle 時行為與舊版相同（死者仍留在名冊標記 dead）', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('elder', '男', 80, { maxLifespan: 70 })]));
        session.setRandomSource(() => 0);
        const payload = await session.advanceSeason();
        assert.isTrue(payload.lifecycle === undefined);
        assert.equals('dead', session.roster[0].status as string);
        let threw = false;
        try {
            await session.retireGeneral('elder');
        } catch {
            threw = true;
        }
        assert.isTrue(threw, '未掛 lifecycle 不可退役');
    });

    suite.test('MVP 驗收：祖→父→子三代循環（結緣 → 長大 → 退役 → 死亡歸檔 → 存檔重讀）', async () => {
        const adapter = new MemoryStorageAdapter();
        const graph = new BloodlineGraph();
        const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [], ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({ version: 't', updatedAt: 't', persons: ['grandpa', 'grandma', 'wife'].map(person), links: [] });

        const grandpa = makeGeneral('grandpa', '男', 25, { maxLifespan: 66 });
        const grandma = makeGeneral('grandma', '女', 25, { maxLifespan: 95 });
        const { session, events } = createSession(adapter, []);
        // BreedingService 與 GameSession 必須共用同一個名冊，否則結緣寫入的子嗣會被季結覆蓋
        const store = new InMemoryRosterStore([grandpa, grandma]);
        session.setRosterStore(store);
        const breeding = new BreedingService(store, graph, { random: () => 0, currentSeason: () => session.gameTime.totalSeasonsElapsed });

        // 滿 5 歲的子嗣由 GameSession 每季自動開獎（PROG-2-0028），不再需要替身
        const nextSeason = async (): Promise<SeasonAdvancedPayload> => {
            const payload = await session.advanceSeason();
            breeding.advanceSeason();
            return payload;
        };

        // 第一代：祖父母結緣 → 父
        const first = breeding.breed('grandpa', 'grandma');
        assert.equals('conceived', first.outcome);
        const dadId = first.child!.id;

        // 父長到 20 歲（80 季），娶外來的 wife，生子
        for (let i = 0; i < 80; i++) await nextSeason();
        const dad = store.getAll().find((g) => g.id === dadId)!;
        assert.equals(20, dad.age as number);
        assert.equals('Unveiled', dad.status as string);
        store.replaceAll([...store.getAll(), makeGeneral('wife', '女', 22)]);
        const second = breeding.breed(dadId, 'wife');
        assert.equals('conceived', second.outcome);
        const sonId = second.child!.id;
        const chain = second.child!.ancestor_chain ?? [];
        assert.isTrue(chain.includes('grandpa') && chain.includes('grandma'), `子嗣祖譜應含祖父母：${chain.join(',')}`);

        // 祖父在 65 歲跨過退役門檻 → 玩家決定退役 → 轉教官
        await advanceUntil(session, (p) => p.agingEvents.some((e) => e.type === 'reached-retirement-age' && e.generalId === 'grandpa'));
        const mentor = await session.retireGeneral('grandpa');
        assert.equals('mentor-grandpa', mentor.uid);
        assert.equals(0, (await new LegacyService(adapter).getArchiver().getAllSpiritCards()).length, '退役不產生英靈卡');

        // 非名將祖父死亡 → 僅歸檔快照，父與子仍在名冊
        const death = await advanceUntil(session, (p) => p.agingEvents.some((e) => e.type === 'died' && e.generalId === 'grandpa'));
        const spirit: SpiritCard = death.lifecycle!.archivedSnapshots!.find((c) => c.uid === 'grandpa')!;
        assert.equals('C', spirit.lifecycleClass as string);
        const ids = session.roster.map((g) => g.id);
        assert.isFalse(ids.includes('grandpa'), '祖父應離開名冊');
        assert.isTrue(ids.includes(dadId) && ids.includes(sonId), '父與子應仍在名冊');
        assert.isTrue(events.every(([name]) => name !== GAME_SESSION_EVENTS.SpiritCardCreated));

        // 存檔 → 另起一個 session 讀回，三代資料完整
        const reloaded = new GameSession();
        reloaded.setRosterStore(new InMemoryRosterStore());
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        const reloadedIds = reloaded.roster.map((g) => g.id);
        assert.isTrue(reloadedIds.includes(dadId) && reloadedIds.includes(sonId) && !reloadedIds.includes('grandpa'));
        const reloadedLegacy = new LegacyService(adapter);
        assert.equals('grandpa', (await reloadedLegacy.getArchiver().getSpiritCard('grandpa'))!.uid);
        assert.equals(1, (await reloadedLegacy.getMentorCards()).length);
        assert.equals(reloaded.gameTime.totalSeasonsElapsed, session.gameTime.totalSeasonsElapsed);
    });

    return suite;
}
