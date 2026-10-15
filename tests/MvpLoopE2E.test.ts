/**
 * MvpLoopE2E — 核心 MVP 迴圈端到端（純邏輯 headless，QA 線）
 *
 * 路徑：開場流程 → 宿命轉蛋鎖定 → 開新局六位名將 → 過一季 → 首戰（真的跑 BattleController）→ 戰後結算
 *      → 壽命走到退役年齡 → 退役（傳承教官卡）→ 存檔續玩。
 * 目的：不是重測各系統，而是確認「前一站的輸出真的是下一站能吃的輸入」，找斷點。
 *
 * Unity 對照：像 PlayMode 的 smoke test，從 Boot 場景一路點到結算畫面，不 mock 中間任何一站。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { STARTER_CORE_GENERAL_ID, STARTER_GENERAL_IDS } from '../assets/scripts/core/services/StarterRosterService';
import { OpeningFlowController } from '../assets/scripts/core/systems/OpeningFlowController';
import type { OpeningFlowConfig } from '../assets/scripts/core/config/OpeningFlowConfig';
import { destinyOpeningPhase, destinyLockedEvent } from '../assets/scripts/core/systems/DestinyOpening';
import {
    confirmDestinyGacha, createDestinyGachaState, optionsFromGachaConfig, resetDestinyGacha, rollDestinyGacha, selectDestinyGacha,
    type DestinyGachaOptions,
} from '../assets/scripts/core/systems/DestinyGacha';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { RETIREMENT_AGE } from '../assets/scripts/core/systems/GeneralAging';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

/** 真實宿命轉蛋規則與候選池（gacha-config.json 的 hero-pool） */
function heroPool(): { options: DestinyGachaOptions; candidates: string[] } {
    const configs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/gacha-config.json'), 'utf8')) as GachaConfig[];
    const config = configs.find((c) => c.poolId === 'hero-pool')!;
    return { options: optionsFromGachaConfig(config), candidates: [...config.candidateIds] };
}

function realGenerals(): GeneralConfig[] {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
}

function openingConfig(): OpeningFlowConfig {
    return {
        phases: [
            { id: 'intro', enterWhen: (e) => e.type === 'start', leaveWhen: (e) => e.type === 'intro-done' },
            destinyOpeningPhase('destiny', 'intro-done'),
        ],
    };
}

