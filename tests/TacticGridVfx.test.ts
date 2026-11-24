/**
 * TacticGridVfx.test.ts — 火計／水計格子 VFX hook 接線的 headless 測試（PROG-2-9961）
 *
 * 鎖住：
 * - 火攻類（profile.tags 含 fire）對應 grid-fire；江潮列陣對應 grid-water-ripple；其他戰法不掛格子特效；
 * - 施放命中的每個格子送一次格子 hook（同一格只送一次）；未套用的施放不送；
 * - 格子 hook 用的 vfx-block id 都存在於 vfx-block-registry（不新增資源）。
 */
import { assert, TestSuite } from './TestRunner';
import {
    gridHookKindOfElement,
    TACTIC_GRID_VFX_BLOCKS,
    tacticElementOfSkill,
} from '../assets/scripts/battle/shared/TacticVfxHooks';
import { BattleSkillExecutor } from '../assets/scripts/battle/skills/BattleSkillExecutor';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../assets/scripts/battle/skills/BattleSkillResolver';
import type { BattleSkillRequest, SkillExecutionResult } from '../assets/scripts/shared/SkillRuntimeContract';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';

type GridCall = { kind: string; lane: number; depth: number };

function fakeExecutor(applied: boolean, unitUids: string[]): { exec: BattleSkillExecutor; calls: GridCall[]; request: (id: string) => BattleSkillRequest } {
    const calls: GridCall[] = [];
    const deltas = unitUids.map((unitUid) => ({ unitUid, deltaHp: -10 }));
    const resolver = {
        canResolve: () => true,
        execute: (req: BattleSkillRequest): SkillExecutionResult => ({
            requestId: `${req.ownerUid}:${req.battleSkillId}`,
            battleSkillId: req.battleSkillId,
            applied,
            deltas,
            battleLogLines: [],
        } as unknown as SkillExecutionResult),
    } as unknown as BattleSkillResolver;
    const cellOf: Record<string, { lane: number; depth: number }> = {};
    unitUids.forEach((uid, i) => { cellOf[uid] = { lane: i, depth: 2 }; });
    const context = {
        getUnit: (uid: string) => ({ lane: cellOf[uid].lane, depth: cellOf[uid].depth, isDead: () => false }),
        addUnitBurn: () => undefined,
        setTileHazard: () => undefined,
        emitGridVfx: (kind: string, cell: { lane: number; depth: number }) => { calls.push({ kind, lane: cell.lane, depth: cell.depth }); },
    } as unknown as BattleSkillExecutionContext;
    const exec = new BattleSkillExecutor([resolver]);
    return {
        exec,
        calls,
        request: (id: string) => ({ ownerUid: 'p1', battleSkillId: id } as unknown as BattleSkillRequest),
    };
}

export function createTacticGridVfxSuite(): TestSuite {
    const suite = new TestSuite('TacticGridVfx (火計／水計格子 VFX hook 接線 PROG-2-9961)');

    suite.test('火攻類對應 grid-fire，江潮列陣對應 grid-water-ripple，其他不掛', () => {
        assert.equals('fire', tacticElementOfSkill('zhou-yu-inferno', ['fire']));
        assert.equals('fire', tacticElementOfSkill('tally-fire-chain', ['fire']));
        assert.equals('water', tacticElementOfSkill('sun-quan-tide', []));
        assert.equals(null, tacticElementOfSkill('zhao-yun-pierce', []));
        assert.equals('grid-fire', gridHookKindOfElement('fire'));
        assert.equals('grid-water-ripple', gridHookKindOfElement('water'));
        assert.equals(null, gridHookKindOfElement(null));
    });

    suite.test('火計施放命中兩個格子 → 送兩次 grid-fire（同格去重）', () => {
        const { exec, calls, request } = fakeExecutor(true, ['u1', 'u2', 'u1']);
        const ctxCalls = calls;
        exec.execute(request('zhou-yu-inferno'), {
            getUnit: (uid: string) => ({ lane: uid === 'u1' ? 0 : 1, depth: 2, isDead: () => false }),
            addUnitBurn: () => undefined,
            setTileHazard: () => undefined,
            emitGridVfx: (kind: string, cell: { lane: number; depth: number }) => { ctxCalls.push({ kind, lane: cell.lane, depth: cell.depth }); },
        } as unknown as BattleSkillExecutionContext);
        assert.equals(2, calls.length);
        assert.equals('grid-fire', calls[0].kind);
        assert.equals('grid-fire', calls[1].kind);
    });

    suite.test('江潮列陣施放命中 → 送 grid-water-ripple；一般戰法不送', () => {
        const water = fakeExecutor(true, ['u1', 'u2']);
        water.exec.execute(water.request('sun-quan-tide'), {
            getUnit: (uid: string) => ({ lane: uid === 'u1' ? 0 : 1, depth: 1, isDead: () => false }),
            emitGridVfx: (kind: string, cell: { lane: number; depth: number }) => { water.calls.push({ kind, lane: cell.lane, depth: cell.depth }); },
        } as unknown as BattleSkillExecutionContext);
        assert.equals(2, water.calls.length);
        assert.equals('grid-water-ripple', water.calls[0].kind);

        const plain = fakeExecutor(true, ['u1']);
        plain.exec.execute(plain.request('zhao-yun-pierce'), {
            getUnit: () => ({ lane: 0, depth: 0, isDead: () => false }),
            emitGridVfx: (kind: string, cell: { lane: number; depth: number }) => { plain.calls.push({ kind, lane: cell.lane, depth: cell.depth }); },
        } as unknown as BattleSkillExecutionContext);
        assert.equals(0, plain.calls.length);
    });

    suite.test('未套用的施放不送格子 hook', () => {
        const { exec, calls, request } = fakeExecutor(false, ['u1']);
        exec.execute(request('sun-quan-tide'), {
            getUnit: () => ({ lane: 0, depth: 0, isDead: () => false }),
            emitGridVfx: (kind: string, cell: { lane: number; depth: number }) => { calls.push({ kind, lane: cell.lane, depth: cell.depth }); },
        } as unknown as BattleSkillExecutionContext);
        assert.equals(0, calls.length);
    });

    suite.test('格子 hook 的 vfx-block id 都在 vfx-block-registry 內（不新增資源）', () => {
        const ids = new Set(VFX_BLOCK_REGISTRY.map((block) => block.id));
        for (const kind of Object.keys(TACTIC_GRID_VFX_BLOCKS) as (keyof typeof TACTIC_GRID_VFX_BLOCKS)[]) {
            assert.isTrue(TACTIC_GRID_VFX_BLOCKS[kind].length > 0, `${kind} 沒有 block`);
            for (const id of TACTIC_GRID_VFX_BLOCKS[kind]) {
                assert.isTrue(ids.has(id), `${kind} 的 ${id} 不在 registry`);
            }
        }
    });

    suite.test('格子 hook 的 vfx-block 都有 prefabPath（只有 texPath 的積木不會進 PoolSystem，playBlock 會回 null）', () => {
        const byId = new Map(VFX_BLOCK_REGISTRY.map((block) => [block.id, block] as const));
        for (const kind of Object.keys(TACTIC_GRID_VFX_BLOCKS) as (keyof typeof TACTIC_GRID_VFX_BLOCKS)[]) {
            for (const id of TACTIC_GRID_VFX_BLOCKS[kind]) {
                const block = byId.get(id);
                assert.isTrue(!!block && !!block.prefabPath, `${kind} 的 ${id} 沒有 prefabPath，格子特效不會播出`);
            }
        }
    });

    return suite;
}
