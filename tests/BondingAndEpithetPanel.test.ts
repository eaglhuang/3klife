import { TestSuite } from './TestRunner';
import { BondingSuccessService, BondingProposalState } from '../assets/scripts/core/systems/BondingSuccessService';
import { BloodlineEpithetService } from '../assets/scripts/core/systems/BloodlineEpithetService';

export function createBondingAndEpithetPanelSuite(): TestSuite {
    const suite = new TestSuite('BondingAndEpithetPanel');

    suite.test('結緣公式分項與小名 8/12/15 歲三段揭曉整合資料流正確', () => {
        let state: BondingProposalState = {
            favorF: 0,
            rejectCount: 0,
            cooldownSeasons: 0,
            matchmakerFallbackUsed: false,
            hasPartner: false,
        };

        const res1 = BondingSuccessService.attemptBondingProposal(state, {
            year: 1,
            season: 1,
            compatibilityK: 1.0,
            rollPercent: 99,
        });
        state = res1.nextState;

        const sincerity = BondingSuccessService.getSincerityBonus(state.rejectCount);
        const bd = BondingSuccessService.calculateBondingProbability({
            compatibilityK: 1.0,
            favorF: state.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: 0,
        });
        if (bd.finalRate !== 40) {
            throw new Error(`被拒一次後總成功率應為 40%，實際 ${bd.finalRate}%`);
        }

        const ep = BloodlineEpithetService.drawBirthEpithet(0);
        const s8 = BloodlineEpithetService.getRevealStateAtAge(8, ep);
        const s12 = BloodlineEpithetService.getRevealStateAtAge(12, ep);
        const s15 = BloodlineEpithetService.getRevealStateAtAge(15, ep);
        if (s8.stage !== 'omen_8' || s12.stage !== 'trait_12' || s15.stage !== 'revealed_15') {
            throw new Error('小名三段揭曉階段異常');
        }
    });

    return suite;
}
