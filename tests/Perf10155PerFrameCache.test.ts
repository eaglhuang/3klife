/**
 * PROG-2-10155：戰場每幀重算改成有變動才算
 * - BadgeAvoidSolver：輸入相同沿用上一幀；輸出與舊流程（bodyAvoidOffsetY → stackBadgeOffsets）逐位相同（含 PR #2710 本體避讓）
 * - TroopSpineConfigCache：結果與 troopSpineConfigWithFallback 相同，素材失敗數變動時才重算
 */
import { assert, TestSuite } from './TestRunner';
import { TroopSpineConfigCache, troopSpineConfigWithFallback } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import {
  BadgeAvoidSolver, bodyAvoidOffsetY, generalBodyRect, stackBadgeOffsets,
  type LabelRect, type StackBadgeEntry,
} from '../assets/scripts/battle/shared/GeneralPlateAvoidance';

/** 可重現亂數 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 舊流程（PROG-2-10155 之前 UnitRenderer.avoidGeneralPlates 的計算段），當作對照 */
function legacySolve(entries: StackBadgeEntry[], plates: LabelRect[], bodies: LabelRect[], maxShift: number) {
  const bodyDy = new Map<string, number>(); const bodyFaded = new Set<string>();
  if (bodies.length > 0) {
    for (const e of entries) {
      const r = bodyAvoidOffsetY(e.rect, bodies, maxShift);
      if (r.dy !== 0) { bodyDy.set(e.id, r.dy); e.rect.y += r.dy; }
      if (r.faded) bodyFaded.add(e.id);
    }
  }
  return { bodyDy, bodyFaded, targets: stackBadgeOffsets(entries, plates) };
}

const clone = (entries: StackBadgeEntry[]): StackBadgeEntry[] => entries.map(e => ({ id: e.id, priority: e.priority, rect: { ...e.rect } }));
const mapEq = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const setEq = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every(k => b.has(k));

export function createPerf10155PerFrameCacheSuite(): TestSuite {
  const suite = new TestSuite('Perf10155PerFrameCache (每幀重算改有變動才算)');
  suite.test('BadgeAvoidSolver：隨機多幀輸出與舊流程逐位相同（含本體避讓、受擊優先）', () => {
    const rand = rng(1127);
    const solver = new BadgeAvoidSolver();
    let frames = 0;
    for (let round = 0; round < 60; round++) {
      const n = 3 + Math.floor(rand() * 12);
      const entries: StackBadgeEntry[] = [];
      for (let i = 0; i < n; i++) entries.push({ id: 'u' + i, priority: rand() < 0.2 ? 1 : 0, rect: { x: Math.round(rand() * 600 - 300), y: Math.round(rand() * 400 - 200), halfW: 63, halfH: 31 } });
      const plates: LabelRect[] = rand() < 0.7 ? [{ x: Math.round(rand() * 200 - 100), y: Math.round(rand() * 100), halfW: 150, halfH: 30 }] : [];
      const bodies: LabelRect[] = rand() < 0.7 ? [generalBodyRect(Math.round(rand() * 300 - 150), Math.round(rand() * 100 - 200), 230)] : [];
      const maxShift = bodies.length ? 230 * 0.75 : 0;
      // 同一組輸入連餵 3 幀：第 1 幀算、第 2～3 幀命中快取，三幀都要等於舊流程
      for (let k = 0; k < 3; k++) {
        const want = legacySolve(clone(entries), plates, bodies, maxShift);
        const got = solver.solve(clone(entries), plates, bodies, maxShift);
        assert.isTrue(mapEq(got.bodyDy, want.bodyDy), `bodyDy 不同 round=${round} k=${k}`);
        assert.isTrue(setEq(got.bodyFaded, want.bodyFaded), `bodyFaded 不同 round=${round} k=${k}`);
        assert.isTrue(mapEq(got.targets, want.targets), `targets 不同 round=${round} k=${k}`);
        frames += 1;
      }
    }
    assert.equals(180, frames);
    assert.isTrue(solver.hits >= 120, '每組輸入第 2、3 幀要命中快取，實際命中 ' + solver.hits);
    assert.isTrue(solver.misses <= 60, '未命中不該超過輸入組數，實際 ' + solver.misses);
  });

  suite.test('BadgeAvoidSolver：任何輸入變動（位置、優先序、id、名牌、本體）都重算，不沿用舊值', () => {
    const solver = new BadgeAvoidSolver();
    const base = (): StackBadgeEntry[] => [
      { id: 'a', priority: 0, rect: { x: 0, y: 0, halfW: 60, halfH: 30 } },
      { id: 'b', priority: 0, rect: { x: 10, y: 5, halfW: 60, halfH: 30 } },
    ];
    const plates: LabelRect[] = [];
    const first = solver.solve(base(), plates, [], 0);
    assert.isTrue(first.targets.size > 0, '兩框重疊要有位移');
    solver.solve(base(), plates, [], 0);
    assert.equals(1, solver.hits);
    const moved = base(); moved[1].rect.x = 500;
    assert.equals(0, solver.solve(moved, plates, [], 0).targets.size, '拉開後不再需要位移');
    const prio = base(); prio[1].priority = 1;
    const prioKeys = [...solver.solve(prio, plates, [], 0).targets.keys()];
    assert.equals('a', prioKeys[0], '受擊的 b 優先留原位，改推 a');
    const withPlate = solver.solve(base(), [{ x: 0, y: 0, halfW: 200, halfH: 100 }], [], 0);
    assert.isTrue(withPlate.targets.size > 0);
    const withBody = solver.solve(base(), plates, [generalBodyRect(0, -40, 230)], 172);
    assert.isTrue(withBody.bodyDy.size > 0 || withBody.bodyFaded.size > 0, '本體重疊要有避讓或半透明');
    solver.invalidate();
    const hitsBefore = solver.hits;
    solver.solve(base(), plates, [generalBodyRect(0, -40, 230)], 172);
    assert.equals(hitsBefore, solver.hits, 'invalidate 後下一次必算');
  });

  suite.test('TroopSpineConfigCache：與 troopSpineConfigWithFallback 結果相同；素材失敗數變動才重算', () => {
    const cache = new TroopSpineConfigCache();
    const failed = new Set<string>();
    const has = (p: string): boolean => failed.has(p);
    const troops = ['cavalry', 'infantry', 'archer', 'pikeman', 'shield'];
    for (const troop of troops) for (const enemy of [false, true]) {
      const got = cache.get(troop, enemy, null, failed.size, has);
      assert.equals(troopSpineConfigWithFallback(troop, enemy, null, has).path, got.path);
      assert.isTrue(cache.get(troop, enemy, undefined, failed.size, has) === got, '同輸入同物件（不重算）');
    }
    // 紅騎兵素材缺檔：快取要跟著退回藍版染紅
    const red = cache.get('cavalry', true, null, failed.size, has);
    failed.add(red.path);
    const after = cache.get('cavalry', true, null, failed.size, has);
    assert.isTrue(after.path !== red.path, '失敗數變動後要重選後備素材');
    assert.equals(troopSpineConfigWithFallback('cavalry', true, null, has).path, after.path);
    assert.equals(troopSpineConfigWithFallback('cavalry', false, null, has).path, cache.get('cavalry', false, null, failed.size, has).path);
  });

  return suite;
}
