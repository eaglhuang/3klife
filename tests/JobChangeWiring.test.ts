import { assert, TestSuite } from './TestRunner';
import { applyJobChangeToRoster, primaryAbilityOf, JobWiringGeneral } from '../assets/scripts/core/systems/JobChangeWiring';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_JOB_CHANGE_ORDER } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function youth(id: string, extra: Partial<JobWiringGeneral> = {}): JobWiringGeneral {
    return { id, name: id, faction: 'shu', gender: '男', age: 20, hp: 1000, str: 80, lea: 60, int: 50, pol: 70,
        primaryClass: 'Warrior', ...extra } as unknown as JobWiringGeneral;
}

export function createJobChangeWiringSuite(): TestSuite {
    const suite = new TestSuite('JobChangeWiring (PROG-2-0226 20 歲轉職接線)');

    suite.test('主職能力：武官看武力與統率平均，文官看智識與政治平均；缺欄位只平均現有欄位', () => {
        const general = youth('liu');
        assert.equals(70, primaryAbilityOf(general, 'Warrior'));
        assert.equals(60, primaryAbilityOf(general, 'Scholar'));
        assert.equals(80, primaryAbilityOf({ ...general, lea: undefined }, 'Warrior'));
        assert.equals(0, primaryAbilityOf({ ...general, str: undefined, lea: undefined }, 'Warrior'));
    });

    suite.test('沒有主職資料或找不到武將時不轉職（回傳 null）', () => {
        assert.isTrue(applyJobChangeToRoster([youth('liu', { primaryClass: undefined })], 'liu', 'Scholar', 1) === null);
        assert.isTrue(applyJobChangeToRoster([youth('liu')], 'guan', 'Scholar', 1) === null);
    });

    suite.test('轉職令不足：不改名冊，回報 no-order', () => {
        const roster = [youth('liu')];
        const applied = applyJobChangeToRoster(roster, 'liu', 'Scholar', 0);
        assert.isFalse(applied!.result.ok);
        assert.equals('no-order', applied!.result.reason!);
        assert.isTrue(applied!.roster[0].subClass === undefined);
    });

    suite.test('GameSession：未滿 20 歲拒絕且不扣轉職令', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([youth('liu', { age: 19 }) as unknown as GeneralConfig]));
        await session.addItem(ITEM_JOB_CHANGE_ORDER, 1);
        const result = await session.changeJob('liu', 'Scholar');
        assert.equals('too-young', result!.reason!);
        assert.equals(1, session.itemCount(ITEM_JOB_CHANGE_ORDER));
    });

    suite.test('GameSession：20 歲轉職扣 1 張轉職令、寫入副職與副職能力，並隨存檔保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([youth('liu') as unknown as GeneralConfig]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.addItem(ITEM_JOB_CHANGE_ORDER, 1);

        const ok = await session.changeJob('liu', 'Scholar');
        assert.isTrue(ok!.ok);
        assert.equals(0, session.itemCount(ITEM_JOB_CHANGE_ORDER));
        const changed = session.roster[0] as JobWiringGeneral;
        assert.equals('Scholar', changed.subClass!);
        assert.equals(Math.floor(70 * 0.6), changed.subClassAbility!);

        await session.save();
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals('Scholar', (restored.roster[0] as JobWiringGeneral).subClass!);
    });

    return suite;
}
