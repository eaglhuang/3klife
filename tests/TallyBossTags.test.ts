/**
 * TallyBossTags.test.ts — 賽季虎符連動：克制標籤與 BOSS 弱點命中（名將挑戰賽 E-10，PROG-2-1356）
 */
import { assert, TestSuite } from './TestRunner';
import { tallyBossMatch, tallyBossMatchText, tallyBossTags } from '../assets/scripts/core/systems/TallyBossTags';
import type { TournamentSeasonBoss } from '../assets/scripts/core/systems/TournamentLocal';
import { TournamentPanelController } from '../assets/scripts/ui/core/TournamentPanelController';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

const boss: TournamentSeasonBoss = { bossId: 'b', name: '連環戰船', weaknessTags: ['FIRE', 'RANGED'], basePower: 10000 };

export function createTallyBossTagsSuite(): TestSuite {
    const suite = new TestSuite('TallyBossTags (賽季虎符連動 PROG-2-1356)');

    suite.test('明確標籤優先，濾掉不認得的標籤並去重', () => {
        assert.equals('SLOW', tallyBossTags({ troopType: 'archer', bossTags: ['SLOW', 'BOGUS', 'SLOW'] }).join(','));
    });

    suite.test('沒有明確標籤時依兵種推得；對照表外不帶標籤', () => {
        assert.equals('RANGED', tallyBossTags({ troopType: 'archer' }).join(','));
        assert.equals('ANTI_CAVALRY', tallyBossTags({ troopType: 'pikeman', bossTags: [] }).join(','));
        assert.equals(0, tallyBossTags({ troopType: 'cavalry' }).length);
        assert.equals(0, tallyBossTags({}).length);
    });

    suite.test('命中統計與文字', () => {
        const match = tallyBossMatch([{ troopType: 'archer' }, { troopType: 'navy' }, { troopType: 'cavalry' }, { troopType: 'archer' }], boss);
        assert.equals(3, match.matchedCount);
        assert.equals('FIRE,RANGED', match.matchedTags.join(','));
        assert.equals('虎符命中 3 張（火攻、遠射）', tallyBossMatchText(match));
        assert.equals('虎符命中 0 張，可配置克制陣容', tallyBossMatchText(tallyBossMatch([{ troopType: 'shield' }], boss)));
    });

    suite.test('挑戰賽彈窗 BOSS 列附命中張數；未提供虎符時維持原文', () => {
        const status = {
            seasonIndex: 1, phase: 'PREPARATION', daysLeft: 14, points: 0, tier: 'BRONZE', entriesLeftToday: 0, team: null,
            venue: { cupName: '赤壁盃', terrain: 'river', weather: 'wind', boss },
        };
        const base = {
            now: () => 0,
            status: () => status as never,
            register: () => ({ ok: true }),
            play: () => ({ ok: true }),
            generalName: () => undefined,
            pendingRewards: () => [],
            claimRewards: () => ({ claimed: 0 }) as never,
        };
        const plain = new TournamentPanelController(base as never).getFlowView().texts.trnBossLabel;
        assert.equals('賽季 BOSS：連環戰船（弱點：火攻、遠射）', plain);
        const cards = [{ troopType: 'engineer' }] as unknown as TigerTallyCard[];
        const withTallies = new TournamentPanelController({ ...base, tallies: () => cards } as never).getFlowView().texts.trnBossLabel;
        assert.equals('賽季 BOSS：連環戰船（弱點：火攻、遠射）｜虎符命中 1 張（火攻）', withTallies);
    });

    return suite;
}
