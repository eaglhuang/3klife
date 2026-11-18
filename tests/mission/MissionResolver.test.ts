// @spec-source → 通用任務核心架構設計（PROG-2-9144 卡 A）：結算引擎、懲罰上限、範例任務全分支
import { TestSuite, assert } from '../TestRunner';
import { MissionEngineError, resolveMission, ResolveOutput } from '../../assets/scripts/core/mission/MissionResolver';
import { parseMissionDefinition } from '../../assets/scripts/core/mission/MissionDefinitionParser';
import type { MissionDefinition, MissionGeneralFacts, MissionNode, MissionTier } from '../../assets/scripts/core/mission/MissionTypes';
import { dispatched, loadFixture, mkGeneral, mkInstance } from './missionTestKit';

function resolveAt(def: MissionDefinition, variant: string, intel: number, id: string, saveSeed: number,
    general: MissionGeneralFacts = mkGeneral(), flags: Record<string, number | boolean> = {}): ResolveOutput {
    const inst = dispatched(def, mkInstance(def, variant, intel, id), general, flags);
    return resolveMission({ def, instance: inst, general, saveSeed, season: 2, flags });
}

/** 造一個只有單一 roll 的小定義，用來驗證懲罰上限與縮放 */
function miniDef(difficulty: string, tiers: Record<MissionTier, MissionNode>, rollOver: object = {}, mods: object = {}): MissionDefinition {
    const raw = {
        schema: 'mission-def.v1', id: 'MINI', version: 1, theme: 't', difficulty, tags: [],
        text: { title: '小任務', brief: 'b' },
        requirement: { slots: 1, keyStats: { lea: 1 } }, timing: { durationSeasons: 1, expireSeasons: 1 },
        variants: [{ id: 'V', weight: 1 }], intel: { initial: 50, jitter: 0 },
        branches: [{
            id: 'B', when: { minIntel: 0 }, objective: { id: 'o', text: 'o' }, presented: {},
            modifiers: { successDelta: 0, rewardMul: 1, riskMul: 1, ...mods },
            outcome: { kind: 'roll', p: 0, critRatio: 0, disasterRatio: 1, tiers, ...rollOver },
        }],
    };
    const r = parseMissionDefinition(raw);
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    return r.def;
}

const noop: MissionNode = { kind: 'effects', effects: [] };

/** 靜態列舉樹中所有 effects 節點路徑（命名規則與引擎 trace 一致） */
function effectPaths(node: MissionNode, path: string, out: string[]): void {
    switch (node.kind) {
        case 'effects': out.push(path); return;
        case 'seq': node.nodes.forEach((n, i) => effectPaths(n, `${path}/${i}`, out)); return;
        case 'roll': (['critical', 'success', 'fail', 'disaster'] as MissionTier[]).forEach(t => effectPaths(node.tiers[t], `${path}/${t}`, out)); return;
        case 'chance': effectPaths(node.hit, `${path}/hit`, out); effectPaths(node.miss, `${path}/miss`, out); return;
        case 'switch':
            node.cases.forEach((c, i) => effectPaths(c.then, `${path}/case${i}`, out));
            if (node.else) effectPaths(node.else, `${path}/else`, out);
            return;
    }
}

