import { TestSuite } from './TestRunner';
import { BondingSuccessService, BondingProposalState } from '../assets/scripts/core/systems/BondingSuccessService';

export function createBondingSuccessServiceSuite(): TestSuite {
    const suite = new TestSuite('BondingSuccessService');

    suite.test('真實提親流程：K=1.0, F=0 起算，連敗實際扣好感 -12 並累積誠意，依序得到 34% / 40% / 46%', () => {
        let state: BondingProposalState = {
            favorF: 0,
            rejectCount: 0,
            cooldownSeasons: 0,
            matchmakerFallbackUsed: false,
            hasPartner: false,
        };

        const r1 = BondingSuccessService.attemptBondingProposal(state, {
            year: 1,
            season: 1,
            compatibilityK: 1.0,
            rollPercent: 99,
        });
        state = r1.nextState;

        const r2 = BondingSuccessService.attemptBondingProposal(state, {
            year: 1,
            season: 2,
            compatibilityK: 1.0,
            rollPercent: 99,
        });
        state = r2.nextState;

        const r3 = BondingSuccessService.attemptBondingProposal(state, {
            year: 1,
            season: 4,
            compatibilityK: 1.0,
            rollPercent: 99,
        });

        if (r1.rateUsed !== 34 || r2.rateUsed !== 40 || r3.rateUsed !== 46) {
            throw new Error(`預期依序為 34/40/46，實際為 ${r1.rateUsed}/${r2.rateUsed}/${r3.rateUsed}`);
        }
        if (r1.nextState.favorF !== -12 || r2.nextState.favorF !== -24 || r3.nextState.favorF !== -36) {
            throw new Error('被拒後好感度未正確每次 -12');
        }
    });

    suite.test('紅娘叩門保底：僅第 1 年第 3 季觸發、80% 成功率、不扣好感不進冷卻、每存檔至多 1 次', () => {
        const y2 = BondingSuccessService.shouldTriggerMatchmakerFallback({
            year: 2,
            season: 3,
            hasPartner: false,
            matchmakerFallbackUsed: false,
        });
        if (y2) {
            throw new Error('第 2 年第 3 季不應觸發紅娘保底');
        }

        const initial: BondingProposalState = {
            favorF: 10,
            rejectCount: 0,
            cooldownSeasons: 0,
            matchmakerFallbackUsed: false,
            hasPartner: false,
        };

        const res = BondingSuccessService.attemptBondingProposal(initial, {
            year: 1,
            season: 3,
            compatibilityK: 0.8,
            rollPercent: 90, // 刻意失敗以驗證不扣好感、不進冷卻
        });

        if (!res.isMatchmakerFallback || res.rateUsed !== 80) {
            throw new Error(`預期觸發 80% 紅娘保底，實際 ${JSON.stringify(res)}`);
        }
        if (res.nextState.favorF !== 10 || res.nextState.cooldownSeasons !== 0 || !res.nextState.matchmakerFallbackUsed) {
            throw new Error('保底失敗不應扣好感或進冷卻，且應標記已使用');
        }

        const secondCheck = BondingSuccessService.shouldTriggerMatchmakerFallback({
            year: 1,
            season: 3,
            hasPartner: false,
            matchmakerFallbackUsed: res.nextState.matchmakerFallbackUsed,
        });
        if (secondCheck) {
            throw new Error('已觸發過保底不應再次觸發');
        }
    });

    return suite;
}
