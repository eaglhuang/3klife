/**
 * LifeSceneChooser.test.ts — 武將作息與喜好引擎單元測試（QLIFE-01 第 2、3.1～3.3 章，PROG-2-10213）
 */
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    activeRosterIds, buildSnapshot, chooseScene, defaultStatesFromRoster, maybeAdjacentMove,
    scoreScenes, topScenes,
} from '../assets/scripts/core/life/LifeSceneChooser';
import {
    createLifeRngFor, lifeSeed, seasonOfQuarter, seqForManualSlot, slotFromHour, slotOfSeq,
} from '../assets/scripts/core/life/LifeClock';
import { resolveProfile } from '../assets/scripts/core/life/LifeFactors';
import type { LifeChooseContext, LifeData, LifeGeneralState } from '../assets/scripts/core/life/types';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');

function loadData(): LifeData {
    const read = (n: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, n), 'utf8'));
    return {
        profiles: read('life-profile.json'),
        factors: read('life-factors.json'),
        scenes: read('life-scenes.json'),
        roster: read('life-roster.json'),
    };
}

const data = loadData();

function ctx(state: LifeGeneralState, quarter: number, slotSeq: number, occupants?: Record<string, number>): LifeChooseContext {
    return { data, state, quarter, slotSeq, occupants };
}

function rankOf(c: LifeChooseContext, sceneId: string): number {
    return scoreScenes(c).findIndex(s => s.sceneId === sceneId) + 1;
}

function scoreOf(c: LifeChooseContext, sceneId: string): number {
    return scoreScenes(c).find(s => s.sceneId === sceneId)!.score;
}

