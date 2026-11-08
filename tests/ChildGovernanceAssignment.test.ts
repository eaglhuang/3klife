/**
 * 幼兒內政指派接線（SPI-13 Q51；PROG-2-2090）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { domesticAssignmentFor } from '../assets/scripts/core/systems/SpiritMcqRules';

function gen(id: string, age: number | undefined): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age, str: 80, int: 60, lea: 70, pol: 50, cha: 40 } as unknown as GeneralConfig;
}

function build(roster: GeneralConfig[]): GameSession {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore(roster));
    return session;
}

export function createChildGovernanceAssignmentSuite(): TestSuite {
    const suite = new TestSuite('ChildGovernanceAssignment (幼兒內政指派 SPI-13 PROG-2-2090)');

    suite.test('幼兒只能指派到低效內政，成年與缺年齡的舊資料照常', () => {
        assert.equals(domesticAssignmentFor(undefined, 'diplomacy').ok, true);
        const session = build([gen('kid', 10), gen('adult', 30)]);
        const rejected = session.assignGovernor('diplomacy', 'kid');
        assert.equals(rejected.ok, false);
        assert.equals(rejected.reason, 'child-only-low-efficiency');
        assert.equals(session.governanceAssignments.length, 0);
        assert.equals(session.assignGovernor('farming', 'kid').ok, true);
        assert.equals(session.assignGovernor('diplomacy', 'adult').ok, true);
    });

    suite.test('幼兒內政屬性打折，成年不打折', () => {
        const session = build([gen('kid', 10), gen('adult', 30)]);
        session.assignGovernor('farming', 'kid');
        session.assignGovernor('arms', 'adult');
        assert.equals(session.domesticGovernorStats('farming')?.pol, 25);
        assert.equals(session.domesticGovernorStats('arms')?.pol, 50);
    });

    suite.test('自動治理不派幼兒', () => {
        assert.equals(build([gen('kid', 10)]).setAutoGovernance(true), 0);
        assert.isTrue(build([gen('adult', 30)]).setAutoGovernance(true) > 0);
    });

    return suite;
}
