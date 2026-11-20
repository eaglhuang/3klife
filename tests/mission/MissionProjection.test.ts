// @spec-source → 通用任務核心架構設計（PROG-2-9144 卡 A）：依情報投影、誤導文字、IMissionService 型別
import { TestSuite, assert } from '../TestRunner';
import { projectMission, projectFacts } from '../../assets/scripts/core/mission/MissionProjection';
import { computeFitness } from '../../assets/scripts/core/mission/MissionFitness';
import { selectBranch } from '../../assets/scripts/core/mission/MissionBranch';
import type { IMissionService, MissionResult } from '../../assets/scripts/core/mission/service/IMissionService';
import { dispatched, loadFixture, mkGeneral, mkInstance } from './missionTestKit';

export function createMissionProjectionSuite(): TestSuite {
    const suite = new TestSuite('MissionProjection (PROG-2-9144)');
    const beacon = loadFixture('beacon-patrol');
    const hermit = loadFixture('hermit-persuade');
    const view = (variant: string, intel: number, seed = 1, id = 'V1') =>
        projectMission({ def: beacon, instance: mkInstance(beacon, variant, intel, id), saveSeed: seed, flags: {}, general: mkGeneral() });

    suite.test('情報 <30：成功率「未知」、風險「高？」、獎勵只有種類加「？」，不給細節', () => {
        const v = view('TRAITOR', 10);
        assert.equals('hidden', v.rate.state);
        assert.equals('未知', v.rate.text);
        assert.equals('高？', v.risk.text);
        assert.equals(0, v.riskTags.length);
        assert.equals('hidden', v.reward.state);
        assert.isTrue(v.reward.text.endsWith('？'));
        assert.isTrue(v.reward.value === undefined);
        assert.equals(0, v.hiddenRewards.length);
        assert.equals('blind', v.intelBand);
    });

    suite.test('低情報時，內奸與一般變體的投影視圖看起來一樣（真相不外洩）', () => {
        const a = view('TRAITOR', 10);
        const b = view('ROUTINE', 10);
        const strip = (x: typeof a): string => JSON.stringify({ ...x, reward: undefined });
        assert.equals(strip(a).replace(/"hints":\[[^\]]*\]/, ''), strip(b).replace(/"hints":\[[^\]]*\]/, ''));
        assert.equals(a.objective.text, b.objective.text);
        const json = JSON.stringify(a);
        assert.notContains(json, 'TRAITOR');
        assert.notContains(json, 'B_TRAITOR');
        assert.notContains(json, 'variant');
    });

    suite.test('情報 30–59：成功率高中低、風險等級加一項標籤、獎勵量級星等', () => {
        const v = view('TRAITOR', 45);
        assert.equals('hint', v.rate.state);
        assert.isTrue(/^成功率：(高|中|低)$/.test(v.rate.text));
        assert.isTrue(/^風險：(低|中|高)$/.test(v.risk.text));
        assert.isTrue(v.riskTags.length <= 1);
        assert.isTrue(/^量級：★{1,3}$/.test(v.reward.text));
    });

    suite.test('情報 60–89：成功率區間（含真值、取整 5）、列出主要風險、獎勵區間', () => {
        const trueRate = (variant: string, intel: number): number => {
            const branch = selectBranch(beacon, { variant, intel, flags: {}, generalTags: [] });
            return Math.round(computeFitness({ def: beacon, branch, general: mkGeneral(), intel }).rate * 100);
        };
        for (let seed = 1; seed <= 30; seed += 1) {
            const v = view('TRAITOR', 75, seed);
            assert.equals('range', v.rate.state);
            const t = trueRate('TRAITOR', 75);
            assert.isTrue(v.rate.lo! <= t && t <= v.rate.hi!, `seed ${seed}: ${v.rate.lo}-${v.rate.hi} 不含 ${t}`);
            assert.equals(0, v.rate.lo! % 5);
            assert.equals(0, v.rate.hi! % 5);
        }
        const v = view('TRAITOR', 75);
        assert.equals('range', v.reward.state);
        assert.isTrue(v.riskTags.length >= 1);
        assert.equals('揪出烽燧中的內奸', v.objective.text);
    });

    suite.test('情報 ≥90：成功率確切值，等於引擎實際成功率；隱藏獎勵只在 100 顯示', () => {
        const branch = selectBranch(beacon, { variant: 'TRAITOR', intel: 90, flags: {}, generalTags: [] });
        const t = Math.round(computeFitness({ def: beacon, branch, general: mkGeneral(), intel: 90 }).rate * 100);
        const v90 = view('TRAITOR', 90);
        assert.equals('exact', v90.rate.state);
        assert.equals(t, v90.rate.value);
        assert.equals(0, v90.hiddenRewards.length);
        assert.equals('exact', v90.risk.state);
        const v100 = view('TRAITOR', 100);
        assert.isTrue(v100.hiddenRewards.length > 0);
    });

    suite.test('數字永不誤導：不同存檔種子下，區間與確切值都包含真值，確切值完全一致', () => {
        const vs = [1, 2, 3, 4, 5, 6, 7, 8].map(s => view('ROUTINE', 95, s));
        for (const v of vs) assert.equals(vs[0].rate.value, v.rate.value);
        for (const v of vs) assert.equals(vs[0].reward.text, v.reward.text);
    });

    suite.test('目標呈現：低／中情報顯示「呈現版」，高情報揭露真目標', () => {
        assert.equals('巡查並整飭烽燧', view('TRAITOR', 10).objective.text);
        assert.equals('巡查烽燧；似有蹊蹺', view('TRAITOR', 45).objective.text);
        assert.equals('揪出烽燧中的內奸', view('TRAITOR', 75).objective.text);
        assert.equals('揪出收了敵方銀兩的什長', view('TRAITOR', 95).objective.text);
    });

    suite.test('耗費、精力、時限一律明牌（各情報層一致）', () => {
        const base = view('ROUTINE', 10).cost;
        for (const i of [10, 45, 75, 95]) assert.equals(JSON.stringify(base), JSON.stringify(view('ROUTINE', i).cost));
        assert.equals(beacon.timing.durationSeasons, view('ROUTINE', 10).durationSeasons);
    });

    suite.test('事實依情報逐層揭露；低於最低門檻為 ???', () => {
        const at = (intel: number, key: string, seed = 1): string =>
            projectFacts(beacon, 'F', intel, seed).find(f => f.key === key)!.text;
        // garrison 無誤導說法，行為確定
        assert.equals('???', at(20, 'garrison'));
        assert.equals('???', at(49, 'garrison'));
        assert.equals('守卒士氣低落，有人私下議論軍餉。', at(50, 'garrison'));
        assert.equals('三號烽燧的什長近日突然闊綽，出手不像守卒。', at(90, 'garrison'));
        assert.equals('游騎行動很有規律，像是有人替他們掌握了輪值時間。', at(75, 'enemy'));
    });

    suite.test('誤導只影響定性文字：低情報可能顯示 decoy，依 seed 決定、可重播、高情報不會誤導', () => {
        const decoy = '暫無敵蹤，一切如常。';
        const at = (intel: number, seed: number): string => projectFacts(beacon, 'F', intel, seed).find(f => f.key === 'enemy')!.text;
        let shown = 0;
        const N = 400;
        for (let s = 1; s <= N; s += 1) {
            const t = at(10, s);
            assert.equals(t, at(10, s)); // 同 seed 重播一致
            if (t === decoy) shown += 1; else assert.equals('???', t);
        }
        assert.isTrue(shown > N * 0.6 && shown < N, `情報 10 時誤導率 ${shown / N}`);
        for (let s = 1; s <= 100; s += 1) {
            assert.notEquals(decoy, at(60, s));
            assert.notEquals(decoy, at(95, s));
        }
        // 誤導率隨情報升高而下降
        let mid = 0;
        for (let s = 1; s <= N; s += 1) if (at(40, s) === decoy) mid += 1;
        assert.isTrue(mid < shown);
    });

    suite.test('穩定假象：同一任務同情報同 seed 重複投影完全一致', () => {
        for (const intel of [10, 45, 75, 95]) {
            assert.equals(JSON.stringify(view('TRAITOR', intel, 9)), JSON.stringify(view('TRAITOR', intel, 9)));
        }
    });

    suite.test('派遣後投影用鎖定的情報度（之後實例情報變動不影響視圖）', () => {
        const act = dispatched(beacon, mkInstance(beacon, 'TRAITOR', 10, 'LK'), mkGeneral());
        const moved = { ...act, intel: 100 };
        const a = projectMission({ def: beacon, instance: act, saveSeed: 1, flags: {} });
        const b = projectMission({ def: beacon, instance: moved, saveSeed: 1, flags: {} });
        assert.equals(10, a.intel);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
        assert.isFalse(a.canRecon);
        assert.isFalse(a.canWait);
    });

    suite.test('可否再探／等待旗標：再探到封頂後不可再探，等過後不可再等', () => {
        const open = mkInstance(beacon, 'ROUTINE', 50);
        const v = projectMission({ def: beacon, instance: open, saveSeed: 1, flags: {} });
        assert.isTrue(v.canRecon && v.canWait);
        const v2 = projectMission({ def: beacon, instance: { ...open, intel: 90, waited: true }, saveSeed: 1, flags: {} });
        assert.isFalse(v2.canRecon);
        assert.isFalse(v2.canWait);
    });

    suite.test('隱士範例：90 以上才顯示「隱情」事實與隱藏獎勵層', () => {
        const mk = (intel: number) => projectMission({ def: hermit, instance: mkInstance(hermit, 'ONE', intel, 'H'), saveSeed: 1, flags: {}, general: mkGeneral() });
        const hook = (intel: number): string => mk(intel).facts.find(f => f.key === 'hidden_hook')!.text;
        assert.equals('???', hook(60));
        assert.contains(hook(90), '仰慕俠義之士');
        assert.equals('替隱士之女求醫，結下善緣', mk(90).objective.text);
        assert.equals('以禮說服隱士出山', mk(75).objective.text);
    });

    suite.test('IMissionService 型別可被實作（編譯期檢查：只有型別，無宿主）', () => {
        const stub = (): MissionResult<never> => ({ ok: false, code: 'NO_MISSION', text: 'stub' });
        const svc: IMissionService = {
            getBoard: stub, getDetail: stub, getCandidates: stub, getHistory: stub,
            recon: async () => stub(), wait: async () => stub(), dispatch: async () => stub(), advanceSeason: async () => stub(),
            getSnapshot: () => ({ version: 2, revision: 0, rng: { seed: 1, serial: 0 }, season: 1, missions: [], history: [], flags: {} }),
            loadSnapshot: () => undefined, onChanged: () => () => undefined,
        };
        assert.equals(2, svc.getSnapshot().version);
        assert.isFalse(svc.getBoard().ok);
    });

    return suite;
}
