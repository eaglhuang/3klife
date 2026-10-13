/**
 * ReadModelValidators — 虎符 / 英靈卡 / 出征編制 / 戰場狀態 read model 的 headless 測試（DS-06）
 */
import { TestSuite, assert } from './TestRunner';
import {
    BattleStateReadModel, SpiritCardEntry, TalismanInventoryEntry,
    validateBattleStateReadModel, validateSortieLoadoutReadModel, validateSpiritCards, validateTalismanInventory,
} from '../assets/scripts/core/systems/ReadModelValidators';

function tally(id: string, holder: string | null, source: TalismanInventoryEntry['Source_Type'] = 'WarConquest'): TalismanInventoryEntry {
    return {
        Tally_ID: id, Quality: 'SSR', TigerTallyScore: 78, Star: 3, Star_Exp: 0,
        Source_Template_ID: 'T', Source_General_UID: 'G', Source_Type: source,
        Equipped_General_UID: holder, Acquired_Season: 1, Is_Displayed: true,
    };
}

function spirit(id: string, holder: string | null, role: SpiritCardEntry['Card_Role'] = 'MAIN'): SpiritCardEntry {
    return {
        Spirit_ID: id, General_Template_ID: 'T', Spirit_Family_Key: 'FAMILY_ZHANG', LineageScore: 1,
        Card_Role: role, Family_Primary_Flag: true, Equipped_General_UID: holder,
        Slot_Type: 'DESTINY', Display_Bucket: 'DESTINY_SLOT', DualEquip_Allowed: true,
    };
}

const BATTLE: BattleStateReadModel = {
    Current_Food: 9700, Max_Food: 13200, Current_Tactic_Points: 21, Max_Tactic_Points: 48,
    Elite_Deploy_Cap: 3, Active_Elite_Count: 2, Strategist_UID: 'S', Deputy_UID: 'D',
};

export function createReadModelValidatorsSuite(): TestSuite {
    const suite = new TestSuite('ReadModelValidators (DS-06 read model)');

    suite.test('虎符表：合法資料通過；鍵與 Tally_ID 不一致、來源不在三種內會被擋', () => {
        assert.isTrue(validateTalismanInventory({ TALLY_1: tally('TALLY_1', 'liu'), TALLY_2: tally('TALLY_2', null) }).ok);
        const mismatch = validateTalismanInventory({ TALLY_1: tally('TALLY_9', null) });
        assert.isTrue(mismatch.issues.includes('ID_MISMATCH'));
        const badSource = validateTalismanInventory({ TALLY_1: tally('TALLY_1', null, 'Retire' as TalismanInventoryEntry['Source_Type']) });
        assert.isTrue(badSource.issues.includes('BAD_SOURCE_TYPE'));
    });

    suite.test('虎符表：一將一符，同一武將掛兩張會被擋', () => {
        const check = validateTalismanInventory({ TALLY_1: tally('TALLY_1', 'liu'), TALLY_2: tally('TALLY_2', 'liu') });
        assert.isFalse(check.ok);
        assert.isTrue(check.issues.includes('GENERAL_HAS_TALLY'));
    });

    suite.test('英靈卡：合法資料通過；Card_Role 只允許 MAIN / BACKUP；一將一命', () => {
        assert.isTrue(validateSpiritCards({ SPIRIT_1: spirit('SPIRIT_1', 'liu', 'MAIN'), SPIRIT_2: spirit('SPIRIT_2', 'guan', 'BACKUP') }).ok);
        const badRole = validateSpiritCards({ SPIRIT_1: spirit('SPIRIT_1', null, 'OTHER' as SpiritCardEntry['Card_Role']) });
        assert.isTrue(badRole.issues.includes('BAD_CARD_ROLE'));
        const dual = validateSpiritCards({ SPIRIT_1: spirit('SPIRIT_1', 'liu'), SPIRIT_2: spirit('SPIRIT_2', 'liu', 'BACKUP') });
        assert.isTrue(dual.issues.includes('GENERAL_HAS_SPIRIT'));
    });

    suite.test('出征編制：主將必填，三角色不重覆', () => {
        assert.isTrue(validateSortieLoadoutReadModel({ Commander_UID: 'A', Strategist_UID: 'B', Deputy_UID: 'C' }).ok);
        assert.isTrue(validateSortieLoadoutReadModel({ Commander_UID: 'A', Strategist_UID: null, Deputy_UID: null }).ok, '支援角色可空');
        const dup = validateSortieLoadoutReadModel({ Commander_UID: 'A', Strategist_UID: 'A', Deputy_UID: null });
        assert.isTrue(dup.issues.includes('ROLE_DUPLICATE'));
        const noCommander = validateSortieLoadoutReadModel({ Commander_UID: '', Strategist_UID: null, Deputy_UID: null });
        assert.isTrue(noCommander.issues.includes('MISSING_COMMANDER'));
    });

    suite.test('戰場狀態：合法資料通過；糧草、計謀點、精銳超過上限或參謀後勤重覆會被擋', () => {
        assert.isTrue(validateBattleStateReadModel(BATTLE).ok);
        assert.isTrue(validateBattleStateReadModel({ ...BATTLE, Current_Food: 99999 }).issues.includes('FOOD_OVER_MAX'));
        assert.isTrue(validateBattleStateReadModel({ ...BATTLE, Current_Tactic_Points: 99 }).issues.includes('TACTIC_OVER_MAX'));
        assert.isTrue(validateBattleStateReadModel({ ...BATTLE, Active_Elite_Count: 4 }).issues.includes('ELITE_OVER_CAP'));
        assert.isTrue(validateBattleStateReadModel({ ...BATTLE, Deputy_UID: 'S' }).issues.includes('ROLE_DUPLICATE'));
    });

    return suite;
}