export function createLifeSceneChooserSuite(): TestSuite {
    const suite = new TestSuite('LifeSceneChooser (PROG-2-10213)');
    const zhang: LifeGeneralState = { generalId: 'zhang_fei', faction: 'shu' };
    const zhuge: LifeGeneralState = { generalId: 'zhuge_liang', faction: 'shu' };
    // 本季第 4 個時段（序號 3）＝下午；序號 4＝傍晚
    const AFTERNOON = 3;
    const EVENING = 4;
    const LATE_NIGHT = 6;

    // ── 資料檔 ──
    suite.test('資料檔：10 位武將、市井大街 14 個一版場景齊全', () => {
        assert.lengthEquals(10, data.roster.generals);
        const mkt = data.scenes.scenes.filter(s => s.area === 'mkt').map(s => s.id);
        for (const id of ['mkt_street', 'mkt_inn', 'mkt_tavern', 'mkt_theater', 'mkt_teahouse', 'mkt_tailor', 'mkt_smithy',
            'mkt_carpenter', 'mkt_grocery', 'mkt_clinic', 'mkt_pawn', 'mkt_bookshop', 'mkt_guild', 'mkt_match']) {
            assert.isTrue(mkt.indexOf(id) >= 0, `缺場景 ${id}`);
        }
        const ids = data.scenes.scenes.map(s => s.id);
        assert.equals(ids.length, new Set(ids).size, '場景 id 不可重複');
        assert.lengthEquals(10, activeRosterIds(data));
    });

    suite.test('profile 沒資料的武將用 defaults', () => {
        const p = resolveProfile(data.profiles, 'nobody');
        assert.equals(data.profiles.defaults.chronotype, p.chronotype);
        assert.equals(50, p.sociability);
        assert.equals('home_general', p.homeScene);
    });

    // ── 時鐘 ──
    suite.test('時鐘：時段序號轉時段、季節、手動切時段', () => {
        assert.equals(1, slotOfSeq(0));
        assert.equals(7, slotOfSeq(6));
        assert.equals(1, slotOfSeq(7));
        assert.equals('spring', seasonOfQuarter(1));
        assert.equals('winter', seasonOfQuarter(4));
        assert.equals('spring', seasonOfQuarter(5));
        assert.equals(7 + 2, seqForManualSlot(9, 3));
        assert.equals(1, slotFromHour(5));
        assert.equals(7, slotFromHour(3));
        assert.equals(6, slotFromHour(23));
    });

    suite.test('亂數：同 seed 同序列，不同 seed 不同序列', () => {
        assert.equals(lifeSeed('a', 1, 2), lifeSeed('a', 1, 2));
        assert.notEquals(lifeSeed('a', 1, 2), lifeSeed('a', 1, 3));
        const r1 = createLifeRngFor('a', 1, 2);
        const r2 = createLifeRngFor('a', 1, 2);
        for (let i = 0; i < 5; i++) assert.equals(r1(), r2());
    });

    // ── 驗收 1：重現 ──
    suite.test('驗收1：同 seed 同狀態挑出同一場景（重現）', () => {
        for (const id of activeRosterIds(data)) {
            const st: LifeGeneralState = { generalId: id, faction: 'shu', mood: 10 };
            for (let seq = 0; seq < 14; seq++) {
                const a = chooseScene(ctx(st, 3, seq));
                const b = chooseScene(ctx({ ...st }, 3, seq));
                assert.equals(a.sceneId, b.sceneId, `${id} seq${seq}`);
            }
        }
        const s1 = buildSnapshot({ data, quarter: 2, slotSeq: 5, states: defaultStatesFromRoster(data) });
        const s2 = buildSnapshot({ data, quarter: 2, slotSeq: 5, states: defaultStatesFromRoster(data).reverse() });
        assert.equals(JSON.stringify(s1), JSON.stringify(s2), '快照與輸入順序無關');
    });

    suite.test('不同季度或時段會重挑（至少有武將換地方）', () => {
        const base = buildSnapshot({ data, quarter: 1, slotSeq: 3, states: defaultStatesFromRoster(data) });
        const nextQuarter = buildSnapshot({ data, quarter: 2, slotSeq: 3, states: defaultStatesFromRoster(data) });
        const changed = Object.keys(base.choices).filter(id => base.choices[id].sceneId !== nextQuarter.choices[id].sceneId);
        assert.isTrue(changed.length > 0, '換季應有人換場景');
        assert.equals('summer', nextQuarter.season);
    });

    // ── 驗收 2：因素改變排序 ──
    suite.test('驗收2a：張飛生小孩後育嬰房進前 5', () => {
        const before = rankOf(ctx(zhang, 1, AFTERNOON), 'home_nursery');
        const after = rankOf(ctx({ ...zhang, childUnder5: true }, 1, AFTERNOON), 'home_nursery');
        assert.isTrue(after < before, `名次應上升 ${before}→${after}`);
        assert.isTrue(after <= 5, `應進前 5，實際第 ${after}`);
    });

    suite.test('驗收2b：諸葛亮冬天茶館升高（+15）', () => {
        const spring = scoreOf(ctx(zhuge, 1, 2), 'mkt_teahouse');
        const winter = scoreOf(ctx(zhuge, 4, 2), 'mkt_teahouse');
        assert.isTrue(winter > spring, `冬 ${winter} 應高於春 ${spring}`);
        assert.isTrue(rankOf(ctx(zhuge, 4, 2), 'mkt_teahouse') <= rankOf(ctx(zhuge, 1, 2), 'mkt_teahouse'));
    });

    suite.test('驗收2c：戰爭時兵營升高', () => {
        const calm = ctx(zhuge, 1, AFTERNOON);
        const war = ctx({ ...zhuge, worldEvents: ['war'] }, 1, AFTERNOON);
        assert.isTrue(scoreOf(war, 'mil_barracks') > scoreOf(calm, 'mil_barracks'));
        assert.isTrue(rankOf(war, 'mil_barracks') < rankOf(calm, 'mil_barracks'));
        const zf = rankOf(ctx({ ...zhang, worldEvents: ['war'] }, 1, AFTERNOON), 'mil_barracks');
        assert.isTrue(zf <= 3, `張飛戰時兵營應在前 3，實際 ${zf}`);
    });

    suite.test('因素：升官漸退、羈絆、友誼低避開主角、心情', () => {
        const base = ctx(zhuge, 1, AFTERNOON);
        const promoted = (ago: number) => ctx({ ...zhuge, officeChange: { change: 'promoted', quartersAgo: ago }, workScenes: ['gov_office'] }, 1, AFTERNOON);
        const s0 = scoreOf(promoted(0), 'gov_office');
        const s2 = scoreOf(promoted(2), 'gov_office');
        const s4 = scoreOf(promoted(4), 'gov_office');
        assert.isTrue(s0 > s2 && s2 > s4, '升官加成隨季數漸退');
        assert.isTrue(s0 > scoreOf(base, 'gov_office'));
        assert.equals(scoreOf(base, 'gov_office'), s4, '滿 4 季後完全退掉');

        const bond = ctx({ ...zhang, bondScenes: ['mil_range'] }, 1, AFTERNOON);
        assert.isTrue(scoreOf(bond, 'mil_range') - scoreOf(ctx(zhang, 1, AFTERNOON), 'mil_range') >= 24);

        const hate = ctx({ ...zhang, friendship: -30, lordScenes: ['mkt_street'] }, 1, AFTERNOON);
        assert.isTrue(scoreOf(hate, 'mkt_street') < scoreOf(ctx(zhang, 1, AFTERNOON), 'mkt_street'));

        const sad = ctx({ ...zhuge, mood: -40 }, 1, AFTERNOON);
        assert.isTrue(scoreOf(sad, 'out_river') > scoreOf(base, 'out_river'), '低落時河邊升高');
    });

    // ── 驗收 3：占用與傷勢 ──
    suite.test('驗收3a：被占用者只回占用地點（不管 seed）', () => {
        for (let seq = 0; seq < 14; seq++) {
            const c = chooseScene(ctx({ ...zhang, occupancy: { kind: 'academy' } }, 1, seq));
            assert.equals('edu_academy', c.sceneId);
            assert.equals('occupied', c.reason);
        }
        const nursing = chooseScene(ctx({ ...zhang, occupancy: { kind: 'medical', sub: 'nursing' } }, 1, 2));
        assert.equals('home_nursery', nursing.sceneId);
        const explicit = chooseScene(ctx({ ...zhang, occupancy: { kind: 'campaign', sceneId: 'gov_dais' } }, 1, 2));
        assert.equals('gov_dais', explicit.sceneId);
    });

    suite.test('驗收3b：medical:injured 不鎖地點，只讓醫館／自宅／溫泉 +30', () => {
        const injured = { ...zhang, occupancy: { kind: 'medical', sub: 'injured' } };
        const healthy = ctx(zhang, 1, EVENING);
        const hurt = ctx(injured, 1, EVENING);
        for (const id of ['mkt_clinic', 'home_general', 'out_spring']) {
            assert.isTrue(scoreOf(hurt, id) - scoreOf(healthy, id) >= 29, `${id} 應 +30`);
        }
        const picks = new Set<string>();
        for (let q = 1; q <= 60; q++) {
            const c = chooseScene(ctx(injured, q, EVENING));
            assert.equals('chosen', c.reason);
            picks.add(c.sceneId);
        }
        const nonMedical = Array.from(picks).filter(id => ['mkt_clinic', 'home_general', 'out_spring'].indexOf(id) < 0);
        assert.isTrue(nonMedical.length > 0, '傷者仍可挑別處');
    });

    // ── 驗收 4：深夜 ──
    suite.test('驗收4：深夜除睡覺、夜市、守夜外分數為 0', () => {
        for (const id of activeRosterIds(data)) {
            const st: LifeGeneralState = { generalId: id, faction: 'shu' };
            const profile = resolveProfile(data.profiles, id);
            for (const s of scoreScenes(ctx(st, 1, LATE_NIGHT))) {
                const def = data.scenes.scenes.find(x => x.id === s.sceneId)!;
                const allowed = !!def.lateNightKind
                    || (profile.chronotype === 'night' && !!def.nightOwlSlots && def.nightOwlSlots.indexOf(7) >= 0);
                if (!allowed) assert.equals(0, s.score, `${id} ${s.sceneId} 深夜應為 0`);
            }
            const c = chooseScene(ctx(st, 1, LATE_NIGHT));
            const def = data.scenes.scenes.find(x => x.id === c.sceneId)!;
            assert.isTrue(!!def.lateNightKind || (profile.chronotype === 'night' && c.sceneId === 'mkt_tavern'), `${id} 深夜挑到 ${c.sceneId}`);
        }
        // 日行武將深夜多半回家睡
        const home = chooseScene(ctx(zhuge, 1, LATE_NIGHT));
        assert.equals('home_general', home.sceneId);
    });

    suite.test('slotFit：書肆上午下午偏重、酒館午前不營業', () => {
        const c = ctx(zhuge, 1, 0); // 晨
        assert.equals(0, scoreOf(c, 'mkt_tavern'));
        const am = scoreOf(ctx(zhuge, 1, 1), 'mkt_bookshop');
        const noon = scoreOf(ctx(zhuge, 1, 2), 'mkt_bookshop');
        assert.isTrue(am > noon, '上午（×1.3）應高於午（×1.0）');
    });

    // ── 其他規則 ──
    suite.test('容量：滿員場景不會被挑中', () => {
        const tavernCap = data.scenes.scenes.find(s => s.id === 'mkt_tavern')!.capacity;
        for (let q = 1; q <= 40; q++) {
            const c = chooseScene(ctx(zhang, q, EVENING, { mkt_tavern: tavernCap, mil_barracks: 999 }));
            assert.notEquals('mkt_tavern', c.sceneId);
        }
    });

    suite.test('快照：同場景人數不超過 capacity、被占用者先入位', () => {
        const states = defaultStatesFromRoster(data).map(s => ({ ...s, mood: 40 }));
        const snap = buildSnapshot({ data, quarter: 1, slotSeq: EVENING, states });
        const counts: Record<string, number> = {};
        for (const id of Object.keys(snap.choices)) counts[snap.choices[id].sceneId] = (counts[snap.choices[id].sceneId] || 0) + 1;
        for (const sid of Object.keys(counts)) {
            const cap = data.scenes.scenes.find(s => s.id === sid)!.capacity;
            assert.isTrue(counts[sid] <= cap, `${sid} 超過容量`);
        }
        const withOcc = defaultStatesFromRoster(data).map(s => (s.generalId === 'lu_bu' ? { ...s, occupancy: { kind: 'defense' } } : s));
        const snap2 = buildSnapshot({ data, quarter: 1, slotSeq: EVENING, states: withOcc });
        assert.equals('mil_city', snap2.choices['lu_bu'].sceneId);
        assert.equals('occupied', snap2.choices['lu_bu'].reason);
    });

    suite.test('快照：同季沿用上一時段所在地與軌跡，換季丟掉', () => {
        const states = defaultStatesFromRoster(data);
        const a = buildSnapshot({ data, quarter: 1, slotSeq: 1, states });
        const b = buildSnapshot({ data, quarter: 1, slotSeq: 2, states, previous: a });
        const id = 'zhang_fei';
        assert.equals(a.choices[id].sceneId, b.trail[id][1], '軌跡第 2 筆是上一時段');
        const c = buildSnapshot({ data, quarter: 2, slotSeq: 0, states, previous: b });
        assert.lengthEquals(1, c.trail[id], '換季重挑、軌跡歸零');
    });

    suite.test('最近去過扣分、目前所在加分（固執者加成更大）', () => {
        const base = scoreOf(ctx(zhang, 1, EVENING), 'mkt_tavern');
        const stay = scoreOf(ctx({ ...zhang, currentScene: 'mkt_tavern' }, 1, EVENING), 'mkt_tavern');
        const recent = scoreOf(ctx({ ...zhang, recentScenes: ['mkt_tavern'] }, 1, EVENING), 'mkt_tavern');
        assert.isTrue(stay > base && recent < base);
        const stubborn = { ...zhang };
        const stubbornGain = scoreOf(ctx({ ...stubborn, currentScene: 'mkt_tavern' }, 1, EVENING), 'mkt_tavern') - base;
        const lubu: LifeGeneralState = { generalId: 'lu_bu', faction: 'neutral' };
        const lubuGain = scoreOf(ctx({ ...lubu, currentScene: 'mil_arena' }, 1, EVENING), 'mil_arena')
            - scoreOf(ctx(lubu, 1, EVENING), 'mil_arena');
        assert.isTrue(lubuGain > stubbornGain, '呂布固執度 70 > 張飛 30');
    });

    suite.test('中途換相鄰場景：確定性、只換到同區且營業的場景', () => {
        let moved = 0;
        for (let seq = 0; seq < 400; seq++) {
            const c = ctx(zhang, 1, seq);
            const a = maybeAdjacentMove(c, 'mkt_street');
            assert.equals(a, maybeAdjacentMove(c, 'mkt_street'));
            if (a !== 'mkt_street') {
                moved++;
                assert.equals('mkt', data.scenes.scenes.find(s => s.id === a)!.area);
            }
        }
        assert.isTrue(moved > 10 && moved < 80, `約 10% 換場景，實際 ${moved}/400`);
    });

    suite.test('topScenes 只回正分場景且依分數排序', () => {
        const top = topScenes(ctx(zhang, 1, EVENING), 5);
        assert.lengthEquals(5, top);
        for (let i = 1; i < top.length; i++) assert.isTrue(top[i - 1].score >= top[i].score);
    });

    suite.test('抽籤分布：高分場景被挑到的次數明顯多於低分場景', () => {
        const counts: Record<string, number> = {};
        for (let q = 1; q <= 400; q++) {
            const c = chooseScene(ctx(zhang, q, EVENING));
            counts[c.sceneId] = (counts[c.sceneId] || 0) + 1;
        }
        assert.isTrue((counts['mkt_tavern'] || 0) > (counts['mkt_pawn'] || 0) * 3);
        assert.isTrue(Object.keys(counts).length >= 4, '不鎖死：至少挑過 4 種場景');
    });

    return suite;
}
