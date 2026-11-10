// @spec-source → 三國季報動態合成與市井奇遇微抉擇狀態機規格書.md (doc_spec_1171) §二、§三、§四；PROG-2-2203（LOOP-03）
/**
 * SeasonChronicle.test.ts — 三國季報：合成、彈窗時機、市井奇遇結算、存讀檔、紅點、彈窗控制器。
 *
 * Unity 對照：EditMode Test，驗文案表與 session 結算，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { ITEM_WOOD } from '../assets/scripts/core/systems/ItemDef';
import {
    CITY_ENCOUNTERS,
    chronicleShouldOpen,
    normalizeSeasonChronicle,
    raiseAptitudeGrade,
    synthesizeSeasonChronicle,
    WORLD_TRENDS,
    WORLD_TREND_FALLBACK,
    type SeasonChronicleState,
} from '../assets/scripts/core/systems/SeasonChronicle';
import { markJournalHubSeen, pendingMorningJournalCount, refreshMorningReport } from '../assets/scripts/core/systems/MorningReport';
import { SeasonChroniclePopupController, seasonChronicleView } from '../assets/scripts/ui/core/SeasonChroniclePopupController';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 50, int: 50, cha: 50, luk: 10, ...extra } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], chronicleRoll: number, adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setGovernanceEventRandom(() => 0.99);
    session.setSeasonEventRandom(() => 0.99);
    session.setChronicleRandom(() => chronicleRoll);
    return session;
}

function wallet(start: number) {
    const w = { amount: start, gold: () => w.amount, spendGold: (n: number) => { if (n > w.amount) return false; w.amount -= n; return true; } };
    return w;
}

function layoutIds(): Set<string> {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts', 'season-chronicle-main.json');
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const child of node.children ?? []) walk(child as { id?: string; children?: unknown[] });
    };
    walk(JSON.parse(fs.readFileSync(file, 'utf8')).root);
    return ids;
}

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 10, 2, 0, 0);

export function createSeasonChronicleSuite(): TestSuite {
    const suite = new TestSuite('SeasonChronicle');

    suite.test('合成：天下大勢取領地前三且未滅亡的勢力；世家風雲兩位不重複；具名軼事與性格模板無未定字樣', () => {
        const nations = [
            { id: 'wei', territories: 5 }, { id: 'wu', territories: 4, fallen: true }, { id: 'yuan', territories: 4 },
            { id: 'shu', territories: 3 }, { id: 'nanman', territories: 1 },
        ];
        const state = synthesizeSeasonChronicle({ season: 3, nations, generals: [general('zhang-fei'), general('mystery', { name: '無名氏' }), general('kid', { age: 8 })] }, () => 0.99);
        assert.equals(3, state.season);
        assert.equals(WORLD_TRENDS.shu, state.trend, '前三為魏、袁、蜀（吳已滅亡），0.99 取第三');
        assert.equals(2, state.gossip.length);
        assert.isTrue(state.gossip.some((line) => line.startsWith('三將軍')), '張飛用專屬軼事');
        assert.isTrue(state.gossip.some((line) => line.includes('無名氏')), '其餘依性格套模板');
        for (const line of [state.trend, ...state.gossip]) {
            assert.isFalse(/\{Name\}|undefined|\?\?\?|TODO/.test(line), `文案殘留：${line}`);
        }
        assert.equals('TAOIST', state.encounterId);
        assert.isFalse(state.read);
        assert.equals(null, state.encounterChoice);
        const lonely = synthesizeSeasonChronicle({ season: 0, nations: [], generals: [] }, () => 0);
        assert.equals(WORLD_TREND_FALLBACK, lonely.trend);
        assert.equals(0, lonely.gossip.length);
        assert.equals('HU_MERCHANT', lonely.encounterId);
    });

    suite.test('奇遇文案表：四則、選項說明齊全；適性升階 S 封頂、缺值視為 C', () => {
        assert.equals(4, CITY_ENCOUNTERS.length);
        for (const def of CITY_ENCOUNTERS) {
            assert.isTrue(def.title.length > 0 && def.desc.length > 0);
            for (const option of def.options) assert.isTrue(option.label.length > 0 && option.note.length > 0, `${def.id} 選項缺說明`);
        }
        assert.equals('B', raiseAptitudeGrade(undefined, 1));
        assert.equals('S', raiseAptitudeGrade('A', 3));
        assert.equals('C', raiseAptitudeGrade('d', 1));
    });

    suite.test('TC-CHRONICLE-01：戰後回大廳與一般進場 100% 不彈；換季 100% 彈；換日首登只在未讀或未抉擇時彈', () => {
        const state: SeasonChronicleState = { season: 2, trend: 't', gossip: [], encounterId: 'TAOIST', encounterChoice: null, read: false };
        for (const s of [state, { ...state, read: true }, { ...state, read: true, encounterChoice: 0 as const }]) {
            assert.isFalse(chronicleShouldOpen(s, 2, 'battle-return'));
            assert.isFalse(chronicleShouldOpen(s, 2, 'lobby-enter'));
            assert.isTrue(chronicleShouldOpen(s, 2, 'season-advance'));
        }
        assert.isTrue(chronicleShouldOpen(state, 2, 'daily-first-login'));
        assert.isTrue(chronicleShouldOpen({ ...state, read: true }, 2, 'daily-first-login'), '奇遇還沒抉擇');
        assert.isFalse(chronicleShouldOpen({ ...state, read: true, encounterChoice: 1 }, 2, 'daily-first-login'));
        assert.isFalse(chronicleShouldOpen(state, 3, 'season-advance'), '過季的季報不彈');
    });

    suite.test('session：換季合成本季季報；同一天再登入（戰後回大廳）不算首登，隔天才算', async () => {
        const session = setup([general('zhang-fei')], 0.99);
        session.recordLoginAt(T0);
        assert.isTrue(session.loginStartedNewDay);
        assert.equals(0, session.seasonChronicle.season, '新局首登補合成本季季報');
        assert.isTrue(session.chronicleShouldOpen('daily-first-login'));
        await session.markSeasonChronicleRead();
        assert.isFalse(session.seasonChronicleUnread);
        session.recordLoginAt(T0 + 60 * 60 * 1000);
        assert.isFalse(session.loginStartedNewDay, '戰後回大廳同一天');
        await session.advanceSeason();
        assert.equals(1, session.seasonChronicle.season);
        assert.isTrue(session.seasonChronicleUnread, '新季報紅點亮');
        assert.isTrue(session.chronicleShouldOpen('season-advance'));
        assert.isFalse(session.chronicleShouldOpen('battle-return'));
        session.recordLoginAt(T0 + DAY);
        assert.isTrue(session.loginStartedNewDay);
        assert.equals(1, session.seasonChronicle.season, '本季已有季報不重新合成');
    });

    suite.test('TC-CHRONICLE-02：西域胡商扣 100 銅錢、主將騎兵升一階、紅點熄；當季只能抉擇一次', async () => {
        const session = setup([general('zhao-yun', { troopAptitude: { CAVALRY: 'A' } }), general('liu-bei')], 0);
        await session.setLeadGeneral('zhao-yun');
        await session.advanceSeason();
        assert.equals('HU_MERCHANT', session.seasonChronicle.encounterId);
        const poor = wallet(99);
        const rejected = await session.resolveCityEncounter(0, poor);
        assert.isFalse(rejected.ok);
        assert.equals(99, poor.amount, '付不起不扣');
        const w = wallet(150);
        const result = await session.resolveCityEncounter(0, w);
        assert.isTrue(result.ok);
        assert.equals(50, w.amount);
        assert.equals('S', session.roster.find((g) => g.id === 'zhao-yun')?.troopAptitude?.CAVALRY);
        assert.isFalse(session.seasonChronicleUnread);
        assert.equals(0, session.seasonChronicle.encounterChoice);
        assert.isFalse((await session.resolveCityEncounter(0, wallet(500))).ok, '不可重複抉擇');
    });

    suite.test('落魄鐵匠扣銅錢與木材、主將武力 +3；木材不足時拒絕', async () => {
        const session = setup([general('guan-yu', { str: 98 })], 0.3);
        await session.advanceSeason();
        assert.equals('BLACKSMITH', session.seasonChronicle.encounterId);
        const noWood = await session.resolveCityEncounter(0, wallet(100));
        assert.isTrue(!noWood.ok && noWood.resource === '木材');
        await session.addItem(ITEM_WOOD, 60);
        const w = wallet(100);
        assert.isTrue((await session.resolveCityEncounter(0, w)).ok);
        assert.equals(50, w.amount);
        assert.equals(10, session.itemCount(ITEM_WOOD));
        assert.equals(100, session.roster.find((g) => g.id === 'guan-yu')?.str, '武力上限 100');
    });

    suite.test('古道逢醫扣 30 糧、全軍精力上限 +5、老將壽命 +1；道人名聲 +30；放棄無影響', async () => {
        const session = setup([general('huang-zhong', { age: 60, maxVitality: 100 }), general('young', { age: 20, maxVitality: 80 })], 0.5);
        await session.advanceSeason();
        assert.equals('ROAD_DOCTOR', session.seasonChronicle.encounterId);
        const food = session.military.food;
        assert.isTrue((await session.resolveCityEncounter(0, wallet(0))).ok);
        assert.equals(food - 30, session.military.food);
        const roster = session.roster;
        assert.equals(105, roster.find((g) => g.id === 'huang-zhong')?.maxVitality);
        assert.equals(85, roster.find((g) => g.id === 'young')?.maxVitality);
        assert.equals(71, (roster.find((g) => g.id === 'huang-zhong') as unknown as { maxLifespan?: number } | undefined)?.maxLifespan);
        assert.equals(70, (roster.find((g) => g.id === 'young') as unknown as { maxLifespan?: number } | undefined)?.maxLifespan);

        const taoist = setup([general('pang-tong')], 0.99);
        await taoist.advanceSeason();
        const fame = taoist.fame;
        const w = wallet(20);
        assert.isTrue((await taoist.resolveCityEncounter(0, w)).ok);
        assert.equals(fame + 30, taoist.fame);
        assert.equals(0, w.amount);

        const decline = setup([general('pang-tong')], 0.99);
        await decline.advanceSeason();
        const fame2 = decline.fame;
        const w2 = wallet(20);
        assert.isTrue((await decline.resolveCityEncounter(1, w2)).ok);
        assert.equals(fame2, decline.fame);
        assert.equals(20, w2.amount);
        assert.equals(1, decline.seasonChronicle.encounterChoice);
    });

    suite.test('存讀檔：已抉擇與已讀寫入存檔，重啟後不能刷奇遇；壞資料讀回為空', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('pang-tong')], 0.99, adapter);
        await session.advanceSeason();
        assert.isTrue((await session.resolveCityEncounter(0, wallet(100))).ok);
        await session.save();
        const reloaded = setup([general('pang-tong')], 0.99, adapter);
        await reloaded.load();
        assert.equals(0, reloaded.seasonChronicle.encounterChoice);
        assert.isTrue(reloaded.seasonChronicle.read);
        assert.isFalse((await reloaded.resolveCityEncounter(0, wallet(100))).ok, '重啟後不可再領');
        const empty = normalizeSeasonChronicle(undefined);
        assert.equals(-1, empty.season);
        const bad = normalizeSeasonChronicle({ season: 2, trend: '', gossip: ['a', 3], encounterId: 'NOPE', encounterChoice: 0, read: 'yes' });
        assert.equals(WORLD_TREND_FALLBACK, bad.trend);
        assert.equals(1, bad.gossip.length);
        assert.equals(null, bad.encounterId);
        assert.equals(null, bad.encounterChoice);
        assert.isFalse(bad.read);
    });

    suite.test('晨報派遣板紅點：打開後熄滅，之後的新日誌才再亮；隔天晨報範圍不受影響', () => {
        const entry = (n: number) => ({ entryId: `E${n}`, timestamp: '', category: 'SYSTEM', relatedGeneralUids: [], priority: 5, summary: `s${n}` }) as never;
        const entries = [entry(1), entry(2)];
        const report = refreshMorningReport({ journalMark: 0, items: [], read: true }, [], 1, 'd1');
        assert.equals(2, pendingMorningJournalCount(report, entries));
        const seen = markJournalHubSeen(report, entries);
        assert.equals(0, pendingMorningJournalCount(seen, entries));
        assert.equals(1, pendingMorningJournalCount(seen, [...entries, entry(3)]));
        const nextDay = refreshMorningReport(seen, [...entries, entry(3)], 1, 'd2');
        assert.isTrue(nextDay.items.length > 0, '隔天晨報仍整理看過的日誌');
    });

    suite.test('彈窗：版面節點齊全；開窗即已讀；未抉擇不能收起；付不起只提示；抉擇後隱藏選項並顯示結果', async () => {
        const ids = layoutIds();
        for (const id of ['chronicleTitle', 'chronicleTrend', 'chronicleGossip', 'encounterTitle', 'encounterDesc', 'encounterNote', 'btnEncounterA', 'btnEncounterB', 'btnCloseChronicle', 'encounterOptionALabel', 'encounterOptionBLabel']) {
            assert.isTrue(ids.has(id), `版面缺 ${id}`);
        }
        let state: SeasonChronicleState = { season: 1, trend: WORLD_TRENDS.wei, gossip: ['g1'], encounterId: 'HU_MERCHANT', encounterChoice: null, read: false };
        const view = seasonChronicleView(state, '春', null);
        assert.isTrue(view.texts.chronicleTitle.includes('三國季報'));
        assert.isTrue(view.texts.chronicleTrend.startsWith('【天下大勢】'));
        assert.isTrue(view.texts.encounterTitle.includes('西域胡商'));
        assert.isFalse(view.enabled.btnCloseChronicle);
        const host = { node: { active: false }, binder: null };
        const toasts: string[] = [];
        let afford = false;
        const popup = new SeasonChroniclePopupController({
            mountHost: async () => host as never,
            apply: () => undefined,
            state: () => state,
            seasonLabel: () => '春',
            markRead: () => { state = { ...state, read: true }; },
            resolve: async (index) => {
                if (index === 0 && !afford) return { ok: false, reason: 'shortfall', resource: '銅錢' };
                state = { ...state, encounterChoice: index };
                return { ok: true, line: 'done' };
            },
            toast: (m) => { toasts.push(m); },
        });
        await popup.mount();
        assert.isTrue(popup.open());
        assert.isTrue(state.read, '開窗即已讀');
        popup.close();
        assert.isTrue(host.node.active, '未抉擇不能收起');
        await popup.respond(0);
        assert.equals('銅錢不足，無法執行', toasts[0]);
        afford = true;
        await popup.respond(0);
        assert.equals(0, state.encounterChoice);
        const after = seasonChronicleView(state, '春', 'done');
        assert.isFalse(after.actives.btnEncounterA);
        assert.equals('done', after.texts.encounterNote);
        popup.close();
        assert.isFalse(host.node.active);
    });

    return suite;
}
