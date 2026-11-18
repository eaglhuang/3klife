// @spec-source → 通用任務核心架構設計（PROG-2-9144 卡 A）：型別、parser、種子、情報、分支、適合度
import { TestSuite, assert } from '../TestRunner';
import { parseMissionDefinition } from '../../assets/scripts/core/mission/MissionDefinitionParser';
import { createMissionRng, deriveRng, deriveSeed, deriveUnit } from '../../assets/scripts/core/mission/MissionRng';
import {
    applyRecon, applyWait, intelBandOf, reconStepValue, scoutIntelBonus, applyIntelDelta,
} from '../../assets/scripts/core/mission/MissionIntel';
import { selectBranch } from '../../assets/scripts/core/mission/MissionBranch';
import {
    blocksOf, computeCost, computeFitness, evaluateAllCandidates, pickDelegate,
} from '../../assets/scripts/core/mission/MissionFitness';
import { createMissionInstance, isMissionDue, isMissionExpired } from '../../assets/scripts/core/mission/MissionSpawn';
import { DEFAULT_MISSION_BALANCE } from '../../assets/scripts/core/mission/MissionBalance';
import { lockDispatch } from '../../assets/scripts/core/mission/MissionResolver';
import { loadFixture, loadFixtureRaw, mkGeneral, mkInstance } from './missionTestKit';

