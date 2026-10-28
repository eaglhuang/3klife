/**
 * TallyConfiscation — 君主沒收虎符降忠的 headless 測試（PROG-2-0239，WBS TRP-08）
 *
 * 規格：君主沒收武將手上的虎符，忠誠下降 30 點（HUM-05，規格為準）；沒收的虎符退回君主。
 */
import { assert, TestSuite } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { applyTallyConfiscation, createTallyLoyaltyState, TALLY_CONFISCATE_LOYALTY_DROP } from '../assets/scripts/core/systems/TigerTallyLoyalty';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard, TigerTallyQuality } from '../assets/scripts/core/models/TigerTallyCard';

function general(id: string): GeneralConfig {
    return { id, name: id, status: 'alive' } as unknown as GeneralConfig;
}

function card(uid: string, quality: TigerTallyQuality): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src', quality, score: 0, source: 'death', producedSeason: 1 };
}

function createSession(roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createTallyConfiscationSuite(): TestSuite {
    const suite = new TestSuite('TallyConfiscation (沒收降忠 TRP-08)');

    suite.test('沒收固定降忠 30 點（規格），與虎符品質無關', () => {
        assert.equals(30, TALLY_CONFISCATE_LOYALTY_DROP);
        assert.equals(20, applyTallyConfiscation(createTallyLoyaltyState(50)).loyalty);
    });

    suite.test('忠誠夾在 0 以上；低忠誠武將沒收後歸 0', () => {
        assert.equals(0, applyTallyConfiscation(createTallyLoyaltyState(5)).loyalty);
    });

    suite.test('轉蛋名將沒收後忠誠仍鎖 100', () => {
        assert.equals(100, applyTallyConfiscation(createTallyLoyaltyState(100, true)).loyalty);
    });

    suite.test('沒收：虎符退回君主，忠誠下降 30 並存入狀態', async () => {
        const session = createSession([general('liu')]);
        await session.registerTallyCards([card('t1', 'SSR')]);
        await session.equipTally('t1', 'liu');
        const result = await session.confiscateTally('liu');
        assert.equals('t1', result?.cardUid ?? '');
        assert.equals(20, result?.loyalty ?? -1);
        assert.equals(null, session.tallyOf('liu'));
        assert.equals(null, session.tallyHoldings.t1 ?? null);
        assert.equals(20, session.tallyLoyalty.liu?.loyalty ?? -1);
    });

    suite.test('未持有虎符或不在名冊時沒收回傳 null', async () => {
        const session = createSession([general('liu')]);
        assert.equals(null, await session.confiscateTally('liu'));
        assert.equals(null, await session.confiscateTally('ghost'));
    });

    return suite;
}
