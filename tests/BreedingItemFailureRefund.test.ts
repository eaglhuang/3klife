/**
 * BreedingItemFailureRefund.test.ts — 用了安胎藥仍受孕失敗，返還 20% 慰問精力（doc_spec_0315 §4，PROG-2-2109）
 */
import { assert, TestSuite } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, gender: '男' | '女', extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 0, luk: 0, ...extra,
    } as unknown as GeneralConfig;
}

function makeRig(random: number, itemMod?: number, extraFather: Record<string, unknown> = {}) {
    const roster = new InMemoryRosterStore([makeGeneral('father', '男', extraFather), makeGeneral('mother', '女')]);
    let cleared = 0;
    const service = new BreedingService(roster, new BloodlineGraph(), {
        random: () => random,
        currentSeason: () => 3,
        itemConceptionMod: itemMod === undefined ? undefined : () => itemMod,
        onBreedPerformed: () => { cleared += 1; },
    });
    return { roster, service, cleared: () => cleared };
}

function vitalityOf(roster: InMemoryRosterStore, id: string): number | undefined {
    return roster.getAll().find((g) => g.id === id)?.vitality;
}

export function createBreedingItemFailureRefundSuite(): TestSuite {
    const suite = new TestSuite('BreedingItemFailureRefund (道具失敗慰問精力 PROG-2-2109)');

    suite.test('有道具加成卻失敗：父母各返還消耗的 20%，並寫回名冊', () => {
        const rig = makeRig(0.999, 1.5);
        const result = rig.service.breed('father', 'mother');
        assert.equals('failed', result.outcome);
        assert.equals(10, result.vitalityRefund?.father);
        assert.equals(20, result.vitalityRefund?.mother);
        assert.equals(60, vitalityOf(rig.roster, 'father'));
        assert.equals(20, vitalityOf(rig.roster, 'mother'));
        assert.equals(1, rig.cleared());
    });

    suite.test('沒有道具加成的失敗：不返還', () => {
        for (const mod of [undefined, 1]) {
            const rig = makeRig(0.999, mod);
            const result = rig.service.breed('father', 'mother');
            assert.equals('failed', result.outcome);
            assert.equals(undefined, result.vitalityRefund);
            assert.equals(50, vitalityOf(rig.roster, 'father'));
            assert.equals(0, vitalityOf(rig.roster, 'mother'));
        }
    });

    suite.test('有道具且受孕成功：不返還', () => {
        const rig = makeRig(0, 1.5);
        const result = rig.service.breed('father', 'mother');
        assert.equals('conceived', result.outcome);
        assert.equals(undefined, result.vitalityRefund);
        assert.equals(50, vitalityOf(rig.roster, 'father'));
    });

    suite.test('條件不足被擋下：不返還，也不動精力與道具標記', () => {
        const rig = makeRig(0.999, 1.5, { vitality: 10 });
        const result = rig.service.breed('father', 'mother');
        assert.equals('blocked', result.outcome);
        assert.equals(undefined, result.vitalityRefund);
        assert.equals(10, vitalityOf(rig.roster, 'father'));
        assert.equals(0, rig.cleared());
    });

    suite.test('結緣畫面提示返還的精力；沒返還時不提', async () => {
        const notice = async (itemMod?: number) => {
            const rig = makeRig(0.999, itemMod);
            const flow = new BondingSetupController({
                roster: rig.roster,
                breeding: rig.service,
                prepare: async () => rig.service.syncGraphFromRoster(),
                persist: async () => {},
                spendLifespan: () => ({ events: [] }),
            });
            await flow.confirm();
            return flow.getView().texts.bondNotice;
        };
        const refunded = await notice(1.5);
        assert.isTrue(refunded.includes('未能結緣受孕'));
        assert.isTrue(refunded.includes('father 10'));
        assert.isTrue(refunded.includes('mother 20'));
        assert.isFalse((await notice()).includes('返還'));
    });

    return suite;
}
