/**
 * BattleAutoResolve.test.ts — 戰鬥自動鈕數值結算（PROG-2-1091）headless 測試
 *
 * 驗證：戰力組成、強弱分明時勝負、接近時平手、陣亡主將不計、戰場 HUD 自動鈕有接收端。
 */
import { TestSuite, assert } from './TestRunner';
import { autoResolveOutcome, sidePower, type AutoResolveSide } from '../assets/scripts/battle/runtime/BattleAutoResolve';

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
        assert.equals(true, src.includes('autoResolveOutcome('));
    });

    return suite;
}