export function createMissionResolverSuite(): TestSuite {
    const suite = new TestSuite('MissionResolver (PROG-2-9144)');
    const beacon = loadFixture('beacon-patrol');
    const hermit = loadFixture('hermit-persuade');

    suite.test('同 seed 同輸入 → 結果完全相同（含 trace 與帳本）', () => {
        const a = resolveAt(beacon, 'TRAITOR', 75, 'M9', 1234);
        const b = resolveAt(beacon, 'TRAITOR', 75, 'M9', 1234);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    suite.test('結算與呼叫順序無關：穿插其他任務、反向順序、重複結算皆不影響', () => {
        const ids = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
        const forward = ids.map(id => JSON.stringify(resolveAt(beacon, 'TRAITOR', 40, id, 77)));
        const backward = ids.slice().reverse().map(id => JSON.stringify(resolveAt(beacon, 'TRAITOR', 40, id, 77))).reverse();
        assert.equals(forward.join('#'), backward.join('#'));
        // 只結算其中一個、中間夾別的任務與別的定義
        resolveAt(hermit, 'ONE', 50, 'X', 77); resolveAt(beacon, 'ROUTINE', 10, 'A1', 78);
        assert.equals(forward[3], JSON.stringify(resolveAt(beacon, 'TRAITOR', 40, 'A4', 77)));
    });

    suite.test('不同存檔種子或不同任務 id 會得到不同的擲骰', () => {
        const us = new Set<number>();
        for (let s = 1; s <= 20; s += 1) us.add(resolveAt(beacon, 'ROUTINE', 50, 'M', s).trace[0].u as number);
        assert.isTrue(us.size > 15);
        const byId = new Set<number>();
        for (let i = 0; i < 20; i += 1) byId.add(resolveAt(beacon, 'ROUTINE', 50, `M${i}`, 5).trace[0].u as number);
        assert.isTrue(byId.size > 15);
    });

    suite.test('結算輸入沒有派遣或分支不存在時丟 MissionEngineError', () => {
        const inst = mkInstance(beacon, 'ROUTINE', 50);
        assert.throws(() => resolveMission({ def: beacon, instance: inst, general: mkGeneral(), saveSeed: 1, season: 1, flags: {} }));
        const act = dispatched(beacon, inst, mkGeneral());
        const broken = { ...act, dispatch: { ...act.dispatch!, branchId: 'NOPE' } };
        let caught: unknown = null;
        try { resolveMission({ def: beacon, instance: broken, general: mkGeneral(), saveSeed: 1, season: 1, flags: {} }); } catch (e) { caught = e; }
        assert.isTrue(caught instanceof MissionEngineError);
    });

    suite.test('派遣後情報鎖定：之後實例情報怎麼變，結算仍用鎖定的分支與成功率', () => {
        const g = mkGeneral();
        const act = dispatched(beacon, mkInstance(beacon, 'TRAITOR', 10, 'L1'), g);
        const tampered = { ...act, intel: 100 };
        const a = resolveMission({ def: beacon, instance: act, general: g, saveSeed: 3, season: 2, flags: {} });
        const b = resolveMission({ def: beacon, instance: tampered, general: g, saveSeed: 3, season: 2, flags: {} });
        assert.equals('B_TRAITOR_BLIND', a.branchId);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    suite.test('低情報實際更危險：同變體盲目分支 vs 識破分支（大失敗率高、成功率低）', () => {
        const N = 3000;
        const stat = (intel: number): { disaster: number; good: number } => {
            let disaster = 0; let good = 0;
            for (let i = 0; i < N; i += 1) {
                const t = resolveAt(beacon, 'TRAITOR', intel, `D${i}`, 99).tier;
                if (t === 'disaster') disaster += 1;
                if (t === 'critical' || t === 'success') good += 1;
            }
            return { disaster: disaster / N, good: good / N };
        };
        const blind = stat(10);
        const exposed = stat(80);
        assert.isTrue(blind.disaster > exposed.disaster * 2, `大失敗 盲目 ${blind.disaster} 識破 ${exposed.disaster}`);
        assert.isTrue(blind.good < exposed.good - 0.15, `成功 盲目 ${blind.good} 識破 ${exposed.good}`);
    });

    suite.test('同一分支內情報越低也越危險（全域曲線）：ROUTINE 情報 10 vs 60', () => {
        const N = 3000;
        const dis = (intel: number): number => {
            let d = 0;
            for (let i = 0; i < N; i += 1) if (resolveAt(beacon, 'ROUTINE', intel, `C${i}`, 5).tier === 'disaster') d += 1;
            return d / N;
        };
        assert.isTrue(dis(10) > dis(60));
    });

    suite.test('四級機率符合門檻：p=0.5、crit 0.5、disaster 0.5（riskMul=1、情報 50）', () => {
        const def = miniDef('EASY', { critical: noop, success: noop, fail: noop, disaster: noop }, { p: 0.5, critRatio: 0.5, disasterRatio: 0.5 });
        const count: Record<string, number> = { critical: 0, success: 0, fail: 0, disaster: 0 };
        const N = 8000;
        for (let i = 0; i < N; i += 1) count[resolveAt(def, 'V', 50, `P${i}`, 11).tier] += 1;
        assert.inRange(count.critical / N, 0.22, 0.28);
        assert.inRange(count.success / N, 0.22, 0.28);
        assert.inRange(count.fail / N, 0.22, 0.28);
        assert.inRange(count.disaster / N, 0.22, 0.28);
    });

    suite.test('獎勵倍率與損失倍率：正數乘 rewardMul、負數乘 riskMul、mulKey none 不縮放', () => {
        const def = miniDef('EASY', {
            critical: noop, fail: noop, disaster: noop,
            success: { kind: 'effects', effects: [
                { kind: 'resource', res: 'grain', amount: 100 },
                { kind: 'resource', res: 'silver', amount: -50 },
                { kind: 'fame', amount: { base: 10, mulKey: 'none' } },
                { kind: 'generalExp', amount: { base: 10, mulKey: 'risk' } },
            ] },
        }, { p: 1 }, { rewardMul: 1.5, riskMul: 2 });
        const out = resolveAt(def, 'V', 50, 'S', 1);
        assert.equals('success', out.tier);
        const byKind = (k: string): number => (out.effects.find(e => e.kind === k) as { amount: number }).amount;
        assert.equals(150, (out.effects[0] as { amount: number }).amount);
        assert.equals(-100, (out.effects[1] as { amount: number }).amount);
        assert.equals(10, byKind('fame'));
        assert.equals(20, byKind('generalExp'));
        assert.equals('S', out.effects[0].missionId);
        assert.equals('G1', out.effects[0].generalId);
    });

    suite.test('懲罰上限：受傷只在大失敗且最多 2 季，簡單任務不會被俘', () => {
        const harm: MissionNode = { kind: 'effects', effects: [
            { kind: 'generalState', state: 'injured', seasons: 5 },
            { kind: 'generalState', state: 'captured', seasons: 2 },
            { kind: 'resource', res: 'troops', amount: -100 },
        ] };
        const easy = miniDef('EASY', { critical: noop, success: noop, fail: harm, disaster: harm });
        const out = resolveAt(easy, 'V', 50, 'H1', 1);
        assert.equals('disaster', out.tier);
        const states = out.effects.filter(e => e.kind === 'generalState') as Array<{ state: string; seasons: number; note?: string }>;
        assert.lengthEquals(1, states);
        assert.equals('injured', states[0].state);
        assert.equals(2, states[0].seasons);
        assert.isTrue(!!states[0].note);
        assert.isTrue(out.trace.some(t => t.kind === 'capped' && (t.note ?? '').includes('被俘')));
        assert.equals('injured:2', out.memoryEvents[0].stateChanges.join(','));
        // 資源損失不受限制地保留
        assert.isTrue(out.effects.some(e => e.kind === 'resource'));
    });

    suite.test('懲罰上限：一般失敗（非大失敗）的受傷／被俘一律丟棄', () => {
        const harm: MissionNode = { kind: 'effects', effects: [{ kind: 'generalState', state: 'injured', seasons: 1 }, { kind: 'fame', amount: -3 }] };
        const def = miniDef('HELL', { critical: noop, success: noop, fail: harm, disaster: noop }, { disasterRatio: 0 });
        const out = resolveAt(def, 'V', 50, 'H2', 1);
        assert.equals('fail', out.tier);
        assert.isFalse(out.effects.some(e => e.kind === 'generalState'));
        assert.isTrue(out.effects.some(e => e.kind === 'fame'));
    });

    suite.test('懲罰上限：高難度（ADVANCED 以上）大失敗才可能被俘', () => {
        const harm: MissionNode = { kind: 'effects', effects: [{ kind: 'generalState', state: 'captured', seasons: 1 }] };
        for (const d of ['ELITE', 'ADVANCED', 'HELL']) {
            const def = miniDef(d, { critical: noop, success: noop, fail: noop, disaster: harm });
            const captured = resolveAt(def, 'V', 50, 'H3', 1).effects.some(e => e.kind === 'generalState');
            assert.equals(d !== 'ELITE', captured, `${d}`);
        }
    });

    suite.test('記憶事件：帶成敗等級、分支、情報、收益與備註標籤', () => {
        const out = resolveAt(beacon, 'TRAITOR', 10, 'MEM', 1);
        const ev = out.memoryEvents[0];
        assert.equals('G1', ev.generalId);
        assert.equals(out.tier, ev.tier);
        assert.equals('B_TRAITOR_BLIND', ev.branchId);
        assert.equals(10, ev.intelAtDispatch);
        assert.equals('MIL_BEACON_PATROL', ev.defId);
        assert.isTrue(ev.text.length > 0);
    });

    suite.test('switch：generalTag／stat 條件、旗標、情報門檻都能分流', () => {
        const mk = (on: string, cases: Array<{ when?: unknown; gte?: number }>): MissionDefinition => {
            const unlock = (id: string): object => ({ kind: 'effects', effects: [{ kind: 'unlock', id }] });
            const raw = JSON.parse(JSON.stringify(miniDef('EASY', { critical: noop, success: noop, fail: noop, disaster: noop })));
            raw.branches[0].outcome = { kind: 'switch', on, cases: cases.map((c, i) => ({ ...c, then: unlock(`c${i}`) })), else: unlock('else') };
            const r = parseMissionDefinition(raw);
            if (!r.ok) throw new Error(JSON.stringify(r.issues));
            return r.def;
        };
        const idOf = (def: MissionDefinition, g: MissionGeneralFacts, flags: Record<string, number | boolean> = {}, intel = 50): string =>
            (resolveAt(def, 'V', intel, 'SW', 1, g, flags).effects[0] as { id: string }).id;
        assert.equals('c0', idOf(mk('generalTag', [{ when: 'bookish' }]), mkGeneral({ tags: ['bookish'] })));
        assert.equals('else', idOf(mk('generalTag', [{ when: 'bookish' }]), mkGeneral()));
        assert.equals('c0', idOf(mk('stat:int>=80', [{ when: true }]), mkGeneral({ stats: { int: 85 } })));
        assert.equals('else', idOf(mk('stat:int>=80', [{ when: true }]), mkGeneral({ stats: { int: 79 } })));
        assert.equals('c0', idOf(mk('flag:hot', [{ when: true }]), mkGeneral(), { hot: true }));
        assert.equals('else', idOf(mk('flag:hot', [{ when: true }]), mkGeneral()));
        assert.equals('c1', idOf(mk('intel', [{ gte: 90 }, { gte: 40 }]), mkGeneral(), {}, 60));
        assert.equals('c0', idOf(mk('variant', [{ when: 'V' }]), mkGeneral()));
    });

    suite.test('兩份範例任務：每個分支四級都跑得到，且每個 effects 葉節點都被走過', () => {
        const generals: MissionGeneralFacts[] = [
            mkGeneral({ id: 'P', tags: [] }),
            mkGeneral({ id: 'Q', tags: ['bookish'], stats: { int: 90, cha: 90, lea: 90 } }),
            mkGeneral({ id: 'R', tags: ['brutal'], stats: { int: 40 } }),
            mkGeneral({ id: 'W', power: 1, stats: { int: 1, lea: 1, cha: 1, pol: 1 } }), // 弱者：讓高情報分支也有機會大失敗
        ];
        let checked = 0;
        for (const def of [beacon, hermit]) {
            for (const v of def.variants) {
                for (const branch of def.branches) {
                    if (branch.when.variant && branch.when.variant.indexOf(v.id) < 0) continue;
                    const intel = Math.max(branch.when.minIntel, 0);
                    const tiers = new Set<string>();
                    const visited = new Set<string>();
                    for (let i = 0; i < 12000; i += 1) {
                        const g = generals[i % generals.length];
                        const out = resolveAt(def, v.id, intel, `E${i}`, 2024 + i, g);
                        // 實際被選中的分支應與該情報度的選擇一致（可能被更高 minIntel 的分支取代，只統計命中者）
                        if (out.branchId !== branch.id) continue;
                        tiers.add(out.tier);
                        out.trace.filter(t => t.kind === 'effects').forEach(t => visited.add(t.path));
                    }
                    if (tiers.size === 0) continue; // 此變體在該 minIntel 不會選到這個分支
                    checked += 1;
                    const want: string[] = [];
                    effectPaths(branch.outcome, 'root', want);
                    assert.equals(4, tiers.size, `${def.id}/${v.id}/${branch.id} 只跑到 ${Array.from(tiers).join(',')}`);
                    for (const p of want) assert.isTrue(visited.has(p), `${def.id}/${v.id}/${branch.id} 未走到 ${p}`);
                }
            }
        }
        assert.equals(8, checked); // 5 + 3 個分支全部驗過，不是空跑
    });

    suite.test('每個分支都至少被某個變體＋情報度選中（範例沒有死分支）', () => {
        for (const def of [beacon, hermit]) {
            for (const b of def.branches) {
                let hit = false;
                for (const v of def.variants) {
                    const inst = dispatched(def, mkInstance(def, v.id, b.when.minIntel, 'Z'), mkGeneral());
                    if (inst.dispatch!.branchId === b.id) hit = true;
                }
                assert.isTrue(hit, `${def.id}/${b.id}`);
            }
        }
    });

    suite.test('隱士範例：書生／武夫／一般武將走不同子樹（switch 依特質分流）', () => {
        const pathsOf = (g: MissionGeneralFacts): Set<string> => {
            const s = new Set<string>();
            for (let i = 0; i < 400; i += 1) resolveAt(hermit, 'ONE', 50, `T${i}`, 8, g).trace.forEach(t => s.add(t.path));
            return s;
        };
        const book = pathsOf(mkGeneral({ tags: ['bookish'] }));
        const brute = pathsOf(mkGeneral({ tags: ['brutal'] }));
        const plain = pathsOf(mkGeneral());
        assert.isTrue(book.has('root/case0/critical'));
        assert.isTrue(brute.has('root/case1'));
        assert.isFalse(brute.has('root/case1/critical'));
        assert.isTrue(plain.has('root/else/critical'));
    });

    return suite;
}
