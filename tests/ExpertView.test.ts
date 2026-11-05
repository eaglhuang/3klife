/**
 * ExpertView.test.ts — 專家全開視圖只改顯示，不提前解鎖功能（PROG-2-1846）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { displayMilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { MarriageProposalPopupController, type MarriageProposalPopupDeps } from '../assets/scripts/ui/core/MarriageProposalPopupController';
import type { MarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';

const general = (id: string, gender: '男' | '女'): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
} as unknown as GeneralConfig);

export function createExpertViewSuite(): TestSuite {
    const suite = new TestSuite('ExpertView');

    suite.test('開啟時顯示階段為 G4，關閉時等於實際階段', () => {
        assert.equals(4, displayMilestoneStage(1, true));
        assert.equals(1, displayMilestoneStage(1, false));
        assert.equals(3, displayMilestoneStage(3, false));
    });

    suite.test('Session：開關不改實際階段，存讀檔保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const makeSession = (): GameSession => {
            const session = new GameSession();
            session.setRosterStore(new InMemoryRosterStore([]));
            session.setSaveService(new PlayerSaveService(adapter));
            return session;
        };
        const session = makeSession();
        assert.isFalse(session.expertView);
        await session.setExpertView(true);
        assert.equals(1, session.milestoneStage);
        assert.equals(4, session.displayStage);

        const restored = makeSession();
        assert.isTrue(await restored.load());
        assert.isTrue(restored.expertView);
        assert.equals(1, restored.milestoneStage);

        await session.setExpertView(false);
        assert.equals(1, session.displayStage);
        assert.equals(undefined, session.createSnapshot().expertView);
    });

    suite.test('結緣：G1 開專家視圖可看潛力，但合譜與花券細查仍收起', async () => {
        const roster = new InMemoryRosterStore([general('f', '男'), general('m', '女')]);
        const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
        const flow = new BondingSetupController({
            roster,
            breeding: service,
            prepare: async () => service.syncGraphFromRoster(),
            persist: async () => undefined,
            milestoneStage: () => 4,
            unlockStage: () => 1,
        });
        await flow.open();
        const { actives } = flow.getView();
        assert.isTrue(actives.btnPotential);
        assert.isFalse(actives.btnCompact);
        assert.isFalse(actives.btnProbeFatherStat);
        assert.isFalse(actives.btnProbeMotherStat);
        assert.isFalse(actives.btnCycleProbeStat);
    });

    suite.test('提親：G1 開專家視圖可看世交字樣，但細查仍收起且不扣券', async () => {
        let probed = 0;
        const session: MarriageProposalPopupDeps['session'] = {
            marriageProposal: {
                id: 'p', targetId: 'a', targetName: '趙統', family: '太原王', giftGold: 750, allianceBonusGold: 250, centuryAlliance: true,
                suitor: { name: '王蘭', gender: '女', age: 20, str: 52, int: 77, lea: 60, pol: 61, cha: 70, luk: 50, ep: 60 },
            } as unknown as MarriageProposal,
            milestoneStage: 1,
            displayStage: 4,
            respondMarriageProposal: async () => ({ ok: true }),
            itemCount: () => 3,
            isStatProbed: () => false,
            probeStat: async () => { probed += 1; return true; },
        };
        const popup = new MarriageProposalPopupController({ session, grantGold: () => undefined });
        const view = popup.getView();
        assert.contains(view.texts.mpGift, '世交');
        assert.isFalse(view.actives.btnProbeMpStat);
        assert.isFalse(await popup.probeSuitorStat());
        assert.equals(0, probed);
    });

    return suite;
}