export function createMissionCoreLogicSuite(): TestSuite {
    const suite = new TestSuite('MissionCoreLogic (PROG-2-9144)');
    const beacon = loadFixture('beacon-patrol');
    const hermit = loadFixture('hermit-persuade');

    // ── parser ──
    suite.test('兩份範例 JSON 都能通過 parser', () => {
        assert.isTrue(parseMissionDefinition(loadFixtureRaw('beacon-patrol')).ok);
        assert.isTrue(parseMissionDefinition(loadFixtureRaw('hermit-persuade')).ok);
    });

    suite.test('parser 一次回報全部問題，不是遇錯即停', () => {
        const raw = JSON.parse(JSON.stringify(loadFixtureRaw('beacon-patrol')));
        raw.difficulty = 'WHATEVER';
        delete raw.branches[0].outcome.tiers.disaster;
        raw.branches[1].outcome.tiers.success.effects[0].kind = 'nonsense';
        const r = parseMissionDefinition(raw);
        assert.isFalse(r.ok);
        assert.greaterOrEqual(3, r.issues.length);
        const paths = r.issues.map(i => i.path).join('|');
        assert.contains(paths, 'difficulty');
        assert.contains(paths, 'tiers.disaster');
        assert.contains(paths, 'kind');
    });

    suite.test('parser 要求每個變體在情報 0～100 都選得到分支', () => {
        const raw = JSON.parse(JSON.stringify(loadFixtureRaw('hermit-persuade')));
        raw.branches[1].when.maxIntel = 60; // 把 61～89 的洞挖出來
        const r = parseMissionDefinition(raw);
        assert.isFalse(r.ok);
        assert.contains(r.issues[0].message, '找不到分支');
    });

    suite.test('parser 可接受宿主額外註冊的效果種類', () => {
        const raw = JSON.parse(JSON.stringify(loadFixtureRaw('hermit-persuade')));
        raw.branches[0].outcome.tiers.success.effects.push({ kind: 'customThing' });
        assert.isFalse(parseMissionDefinition(raw).ok);
        assert.isTrue(parseMissionDefinition(raw, { extraEffectKinds: ['customThing'] }).ok);
    });

    // ── seeded 衍生 ──
    suite.test('衍生種子：同輸入同值、用途／任務 id／存檔種子任一不同即不同', () => {
        assert.equals(deriveSeed(7, 'A', 'resolve'), deriveSeed(7, 'A', 'resolve'));
        assert.notEquals(deriveSeed(7, 'A', 'resolve'), deriveSeed(7, 'A', 'spawn'));
        assert.notEquals(deriveSeed(7, 'A', 'resolve'), deriveSeed(7, 'B', 'resolve'));
        assert.notEquals(deriveSeed(7, 'A', 'resolve'), deriveSeed(8, 'A', 'resolve'));
    });

    suite.test('衍生單值與呼叫順序／次數無關（無狀態）', () => {
        const a = deriveUnit(1, 'X', 'p');
        deriveUnit(1, 'Y', 'p'); deriveUnit(1, 'X', 'q'); deriveUnit(2, 'X', 'p');
        assert.equals(a, deriveUnit(1, 'X', 'p'));
        assert.inRange(a, 0, 0.999999999);
    });

    suite.test('串流 rng 可重播，且各用途彼此獨立', () => {
        const r1 = deriveRng(9, 'M', 'resolve');
        const r2 = deriveRng(9, 'M', 'resolve');
        for (let i = 0; i < 5; i += 1) assert.equals(r1.next(), r2.next());
        assert.notEquals(deriveRng(9, 'M', 'resolve').next(), deriveRng(9, 'M', 'spawn').next());
        const saved = createMissionRng(5);
        saved.next();
        const resumed = createMissionRng(saved.state);
        assert.equals(saved.next(), resumed.next());
    });

    // ── 情報分層與取得 ──
    suite.test('情報分層門檻 30／60／90', () => {
        assert.equals('blind', intelBandOf(29));
        assert.equals('vague', intelBandOf(30));
        assert.equals('vague', intelBandOf(59));
        assert.equals('clear', intelBandOf(60));
        assert.equals('clear', intelBandOf(89));
        assert.equals('full', intelBandOf(90));
        assert.equals('full', intelBandOf(100));
    });

    suite.test('再探遞增：+35／+25／+15（定義 base 35 時），單靠再探最高 90', () => {
        assert.equals(35, reconStepValue(beacon, 0));
        assert.equals(25, reconStepValue(beacon, 1));
        assert.equals(15, reconStepValue(beacon, 2));
        let inst = mkInstance(beacon, 'ROUTINE', 10);
        const gains: number[] = [];
        for (let i = 0; i < 3; i += 1) {
            const r = applyRecon(beacon, inst);
            assert.isTrue(r.ok);
            if (!r.ok) return;
            gains.push(r.gained);
            inst = { ...inst, intel: r.intel, reconCount: r.reconCount };
        }
        assert.equals('35,25,15', gains.join(','));
        assert.equals(85, inst.intel);
        const r4 = applyRecon(beacon, inst);
        assert.isTrue(r4.ok);
        if (r4.ok) assert.equals(90, r4.intel); // 第 4 次補到封頂 90
    });

    suite.test('再探封頂：已達 90 回 INTEL_FULL；連鎖給到 100 仍可，但再探不再增加', () => {
        const at90 = { ...mkInstance(beacon, 'ROUTINE', 90) };
        const r = applyRecon(beacon, at90);
        assert.isFalse(r.ok);
        if (!r.ok) assert.equals('INTEL_FULL', r.code);
        assert.equals(100, applyIntelDelta(95, 30));
        assert.equals(0, applyIntelDelta(5, -30));
        const at100 = applyRecon(beacon, { ...at90, intel: 100 });
        assert.isFalse(at100.ok);
    });

    suite.test('再探多次後不可能單靠再探超過 90（任何起點）', () => {
        for (const start of [0, 20, 45, 70]) {
            let inst = mkInstance(hermit, 'ONE', start);
            for (let i = 0; i < 8; i += 1) {
                const r = applyRecon(hermit, inst);
                if (!r.ok) break;
                inst = { ...inst, intel: r.intel, reconCount: r.reconCount };
            }
            assert.isTrue(inst.intel <= 90, `起點 ${start} 結果 ${inst.intel}`);
        }
    });

    suite.test('斥候加成：依智力與特質，有上限；不指派斥候用基礎值', () => {
        assert.equals(0, scoutIntelBonus(null));
        const weak = scoutIntelBonus({ stats: { int: 50 }, tags: [] });
        const strong = scoutIntelBonus({ stats: { int: 95 }, tags: ['scout'] });
        assert.equals(0, weak);
        assert.isTrue(strong > weak);
        assert.isTrue(strong <= DEFAULT_MISSION_BALANCE.recon.scoutBonusMax);
        const inst = mkInstance(beacon, 'ROUTINE', 10);
        const base = applyRecon(beacon, inst);
        const boosted = applyRecon(beacon, inst, strong);
        assert.isTrue(base.ok && boosted.ok);
        if (base.ok && boosted.ok) assert.isTrue(boosted.gained > base.gained);
    });

    suite.test('等待每任務只能一次：期限 +1 季、情報 +20（定義覆寫）', () => {
        const inst = mkInstance(beacon, 'ROUTINE', 40);
        const w = applyWait(beacon, inst);
        assert.isTrue(w.ok);
        if (!w.ok) return;
        assert.equals(60, w.intel);
        assert.equals(inst.expireSeason + 1, w.expireSeason);
        assert.isTrue(w.waited);
        const again = applyWait(beacon, { ...inst, intel: w.intel, waited: true, expireSeason: w.expireSeason });
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('ALREADY_WAITED', again.code);
        const defaultWait = applyWait(hermit, mkInstance(hermit, 'ONE', 40));
        assert.isTrue(defaultWait.ok);
        if (defaultWait.ok) assert.equals(55, defaultWait.intel); // hermit 定義 wait.delta=15
    });

    suite.test('進行中任務不能再探或等待', () => {
        const active = { ...mkInstance(beacon, 'ROUTINE', 40), status: 'ACTIVE' as const };
        const r = applyRecon(beacon, active);
        const w = applyWait(beacon, active);
        assert.isFalse(r.ok);
        assert.isFalse(w.ok);
    });

    // ── 分支選擇 ──
    suite.test('情報分層選分支：內奸變體 低→盲目、中→可疑、高→揪內奸', () => {
        const pick = (variant: string, intel: number): string => {
            const b = selectBranch(beacon, { variant, intel, flags: {}, generalTags: [] });
            return b ? b.id : 'none';
        };
        assert.equals('B_TRAITOR_BLIND', pick('TRAITOR', 0));
        assert.equals('B_TRAITOR_BLIND', pick('TRAITOR', 29));
        assert.equals('B_TRAITOR_SUSPECT', pick('TRAITOR', 30));
        assert.equals('B_TRAITOR_SUSPECT', pick('TRAITOR', 69));
        assert.equals('B_TRAITOR_EXPOSED', pick('TRAITOR', 70));
        assert.equals('B_ROUTINE', pick('ROUTINE', 69));
        assert.equals('B_ROUTINE_SHARP', pick('ROUTINE', 70));
        const hp = (intel: number): string => selectBranch(hermit, { variant: 'ONE', intel, flags: {}, generalTags: [] })!.id;
        assert.equals('B_BLIND', hp(29));
        assert.equals('B_INFORMED', hp(30));
        assert.equals('B_INFORMED', hp(89));
        assert.equals('B_INSIDER', hp(90));
    });

    suite.test('情報層改變目標與獎勵倍率（真相）', () => {
        const get = (id: string) => beacon.branches.find(b => b.id === id)!;
        assert.notEquals(get('B_TRAITOR_BLIND').objective.id, get('B_TRAITOR_EXPOSED').objective.id);
        assert.isTrue(get('B_TRAITOR_EXPOSED').modifiers.rewardMul > get('B_TRAITOR_BLIND').modifiers.rewardMul);
        assert.isTrue(get('B_TRAITOR_BLIND').modifiers.riskMul > get('B_TRAITOR_EXPOSED').modifiers.riskMul);
    });

    suite.test('分支 when 支援旗標與武將特質條件', () => {
        const def = JSON.parse(JSON.stringify(beacon));
        def.branches.push({
            id: 'B_FLAG', when: { variant: ['ROUTINE'], minIntel: 80, flagsAll: ['post'], generalTagsAny: ['scout'] },
            objective: { id: 'x', text: 'x' }, presented: {}, modifiers: { successDelta: 0, rewardMul: 1, riskMul: 1 },
            outcome: def.branches[0].outcome,
        });
        const sel = (flags: Record<string, boolean>, tags: string[]): string =>
            selectBranch(def, { variant: 'ROUTINE', intel: 85, flags, generalTags: tags })!.id;
        assert.equals('B_ROUTINE_SHARP', sel({}, ['scout']));
        assert.equals('B_ROUTINE_SHARP', sel({ post: true }, []));
        assert.equals('B_FLAG', sel({ post: true }, ['scout']));
    });

    // ── 適合度與低情報更危險 ──
    suite.test('同一武將：情報越低成功率越低（全域曲線＋分支 successDelta）', () => {
        const g = mkGeneral();
        const rateAt = (variant: string, intel: number): number => {
            const branch = selectBranch(beacon, { variant, intel, flags: {}, generalTags: [] });
            return computeFitness({ def: beacon, branch, general: g, intel }).rate;
        };
        assert.isTrue(rateAt('ROUTINE', 10) < rateAt('ROUTINE', 60));
        assert.isTrue(rateAt('TRAITOR', 10) < rateAt('TRAITOR', 50));
        assert.isTrue(rateAt('TRAITOR', 50) < rateAt('TRAITOR', 80));
    });

    suite.test('適合度：屬性、偏好特質、自告奮勇、成功率上下限', () => {
        const none = computeFitness({ def: beacon, branch: null, general: mkGeneral(), intel: 50 }).rate;
        const strong = computeFitness({ def: beacon, branch: null, general: mkGeneral({ stats: { lea: 100, int: 100 } }), intel: 50 }).rate;
        const tagged = computeFitness({ def: beacon, branch: null, general: mkGeneral({ tags: ['scout', 'garrison'] }), intel: 50 }).rate;
        const vol = computeFitness({ def: beacon, branch: null, general: mkGeneral({ volunteer: true }), intel: 50 }).rate;
        assert.isTrue(strong > none);
        assert.isTrue(tagged > none);
        assert.equals(1, vol);
        const weak = computeFitness({ def: beacon, branch: null, general: mkGeneral({ power: 1, stats: { lea: 1, int: 1 } }), intel: 0 }).rate;
        assert.equals(DEFAULT_MISSION_BALANCE.fitness.finalMin, weak);
    });

    suite.test('executorAffinity 預留輸入：只影響成功率，且有上限', () => {
        const g = mkGeneral();
        const at = (a: number): number => computeFitness({ def: beacon, branch: null, general: g, intel: 50, executorAffinity: a }).rate;
        assert.isTrue(at(1) > at(0));
        assert.isTrue(at(-1) < at(0));
        assert.equals(at(1), at(99)); // 超出範圍夾回 1
        assert.isTrue(at(1) - at(0) <= DEFAULT_MISSION_BALANCE.fitness.affinityMax + 1e-9);
    });

    suite.test('耗費：缺省走難度表，分支 costMul 縮放，精力明牌', () => {
        const c1 = computeCost(hermit, hermit.branches[0]);
        assert.equals(60, c1.grain);
        assert.equals(80, c1.silver);
        assert.equals(10, c1.energy);
        const insider = hermit.branches.find(b => b.id === 'B_INSIDER')!;
        assert.equals(Math.round(60 * 1.3), computeCost(hermit, insider).grain);
        assert.equals(DEFAULT_MISSION_BALANCE.difficulties.EASY.cost.troops, computeCost(beacon, null).troops);
    });

    suite.test('候選：全員列出、被擋者列全部原因、精力不足自動加入；委任吃 affinity', () => {
        const inst = mkInstance(beacon, 'ROUTINE', 50);
        const gs = [
            mkGeneral({ id: 'A', name: '甲', vitality: 100 }),
            mkGeneral({ id: 'B', name: '乙', vitality: 100 }),
            mkGeneral({ id: 'C', name: '丙', vitality: 5, block: ['injured', 'on-sortie'] }),
        ];
        const rows = evaluateAllCandidates(beacon, inst, gs, {});
        assert.lengthEquals(3, rows);
        assert.equals('C', rows[2].generalId);
        assert.equals('injured,on-sortie,low-energy', rows[2].block.join(','));
        assert.equals('low-energy', blocksOf(mkGeneral({ vitality: 1 }), 10).join(','));
        assert.equals('A', pickDelegate(rows)!.generalId); // 同分取代號字典序
        const withAffinity = evaluateAllCandidates(beacon, inst, gs, {}, { affinityByGeneral: { B: 1, A: -1 } });
        assert.equals('B', pickDelegate(withAffinity)!.generalId);
        assert.equals(null, pickDelegate([rows[2]]));
    });

    // ── 實例產生與派遣鎖定 ──
    suite.test('產生實例：同種子同結果，spawnKey 不同則獨立；變體依權重分布', () => {
        const mk = (id: string, key = 'w1'): ReturnType<typeof createMissionInstance> =>
            createMissionInstance({ def: beacon, id, saveSeed: 42, season: 1, spawnKey: key });
        assert.equals(JSON.stringify(mk('I1')), JSON.stringify(mk('I1')));
        let traitor = 0;
        const N = 1000;
        for (let i = 0; i < N; i += 1) {
            const inst = mk(`I${i}`);
            if (inst.variant === 'TRAITOR') traitor += 1;
            assert.inRange(inst.intel, 35, 55);
            assert.equals(1 + beacon.timing.expireSeasons, inst.expireSeason);
        }
        assert.inRange(traitor / N, 0.33, 0.47);
        const forced = createMissionInstance({ def: beacon, id: 'F', saveSeed: 1, season: 3, intelOverride: 60, expireSeasons: 4, chainFrom: 'P' });
        assert.equals(60, forced.intel);
        assert.equals(7, forced.expireSeason);
        assert.equals('P', forced.chainFrom);
    });

    suite.test('過期與到期判定', () => {
        const open = mkInstance(beacon, 'ROUTINE', 10);
        assert.isFalse(isMissionExpired(open, open.expireSeason));
        assert.isTrue(isMissionExpired(open, open.expireSeason + 1));
        const { lock } = lockDispatch({ def: beacon, instance: open, general: mkGeneral(), flags: {}, season: 2 });
        const act = { ...open, status: 'ACTIVE' as const, dispatch: lock };
        assert.isFalse(isMissionDue(act, 2));
        assert.isTrue(isMissionDue(act, lock.returnSeason));
        assert.isFalse(isMissionExpired(act, 99));
    });

    suite.test('派遣鎖定情報度與分支；durationDelta 影響回報季', () => {
        const inst = mkInstance(beacon, 'TRAITOR', 75);
        const { lock, cost } = lockDispatch({ def: beacon, instance: inst, general: mkGeneral(), flags: {}, season: 3, delegated: true });
        assert.equals(75, lock.intelAtDispatch);
        assert.equals('B_TRAITOR_EXPOSED', lock.branchId);
        assert.equals(true, lock.delegated);
        assert.equals(4, lock.returnSeason);
        assert.equals(DEFAULT_MISSION_BALANCE.difficulties.EASY.cost.grain, cost.grain);
        const slow = JSON.parse(JSON.stringify(beacon));
        slow.branches[0].modifiers.durationDelta = 2;
        const l2 = lockDispatch({ def: slow, instance: mkInstance(slow, 'ROUTINE', 10), general: mkGeneral(), flags: {}, season: 1 });
        assert.equals(4, l2.lock.returnSeason);
    });

    return suite;
}
