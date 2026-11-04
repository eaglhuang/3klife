/**
 * LobbyBackdrop.test.ts — 主大廳背景沿用幕府大廳季節背景（UI-2-0159）
 */
import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { coverSize, LobbyBackdrop } from '../assets/scripts/ui/core/LobbyBackdrop';
import { SolidBackground } from '../assets/scripts/ui/components/SolidBackground';
import { mainLobbyBackdropOf, resolveHallTheme, type HallThemeConfig } from '../assets/scripts/core/systems/HallTheme';

const VIEW = { width: 1920, height: 1080 };

function config(withShade = true): HallThemeConfig {
    return {
        seasonKeys: { '1': 'spring', '2': 'summer', '3': 'autumn', '4': 'winter' },
        backgroundPath: 'sprites/ui_bg/lobby_hall_{season}_bg',
        night: { startHour: 18, endHour: 6 },
        nightTint: { color: '#0A1028', alpha: 0.55, glowColor: '#FFAA50', glowAlpha: 0.18 },
        sunraySeasons: ['summer'],
        seasonTint: {
            spring: { color: '#FFAAC8', alpha: 0.35, blend: 'soft-light' },
            summer: { color: '#78DC8C', alpha: 0.3, blend: 'soft-light' },
            autumn: { color: '#FF8C28', alpha: 0.45, blend: 'soft-light' },
            winter: { color: '#DCEBFF', alpha: 0.29, blend: 'screen' },
        },
        festivals: { LANTERN: { backgroundPath: 'sprites/ui_bg/lantern_bg' } },
        ...(withShade ? { mainLobbyShade: { color: '#000000', alpha: 0.4 } } : {}),
    };
}

function frame(width: number, height: number): SpriteFrame {
    const f = new SpriteFrame();
    f.originalSize = { width, height };
    return f;
}

export function createLobbyBackdropSuite(): TestSuite {
    const suite = new TestSuite('LobbyBackdrop');

    suite.test('cover：比視窗高的圖等寬放大、上下裁切；無效尺寸用視窗尺寸', () => {
        const size = coverSize({ width: 1920, height: 1480 }, VIEW);
        assert.equals(`${size.width}x${size.height}`, '1920x1480', '寬已滿，高超出');
        const small = coverSize({ width: 512, height: 288 }, VIEW);
        assert.equals(`${small.width}x${small.height}`, '1920x1080', '等比放大');
        const bad = coverSize({ width: 0, height: 0 }, VIEW);
        assert.equals(`${bad.width}x${bad.height}`, '1920x1080', '無效尺寸');
    });

    suite.test('白天只疊壓暗層；夜間先夜色再壓暗；節慶換背景', () => {
        const day = mainLobbyBackdropOf(resolveHallTheme({ seasonIndex: 3, hour: 10 }, config()), config());
        assert.equals(day.backgroundPath, 'sprites/ui_bg/lobby_hall_autumn_bg', '秋季背景');
        assert.equals(day.layers.map((l) => l.color).join(','), '#000000', '白天一層');
        const night = mainLobbyBackdropOf(resolveHallTheme({ seasonIndex: 1, hour: 22 }, config()), config());
        assert.equals(night.layers.map((l) => l.color).join(','), '#0A1028,#000000', '夜間兩層');
        const fest = mainLobbyBackdropOf(resolveHallTheme({ seasonIndex: 1, hour: 10, festivalId: 'LANTERN' }, config()), config());
        assert.equals(fest.backgroundPath, 'sprites/ui_bg/lantern_bg', '節慶背景');
        const bare = mainLobbyBackdropOf(resolveHallTheme({ seasonIndex: 1, hour: 10 }, config(false)), config(false));
        assert.equals(bare.layers.length, 0, '未設定壓暗層');
    });

    suite.test('套用：載入後顯示背景並以 cover 尺寸鋪滿，遮罩依層數顯示', () => {
        const parent = new Node('Background');
        const pending: Array<{ path: string; done: (f: SpriteFrame | null) => void }> = [];
        const backdrop = new LobbyBackdrop(parent, VIEW, (path, done) => { pending.push({ path, done }); });
        backdrop.apply({ backgroundPath: 'bg/a', layers: [{ color: '#0A1028', alpha: 0.55 }, { color: '#000000', alpha: 0.4 }] });
        const art = backdrop.art;
        assert.equals(art.active, false, '載入前不顯示');
        pending[0].done(frame(1920, 1480));
        assert.equals(art.active, true, '載入後顯示');
        assert.equals(art.getComponent(UITransform)!.height, 1480, 'cover 高度');
        const shade1 = backdrop.shadeLayers[1];
        assert.equals(shade1.getComponent(SolidBackground)!.color.a, 102, '0.4 → 102');
        backdrop.apply({ backgroundPath: 'bg/a', layers: [{ color: '#000000', alpha: 0.4 }] });
        assert.equals(pending.length, 1, '同一張圖不重載');
        assert.equals(shade1.active, false, '少掉的層隱藏');
    });

    suite.test('連續換圖只採用最後一次；載入失敗保留原狀', () => {
        const parent = new Node('Background');
        const pending: Array<{ path: string; done: (f: SpriteFrame | null) => void }> = [];
        const backdrop = new LobbyBackdrop(parent, VIEW, (path, done) => { pending.push({ path, done }); });
        backdrop.apply({ backgroundPath: 'bg/spring', layers: [] });
        backdrop.apply({ backgroundPath: 'bg/summer', layers: [] });
        const summer = frame(1920, 1080);
        pending[1].done(summer);
        pending[0].done(frame(1920, 1080));
        const art = backdrop.art;
        assert.equals(art.getComponent(Sprite)!.spriteFrame, summer, '採用最後一次');
        backdrop.apply({ backgroundPath: 'bg/missing', layers: [] });
        pending[2].done(null);
        assert.equals(art.getComponent(Sprite)!.spriteFrame, summer, '失敗保留');
    });

    return suite;
}
