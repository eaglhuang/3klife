// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §二-4、§三-5、§四 TC-AUTOBATTLE-04～06；PROG-2-9709
/**
 * QuickResolveGate.test.ts — 極速決戰修正：整軍戰力、關卡可用條件、每日次數與軍令狀。
 *
 * 純邏輯為主（sidePower 含預備兵力、checkQuickResolve、換日重置），另用 GameSession 驗扣軍令狀、存讀檔與 Boss 勝利紀錄。
 * Unity 對照：EditMode Test，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { finalizeQuickResolve, OPENING_RESCUE_FINAL_LINE, quickResolveOutcome, sidePower, type AutoResolveSide } from '../assets/scripts/core/systems/AutoResolve';
import {
    checkQuickResolve, configureQuickResolve, DEFAULT_QUICK_RESOLVE_CONFIG, EMPTY_QUICK_RESOLVE_DAILY, ITEM_QUICK_RESOLVE_WRIT,
    normalizeQuickResolveSave, quickResolveFreeLeft, quickResolveSaveOf, resetQuickResolveConfig, rollQuickResolveDaily, spendQuickResolve,
    type QuickResolveCheckInput, type QuickResolveDaily,
} from '../assets/scripts/core/systems/QuickResolveGate';
import { quickSortieChooseView, quickSortieSide, resolveQuickSortie } from '../assets/scripts/ui/core/QuickSortieController';
import { DEFAULT_ITEM_CONFIG, normalizeItemConfig } from '../assets/scripts/shared/item/ItemConfig';

const ROOT = path.join(__dirname, '..');
const json = (value: unknown): string => JSON.stringify(value);
const DAY1 = Date.parse('2026-11-22T04:00:00Z');
const DAY1_LATE = Date.parse('2026-11-22T14:00:00Z');
const DAY2 = Date.parse('2026-11-23T04:00:00Z');
const D1 = '2026-11-22';
const D2 = '2026-11-23';

const general = (power: number) => ({ str: power, int: power, lea: power, currentHp: 1000, maxHp: 1000 });
const side = (reserveTroops?: number): AutoResolveSide => ({ general: general(80), troops: [], fortressHp: 0, ...(reserveTroops !== undefined ? { reserveTroops } : {}) });

function input(patch: Partial<QuickResolveCheckInput> = {}): QuickResolveCheckInput {
    return { stage: { id: 'stage-a', battleKind: 'field' }, clearedStageIds: [], daily: EMPTY_QUICK_RESOLVE_DAILY, today: D1, writCount: 0, ...patch };
}

function hero(): GeneralConfig {
    return {
        id: 'hero', name: 'hero', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalRank: 1,
        battleRecord: { wins: 0, losses: 0, draws: 0, merit: 0, kills: 0 },
    } as unknown as GeneralConfig;
}

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    const store = new PlayerSaveService(adapter);
    session.setRosterStore(new InMemoryRosterStore([hero()]));
    session.setSaveService(store);
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0);
    // 軍令狀走物品 API 扣除：綁本機 API（同 DailyFreeEnroll.test）
    const bundle = createLocalApi(store, { now: () => 1_000 });
    bundle.setItemAuthority(session.itemAuthority());
    session.setItemApi(bundle.api);
    return session;
}

export function createQuickResolveGateSuite(): TestSuite {
    const suite = new TestSuite('QuickResolveGate (極速決戰修正 PROG-2-9709)');

    suite.test('TC-AUTOBATTLE-04：sidePower 計入預備兵力；沒帶預備兵力時與舊算法相同', () => {
        resetQuickResolveConfig();
        const base = sidePower(side());
        assert.equals(base, sidePower(side(0)), '沒預備兵力＝舊算法');
        const k = DEFAULT_QUICK_RESOLVE_CONFIG.reservePowerPerTroop;
        assert.equals(Math.round(base + 5000 * k), sidePower(side(5000)));
        assert.equals(base, sidePower(side(-300)), '負數視為 0');
    });

    suite.test('TC-AUTOBATTLE-04：場上沒有部隊但帶滿預備兵力，不再必輸；沒帶預備才輸', () => {
        resetQuickResolveConfig();
        const enemy: AutoResolveSide = { general: general(80), troops: [{ currentHp: 120, attack: 35 }, { currentHp: 120, attack: 35 }], fortressHp: 500, reserveTroops: 3000 };
        const mid = () => 0.5;
        assert.equals('enemy-win', quickResolveOutcome(side(), enemy, mid).result, '沒計預備兵力：場上無部隊必輸（舊行為）');
        assert.isTrue(quickResolveOutcome(side(8000), enemy, mid).playerPower > quickResolveOutcome(side(), enemy, mid).playerPower);
        assert.equals('player-win', quickResolveOutcome(side(8000), enemy, mid).result, '整軍計入後可勝');
    });

    suite.test('結算文案：首戰保證勝改判時戰報終局行換成援軍，不再同時出現「我軍不支」與「反敗為勝」', () => {
        resetQuickResolveConfig();
        const quick = quickResolveOutcome(side(), { general: general(99), troops: [], fortressHp: 500 }, () => 0.5);
        assert.equals('enemy-win', quick.result);
        const rescued = finalizeQuickResolve(quick, false);
        assert.equals('player-win', rescued.result);
        assert.isTrue(rescued.rescued);
        assert.equals(OPENING_RESCUE_FINAL_LINE, rescued.reportLines[rescued.reportLines.length - 1]);
        assert.isFalse(rescued.reportLines.some((l) => l.includes('不支')), '贏時不出現失敗用語');
        assert.equals(quick.reportLines.length, rescued.reportLines.length, '取代最後一行而非追加');
        const kept = finalizeQuickResolve(quick, true);
        assert.equals('enemy-win', kept.result);
        assert.isFalse(kept.rescued);
    });

    suite.test('大廳推演：預備兵力讓戰力上升；resolveQuickSortie 帶預備兵力選項', () => {
        resetQuickResolveConfig();
        const me = { name: 'a', str: 80, int: 80, lea: 80, hp: 1000 };
        assert.equals(undefined, quickSortieSide(me).reserveTroops);
        assert.equals(4000, quickSortieSide(me, 4000).reserveTroops);
        const plain = resolveQuickSortie(me, me, true, () => 0.5);
        const withReserve = resolveQuickSortie(me, me, true, () => 0.5, { playerTroops: 6000, enemyTroops: 3000 });
        assert.isTrue(withReserve.playerPower > withReserve.enemyPower);
        assert.isTrue(withReserve.playerPower > plain.playerPower);
        assert.equals('player-win', withReserve.result);
    });

    suite.test('可用條件：一般關（always）可用，缺省視為 always', () => {
        assert.isTrue(checkQuickResolve(input()).allowed);
        assert.isTrue(checkQuickResolve(input({ stage: { id: 'x', battleKind: 'siege', allowQuickResolve: 'always' } })).allowed);
        assert.isTrue(checkQuickResolve(input({ stage: null })).allowed);
    });

    suite.test('可用條件：首次挑戰的劇情／Boss 關（after-clear）不可用，打贏過才可用', () => {
        const stage = { id: 'chain-1', battleKind: 'field', allowQuickResolve: 'after-clear' };
        const first = checkQuickResolve(input({ stage }));
        assert.isFalse(first.allowed);
        assert.equals('first-clear', first.block);
        assert.equals('首次挑戰須親自指揮', first.reason);
        assert.isTrue(checkQuickResolve(input({ stage, clearedStageIds: ['chain-1'] })).allowed);
        assert.isFalse(checkQuickResolve(input({ stage, clearedStageIds: ['other'] })).allowed, '別關打贏不算');
    });

    suite.test('可用條件：守城戰與單挑永遠不可用（即使資料寫 always、打贏過）', () => {
        const defense = checkQuickResolve(input({ stage: { id: 'd1', battleKind: 'defense', allowQuickResolve: 'always' }, clearedStageIds: ['d1'] }));
        assert.isFalse(defense.allowed);
        assert.equals('守城戰無法極速決戰', defense.reason);
        const duel = checkQuickResolve(input({ stage: { id: 'u1', battleKind: 'duel', allowQuickResolve: 'always' }, clearedStageIds: ['u1'] }));
        assert.isFalse(duel.allowed);
        assert.equals('單挑無法極速決戰', duel.reason);
        const inBattleDuel = checkQuickResolve(input({ duelActive: true }));
        assert.equals('duel', inBattleDuel.block, '戰場內單挑進行中');
        assert.equals('stage-never', checkQuickResolve(input({ stage: { id: 'n', allowQuickResolve: 'never' } })).block);
        assert.equals('stage-never', checkQuickResolve(input({ stage: { id: 'n', allowQuickResolve: false } })).block);
    });

    suite.test('每日次數：免費 3 次、用完耗軍令狀、都沒有時不可用（TC-AUTOBATTLE-06）', () => {
        resetQuickResolveConfig();
        let daily: QuickResolveDaily = EMPTY_QUICK_RESOLVE_DAILY;
        const writs: number[] = [];
        let writCount = 1;
        for (let i = 0; i < 3; i++) {
            const check = checkQuickResolve(input({ daily, writCount }));
            assert.isTrue(check.allowed, `第 ${i + 1} 次`);
            assert.isFalse(check.usesWrit);
            const spend = spendQuickResolve(daily, D1);
            daily = spend.daily;
            writs.push(spend.writSpent);
        }
        assert.equals(0, quickResolveFreeLeft(daily, D1));
        const fourth = checkQuickResolve(input({ daily, writCount }));
        assert.isTrue(fourth.allowed);
        assert.isTrue(fourth.usesWrit, '免費用完改耗軍令狀');
        const spend4 = spendQuickResolve(daily, D1);
        daily = spend4.daily;
        writs.push(spend4.writSpent);
        writCount -= spend4.writSpent;
        assert.equals('[0,0,0,1]', json(writs));
        const fifth = checkQuickResolve(input({ daily, writCount }));
        assert.isFalse(fifth.allowed);
        assert.equals('no-uses', fifth.block);
        assert.isTrue(fifth.reason.includes('軍令狀'));
    });

    suite.test('換日重置：隔天免費次數回到 3；時鐘回撥不重置', () => {
        resetQuickResolveConfig();
        const used: QuickResolveDaily = { day: D1, used: 3 };
        assert.equals(0, quickResolveFreeLeft(used, D1));
        assert.equals(3, quickResolveFreeLeft(used, D2));
        assert.equals(0, quickResolveFreeLeft(used, '2026-11-21'), '回撥到前一天不重置');
        assert.equals(json({ day: D2, used: 0 }), json(rollQuickResolveDaily(used, D2)));
        assert.equals(json({ day: D2, used: 1 }), json(spendQuickResolve(used, D2).daily));
        assert.equals(0, spendQuickResolve(used, D2).writSpent, '隔天第一次免費');
    });

    suite.test('設定來自 JSON：次數與軍令狀耗量可改，缺值與壞值退回預設', () => {
        configureQuickResolve({ dailyFreeUses: 1, writCostPerUse: 2 });
        let daily: QuickResolveDaily = EMPTY_QUICK_RESOLVE_DAILY;
        daily = spendQuickResolve(daily, D1).daily;
        assert.equals(0, quickResolveFreeLeft(daily, D1));
        assert.equals(2, spendQuickResolve(daily, D1).writSpent);
        assert.isFalse(checkQuickResolve(input({ daily, writCount: 1 })).allowed, '軍令狀不足 2 張');
        configureQuickResolve({ dailyFreeUses: 'x', writCostPerUse: -1, writItemId: '' });
        assert.equals(3, quickResolveFreeLeft(EMPTY_QUICK_RESOLVE_DAILY, D1));
        configureQuickResolve(null);
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.dailyFreeUses, 3);
        resetQuickResolveConfig();
    });

    suite.test('JSON 檔與內建預設一致；軍令狀登入 item-config 與 encounters 資料', () => {
        const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'resources', 'data', 'quick-resolve-config.json'), 'utf8'));
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.dailyFreeUses, cfg.dailyFreeUses);
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.writItemId, cfg.writItemId);
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.writCostPerUse, cfg.writCostPerUse);
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.reservePowerPerTroop, cfg.reservePowerPerTroop);
        assert.equals(DEFAULT_QUICK_RESOLVE_CONFIG.enemyReserveTroops, cfg.enemyReserveTroops);
        const itemCfg = normalizeItemConfig(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'resources', 'data', 'item-config.json'), 'utf8')));
        const writ = itemCfg.items.find((i) => i.id === ITEM_QUICK_RESOLVE_WRIT);
        assert.isTrue(!!writ, 'item-config.json 有軍令狀');
        assert.equals(null, writ?.stack.max);
        assert.equals(JSON.stringify(DEFAULT_ITEM_CONFIG.items), JSON.stringify(itemCfg.items), 'DEFAULT_ITEM_CONFIG 與 JSON 一致');
        const enc = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'resources', 'data', 'encounters.json'), 'utf8')).encounters as Array<{ id: string; battleKind?: string; allowQuickResolve?: string; chainId?: string }>;
        for (const e of enc) {
            if (e.battleKind === 'defense') assert.equals('never', e.allowQuickResolve, `${e.id} 守城`);
            else if (e.chainId || e.id.startsWith('extreme-')) assert.equals('after-clear', e.allowQuickResolve, `${e.id} 劇情／Boss`);
            assert.isTrue(e.allowQuickResolve === undefined || ['always', 'after-clear', 'never'].includes(e.allowQuickResolve), `${e.id} 值合法`);
        }
    });

    suite.test('存檔正規化：壞值視為沒有紀錄，來回不變', () => {
        const empty = json({ daily: { day: null, used: 0 }, bossCleared: [] });
        assert.equals(empty, json(normalizeQuickResolveSave(undefined)));
        assert.equals(empty, json(normalizeQuickResolveSave({ day: 'x', used: 5, bossCleared: 3 })));
        const state = normalizeQuickResolveSave({ day: D1, used: 2, bossCleared: ['extreme-lu-bu', 'extreme-lu-bu', '', 7] });
        assert.equals(json({ day: D1, used: 2 }), json(state.daily));
        assert.equals('["extreme-lu-bu"]', json(state.bossCleared));
        assert.equals(json(state), json(normalizeQuickResolveSave(quickResolveSaveOf(state))));
    });

    suite.test('GameSession：先用免費次數、用完扣軍令狀、不足拒絕且不改狀態、隔天恢復、讀檔保留', async () => {
        resetQuickResolveConfig();
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter);
        const stage = { id: 'stage-a', battleKind: 'field' };
        await session.addItem(ITEM_QUICK_RESOLVE_WRIT, 1);
        for (let i = 0; i < 3; i++) assert.isTrue(await session.spendQuickResolveUse(stage, DAY1));
        assert.equals(1, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '免費次數不扣軍令狀');
        assert.equals(3, session.quickResolveUsedToday(DAY1));
        assert.isTrue(await session.spendQuickResolveUse(stage, DAY1_LATE));
        assert.equals(0, session.itemCount(ITEM_QUICK_RESOLVE_WRIT), '第 4 次耗 1 張軍令狀');
        const blocked = session.checkQuickResolve(stage, DAY1_LATE);
        assert.isFalse(blocked.allowed);
        assert.equals('no-uses', blocked.block);
        assert.isFalse(await session.spendQuickResolveUse(stage, DAY1_LATE));
        assert.equals(4, session.quickResolveUsedToday(DAY1_LATE), '拒絕時不計次');

        const reloaded = makeSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.equals(4, reloaded.quickResolveUsedToday(DAY1_LATE), '讀檔保留當日次數');
        assert.equals(0, reloaded.quickResolveUsedToday(DAY2), '隔天歸零');
        assert.isTrue(reloaded.checkQuickResolve(stage, DAY2).allowed);
    });

    suite.test('GameSession：關卡條件走通關紀錄；天下征鋒 Boss 關勝利另記，敗不記', async () => {
        resetQuickResolveConfig();
        const session = makeSession(new MemoryStorageAdapter());
        const chain = { id: 'encounter-002', battleKind: 'field', allowQuickResolve: 'after-clear' };
        const boss = { id: 'extreme-lu-bu', battleKind: 'field', allowQuickResolve: 'after-clear' };
        assert.equals('first-clear', session.checkQuickResolve(chain, DAY1).block);
        assert.equals('first-clear', session.checkQuickResolve(boss, DAY1).block);
        await session.recordBattle(['hero'], 'enemy-win', { stageId: 'extreme-lu-bu' });
        assert.isFalse(session.checkQuickResolve(boss, DAY1).allowed, '敗北不算打贏過');
        await session.recordBattle(['hero'], 'player-win', { stageId: 'encounter-002' });
        await session.recordBattle(['hero'], 'player-win', { stageId: 'extreme-lu-bu' });
        assert.isTrue(session.checkQuickResolve(chain, DAY1).allowed);
        assert.isTrue(session.checkQuickResolve(boss, DAY1).allowed, 'Boss 關勝利紀錄');
        assert.isFalse(session.checkQuickResolve({ id: 'defense-tier-1', battleKind: 'defense' }, DAY1).allowed);
        assert.isFalse(session.checkQuickResolve(chain, DAY1, true).allowed, '單挑進行中');
    });

    suite.test('UI：不可用時極速決戰鈕灰掉並顯示原因，可用時顯示今日次數', () => {
        const blocked = quickSortieChooseView('關', '敵', checkQuickResolve(input({ stage: { id: 'c', allowQuickResolve: 'after-clear' } })));
        assert.isFalse(blocked.enabled.btnQuickBattle);
        assert.isTrue(blocked.enabled.btnCommandBattle, '親自指揮照常可按');
        assert.isTrue(blocked.texts.quickSortieBody.includes('首次挑戰須親自指揮'));
        const ok = quickSortieChooseView('關', '敵', checkQuickResolve(input()));
        assert.isTrue(ok.enabled.btnQuickBattle);
        assert.isTrue(ok.texts.quickSortieBody.includes('今日免費 3/3 次'));
        assert.isTrue(quickSortieChooseView('關', '敵').enabled.btnQuickBattle, '沒給條件＝舊行為可用');
    });

    suite.test('接線：戰場自動再按先過可用條件、結算前計次；大廳出征帶條件並計次', () => {
        const bridge = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'battle', 'views', 'BattleUIBridge.ts'), 'utf8');
        assert.isTrue(bridge.includes('this._quickResolveGate()') && bridge.includes('spendQuickResolveUse('));
        assert.isTrue(bridge.includes('getSortieState()?.poolCurrent') && bridge.includes('finalizeQuickResolve('));
        assert.isTrue(bridge.includes("cause: 'auto'"));
        const gateAt = bridge.indexOf('const gate = this._quickResolveGate();');
        const pressAt = bridge.indexOf('this.autoPlay.press();', gateAt);
        assert.isTrue(gateAt > 0 && pressAt > gateAt, '不可用時不呼叫 press（維持自動代打）');
        const lobby = fs.readFileSync(path.join(ROOT, 'assets', 'scripts', 'ui', 'scenes', 'LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('gate: services().session.checkQuickResolve(encounter)'));
        const quick = lobby.slice(lobby.indexOf('private async _runQuickSortie'), lobby.indexOf('private _syncLineagePopup'));
        assert.isTrue(quick.includes('spendQuickResolveUse(') && quick.includes('playerTroops'));
    });

    return suite;
}
