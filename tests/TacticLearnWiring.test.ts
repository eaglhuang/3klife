/**
 * TacticLearnWiring.test.ts — 培育學戰法接線（PROG-2-0536）
 *
 * GameSession.learnTactic 寫入武將 learnedTactics；戰場槽位依智力（§F-7）計算。
 * Unity 對照：像 Shop 購買流程的整合測試，扣款判定與寫回資料各自驗證。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { TACTIC_TP_COST_OVERRIDE } from '../assets/scripts/core/systems/SortieDeploy';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, int: number, learnedTactics: string[] = []): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int, lea: 70, pol: 50, cha: 60, luk: 40,
        learnedTactics,
    } as unknown as GeneralConfig;
}

export function createTacticLearnWiringSuite(): TestSuite {
    const suite = new TestSuite('TacticLearnWiring (PROG-2-0536 培育學戰法接線)');

    suite.test('GameSession.learnTactic：TP 足夠時寫入 learnedTactics', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1', 60)]));
        const check = await session.learnTactic('lead-1', 'TAC_A', 60);
        assert.isTrue(check.ok);
        assert.equals('["TAC_A"]', JSON.stringify(session.getDeployableGenerals()[0].learnedTactics ?? []));
    });

    suite.test('GameSession.learnTactic：TP 不足時不寫入', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1', 60)]));
        const check = await session.learnTactic('lead-1', 'TAC_A', 10);
        assert.equals('TP_SHORT', check.blocked!);
        assert.equals('[]', JSON.stringify(session.getDeployableGenerals()[0].learnedTactics ?? []));
    });

    suite.test('GameSession.learnTactic：找不到武將時回傳 INVALID_TACTIC', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        const check = await session.learnTactic('nobody', 'TAC_A', 999);
        assert.equals('INVALID_TACTIC', check.blocked!);
    });

    suite.test('戰場槽位依智力：智力 10 只給 1 槽，即使已學 3 招', () => {
        const config = buildBattleConfig(makeGeneral('low', 10, ['TAC_A', 'TAC_B', 'TAC_C']), 'shu' as GeneralConfig['faction']);
        assert.equals(1, config.tacticSlots?.length ?? 0);
    });

    suite.test('戰場槽位依智力：智力 95 可給 4 槽（上限）', () => {
        const config = buildBattleConfig(makeGeneral('high', 95, ['TAC_A', 'TAC_B', 'TAC_C', 'TAC_D', 'TAC_E']), 'shu' as GeneralConfig['faction']);
        assert.equals(4, config.tacticSlots?.length ?? 0);
    });

    suite.test('綠因子相符：學習 TP 成本 ×0.5 並 ceil，門檻隨之降低', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1', 60)]));
        // 基礎 30 → 綠因子 15 → 門檻 30
        assert.isFalse((await session.learnTactic('lead-1', 'TAC_A', 29, true)).ok);
        assert.isTrue((await session.learnTactic('lead-1', 'TAC_A', 30, true)).ok);
    });

    suite.test('綠因子取整採 ceil：基礎 31 → 15.5 → 16，門檻 32', async () => {
        const overrides = TACTIC_TP_COST_OVERRIDE as Record<string, number>;
        overrides['TAC_ODD'] = 31;
        try {
            const session = new GameSession(3);
            session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1', 60)]));
            assert.isFalse((await session.learnTactic('lead-1', 'TAC_ODD', 31, true)).ok);
            assert.isTrue((await session.learnTactic('lead-1', 'TAC_ODD', 32, true)).ok);
        } finally {
            delete overrides['TAC_ODD'];
        }
    });

    return suite;
}
