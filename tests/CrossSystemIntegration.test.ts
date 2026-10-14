/**
 * CrossSystemIntegration.test.ts — 跨系統整合測試（QA 線，PROG-2-0250）
 *
 * Unity 對照：等同 PlayMode 整合測試，不單測一個 MonoBehaviour，而是把
 * 「出征 → 戰鬥結算 → 換季 → 存檔 → 重開續玩」串成一條線，驗證各系統交接處不漏欄位。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { advanceMercenaryDay, bondMercenary, canBondMercenary, createTrialMercenary, TRIAL_DAYS } from '../assets/scripts/core/systems/MercenaryBond';
import { applyDailyAffection, AFFECTION_CAP } from '../assets/scripts/core/systems/MercenaryAffection';
import { isAvailableForPool, POOL_COOLDOWN_DAYS, settleTrialRollover, startCooldownAfterBond } from '../assets/scripts/core/systems/MercenaryDeparture';
import { createUpkeepState, repayUpkeep, settleUpkeepDay } from '../assets/scripts/core/systems/MercenaryUpkeep';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { createFemaleSource } from '../assets/scripts/core/systems/FemaleSource';
import { breed } from '../assets/scripts/core/systems/BreedingSystem';
import { describeRound } from '../assets/scripts/ui/core/NurtureFlowController';
import type { NurtureRoundLog } from '../assets/scripts/core/systems/NurtureSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, gender: '男' | '女', age: number, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

function makeRoster(): GeneralConfig[] {
    return [
        makeGeneral('hero-a', '男', 30),
        makeGeneral('hero-b', '男', 28),
        makeGeneral('hero-c', '女', 26),
    ];
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[], seed = 20261013): GameSession {
    const session = new GameSession();
    const legacy = new LegacyService(adapter);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(legacy);
    session.startNewGame(seed);
    return session;
}

/** 鍵排序後序列化，讓比對不受物件欄位順序影響 */
function canonical(value: unknown): string {
    return JSON.stringify(value, (_key, v) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1)));
        }
        return v;
    });
}

function snapshotOf(session: GameSession): Record<string, unknown> {
    return JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as Record<string, unknown>;
}

