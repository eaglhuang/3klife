/**
 * ChildUltimateWiring.test.ts — 子嗣奧義覺醒接上培育回合（ULT-15 接線，PROG-2-1054）真實流程測試
 *
 * 鎖住：訓練回合會依父方奧義與子嗣綠色因子擲覺醒，成功後名冊上的子嗣多出一筆繼承奧義（level 1、Source_Parent_UID）；
 * 沒有綠色因子對應、或只做休息時不覺醒；沒提供 childUltimate 選項時完全不擲骰。
 */
import { assert, TestSuite } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { NURTURE_TOTAL_ROUNDS, type NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { ChildUltimateDefinition } from '../assets/scripts/core/systems/ChildUltimateAwaken';

const DEFINITIONS: ChildUltimateDefinition[] = [{ ultimateId: 'ult-a', inheritanceGeneId: 'gene_honor' }];

function readyChild(id: string, extra: Record<string, unknown> = {}): UnveilingGeneral {
    const child = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [], ...extra,
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(child).general, 'accept');
}

function father(): Record<string, unknown> {
    return { id: 'dad', name: 'dad', faction: 'shu', gender: '男', age: 40, status: 'Alive', ultimateSlots: [{ ultimateId: 'ult-a' }] };
}

function greenChild(): UnveilingGeneral {
    return readyChild('kid', {
        fatherId: 'dad',
        genes: [{ id: 'gene_honor', type: 'green', level: 5, isLocked: false, discoveryLevel: 1 }],
    });
}

function runTraining(roster: unknown[], options: { childUltimate?: boolean; rest?: boolean }): Record<string, unknown> {
    const store = new InMemoryRosterStore(roster as never);
    const svc = new NurtureService(store as never, {
        random: () => 0,
        currentSeason: () => 0,
        admissionsPerSeason: 5,
        childUltimate: options.childUltimate ? { definitions: () => DEFINITIONS } : undefined,
    });
    svc.start('kid', []);
    for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) svc.train('kid', options.rest ? 'rest' : 'str');
    return store.getAll().find((g) => g.id === 'kid') as unknown as Record<string, unknown>;
}

export function createChildUltimateWiringSuite(): TestSuite {
    const suite = new TestSuite('ChildUltimateWiring (子嗣奧義覺醒接線 ULT-15 PROG-2-1054)');

    suite.test('訓練回合覺醒後，子嗣名冊多一筆繼承奧義並記錄來源父方', () => {
        const kid = runTraining([father(), greenChild()], { childUltimate: true });
        const inherited = kid.inheritedUltimates as Array<Record<string, unknown>>;
        assert.lengthEquals(1, inherited);
        assert.equals('ult-a', inherited[0].ultimateId);
        assert.equals(1, inherited[0].level);
        assert.isTrue(inherited[0].isInherited as boolean);
        assert.equals('dad', inherited[0].sourceParentUid);
    });

    suite.test('子嗣沒有對應綠色因子時不覺醒', () => {
        const noGreen = readyChild('kid', { fatherId: 'dad', genes: [] });
        const kid = runTraining([father(), noGreen], { childUltimate: true });
        assert.isTrue(kid.inheritedUltimates === undefined);
    });

    suite.test('只做休息時不擲覺醒', () => {
        const kid = runTraining([father(), greenChild()], { childUltimate: true, rest: true });
        assert.isTrue(kid.inheritedUltimates === undefined);
    });

    suite.test('沒提供 childUltimate 選項時完全不擲骰，名冊不變', () => {
        const kid = runTraining([father(), greenChild()], { childUltimate: false });
        assert.isTrue(kid.inheritedUltimates === undefined);
    });

    return suite;
}
