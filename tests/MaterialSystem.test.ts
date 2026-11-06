/**
 * MaterialSystem.test.ts — 材質系統與 setMaterialSafe（keep.md §7，PROG-2-1883）
 *
 * Unity 對照：EditMode 測試 per-renderer Material 實例與 MaterialPropertyBlock 參數。
 */
import { Color, Material, type MeshRenderer } from 'cc';
import { DEFAULT_OUTFIT, MaterialSystem, type OutfitConfig } from '../assets/scripts/core/systems/MaterialSystem';
import { setMaterialSafe } from '../assets/scripts/core/utils/MaterialUtils';
import { TestSuite, assert } from './TestRunner';

type FakeMaterial = { props: Map<string, unknown>; refs: number };

/** 在測試期間替 cc.Material 替身補上 copy／addRef／decRef／setProperty／getProperty */
function withFakeMaterial(run: () => void): void {
    const proto = Material.prototype as unknown as Record<string, unknown>;
    const saved = ['copy', 'addRef', 'decRef', 'setProperty', 'getProperty'].map(k => [k, proto[k]] as const);
    proto.copy = function (this: FakeMaterial, src: FakeMaterial) { this.props = new Map(src.props); this.refs = 0; };
    proto.addRef = function (this: FakeMaterial) { this.refs = (this.refs ?? 0) + 1; };
    proto.decRef = function (this: FakeMaterial) { this.refs -= 1; };
    proto.setProperty = function (this: FakeMaterial, k: string, v: unknown) { this.props.set(k, v); };
    proto.getProperty = function (this: FakeMaterial, k: string) { return this.props.get(k) ?? null; };
    try { run(); } finally { for (const [k, v] of saved) proto[k] = v; }
}

function makeRenderer(): { mr: MeshRenderer; attrs: Map<string, number[]>; set: unknown[] } {
    const attrs = new Map<string, number[]>();
    const set: unknown[] = [];
    const mr = {
        setMaterial: (mat: unknown, index: number) => { set[index] = mat; },
        setInstancedAttribute: (name: string, value: number[]) => { attrs.set(name, value); },
    };
    return { mr: mr as unknown as MeshRenderer, attrs, set };
}

function makeSystem(): MaterialSystem {
    const sys = new MaterialSystem();
    sys.registerShader('unit-base', 'effect:unit-base', 'critical');
    const base = new Material() as unknown as FakeMaterial;
    base.props = new Map([['u_primaryColor', null]]);
    (sys as unknown as { registry: Map<string, { base: unknown }> }).registry.get('unit-base')!.base = base;
    return sys;
}

export function createMaterialSystemSuite(): TestSuite {
    const suite = new TestSuite('MaterialSystem (材質系統 PROG-2-1883)');

    suite.test('setMaterialSafe：優先呼叫 setMaterial(material, index)', () => {
        const r = makeRenderer();
        const mat = {} as Material;
        setMaterialSafe(r.mr, mat, 1);
        assert.equals(mat, r.set[1]);
    });

    suite.test('setMaterialSafe：沒有 setMaterial 時改寫 materials 陣列副本', () => {
        const original = ['a', 'b'];
        const mr = { materials: original } as unknown as MeshRenderer;
        const mat = {} as Material;
        setMaterialSafe(mr, mat, 1);
        const after = (mr as unknown as { materials: unknown[] }).materials;
        assert.equals(mat, after[1]);
        assert.equals('b', original[1]);
    });

    suite.test('bindUnit：每個單位一份實例，重複綁定回傳同一份並套到 renderer', () => withFakeMaterial(() => {
        const sys = makeSystem();
        const r = makeRenderer();
        const inst = sys.bindUnit('u1', 'unit-base', r.mr);
        assert.equals(true, inst !== null);
        assert.equals(inst, r.set[0]);
        assert.equals(inst, sys.bindUnit('u1', 'unit-base', r.mr));
        assert.equals(true, inst !== sys.bindUnit('u2', 'unit-base', makeRenderer().mr));
    }));

    suite.test('bindUnit：Shader 未載入時回傳 null，不留下空的單位紀錄', () => {
        const sys = new MaterialSystem();
        assert.equals(null, sys.bindUnit('u1', 'missing', makeRenderer().mr));
        const instances = (sys as unknown as { unitInstances: Map<string, unknown> }).unitInstances;
        assert.equals(false, instances.has('u1'));
    });

    suite.test('applyOutfit → captureOutfit 讀回相同設定', () => withFakeMaterial(() => {
        const sys = makeSystem();
        sys.bindUnit('u1', 'unit-base', makeRenderer().mr);
        const outfit: OutfitConfig = {
            primaryColor: [1, 0, 0, 1], secondaryColor: [0, 1, 0, 1],
            gradientTop: [0, 0, 1, 1], gradientBottom: [0.5, 0.5, 0.5, 1],
            gradientRange: [-1, 3], emissionColor: [1, 1, 0, 1], emissionIntensity: 2,
        };
        sys.applyOutfit('u1', 'unit-base', outfit);
        assert.equals(JSON.stringify(outfit), JSON.stringify(sys.captureOutfit('u1', 'unit-base')));
    }));

    suite.test('captureOutfit：未綁定時回傳預設值，修改回傳值不污染 DEFAULT_OUTFIT', () => {
        const sys = new MaterialSystem();
        const snap = sys.captureOutfit('none', 'unit-base');
        assert.equals(JSON.stringify(DEFAULT_OUTFIT), JSON.stringify(snap));
        snap.primaryColor[0] = 0;
        snap.gradientRange[1] = 9;
        assert.equals(1, DEFAULT_OUTFIT.primaryColor[0]);
        assert.equals(2, DEFAULT_OUTFIT.gradientRange[1]);
    });

    suite.test('受擊邊緣光與溶解：寫入 instanced attribute，溶解值夾在 0～1', () => withFakeMaterial(() => {
        const sys = makeSystem();
        const r = makeRenderer();
        sys.bindUnit('u1', 'unit-base', r.mr);
        sys.setRim('u1', 'unit-base', new Color(255, 0, 0, 255));
        assert.equals('1,0,0,1', r.attrs.get('a_rimColor')!.join(','));
        sys.clearRim('u1', 'unit-base');
        assert.equals('0,0,0,0', r.attrs.get('a_rimColor')!.join(','));
        sys.setDissolve('u1', 'unit-base', 1.5);
        assert.equals(1, r.attrs.get('a_dissolve')![0]);
        sys.setDissolve('u1', 'unit-base', -0.2);
        assert.equals(0, r.attrs.get('a_dissolve')![0]);
    }));

    suite.test('releaseUnit：釋放實例參照，之後的參數設定不再作用', () => withFakeMaterial(() => {
        const sys = makeSystem();
        const r = makeRenderer();
        const inst = sys.bindUnit('u1', 'unit-base', r.mr) as unknown as FakeMaterial;
        assert.equals(1, inst.refs);
        sys.releaseUnit('u1');
        assert.equals(0, inst.refs);
        sys.setDissolve('u1', 'unit-base', 0.5);
        assert.equals(false, r.attrs.has('a_dissolve'));
    }));

    return suite;
}
