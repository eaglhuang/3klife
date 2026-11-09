/**
 * BattleAutoResolve.test.ts — 戰鬥自動鈕數值結算（PROG-2-1091）headless 測試
 *
 * 驗證：戰力組成、強弱分明時勝負、接近時平手、陣亡主將不計、戰場 HUD 自動鈕有接收端。
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyOpeningWinGuarantee, autoResolveOutcome, dominantTroopType, quickResolveOutcome, rollQuickSpotlights, sidePower, troopCounterMultiplier,
    type AutoResolveSide,
} from '../assets/scripts/battle/runtime/BattleAutoResolve';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const general = (power: number, hp = 1000) => ({ str: power, int: power, lea: power, currentHp: hp, maxHp: 1000 });
const side = (power: number, troops: AutoResolveSide['troops'] = [], fortressHp = 500): AutoResolveSide => ({ general: general(power), troops, fortressHp });
const fixed = (value: number) => () => value;

export function createBattleAutoResolveSuite(): TestSuite {
    const suite = new TestSuite('BattleAutoResolve (戰鬥自動結算 PROG-2-1091)');

    suite.test('戰力 = 主將加權 ×10 × 血量比 + 部隊 + 城寨/5', () => {
        assert.equals(1000 + 100, sidePower(side(100)));
        assert.equals(500 + 100, sidePower({ general: general(100, 500), troops: [], fortressHp: 500 }));
        assert.equals(100 + 100 / 10 + 40 / 2, sidePower({ general: null, troops: [{ currentHp: 100, attack: 40 }], fortressHp: 500 }));
    });

    suite.test('強方勝、弱方敗；同浮動下戰力接近判平手', () => {
        assert.equals('player-win', autoResolveOutcome(side(95), side(60), fixed(0.5)).result);
        assert.equals('enemy-win', autoResolveOutcome(side(60), side(95), fixed(0.5)).result);
        assert.equals('draw', autoResolveOutcome(side(80), side(81), fixed(0.5)).result);
    });

    suite.test('主將陣亡只剩部隊與城寨；浮動極值仍可逆轉小差距', () => {
        const dead = autoResolveOutcome({ general: general(99, 0), troops: [], fortressHp: 500 }, side(50), fixed(0.5));
        assert.equals('enemy-win', dead.result);
        let n = 0;
        const swing = autoResolveOutcome(side(80), side(88), () => (n++ === 0 ? 1 : 0));
        assert.equals('player-win', swing.result);
    });

    suite.test('戰場 UI 橋接有接 AutoBattleToggled，並走 BattleEnded', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        assert.equals(true, src.includes('EVENT_NAMES.AutoBattleToggled'));
        assert.equals(true, src.includes('quickResolveOutcome('));
        assert.equals(true, src.includes('quick.reportLines'));
    });

    suite.test('首戰保證勝：未首勝時敗、和改判勝；已首勝照原結果', () => {
        const lose = autoResolveOutcome(side(60), side(95), fixed(0.5));
        const draw = autoResolveOutcome(side(80), side(81), fixed(0.5));
        assert.equals('player-win', applyOpeningWinGuarantee(lose, false).result);
        assert.equals('player-win', applyOpeningWinGuarantee(draw, false).result);
        assert.equals(lose.enemyPower, applyOpeningWinGuarantee(lose, false).enemyPower);
        assert.equals('enemy-win', applyOpeningWinGuarantee(lose, true).result);
    });

    suite.test('極速決戰：魅力參與加權，缺值時用武統智平均（舊結果不變）', () => {
        const g = { str: 80, int: 80, lea: 80, cha: 40, currentHp: 1000, maxHp: 1000 };
        assert.equals(Math.round((80 * 0.9 + 4) * 10), sidePower({ general: g, troops: [], fortressHp: 0 }));
        assert.equals(800, sidePower({ general: general(80), troops: [], fortressHp: 0 }));
    });

    suite.test('極速決戰：兵種互克以最多兵種比較，騎剋步、步剋弓、弓剋騎', () => {
        const t = (type: string, hp = 100) => ({ currentHp: hp, attack: 10, type });
        assert.equals('cavalry', dominantTroopType([t('cavalry'), t('cavalry'), t('archer'), t('infantry', 0)]));
        assert.isTrue(dominantTroopType([{ currentHp: 100, attack: 1 }]) === null);
        assert.equals(1.15, troopCounterMultiplier([t('cavalry')], [t('infantry')]));
        assert.equals(0.9, troopCounterMultiplier([t('cavalry')], [t('archer')]));
        assert.equals(1.15, troopCounterMultiplier([t('infantry')], [t('archer')]));
        assert.equals(1, troopCounterMultiplier([t('shield')], [t('archer')]));
        assert.equals(1, troopCounterMultiplier([], [t('archer')]));
    });

    suite.test('極速決戰：主將特寫依門檻與機率觸發，陣亡不觸發', () => {
        const hero = { str: 97, int: 92, lea: 90, cha: 88, currentHp: 1000, maxHp: 1000 };
        assert.equals('DUEL,AMBUSH,RALLY', rollQuickSpotlights(hero, fixed(0.2)).join(','));
        assert.equals('DUEL,AMBUSH', rollQuickSpotlights(hero, fixed(0.3)).join(','), '0.3 超過義旗 25%');
        assert.equals('', rollQuickSpotlights(hero, fixed(0.4)).join(','), '機率是嚴格小於');
        assert.equals('', rollQuickSpotlights({ ...hero, str: 89, int: 89, cha: 84 }, fixed(0)).join(','));
        assert.equals('', rollQuickSpotlights({ ...hero, currentHp: 0 }, fixed(0)).join(','));
        assert.equals('', rollQuickSpotlights(null, fixed(0)).join(','));
    });

    suite.test('極速決戰 TC-AUTOBATTLE-01：關羽對均勢敵軍觸發陣前斬將並獲勝，戰報三幕', () => {
        const guanYu = { str: 97, int: 75, lea: 95, cha: 90, currentHp: 1000, maxHp: 1000, name: '關羽' };
        const enemy = { str: 86, int: 86, lea: 86, cha: 86, currentHp: 1000, maxHp: 1000 };
        let n = 0;
        // 依序：斬將 0.1（中）→ 義旗 0.9（不中）→ 浮動 0.5、0.5
        const seq = [0.1, 0.9, 0.5, 0.5];
        const out = quickResolveOutcome({ general: guanYu, troops: [], fortressHp: 500 }, { general: enemy, troops: [], fortressHp: 500 }, () => seq[n++]);
        assert.equals('DUEL', out.spotlights.join(','));
        assert.equals('player-win', out.result);
        assert.isTrue(out.reportLines[0].startsWith('前哨戰'));
        assert.isTrue(out.reportLines.some((l) => l.startsWith('【陣前斬將】關羽')));
        assert.isTrue(out.reportLines[out.reportLines.length - 1].startsWith('終局定勢'));
        assert.equals(4, n, '亂數只用 4 次');
    });

    suite.test('極速決戰：碾壓必勝、劣勢必敗、均勢可能平手', () => {
        const mid = fixed(0.5);
        const strong = { general: general(99), troops: [], fortressHp: 500 };
        const weak = { general: general(30), troops: [], fortressHp: 500 };
        assert.equals('player-win', quickResolveOutcome(strong, weak, () => 0).result);
        assert.equals('enemy-win', quickResolveOutcome(weak, strong, () => 0.99).result);
        assert.equals('draw', quickResolveOutcome(side(70), side(70), mid).result);
    });

    return suite;
}
