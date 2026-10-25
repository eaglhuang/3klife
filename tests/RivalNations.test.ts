/**
 * RivalNations.test.ts — 他國 AI 勢力核心（PROG-2-1087）headless 測試
 *
 * 驗證：勢力君主都在武將資料裡、初始邦交、送禮／結盟／宣戰的條件、季度回歸與進攻、
 * 自動模擬戰鬥的勝負與結算、存檔正規化。
 */
import { TestSuite, assert } from './TestRunner';
import {
    ALLIANCE_MIN_RELATION, GIFT_GOLD_COST, GIFT_RELATION_GAIN, NATION_DEFS,
    advanceRivalSeason, autoResolveBattle, createRivalWorld, declareWar, normalizeRivalWorld,
    proposeAlliance, relationTier, sendGift,
} from '../assets/scripts/core/systems/RivalNations';
import type { RivalWorld } from '../assets/scripts/core/systems/RivalNations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

const nation = (world: RivalWorld, id: string) => world.nations.find((n) => n.id === id)!;
const fixed = (value: number) => () => value;
const STRONG = [
    { name: '關羽', str: 97, int: 75, lea: 95 },
    { name: '張飛', str: 98, int: 30, lea: 85 },
];

export function createRivalNationsSuite(): TestSuite {
    const suite = new TestSuite('RivalNations (他國 AI 勢力核心 PROG-2-1087)');

    suite.test('8 個勢力的君主都在 generals.json；魏起手冷淡（史實宿敵 -30），蜀起手中立偏友好（+20）', () => {
        const ids = new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as Array<{ id: string }>).map((g) => g.id));
        assert.equals(8, NATION_DEFS.length);
        for (const def of NATION_DEFS) assert.equals(true, ids.has(def.leaderId), `${def.leaderId} 要存在`);
        const world = createRivalWorld();
        assert.equals('cold', relationTier(nation(world, 'wei')));
        assert.equals('neutral', relationTier(nation(world, 'shu')));
    });

    suite.test('送禮：扣金幣、邦交上升；金幣不足或宿敵時失敗', () => {
        const world = createRivalWorld();
        const ok = sendGift(world, 'yuan', GIFT_GOLD_COST);
        assert.equals(true, ok.ok);
        assert.equals(GIFT_GOLD_COST, ok.goldSpent);
        assert.equals(GIFT_RELATION_GAIN, nation(ok.world, 'yuan').relation);
        assert.equals(false, sendGift(world, 'yuan', GIFT_GOLD_COST - 1).ok);
        const war = declareWar(world, 'yuan').world;
        assert.equals(false, sendGift(war, 'yuan', 99999).ok, '宿敵拒收');
    });

    suite.test('結盟：邦交未達門檻失敗；送禮到門檻後成功；呂布永不結盟', () => {
        let world = createRivalWorld();
        assert.equals(false, proposeAlliance(world, 'shu').ok);
        while (nation(world, 'shu').relation < ALLIANCE_MIN_RELATION) world = sendGift(world, 'shu', GIFT_GOLD_COST).world;
        const allied = proposeAlliance(world, 'shu');
        assert.equals(true, allied.ok);
        assert.equals('ally', relationTier(nation(allied.world, 'shu')));
        let lvbu = createRivalWorld();
        for (let i = 0; i < 10; i++) lvbu = sendGift(lvbu, 'lvbu', GIFT_GOLD_COST).world;
        assert.equals(false, proposeAlliance(lvbu, 'lvbu').ok);
    });

    suite.test('季度推進：邦交向 0 回歸；交戰中的好戰勢力會來犯；同盟不來犯', () => {
        const world = createRivalWorld();
        const tick = advanceRivalSeason(world, fixed(0.99));
        assert.equals(-28, nation(tick.world, 'wei').relation);
        assert.equals(18, nation(tick.world, 'shu').relation);
        assert.equals(0, tick.events.length, '擲 0.99 不觸發進攻');
        const war = declareWar(world, 'lvbu').world;
        const attacked = advanceRivalSeason(war, fixed(0.1));
        assert.equals(true, attacked.events.some((e) => e.nationId === 'lvbu'));
        assert.equals(-100, nation(attacked.world, 'lvbu').relation, '交戰中不回歸');
        assert.equals(false, attacked.events.some((e) => e.nationId === 'shu'));
    });

    suite.test('自動模擬戰鬥：強將打劉璋必勝並奪地；無人出戰必敗；同亂數結果固定', () => {
        const world = createRivalWorld();
        const win = autoResolveBattle(world, 'liuzhang', STRONG, fixed(0.5));
        assert.equals(true, win.win);
        assert.equals(true, win.territoryGained);
        assert.equals(1, nation(win.world, 'liuzhang').territories);
        assert.equals(true, win.goldReward > 0);
        assert.equals(true, nation(win.world, 'liuzhang').atWar);
        assert.equals(3, win.lines.length);
        const lose = autoResolveBattle(world, 'wei', [], fixed(0.5));
        assert.equals(false, lose.win);
        assert.equals(0, lose.goldReward);
        assert.equals(JSON.stringify(win), JSON.stringify(autoResolveBattle(world, 'liuzhang', STRONG, fixed(0.5))));
    });

    suite.test('存檔正規化：缺的勢力補初始值、未知勢力丟棄、邦交夾在 ±100', () => {
        const world = normalizeRivalWorld({ nations: [{ id: 'wei', relation: -500, troops: 123, allied: true }, { id: 'bogus' }] });
        assert.equals(8, world.nations.length);
        assert.equals(-100, nation(world, 'wei').relation);
        assert.equals(123, nation(world, 'wei').troops);
        assert.equals(true, nation(world, 'wei').allied);
        assert.equals(JSON.stringify(createRivalWorld()), JSON.stringify(normalizeRivalWorld(null)));
    });

    return suite;
}
