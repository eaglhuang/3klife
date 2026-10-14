/**
 * TacticLearnWiring.test.ts — 培育學戰法接線（PROG-2-0536）
 *
 * TP 為武將培育中的個人 TP（NurtureSession.tp）；學習扣實際成本，門檻為實際成本 ×2。
 * Unity 對照：像商店購買流程的整合測試，扣款判定與寫回資料各自驗證。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, type NurtureStatePort } from '../assets/scripts/core/managers/GameSession';
import { battleIntelligenceOf, buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { TACTIC_TP_COST_OVERRIDE } from '../assets/scripts/core/systems/SortieDeploy';
import { hasMatchingGreenFactor, tacticFactorColor } from '../assets/scripts/core/systems/TacticLearning';
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
        overrides['TAC_G'] = 31;
        try {
            const general = makeGeneral('lead-1', 60, [], [{ type: 'green', id: 'GREEN_TAC_01' }]);
            const { session, port } = sessionWith(general, 32);
            assert.isTrue((await session.learnTactic('lead-1', 'TAC_G')).ok);
            assert.equals(16, port.state.sessions[0].tp);
            const short = sessionWith(general, 31);
            assert.equals('TP_SHORT', (await short.session.learnTactic('lead-1', 'TAC_G')).blocked!);
        } finally {
            delete overrides['TAC_G'];
        }
    });

    suite.test('綠因子條件：戰法因子顏色為 green 且武將持有任一 green 基因才打折', () => {
        assert.equals('green', tacticFactorColor('TAC_ANY'));
        assert.isTrue(hasMatchingGreenFactor([{ type: 'green' }], 'TAC_ANY'));
        assert.isTrue(hasMatchingGreenFactor([{ type: 'red' }, { type: 'green' }], 'TAC_ANY'));
        assert.isFalse(hasMatchingGreenFactor([{ type: 'red' }], 'TAC_ANY'));
        assert.isFalse(hasMatchingGreenFactor(undefined, 'TAC_ANY'));
    });

    suite.test('戰場槽位依智力：智力 10 只給 1 槽，即使已學 3 招', () => {
        const config = buildBattleConfig(makeGeneral('low', 10, ['TAC_A', 'TAC_B', 'TAC_C']), 'shu' as GeneralConfig['faction']);
        assert.equals(1, config.tacticSlots?.length ?? 0);
    });

    suite.test('戰場智力取實力層：頂層底值 20、實力層 200（戰場智力 100）→ 4 槽，與戰場一致', () => {
        const child = makeGeneral('child', 20, ['TAC_A', 'TAC_B', 'TAC_C', 'TAC_D', 'TAC_E']);
        (child as unknown as { prowess: Record<string, number> }).prowess = { int: 200 };
        assert.equals(100, battleIntelligenceOf(child));
        const config = buildBattleConfig(child, 'shu' as GeneralConfig['faction']);
        assert.equals(4, config.tacticSlots?.length ?? 0);
    });

    suite.test('學戰法的槽位也用戰場智力：頂層底值 20、實力層 200 → 第 2 招可學（不被底值擋成 1 槽）', async () => {
        const child = makeGeneral('child', 20, ['TAC_A']);
        (child as unknown as { prowess: Record<string, number> }).prowess = { int: 200 };
        const { session } = sessionWith(child, 999);
        const check = await session.learnTactic('child', 'TAC_B');
        assert.isTrue(check.ok);
    });

    suite.test('戰場槽位依智力：智力 95 可給 4 槽（上限）', () => {
        const config = buildBattleConfig(makeGeneral('high', 95, ['TAC_A', 'TAC_B', 'TAC_C', 'TAC_D', 'TAC_E']), 'shu' as GeneralConfig['faction']);
        assert.equals(4, config.tacticSlots?.length ?? 0);
    });

    return suite;
}
