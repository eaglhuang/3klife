/**
 * BiologicalChildFamilyRegistry — PROG-2-9973 親生子嗣自動寫入家族登記表與三來源覆蓋測試
 *
 * 驗證：
 * 1. 結緣誕生親生子嗣 (recordBreedingBirth) 自動寫入 FamilyService (kind='biological')。
 * 2. 家族登記表涵蓋三種來源：親生 (biological)、義子 (adopted)、家臣子嗣 (retainer_child)。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { FamilyService } from '../assets/scripts/shared/family/FamilyService';

export function createBiologicalChildFamilyRegistrySuite(): TestSuite {
    const suite = new TestSuite('BiologicalChildFamilyRegistry (親生子嗣登記與三來源 PROG-2-9973)');

    suite.test('recordBreedingBirth 自動將親生子嗣寫入 FamilyService 家族登記表', () => {
        const session = new GameSession();
        session.startNewGame(123);
        session.recordBreedingBirth({
            child: {
                uid: 'child_bio_001',
                name: '小趙雲',
                gender: 'male',
                fatherUid: 'zhao-yun',
                motherUid: 'diao-chan',
            } as any,
            session: {
                Father_UID: 'zhao-yun',
                Mother_UID: 'diao-chan',
            } as any,
        } as any);

        const members = session.familyMembers;
        const bio = members.find(m => m.personId === 'child_bio_001');
        assert.isTrue(!!bio);
        assert.equals(bio!.kind, 'biological');
        assert.equals(bio!.parentIds.join(','), 'zhao-yun,diao-chan');
    });

    suite.test('FamilyService 支援三種來源：親生 (biological)、義子 (adopted)、家臣子嗣 (retainer_child)', () => {
        const family = new FamilyService();
        family.recordBiologicalChild('bio-1', ['f1', 'm1'], 2);
        family.seedStarterAdoptee('adopt-1', 1);
        family.addFamilyMember({
            personId: 'retainer-1',
            kind: 'retainer_child',
            parentIds: ['retainer-parent'],
            branchId: null,
            joinedAt: 3,
        });

        const all = family.snapshot().members;
        assert.equals(all.find(m => m.personId === 'bio-1')?.kind, 'biological');
        assert.equals(all.find(m => m.personId === 'adopt-1')?.kind, 'adopted');
        assert.equals(all.find(m => m.personId === 'retainer-1')?.kind, 'retainer_child');
    });

    return suite;
}
