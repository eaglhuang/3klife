/**
 * LobbyThemeResolver.test.ts — 大廳晝夜與節慶三層解析（PROG-2-1038，HALL-09）
 */
import { assert, TestSuite } from './TestRunner';
import {
    HALL_EMPTY_THEME_CATALOG,
    HallThemeCatalog,
    resolveHallTheme,
} from '../assets/scripts/core/systems/LobbyThemeResolver';
import type { LobbyHub } from '../assets/scripts/core/systems/LobbyHubSchema';

type Theme = LobbyHub['Current_Theme'];

function dayTheme(overrides: Partial<Theme> = {}): Theme {
    return {
        Theme_ID: 'DEFAULT_DAY',
        Day_Night_Mode: 'DAY',
        Festival_Theme_ID: 'NONE',
        Background_ID: 'HALL_BG_DAY_01',
        Overlay_Tint: '#F4D9A5',
        ...overrides,
    };
}

const SPRING_CATALOG: HallThemeCatalog = {
    festivals: {
        SPRING_FESTIVAL: {
            backgroundId: 'HALL_BG_SPRING_01',
            decorationIds: ['DECO_LANTERN', 'DECO_WISH_ALTAR'],
            particleId: 'FX_PETAL',
        },
        LAYER_ONLY_DECO: {
            backgroundId: null,
            decorationIds: ['DECO_BANNER'],
            particleId: null,
        },
    },
};

export function createLobbyThemeResolverSuite(): TestSuite {
    const suite = new TestSuite('LobbyThemeResolver (PROG-2-1038 晝夜與節慶主題)');

    suite.test('無節慶時沿用基礎背景與色調，節慶層為空，節慶插槽隱藏', () => {
        const frame = resolveHallTheme(dayTheme());
        assert.equals('DAY', frame.dayNight);
        assert.equals('#F4D9A5', frame.overlayTint);
        assert.equals('HALL_BG_DAY_01', frame.layers.background);
        assert.equals(0, frame.layers.decorationIds.length);
        assert.isTrue(frame.layers.particleId === null);
        assert.isFalse(frame.festivalActive);
    });

    suite.test('夜間模式只改 dayNight，不影響基礎背景與色調來源', () => {
        const frame = resolveHallTheme(dayTheme({ Day_Night_Mode: 'NIGHT', Background_ID: 'HALL_BG_NIGHT_01', Overlay_Tint: '#2B3A67' }));
        assert.equals('NIGHT', frame.dayNight);
        assert.equals('HALL_BG_NIGHT_01', frame.baseBackgroundId);
        assert.equals('#2B3A67', frame.overlayTint);
    });

    suite.test('節慶 ID 在配置表中時，三層全部依配置啟用，背景層覆蓋基礎背景', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'SPRING_FESTIVAL' }), SPRING_CATALOG);
        assert.isTrue(frame.festivalActive);
        assert.equals('HALL_BG_SPRING_01', frame.layers.background);
        assert.equals('DECO_LANTERN,DECO_WISH_ALTAR', frame.layers.decorationIds.join(','));
        assert.equals('FX_PETAL', frame.layers.particleId!);
        assert.equals('HALL_BG_DAY_01', frame.baseBackgroundId);
    });

    suite.test('節慶只有裝飾層、沒有背景層時，背景退回基礎背景', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'LAYER_ONLY_DECO' }), SPRING_CATALOG);
        assert.isTrue(frame.festivalActive);
        assert.equals('HALL_BG_DAY_01', frame.layers.background);
        assert.equals('DECO_BANNER', frame.layers.decorationIds[0]);
        assert.isTrue(frame.layers.particleId === null);
    });

    suite.test('未知節慶 ID 視為未啟用，不沿用其他節慶的圖層', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'NOT_CONFIGURED' }), SPRING_CATALOG);
        assert.isFalse(frame.festivalActive);
        assert.equals(0, frame.layers.decorationIds.length);
        assert.equals('HALL_BG_DAY_01', frame.layers.background);
    });

    suite.test('原型鏈上的名字（如 constructor）不會被當成節慶配置', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'constructor' }), HALL_EMPTY_THEME_CATALOG);
        assert.isFalse(frame.festivalActive);
        assert.equals(0, frame.layers.decorationIds.length);
    });

    suite.test('回傳的裝飾陣列是複本，改動不會回寫到配置表', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'SPRING_FESTIVAL' }), SPRING_CATALOG);
        frame.layers.decorationIds.push('DECO_HACKED');
        assert.equals(2, SPRING_CATALOG.festivals.SPRING_FESTIVAL.decorationIds.length);
    });

    suite.test('不傳配置表時等同空配置，節慶一律隱藏', () => {
        const frame = resolveHallTheme(dayTheme({ Festival_Theme_ID: 'SPRING_FESTIVAL' }));
        assert.isFalse(frame.festivalActive);
    });

    return suite;
}
