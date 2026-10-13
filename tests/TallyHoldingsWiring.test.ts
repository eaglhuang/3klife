/**
 * TallyHoldingsWiring — 虎符持有接進存檔與陣亡事件的 headless 測試（PROG-2-0235 / PROG-2-0236，WBS TRP-08）
 *
 * 重點：持有關係與虎符卡要能存檔讀回；舊檔沒有欄位時補空表；
 * 只有 alive → dead 的轉變才會退回虎符、產出陣亡虎符（不會重複產卡）。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService, normalizeTallyCardsMap, normalizeTallyHoldingsMap } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import { computeDeathBattleScore, settleDeathTallies, TALLY_DEATH_SCORE_TUNING } from '../assets/scripts/core/systems/TallyDeathSettlement';
import { createTallyHoldings } from '../assets/scripts/core/systems/TigerTallyHoldings';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

function general(id: string, status = 'alive', extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, status, ...extra } as unknown as GeneralConfig;
}

function card(uid: string): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 1 };
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createTallyHoldingsWiringSuite(): TestSuite {
    const suite = new TestSuite('TallyHoldingsWiring (虎符持有接線 TRP-08)');

    suite.test('normalizeTallyHoldingsMap：非物件為空表，只保留字串或 null 的條目', () => {
        assert.equals(0, Object.keys(normalizeTallyHoldingsMap(undefined)).length);
        const map = normalizeTallyHoldingsMap({ t1: 'liu', t2: null, t3: 42, '': 'x' });
        assert.equals('liu', map.t1 ?? '');
        assert.isTrue('t2' in map);
        assert.isFalse('t3' in map);
        assert.isFalse('' in map);
    });

    suite.test('normalizeTallyCardsMap：uid 與 key 不一致或缺 templateId 的卡丟棄', () => {
        const map = normalizeTallyCardsMap({ t1: card('t1'), t2: card('other'), t3: { uid: 't3' } });
        assert.isTrue('t1' in map);
        assert.isFalse('t2' in map);
        assert.isFalse('t3' in map);
    });

    suite.test('舊存檔（沒有 tallyHoldings / tallyCards）讀回補空表', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, { schemaVersion: 1, savedAt: '2026-10-01T00:00:00.000Z', gameTime: createInitialGameTimeState(), roster: [] });
        const session = createSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(0, Object.keys(session.tallyHoldings).length);
        assert.equals(0, Object.keys(session.tallyCards).length);
    });

    suite.test('登記卡、裝上後存檔，重開可讀回持有關係與卡資料', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [general('liu')]);
        await session.registerTallyCards([card('t1'), card('t2')]);
        const equipped = await session.equipTally('t1', 'liu');
        assert.isTrue(equipped?.ok ?? false);
        assert.equals('t1', session.tallyOf('liu') ?? '');

        const reopened = createSession(adapter, [general('liu')]);
        assert.isTrue(await reopened.load());
        assert.equals('t1', reopened.tallyOf('liu') ?? '');
        assert.equals(null, reopened.tallyHoldings.t2 ?? null);
        assert.equals('tpl-t2', reopened.tallyCards.t2?.templateId ?? '');
    });

    suite.test('同一武將不能裝兩張；不在名冊的武將裝不上', async () => {
        const session = createSession(new MemoryStorageAdapter(), [general('liu')]);
        await session.registerTallyCards([card('t1'), card('t2')]);
        await session.equipTally('t1', 'liu');
        const second = await session.equipTally('t2', 'liu');
        assert.equals('GENERAL_HAS_TALLY', second && !second.ok ? second.reason : '');
        assert.isTrue((await session.equipTally('t2', 'ghost')) === null);
    });

    suite.test('卸下虎符退回君主；未持有時卸下失敗', async () => {
        const session = createSession(new MemoryStorageAdapter(), [general('liu')]);
        await session.registerTallyCards([card('t1')]);
        await session.equipTally('t1', 'liu');
        assert.isTrue((await session.unequipTally('t1')).ok);
        assert.equals(null, session.tallyOf('liu'));
        const again = await session.unequipTally('t1');
        assert.equals('NOT_HELD', again.ok ? '' : again.reason);
    });

    suite.test('陣亡（alive → dead）：手上的虎符退回君主，並產出一張陣亡虎符', () => {
        const before = [general('liu'), general('guan')];
        const after = [general('liu', 'dead', { templateId: 'tpl-liu', isHistorical: true }), general('guan')];
        const state = { holdings: { holders: { t1: 'liu' } }, cards: {} };
        const result = settleDeathTallies(state, before, after, 7);
        assert.equals(null, result.holdings.holders.t1 ?? null, '持有的虎符要退回君主');
        assert.equals(1, result.returned.length);
        assert.equals(1, result.produced.length, '史實武將陣亡應產卡');
        const produced = result.cards[result.produced[0] ?? ''];
        assert.equals('death', produced?.source ?? '');
        assert.equals(null, result.holdings.holders[result.produced[0] ?? ''] ?? null, '新卡由君主持有');
    });

    suite.test('同一武將不會因重複結算而產卡兩次（before 已陣亡就略過）', () => {
        const dead = [general('liu', 'dead', { templateId: 'tpl-liu', isHistorical: true })];
        const result = settleDeathTallies({ holdings: createTallyHoldings([]), cards: {} }, dead, dead, 7);
        assert.equals(0, result.produced.length);
    });

    suite.test('不符產出條件的陣亡（一般平民）不產卡，但仍退回虎符', () => {
        const before = [general('civ')];
        const after = [general('civ', 'dead', { characterCategory: 'civilian' })];
        const state = { holdings: { holders: { t9: 'civ' } }, cards: {} };
        const result = settleDeathTallies(state, before, after, 3);
        assert.equals(0, result.produced.length);
        assert.equals(null, result.holdings.holders.t9 ?? null);
    });

    suite.test('戰鬥死亡分數依戰績加權並夾在 0~100，缺欄位視為 0', () => {
        assert.equals(0, computeDeathBattleScore(undefined));
        const t = TALLY_DEATH_SCORE_TUNING;
        const expected = Math.round(2 * t.perWin + 3 * t.perKill + 10 * t.perMerit);
        assert.equals(expected, computeDeathBattleScore({ wins: 2, losses: 0, draws: 0, merit: 10, kills: 3 }));
        assert.equals(100, computeDeathBattleScore({ wins: 999, losses: 0, draws: 0, merit: 0 }));
    });

    return suite;
}
