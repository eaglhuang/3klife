/**
 * PROG-2-1168：轉蛋戰法隨機化（第 2、第 3 戰法隨機，重複轉戰法經驗值）
 */

import { assert, TestSuite } from './TestRunner';
import {
    applyPulledTactics, rollPullTactics, tacticLevelOf, TACTIC_DUPLICATE_EXP, TACTIC_MAX_LEVEL, TACTIC_RANDOM_POOL,
} from '../assets/scripts/core/systems/TacticRandomization';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function seq(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
}

function hero(): GeneralConfig {
    return {
        id: 'zhao-yun', name: '趙雲', faction: 'shu', hp: 1000, str: 90, int: 70, lea: 80, pol: 60, cha: 80,
        tacticSlots: [{ slotId: 'slot-1', tacticId: 'tactic-dragon-pierce', source: 'inborn' }],
    } as GeneralConfig;
}

export function createTacticRandomizationSuite(): TestSuite {
    const suite = new TestSuite('TacticRandomization');

    suite.test('候選池只有基本戰法（不含靈感戰法）', () => {
        assert.isTrue(TACTIC_RANDOM_POOL.length >= 2);
        assert.isFalse(TACTIC_RANDOM_POOL.some((id) => id.startsWith('tactic-insp-')));
    });

    suite.test('rollPullTactics：抽 2 招不重複，且不含第 1 戰法', () => {
        for (const r of [0, 0.3, 0.6, 0.99]) {
            const rolled = rollPullTactics(['tactic-dragon-pierce'], seq([r, r]));
            assert.equals(2, rolled.length);
            assert.isTrue(rolled[0] !== rolled[1]);
            assert.isFalse(rolled.includes('tactic-dragon-pierce'));
        }
    });

    suite.test('applyPulledTactics：補空槽 slot-2、slot-3，來源標 gacha；不改輸入', () => {
        const general = hero();
        const result = applyPulledTactics(general, ['tactic-fire-scheme', 'tactic-archer-volley']);
        assert.equals('slot-2:tactic-fire-scheme:gacha,slot-3:tactic-archer-volley:gacha',
            result.tacticSlots.slice(1).map((s) => `${s.slotId}:${s.tacticId}:${s.source}`).join(','));
        assert.equals(1, general.tacticSlots!.length, '輸入不變');
    });

    suite.test('applyPulledTactics：已持有轉經驗、兩格滿則捨棄、經驗封頂滿級', () => {
        const full = applyPulledTactics(hero(), ['tactic-fire-scheme', 'tactic-archer-volley']);
        const again = applyPulledTactics(full, ['tactic-fire-scheme', 'tactic-morale-rally']);
        assert.equals('tactic-fire-scheme', again.convertedToExp.join(','));
        assert.equals('tactic-morale-rally', again.discarded.join(','));
        assert.equals(TACTIC_DUPLICATE_EXP, again.tacticExp['tactic-fire-scheme']);
        assert.equals(2, tacticLevelOf(again.tacticExp['tactic-fire-scheme']));
        let state = again;
        for (let i = 0; i < 10; i++) state = applyPulledTactics(state, ['tactic-fire-scheme']);
        assert.equals(TACTIC_MAX_LEVEL, tacticLevelOf(state.tacticExp['tactic-fire-scheme']));
        assert.equals(TACTIC_MAX_LEVEL, tacticLevelOf(1e9));
        assert.equals(1, tacticLevelOf(undefined));
    });

    suite.test('GameSession.enrollGenerals：轉蛋入冊新抽到補第 2、第 3 戰法；一般入冊不動', () => {
        const session = new GameSession(7);
        session.enrollGenerals([hero()], { rebirthOnDuplicate: true });
        const slots = session.roster.find((g) => g.id === 'zhao-yun')!.tacticSlots!;
        assert.equals('slot-1,slot-2,slot-3', slots.map((s) => s.slotId).join(','));

        const plain = new GameSession(7);
        plain.enrollGenerals([hero()]);
        assert.equals(1, plain.roster.find((g) => g.id === 'zhao-yun')!.tacticSlots!.length);
    });

    suite.test('GameSession.enrollGenerals：重複抽到時戰法槽已滿，結果只有轉經驗或捨棄', () => {
        const session = new GameSession(7);
        session.enrollGenerals([hero()], { rebirthOnDuplicate: true });
        session.enrollGenerals([hero()], { rebirthOnDuplicate: true });
        const general = session.roster.find((g) => g.id === 'zhao-yun')!;
        assert.equals(3, general.tacticSlots!.length);
        assert.equals(2, general.rebirthCount);
        const exp = Object.values(general.tacticExp ?? {}).reduce((a, b) => a + b, 0);
        assert.isTrue(exp % TACTIC_DUPLICATE_EXP === 0 && exp <= 2 * TACTIC_DUPLICATE_EXP);
    });

    return suite;
}
