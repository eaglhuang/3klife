/**
 * UnitHud.test.ts — 部隊頭頂 HUD 單行版（PROG-2-10266）
 * 鎖住：① 畫面比例（橫式 1 倍、直式等比縮、夾範圍）；② 兵種剪影都在同一張徽章底圖且與單字表一一對應；
 * ③ 底圖尺寸與格位一致；④ HUD 掛在最底的 UnitHudRoot（特效在上），舊雙排徽章與實驗開關已移除。
 * Unity 對照：Canvas Scaler 以較短邊比例縮放，HUD 為獨立 Sub-Canvas 排在特效之下。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { hudScaleFor, UNIT_HUD_BASE_SCALE, UNIT_HUD_W, UNIT_HUD_ROW_H, UNIT_HP_BAR_Y } from '../assets/scripts/battle/shared/UnitHudLayout';
import { BADGE_ATLAS_ICON_CELLS } from '../assets/scripts/ui/shared/TroopTypeBadge';
import { TROOP_TYPE_GLYPH } from '../assets/scripts/shared/TallyCardContract';

const root = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

export function createUnitHudSuite(): TestSuite {
    const suite = new TestSuite('UnitHud (部隊頭頂 HUD 單行版 PROG-2-10266)');

    suite.test('畫面比例：1920x1080 為基準 0.7；直式 1080x1920 等比縮但不低於 0.7 倍；超大畫面夾 1.2 倍', () => {
        assert.equals(UNIT_HUD_BASE_SCALE, hudScaleFor(1920, 1080));
        assert.equals(UNIT_HUD_BASE_SCALE * 0.7, hudScaleFor(1080, 1920));
        assert.equals(UNIT_HUD_BASE_SCALE * 1.2, hudScaleFor(3840, 2160));
        assert.equals(UNIT_HUD_BASE_SCALE, hudScaleFor(0, 0));
    });

    suite.test('HUD 面積約為舊雙排徽章（180x88 名牌座標）的 40% 以下', () => {
        const oldArea = 180 * 88;
        assert.isTrue(UNIT_HUD_W * UNIT_HUD_ROW_H <= oldArea * 0.4, `新面積 ${UNIT_HUD_W * UNIT_HUD_ROW_H}`);
        assert.isTrue(UNIT_HP_BAR_Y < 0, '血條在數字列下方');
    });

    suite.test('兵種剪影格位涵蓋所有單字兵種，格位不重複且不佔底框／圓章格', () => {
        const keys = Object.keys(TROOP_TYPE_GLYPH).sort();
        assert.equals(keys.join(','), Object.keys(BADGE_ATLAS_ICON_CELLS).sort().join(','));
        const seen = new Set<string>(['0,0', '1,0']);
        for (const [k, [c, r]] of Object.entries(BADGE_ATLAS_ICON_CELLS)) {
            assert.isTrue(c >= 0 && c < 5 && r >= 0 && r < 2, `${k} 超出 5x2 格`);
            assert.isFalse(seen.has(`${c},${r}`), `${k} 格位重複`);
            seen.add(`${c},${r}`);
        }
    });

    suite.test('徽章底圖為 400x160（5x2 格，每格 80）', () => {
        const buf = fs.readFileSync(path.join(root, 'assets/resources/sprites/battle/battle_badge_atlas.png'));
        assert.equals(400, buf.readUInt32BE(16));
        assert.equals(160, buf.readUInt32BE(20));
    });

    suite.test('UnitRenderer：HUD 掛在 UnitHudRoot（索引 0），舊雙排徽章與實驗開關已移除', () => {
        const src = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isTrue(src.includes('UnitHudRoot') && src.includes('setSiblingIndex(0)'), '缺 UnitHudRoot');
        assert.isTrue(src.includes('buildUnitHud(') && src.includes('hudScaleFor('), '缺單行 HUD 或畫面比例');
        assert.isFalse(src.includes('__hudMode'), '實驗開關未移除');
        assert.isFalse(src.includes('addBadgeBgSprite'), '舊雙排底框未移除');
    });

    return suite;
}
