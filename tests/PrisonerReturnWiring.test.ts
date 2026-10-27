/**
 * PrisonerReturnWiring.test.ts — 放走俘虜來投接線（POW-07 接線 / PROG-2-0943）headless 測試
 *
 * 鎖住：放走進 released 名單；季結算時擲中（5%）的來投者依 uid 以配置入冊並從名單移除；
 * 查不到配置時略過（不入冊、仍從名單移除）；同一季放走不會當季來投。
 *
 * Unity 對照：像 Spawner 在關卡 Tick 時，依 ID 從 Prefab 表實例化回來的 NPC；
 * 表裡找不到 Prefab 就跳過並警告，不讓整個 Tick 崩潰。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { FUTURE_RETURN_CHANCE } from '../assets/scripts/core/systems/PrisonerOfWar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id,
        name: id,
        rarityTier: 'rare',
        cha: 30,
        luk: 20,
        int: 20,
        pol: 20,
        loyalty: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

/** 放走一名敵將（季 0），回傳已放走的 session */
async function releaseOne(session: GameSession, uid: string): Promise<void> {
    await session.capturePrisoner(general(uid, { name: uid, rarityTier: 'rare' }));
    await session.resolvePrisoner(uid, 'release');
}

export function createPrisonerReturnWiringSuite(): TestSuite {
    const suite = new TestSuite('PrisonerReturnWiring (俘虜來投接線 POW-07 / PROG-2-0943)');

    suite.test('放走進 released 名單；同一季結算不來投', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setGeneralTemplates([general('gao-shun')]);
        session.setRandomSource(() => 0);

        await releaseOne(session, 'gao-shun');
        assert.equals(1, session.prison.released.length);
        assert.equals('gao-shun', session.prison.released[0].targetUid);
        assert.isTrue(!session.roster.some((g) => g.id === 'gao-shun'));
    });

    suite.test('季結算擲中來投：依 uid 以配置入冊，並從 released 移除', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setGeneralTemplates([general('gao-shun', { name: '高順' })]);
        session.setRandomSource(() => 0);

        await releaseOne(session, 'gao-shun');
        await session.advanceSeason();
        assert.isTrue(session.roster.some((g) => g.id === 'gao-shun'), '來投者入冊');
        assert.equals(0, session.prison.released.length);
    });

    suite.test('未中（亂數高於 5%）時留在 released 名單，不入冊', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setGeneralTemplates([general('gao-shun')]);
        session.setRandomSource(() => FUTURE_RETURN_CHANCE + 0.5);

        await releaseOne(session, 'gao-shun');
        await session.advanceSeason();
        assert.isTrue(!session.roster.some((g) => g.id === 'gao-shun'));
        assert.equals(1, session.prison.released.length);
    });

    suite.test('查不到配置時略過：不入冊，但仍從名單移除', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setGeneralTemplates([]);
        session.setRandomSource(() => 0);

        await releaseOne(session, 'gao-shun');
        await session.advanceSeason();
        assert.isTrue(!session.roster.some((g) => g.id === 'gao-shun'));
        assert.equals(0, session.prison.released.length);
    });

    return suite;
}
