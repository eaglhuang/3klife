/**
 * StarterHeroChoice — O-02 開局名將三選一 (PROG-2-9951) 測試
 *
 * 驗證：
 * 1. 候選名單為 趙雲／關羽／諸葛亮。
 * 2. 選中任一位作為 coreGeneralId 時，buildStarterRoster 能將其加入名冊且置於首位。
 */
import { TestSuite, assert } from './TestRunner';
import {
    OPENING_HERO_CHOICE_IDS,
    buildStarterHeroChoiceOptions,
    getStarterHeroChoiceConfig,
    isOpeningHeroChoiceId,
} from '../assets/scripts/core/services/StarterHeroChoiceService';
import { buildStarterRoster } from '../assets/scripts/core/services/StarterRosterService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeMockGeneral(id: string, name: string, str = 90, int = 80, lea = 90): GeneralConfig {
    return {
        id,
        name,
        faction: 'shu',
        rarityTier: 'legendary',
        characterCategory: 'hero',
        ep: 100,
        str,
        int,
        lea,
        pol: 75,
        cha: 88,
        luk: 80,
        genes: [],
    } as unknown as GeneralConfig;
}

export function createStarterHeroChoiceSuite(): TestSuite {
    const suite = new TestSuite('StarterHeroChoice (O-02 開局名將三選一 PROG-2-9951)');

    suite.test('開局名將三選一預設清單為趙雲、關羽、諸葛亮', () => {
        const cfg = getStarterHeroChoiceConfig();
        assert.equals(cfg.candidates.length, 3);
        assert.equals(cfg.candidates.map(c => c.id).join(','), 'zhao-yun,guan-yu,zhuge-liang');
        assert.isTrue(isOpeningHeroChoiceId('zhao-yun'));
        assert.isTrue(isOpeningHeroChoiceId('guan-yu'));
        assert.isTrue(isOpeningHeroChoiceId('zhuge-liang'));
        assert.isTrue(!isOpeningHeroChoiceId('zhang-fei'));
    });

    suite.test('buildStarterHeroChoiceOptions 正確對應能力數值與稱號', () => {
        const generals = [
            makeMockGeneral('zhao-yun', '趙雲', 96, 82, 93),
            makeMockGeneral('guan-yu', '關羽', 97, 76, 92),
            makeMockGeneral('zhuge-liang', '諸葛亮', 45, 100, 96),
        ];
        const options = buildStarterHeroChoiceOptions(generals);
        assert.equals(options.length, 3);
        assert.equals(options[0].name, '趙雲');
        assert.equals(options[2].int, 100);
    });

    suite.test('選中開局名將後 buildStarterRoster 將其納入名冊並作為核心', () => {
        const generals = [
            makeMockGeneral('zhao-yun', '趙雲'),
            makeMockGeneral('guan-yu', '關羽'),
            makeMockGeneral('zhuge-liang', '諸葛亮'),
            makeMockGeneral('zhang-fei', '張飛'),
            makeMockGeneral('wei-yan', '魏延'),
            makeMockGeneral('xiahou-dun', '夏侯惇'),
            makeMockGeneral('zhang-he', '張郃'),
            makeMockGeneral('sun-ce', '孫策'),
            makeMockGeneral('gan-ning', '甘寧'),
        ];
        for (const picked of OPENING_HERO_CHOICE_IDS) {
            const roster = buildStarterRoster(generals, { coreGeneralId: picked });
            assert.equals(roster[0].id, picked);
            assert.isTrue(roster.some(g => g.id === picked));
        }
    });

    return suite;
}
