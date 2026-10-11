import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { LegacyService, STORE_TIGER_TALLIES, toTigerTallyGeneral } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { AgingEvent } from '../assets/scripts/core/systems/GeneralAging';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { isTallyEligible } from '../assets/scripts/core/systems/TigerTally';

type TestGeneral = BreedingGeneral & { uid?: string; isHistorical?: boolean; troopType?: string };

function general(id = 'hero', extra: Partial<TestGeneral> = {}): TestGeneral {
    return {
        id, name: id, faction: 'shu' as GeneralConfig['faction'], hp: 1000, age: 70,
        gender: '男', characterCategory: 'famed', templateId: 'GEN_SHU_HERO',
        ...extra,
    };
}

function deaths(...roster: GeneralConfig[]): AgingEvent[] {
    return roster.map((g) => ({ type: 'died', generalId: g.id, age: g.age ?? 70 }));
}

export function createLegacyTallySuite(): TestSuite {
    const suite = new TestSuite('LegacyTally (死亡雙卡 / 虎符庫)');

    suite.test('正式模板名將死亡：英靈與虎符入庫，且只移除死者', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const dead = general('hero', { uid: 'world-hero', troopType: 'cavalry' });
        const survivor = general('survivor');
        const result = await service.settleSeason([dead, survivor], new GameClock().advanceSeason(), deaths(dead));
        assert.equals(1, result.settlement.spiritCards.length);
        assert.equals(1, result.settlement.tigerTallies!.length);
        assert.equals('hero', result.settlement.spiritCards[0].uid);
        const tally = result.settlement.tigerTallies![0];
        assert.equals('world-hero', tally.sourceGeneralUid);
        assert.equals('GEN_SHU_HERO', tally.templateId);
        assert.equals('death', tally.source);
        assert.equals('cavalry', tally.troopType);
        assert.equals(tally.uid, (await service.getTigerTallies())[0].uid);
        assert.equals('survivor', result.roster[0].id);
        assert.equals(1, result.roster.length);
    });

    suite.test('一般子嗣只有英靈；即使殘留女性名將模板也不得產虎符', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const child = general('child', { gender: '女', fatherId: 'dad', motherId: 'mom', birthSeason: 0 });
        const result = await service.settleSeason([child], new GameClock().advanceSeason(), deaths(child));
        assert.equals(1, result.settlement.spiritCards.length);
        assert.equals(0, result.settlement.tigerTallies!.length);
        assert.equals(0, (await service.getTigerTallies()).length);
    });

    suite.test('退役只產教官；退役後死亡仍產雙卡，教官保留', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const clock = new GameClock();
        const advance = clock.advanceSeason();
        const retired = await service.retireGeneral([general()], 'hero', advance.previous);
        assert.equals(0, (await service.getArchiver().getAllSpiritCards()).length);
        assert.equals(0, (await service.getTigerTallies()).length);
        const result = await service.settleSeason(retired.roster, advance, deaths(...retired.roster));
        assert.equals(1, result.settlement.spiritCards.length);
        assert.equals(1, result.settlement.tigerTallies!.length);
        assert.equals(1, (await service.getMentorCards()).length);
    });

    suite.test('provider 收到死亡武將，100 / 50 對應 85 分 UR', async () => {
        let observed: GeneralConfig | undefined;
        const service = new LegacyService(new MemoryStorageAdapter(), {
            tallyScoreProvider: (dead) => {
                observed = dead;
                return { deathBattleScore: 100, legacyQualityScore: 50 };
            },
        });
        const dead = general();
        const result = await service.settleSeason([dead], new GameClock().advanceSeason(), deaths(dead));
        assert.isTrue(observed === dead);
        assert.equals(85, result.settlement.tigerTallies![0].score);
        assert.equals('UR', result.settlement.tigerTallies![0].quality);
    });

    suite.test('未提供 provider：預設零分 R，不報錯', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const dead = general();
        const result = await service.settleSeason([dead], new GameClock().advanceSeason(), deaths(dead));
        assert.equals(0, result.settlement.tigerTallies![0].score);
        assert.equals('R', result.settlement.tigerTallies![0].quality);
    });

    suite.test('同季重跑與重複死亡事件：同 uid 覆蓋而非重複，其他卡保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const roster = [general('first'), general('second')];
        const advance = new GameClock().advanceSeason();
        const first = await service.settleSeason(roster, advance, deaths(...roster, roster[0]));
        assert.equals(2, first.settlement.tigerTallies!.length);
        const retry = await service.settleSeason(roster, advance, deaths(roster[0]));
        assert.equals(1, retry.settlement.tigerTallies!.length);
        const stored = await adapter.get<TigerTallyCard[]>(STORE_TIGER_TALLIES);
        assert.equals(2, stored!.length);
        assert.equals(2, new Set(stored!.map((c) => c.uid)).size);
        assert.isTrue(stored!.some((c) => c.sourceGeneralUid === 'second'));
        const removedRetry = await service.settleSeason([], advance, deaths(roster[0]));
        assert.equals(0, removedRetry.settlement.tigerTallies!.length);
        assert.equals(2, (await service.getTigerTallies()).length);
    });

    suite.test('同後端重建 LegacyService 能讀回虎符，讀取結果不污染存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const dead = general();
        await new LegacyService(adapter).settleSeason([dead], new GameClock().advanceSeason(), deaths(dead));
        const rebuilt = new LegacyService(adapter);
        const stored = await rebuilt.getTigerTallies();
        assert.equals(1, stored.length);
        assert.equals('hero', stored[0].sourceGeneralUid);
        stored.length = 0;
        assert.equals(1, (await rebuilt.getTigerTallies()).length);
    });

    suite.test('死亡虎符使用累計季數，不同年度同季不碰撞', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const clock = new GameClock();
        const dead = general();
        const first = await service.settleSeason([dead], clock.advanceSeason(), deaths(dead));
        for (let i = 0; i < 3; i++) clock.advanceSeason();
        const nextYear = await service.settleSeason([dead], clock.advanceSeason(), deaths(dead));
        assert.equals(0, first.settlement.tigerTallies![0].producedSeason);
        assert.equals(4, nextYear.settlement.tigerTallies![0].producedSeason);
        assert.notEquals(first.settlement.tigerTallies![0].uid, nextYear.settlement.tigerTallies![0].uid);
        assert.equals(2, (await service.getTigerTallies()).length);
    });

    suite.test('沒有死亡事件：不產雙卡、不呼叫分數 provider', async () => {
        let calls = 0;
        const service = new LegacyService(new MemoryStorageAdapter(), {
            tallyScoreProvider: () => { calls++; return { deathBattleScore: 100, legacyQualityScore: 100 }; },
        });
        const result = await service.settleSeason([general()], new GameClock().advanceSeason(), []);
        assert.equals(0, result.settlement.spiritCards.length);
        assert.equals(0, result.settlement.tigerTallies!.length);
        assert.equals(0, calls);
        assert.equals(1, result.roster.length);
    });

    suite.test('正式女性模板會產虎符；civilian、未知模板與缺分類保守拒絕', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const roster = [
            general('female', { gender: '女' }),
            general('civilian', { characterCategory: 'civilian' }),
            general('unknown', { gender: '女', templateId: 'child-template' }),
            general('no-category', { characterCategory: undefined }),
        ];
        const result = await service.settleSeason(roster, new GameClock().advanceSeason(), deaths(...roster));
        assert.equals(4, result.settlement.spiritCards.length);
        assert.equals(1, result.settlement.tigerTallies!.length);
        assert.equals('female', result.settlement.tigerTallies![0].sourceGeneralUid);
    });

    suite.test('獨立對應函式：明確旗標、父母與出生季的保守門檻', () => {
        assert.isTrue(isTallyEligible(toTigerTallyGeneral(general('historical', { isHistorical: true, templateId: undefined }))));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('explicit-false', { isHistorical: false }))));
        for (const extra of [{ fatherId: 'f' }, { motherId: 'm' }, { birthSeason: 0 }]) {
            assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('child', { gender: '女', ...extra }))));
        }
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('myth', { characterCategory: 'mythical' }))));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('no-template', { templateId: undefined }))));
    });

    suite.test('現有 generals.json 正式模板皆可走死亡虎符門檻（唯讀資料）', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const roster = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
        assert.isTrue(roster.length > 0);
        for (const g of roster) assert.isTrue(isTallyEligible(toTigerTallyGeneral(g)), `${g.id} 應符合現有模板契約`);
    });

    return suite;
}
