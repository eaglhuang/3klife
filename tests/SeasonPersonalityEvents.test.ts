// @spec-source → 大廳季度推進時間發動機與武將性格事件狀態機規格書.md (doc_spec_1169) §二-2、§四；PROG-2-2201（LOOP-01）
/**
 * SeasonPersonalityEvents.test.ts — 換季武將性格事件：抽籤、選項效果、存讀檔、彈窗。
 *
 * Unity 對照：EditMode Test，驗事件表與 session 結算，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    normalizeSeasonPersonalityState,
    rollSeasonPersonalityEvents,
    seasonEventArchetypeOf,
    seasonEventFarmMultiplier,
    strAfterExp,
    type SeasonEventInstance,
} from '../assets/scripts/core/systems/SeasonPersonalityEvents';
import { SeasonEventPopupController, seasonEventView } from '../assets/scripts/ui/core/SeasonEventPopupController';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 50, int: 50, cha: 50, luk: 10, ...extra } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setGovernanceEventRandom(() => 0.99);
    return session;
}

function wallet(start: number) {
    const w = { amount: start, gold: () => w.amount, spendGold: (n: number) => { if (n > w.amount) return false; w.amount -= n; return true; } };
    return w;
}

function layoutIds(): Set<string> {
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        (node.children ?? []).forEach((c) => walk(c as { id?: string; children?: unknown[] }));
    };
    walk(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/ui-spec/layouts/season-event-main.json'), 'utf8')).root);
    return ids;
}

export function createSeasonPersonalityEventsSuite(): TestSuite {
    const suite = new TestSuite('SeasonPersonalityEvents');

    suite.test('性格對應事件：豪爽索酒、謀士修堤、戰狂苦練、仁者施粥，貪玩沒有事件', () => {
        assert.equals('Brave', seasonEventArchetypeOf(general('zhang-fei')));
        assert.equals('Wise', seasonEventArchetypeOf(general('zhuge-liang')));
        assert.equals('Warlike', seasonEventArchetypeOf(general('lu-bu')));
        assert.equals('Benevolent', seasonEventArchetypeOf(general('guan-yu')));
        assert.isTrue(seasonEventArchetypeOf(general('cao-zhi')) === null);
        const state = rollSeasonPersonalityEvents([general('zhang-fei'), general('cao-zhi')], 3, () => 0.99);
        assert.equals(1, state.pending.length, '0.99 只抽 1 起');
        assert.equals('FEAST_REQUEST', state.pending[0].eventId);
    });

    suite.test('抽 2 起時不重複事件；死亡、未成年、教官卡不會被抽', () => {
        const roster = [
            general('zhang-fei'), general('xu-chu'), general('zhuge-liang'),
            general('lu-bu', { status: 'dead' }), general('guan-yu', { age: 10 }), general('sima-yi', { isMentorCard: true }),
        ];
        const state = rollSeasonPersonalityEvents(roster, 4, () => 0);
        assert.equals(2, state.pending.length);
        assert.isTrue(state.pending[0].eventId !== state.pending[1].eventId);
        assert.isFalse(state.pending.some((e) => ['lu-bu', 'guan-yu', 'sima-yi'].includes(e.generalId)));
        assert.equals(0, rollSeasonPersonalityEvents([general('cao-zhi')], 4, () => 0).pending.length);
    });

    suite.test('武力經驗折武力：每 10 點 1 點，上限 100', () => {
        assert.equals(52, strAfterExp(50, 20));
        assert.equals(51, strAfterExp(50, 19));
        assert.equals(100, strAfterExp(99, 20));
        assert.equals(105, strAfterExp(105, 20), '原本超過上限不倒扣');
    });

    suite.test('換季抽到軍中索酒：撥款扣 50 銅錢、忠誠 +10；銅錢不足拒絕且不動資源', async () => {
        const session = setup([general('zhang-fei')]);
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        assert.equals('FEAST_REQUEST', session.pendingSeasonEvent?.eventId);
        const poor = wallet(10);
        const rejected = await session.resolveSeasonEvent(0, poor);
        assert.isFalse(rejected.ok);
        assert.equals(10, poor.amount);
        assert.equals('FEAST_REQUEST', session.pendingSeasonEvent?.eventId, '付不起時事件還在');
        const rich = wallet(500);
        const before = session.tallyLoyalty['zhang-fei']?.loyalty ?? 50;
        const result = await session.resolveSeasonEvent(0, rich);
        assert.isTrue(result.ok);
        assert.equals(450, rich.amount);
        assert.equals(before + 10, session.tallyLoyalty['zhang-fei']?.loyalty);
        assert.isTrue(session.pendingSeasonEvent === null);
    });

    suite.test('校場苦練：親往校閱武力經驗 +20 折成武力 +2', async () => {
        const session = setup([general('lu-bu', { str: 90 })]);
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        assert.equals('DRILL_TRAINING', session.pendingSeasonEvent?.eventId);
        assert.isTrue((await session.resolveSeasonEvent(0, wallet(0))).ok);
        assert.equals(92, session.roster.find((g) => g.id === 'lu-bu')?.str);
    });

    suite.test('預修水利：批准後本季免蝗災、農耕 +15%，存讀檔後仍有效，下一季恢復', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('zhuge-liang')], adapter);
        session.setGovernanceEventRandom(() => 0);
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        assert.equals('locust', session.activeGovernanceEvent?.id);
        assert.equals('LEVEE_REPAIR', session.pendingSeasonEvent?.eventId);
        const w = wallet(100);
        assert.isTrue((await session.resolveSeasonEvent(0, w)).ok);
        assert.equals(0, w.amount);
        assert.isTrue(session.activeGovernanceEvent === null, '免受天災');
        assert.equals(1.15, session.domesticOutputMultiplier('farming'));
        assert.equals(1, session.domesticOutputMultiplier('commerce'));
        await session.save();
        const reloaded = setup([general('zhuge-liang')], adapter);
        await reloaded.load();
        assert.equals(1.15, reloaded.domesticOutputMultiplier('farming'));
        reloaded.setGovernanceEventRandom(() => 0.99);
        reloaded.setSeasonEventRandom(() => 0.99);
        await reloaded.advanceSeason();
        assert.equals(1, reloaded.domesticOutputMultiplier('farming'));
    });

    suite.test('撫恤遺孤：撥糧扣 50 糧草、名聲 +15；第二個選項無影響', async () => {
        const session = setup([general('guan-yu')]);
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        assert.equals('ORPHAN_RELIEF', session.pendingSeasonEvent?.eventId);
        const food = session.military.food;
        const fame = session.fame;
        assert.isTrue((await session.resolveSeasonEvent(0, wallet(0))).ok);
        assert.equals(food - 50, session.military.food);
        assert.equals(fame + 15, session.fame);
        await session.advanceSeason();
        const food2 = session.military.food;
        assert.isTrue((await session.resolveSeasonEvent(1, wallet(0))).ok);
        assert.equals(food2, session.military.food);
    });

    suite.test('沒回應的事件下一季作廢；舊存檔與壞資料讀回為空', async () => {
        const session = setup([general('zhang-fei')]);
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        session.setSeasonEventRandom(() => 0.99);
        await session.advanceSeason();
        assert.equals(1, [session.pendingSeasonEvent].filter(Boolean).length, '只留本季那一起');
        const empty = normalizeSeasonPersonalityState(undefined);
        assert.equals(0, empty.pending.length);
        assert.equals(1, seasonEventFarmMultiplier(empty, 'farming', 0));
        const bad = normalizeSeasonPersonalityState({ season: 2, pending: [{ eventId: 'NOPE', generalId: 'x' }, { eventId: 'FEAST_REQUEST', generalId: 'a' }], farmMultiplier: -1 });
        assert.equals(1, bad.pending.length);
        assert.equals(1, bad.farmMultiplier);
    });

    suite.test('彈窗：版面有綁定的節點；付不起只提示不關窗，回應後換下一起，沒有就關窗', async () => {
        const ids = layoutIds();
        for (const id of ['eventTitle', 'eventDesc', 'eventNoteA', 'eventNoteB', 'btnEventOptionA', 'btnEventOptionB', 'eventOptionALabel', 'eventOptionBLabel']) {
            assert.isTrue(ids.has(id), `版面缺 ${id}`);
        }
        const queue: SeasonEventInstance[] = [
            { eventId: 'FEAST_REQUEST', generalId: 'zhang-fei', generalName: '張飛' },
            { eventId: 'LEVEE_REPAIR', generalId: 'zhuge-liang', generalName: '諸葛亮' },
        ];
        const view = seasonEventView(queue[0]);
        assert.equals('【軍中索酒】張飛', view.texts.eventTitle);
        assert.isTrue(view.texts.eventDesc.startsWith('張飛：'));
        const host = { node: { active: false }, binder: null };
        const toasts: string[] = [];
        let afford = false;
        const popup = new SeasonEventPopupController({
            mountHost: async () => host as never,
            apply: () => undefined,
            next: () => queue[0] ?? null,
            resolve: async () => {
                if (!afford) return { ok: false, reason: 'shortfall', resource: '銅錢' };
                queue.shift();
                return { ok: true, line: 'done' };
            },
            toast: (m) => { toasts.push(m); },
        });
        await popup.mount();
        assert.isTrue(popup.tryOpen());
        await popup.respond(0);
        assert.isTrue(host.node.active);
        assert.equals('銅錢不足，無法執行', toasts[0]);
        afford = true;
        await popup.respond(0);
        assert.isTrue(host.node.active, '換上下一起');
        await popup.respond(1);
        assert.isFalse(host.node.active);
        assert.isFalse(popup.tryOpen());
    });

    return suite;
}
