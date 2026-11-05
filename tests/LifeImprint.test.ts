import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { lifeImprintLine, withLifeImprints } from '../assets/scripts/core/systems/LifeImprint';

const general = (extra: Record<string, unknown>) => ({ id: 'g', name: '老將', age: 70, str: 50, int: 50, lea: 50, pol: 50, cha: 50, genes: [], ...extra }) as unknown as GeneralConfig;

function build(roster: GeneralConfig[], random = 0.99, lifecycle = true) {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore(roster));
    if (lifecycle) s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    s.setAutoSave(false);
    s.setRandomSource(() => random);
    const events: { name: string; imprints: string[] }[] = [];
    s.setEventEmitter({ emit: (name: string, payload?: unknown) => { if (name === GAME_SESSION_EVENTS.LifeImprinted) events.push(payload as { name: string; imprints: string[] }); } });
    return { s, events };
}

const geneIds = (s: GameSession, id: string) => s.roster.find((g) => g.id === id)!.genes!.map((g) => g.id).join(',');

export function createLifeImprintSuite(): TestSuite {
    const suite = new TestSuite('LifeImprint');

    suite.test('條件未達不加、回傳原物件', () => {
        const source = general({ battleRecord: { wins: 9, losses: 0, kills: 99 }, pol: 79 });
        const result = withLifeImprints(source);
        assert.isTrue(result.general === source);
        assert.lengthEquals(0, result.added);
    });

    suite.test('戰功達標得破虜，政治達標得治平，兩個都達標得兩個，寫成白因子', () => {
        assert.equals('破虜', withLifeImprints(general({ battleRecord: { wins: 10, losses: 0 } })).added.join());
        assert.equals('破虜', withLifeImprints(general({ battleRecord: { wins: 0, losses: 0, kills: 100 } })).added.join());
        assert.equals('治平', withLifeImprints(general({ pol: 80 })).added.join());
        assert.equals('治平', withLifeImprints(general({ pol: undefined, stats: { pol: 90 } })).added.join());
        const both = withLifeImprints(general({ pol: 95, battleRecord: { wins: 30, losses: 0 } }));
        assert.equals('破虜,治平', both.added.join());
        assert.equals('white', both.general.genes![0].type!);
        assert.equals(1, both.general.genes![0].level!);
    });

    suite.test('已有印記不重複；保留原有因子', () => {
        const once = withLifeImprints(general({ pol: 90, genes: [{ id: 'gene_a', level: 2 }] }));
        assert.equals('gene_a,imprint_zhiping', once.general.genes!.map((g) => g.id).join());
        const twice = withLifeImprints(once.general);
        assert.lengthEquals(0, twice.added);
        assert.isTrue(twice.general === once.general);
    });

    suite.test('句子', () => {
        assert.equals('蓋棺論定：荀彧 一生功業凝為【破虜】【治平】，傳於後世！', lifeImprintLine('荀彧', ['破虜', '治平']));
    });

    suite.test('退役時寫入名冊並發事件', async () => {
        const { s, events } = build([general({ pol: 90 })]);
        await s.retireGeneral('g');
        assert.equals('imprint_zhiping', geneIds(s, 'g'));
        assert.lengthEquals(1, events);
        assert.equals('治平', events[0].imprints.join());
    });

    suite.test('退役的教官卡帶到印記', async () => {
        const { s } = build([general({ pol: 90 })]);
        const card = await s.retireGeneral('g');
        assert.isTrue(card.gene_refs!.includes('imprint_zhiping'));
    });

    suite.test('去世時寫入；之前就死的不補', async () => {
        const { s, events } = build([
            general({ id: 'dying', age: 200, pol: 90 }),
            general({ id: 'gone', age: 200, pol: 90, status: 'dead' }),
            general({ id: 'young', age: 30, pol: 90 }),
        ], 0, false);
        await s.advanceSeason();
        assert.equals('dead', s.roster.find((g) => g.id === 'dying')!.status!);
        assert.equals('imprint_zhiping', geneIds(s, 'dying'));
        assert.equals('', geneIds(s, 'gone'));
        assert.equals('', geneIds(s, 'young'));
        assert.lengthEquals(1, events);
    });

    suite.test('真實季結：亡者歸檔前已凝練，只發一次', async () => {
        const { s, events } = build([general({ id: 'dying', age: 200, pol: 90 })], 0);
        await s.advanceSeason();
        assert.isTrue(!s.roster.some((g) => g.id === 'dying'));
        assert.lengthEquals(1, events);
    });

    return suite;
}