/** 跑完開場流程：反覆免費洗牌直到十連裡出現想要的那位，選定、確認鎖定；回傳鎖定的 id */
function runOpeningAndLockDestiny(pickId: string): string {
    const { options, candidates } = heroPool();
    const flow = new OpeningFlowController(openingConfig());
    flow.start();
    flow.advance({ type: 'intro-done' });
    let state = createDestinyGachaState();
    for (let attempt = 0; attempt < 200; attempt++) {
        const rolled = rollDestinyGacha(state, candidates, options, seeded(attempt + 1));
        assert.isTrue(rolled.ok, `十連抽應成功：${rolled.reason ?? ''}`);
        state = rolled.state;
        if (state.rolled.includes(pickId)) break;
        state = resetDestinyGacha(state, options).state;
    }
    assert.isTrue(state.rolled.includes(pickId), '洗牌足夠多次後十連應出現目標名將');
    state = selectDestinyGacha(state, pickId, options).state;
    state = confirmDestinyGacha(state).state;
    flow.advance(destinyLockedEvent(state)!);
    assert.equals(null, flow.current(), '鎖定後開場流程應結束');
    return state.locked!;
}

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createMvpLoopE2ESuite(): TestSuite {
    const suite = new TestSuite('MvpLoopE2E (新遊戲→宿命轉蛋→過一季→首戰→退役→存檔續玩)');

    suite.test('主線：宿命鎖定張飛 → 開新局 → 過一季 → 首戰 → 結算 → 退役成教官卡 → 存讀往返', async () => {
        const locked = runOpeningAndLockDestiny(STARTER_CORE_GENERAL_ID);
        assert.equals(STARTER_CORE_GENERAL_ID, locked);

        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        await session.startNewGameWithStarters(20261015, realGenerals(), { coreGeneralId: locked as typeof STARTER_CORE_GENERAL_ID });
        assert.equals(6, session.roster.length);
        assert.equals(locked, session.leadGeneralId);

        // 過一季：六人都還活著，主將仍可出戰
        await session.advanceSeason();
        assert.equals(6, session.roster.length, '第一季不應有人死亡');
        assert.isTrue(session.checkDeployable(locked).eligible, '過一季後主將仍可出戰');

        // 首戰：名冊武將 → 戰場武將設定 → 真的初始化並推進戰鬥
        const lead = session.roster.find((g) => g.id === locked)!;
        const foe = session.roster.find((g) => g.id === 'wei-yan')!;
        services().initialize();
        services().session.setRandomSource(() => 0);
        const ctrl = new BattleController();
        const playerGeneral = new GeneralUnit(buildBattleConfig(lead, Faction.Player as never) as never);
        const enemyGeneral = new GeneralUnit(buildBattleConfig(foe, Faction.Enemy as never) as never);
        ctrl.initBattle(playerGeneral, enemyGeneral);
        const trooper = new TroopUnit('p1', TroopType.Infantry, Faction.Player, { hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1 });
        trooper.moveTo(2, 1);
        ctrl.state.addUnit(trooper);
        ctrl.advanceTurn();
        assert.isTrue(ctrl.state.units.has('p1'), '戰場跑得起來');

        // 戰後結算：戰績、精力、功績
        const vitBefore = (lead as { vitality?: number }).vitality ?? 0;
        await session.recordBattle([locked], 'player-win', {
            stageId: 'stage-1', sortie: { lostTroops: 1000, foodSpent: 100 },
            performance: { [locked]: { kills: 5, damageDealt: 800, damageTaken: 100, healingDone: 0 } },
        });
        const afterBattle = session.roster.find((g) => g.id === locked) as GeneralConfig & { battleRecord?: { wins: number; kills: number }; vitality?: number };
        assert.equals(1, afterBattle.battleRecord!.wins);
        assert.equals(5, afterBattle.battleRecord!.kills);
        assert.isTrue((afterBattle.vitality ?? 0) < vitBefore, '出征後精力下降');

        // 壽命走到退役年齡
        let guard = 0;
        while (((session.roster.find((g) => g.id === locked) as { age?: number } | undefined)?.age ?? 0) < RETIREMENT_AGE && guard++ < 400) {
            await session.advanceSeason();
        }
        const alive = session.roster.find((g) => g.id === locked);
        assert.isTrue(!!alive, '張飛在退役年齡前不應已被移出名冊（隨機固定 0.99 無意外死亡）');

        // 退役 → 傳承教官卡
        const card = await session.retireGeneral(locked);
        assert.equals(`mentor-${locked}`, card.uid);
        assert.equals(1, card.generalSnapshot && (card.generalSnapshot as { battleRecord?: { wins: number } }).battleRecord!.wins, '教官卡快照保留戰績');
        const mentors = await new LegacyService(adapter).getMentorCards();
        assert.isTrue(mentors.some((m) => m.uid === card.uid), '退役教官卡已寫進傳承儲存');

        // 退役後的出征資格與主將指派
        assert.isFalse(session.checkDeployable(locked).eligible, '退役教官不能再出征');
        assert.isTrue(session.leadGeneralId !== locked, '退役後主將不應還指向已退役的教官卡');

        // 存讀往返
        await session.save();
        const b = createSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(session.roster.length, b.roster.length);
        assert.isTrue(b.leadGeneralId !== locked, '讀檔後主將也不指向退役教官');
    });

    suite.test('主將壽終（扣壽命致死）：換季結算後出戰主將指派被清掉，不指向已故武將；存讀往返一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        const elder = { id: 'elder', name: 'elder', faction: 'shu', gender: '男', age: 59.75, maxLifespan: 60, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40 } as unknown as GeneralConfig;
        const young = { ...elder, id: 'young', name: 'young', age: 30, maxLifespan: 90 } as unknown as GeneralConfig;
        session.setRosterStore(new InMemoryRosterStore([elder, young]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setLifecycle(new LegacyService(adapter));
        session.setRandomSource(() => 0.99);
        session.startNewGame(1);
        assert.isTrue(await session.setLeadGeneral('elder'));
        assert.isTrue(!!session.spendLifespan('elder', 'breeding'), '老將主動扣壽命');
        await session.advanceSeason();
        const stillThere = session.roster.find((g) => g.id === 'elder') as { status?: string } | undefined;
        assert.isTrue(!stillThere || stillThere.status === 'dead', '老將應已壽終');
        assert.equals(null, session.leadGeneralId, '主將已故，指派應清掉');
        // 清掉後可改指派在世的武將
        assert.isTrue(await session.setLeadGeneral('young'));
        assert.equals('young', session.leadGeneralId);
    });

    suite.test('斷點記錄（待 PM 裁決）：宿命轉蛋候選池 20 人，開新局只收「張飛」當核心，其餘一律被拒', async () => {
        // 規格：玩家反覆洗牌到抽中想要的名將並鎖定；開新局卻限定六位初始名將、且核心必須是 SSR 等效（目前只有張飛）。
        // 這條測試記錄現況：若 PM 決定放寬（例如六人都算 SSR 等效，或宿命池只放六人），改這裡的預期即可。
        const { candidates } = heroPool();
        const accepted: string[] = [];
        for (const id of candidates) {
            const session = createSession(new MemoryStorageAdapter());
            try {
                await session.startNewGameWithStarters(1, realGenerals(), { coreGeneralId: id as typeof STARTER_CORE_GENERAL_ID });
                accepted.push(id);
            } catch { /* 被拒 */ }
        }
        assert.equals(STARTER_CORE_GENERAL_ID, accepted.join(','), `能當核心的宿命名將：${accepted.join(',')}`);
        assert.isTrue(candidates.length > STARTER_GENERAL_IDS.length, '宿命池比六位初始名將大');
    });

    return suite;
}
