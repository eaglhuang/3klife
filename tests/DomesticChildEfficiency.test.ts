/**
 * 內政面板套用幼兒效率（SPI-13 Q51；PROG-2-2091）
 */
import { assert, TestSuite } from './TestRunner';
import { DomesticPanelController } from '../assets/scripts/ui/core/DomesticPanelController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { domesticOutputFor } from '../assets/scripts/core/systems/DomesticTasks';
import { domesticAssignmentFor } from '../assets/scripts/core/systems/SpiritMcqRules';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gen(id: string, age: number, stat: number): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age, str: stat, int: stat, lea: stat, pol: stat, cha: stat } as unknown as GeneralConfig;
}

/** 與 LobbyScene 同形的依賴 */
function controller(roster: GeneralConfig[]): { session: GameSession; panel: DomesticPanelController } {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore(roster));
    const panel = new DomesticPanelController({
        log: () => session.domesticLog,
        season: () => session.gameTime.totalSeasonsElapsed,
        choose: (taskId) => session.chooseDomesticTask(taskId),
        candidates: () => session.roster.map((g) => ({ id: g.id, name: g.name, stats: session.domesticStatsOf(g) })),
        assignedUid: (taskId) => session.governanceAssignments.find((a) => a.task === taskId)?.generalUid ?? null,
        assign: (taskId, uid) => {
            if (uid === null) { session.unassignGovernor(taskId); return true; }
            return session.assignGovernor(taskId, uid).ok;
        },
        efficiency: (taskId, uid) => {
            const result = domesticAssignmentFor(session.roster.find((g) => g.id === uid)?.age, taskId);
            return result.ok ? result.efficiency : 0;
        },
    });
    return { session, panel };
}

export function createDomesticChildEfficiencySuite(): TestSuite {
    const suite = new TestSuite('DomesticChildEfficiency (內政面板幼兒效率 SPI-13 PROG-2-2091)');

    suite.test('換將跳過不可指派的幼兒，不會卡在原地', () => {
        const { session, panel } = controller([gen('kid', 10, 99), gen('adult', 40, 50)]);
        panel.cycleGovernor('diplomacy');
        assert.equals(session.governanceAssignments.find((a) => a.task === 'diplomacy')?.generalUid, 'adult');
        panel.cycleGovernor('diplomacy');
        assert.equals(session.governanceAssignments.find((a) => a.task === 'diplomacy'), undefined);
    });

    suite.test('幼兒做低效內政時產出預覽用打折後屬性', () => {
        const { panel } = controller([gen('kid', 10, 80)]);
        panel.cycleGovernor('farming');
        const expected = domesticOutputFor('farming', { str: 40, int: 40, pol: 40, cha: 40 }).amount;
        assert.isTrue(panel.getFlowView().texts.noticeLabel.includes(`+${expected}`), panel.getFlowView().texts.noticeLabel);
    });

    suite.test('面板自動治理不派幼兒', () => {
        assert.equals(controller([gen('kid', 10, 80)]).panel.autoAssign(), 0);
        assert.isTrue(controller([gen('adult', 40, 80)]).panel.autoAssign() > 0);
    });

    return suite;
}
