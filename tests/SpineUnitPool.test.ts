/**
 * SpineUnitPool — 戰場 Spine 小兵節點物件池（PROG-2-9706）
 * 重點：被打過的單位回收後，下次取出必須是乾淨的（閃白歸零、顏色白、動作與造型還原）。
 */
import { assert, TestSuite } from './TestRunner';
import { SPINE_UNIT_POOL_MAX_PER_PATH, SpineUnitOverlay } from '../assets/scripts/battle/views/SpineGeneralOverlay';
import { soldierSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cc: Any = require('cc');

class FakeNode {
  public isValid = true; public active = true; public layer = 0; public parent: FakeNode | null = null;
  public children: FakeNode[] = []; public index = 0; public scale = { x: 1, y: 1 }; public position = { x: 0, y: 0 };
  private readonly components = new Map<unknown, unknown>();
  constructor(public name: string) {}
  addChild(node: FakeNode): void { node.parent = this; this.children.push(node); }
  addComponent(Type: new () => unknown): unknown { const c = new Type(); this.components.set(Type, c); return c; }
  getComponent(Type: unknown): Any { return this.components.get(Type) ?? null; }
  setPosition(x: number, y: number): void { this.position = { x, y }; }
  setScale(x: number, y: number): void { this.scale = { x, y }; }
  setSiblingIndex(i: number): void { this.index = i; }
  destroy(): void { this.isValid = false; }
}
class FakeColor {
  static WHITE = new FakeColor(255, 255, 255, 255);
  constructor(public r = 255, public g = 255, public b = 255, public a = 255) {}
  set(r: number, g: number, b: number, a: number): void { this.r = r; this.g = g; this.b = b; this.a = a; }
}
class FakeVec4 {
  constructor(public x = 0, public y = 0, public z = 0, public w = 0) {}
  set(x: number, y: number, z: number, w: number): void { this.x = x; this.y = y; this.z = z; this.w = w; }
}
class FakeInstance { public flash = -1; setProperty(_n: string, v: FakeVec4): void { this.flash = v.x; } }
class FakeMaterial { initialize(): void { /* 測試替身 */ } }
class FakeEffectAsset {}
class FakeSkeleton {
  public timeScale = 1; public color: FakeColor = new FakeColor(); public skin = 'default'; public skeletonData: unknown = null;
  public customMaterial: unknown = null; public premultipliedAlpha = true; public tracksCleared = 0; public setupPoseCount = 0;
  public _materialCache: Record<string, FakeInstance> = { a: new FakeInstance(), b: new FakeInstance() };
  setAnimation(): { trackTime: number; delay: number } { return { trackTime: 0, delay: 0 }; }
  setSkin(name: string): void { this.skin = name; }
  clearTracks(): void { this.tracksCleared += 1; }
  setToSetupPose(): void { this.setupPoseCount += 1; }
  getCurrent(): null { return null; }
}
class FakeSkeletonData {}
const skeletonData = { getRuntimeData: () => ({ findAnimation: (name: string) => ({ name }), findSkin: (name: string) => ({ name }) }) };

/** 暫時把全域 cc 替身換成可驗疊層的版本，跑完還原，不影響其他 suite。 */
function withStub<T>(fn: () => T): T {
  const keys = ['Node', 'Color', 'Vec4', 'Material', 'EffectAsset', 'UITransform', 'sp', 'resources'];
  const saved: Record<string, unknown> = {};
  for (const k of keys) saved[k] = cc[k];
  cc.Node = FakeNode; cc.Color = FakeColor; cc.Vec4 = FakeVec4; cc.Material = FakeMaterial; cc.EffectAsset = FakeEffectAsset;
  cc.UITransform = class {}; cc.sp = { Skeleton: FakeSkeleton, SkeletonData: FakeSkeletonData };
  cc.resources = {
    load(path: string, _type: unknown, cb: (e: unknown, d: unknown) => void): void {
      if (path === 'effects/spine-hit-flash') cb(null, {});
      else if (path.startsWith('data/')) cb(null, null);
      else cb(null, skeletonData);
    },
  };
  try { return fn(); } finally { for (const k of keys) cc[k] = saved[k]; }
}

const flashesOf = (skel: FakeSkeleton): number[] => Object.values(skel._materialCache).map(i => i.flash);

export function createSpineUnitPoolSuite(): TestSuite {
  const suite = new TestSuite('SpineUnitPool (戰場 Spine 節點物件池 PROG-2-9706)');
  const squadCfg = soldierSpineConfig(false);
  const cfg = { ...squadCfg, squad: [] }; // 單人（無隊員）設定，節點數 = 單位數

  suite.test('被打到閃白的單位回收後，同 path 新單位重用同一節點且乾淨', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    assert.isTrue(overlay.sync('a', cfg, 0, 0, 1, false, 0, true, 1));
    overlay.update(0);
    const node = root.children.find(n => n.name === 'SpineUnit_a') as FakeNode;
    const skel = node.getComponent(cc.sp.Skeleton) as FakeSkeleton;
    assert.isTrue(skel.customMaterial instanceof FakeMaterial, '閃白材質已套上');
    // 打到閃白：強度 > 0、顏色與造型被弄髒
    assert.isTrue(overlay.hit('a', 6, true, 10));
    overlay.update(1 / 60);
    const painted = flashesOf(skel);
    assert.isTrue(painted.every(f => f > 0), '受擊閃白強度應大於 0，實際 ' + painted.join(','));
    skel.color = new FakeColor(255, 120, 110, 255); skel.timeScale = 0; skel.skin = 'hand_mirror';
    node.setScale(-0.5, 0.5);
    overlay.remove('a');
    assert.isFalse(overlay.exists('a'));
    assert.equals(1, overlay.pooledCount(cfg.path), '回收進池');
    assert.isFalse(node.active, '池內節點隱藏');
    assert.isTrue(node.isValid, '沒有被銷毀');
    // 新單位取同一節點
    assert.isTrue(overlay.sync('b', cfg, 0, 0, 1, false, 0, true, 1));
    assert.equals(0, overlay.pooledCount(cfg.path));
    const reused = root.children.find(n => n.name === 'SpineUnit_b');
    assert.isTrue(reused === node, '同 path 重用同一節點');
    assert.equals(1, root.children.length, '沒有多建節點');
    assert.isTrue(flashesOf(skel).every(f => f === 0), 'u_flash 應歸零，實際 ' + flashesOf(skel).join(','));
    assert.isTrue(skel.color.r === 255 && skel.color.g === 255 && skel.color.b === 255, '顏色為白');
    assert.equals(1, skel.timeScale, 'timeScale 已還原');
    assert.equals('default', skel.skin);
    assert.isTrue(skel.tracksCleared >= 1 && skel.setupPoseCount >= 1, '動作清空並回到初始姿勢');
    assert.isTrue(node.active, '取出後啟用');
    overlay.update(0);
    assert.isTrue(flashesOf(skel).every(f => f === 0), '再畫一格仍不殘留閃白');
    overlay.clear();
  }));

  suite.test('小隊隊員一起回收與重用', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('s1', squadCfg, 0, 0, 1, false, 0, true, 3); overlay.update(0);
    const nodes = [...root.children];
    assert.equals(3, nodes.length);
    overlay.hit('s1', 4, true, 0); overlay.update(1 / 60);
    overlay.remove('s1');
    assert.equals(3, overlay.pooledCount(squadCfg.path));
    overlay.sync('s2', squadCfg, 0, 0, 1, false, 0, true, 3); overlay.update(0);
    assert.equals(3, root.children.length, '隊員節點全數重用');
    assert.isTrue(nodes.every(n => root.children.includes(n)));
    for (const n of nodes) assert.isTrue(flashesOf(n.getComponent(cc.sp.Skeleton)).every(f => f === 0));
    overlay.clear();
  }));

  suite.test('池上限生效：超過的節點直接銷毀', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    const total = SPINE_UNIT_POOL_MAX_PER_PATH + 6;
    for (let i = 0; i < total; i += 1) overlay.sync('u' + i, cfg, 0, 0, 1, false, 0, true, 1);
    const all = [...root.children];
    assert.equals(total, all.length);
    for (let i = 0; i < total; i += 1) overlay.remove('u' + i);
    assert.equals(SPINE_UNIT_POOL_MAX_PER_PATH, overlay.pooledCount(cfg.path));
    assert.equals(6, all.filter(n => !n.isValid).length, '超出上限的被銷毀');
    overlay.clear();
  }));

  suite.test('clear 後池清空、池內節點全部銷毀；失效的池內節點被丟棄', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('a', cfg, 0, 0, 1, false, 0, true, 1);
    overlay.sync('b', cfg, 0, 0, 1, false, 0, true, 1);
    const all = [...root.children];
    overlay.remove('a');
    assert.equals(1, overlay.pooledCount());
    overlay.clear();
    assert.equals(0, overlay.pooledCount());
    assert.isTrue(all.every(n => !n.isValid), 'clear 後沒有存活節點');
    // 場景切換：池內節點失效後不可再被取出
    const overlay2 = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay2.sync('c', cfg, 0, 0, 1, false, 0, true, 1);
    const stale = root.children.find(n => n.name === 'SpineUnit_c') as FakeNode;
    overlay2.remove('c');
    stale.isValid = false; // 模擬父節點被銷毀連帶失效
    overlay2.sync('d', cfg, 0, 0, 1, false, 0, true, 1);
    const fresh = root.children.find(n => n.name === 'SpineUnit_d') as FakeNode;
    assert.isTrue(fresh !== stale && fresh.isValid, '失效節點被丟棄，改新建');
    overlay2.clear();
  }));

  return suite;
}
