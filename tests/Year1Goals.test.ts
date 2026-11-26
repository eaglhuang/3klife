/**
 * Year1Goals.test.ts — 首年目標清單（PROG-2-10062）
 * 鎖住：資料驗證（總獎勵 650）、六項目標各自的完成判定、親子談話替代判定、衝刺前三／安慰獎、
 * 一次性領獎（claimed + grantKey）、舊存檔相容、領獎失敗可重試、進度條文字與按鈕導向、四語系、畫面規格與典禮賀詞。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { SilverRoutedWallet } from '../assets/scripts/core/api/localserver/SilverWalletPort';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, GAME_SESSION_EVENTS, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import {
    applyYear1GoalEvent,
    buildYear1GoalsView,
    createEmptyYear1GoalsState,
    getYear1GoalTable,
    normalizeYear1GoalsState,
    pendingYear1Consolation,
    pendingYear1Rewards,
    validateYear1Goals,
    type Year1GoalEvent,
    type Year1GoalsState,
} from '../assets/scripts/core/systems/Year1Goals';
import { claimYear1GoalReward, year1GoalGrantKey } from '../assets/scripts/core/systems/Year1GoalsReward';
import { buildYearEndCeremonyResult, ceremonyActDialogue } from '../assets/scripts/core/systems/YearEndCeremonyRuntime';
import { Year1GoalsController, year1BarFillWidth } from '../assets/scripts/ui/core/Year1GoalsController';
import { LOBBY_CATEGORIES, actionAt } from '../assets/scripts/ui/core/LobbyCityHubController';

const ROOT = path.resolve(__dirname, '..');
const readJson = <T = any>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const rewardConfig = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const table = getYear1GoalTable();

function tOf(locale: string): (key: string, ...args: string[]) => string {
    const dict = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
    return (key, ...args) => (dict[key] ?? key).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? '');
}

/** 連續套用事件；回傳最終狀態與完成的目標 id（依序） */
function run(events: Year1GoalEvent[], year = 1, start: Year1GoalsState = createEmptyYear1GoalsState()) {
    let state = start;
    const done: string[] = [];
    for (const event of events) {
        const result = applyYear1GoalEvent(table, state, event, year);
        state = result.state;
        done.push(...result.newlyCompleted.map((g) => g.id));
    }
    return { state, done };
}

function fakeGacha(): WalletAuthority {
    const w = {
        gems: 0,
        balance: (c: string) => (c === 'gems' ? w.gems : 0),
        spend: (c: string, n: number) => { if (c !== 'gems' || w.gems < n) return false; w.gems -= n; return true; },
        credit: (c: string, n: number) => { if (c === 'gems') w.gems += n; },
        snapshot: () => ({ gems: w.gems }),
    };
    return w;
}

function configure(session: GameSession, adapter: MemoryStorageAdapter): void {
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('assets/resources/data/family-config.json'));
    session.configureOccupancyMatrix(readJson('assets/resources/data/occupancy-matrix.json'));
}

async function newSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    const session = new GameSession(5);
    configure(session, adapter);
    await session.startNewGameWithStarters(5, generals, {});
    return session;
}

type Api = ReturnType<typeof createLocalApi>['api'];

async function newBundle(adapter = new MemoryStorageAdapter()) {
    const session = await newSession(adapter);
    const local = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    local.setWallet(new SilverRoutedWallet(fakeGacha(), session.silverLedger));
    local.setItemAuthority(session.itemAuthority());
    local.setRewardAuthority(session.rewardAuthority());
    local.setRewardConfig(rewardConfig);
    return { session, api: local.api };
}

/** 控制器測試用：直接接真實 session 與 reward.claim，Toast 收進陣列 */
function controllerOf(session: GameSession, api: Api, toasts: string[], t = tOf('zh-TW')) {
    return new Year1GoalsController({
        session: {
            get year1Goals() { return session.year1Goals; },
            get currentYear() { return session.gameTime.currentYear; },
            markYear1GoalClaimed: (id) => session.markYear1GoalClaimed(id),
            excludeFromYearSilverIncome: (n) => session.excludeFromYearSilverIncome(n),
        },
        claim: (goal, kind) => claimYear1GoalReward(api, goal, kind),
        t,
        toast: (m) => toasts.push(m),
    });
}

