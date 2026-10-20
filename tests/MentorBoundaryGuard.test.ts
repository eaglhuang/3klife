/**
 * MentorBoundaryGuard.test.ts — 教學邊界的執行期檢查（MENT-11，PROG-2-0870）
 *
 * 檢查：比對函式本身（相同、未提供、改動、新增因子）；培育一回合後，子嗣因子沒有被教官加成回寫，
 * 所以 NurtureTrainResult 不會帶 boundaryViolations。
 *
 * Unity 對照：像 OnValidate 裡的一道 Assert，正常路徑不出聲，只有違規時才回報。
 */
import { TestSuite, assert } from './TestRunner';
import { mentorBoundaryViolations } from '../assets/scripts/core/systems/MentorBoundary';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function childWithGenes(id: string): UnveilingGeneral {
    const general = unveilGeneral({
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'],
        genes: [{ id: 'F1', type: 'Red', level: 1 }],
    } as unknown as UnveilingGeneral).general;
    return general;
}

export function createMentorBoundaryGuardSuite(): TestSuite {
    const suite = new TestSuite('MentorBoundaryGuard (教學邊界執行期檢查)');

    suite.test('比對：相同因子與兩邊都未提供都不算違規', () => {
        assert.equals(0, mentorBoundaryViolations([{ id: 'F1' }], [{ id: 'F1' }]).length);
        assert.equals(0, mentorBoundaryViolations(undefined, undefined).length);
    });

    suite.test('比對：因子被改動或新增時回報 genes', () => {
        assert.equals('genes', mentorBoundaryViolations([{ id: 'F1' }], [{ id: 'F2' }])[0] ?? '');
        assert.equals('genes', mentorBoundaryViolations([{ id: 'F1' }], [{ id: 'F1' }, { id: 'F2' }])[0] ?? '');
    });

    suite.test('培育一回合：教官加成沒有回寫因子，不帶 boundaryViolations', () => {
        const roster = new InMemoryRosterStore([childWithGenes('alpha') as unknown as GeneralConfig]);
        const nurture = new NurtureService(roster, { random: seeded(7), currentSeason: () => 3, currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true });
        const unveiling = new UnveilingService(roster, seeded(3));
        unveiling.choose('alpha', 'accept');
        nurture.startWithCards('alpha', []);
        const result = nurture.train('alpha', 'str');
        assert.equals(undefined, result.boundaryViolations);
    });

    return suite;
}
