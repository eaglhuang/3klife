// @spec-source → PROG-2-9426 年終守城流程（使用者 11/20 年終守城裁決）
/**
 * YearEndDefense.test.ts — 年終守城：依年度選檔、最強鄰國挑選、本年是否欠守城、打完記年份並存讀檔、快進停在年末。
 *
 * Unity 對照：年度難度表與年末事件旗標的規則測試，不開場景。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    DEFAULT_YEAR_END_DEFENSE,
    isYearEndDefenseDue,
    isYearEndRolloverPending,
    YEAR_END_RESUME_MOUNT_IDS,
    parseYearEndDefenseConfig,
    strongestInvader,
    yearEndDefenseTierFor,
} from '../assets/scripts/core/systems/YearEndDefense';
import { createRivalWorld, type NationState, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { fastForwardSeasons, FAST_FORWARD_REASON_TEXT } from '../assets/scripts/core/systems/SeasonFastForward';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, normalizeYearEndDefenseYear } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function readData(name: string): unknown {
    return JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));
}

function withNations(world: RivalWorld, patch: (n: NationState) => Partial<NationState>): RivalWorld {
    return { nations: world.nations.map((n) => ({ ...n, ...patch(n) })) };
}

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([{
        id: 'lead-1', name: 'lead-1', faction: 'shu', gender: '男', age: 30, hp: 1000, ep: 10,
        vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createYearEndDefenseSuite(): TestSuite {
    const suite = new TestSuite('YearEndDefense');

    suite.test('設定檔：三檔依年度切換，起始第 1／3／5 年；壞檔用預設', () => {
        const real = parseYearEndDefenseConfig(readData('year-end-defense.json'));
        assert.equals(3, real.tiers.length);
        assert.equals('defense-tier-1', yearEndDefenseTierFor(1, real).encounterId);
        assert.equals('defense-tier-1', yearEndDefenseTierFor(2, real).encounterId);
        assert.equals('defense-tier-2', yearEndDefenseTierFor(3, real).encounterId);
        assert.equals('defense-tier-2', yearEndDefenseTierFor(4, real).encounterId);
        assert.equals('defense-tier-3', yearEndDefenseTierFor(5, real).encounterId);
        assert.equals('defense-tier-3', yearEndDefenseTierFor(30, real).encounterId);
        assert.equals(DEFAULT_YEAR_END_DEFENSE, parseYearEndDefenseConfig(null));
        assert.equals(DEFAULT_YEAR_END_DEFENSE, parseYearEndDefenseConfig({ tiers: [{ encounterId: '', fromYear: 0 }] }));
        const unsorted = parseYearEndDefenseConfig({ tiers: [{ encounterId: 'b', fromYear: 4 }, { encounterId: 'a', fromYear: 1 }] });
        assert.equals('a', yearEndDefenseTierFor(2, unsorted).encounterId);
    });

    suite.test('三檔遭遇都存在、都是守城類別，且一檔比一檔帶更多工兵', () => {
        const data = readData('encounters.json') as { encounters: Array<{ id: string; battleKind?: string; enemyInitialDeployment?: Array<{ type: string }> }> };
        const engineers: number[] = [];
        for (const tier of DEFAULT_YEAR_END_DEFENSE.tiers) {
            const enc = data.encounters.find((e) => e.id === tier.encounterId);
            assert.isTrue(!!enc, tier.encounterId);
            assert.equals('defense', enc!.battleKind);
            engineers.push((enc!.enemyInitialDeployment ?? []).filter((d) => d.type === 'engineer').length);
        }
        assert.isTrue(engineers[0] < engineers[1] && engineers[1] < engineers[2], engineers.join(','));
    });

    suite.test('本年是否欠守城：只有第 4 季且今年還沒打；打完後同年第 4 季要換年', () => {
        assert.isTrue(isYearEndDefenseDue({ currentYear: 1, currentSeason: 4 }, 0));
        assert.isTrue(!isYearEndDefenseDue({ currentYear: 1, currentSeason: 3 }, 0));
        assert.isTrue(!isYearEndDefenseDue({ currentYear: 2, currentSeason: 4 }, 2));
        assert.isTrue(isYearEndDefenseDue({ currentYear: 3, currentSeason: 4 }, 2));
        assert.isTrue(isYearEndRolloverPending({ currentYear: 2, currentSeason: 4 }, 2));
        assert.isTrue(!isYearEndRolloverPending({ currentYear: 3, currentSeason: 1 }, 2));
    });

    suite.test('最強鄰國：國力最高者的君主來攻；滅亡排除、有敵國時不挑同盟、現任君主優先', () => {
        const base = createRivalWorld();
        const first = strongestInvader(base);
        assert.equals('wei', first?.nationId);
        assert.equals('cao-cao', first?.generalId);
        assert.equals('魏', first?.nationName);

        const weiFallen = withNations(base, (n) => (n.id === 'wei' ? { fallen: true } : {}));
        assert.equals('yuan', strongestInvader(weiFallen)?.nationId);

        const weiAllied = withNations(base, (n) => (n.id === 'wei' ? { allied: true } : {}));
        assert.equals('yuan', strongestInvader(weiAllied)?.nationId);

        const allAllied = withNations(base, () => ({ allied: true }));
        assert.equals('wei', strongestInvader(allAllied)?.nationId, '全是同盟時仍挑最強');

        assert.equals('cao-pi', strongestInvader(base, { wei: 'cao-pi' })?.generalId);
        assert.equals(null, strongestInvader(withNations(base, () => ({ fallen: true }))));
    });

    suite.test('守城打完記下年份並存讀檔；一般戰鬥不記', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter);
        assert.equals(0, session.yearEndDefenseYear);
        await session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(0, session.yearEndDefenseYear, '一般戰鬥不算守城');
        await session.recordBattle(['lead-1'], 'enemy-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: false } });
        assert.equals(session.gameTime.currentYear, session.yearEndDefenseYear, '輸了也算打過');
        await session.save();

        const reloaded = makeSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.equals(session.gameTime.currentYear, reloaded.yearEndDefenseYear);
        assert.equals(0, normalizeYearEndDefenseYear(undefined));
        assert.equals(0, normalizeYearEndDefenseYear(-1));
        assert.equals(0, normalizeYearEndDefenseYear(1.5));
        assert.equals(4, normalizeYearEndDefenseYear(4));
        assert.isTrue(makeSession(new MemoryStorageAdapter()).createSnapshot(new Date(0)).resources?.yearEndDefenseYear === undefined);
    });

    suite.test('快進：年終守城沒打時停在原地，回報停下原因', async () => {
        let seasons = 0;
        const step = async () => { seasons += 1; return { unveilings: [], agingEvents: [] }; };
        const result = await fastForwardSeasons(step, () => false, 20, () => seasons >= 2);
        assert.equals(2, result.seasons);
        assert.equals('year-end-defense', result.reason);
        assert.contains(FAST_FORWARD_REASON_TEXT[result.reason], '守城');
        const blockedNow = await fastForwardSeasons(step, () => false, 20, () => true);
        assert.equals(0, blockedNow.seasons);
    });

    suite.test('大廳接線：第 4 季結束先開打守城、打完回大廳自動換年、結算窗不可重打', () => {
        const lobby = readFileSync(join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('if (this._isYearEndDefenseDue()) {'));
        assert.isTrue(lobby.includes('void this._resumeYearEndRollover();'));
        assert.isTrue(lobby.includes('() => this._isYearEndDefenseDue());'));
        const bridge = readFileSync(join(__dirname, '..', 'assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        assert.isTrue(bridge.includes('setReplayAllowed?.(this.ctx.ctrl?.state.siegeDefender !== Faction.Player)'));
    });

    suite.test('守城回大廳換年不等全部背景面板：換年用面板 id 都在掛載清單、且先補建再換年（PROG-2-10163）', () => {
        const lobby = readFileSync(join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        for (const id of YEAR_END_RESUME_MOUNT_IDS) {
            assert.isTrue(lobby.includes(`{ id: '${id}'`), `背景掛載清單缺 ${id}`);
        }
        assert.isTrue(lobby.includes('void this._resumeYearEndRolloverEarly(scheduler);'));
        const early = lobby.indexOf('void this._resumeYearEndRolloverEarly(scheduler);');
        assert.isTrue(early > 0 && early < lobby.indexOf('await scheduler.runAll('), '提早換年必須在 runAll 之前啟動');
    });

    return suite;
}
