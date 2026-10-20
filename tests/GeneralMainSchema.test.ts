/**
 * GeneralMainSchema — 武將主結構（規格用語）欄位契約（DS-02，PROG-2-0497）
 *
 * 驗證重點：
 *   1. 規格 §二.1 的 22 個頂層欄位都在契約清單內
 *   2. 規格形狀的完整武將通過；缺欄位不報錯（尚未補資料的欄位不擋載入）
 *   3. Talent_Stats / Prowess_Stats / Profile_Presentation 的列舉與形狀規則
 *   4. 覆蓋率計數只數「有值」的欄位
 */
import { assert, TestSuite } from './TestRunner';
import {
    GENERAL_MAIN_KNOWN_DIFFERENCES,
    GENERAL_MAIN_SPEC_FIELDS,
    GeneralMainRecord,
    countSpecFieldCoverage,
    validateGeneralMainFields,
} from '../assets/scripts/core/models/GeneralMainSchema';

const SIX = ['STR', 'INT', 'LEA', 'POL', 'CHA', 'LUK'] as const;

function talentStats(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of SIX) {
        result[key] = { Base: 60, Current: 62, Max_Potential: 80, Revelation_Level: 'RANGE' };
    }
    return { ...result, ...overrides };
}

function prowessStats(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        STR: 1582, INT: 1018, LEA: 1460, POL: 688, CHA: 1215, LUK: 760,
        Overall_Rank: 'SS',
        Source_Session_ID: null,
        ...overrides,
    };
}

function specRecord(overrides: GeneralMainRecord = {}): GeneralMainRecord {
    return {
        Template_ID: 'Zhao_Yun_V1',
        Bloodline_ID: 'BL_ZhaoYun',
        Phase: 'Peak',
        Status: 'Active',
        Role: 'Combat',
        Has_Retired_Before: false,
        Female_Role_Type: 'COMBAT',
        Stats: { STR: 92, INT: 68, LEA: 91, POL: 45, CHA: 80, LUK: 78 },
        Talent_Stats: talentStats(),
        Prowess_Stats: prowessStats(),
        Personality: { Type: 'Loyal', Description: '重情重義，人脈廣布' },
        Loyalty: { Value: 100, Is_Locked: true, Source_Type: 'Gacha' },
        Recent_Log: { Timestamp: '2026-04-14 05:00', Narrative: '…', Impact: 'STAT_BOOST' },
        Current_Suitability: { Task_ID: 'M_001', Task_Name: '夜襲曹營', Reason: '夜戰因子' },
        Vitality: 65,
        Vitality_Max: 100,
        Genes: [{ Type: 'Blue', ID: 'BLUE_STR_05', Level: 5, Is_Locked: false, Discovery_Level: 1 }],
        Father_ID: 'V_PID_ZY01_F',
        Mother_ID: null,
        Core_Tags: ['長槍', '北境', '騎兵'],
        Ancestors_JSON: { Generation_1: { Father: {}, Mother: {} } },
        Profile_Presentation: {
            Default_Tab: 'Overview',
            Crest_State: 'revealed',
            Bloodline_StoryDock_State: 'HALF',
            Story_Strip_Cells: {
                origin: '常山出身',
                faction: '蜀軍白馬前鋒',
                role: '突擊 / 救援',
                awakening: '白龍命紋逐步顯現',
                bloodline: '家族血脈與守護傾向相連',
                future: '可往全能統軍核心培養',
            },
        },
        ...overrides,
    };
}

