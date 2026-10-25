import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    avatarCandidates,
    avatarPlaceholderPath,
    configureGeneralArtPaths,
    defaultGeneralArtPaths,
    portraitPathOf,
    resetGeneralArtPaths,
} from '../assets/scripts/core/systems/GeneralArtPaths';

const JSON_PATH = path.resolve(__dirname, '../assets/resources/data/general-art-paths.json');

export function createGeneralArtPathsSuite(): TestSuite {
    const suite = new TestSuite('GeneralArtPaths');

    suite.test('portraitKey 與武將 id 都對到同一個立繪實體路徑', () => {
        resetGeneralArtPaths();
        assert.equals('sprites/generals/cao_cao_portrait', portraitPathOf('cao-cao'));
        assert.equals('sprites/generals/cao_cao_portrait', portraitPathOf('portraits/generals/cao-cao'));
    });

    suite.test('頭像先找正式頭像，再找自動裁切', () => {
        resetGeneralArtPaths();
        const c = avatarCandidates('zhao-yun');
        assert.equals('sprites/generals/avatars/zhao_yun_avatar', c[0]);
        assert.equals('sprites/ui_avatars/cropped/zhao_yun_avatar', c[1]);
    });

    suite.test('JSON 設定可覆蓋規則，缺欄位保留預設', () => {
        configureGeneralArtPaths({ avatar: ['art/v2/{id}/head'] });
        assert.equals('art/v2/zhang-fei/head', avatarCandidates('zhang-fei')[0]);
        assert.equals('sprites/generals/zhang_fei_portrait', portraitPathOf('zhang-fei'));
        assert.equals('sprites/ui_avatars/unknown_avatar_m', avatarPlaceholderPath());
        resetGeneralArtPaths();
    });

    suite.test('程式預設值與 data/general-art-paths.json 一致', () => {
        const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        const def = defaultGeneralArtPaths();
        assert.equals(JSON.stringify(def.portrait), JSON.stringify(raw.portrait));
        assert.equals(JSON.stringify(def.avatar), JSON.stringify(raw.avatar));
        assert.equals(def.avatarPlaceholder, raw.avatarPlaceholder);
    });

    suite.test('未知頭像依性別挑男女版，無性別用男版', () => {
        resetGeneralArtPaths();
        assert.equals('sprites/ui_avatars/unknown_avatar_f', avatarPlaceholderPath('女'));
        assert.equals('sprites/ui_avatars/unknown_avatar_m', avatarPlaceholderPath('男'));
        assert.equals('sprites/ui_avatars/unknown_avatar_m', avatarPlaceholderPath(undefined));
    });

    return suite;
}
