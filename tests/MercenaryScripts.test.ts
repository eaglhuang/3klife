import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { createTrialMercenary } from '../assets/scripts/core/systems/MercenaryBond';
import { mercBondedLine, mercDayThreeLine, mercFarewellLine, reachedTrialDayThree } from '../assets/scripts/core/systems/MercenaryScripts';
import { MercenaryPanelController } from '../assets/scripts/ui/core/MercenaryPanelController';

export function createMercenaryScriptsSuite(): TestSuite {
    const suite = new TestSuite('MercenaryScripts');

    suite.test('文案照規格 §G', () => {
        assert.equals('趙雲：與主公並肩三日，已知主公非凡人。', mercDayThreeLine('趙雲'));
        assert.equals('趙雲 願誓死追隨主公！桃園之義，永世不渝！', mercBondedLine('趙雲'));
        assert.equals('六日之約已盡，趙雲 含淚辭別…', mercFarewellLine('趙雲'));
    });

    suite.test('只有試用走到第 3 日才算', () => {
        const trial = createTrialMercenary('m1');
        assert.isTrue(reachedTrialDayThree({ ...trial, daysLeft: 4 }, { ...trial, daysLeft: 3 }));
        assert.isFalse(reachedTrialDayThree({ ...trial, daysLeft: 5 }, { ...trial, daysLeft: 4 }));
        assert.isFalse(reachedTrialDayThree({ ...trial, daysLeft: 3 }, { ...trial, daysLeft: 3 }));
        assert.isFalse(reachedTrialDayThree({ ...trial, daysLeft: 4 }, { ...trial, daysLeft: 3, status: 'Bonded' }));
    });

    suite.test('傭兵日報告：第 3 日回報一次', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setMercenaries({ ...session.mercenaries, mercenaries: [createTrialMercenary('m1')] });
        const days: string[][] = [];
        for (let i = 0; i < 5; i++) days.push((await session.advanceMercenaryDay()).dayThreeUids);
        assert.equals('||m1||', days.map((uids) => uids.join()).join('|'));
    });

    suite.test('面板可取得目前選取傭兵的武將名', () => {
        const panel = new MercenaryPanelController({
            mercenaries: () => [createTrialMercenary('m1')],
            info: () => ({ originalOwnerName: '系統', generalName: '趙雲', rarity: 'R' as never }),
            bondPoints: () => 0,
            bond: async () => true,
        });
        assert.equals('趙雲', panel.selectedGeneralName());
        const empty = new MercenaryPanelController({
            mercenaries: () => [],
            info: () => ({ originalOwnerName: '', generalName: '', rarity: 'R' as never }),
            bondPoints: () => 0,
            bond: async () => true,
        });
        assert.isTrue(empty.selectedGeneralName() === null);
    });

    return suite;
}