export function createYear1GoalsSuite(): TestSuite {
    const suite = new TestSuite('Year1Goals (首年目標清單 PROG-2-10062)');

    suite.test('資料驗證：現有資料合格，總獎勵 650 銀兩、六項目標、新手滿貫門檻 5', () => {
        const raw = readJson('assets/resources/data/master/year1-goals.json');
        assert.equals(0, validateYear1Goals(raw).length);
        assert.equals(650, table.totalSilver);
        assert.equals(6, table.goals.length);
        assert.equals(650, table.goals.reduce((n, g) => n + g.reward.silver, 0));
        assert.equals(5, table.grandSlamMin);
    });

    suite.test('資料驗證：壞資料逐條報錯（總額對不上、缺稱號、重複套件、非物件）', () => {
        const raw = readJson('assets/resources/data/master/year1-goals.json');
        assert.isTrue(validateYear1Goals({ ...raw, totalSilver: 700 }).length > 0);
        const badTitle = JSON.parse(JSON.stringify(raw));
        badTitle.goals[4].reward.titleId = 'no_such_title';
        assert.isTrue(validateYear1Goals(badTitle).length > 0);
        const dup = JSON.parse(JSON.stringify(raw));
        dup.goals[1].reward.bundleId = dup.goals[0].reward.bundleId;
        assert.isTrue(validateYear1Goals(dup).length > 0);
        assert.isTrue(validateYear1Goals(null).length > 0);
    });

    suite.test('套件金額與資料一致：reward-config 的 BUNDLE_Y1_GOAL_* 與 year1-goals.json 的 silver 對得上，且只允許 year1Goal 來源', () => {
        const silverOf = (bundleId: string): number => {
            const bundle = rewardConfig.bundles.find((b) => b.id === bundleId);
            assert.isTrue(!!bundle, `找不到套件 ${bundleId}`);
            assert.isTrue((bundle!.sources as readonly string[]).includes('year1Goal'));
            return (bundle!.effects as unknown as Array<Record<string, unknown>>)
                .filter((e) => e.kind === 'currency' && e.id === 'silver').reduce((n, e) => n + (e.amount as number), 0);
        };
        for (const goal of table.goals) {
            assert.equals(goal.reward.silver, silverOf(goal.reward.bundleId));
            if (goal.consolation) assert.equals(goal.consolation.silver, silverOf(goal.consolation.bundleId));
        }
        assert.equals(20, silverOf('BUNDLE_Y1_GOAL_SPRINT_CONSOLATION'));
    });

    suite.test('六項目標各自完成判定：打贏、招募、內政、配偶、榜單前三', () => {
        assert.equals('y1_first_battle', run([{ type: 'battle-win' }]).done.join());
        assert.equals('y1_first_recruit', run([{ type: 'recruit' }]).done.join());
        assert.equals('y1_first_affairs', run([{ type: 'domestic' }]).done.join());
        assert.equals('y1_first_spouse', run([{ type: 'spouse-count', count: 1 }]).done.join());
        assert.equals(0, run([{ type: 'spouse-count', count: 0 }]).done.length);
        assert.equals('y1_top3_sprint', run([{ type: 'year-end-rank', year: 1, rank: 3 }]).done.join());
        assert.equals('y1_top3_sprint', run([{ type: 'year-end-rank', year: 1, rank: 1 }]).done.join());
    });

    suite.test('同一目標不會重複完成：事件重複送，只完成一次', () => {
        const out = run([{ type: 'battle-win' }, { type: 'battle-win' }, { type: 'recruit' }, { type: 'recruit' }]);
        assert.equals('y1_first_battle,y1_first_recruit', out.done.join());
        assert.equals(2, out.state.completed.length);
    });

    suite.test('親子談話：真正的談話 1 次完成並記親子好感 +3；談話按鈕未到位時用送禮／培育替代', () => {
        const talk = run([{ type: 'child-talk' }]);
        assert.equals('y1_first_talk', talk.done.join());
        assert.equals(3, talk.state.childFavorBonus);
        assert.equals(1, talk.state.counters.childInteractionCountThisYear);
        assert.equals('y1_first_talk', run([{ type: 'home-gift' }]).done.join());
        assert.equals('y1_first_talk', run([{ type: 'nurture' }]).done.join());
        // 完成後再來也不會重複加好感
        const again = run([{ type: 'child-talk' }, { type: 'nurture' }, { type: 'home-gift' }]);
        assert.equals(3, again.state.childFavorBonus);
    });

    suite.test('替代判定可關：fallback.enabled=false 時，送禮與培育不算親子談話', () => {
        const strict = JSON.parse(JSON.stringify(table));
        const talkGoal = strict.goals.find((g: { id: string }) => g.id === 'y1_first_talk');
        talkGoal.trigger.fallback.enabled = false;
        let state = createEmptyYear1GoalsState();
        for (const event of [{ type: 'home-gift' }, { type: 'nurture' }] as Year1GoalEvent[]) {
            state = applyYear1GoalEvent(strict, state, event, 1).state;
        }
        assert.equals(0, state.completed.length);
        const talked = applyYear1GoalEvent(strict, state, { type: 'child-talk' }, 1);
        assert.equals('y1_first_talk', talked.newlyCompleted.map((g: { id: string }) => g.id).join());
    });

    suite.test('稱號：成家立業得新婚燕爾、金榜題名得初露鋒芒；沒進前三不得稱號', () => {
        assert.equals('newlywed', run([{ type: 'spouse-count', count: 2 }]).state.titles.join());
        assert.equals('rising_star', run([{ type: 'year-end-rank', year: 1, rank: 2 }]).state.titles.join());
        assert.equals(0, run([{ type: 'year-end-rank', year: 1, rank: 4 }]).state.titles.length);
    });

    suite.test('衝刺：名次 4 以後不算完成，但記下名次並待發安慰獎；只結算一次', () => {
        const out = run([{ type: 'year-end-rank', year: 1, rank: 5 }]);
        assert.equals(0, out.done.length);
        assert.equals(5, out.state.sprintRank);
        assert.equals('y1_top3_sprint', pendingYear1Consolation(table, out.state)?.id);
        // 讀檔重播或第二次回報同年榜單，不改名次、不會再升級成前三
        const replay = run([{ type: 'year-end-rank', year: 1, rank: 1 }], 1, out.state);
        assert.equals(5, replay.state.sprintRank);
        assert.equals(0, replay.done.length);
        // 進了前三就沒有安慰獎
        assert.equals(null, pendingYear1Consolation(table, run([{ type: 'year-end-rank', year: 1, rank: 3 }]).state));
    });

    suite.test('只算第 1 年：第 2 年的戰鬥、招募、配偶事件一律忽略；榜單事件看事件自帶年份', () => {
        const y2 = run([{ type: 'battle-win' }, { type: 'recruit' }, { type: 'spouse-count', count: 3 }, { type: 'child-talk' }], 2);
        assert.equals(0, y2.state.completed.length);
        assert.equals(0, y2.state.counters.childInteractionCountThisYear);
        // 年末典禮常在年底換年後才開：時鐘第 2 年、榜單年份是第 1 年，仍要判
        assert.equals('y1_top3_sprint', run([{ type: 'year-end-rank', year: 1, rank: 1 }], 2).done.join());
        assert.equals(0, run([{ type: 'year-end-rank', year: 2, rank: 1 }], 2).done.length);
    });

    suite.test('待領清單：完成但未領的依資料順序；已領的不再出現', () => {
        const out = run([{ type: 'recruit' }, { type: 'battle-win' }]);
        assert.equals('y1_first_battle,y1_first_recruit', pendingYear1Rewards(table, out.state).map((g) => g.id).join());
        const claimed = { ...out.state, claimed: ['y1_first_battle'] };
        assert.equals('y1_first_recruit', pendingYear1Rewards(table, claimed).map((g) => g.id).join());
    });

    suite.test('舊存檔相容：沒有 year1Goals 欄位、欄位壞掉都回全空狀態；好資料來回不變', () => {
        const empty = JSON.stringify(createEmptyYear1GoalsState());
        assert.equals(empty, JSON.stringify(normalizeYear1GoalsState(undefined)));
        assert.equals(empty, JSON.stringify(normalizeYear1GoalsState('壞掉')));
        assert.equals(empty, JSON.stringify(normalizeYear1GoalsState({ completed: 'x', claimed: 5, sprintRank: 'a' })));
        // 不認得的目標 id 被丟掉
        const messy = normalizeYear1GoalsState({ completed: ['y1_first_battle', 'ghost'], claimed: ['y1_first_battle', 'ghost'], titles: ['newlywed', 'ghost'], childFavorBonus: -4 });
        assert.equals('y1_first_battle', messy.completed.join());
        assert.equals('y1_first_battle', messy.claimed.join());
        assert.equals('newlywed', messy.titles.join());
        assert.equals(0, messy.childFavorBonus);
        const good = run([{ type: 'battle-win' }, { type: 'child-talk' }, { type: 'year-end-rank', year: 1, rank: 9 }]).state;
        assert.equals(JSON.stringify(good), JSON.stringify(normalizeYear1GoalsState(JSON.parse(JSON.stringify(good)))));
    });

    suite.test('進度條 view：X/6 與比例、下一步依資料順序、衝刺落榜後不再當下一步、年份過了不顯示', () => {
        const fresh = buildYear1GoalsView(table, createEmptyYear1GoalsState(), 1);
        assert.isTrue(fresh.visible);
        assert.equals(0, fresh.completedCount);
        assert.equals(6, fresh.total);
        assert.equals('y1_first_battle', fresh.next?.id);
        const two = run([{ type: 'battle-win' }, { type: 'recruit' }]).state;
        const view = buildYear1GoalsView(table, two, 1);
        assert.equals(2, view.completedCount);
        assert.equals(2 / 6, view.ratio);
        assert.equals('y1_first_affairs', view.next?.id);
        assert.isFalse(view.grandSlam);
        assert.isFalse(buildYear1GoalsView(table, two, 2).visible);
        const five: Year1GoalEvent[] = [{ type: 'battle-win' }, { type: 'recruit' }, { type: 'domestic' }, { type: 'child-talk' }, { type: 'spouse-count', count: 1 }];
        const all = run([...five, { type: 'year-end-rank', year: 1, rank: 2 }]);
        assert.equals(6, buildYear1GoalsView(table, all.state, 1).completedCount);
        assert.equals(null, buildYear1GoalsView(table, all.state, 1).next);
        const missedView = buildYear1GoalsView(table, run([...five, { type: 'year-end-rank', year: 1, rank: 7 }]).state, 1);
        assert.equals(5, missedView.completedCount);
        assert.equals(null, missedView.next);
        assert.isTrue(missedView.grandSlam);
    });

    suite.test('「下一步」導向都是大廳選單裡真實存在的功能 id', () => {
        const known = new Set<string>();
        for (const category of LOBBY_CATEGORIES) {
            for (let i = 0; i < 12; i++) {
                const action = actionAt(category.id, i);
                if (action) known.add(action);
            }
        }
        for (const goal of table.goals) {
            if (goal.nextAction) assert.isTrue(known.has(goal.nextAction), `${goal.id} 的 nextAction ${goal.nextAction} 不在大廳選單`);
        }
    });

    suite.test('進度條填色寬度：夾在 0～1、取整數、壞值回 0', () => {
        assert.equals(0, year1BarFillWidth(600, 0));
        assert.equals(300, year1BarFillWidth(600, 0.5));
        assert.equals(600, year1BarFillWidth(600, 3));
        assert.equals(0, year1BarFillWidth(600, -1));
        assert.equals(200, year1BarFillWidth(600, 1 / 3));
        assert.equals(0, year1BarFillWidth(0, 0.5));
        assert.equals(0, year1BarFillWidth(600, NaN));
    });

    suite.test('領獎：reward.claim 入帳到家族銀兩，grantKey 記進存檔；重送不重複入帳', async () => {
        const { session, api } = await newBundle();
        const goal = table.goals[0];
        const before = session.silverLedger.silverBalance();
        const first = await claimYear1GoalReward(api, goal);
        assert.isTrue(first.ok);
        assert.isFalse(first.replayed);
        assert.equals(150, first.silver);
        assert.equals(before + 150, session.silverLedger.silverBalance());
        assert.isTrue(session.rewardAuthority().meta().grants.some((g) => g.key === year1GoalGrantKey(goal.id, 'reward')));
        const again = await claimYear1GoalReward(api, goal);
        assert.isTrue(again.ok);
        assert.isTrue(again.replayed);
        assert.equals(0, again.silver);
        assert.equals(before + 150, session.silverLedger.silverBalance());
    });

    suite.test('領獎失敗不吞：沒有獎勵設定回 ok=false，控制器不標記已領、不跳 Toast', async () => {
        const session = await newSession();
        const bare = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        const failing = await claimYear1GoalReward(bare.api, table.goals[0]);
        assert.isFalse(failing.ok);
        session.reportYear1Goal({ type: 'battle-win' });
        const toasts: string[] = [];
        const broken = controllerOf(session, bare.api, toasts);
        assert.equals(0, await broken.settle());
        assert.equals(0, session.year1Goals.claimed.length);
        assert.equals(0, toasts.length);
    });

    suite.test('控制器結算：多項完成一次領完、各跳一則 Toast、不算進本年家族入帳、二次結算不再發', async () => {
        const { session, api } = await newBundle();
        const toasts: string[] = [];
        const controller = controllerOf(session, api, toasts);
        session.reportYear1Goal({ type: 'recruit' });
        session.reportYear1Goal({ type: 'domestic' });
        const incomeBefore = session.yearEndScoreInputs().scoreInput.annualIncome;
        const balance = session.silverLedger.silverBalance();
        assert.equals(200, await controller.settle());
        assert.equals(balance + 200, session.silverLedger.silverBalance());
        assert.equals(2, toasts.length);
        assert.isTrue(toasts[0].includes('招兵買馬') && toasts[0].includes('+100'));
        assert.equals('y1_first_recruit,y1_first_affairs', session.year1Goals.claimed.join());
        assert.equals(incomeBefore, session.yearEndScoreInputs().scoreInput.annualIncome);
        assert.equals(0, await controller.settle());
        assert.equals(2, toasts.length);
        assert.equals(balance + 200, session.silverLedger.silverBalance());
    });

    suite.test('控制器結算：重入不並行、不重複入帳（兩次同時 settle 只領一次）', async () => {
        const { session, api } = await newBundle();
        const toasts: string[] = [];
        const controller = controllerOf(session, api, toasts);
        session.reportYear1Goal({ type: 'battle-win' });
        const balance = session.silverLedger.silverBalance();
        await Promise.all([controller.settle(), controller.settle()]);
        assert.equals(balance + 150, session.silverLedger.silverBalance());
        assert.equals(1, toasts.length);
    });

    suite.test('Toast 內容：親子談話帶親子好感，成家立業帶稱號', async () => {
        const { session, api } = await newBundle();
        const toasts: string[] = [];
        const controller = controllerOf(session, api, toasts);
        session.reportYear1Goal({ type: 'child-talk' });
        session.reportYear1Goal({ type: 'spouse-count', count: 1 });
        await controller.settle();
        assert.isTrue(toasts[0].includes('親子好感 +3') && toasts[0].includes('+50'));
        assert.isTrue(toasts[1].includes('新婚燕爾') && toasts[1].includes('+150'));
    });

    suite.test('衝刺安慰獎：落榜領 20 銀兩，grantKey 與一般獎勵分開；前三領 100', async () => {
        const out = await newBundle();
        const controller = controllerOf(out.session, out.api, []);
        out.session.recordYear1Sprint(1, 6);
        const balance = out.session.silverLedger.silverBalance();
        assert.equals(20, await controller.settle());
        assert.equals(balance + 20, out.session.silverLedger.silverBalance());
        assert.isTrue(out.session.rewardAuthority().meta().grants.some((g) => g.key === 'year1Goal:y1_top3_sprint:consolation'));
        assert.equals(0, await controller.settle());
        const top = await newBundle();
        const topController = controllerOf(top.session, top.api, []);
        top.session.recordYear1Sprint(1, 2);
        assert.equals(100, await topController.settle());
    });

    suite.test('進度條文字：X/6、下一步提示、結算收尾', async () => {
        const { session, api } = await newBundle();
        const controller = controllerOf(session, api, [], tOf('zh-TW'));
        const view = controller.getView();
        assert.isTrue(view.visible);
        assert.equals('首年目標 0/6', view.progressText);
        assert.isTrue(view.hintText.startsWith('下一步：打贏第一場戰鬥'));
        assert.equals('battle', view.nextAction);
        session.reportYear1Goal({ type: 'battle-win' });
        const next = controller.getView();
        assert.equals('首年目標 1/6', next.progressText);
        assert.equals('recruitHall', next.nextAction);
        assert.isFalse(controller.isGrandSlam(1));
        const rest: Year1GoalEvent[] = [{ type: 'recruit' }, { type: 'domestic' }, { type: 'child-talk' }, { type: 'spouse-count', count: 1 }];
        for (const event of rest) session.reportYear1Goal(event);
        assert.isTrue(controller.isGrandSlam(1));
        assert.isFalse(controller.isGrandSlam(2));
        assert.equals('hallBoard', controller.getView().nextAction);
        session.recordYear1Sprint(1, 8);
        const wrap = controller.getView();
        assert.equals(null, wrap.nextAction);
        assert.equals('首年目標已結算，下一年繼續加油', wrap.hintText);
    });

    suite.test('真實事件接線：打贏戰鬥、招募武將都會推進並發 Year1GoalsChanged；輸掉不算；新開局是全空', async () => {
        const session = await newSession();
        assert.equals(0, session.year1Goals.completed.length);
        const payloads: string[][] = [];
        const owner = session as unknown as { _emit: (name: string, payload?: { newlyCompleted: string[] }) => void };
        const original = owner._emit.bind(session);
        owner._emit = (name, payload) => {
            if (name === GAME_SESSION_EVENTS.Year1GoalsChanged && payload) payloads.push(payload.newlyCompleted);
            original(name, payload);
        };
        await session.recordBattle([], 'player-win');
        assert.isTrue(session.year1Goals.completed.includes('y1_first_battle'));
        assert.equals('y1_first_battle', payloads[0].join());
        const extra = generals.find((g) => !session.roster.some((r) => r.id === g.id));
        assert.isTrue(!!extra);
        session.enrollGenerals([extra!]);
        assert.isTrue(session.year1Goals.completed.includes('y1_first_recruit'));
        const lost = await newSession();
        await lost.recordBattle([], 'enemy-win');
        assert.equals(0, lost.year1Goals.completed.length);
    });

    suite.test('存檔來回：完成與已領進存檔、讀回一致；舊存檔（沒有欄位）讀回全空不報錯', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        session.setAutoSave(true);
        session.reportYear1Goal({ type: 'battle-win' });
        await session.markYear1GoalClaimed('y1_first_battle');
        const snapshot = await session.save();
        const loaded = new GameSession(5);
        configure(loaded, adapter);
        assert.isTrue(await loaded.load());
        assert.equals('y1_first_battle', loaded.year1Goals.completed.join());
        assert.equals('y1_first_battle', loaded.year1Goals.claimed.join());
        // 舊存檔：把欄位拿掉再存
        const legacy = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
        delete legacy.year1Goals;
        const adapter2 = new MemoryStorageAdapter();
        await new PlayerSaveService(adapter2).save(legacy as never);
        const old = new GameSession(5);
        configure(old, adapter2);
        assert.isTrue(await old.load());
        assert.equals(0, old.year1Goals.completed.length);
        assert.equals(0, old.year1Goals.claimed.length);
    });

    suite.test('典禮第 3 幕：新手滿貫多念一行賀詞，其餘幕與非滿貫不變', () => {
        const t = tOf('zh-TW');
        const base = { annualIncome: 0, prestige: 0, childCount: 0, spouseCount: 0, academyScore: 0 };
        const result = buildYearEndCeremonyResult(1, base, '本府');
        const plain = ceremonyActDialogue(result, 3, t);
        const slam = ceremonyActDialogue({ ...result, newbieGrandSlam: true }, 3, t);
        assert.equals(`${plain}\n${t('ui.ceremony.act3.grandSlam')}`, slam);
        assert.equals(plain, ceremonyActDialogue({ ...result, newbieGrandSlam: false }, 3, t));
        assert.equals(ceremonyActDialogue(result, 1, t), ceremonyActDialogue({ ...result, newbieGrandSlam: true }, 1, t));
        assert.equals(ceremonyActDialogue(result, 2, t), ceremonyActDialogue({ ...result, newbieGrandSlam: true }, 2, t));
    });

    suite.test('四語系：資料用到的 key、面板與 Toast 文案、典禮賀詞都有值，沒有殘留佔位', () => {
        const keys: string[] = [];
        for (const goal of table.goals) {
            keys.push(goal.nameKey, goal.actionKey, goal.toastKey);
            if (goal.consolationToastKey) keys.push(goal.consolationToastKey);
        }
        for (const title of table.titles) keys.push(title.nameKey);
        keys.push('year1.panel.progress', 'year1.panel.next', 'year1.panel.done', 'year1.panel.wrapup', 'year1.panel.go',
            'year1.toast.reward', 'year1.toast.title', 'year1.toast.favor', 'ui.ceremony.act3.grandSlam');
        for (const locale of LOCALES) {
            const dict = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of keys) {
                assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${locale} 缺 ${key}`);
            }
            const t = tOf(locale);
            const filled = [t('year1.panel.progress', '2', '6'), t('year1.panel.next', 'x'), t('year1.toast.reward', '150'), t('year1.toast.title', 'x'), t('year1.toast.favor', '3')];
            for (const text of filled) assert.isFalse(/\{\d+\}/.test(text), `${locale} 殘留佔位：${text}`);
        }
    });

    suite.test('畫面規格：三層齊備、元件綁的節點 id 都在版面、slot 都有定義且登記在 settle 家族', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/year1-goals-main.json');
        const screen = readJson('assets/resources/ui-spec/screens/year1-goals-screen.json');
        const skin = readJson('assets/resources/ui-spec/skins/year1-goals-screen.skin.json');
        assert.equals('year1-goals-main', screen.layout);
        assert.equals(skin.id, screen.skin);
        const ids = new Set<string>();
        const used = new Set<string>();
        const walk = (node: any): void => {
            if (node?.id) ids.add(node.id);
            if (node?.skinSlot) used.add(node.skinSlot);
            if (node?.styleSlot) used.add(node.styleSlot);
            for (const c of node?.children ?? []) walk(c);
        };
        walk(layout.root);
        for (const id of ['y1Progress', 'y1BarTrack', 'y1BarFill', 'y1Hint', 'btnY1Next', 'btnY1NextLabel']) assert.isTrue(ids.has(id), `版面缺 ${id}`);
        const settle = readJson('assets/resources/ui-spec/themes/theme-registry.json').familyBindings.settle;
        assert.isTrue(settle.appliesToSkins.includes('year1-goals-screen.skin'));
        for (const slot of used) {
            assert.isTrue(!!skin.slots[slot], `skin 缺 slot ${slot}`);
            assert.isTrue(!!settle.slotRoles[slot], `settle 家族缺 slot 對應 ${slot}`);
        }
        // 版面用錨點定位（置中），不寫死橫式絕對座標，保留直式與手機橫式彈性
        assert.isTrue(JSON.stringify(layout).includes('"hCenter"'));
    });

    return suite;
}
