/**
 * TallyDeployAffinity — 虎符部隊出陣的適性乘數管線（TRP-13）
 *
 * 目錄只有 4 張卡，規格的 3 張範例虎符（白馬義從、藤甲兵、常山女騎）還不在目錄裡，
 * 所以這裡用範例資料當 fixture，證明乘數確實不是 1，且會跟著地形變。
 */
import { assert, TestSuite } from './TestRunner';
import { resolveTallyDeployMod, toTallyCommander, TallyCommanderInfo } from '../assets/scripts/core/systems/TallyDeployAffinity';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TroopType } from '../assets/scripts/core/config/Constants';
import { Faction } from '../assets/scripts/shared/CommonEnums';
import { TallyAffinityProfile } from '../assets/scripts/shared/TallyCardContract';
import { TALLY_CLAN_BOND_MOD, TALLY_CLAN_RESONANCE_MOD, TALLY_GENDER_MATCH_MOD } from '../assets/scripts/core/systems/BattleModifiers';

/** 規格範例：白馬義從（PLAIN=S, DESERT=A, MOUNTAIN=D；無性別偏好） */
const WHITE_HORSE: TallyAffinityProfile = {
    terrainGrades: { plain: 'S', desert: 'A', mountain: 'D' },
    genderPref: 'NONE',
};

/** 規格範例：藤甲兵（FOREST=S, MOUNTAIN=A, DESERT=C） */
const RATTAN_ARMOR: TallyAffinityProfile = {
    terrainGrades: { forest: 'S', mountain: 'A', desert: 'C' },
    clanID: 'LIU',
    historicBonds: ['zhao-yun'],
};

/** 規格範例：常山女騎（FEMALE 偏好） */
const CHANGSHAN_FEMALE: TallyAffinityProfile = {
    genderPref: 'FEMALE',
};

const MALE_GENERAL: TallyCommanderInfo = { uid: 'g-male', gender: 'MALE' };
const FEMALE_GENERAL: TallyCommanderInfo = { uid: 'g-female', gender: 'FEMALE' };

function makeTroop(attack: number, defense: number): TroopUnit {
    return new TroopUnit('u1', TroopType.Cavalry, Faction.Player, { hp: 100, attack, defense });
}

export function createTallyDeployAffinitySuite(): TestSuite {
    const suite = new TestSuite('TallyDeployAffinity (虎符出陣適性乘數 TRP-13)');

    suite.test('沒有適性資料（null）→ 乘數 1，一般部隊戰力不變', () => {
        assert.equals(1, resolveTallyDeployMod(null, MALE_GENERAL, 'plain'));
        assert.equals(1, resolveTallyDeployMod(undefined, null, null));
    });

    suite.test('白馬義從：平原 S → ×1.2，山地 D → ×0.8，沒有主將不套性別', () => {
        assert.equals(1.2, resolveTallyDeployMod(WHITE_HORSE, MALE_GENERAL, 'plain'));
        assert.equals(0.8, resolveTallyDeployMod(WHITE_HORSE, MALE_GENERAL, 'mountain'));
        assert.equals(1.2, resolveTallyDeployMod(WHITE_HORSE, null, 'plain'));
    });

    suite.test('地形沒填或格子未知 → 預設 B（×1.0）', () => {
        assert.equals(1, resolveTallyDeployMod(WHITE_HORSE, MALE_GENERAL, 'forest'));
        assert.equals(1, resolveTallyDeployMod(WHITE_HORSE, MALE_GENERAL, null));
    });

    suite.test('藤甲兵：森林 S + 同家族 + 史實羈絆相乘；羈絆只對指定武將生效', () => {
        const bonded: TallyCommanderInfo = { uid: 'zhao-yun', gender: 'MALE', clanID: 'LIU' };
        const expected = 1.2 * (TALLY_CLAN_RESONANCE_MOD * TALLY_CLAN_BOND_MOD);
        assert.equals(expected, resolveTallyDeployMod(RATTAN_ARMOR, bonded, 'forest'));
        // 同家族但沒有羈絆
        const sameClanOnly: TallyCommanderInfo = { uid: 'g-other', gender: 'MALE', clanID: 'LIU' };
        assert.equals(1.2 * TALLY_CLAN_RESONANCE_MOD, resolveTallyDeployMod(RATTAN_ARMOR, sameClanOnly, 'forest'));
    });

    suite.test('常山女騎：女性主將 ×1.06，男性主將不加成', () => {
        assert.equals(TALLY_GENDER_MATCH_MOD, resolveTallyDeployMod(CHANGSHAN_FEMALE, FEMALE_GENERAL, 'plain'));
        assert.equals(1, resolveTallyDeployMod(CHANGSHAN_FEMALE, MALE_GENERAL, 'plain'));
    });

    suite.test('TroopUnit：虎符乘數跟著格子地形變（平原 ×1.2 → 山地 ×0.8 → 移動後即時反映）', () => {
        const troop = makeTroop(100, 50);
        const terrainAt: Record<string, string> = { '0,0': 'plain', '0,1': 'mountain' };
        troop.tallyAffinity = (lane, depth) =>
            resolveTallyDeployMod(WHITE_HORSE, MALE_GENERAL, terrainAt[`${lane},${depth}`] ?? null);

        assert.equals(120, troop.getEffectiveAttack());
        assert.equals(60, troop.getEffectiveDefense());

        troop.moveTo(0, 1);
        assert.equals(80, troop.getEffectiveAttack());
        assert.equals(40, troop.getEffectiveDefense());
    });

    suite.test('主將性別文字轉換：女／female／f → FEMALE，其餘 → MALE', () => {
        assert.equals('FEMALE', toTallyCommander('g1', '女').gender);
        assert.equals('FEMALE', toTallyCommander('g1', 'female').gender);
        assert.equals('MALE', toTallyCommander('g1', '男').gender);
        assert.equals('MALE', toTallyCommander('g1', undefined).gender);
        assert.equals('g1', toTallyCommander('g1', '男').uid);
    });

    suite.test('TroopUnit：沒有虎符時攻防與原本相同（乘數 1）', () => {
        const troop = makeTroop(100, 50);
        assert.equals(100, troop.getEffectiveAttack());
        assert.equals(50, troop.getEffectiveDefense());
        assert.isTrue(troop.tallyId === null && troop.commanderUid === null);
    });

    return suite;
}
