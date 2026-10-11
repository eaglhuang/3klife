/**
 * GameSession.test.ts — 長局主迴圈（季度推進 + 增齡 + 存檔）headless 測試（PROG-2-0021）
 *
 * Unity 對照：等同 EditMode Test，不開 Scene 直接驗證 GameManager 的純 C# 邏輯。
 */
import { TestSuite, assert } from './TestRunner';
import { GameClock, GameTimeMode, createInitialGameTimeState, formatModeLabel, formatSeasonLabel } from '../assets/scripts/core/systems/GameClock';
import {
    ageGeneralsOneSeason,
    AgingGeneral,
    deathChancePerSeason,
    resolveMaxLifespan,
    BASE_LIFESPAN,
    LIFESPAN_VARIANCE_MAX,
    LIFESPAN_VARIANCE_MIN,
} from '../assets/scripts/core/systems/GeneralAging';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    PLAYER_SAVE_KEY,
    PlayerSaveService,
    validatePlayerSaveSnapshot,
} from '../assets/scripts/core/services/PlayerSaveService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { checkWalletBalance, formatInsufficientMessage } from '../assets/scripts/core/services/GachaWalletRules';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, age: number | undefined, extra: Partial<AgingGeneral> = {}): AgingGeneral {
    return { id, name: id, faction: 'player', age, ...extra } as AgingGeneral;
}

async function assertRejects(fn: () => Promise<unknown>, message: string): Promise<void> {
    let threw = false;
    try {
        await fn();
    } catch {
        threw = true;
    }
    assert.isTrue(threw, message);
}

