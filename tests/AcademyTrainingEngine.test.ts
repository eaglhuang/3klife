/**
 * AcademyTrainingEngine — 學府培育總控與防 SL 確定性引擎（doc_spec_0302 TC-CORE-01～03，PROG-2-1902）
 *
 * Unity 對照：EditMode Test 直接跑純 C# 狀態機，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyRng, deriveAcademyRootSeed } from '../assets/scripts/core/systems/nurture/AcademyDeterministicRng';
import {
    ACADEMY_GENERIC_RITE_OPTIONS,
    ACADEMY_TUNING,
    AcademyActionError,
    academyStatTotal,
    clampAcademyStats,
    createAcademySnapshot,
    resolveAcademyAction,
} from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import {
    AcademyAntiSLManager,
    AcademySaveRecord,
    AcademyStorageError,
    IAcademySaveStore,
} from '../assets/scripts/core/systems/nurture/AcademyAntiSLManager';
import {
    ACADEMY_STAT_CAP,
    ACADEMY_STAT_KEYS,
    ACADEMY_STAT_TOTAL_CAP,
    AcademyActionPayload,
    AcademyControlMode,
    AcademyId,
    AcademyStateSnapshot,
    AcademyStatKey,
    IAcademyGimmickHandler,
    academyPhaseOf,
} from '../assets/scripts/core/systems/nurture/AcademyTypes';

const ADMISSION = {
    worldSeed: 'world-alpha',
    clanUuid: 'clan-001',
    childId: 'child-zhao',
    academyId: AcademyId.YINGCHUAN,
    admissionTurn: 48,
    initialStats: { str: 30, lea: 40, int: 50, pol: 45, cha: 35 },
};

/** 記憶體存檔，可模擬寫入失敗；以 JSON 往返模擬落盤 */
class MemoryStore implements IAcademySaveStore {
    data: string | null = null;
    failNext = false;
    write(record: AcademySaveRecord): void {
        if (this.failNext) {
            this.failNext = false;
            throw new Error('disk full');
        }
        this.data = JSON.stringify(record);
    }
    read(): AcademySaveRecord | null {
        return this.data ? JSON.parse(this.data) as AcademySaveRecord : null;
    }
}

/** 測試用 Gimmick：用種子決定彩圈，練智力有機會爆 200% */
const LUCKY_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.YINGCHUAN,
    initGimmickState: () => ({ shards: 0 }),
    onTurnStart: () => undefined,
    onTrain: (state, target, rng) => {
        const hit = target === 'int' && rng.chance(1, 3, 'test-resonance');
        state.gimmickStatePayload.shards = (state.gimmickStatePayload.shards as number) + 1;
        return { statBonusPct: hit ? 200 : 100, extraEnergyCost: 0, gimmickLogs: [] };
    },
    onTurnEnd: () => undefined,
};

/** 固定動作序列：精力不足就休息，否則輪流練五維；遇打斷取第一個候選 */
function nextAction(state: AcademyStateSnapshot): AcademyActionPayload {
    if (state.pendingInterrupt) return { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] };
    if (state.energy < 25) return { actionType: 'REST' };
    const target: AcademyStatKey = ACADEMY_STAT_KEYS[state.currentTurn % ACADEMY_STAT_KEYS.length];
    return { actionType: 'TRAIN', targetStat: target };
}

function runToGraduation(start: AcademyStateSnapshot, gimmick?: IAcademyGimmickHandler): AcademyStateSnapshot {
    let state = start;
    for (let guard = 0; guard < 200 && !state.graduated; guard++) {
        state = resolveAcademyAction(state, nextAction(state), gimmick);
    }
    return state;
}

