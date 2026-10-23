/**
 * VitalityScriptHooks.test.ts — 精力劇本接到培育與結緣的提示點（PROG-2-0732）headless 測試
 *
 * 鎖住：結緣選中待產母方時回傳待產劇本句；未待產或沒選母方時回傳 null。
 * 補元散的劇本句見 VitalityPillController.test.ts。
 */
import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';

/** 只覆寫母方清單，讓測試不必組整個 GameSession */
class MotherListProbe extends BondingSetupController {
    constructor(private readonly motherList: BreedingGeneral[]) {
        super({ roster: { getAll: () => [] } } as unknown as ConstructorParameters<typeof BondingSetupController>[0]);
    }
    override mothers(): BreedingGeneral[] {
        return this.motherList;
    }
}

function mother(id: string, pregnancySeasonsLeft: number): BreedingGeneral {
    return { id, name: `武將${id}`, gender: '女', pregnancySeasonsLeft } as unknown as BreedingGeneral;
}

export function createVitalityScriptHooksSuite(): TestSuite {
    const suite = new TestSuite('VitalityScriptHooks (精力劇本接到結緣提示 PROG-2-0732)');

    suite.test('選中待產的母方時回傳待產劇本句', () => {
        const probe = new MotherListProbe([mother('m1', 2)]);
        probe.cycleMother(1);
        assert.equals('武將m1 正在待產中，精力回復暫停…', probe.pregnantMotherHint());
    });

    suite.test('母方沒有待產或沒選母方時回傳 null', () => {
        const idle = new MotherListProbe([mother('m2', 0)]);
        idle.cycleMother(1);
        assert.equals(null, idle.pregnantMotherHint());

        const none = new MotherListProbe([]);
        assert.equals(null, none.pregnantMotherHint());
    });

    return suite;
}