export function createGeneralMainSchemaSuite(): TestSuite {
    const suite = new TestSuite('GeneralMainSchema (武將主結構欄位契約 DS-02)');

    suite.test('契約清單涵蓋規格 §二.1 全部 22 個頂層欄位', () => {
        assert.equals(22, GENERAL_MAIN_SPEC_FIELDS.length);
        assert.isTrue(GENERAL_MAIN_SPEC_FIELDS.includes('Talent_Stats'));
        assert.isTrue(GENERAL_MAIN_SPEC_FIELDS.includes('Profile_Presentation'));
    });

    suite.test('規格形狀的完整武將通過驗證', () => {
        assert.equals(0, validateGeneralMainFields(specRecord()).length);
    });

    suite.test('空物件通過：缺欄位不報錯，尚未補資料的武將不會被擋下', () => {
        assert.equals(0, validateGeneralMainFields({}).length);
    });

    suite.test('Revelation_Level 只允許 HIDDEN / TENDENCY / RANGE / EXACT', () => {
        const bad = specRecord({ Talent_Stats: talentStats({ STR: { Base: 1, Current: 1, Max_Potential: 2, Revelation_Level: 'SECRET' } }) });
        assert.isTrue(validateGeneralMainFields(bad).some((e) => e.includes('Talent_Stats.STR.Revelation_Level')));
    });

    suite.test('Talent_Stats 缺屬性、Base 超過 Max_Potential 都會回報', () => {
        const missing = talentStats();
        delete missing.LUK;
        assert.isTrue(validateGeneralMainFields(specRecord({ Talent_Stats: missing })).some((e) => e.includes('Talent_Stats.LUK')));

        const over = specRecord({ Talent_Stats: talentStats({ INT: { Base: 90, Current: 70, Max_Potential: 88, Revelation_Level: 'RANGE' } }) });
        assert.isTrue(validateGeneralMainFields(over).some((e) => e.includes('Base 超過 Max_Potential')));
    });

    suite.test('Prowess_Stats：Source_Session_ID 可為 null（尚無畢業快照），數字缺失則回報', () => {
        assert.equals(0, validateGeneralMainFields(specRecord({ Prowess_Stats: prowessStats({ Source_Session_ID: null }) })).length);
        assert.equals(0, validateGeneralMainFields(specRecord({ Prowess_Stats: prowessStats({ Source_Session_ID: 'NS_0007' }) })).length);
        const broken = specRecord({ Prowess_Stats: prowessStats({ STR: 'high' }) });
        assert.isTrue(validateGeneralMainFields(broken).some((e) => e.startsWith('Prowess_Stats.STR')));
    });

    suite.test('Profile_Presentation：Default_Tab、故事條狀態列舉與六格槽位', () => {
        const badTab = specRecord({
            Profile_Presentation: { ...(specRecord().Profile_Presentation as object), Default_Tab: 'Summary' },
        });
        assert.isTrue(validateGeneralMainFields(badTab).some((e) => e.includes('Default_Tab')));

        const badDock = specRecord({
            Profile_Presentation: { ...(specRecord().Profile_Presentation as object), Bloodline_StoryDock_State: 'OPEN' },
        });
        assert.isTrue(validateGeneralMainFields(badDock).some((e) => e.includes('Bloodline_StoryDock_State')));

        const numbered = specRecord({
            Profile_Presentation: {
                Default_Tab: 'Overview',
                Bloodline_StoryDock_State: 'HALF',
                Story_Strip_Cells: { '1': '常山出身', '2': '蜀軍白馬前鋒' },
            },
        });
        const errors = validateGeneralMainFields(numbered);
        assert.isTrue(errors.some((e) => e.includes('缺少槽位')));
        assert.isTrue(errors.some((e) => e.includes('槽位外的 key')));
    });

    suite.test('Female_Role_Type、Has_Retired_Before、父母 ID 型別檢查', () => {
        assert.isTrue(validateGeneralMainFields(specRecord({ Female_Role_Type: 'MAGE' })).some((e) => e.startsWith('Female_Role_Type')));
        assert.isTrue(validateGeneralMainFields(specRecord({ Has_Retired_Before: 'yes' })).some((e) => e.startsWith('Has_Retired_Before')));
        assert.isTrue(validateGeneralMainFields(specRecord({ Father_ID: 42 })).some((e) => e.startsWith('Father_ID')));
    });

    suite.test('覆蓋率計數：只數有值的欄位（null 也算有值）', () => {
        const counts = countSpecFieldCoverage([specRecord(), {}, { Phase: 'Peak', Father_ID: null }]);
        assert.equals(1, counts.Template_ID);
        assert.equals(2, counts.Phase);
        assert.equals(2, counts.Father_ID);
        assert.equals(1, counts.Mother_ID);
        assert.equals(1, counts.Genes);
    });

    suite.test('已知差異涵蓋 Genes / Ancestors_JSON / Profile_Presentation 三項，且每項都有 adapter 說明與待裁決', () => {
        const fields = GENERAL_MAIN_KNOWN_DIFFERENCES.map((d) => d.specField).sort();
        assert.equals('Ancestors_JSON,Genes,Profile_Presentation', fields.join(','));
        for (const diff of GENERAL_MAIN_KNOWN_DIFFERENCES) {
            assert.isTrue(diff.adapterNote.length > 0, diff.specField);
            assert.isTrue(diff.pendingDecision.length > 0, diff.specField);
        }
    });

    return suite;
}

