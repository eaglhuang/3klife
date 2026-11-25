/**
 * DefeatVfx.test.ts — 單位倒下的漫畫式演出（PROG-2-9995）
 *
 * 鎖住：
 * - 白煙積木有 prefabPath（沒有的話 playBlock 回空，煙不會出現；見 PR #2603）；死亡特效配方用的積木也都有 prefabPath；
 * - attack-vfx.json 的 defeatBurst：小兵與武將都有，武將的線、星、尺寸、時間皆不弱於小兵（略強）；
 * - 倒下短字樣 i18n 四語（zh-TW/zh-CN/en/ja）齊全且不為空，武將與小兵文案不同；
 * - 'defeat' 飄字類型有樣式；
 * - UnitRenderer.playDeath 掛上 playDefeatComic，且不碰戰鬥結算（演出只在 View 層）。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { DEFEAT_VFX, defeatTextKeyOf, isGeneralAvatarUnitId } from '../assets/scripts/battle/views/BattleFlowVfx';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';
import { FLOAT_TEXT_STYLES } from '../assets/scripts/core/systems/FloatTextStyle';

const root = join(__dirname, '..');
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');
const attack = JSON.parse(read('assets/resources/data/attack-vfx.json'));
const effects = JSON.parse(read('assets/resources/data/vfx-effects.json'));

export function createDefeatVfxSuite(): TestSuite {
    const suite = new TestSuite('DefeatVfx');

    suite.test('白煙積木與死亡配方的積木都有 prefabPath', () => {
        const byId = new Map(VFX_BLOCK_REGISTRY.map((b) => [b.id, b] as const));
        assert.isTrue(!!byId.get(DEFEAT_VFX.smokeBlock)?.prefabPath, '武將白煙積木沒有 prefabPath');
        const table = effects.effects ?? effects;
        for (const key of ['battle_death_burst', 'battle_death_vanish']) {
            const def = table[key];
            assert.isTrue(!!def, `${key} 不存在`);
            for (const b of def.blocks ?? [{ blockId: def.blockId }]) {
                assert.isTrue(!!byId.get(b.blockId)?.prefabPath, `${key} 的 ${b.blockId} 沒有 prefabPath`);
            }
        }
    });

    suite.test('defeatBurst：小兵與武將都有設定，武將略強', () => {
        const d = attack.defeatBurst;
        assert.isTrue(!!d && d.kind === 'defeatBurst', '缺 defeatBurst');
        for (const k of ['durationSec', 'impactLines', 'impactLenPx', 'impactWidthPx', 'starCount', 'starSizePx', 'riseOutPx']) {
            assert.isTrue(typeof d.troop[k] === 'number' && d.troop[k] > 0, `troop.${k}`);
            assert.isTrue(typeof d.general[k] === 'number' && d.general[k] > 0, `general.${k}`);
        }
        for (const k of ['durationSec', 'impactLines', 'impactLenPx', 'starCount', 'starSizePx', 'riseOutPx']) {
            assert.isTrue(d.general[k] > d.troop[k], `武將的 ${k} 應大於小兵`);
        }
        assert.isTrue(d.troop.starCount >= 2, '小兵至少兩顆星');
    });

    suite.test('倒下短字樣：四語系齊全、非空、武將與小兵不同、無佔位前綴', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const json = JSON.parse(read(`assets/resources/i18n/${lang}.json`));
            const troop = json[defeatTextKeyOf(false)], general = json[defeatTextKeyOf(true)];
            assert.isTrue(typeof troop === 'string' && troop.length > 0, `${lang} 缺小兵倒下字樣`);
            assert.isTrue(typeof general === 'string' && general.length > 0, `${lang} 缺武將倒下字樣`);
            assert.isTrue(troop !== general, `${lang} 小兵與武將字樣應不同`);
            assert.isTrue(!/^\[/.test(troop) && !/^\[/.test(general), `${lang} 不可留佔位前綴`);
        }
    });

    suite.test('defeat 飄字樣式存在，字級不超過爆擊', () => {
        const s = FLOAT_TEXT_STYLES.defeat;
        assert.isTrue(!!s && s.durationMs > 0 && s.maxConcurrent > 0);
        assert.isTrue(s.fontSize <= FLOAT_TEXT_STYLES.dmg_crit.fontSize);
    });

    suite.test('主將化身單位 id 判斷', () => {
        assert.isTrue(isGeneralAvatarUnitId('player-general-1'));
        assert.isTrue(isGeneralAvatarUnitId('enemy-general-2'));
        assert.isTrue(!isGeneralAvatarUnitId('player-spear-3'));
    });

    suite.test('playDeath 掛接演出；演出只在 View 層、不改結算', () => {
        const unit = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isTrue(/playDeath\(unitId: string\): void \{[\s\S]{0,400}this\.playDefeatComic\(/.test(unit), 'playDeath 未呼叫 playDefeatComic');
        const player = read('assets/scripts/battle/views/AttackVfxPlayer.ts');
        assert.isTrue(/case 'defeatBurst':/.test(player) && /public playDefeat\(/.test(player));
        const comic = unit.slice(unit.indexOf('private playDefeatComic'), unit.indexOf('public async playDeathAsync'));
        assert.isTrue(!/ctrl|\.state\b|takeDamage|applyUnitDamage/.test(comic), '演出不可碰戰鬥狀態');
    });

    return suite;
}
