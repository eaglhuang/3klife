/**
 * GeneralWeaponVfx.test.ts — 武將武器推算（劍／弓可播）、暴擊命中光參數與接線檢查。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { weaponByAptitude, weaponOfGeneral } from '../assets/scripts/battle/shared/GeneralWeapon';
import { TestSuite, assert } from './TestRunner';

const cfg = JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/attack-vfx.json'), 'utf8'));
const generals: Array<{ id: string; role?: string; troopAptitude?: Record<string, string> }> =
    JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/generals.json'), 'utf8'));
const player = readFileSync(join(__dirname, '../assets/scripts/battle/views/AttackVfxPlayer.ts'), 'utf8');
const renderer = readFileSync(join(__dirname, '../assets/scripts/battle/views/UnitRenderer.ts'), 'utf8');
const bridge = readFileSync(join(__dirname, '../assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');

const FB = cfg.fallback;

function weaponFor(id: string): string {
    const g = generals.find(x => x.id === id);
    assert.isTrue(!!g, `generals.json 缺少 ${id}`);
    return weaponOfGeneral(FB, g!);
}

export function createGeneralWeaponVfxSuite(): TestSuite {
    const suite = new TestSuite('GeneralWeaponVfx');

    suite.test('推算規則：弓兵適性最高且至少 A → 弓；步兵適性最高（含並列）→ 劍；支援型 → 法術；其餘戰將 → 刀', () => {
        assert.equals('bow', weaponOfGeneral(FB, { role: 'Combat', troopAptitude: { ARCHER: 'A', INFANTRY: 'B', CAVALRY: 'C' } }));
        assert.equals('sword', weaponOfGeneral(FB, { role: 'Combat', troopAptitude: { INFANTRY: 'A', ARCHER: 'C', CAVALRY: 'B' } }));
        // 弓兵只到 B（低於 bowMinGrade=A）不算弓；步兵與弓兵並列最高時以步兵為劍
        assert.equals('sword', weaponOfGeneral(FB, { role: 'Combat', troopAptitude: { ARCHER: 'B', INFANTRY: 'B' } }));
        assert.equals('blade', weaponOfGeneral(FB, { role: 'Combat', troopAptitude: { CAVALRY: 'S', INFANTRY: 'A' } }));
        assert.equals('cast', weaponOfGeneral(FB, { role: 'Support', troopAptitude: { INFANTRY: 'S' } }));
        assert.equals('blade', weaponOfGeneral(FB, { role: 'Combat' }));
        assert.equals('blade', weaponOfGeneral(FB, {}));
    });

    suite.test('適性推算沒有適性資料時回 null（不誤判）', () => {
        assert.isTrue(weaponByAptitude(FB.aptitudeRule, undefined) === null, '無適性應回 null');
        assert.isTrue(weaponByAptitude(FB.aptitudeRule, {}) === null, '空適性應回 null');
        assert.isTrue(weaponByAptitude(FB.aptitudeRule, { INFANTRY: 'D' }) === null, '最高為 D 不應推算為劍');
    });

    suite.test('全部 235 名武將推算出的武器都有模板可播；劍與弓真的會有人用到', () => {
        const counts: Record<string, number> = {};
        for (const g of generals) {
            const w = weaponOfGeneral(FB, g);
            assert.isTrue(!!cfg.generalTemplates[w], `武器 ${w} 沒有模板（武將 ${g.id}）`);
            counts[w] = (counts[w] ?? 0) + 1;
        }
        assert.isTrue((counts.sword ?? 0) > 0, '應有武將推算為劍');
        assert.isTrue((counts.bow ?? 0) >= 1, '應有武將推算為弓（例：孫尚香）');
        assert.equals('bow', weaponFor('sun-shang-xiang'));
        assert.equals('blade', weaponFor('zhang-fei'), '張飛騎兵最高，維持刀');
        assert.equals('cast', weaponFor('zhuge-liang'), '諸葛亮為支援型，推算為法術');
    });

    suite.test('暴擊命中光：JSON 有 critBurst，金色偏暖、比一般閃光大', () => {
        const b = cfg.critBurst;
        assert.equals('critBurst', b.kind);
        const hex = (h: string): number[] => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const [r, g, bl] = hex(b.palette.main);
        assert.isTrue(r > 200 && g > 150 && bl < 120, `主色應為金色，實際 ${b.palette.main}`);
        const normalFlash = cfg.generalTemplates.blade.flashScale as number;
        assert.isTrue(b.flashScale > normalFlash, `暴擊閃光應比一般（${normalFlash}）大，實際 ${b.flashScale}`);
        assert.isTrue(b.durationSec > 0 && b.durationSec <= 0.2, '暴擊光不可拖太久');
    });

    suite.test('接線：播放器有 critBurst 分支與 playCrit；單位與主將命中帶 crit；命中後有微頓幀', () => {
        assert.isTrue(/case 'critBurst'/.test(player), '播放器需畫 critBurst');
        assert.isTrue(/public playCrit\(/.test(player), '播放器需提供 playCrit');
        assert.isTrue(/attackVfxStats\.crit\+\+/.test(player), '暴擊次數需進量測');
        assert.isTrue(/crit\?: boolean/.test(renderer) && /playCritAt\(/.test(renderer), 'UnitRenderer 命中需接受 crit');
        assert.isTrue(/crit: data\.isCrit === true/.test(bridge), 'BattleUIBridge 命中需傳 crit');
        assert.isTrue(/BATTLE_VISUAL_TIMING\.critHitStopSec/.test(bridge), '暴擊命中需微頓幀');
    });

    suite.test('武器推算不改戰場規則：generals.json 沒有新增 weapon 欄位', () => {
        assert.isTrue(generals.every(g => !('weapon' in g)), 'generals.json 不應有 weapon 欄位');
    });

    return suite;
}
