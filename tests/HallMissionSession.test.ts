/**
 * HallMissionSession — 通用任務服務接進 GameSession：產生、全員候選與原因、派出、委任吃記憶、
 * 換季結算寫武將心智、存讀檔與 v1 舊檔遷移（PROG-2-9148；原 PROG-2-9130 的整合測試改寫）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sys } from 'cc';
import { GameSession, InMemoryRosterStore, type HallMissionWallet } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { emptyHallMissionState, parseHallMissionBalance, parseHallMissionTemplates } from '../assets/scripts/core/systems/HallMissionData';
import { refillHallBoards } from '../assets/scripts/core/systems/HallMissionGenerator';
import { dispatchHallMission as dispatchLegacy } from '../assets/scripts/core/systems/HallMissionLoop';
import { boardToHub } from '../assets/scripts/ui/mission/MissionBoardPresenter';
import { buildMissionDialogState, candidateOptions, MISSION_NO_CANDIDATE_TEXT } from '../assets/scripts/ui/mission/MissionDetailPresenter';
import type { MissionCardView } from '../assets/scripts/core/mission/service/IMissionService';
import { realBundle } from './mission/missionTestKit';

const readData = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));

function wallet(initial = 5000): HallMissionWallet & { amount: () => number } {
    let gold = initial;
    return {
        gold: () => gold,
        spend: (n: number) => { if (gold < n) return false; gold -= n; return true; },
        grant: (n: number) => { gold += n; },
        amount: () => gold,
    };
}

function general(id: string, over: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 85, int: 60, lea: 85, pol: 50, cha: 50, luk: 40, ...over,
    } as unknown as GeneralConfig;
}

async function newSession(adapter = new MemoryStorageAdapter(), roster: GeneralConfig[] = [general('zhang'), general('guan')]): Promise<GameSession> {
    services().initialize();
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(true);
    session.startNewGame(7);
    session.addGenerals(roster);
    return session;
}

async function reload(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const restored = new GameSession();
    restored.setRosterStore(new InMemoryRosterStore([]));
    restored.setSaveService(new PlayerSaveService(adapter));
    await restored.load();
    return restored;
}

function openCards(session: GameSession): MissionCardView[] {
    const b = session.missionService!.getBoard();
    if (!b.ok) throw new Error('board');
    return b.value.missions.filter((m) => m.status === 'OPEN');
}

let seq = 0;
const rid = (): string => `s-${(seq += 1)}`;

export function createHallMissionSessionSuite(): TestSuite {
    const suite = new TestSuite('HallMissionSession (GameSession 整合任務服務：產生／全員候選／派出／委任記憶／結算心智／存讀檔／遷移，PROG-2-9148)');
    const bundle = realBundle();
    const wallOfTheme = (theme: string) => (bundle.themes.get(theme)!.wall as 'Military' | 'Domestic' | 'Expedition');

    suite.test('新局綁定後立即產生：三面牆各 4 筆未接取，只產生一次', async () => {
        const session = await newSession();
        assert.isFalse(session.hallMissionsReady);
        assert.isTrue(session.bindMissionData(bundle, wallet()));
        assert.isTrue(session.hallMissionsReady);
        assert.equals(12, openCards(session).length);
        const first = JSON.stringify(session.missionService!.getSnapshot());
        assert.isFalse(session.bindMissionData(bundle, wallet()), '第二次綁定不重新產生');
        assert.equals(first, JSON.stringify(session.missionService!.getSnapshot()));
    });

    suite.test('候選＝真實名冊全員：死亡、被囚、退役教官、未畢業、精力不足都列出並附原因；可派者在前', async () => {
        const roster = [
            general('ok'),
            general('dead', { status: 'dead' }),
            general('captive', { captivity: { by: 'enemy' } }),
            general('mentor', { isMentorCard: true }),
            general('kid', { status: 'Mystery', hiddenFlags: ['mystery-phase'] }),
            general('tired', { vitality: 1 }),
        ];
        const session = await newSession(new MemoryStorageAdapter(), roster);
        session.bindMissionData(bundle, wallet());
        const r = session.missionService!.getCandidates(openCards(session)[0].id);
        if (!r.ok) throw new Error('cands');
        assert.equals(6, r.value.length, '名冊六位全列出，沒有人消失');
        const text = (id: string): string => r.value.find((c) => c.generalId === id)!.blockText;
        assert.equals('', text('ok'));
        assert.isTrue(text('dead').length > 0, 'dead: ' + text('dead'));
        assert.isTrue(text('captive').length > 0, 'captive: ' + text('captive'));
        assert.isTrue(text('mentor').length > 0, 'mentor: ' + text('mentor'));
        assert.isTrue(text('kid').length > 0, 'kid: ' + text('kid'));
        assert.isTrue(text('tired').length > 0, 'tired: ' + text('tired'));
        assert.equals('ok', r.value[0].generalId);
        const options = candidateOptions(r.value);
        assert.equals(6, options.length);
        assert.isTrue(options.find((o) => o.id === 'ok')!.blockedText === undefined);
        assert.isTrue((options.find((o) => o.id === 'captive')!.blockedText ?? '').length > 0);
        assert.isFalse(options.some((o) => o.label.includes('關羽')), '清單裡不會憑空出現設計稿的關羽');
    });

    suite.test('名冊為空：候選為空、詳情視窗顯示空狀態文字，不出現任何設計稿武將', async () => {
        const session = await newSession(new MemoryStorageAdapter(), []);
        session.bindMissionData(bundle, wallet());
        const id = openCards(session)[0].id;
        const c = session.missionService!.getCandidates(id);
        if (!c.ok) throw new Error('cands');
        assert.equals(0, c.value.length);
        assert.equals(0, candidateOptions(c.value).length);
        const state = buildMissionDialogState(session.missionService!, id, wallOfTheme, {
            season: 1, stock: session.hallMissionStock(), reconGrainCost: 50, selectedGeneralId: null,
        });
        assert.isTrue(state !== null);
        if (!state) return;
        assert.equals(MISSION_NO_CANDIDATE_TEXT, state.generalSelectHintLabel);
        assert.isFalse(state.availableActions.includes('execute'));
        assert.equals(MISSION_NO_CANDIDATE_TEXT, state.actionBlockedText.execute);
    });

    suite.test('舊式 hub 轉接：三面牆都有任務，耗費是明牌', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());
        const hub = boardToHub({ Current_Theme: {}, Mission_Boards: {} } as never, session.missionService!, wallOfTheme);
        let total = 0;
        for (const w of ['Military', 'Domestic', 'Expedition'] as const) total += hub.Mission_Boards[w]!.Tasks.length;
        assert.equals(12, total);
        const any = (['Military', 'Domestic', 'Expedition'] as const).flatMap((w) => hub.Mission_Boards[w]!.Tasks);
        assert.isTrue(any.every((t) => t.Is_Accepted === false));
    });

    suite.test('派出：扣資源與精力，武將變任務中，出征編隊不可選；同一位不能同時出兩個', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());
        const svc = session.missionService!;
        const card = openCards(session)[0];
        const d = svc.getDetail(card.id, { generalId: 'zhang' });
        if (!d.ok) throw new Error('detail');
        const stock = session.hallMissionStock();
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['zhang'] });
        assert.isTrue(r.ok, r.ok ? '' : r.text);
        const after = session.hallMissionStock();
        assert.equals(stock.grain - d.value.cost.grain, after.grain);
        assert.equals(stock.troops - d.value.cost.troops, after.troops);
        assert.equals(stock.silver - d.value.cost.silver, after.silver);
        assert.isTrue(session.hallBusyGeneralIds().includes('zhang'));
        assert.isTrue(session.checkDeployable('zhang').reasons.includes('on-hall-mission'));
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === 'zhang'));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === 'guan'));
        const again = await svc.dispatch({ requestId: rid(), missionId: openCards(session)[0].id, generalIds: ['zhang'] });
        assert.isFalse(again.ok);
        const cands = svc.getCandidates(openCards(session)[0].id);
        if (!cands.ok) throw new Error('cands');
        assert.isTrue(cands.value.find((c) => c.generalId === 'zhang')!.block.length > 0);
        assert.equals(0, cands.value.find((c) => c.generalId === 'guan')!.block.length);
    });

    suite.test('資源不足：整筆不動，沒有扣任何資源也沒有佔用武將', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet(0));
        const svc = session.missionService!;
        const card = openCards(session).find((c) => {
            const d = svc.getDetail(c.id);
            return d.ok && d.value.cost.silver > 0;
        });
        if (!card) throw new Error('找不到需要黃金的任務');
        const stock = JSON.stringify(session.hallMissionStock());
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['zhang'] });
        assert.isFalse(r.ok);
        assert.equals(stock, JSON.stringify(session.hallMissionStock()));
        assert.equals(0, session.hallBusyGeneralIds().length);
    });

    suite.test('委任吃武將記憶（真實武將心智）：勝績者被選，敗績者落選', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());
        const svc = session.missionService!;
        const card = openCards(session)[0];
        const wall = bundle.themes.get(card.theme)!.wall;
        for (let i = 0; i < 5; i += 1) {
            session.mind.onTaskSettled({ taskId: `old-w-${i}`, season: 1, tags: [card.theme, wall], label: '舊勝績', risk: 2, intelLevelAtDispatch: 3, generalIds: ['guan'], delegated: false, volunteered: false, outcome: 'SUCCESS' } as never);
            session.mind.onTaskSettled({ taskId: `old-l-${i}`, season: 1, tags: [card.theme, wall], label: '舊敗績', risk: 2, intelLevelAtDispatch: 3, generalIds: ['zhang'], delegated: false, volunteered: false, outcome: 'FAIL' } as never);
        }
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: 'delegate' });
        assert.isTrue(r.ok, r.ok ? '' : r.text);
        if (r.ok) assert.equals('guan', r.value.generalIds[0]);
    });

    suite.test('換季結算：武將心智收到該任務；武將恢復可用；任務板補回', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());
        const svc = session.missionService!;
        const card = openCards(session)[0];
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['zhang'] });
        if (!r.ok) throw new Error(r.text);
        let settled = 0;
        for (let i = 0; i < 5 && settled === 0; i += 1) {
            const adv = await session.advanceSeason();
            settled += adv.hallMissionReport?.settled ?? 0;
        }
        assert.equals(1, settled, '到期要結算');
        const ledger = session.mind.snapshot().ledger.zhang;
        assert.isTrue(ledger !== undefined, '心智有帳');
        const stat = ledger.byTag[card.theme];
        assert.isTrue(stat !== undefined && stat.win + stat.loss === 1, '以主題為標籤累計勝敗');
        assert.isTrue(Object.keys(ledger.byTag).some((t) => t.startsWith('b:')), '分支進了標籤');
        assert.isTrue(Object.keys(ledger.byTag).some((t) => t.startsWith('t:')), '成敗等級進了標籤');
        assert.isFalse(session.hallBusyGeneralIds().includes('zhang'));
        assert.equals(12, openCards(session).length);
    });

    suite.test('存讀檔：任務與進行中狀態完整還原（v2）；讀檔後不重新產生', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        session.bindMissionData(bundle, wallet());
        const card = openCards(session)[0];
        await session.missionService!.recon({ requestId: rid(), missionId: card.id });
        await session.missionService!.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['zhang'] });
        await session.save();
        const before = JSON.stringify(session.missionService!.getSnapshot().missions);
        const restored = await reload(adapter);
        assert.isFalse(restored.bindMissionData(bundle, wallet()), '有存檔就不重新產生');
        assert.equals(before, JSON.stringify(restored.missionService!.getSnapshot().missions));
        assert.isTrue(restored.hallBusyGeneralIds().includes('zhang'));
    });

    suite.test('舊存檔（沒有任務欄位）：讀得進來，綁定時才第一次產生任務', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        await session.save();
        const restored = await reload(adapter);
        assert.isFalse(restored.hallMissionsReady);
        assert.isTrue(restored.bindMissionData(bundle, wallet()));
        assert.equals(12, openCards(restored).length);
    });

    suite.test('資料綁定後才開新局：任務立刻重新產生，牆不會變空', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());
        session.startNewGame(99);
        assert.isTrue(session.hallMissionsReady);
        assert.equals(12, openCards(session).length);
    });

    suite.test('v1 舊檔讀入：進行中任務不遺失、仍佔用武將、到期照常結算；資料未綁定時存回不丟', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        await session.save();
        const t = parseHallMissionTemplates(readData('hall-mission-templates.json'));
        const b = parseHallMissionBalance(readData('hall-mission-balance.json'));
        if (t.ok === false || b.ok === false) throw new Error('舊資料驗證失敗');
        const state = refillHallBoards(emptyHallMissionState(123), t.value, b.value, 1, 5);
        const target = state.boards.Military[0];
        const disp = dispatchLegacy(state, {
            missionId: target.id, delegated: false, season: 1, stock: { grain: 9999, silver: 9999, troops: 9999 },
            general: { id: 'zhang', name: 'zhang', power: 300, vitality: 100, stats: { str: 85, lea: 85, int: 60, pol: 50, cha: 50 }, block: null },
        } as never, b.value) as { ok: boolean; state?: unknown; text?: string };
        if (!disp.ok) throw new Error(disp.text);
        const raw = new PlayerSaveService(adapter);
        const snap = await raw.load();
        await raw.save({ ...snap!, hallMissions: disp.state as never, hallIntel: {} });

        const restored = await reload(adapter);
        assert.isFalse(restored.hallMissionsReady, '資料還沒綁定');
        const mid = await restored.save();
        assert.isTrue(mid.hallMissions !== undefined, '未綁定時舊資料原樣存回，不遺失');
        restored.bindMissionData(bundle, wallet());
        assert.isTrue(restored.hallBusyGeneralIds().includes('zhang'), '進行中任務的武將仍在忙');
        const board = restored.missionService!.getBoard();
        if (!board.ok) throw new Error('board');
        const kept = board.value.missions.find((m) => m.id === target.id);
        assert.isTrue(kept !== undefined && kept.status === 'ACTIVE');
        const saved = await restored.save();
        assert.isTrue(saved.missionSave !== undefined, '遷移後改存 v2');
        let settled = 0;
        for (let i = 0; i < 5 && settled === 0; i += 1) settled += (await restored.advanceSeason()).hallMissionReport?.settled ?? 0;
        assert.equals(1, settled, '舊任務到期結算');
        assert.isFalse(restored.hallBusyGeneralIds().includes('zhang'));
    });

    return suite;
}
