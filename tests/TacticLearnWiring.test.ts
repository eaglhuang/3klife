/**
 * TacticLearnWiring.test.ts — 培育學戰法接線（PROG-2-0536）
 *
 * TP 為武將培育中的個人 TP（NurtureSession.tp）；學習扣實際成本，門檻為實際成本 ×2。
 * Unity 對照：像商店購買流程的整合測試，扣款判定與寫回資料各自驗證。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, type NurtureStatePort } from '../assets/scripts/core/managers/GameSession';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { TACTIC_TP_COST_OVERRIDE } from '../assets/scripts/core/systems/SortieDeploy';
import { TACTIC_GREEN_FACTOR_GENE_ID, hasMatchingGreenFactor } from '../assets/scripts/core/systems/TacticLearning';
import type { NurtureState } from '../assets/scripts/core/services/NurtureService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, int: number, learnedTactics: string[] = [], genes: unknown[] = []): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int, lea: 70, pol: 50, cha: 60, luk: 40,
        learnedTactics, genes,
    } as unknown as GeneralConfig;
}

/** 只帶 sessions 的假培育埠；restoreState 會收下新狀態，模擬存檔寫回 */
function nurturePort(childId: string, tp: number): NurtureStatePort & { state: NurtureState } {
    const port = {
        state: { sessions: [{ childId, tp }], admission: { season: 0, used: 0 } } as unknown as NurtureState,
        getState() { return JSON.parse(JSON.stringify(this.state)) as NurtureState; },
        restoreState(next: NurtureState | null | undefined) { if (next) this.state = JSON.parse(JSON.stringify(next)); },
    };
    return port;
}

/** 培育中的武將不會出現在可出戰名單，這裡直接讀名冊 */
function learnedOf(session: GameSession, id: string): string {
    const roster = (session as unknown as { _roster: InMemoryRosterStore })._roster;
    return JSON.stringify(roster.getAll().find((g) => g.id === id)?.learnedTactics ?? []);
}

function sessionWith(general: GeneralConfig, tp: number): { session: GameSession; port: ReturnType<typeof nurturePort> } {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([general]));
    const port = nurturePort(general.id, tp);
    session.setNurtureStatePort(port);
    return { session, port };
}

export function createTacticLearnWiringSuite(): TestSuite {
    const suite = new TestSuite('TacticLearnWiring (PROG-2-0536 培育學戰法接線)');

    suite.test('學戰法：培育 TP 達門檻（60）時寫入 learnedTactics 並扣實際成本 30', async () => {
        const { session, port } = sessionWith(makeGeneral('lead-1', 60), 60);
        const check = await session.learnTactic('lead-1', 'TAC_A');
        assert.isTrue(check.ok);
        assert.equals(30, port.state.sessions[0].tp);
        assert.equals('["TAC_A"]', learnedOf(session, 'lead-1'));
    });

    suite.test('學戰法：培育 TP 不足（59 < 60）以 TP_SHORT 擋下，TP 與清單都不變', async () => {
        const { session, port } = sessionWith(makeGeneral('lead-1', 60), 59);
        const check = await session.learnTactic('lead-1', 'TAC_A');
        assert.equals('TP_SHORT', check.blocked!);
        assert.equals(59, port.state.sessions[0].tp);
        assert.equals('[]', learnedOf(session, 'lead-1'));
    });

    suite.test('學戰法：武將不在培育中以 NOT_NURTURING 擋下', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1', 60)]));
        session.setNurtureStatePort(nurturePort('someone-else', 999));
        assert.equals('NOT_NURTURING', (await session.learnTactic('lead-1', 'TAC_A')).blocked!);
    });

    suite.test('學戰法：找不到武將以 INVALID_TACTIC 擋下', async () => {
        const { session } = sessionWith(makeGeneral('lead-1', 60), 999);
        assert.equals('INVALID_TACTIC', (await session.learnTactic('nobody', 'TAC_A')).blocked!);
    });

    suite.test('學戰法：綠因子相符時成本 31×0.5 ceil = 16，門檻 32，扣 16', async () => {
        const overrides = TACTIC_TP_COST_OVERRIDE as Record<string, number>;
        const mapping = TACTIC_GREEN_FACTOR_GENE_ID as Record<string, string>;
        overrides['TAC_G'] = 31;
        mapping['TAC_G'] = 'GREEN_TAC_01';
        try {
            const general = makeGeneral('lead-1', 60, [], [{ type: 'green', id: 'GREEN_TAC_01' }]);
            const { session, port } = sessionWith(general, 32);
            assert.isTrue((await session.learnTactic('lead-1', 'TAC_G')).ok);
            assert.equals(16, port.state.sessions[0].tp);
            const short = sessionWith(general, 31);
            assert.equals('TP_SHORT', (await short.session.learnTactic('lead-1', 'TAC_G')).blocked!);
        } finally {
            delete overrides['TAC_G'];
            delete mapping['TAC_G'];
        }
    });

    suite.test('hasMatchingGreenFactor：需要 type 為 green 且 id 相符；對應表空時永遠不相符', () => {
        assert.isFalse(hasMatchingGreenFactor([{ type: 'green', id: 'X' }], 'TAC_NONE'));
        const mapping = TACTIC_GREEN_FACTOR_GENE_ID as Record<string, string>;
        mapping['TAC_M'] = 'X';
        try {
            assert.isTrue(hasMatchingGreenFactor([{ type: 'green', id: 'X' }], 'TAC_M'));
            assert.isFalse(hasMatchingGreenFactor([{ type: 'red', id: 'X' }], 'TAC_M'));
        } finally {
            delete mapping['TAC_M'];
        }
    });

    suite.test('戰場槽位依智力：智力 10 只給 1 槽，即使已學 3 招', () => {
        const config = buildBattleConfig(makeGeneral('low', 10, ['TAC_A', 'TAC_B', 'TAC_C']), 'shu' as GeneralConfig['faction']);
        assert.equals(1, config.tacticSlots?.length ?? 0);
    });

    suite.test('戰場槽位依智力：智力 95 可給 4 槽（上限）', () => {
        const config = buildBattleConfig(makeGeneral('high', 95, ['TAC_A', 'TAC_B', 'TAC_C', 'TAC_D', 'TAC_E']), 'shu' as GeneralConfig['faction']);
        assert.equals(4, config.tacticSlots?.length ?? 0);
    });

    return suite;
}