export function createAcademyTrainingEngineSuite(): TestSuite {
    const suite = new TestSuite('AcademyTrainingEngine (學府總控與防 SL PROG-2-1902)');

    suite.test('根種子：同輸入同種子，任一欄位不同就變', () => {
        const a = deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YINGCHUAN, 1);
        assert.equals(64, a.length);
        assert.equals(a, deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YINGCHUAN, 1));
        assert.notEquals(a, deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YINGCHUAN, 2));
        assert.notEquals(a, deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YOUZHOU, 1));
        assert.notEquals(a, deriveAcademyRootSeed('w2', 'c', 'k', AcademyId.YINGCHUAN, 1));
    });

    suite.test('種子鏈：存下 (seed, step) 後重建，後續序列完全相同', () => {
        const rng = new AcademyRng(deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YINGCHUAN, 1));
        for (let i = 0; i < 7; i++) rng.nextUint32('warmup');
        const resumed = new AcademyRng(rng.seedHex, rng.stepIndex);
        for (let i = 0; i < 20; i++) {
            assert.equals(rng.nextInt(1000, 'x'), resumed.nextInt(1000, 'x'));
        }
        assert.equals(rng.stepIndex, resumed.stepIndex);
    });

    suite.test('整數取樣：nextInt 在範圍內、pickWeighted 不選權重 0、非法輸入報錯', () => {
        const rng = new AcademyRng(deriveAcademyRootSeed('w', 'c', 'k', AcademyId.YINGCHUAN, 1));
        for (let i = 0; i < 200; i++) {
            assert.inRange(rng.nextInt(7, 'r'), 0, 6);
            assert.notEquals(1, rng.pickWeighted([3, 0, 5], 'w'));
        }
        assert.isTrue(rng.chance(5, 5, 'c'));
        assert.isFalse(rng.chance(0, 5, 'c'));
        assert.throws(() => rng.nextInt(0, 'r'));
        assert.throws(() => rng.pickWeighted([0, 0], 'w'));
        assert.throws(() => rng.pickWeighted([1.5], 'w'));
        assert.throws(() => new AcademyRng('not-hex'));
    });

    suite.test('時鐘分期：1~12 建基、13~24 造詣、25~36 大成', () => {
        assert.equals('FOUNDATION', academyPhaseOf(12));
        assert.equals('MASTERY', academyPhaseOf(13));
        assert.equals('MASTERY', academyPhaseOf(24));
        assert.equals('CULMINATION', academyPhaseOf(25));
    });

    suite.test('TC-CORE-01：同一入學與同一動作序列，36 回合結果逐位元相同', () => {
        const first = runToGraduation(createAcademySnapshot(ADMISSION, LUCKY_GIMMICK), LUCKY_GIMMICK);
        const second = runToGraduation(createAcademySnapshot(ADMISSION, LUCKY_GIMMICK), LUCKY_GIMMICK);
        assert.isTrue(first.graduated);
        assert.equals(JSON.stringify(first), JSON.stringify(second));
        const other = runToGraduation(createAcademySnapshot({ ...ADMISSION, childId: 'child-other' }, LUCKY_GIMMICK), LUCKY_GIMMICK);
        assert.notEquals(first.prngSeedHex, other.prngSeedHex);
    });

    suite.test('打斷點：第 12 回合前期中考評、第 24 回合前弱冠禮、36 回合後結業', () => {
        let state = createAcademySnapshot(ADMISSION);
        const seen: string[] = [];
        for (let guard = 0; guard < 200 && !state.graduated; guard++) {
            if (state.pendingInterrupt) seen.push(`${state.pendingInterrupt}@${state.currentTurn}`);
            state = resolveAcademyAction(state, nextAction(state));
        }
        assert.equals('MIDTERM@12,COMING_OF_AGE@24,GRADUATION@36', seen.join(','));
        assert.equals('STRENGTH', state.midtermPolicy);
        assert.equals(ACADEMY_GENERIC_RITE_OPTIONS[0], state.learnedTactics[0]);
        assert.equals('期中考評,弱冠加冠禮,大考結業', state.chronicles.map((c) => c.title).join(','));
    });

    suite.test('有打斷點時只接受 RESOLVE_INTERRUPT，選項必須在候選中', () => {
        let state = createAcademySnapshot(ADMISSION);
        while (state.pendingInterrupt !== 'MIDTERM') state = resolveAcademyAction(state, nextAction(state));
        const waiting = state;
        assert.throws(() => resolveAcademyAction(waiting, { actionType: 'TRAIN', targetStat: 'int' }));
        assert.throws(() => resolveAcademyAction(waiting, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: 'NOPE' }));
        const resolved = resolveAcademyAction(waiting, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: 'NOURISH' });
        assert.equals(null, resolved.pendingInterrupt);
        assert.equals(12, resolved.currentTurn);
        assert.equals('MIDTERM', waiting.pendingInterrupt, '輸入快照不得被改動');
    });

    suite.test('重大共鳴（≥180%）在半自動下強制打斷，見證後才繼續', () => {
        let state = createAcademySnapshot({ ...ADMISSION, controlMode: AcademyControlMode.SEMI_AUTO }, LUCKY_GIMMICK);
        let found = false;
        for (let guard = 0; guard < 200 && !state.graduated; guard++) {
            if (state.pendingInterrupt === 'RESONANCE') {
                found = true;
                assert.throws(() => resolveAcademyAction(state, { actionType: 'REST' }, LUCKY_GIMMICK));
                break;
            }
            const action: AcademyActionPayload = state.pendingInterrupt
                ? { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] }
                : state.energy < 25 ? { actionType: 'REST' } : { actionType: 'TRAIN', targetStat: 'int' };
            state = resolveAcademyAction(state, action, LUCKY_GIMMICK);
        }
        assert.isTrue(found, '固定種子下應出現重大共鳴');
        assert.contains(state.chronicles.map((c) => c.title).join(','), '重大共鳴');
    });

    suite.test('AUTO 模式：打斷點由引擎代選，一路跑完不需處理', () => {
        let state = createAcademySnapshot({ ...ADMISSION, controlMode: AcademyControlMode.AUTO });
        for (let guard = 0; guard < 200 && !state.graduated; guard++) {
            assert.equals(null, state.pendingInterrupt);
            state = resolveAcademyAction(state, state.energy < 25 ? { actionType: 'REST' } : { actionType: 'TRAIN', targetStat: 'int' });
        }
        assert.isTrue(state.graduated);
    });

    suite.test('代管效率與學府特化：潁川練智力，手動多於半自動多於自動', () => {
        const gainOf = (mode: AcademyControlMode, stat: AcademyStatKey) => {
            const start = createAcademySnapshot({ ...ADMISSION, controlMode: mode });
            return resolveAcademyAction(start, { actionType: 'TRAIN', targetStat: stat }).stats[stat] - start.stats[stat];
        };
        const manual = gainOf(AcademyControlMode.MANUAL, 'int');
        assert.isTrue(manual >= gainOf(AcademyControlMode.SEMI_AUTO, 'int'));
        assert.isTrue(gainOf(AcademyControlMode.SEMI_AUTO, 'int') > gainOf(AcademyControlMode.AUTO, 'int'));
        assert.isTrue(manual > gainOf(AcademyControlMode.MANUAL, 'str'), '潁川智力 +30% 應高於無加成的武力');
    });

    suite.test('精力：訓練消耗、休息回復，介於 0~100', () => {
        const start = createAcademySnapshot(ADMISSION);
        const trained = resolveAcademyAction(start, { actionType: 'TRAIN', targetStat: 'int' });
        assert.equals(100 - ACADEMY_TUNING.trainEnergyCost, trained.energy);
        assert.equals(100, resolveAcademyAction(trained, { actionType: 'REST' }).energy);
    });

    suite.test('TC-CORE-03：作弊級彩圈下，單項 ≤500、總量 ≤2000', () => {
        const cheat: IAcademyGimmickHandler = { ...LUCKY_GIMMICK, onTrain: () => ({ statBonusPct: 5000, extraEnergyCost: -100, gimmickLogs: [] }) };
        let state = createAcademySnapshot({ ...ADMISSION, controlMode: AcademyControlMode.AUTO }, cheat);
        for (let guard = 0; guard < 200 && !state.graduated; guard++) {
            state = resolveAcademyAction(state, { actionType: 'TRAIN', targetStat: ACADEMY_STAT_KEYS[guard % 5] }, cheat);
            for (const key of ACADEMY_STAT_KEYS) assert.isTrue(state.stats[key] <= ACADEMY_STAT_CAP);
            assert.isTrue(academyStatTotal(state.stats) <= ACADEMY_STAT_TOTAL_CAP);
        }
        assert.equals(ACADEMY_STAT_TOTAL_CAP, academyStatTotal(state.stats));
        const clamped = clampAcademyStats({ str: 900, lea: 600, int: 500, pol: 500, cha: 500 });
        assert.equals(ACADEMY_STAT_TOTAL_CAP, academyStatTotal(clamped));
        assert.equals(ACADEMY_STAT_CAP, clamped.str);
    });

    suite.test('GIMMICK_INTERACT：沒有專屬互動的學府拒收', () => {
        assert.throws(() => resolveAcademyAction(createAcademySnapshot(ADMISSION), { actionType: 'GIMMICK_INTERACT' }));
        const err = (() => { try { resolveAcademyAction(createAcademySnapshot(ADMISSION), { actionType: 'GIMMICK_INTERACT' }); } catch (e) { return e; } return null; })();
        assert.isTrue(err instanceof AcademyActionError);
    });

    suite.test('原子落盤：寫入失敗丟 AcademyStorageError，存檔停在原狀', () => {
        const store = new MemoryStore();
        const mgr = new AcademyAntiSLManager(store);
        mgr.begin(createAcademySnapshot(ADMISSION));
        const before = store.data;
        store.failNext = true;
        assert.throws(() => mgr.commit({ actionType: 'TRAIN', targetStat: 'int' }));
        assert.equals(before, store.data);
        const err = (() => { store.failNext = true; try { mgr.commit({ actionType: 'REST' }); } catch (e) { return e; } return null; })();
        assert.isTrue(err instanceof AcademyStorageError);
    });

    suite.test('未確認不得再提交；確認後計數歸零', () => {
        const store = new MemoryStore();
        const mgr = new AcademyAntiSLManager(store);
        mgr.begin(createAcademySnapshot(ADMISSION));
        mgr.commit({ actionType: 'TRAIN', targetStat: 'int' });
        assert.throws(() => mgr.commit({ actionType: 'REST' }));
        assert.equals(0, mgr.acknowledge().sessionCrashCounter);
        assert.equals(3, mgr.commit({ actionType: 'REST' }).currentTurn);
    });

    suite.test('TC-CORE-02：期中考評等待時中斷，重啟停在第 12 回合待選，計數 +1', () => {
        const store = new MemoryStore();
        const mgr = new AcademyAntiSLManager(store);
        mgr.begin(createAcademySnapshot(ADMISSION));
        let state = mgr.recover()!.snapshot;
        while (state.pendingInterrupt !== 'MIDTERM') {
            state = mgr.commit(nextAction(state));
            if (state.pendingInterrupt !== 'MIDTERM') mgr.acknowledge();
        }
        // 進程中斷：不呼叫 acknowledge，直接用同一份存檔重建
        const restarted = new AcademyAntiSLManager(store).recover()!;
        assert.isTrue(restarted.recovered);
        assert.equals(12, restarted.snapshot.currentTurn);
        assert.equals('MIDTERM', restarted.snapshot.pendingInterrupt);
        assert.equals(1, restarted.snapshot.sessionCrashCounter);
        assert.isFalse(restarted.warning);
    });

    suite.test('殺進程重開：結果與中斷前完全相同，無法重刷', () => {
        const store = new MemoryStore();
        const mgr = new AcademyAntiSLManager(store, LUCKY_GIMMICK);
        mgr.begin(createAcademySnapshot(ADMISSION, LUCKY_GIMMICK));
        const shown = mgr.commit({ actionType: 'TRAIN', targetStat: 'int' });
        const again = new AcademyAntiSLManager(store, LUCKY_GIMMICK).recover()!;
        assert.equals(JSON.stringify(shown.stats), JSON.stringify(again.snapshot.stats));
        assert.equals(shown.prngSeedHex, again.snapshot.prngSeedHex);
    });

    suite.test('連續中斷：第 2 次警告，第 3 次保底結算（+5、精力 -20、鎖 2 回合彩圈）', () => {
        const store = new MemoryStore();
        const mgr = new AcademyAntiSLManager(store);
        const start = createAcademySnapshot(ADMISSION);
        mgr.begin(start);
        mgr.commit({ actionType: 'TRAIN', targetStat: 'int' });
        const r1 = new AcademyAntiSLManager(store).recover()!;
        const r2 = new AcademyAntiSLManager(store).recover()!;
        const r3 = new AcademyAntiSLManager(store).recover()!;
        assert.isFalse(r1.warning);
        assert.isTrue(r2.warning);
        assert.isFalse(r2.penalized);
        assert.isTrue(r3.penalized);
        assert.equals(3, r3.snapshot.sessionCrashCounter);
        assert.equals(start.stats.int + ACADEMY_TUNING.abuseFloorGain, r3.snapshot.stats.int);
        assert.equals(100 - ACADEMY_TUNING.trainEnergyCost - ACADEMY_TUNING.abuseEnergyPenalty, r3.snapshot.energy);
        assert.equals(ACADEMY_TUNING.abuseResonanceLockTurns, r3.snapshot.resonanceLockTurns);
        const r4 = new AcademyAntiSLManager(store).recover()!;
        assert.equals(JSON.stringify(r3.snapshot.stats), JSON.stringify(r4.snapshot.stats), '再中斷也不會變好');
        assert.equals(0, new AcademyAntiSLManager(store).acknowledge().sessionCrashCounter);
    });

    return suite;
}