/** TestRunner 沒有 deepEquals，以 JSON 字串比對結構 */
function assertSameJson(expected: unknown, actual: unknown, message?: string): void {
    assert.equals(JSON.stringify(expected), JSON.stringify(actual), message);
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createGameSessionSuite(): TestSuite {
    const suite = new TestSuite('GameSession (季度推進 / 增齡 / 存檔)');

    // ── GameClock ──────────────────────────────────────────────────────────

    suite.test('GameClock：初始為第 1 年春、治理模式', () => {
        const state = new GameClock().state;
        assert.equals(1, state.currentYear);
        assert.equals(1, state.currentSeason);
        assert.equals(0, state.totalSeasonsElapsed);
        assert.equals(GameTimeMode.Governance, state.currentMode);
    });

    suite.test('GameClock：推進 4 季後跨年，只有冬→春那次標記 yearEnded', () => {
        const clock = new GameClock();
        const results = [clock.advanceSeason(), clock.advanceSeason(), clock.advanceSeason(), clock.advanceSeason()];
        assertSameJson([false, false, false, true], results.map((r) => r.yearEnded));
        assert.equals(2, clock.state.currentYear);
        assert.equals(1, clock.state.currentSeason);
        assert.equals(4, clock.state.totalSeasonsElapsed);
    });

    suite.test('GameClock：模式依 治理→作戰→培育 輪轉', () => {
        const clock = new GameClock();
        const modes = [1, 2, 3].map(() => clock.advanceSeason().current.currentMode);
        assertSameJson([GameTimeMode.Battle, GameTimeMode.Nurture, GameTimeMode.Governance], modes);
    });

    suite.test('GameClock：state 回傳複本，外部改寫不影響時鐘', () => {
        const clock = new GameClock();
        const state = clock.state;
        state.currentYear = 99;
        assert.equals(1, clock.state.currentYear);
    });

    suite.test('GameClock：restore 拒絕不合法的季節', () => {
        const clock = new GameClock();
        assert.throws(() => clock.restore({ ...createInitialGameTimeState(), currentSeason: 5 as never }));
    });

    // ── GeneralAging ───────────────────────────────────────────────────────

    suite.test('Aging：每季 +0.25 歲，4 季 +1 歲', () => {
        let roster: AgingGeneral[] = [makeGeneral('a', 20)];
        for (let i = 0; i < 4; i++) {
            roster = ageGeneralsOneSeason(roster, () => 0.99).roster;
        }
        assert.equals(21, roster[0].age);
    });

    suite.test('Aging：不改寫輸入名冊', () => {
        const input = [makeGeneral('a', 20)];
        ageGeneralsOneSeason(input, () => 0.99);
        assert.equals(20, input[0].age);
    });

    suite.test('Aging：壽命上限依 id 決定性產生，落在 60~75', () => {
        const first = resolveMaxLifespan(makeGeneral('zhao-yun', 30));
        const second = resolveMaxLifespan(makeGeneral('zhao-yun', 30));
        assert.equals(first, second, '同一武將的壽命上限應固定');
        assert.inRange(first, BASE_LIFESPAN + LIFESPAN_VARIANCE_MIN, BASE_LIFESPAN + LIFESPAN_VARIANCE_MAX);
    });

    suite.test('Aging：紅色因子每級 +3 歲壽命', () => {
        const base = resolveMaxLifespan(makeGeneral('x', 30));
        const boosted = resolveMaxLifespan(makeGeneral('x', 30, { redGeneLevel: 2 }));
        assert.equals(base + 6, boosted);
    });

    suite.test('Aging：跨過 65 歲時發出退役候選事件，只發一次', () => {
        const start = [makeGeneral('old', 64.75, { maxLifespan: 80 })];
        const first = ageGeneralsOneSeason(start, () => 0.99);
        assert.lengthEquals(1, first.events);
        assert.equals('reached-retirement-age', first.events[0].type);
        const second = ageGeneralsOneSeason(first.roster, () => 0.99);
        assert.lengthEquals(0, second.events);
    });

    suite.test('Aging：死亡率 = min(0.8, 超齡年數 × 0.1)', () => {
        assert.equals(0, deathChancePerSeason(70, 70));
        assert.isTrue(Math.abs(deathChancePerSeason(72, 70) - 0.2) < 1e-9, '超齡 2 年應為 0.2');
        assert.equals(0.8, deathChancePerSeason(90, 70));
    });

    suite.test('Aging：超過壽命且擲骰小於死亡率時死亡，死者不再增齡', () => {
        const result = ageGeneralsOneSeason([makeGeneral('elder', 75, { maxLifespan: 70 })], () => 0);
        assert.equals('dead', result.roster[0].status);
        assert.equals('died', result.events[0].type);
        const after = ageGeneralsOneSeason(result.roster, () => 0);
        assert.equals(result.roster[0].age, after.roster[0].age);
        assert.lengthEquals(0, after.events);
    });

    suite.test('Aging：沒有 age 的武將不參與增齡', () => {
        const result = ageGeneralsOneSeason([makeGeneral('unknown', undefined)], () => 0);
        assert.equals(undefined, result.roster[0].age);
        assert.lengthEquals(0, result.events);
    });

    // ── PlayerSaveService ──────────────────────────────────────────────────

    suite.test('Save：沒有存檔時 load 回傳 null', async () => {
        const service = new PlayerSaveService(new MemoryStorageAdapter());
        assert.equals(null, await service.load());
    });

    suite.test('Save：版本不符或缺欄位的存檔會拋錯', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await adapter.set(PLAYER_SAVE_KEY, { schemaVersion: 999 });
        await assertRejects(() => service.load(), '版本不符應拋錯');
        assert.throws(() => validatePlayerSaveSnapshot({
            schemaVersion: 1,
            savedAt: 'x',
            gameTime: createInitialGameTimeState(),
            roster: [{ name: '無 id' }],
        }));
    });

    // ── GameSession：M-B 驗收 ───────────────────────────────────────────────

    suite.test('Session：推進 4 季後重建 session 讀檔，年份、季節、年齡都正確（M-B）', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = createSession(adapter, [makeGeneral('liu-bei', 30), makeGeneral('guan-yu', 28)]);
        for (let i = 0; i < 4; i++) {
            await first.advanceSeason();
        }

        // 模擬重開遊戲：新的 session、空名冊，只共用儲存後端
        const reopened = createSession(adapter, []);
        assert.isTrue(await reopened.load(), '應讀到自動存檔');
        assert.equals(2, reopened.gameTime.currentYear);
        assert.equals(1, reopened.gameTime.currentSeason);
        assert.equals(4, reopened.gameTime.totalSeasonsElapsed);
        const ages = reopened.roster.map((g) => [g.id, g.age]);
        assertSameJson([['liu-bei', 31], ['guan-yu', 29]], ages);
    });

    suite.test('Session：沒有存檔時 load 回傳 false，狀態不變', async () => {
        const session = createSession(new MemoryStorageAdapter(), [makeGeneral('a', 20)]);
        assert.isFalse(await session.load());
        assert.equals(1, session.gameTime.currentYear);
        assert.equals(20, session.roster[0].age);
    });

    suite.test('Session：關閉自動存檔時推進不寫檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, [makeGeneral('a', 20)]);
        session.setAutoSave(false);
        await session.advanceSeason();
        assert.equals(null, await adapter.get(PLAYER_SAVE_KEY));
    });

    suite.test('Session：未設定存檔服務時 save 拋錯，但仍可推進', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('a', 20)]));
        await session.advanceSeason();
        assert.equals(2, session.gameTime.currentSeason);
        await assertRejects(() => session.save(), '未設定存檔服務應拋錯');
    });

    suite.test('Session：推進時廣播換季、退役與死亡事件', async () => {
        const emitted: string[] = [];
        const session = createSession(new MemoryStorageAdapter(), [
            makeGeneral('retiring', 64.75, { maxLifespan: 80 }),
            makeGeneral('dying', 90, { maxLifespan: 70 }),
        ]);
        session.setRandomSource(() => 0);
        session.setEventEmitter({ emit: (name) => emitted.push(name) });
        await session.advanceSeason();
        assertSameJson([
            GAME_SESSION_EVENTS.Saved,
            GAME_SESSION_EVENTS.SeasonAdvanced,
            GAME_SESSION_EVENTS.GeneralReachedRetirementAge,
            GAME_SESSION_EVENTS.GeneralDied,
        ], emitted);
    });

    // ── 大廳接線：抽卡進名冊 / 季度顯示 / 開場讀檔 / 扣款規則（PROG-2-0025） ──

    suite.test('大廳：季度標籤顯示「第 N 年 M 季」，模式顯示中文', () => {
        const clock = new GameClock();
        assert.equals('第 1 年 1 季', formatSeasonLabel(clock.state));
        assert.equals('治理', formatModeLabel(clock.state.currentMode));
        for (let i = 0; i < 4; i++) clock.advanceSeason();
        assert.equals('第 2 年 1 季', formatSeasonLabel(clock.state));
        assert.equals('作戰', formatModeLabel(GameTimeMode.Battle));
        assert.equals('培育', formatModeLabel(GameTimeMode.Nurture));
    });

    suite.test('大廳：抽卡成功 addGenerals 寫進名冊並立即存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter, []);
        const result = await session.addGenerals([makeGeneral('g1', 20), makeGeneral('g2', 30)]);
        assert.equals(2, result.added.length);
        assert.equals(0, result.duplicates.length);
        assert.equals(2, session.roster.length);

        const saved = validatePlayerSaveSnapshot(await adapter.get(PLAYER_SAVE_KEY));
        assertSameJson(['g1', 'g2'], saved.roster.map((general) => general.id));
    });

    suite.test('大廳：重複抽到已持有武將不重複加入，只回報 duplicates', async () => {
        const session = createSession(new MemoryStorageAdapter(), [makeGeneral('g1', 20)]);
        const result = await session.addGenerals([makeGeneral('g1', 20), makeGeneral('g2', 30), makeGeneral('g2', 30)]);
        assertSameJson(['g2'], result.added.map((general) => general.id));
        assertSameJson(['g1', 'g2'], result.duplicates.map((general) => general.id));
        assertSameJson(['g1', 'g2'], session.roster.map((general) => general.id));
    });

    suite.test('大廳：全部重複時不存檔、不廣播', async () => {
        const adapter = new MemoryStorageAdapter();
        const emitted: string[] = [];
        const session = createSession(adapter, [makeGeneral('g1', 20)]);
        session.setEventEmitter({ emit: (name) => emitted.push(name) });
        await session.addGenerals([makeGeneral('g1', 20)]);
        assert.equals(null, await adapter.get(PLAYER_SAVE_KEY));
        assert.equals(0, emitted.length);
    });

    suite.test('大廳：抽卡後重開（新 Session 讀檔）名冊與季度都還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = createSession(adapter, []);
        await first.addGenerals([makeGeneral('g1', 20)]);
        await first.advanceSeason();
        await first.advanceSeason();

        const reopened = createSession(adapter, []);
        assert.isTrue(await reopened.load(), '應讀到存檔');
        assert.equals('第 1 年 3 季', formatSeasonLabel(reopened.gameTime));
        assertSameJson(['g1'], reopened.roster.map((general) => general.id));
    });

    suite.test('大廳：開場讀檔遇到壞檔會拋錯且不改動現況（由大廳 catch 後當新局）', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, { schemaVersion: 999 });
        const session = createSession(adapter, [makeGeneral('keep', 20)]);
        await assertRejects(() => session.load(), '壞檔應拋錯');
        assertSameJson(['keep'], session.roster.map((general) => general.id));
        assert.equals('第 1 年 1 季', formatSeasonLabel(session.gameTime));
    });

    suite.test('大廳：正式模式餘額不足拒絕扣款，開發開關才自動補款', () => {
        const rejected = checkWalletBalance(50, 100, false);
        assert.isTrue(!rejected.ok, '正式模式應拒絕');
        assert.equals(50, rejected.shortfall);
        assert.equals('玉不足，還差 50', formatInsufficientMessage('gems', rejected.shortfall));

        const enough = checkWalletBalance(100, 100, false);
        assert.isTrue(enough.ok, '剛好足夠');

        const topUp = checkWalletBalance(50, 100, true, 1280);
        assert.isTrue(topUp.ok, '開發模式補款');
        assert.equals(1380, topUp.toppedUpBalance);
    });

    return suite;
}