export function createCrossSystemIntegrationSuite(): TestSuite {
    const suite = new TestSuite('CrossSystem (出征→結算→換季→存檔續玩)');

    suite.test('出征勝利後換季、存檔，新 Session 讀回的所有欄位與原 Session 完全一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.setLeadGeneral('hero-a');
        await a.setDeck(['tactic-1', 'tactic-2']);
        await a.addItem('ITEM_ORACLE', 2);
        await a.gainDiscoveryExp('battle-win' as never);
        await a.changeTallyLoyalty('hero-b', 'equip' as never, 'N' as never);
        await a.recordBattle(['hero-a', 'hero-b'], 'player-win', {
            stageId: 'stage-1',
            sortie: { lostTroops: 9000, foodSpent: 400 },
            performance: { 'hero-a': { kills: 5, damageDealt: 900, damageTaken: 200, healingDone: 0 } },
        });
        for (let i = 0; i < 5; i++) await a.advanceSeason();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load(), '應能讀回存檔');

        const before = snapshotOf(a);
        const after = snapshotOf(b);
        for (const key of Object.keys(before)) {
            assert.equals(canonical(before[key]), canonical(after[key]), `存檔欄位 ${key} 讀回後不一致`);
        }
        const mil = b.military;
        assert.isTrue(mil.cityTroops < mil.cityTroopsCap, '戰損尚未補滿，兵源應低於上限，才證明扣補都有被存下');
    });

    suite.test('續玩後亂數游標延續：原 Session 與讀檔 Session 再推進一季，名冊結果相同', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.recordBattle(['hero-a'], 'player-win', { stageId: 'stage-1' });
        for (let i = 0; i < 3; i++) await a.advanceSeason();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
        await b.load();

        await a.recordBattle(['hero-a', 'hero-c'], 'player-win', { stageId: 'stage-2' });
        await b.recordBattle(['hero-a', 'hero-c'], 'player-win', { stageId: 'stage-2' });
        for (let i = 0; i < 4; i++) { await a.advanceSeason(); await b.advanceSeason(); }

        assert.equals(canonical(a.roster), canonical(b.roster), '同一亂數游標下名冊應相同');
        assert.equals(canonical(a.clearedStageIds), canonical(b.clearedStageIds));
        assert.equals(canonical(snapshotOf(a)), canonical(snapshotOf(b)), '續玩幾季後整份快照仍一致');
    });

    suite.test('老死（真實 LegacyService 季結）：持有的虎符退回君主，名將產出陣亡虎符，存檔往返不遺失', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            makeGeneral('hist-old', '男', 80, { isHistorical: true, maxLifespan: 60, battleRecord: { wins: 10, kills: 20, merit: 100 } } as never),
            makeGeneral('young', '男', 20),
        ];
        const a = createSession(adapter, roster);
        a.setRandomSource(() => 0);
        await a.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t1', 'hist-old');
        assert.equals('t1', a.tallyOf('hist-old') ?? '');

        const payload = await a.advanceSeason();
        assert.isTrue(payload.agingEvents.some((e) => e.type === 'died' && e.generalId === 'hist-old'), '應發生老死');
        assert.isTrue(a.tallyOf('hist-old') === null, '陣亡武將不應繼續持有虎符');
        assert.isTrue(a.tallyHoldings['t1'] === null, '虎符 t1 應退回君主');
        const produced = Object.keys(a.tallyCards).filter((uid) => uid !== 't1');
        assert.equals(1, produced.length, '歷史名將老死應產出 1 張陣亡虎符');

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        await b.load();
        assert.equals(canonical(a.tallyHoldings), canonical(b.tallyHoldings));
        assert.equals(canonical(a.tallyCards), canonical(b.tallyCards));
    });

    suite.test('壽命耗盡死亡（主動指令）→ 下一次季結：持有的虎符退回君主並產出陣亡虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            // 壽命上限 60、年齡 59.75：剩 3 個月，結緣扣 6 個月 → 當場死亡
            makeGeneral('hist-spent', '男', 59.75, { isHistorical: true, maxLifespan: 60, battleRecord: { wins: 5, kills: 5, merit: 40 } } as never),
            makeGeneral('young', '男', 20),
        ];
        const a = createSession(adapter, roster);
        a.setRandomSource(() => 0.99);
        await a.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t1', 'hist-spent');

        const spent = a.spendLifespan('hist-spent', 'breeding');
        assert.isTrue(spent?.events.some((e) => e.type === 'died') ?? false, '剩餘壽命不足時結緣應導致死亡');
        assert.equals('t1', a.tallyOf('hist-spent') ?? '', '主動指令死亡的當下還沒進季結，虎符先不動');

        await a.advanceSeason();
        assert.isTrue(a.tallyOf('hist-spent') === null, '季結後陣亡武將不再持有虎符');
        assert.isTrue(a.tallyHoldings['t1'] === null, '虎符退回君主');
        assert.equals(1, Object.keys(a.tallyCards).filter((uid) => uid !== 't1').length, '應產出 1 張陣亡虎符');

        await a.advanceSeason();
        assert.equals(1, Object.keys(a.tallyCards).filter((uid) => uid !== 't1').length, '再過一季不會重複產卡');
    });

    suite.test('傭兵 6 日試用：每日好感剛好在最後一天滿、結義需在到期結算前完成，到期不結義則離隊並冷卻 30 日', () => {
        let merc = createTrialMercenary('merc-1');
        let affection = 0;
        for (let day = 1; day <= TRIAL_DAYS; day++) {
            const advanced = advanceMercenaryDay(merc);
            assert.isTrue(advanced.ok, `第 ${day} 天應可推進`);
            merc = advanced.state;
            affection = applyDailyAffection(affection).affection;
            // 試用中途的結算不得提早讓傭兵離隊
            if (day < TRIAL_DAYS) {
                const mid = settleTrialRollover(merc, day, []);
                assert.isFalse(mid.departed, `第 ${day} 天倒數未歸零不應離隊`);
            }
        }
        assert.equals(AFFECTION_CAP, affection, '6 天 × 10 好感 = 上限 60');
        assert.isTrue(canBondMercenary(merc), '第 6 天推進後倒數歸零，可結義');

        // 路線 A：玩家在到期結算前結義 → 變 Bonded，不離隊，且開始冷卻
        const bonded = bondMercenary(merc);
        assert.isTrue(bonded.ok);
        const afterBond = settleTrialRollover({ uid: bonded.state.uid, status: bonded.state.status, daysLeft: bonded.state.daysLeft }, 6, []);
        assert.isFalse(afterBond.departed, '已結義者不會被到期結算趕走');
        const cooldowns = startCooldownAfterBond('merc-1', 6, []);
        assert.isFalse(isAvailableForPool('merc-1', 6 + POOL_COOLDOWN_DAYS - 1, cooldowns));
        assert.isTrue(isAvailableForPool('merc-1', 6 + POOL_COOLDOWN_DAYS, cooldowns));

        // 路線 B：沒結義 → 到期結算離隊、冷卻 30 日
        const expired = settleTrialRollover({ uid: merc.uid, status: merc.status, daysLeft: merc.daysLeft }, 7, []);
        assert.isTrue(expired.departed);
        assert.isFalse(isAvailableForPool('merc-1', 7 + POOL_COOLDOWN_DAYS - 1, expired.cooldowns));
    });

    suite.test('傭兵欠薪：凍結當日補繳即可救回；錯過一天即離隊，之後補繳無效', () => {
        const cost = { gold: 100, wine: 2 };
        let state = createUpkeepState('merc-2');
        const frozen = settleUpkeepDay(state, { gold: 0, wine: 0 }, cost);
        assert.equals('Frozen', frozen.state.status);
        const rescued = repayUpkeep(frozen.state, { gold: 100, wine: 2 }, cost);
        assert.equals('Active', rescued.state.status);
        assert.equals(0, rescued.wallet.gold);

        state = frozen.state;
        const departed = settleUpkeepDay(state, { gold: 999, wine: 99 }, cost);
        assert.equals('Departed', departed.state.status, '凍結倒數歸零即離隊，即使此刻錢包足夠也不自動補繳');
        const late = repayUpkeep(departed.state, { gold: 999, wine: 99 }, cost);
        assert.equals('Departed', late.state.status, '離隊後補繳無效');
        assert.equals(999, late.wallet.gold, '補繳無效時不扣錢');
    });

    suite.test('結緣→父親壽命耗盡→季結→下一代：子嗣留在名冊、父親歸檔移出，存檔往返一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new InMemoryRosterStore([
            // 父親剩 3 個月壽命，結緣扣 6 個月 → 當場耗盡
            makeGeneral('father', '男', 59.75, { maxLifespan: 60, isHistorical: true } as never),
            makeGeneral('mother', '女', 30),
        ]);
        const session = new GameSession();
        session.setRosterStore(store);
        session.setSaveService(new PlayerSaveService(adapter));
        session.setLifecycle(new LegacyService(adapter));
        session.setRandomSource(() => 0.99);
        const breeding = new BreedingService(store, new BloodlineGraph(), { random: () => 0.01 });
        const bonding = new BondingSetupController({
            roster: store,
            breeding,
            prepare: async () => breeding.syncGraphFromRoster(),
            persist: async () => { await session.save(); },
            spendLifespan: (id, command) => session.spendLifespan(id, command),
        });
        await bonding.open();
        const result = await bonding.confirm();
        assert.equals('conceived', result.outcome, '結緣應受孕');

        const afterBond = store.getAll();
        assert.equals('dead', (afterBond.find((g) => g.id === 'father') as { status?: string }).status ?? '', '父親壽命耗盡當場死亡');
        const child = afterBond.find((g) => g.id === result.child!.id);
        assert.isTrue(!!child, '子嗣已加入名冊');

        await session.advanceSeason();
        const afterSeason = store.getAll();
        assert.isFalse(afterSeason.some((g) => g.id === 'father'), '父親季結後歸檔並移出名冊');
        assert.isTrue(afterSeason.some((g) => g.id === result.child!.id), '子嗣不受父親死亡影響');
        assert.isTrue(afterSeason.some((g) => g.id === 'mother'), '母親仍在名冊');

        const reopened = new GameSession();
        reopened.setRosterStore(new InMemoryRosterStore([]));
        reopened.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reopened.load());
        assert.equals(canonical(store.getAll()), canonical(reopened.roster), '讀檔後名冊與季結後一致');
    });

    suite.test('培育回合文字：受傷、傷後跳過、好感事件都要明講，不能顯示成「訓練失敗」或「+0」', () => {
        const base = { round: 5, action: 'str', vigorBefore: 80, vigorAfter: 70, success: true, statGained: 6, tpGained: 3, burst: false } as unknown as NurtureRoundLog;
        assert.isTrue(describeRound({ ...base, statGained: 0, tpGained: 0, injured: true }).includes('受傷'), '受傷回合要說受傷');
        const skipped = describeRound({ ...base, success: false, statGained: 0, tpGained: 0, skipped: true });
        assert.isTrue(skipped.includes('無法行動') && !skipped.includes('失敗'), '跳過回合不能說訓練失敗');
        assert.isTrue(describeRound({ ...base, affectionGained: true }).includes('好感 +1'), '好感事件要顯示');
        assert.isFalse(describeRound(base).includes('好感'), '沒有好感事件時不顯示');
    });

    suite.test('攻城開戰扣壽命致死 → 存檔重開 → 季結：陣亡虎符只產一次，持有的虎符退回君主', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            makeGeneral('hist-siege', '男', 59.9, { isHistorical: true, maxLifespan: 60, battleRecord: { wins: 3, kills: 3, merit: 30 } } as never),
            makeGeneral('young', '男', 20),
        ];
        const a = createSession(adapter, roster);
        a.setRandomSource(() => 0.99);
        await a.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t1', 'hist-siege');

        const spent = await a.spendSiegeLifespan('hist-siege');
        assert.isTrue(spent?.events.some((e) => e.type === 'died') ?? false, '剩不到 3 個月壽命，攻城開戰應致死');
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load());
        await b.advanceSeason();
        assert.isTrue(b.tallyOf('hist-siege') === null, '重開後季結，陣亡武將不再持有虎符');
        assert.isTrue(b.tallyHoldings['t1'] === null, '虎符退回君主');
        const produced = Object.keys(b.tallyCards).filter((uid) => uid !== 't1');
        assert.equals(1, produced.length, '重開後季結應剛好產出 1 張陣亡虎符');
        await b.advanceSeason();
        assert.equals(1, Object.keys(b.tallyCards).filter((uid) => uid !== 't1').length, '再過一季不重複產卡');
    });

    suite.test('關卡資料：battleKind 只能是 field 或 siege，且第一關（虎牢關）標為攻城', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const data = JSON.parse(require('fs').readFileSync('assets/resources/data/encounters.json', 'utf8')) as { encounters: Array<{ id: string; battleKind?: string }> };
        for (const encounter of data.encounters) {
            assert.isTrue(encounter.battleKind === undefined || encounter.battleKind === 'field' || encounter.battleKind === 'siege', `${encounter.id} battleKind 不合法：${encounter.battleKind}`);
        }
        assert.isTrue(data.encounters.some((e) => e.battleKind === 'siege'), '至少一關標為攻城');
    });

    suite.test('沒收虎符與新手引導進度：存檔往返後仍在', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.registerTallyCards([{ uid: 't9', templateId: 'tpl-9', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await a.equipTally('t9', 'hero-a');
        const before = a.tallyLoyalty['hero-a']?.loyalty;
        const seized = await a.confiscateTally('hero-a');
        assert.equals('t9', seized?.cardUid ?? '');
        assert.isTrue(a.tallyOf('hero-a') === null, '沒收後武將不再持有虎符');
        const first = await a.acknowledgeOnboarding('fate');
        assert.isTrue(first.ok, '第一段引導可確認');
        assert.isFalse((await a.acknowledgeOnboarding('legacy')).ok, '跳段確認被拒');

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        assert.isTrue(b.tallyOf('hero-a') === null, '讀檔後仍是沒收狀態');
        assert.equals(a.tallyLoyalty['hero-a']?.loyalty, b.tallyLoyalty['hero-a']?.loyalty, '忠誠度一致');
        assert.isTrue((b.tallyLoyalty['hero-a']?.loyalty ?? 0) !== before, '沒收應改變忠誠度');
        assert.equals(canonical(a.onboarding), canonical(b.onboarding), '引導進度讀檔後一致');
        assert.equals(1, b.onboarding.nextIndex, '引導停在第二段');
    });

    suite.test('傭兵經 GameSession 存檔往返：試用中途、欠薪凍結、冷卻都讀回一致，讀回後可接著結義', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        let trial = createTrialMercenary('merc-s');
        for (let day = 0; day < 3; day++) trial = advanceMercenaryDay(trial).state;
        const frozen = settleUpkeepDay(createUpkeepState('merc-f'), { gold: 0, wine: 0 }, { gold: 100, wine: 2 }).state;
        const cooldowns = startCooldownAfterBond('merc-old', 5, []);
        a.setMercenaries({
            mercenaries: [trial],
            upkeep: [frozen],
            cooldowns,
        } as never);
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        assert.equals(canonical(a.mercenaries), canonical(b.mercenaries), '傭兵包讀檔後一致');
        assert.equals('Frozen', b.mercenaries.upkeep[0].status);
        assert.isFalse(isAvailableForPool('merc-old', 5 + POOL_COOLDOWN_DAYS - 1, b.mercenaries.cooldowns), '冷卻讀回後仍生效');

        // 讀回的試用傭兵繼續走完剩餘天數後可結義
        let resumed = { ...b.mercenaries.mercenaries[0] } as ReturnType<typeof createTrialMercenary>;
        assert.isFalse(canBondMercenary(resumed), '試用中途不能結義');
        for (let day = 0; day < TRIAL_DAYS - 3; day++) resumed = advanceMercenaryDay(resumed).state;
        assert.isTrue(canBondMercenary(resumed), '剩餘天數走完後可結義');

        b.startNewGame(1);
        assert.equals(0, b.mercenaries.mercenaries.length, '開新局清空傭兵包');
    });

    suite.test('內政任務：入帳、同季限一次、存檔重開後仍限一次，換季後可再選，糧草不超過上限', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        const foodBefore = a.military.food;
        let gold = 0;
        const farmed = await a.chooseDomesticTask('farming', (amount) => { gold += amount; });
        assert.isTrue(farmed.ok, '農耕可選');
        assert.equals(Math.min(a.military.foodCap, foodBefore + 120), a.military.food, '糧草入帳且不超過上限');
        assert.equals(0, gold, '農耕不給黃金');

        const again = await a.chooseDomesticTask('diplomacy');
        assert.isFalse(again.ok, '同季第二項被拒');
        assert.equals(0, a.fame, '被拒時名聲不變');

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load());
        assert.equals(a.military.food, b.military.food, '糧草讀回一致');
        assert.isFalse((await b.chooseDomesticTask('diplomacy')).ok, '重開遊戲不能繞過同季限制');

        await b.advanceSeason();
        assert.isTrue((await b.chooseDomesticTask('diplomacy')).ok, '換季後可再選');
        assert.equals(40, b.fame, '外交 +40 名聲');
        let earned = 0;
        assert.isTrue((await (async () => { await b.advanceSeason(); return b.chooseDomesticTask('commerce', (amount) => { earned += amount; }); })()).ok);
        assert.equals(100, earned, '商業 100 黃金交給錢包回呼');
        assert.isTrue(b.military.food <= b.military.foodCap, '糧草不超過上限');

        b.startNewGame(1);
        assert.equals(0, b.fame, '開新局名聲歸零');
        assert.isTrue(b.domesticLog.lastSeason === null, '開新局內政紀錄清空');
    });

    suite.test('女性武將來源：登記→存檔→重開讀回一致；不合法的來源被拒；開新局清空', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        assert.isTrue(a.setFemaleSource('hero-c', createFemaleSource('CAPTIVE', 'SR', 5)), '合法來源可登記');
        assert.isFalse(a.setFemaleSource('hero-c', { Source_Type: 'BOGUS', Quality_Grade: 'SR' } as never), '不合法來源被拒');
        assert.isFalse(a.setFemaleSource('', createFemaleSource('GACHA', 'R', 0)), '空 id 被拒');
        assert.equals('CAPTIVE', a.femaleSources['hero-c'].Source_Type, '被拒的登記不覆蓋既有紀錄');
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        assert.equals(canonical(a.femaleSources), canonical(b.femaleSources), '來源紀錄讀檔後一致');
        assert.equals(5, b.femaleSources['hero-c'].Acquired_Season);
        b.femaleSources['hero-c'].Quality_Grade = 'N' as never;
        assert.equals('SR', b.femaleSources['hero-c'].Quality_Grade, 'getter 回傳副本');

        b.startNewGame(9);
        assert.equals(0, Object.keys(b.femaleSources).length, '開新局清空');
    });

    suite.test('傭兵 6 天試用走完後結義：好感停在上限 60 只是門檻，結義點數餘額為 0 時 R 級被擋，傭兵與名冊都不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        let merc = { ...createTrialMercenary('merc-r'), generalId: 'gen-merc', affection: 0 } as ReturnType<typeof createTrialMercenary> & { generalId: string; affection: number };
        for (let day = 0; day < TRIAL_DAYS; day++) {
            merc = { ...merc, ...advanceMercenaryDay(merc).state, affection: applyDailyAffection(merc.affection).affection };
        }
        assert.equals(AFFECTION_CAP, merc.affection, '好感停在上限');
        a.setMercenaries({ mercenaries: [merc], upkeep: [], cooldowns: [] } as never);
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore(makeRoster()));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        const template = { id: 'gen-merc', name: '傭兵', faction: 'shu', hp: 1000, rarityTier: 'common', str: 70, lea: 60 } as unknown as GeneralConfig;
        const result = await b.bondMercenaryToRoster('merc-r', template);
        assert.isFalse(result.ok, '結義點數餘額為 0，付不起 R 的 100 點');
        assert.equals('insufficient-points', result.reason ?? '');
        assert.equals('Trial', b.mercenaries.mercenaries[0].status, '失敗時傭兵狀態不變');
        assert.isFalse(b.roster.some((g) => g.id === 'gen-merc'), '失敗時名冊不變');

        // 點數足夠 → 成功：扣點數餘額、好感不扣、入名冊，存檔重開後仍在
        (b as unknown as { _bondPoints: number })._bondPoints = 150;
        const ok = await b.bondMercenaryToRoster('merc-r', template);
        assert.isTrue(ok.ok, '好感滿 60 且點數足夠應成功');
        assert.equals(100, ok.pointsSpent);
        assert.equals(50, b.bondPoints, '點數餘額 150 → 50');
        assert.equals(AFFECTION_CAP, b.mercenaries.mercenaries[0].affection!, '好感不扣');
        assert.equals('Bonded', b.mercenaries.mercenaries[0].status);
        assert.isTrue(b.roster.some((g) => g.id === 'gen-merc'), '武將入名冊');
        await b.save();
        const c = new GameSession();
        c.setRosterStore(new InMemoryRosterStore([]));
        c.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await c.load());
        assert.equals(50, c.bondPoints, '點數餘額讀檔後一致');
        assert.isTrue(c.roster.some((g) => g.id === 'gen-merc'), '結義武將讀檔後仍在名冊');
        assert.equals('Bonded', c.mercenaries.mercenaries[0].status);
    });

    suite.test('傭兵結義：好感未滿 60 即使點數很多也不能結義，點數與名冊不變', async () => {
        const session = new GameSession(1);
        session.setMercenaries({ mercenaries: [{ uid: 'merc-low', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'gen-low', affection: 59 }], upkeep: [], cooldowns: [] });
        (session as unknown as { _bondPoints: number })._bondPoints = 5000;
        const template = { id: 'gen-low', name: '傭兵', faction: 'shu', hp: 1000, rarityTier: 'common', str: 70, lea: 60 } as unknown as GeneralConfig;
        const result = await session.bondMercenaryToRoster('merc-low', template);
        assert.isFalse(result.ok);
        assert.equals('affection-not-full', result.reason ?? '');
        assert.equals(5000, session.bondPoints);
        assert.equals(0, session.roster.length);
    });

    suite.test('結緣＋血統活性：同亂數種子結果完全一致，因子星級不超過 5★、不低於 1★', () => {
        const lcg = (seed: number) => () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        const father = makeGeneral('wf', '男', 30, { genes: [{ id: 'gene_command', level: 3 }, { id: 'gene_charge', level: 4 }] });
        const mother = makeGeneral('wm', '女', 28, { genes: [{ id: 'gene_cavalry', level: 3 }, { id: 'gene_honor', level: 2 }] });
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const dictionary = buildFactorDictionary(JSON.parse(require('fs').readFileSync('assets/resources/data/master/gene-dictionary.json', 'utf8')));
        let sawAboveParents = false;
        for (let seed = 1; seed <= 300; seed++) {
            const run = () => breed({ father: father as any, mother: mother as any, pedigree: new BloodlineGraph(), random: lcg(seed), childId: 'kid', birthSeason: 1, dictionary });
            const a = run();
            const b = run();
            assert.equals(canonical(a.child ?? null), canonical(b.child ?? null), `seed ${seed} 重跑結果不同`);
            for (const g of a.child?.genes ?? []) {
                assert.isTrue(g.level >= 1 && g.level <= 5, `seed ${seed} 因子 ${g.id} 星級 ${g.level} 超出 1~5`);
                if (g.level > 4) sawAboveParents = true;
            }
        }
        assert.isTrue(sawAboveParents, '300 個種子內至少要有一次血統活性把星級推高到父母最高 4★ 之上');
    });

    suite.test('舊存檔相容：拿掉所有後加的選填欄位讀檔，補預設值後可續跑 20 季並正常再存', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        await a.setLeadGeneral('hero-a');
        await a.setDeck(['tactic-1']);
        for (let i = 0; i < 20; i++) await a.advanceSeason();
        await a.save();

        const raw = JSON.parse(JSON.stringify(await adapter.get(PLAYER_SAVE_KEY))) as Record<string, unknown>;
        const core = new Set(['schemaVersion', 'savedAt', 'gameTime', 'roster', 'deck', 'discoveryLevel']);
        for (const key of Object.keys(raw)) if (!core.has(key)) delete raw[key];
        await adapter.set(PLAYER_SAVE_KEY, raw);

        const b = createSession(adapter, []);
        assert.isTrue(await b.load(), '只剩核心欄位的舊檔也要能讀');
        assert.equals(0, Object.keys(b.femaleSources).length);
        for (let i = 0; i < 20; i++) await b.advanceSeason();
        await b.save();
        const c = createSession(adapter, []);
        assert.isTrue(await c.load());
        assert.equals(canonical(snapshotOf(b)), canonical(snapshotOf(c)), '舊檔升級後再存再讀必須一致');
    });

    suite.test('舊存檔相容：選填欄位型別壞掉時讀檔不當機、退回預設', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, makeRoster());
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        await a.save();
        const raw = JSON.parse(JSON.stringify(await adapter.get(PLAYER_SAVE_KEY))) as Record<string, unknown>;
        Object.assign(raw, { femaleSources: 'bad', tallyCards: 7, tallyHoldings: [], mercenaries: 'x', onboarding: 5, bondPoints: 'many', domestic: [], resources: null, inventory: 3, pendingLifespanDeaths: 'z' });
        await adapter.set(PLAYER_SAVE_KEY, raw);
        const b = createSession(adapter, []);
        assert.isTrue(await b.load());
        await b.advanceSeason();
        await b.save();
    });

    return suite;
}
