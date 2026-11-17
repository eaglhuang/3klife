/**
 * ParticleSizeScale — 特效配方的 scale 要真的改到粒子大小（PROG-2-9374）
 *
 * 原本組合特效把 scale 寫進不存在的 startSizeX 欄位，所有戰場特效的大小設定都沒有作用。
 * 現在 scale 是相對 prefab 原始粒子大小的倍率；物件池重用的節點每次播放都從原始大小算起。
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ParticleSystem } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { applyParticleSizeScale } from '../assets/scripts/core/utils/ParticleUtils';

interface Axis { constant: number; constantMin: number; constantMax: number; multiplier: number }

function axis(constant: number, min = 0, max = 0, multiplier = 1): Axis {
    return { constant, constantMin: min, constantMax: max, multiplier };
}

function fakeParticle(x: Axis, y?: Axis): { startSizeX: Axis; startSizeY?: Axis; startSizeZ?: Axis } {
    return { startSizeX: x, startSizeY: y };
}

export function createParticleSizeScaleSuite(): TestSuite {
    const suite = new TestSuite('ParticleSizeScale（特效大小倍率，PROG-2-9374）');

    suite.test('倍率相對 prefab 原始大小：0.5 的粒子放大 2 倍變 1', () => {
        const ps = fakeParticle(axis(0.5));
        applyParticleSizeScale(ps as unknown as ParticleSystem, 2);
        assert.equals(1, ps.startSizeX.constant);
    });

    suite.test('兩常數與曲線模式也一起放大', () => {
        const ps = fakeParticle(axis(0, 0.2, 0.6, 1.5), axis(0.4));
        applyParticleSizeScale(ps as unknown as ParticleSystem, 2);
        assert.equals(0.4, ps.startSizeX.constantMin);
        assert.equals(1.2, ps.startSizeX.constantMax);
        assert.equals(3, ps.startSizeX.multiplier, '曲線模式靠 multiplier 放大');
        assert.equals(0.8, ps.startSizeY!.constant, 'Y 軸同步放大');
    });

    suite.test('物件池重用：連續套用不會越疊越大，套 1 倍會還原', () => {
        const ps = fakeParticle(axis(0.5));
        const target = ps as unknown as ParticleSystem;
        applyParticleSizeScale(target, 2);
        applyParticleSizeScale(target, 2);
        assert.equals(1, ps.startSizeX.constant, '第二次仍是原始大小的 2 倍');
        applyParticleSizeScale(target, 1);
        assert.equals(0.5, ps.startSizeX.constant, '1 倍還原成 prefab 原始大小');
    });

    suite.test('不合理的倍率（0、負數、非數字）當成 1 倍', () => {
        const ps = fakeParticle(axis(0.5));
        const target = ps as unknown as ParticleSystem;
        applyParticleSizeScale(target, 0);
        assert.equals(0.5, ps.startSizeX.constant);
        applyParticleSizeScale(target, -3);
        assert.equals(0.5, ps.startSizeX.constant);
        applyParticleSizeScale(target, Number.NaN);
        assert.equals(0.5, ps.startSizeX.constant);
    });

    suite.test('組合特效把配方的 scale 交給大小倍率，不再寫進不存在的欄位', () => {
        const source = fs.readFileSync(path.join(__dirname, '../assets/scripts/core/systems/EffectSystem.ts'), 'utf8');
        assert.isTrue(source.includes('sizeScale: entry.scale'), 'playComposite 要用 sizeScale');
        assert.isTrue(!source.includes('startSizeX: entry.scale'), '舊的無效寫法不得回來');
        assert.isTrue(source.includes('applyParticleSizeScale(ps, override?.sizeScale ?? 1)'), 'playBlock 每次播放都要套倍率（含 1 倍還原）');
    });

    suite.test('戰場特效不再使用實測看不清的三個舊積木', () => {
        const table = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/vfx-effects.json'), 'utf8')) as Record<string, unknown>;
        const root = (table.effects ?? table) as Record<string, { blocks?: { blockId: string }[] }>;
        const weak = ['p3d_common_light', 'p3d_star', 'p3d_level_up'];
        const keys = Object.keys(root).filter(key => key.startsWith('battle_'));
        assert.isTrue(keys.length >= 14, '戰場特效至少 14 個');
        for (const key of keys) {
            for (const block of root[key].blocks ?? []) {
                assert.isTrue(!weak.includes(block.blockId), `${key} 仍在用 ${block.blockId}`);
            }
        }
    });

    return suite;
}
