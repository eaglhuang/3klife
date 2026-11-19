/**
 * GeneralPortraitFallback.test.ts — PROG-2-9178 子嗣與無專屬立繪武將依性別退回 Resolver 測試
 */
import { assert, TestSuite } from './TestRunner';
import {
    configureGeneralArtPaths,
    GENERAL_ART_PATHS_JSON,
    resetGeneralArtPaths,
    resolveGeneralPortraitCandidates,
    resolveGeneralPortraitResources,
} from '../assets/scripts/core/systems/GeneralArtPaths';
import * as fs from 'fs';
import * as path from 'path';

export function createGeneralPortraitFallbackSuite(): TestSuite {
    const suite = new TestSuite('GeneralPortraitFallback (PROG-2-9178)');

    suite.test('data/general-art-paths.json 載入與女子嗣嚴禁跨性別退回父親（簡雍之女案例）', () => {
        resetGeneralArtPaths();
        const jsonPath = path.resolve(__dirname, `../assets/resources/${GENERAL_ART_PATHS_JSON}.json`);
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        configureGeneralArtPaths(raw);

        // 簡雍之女：母親（彭羕之女）無專屬圖或為 child_，父親（簡雍）為男性
        const jianDaughter = resolveGeneralPortraitResources({
            id: 'child_jian_yong_daughter_1',
            gender: '女',
            age: 14,
            fatherId: 'jian-yong',
            motherId: 'child_peng_yang_daughter',
        });
        const allCandidates = [jianDaughter.primary, ...jianDaughter.fallbacks];
        assert.equals('sprites/generals/da_qiao_portrait', jianDaughter.primary);
        assert.equals(false, allCandidates.some((p) => p.includes('jian_yong')), '女子嗣候選不應出現父親簡雍男性立繪');
        assert.equals(false, allCandidates.some((p) => p.includes('zhang_fei')), '女子嗣候選不應出現男性預設圖');

        // 男子嗣：父親無專屬圖時只退回男性預設，不退回母親女性圖
        const son = resolveGeneralPortraitResources({
            id: 'child_son_1',
            gender: '男',
            age: 16,
            fatherId: 'child_unknown_father',
            motherId: 'diao-chan',
        });
        const sonCandidates = resolveGeneralPortraitCandidates({
            id: 'child_son_1',
            gender: '男',
            age: 16,
            fatherId: 'child_unknown_father',
            motherId: 'diao-chan',
        });
        assert.equals('sprites/generals/zhang_fei_portrait', son.primary);
        assert.equals(false, sonCandidates.some((p) => p.includes('diao_chan')), '男子嗣候選不應出現母親貂蟬女性立繪');

        // 有專屬立繪的名將 / 專屬子嗣不受影響
        const exclusive = resolveGeneralPortraitResources({
            id: 'diao-chan',
            gender: '女',
            fatherId: 'wang-yun',
        });
        assert.equals('sprites/generals/diao_chan_portrait', exclusive.primary);

        const customChild = resolveGeneralPortraitResources({
            id: 'child_special_1',
            gender: '女',
            portraitKey: 'sun-shang-xiang',
            fatherId: 'liu-bei',
        });
        assert.equals('sprites/generals/sun_shang_xiang_portrait', customChild.primary);

        resetGeneralArtPaths();
    });

    suite.test('資料檔設定 ageBands 時依年齡段挑選通用立繪，未設定則退回性別預設', () => {
        resetGeneralArtPaths();
        configureGeneralArtPaths({
            portraitFallbacks: {
                female: {
                    default: 'da-qiao',
                    ageBands: [
                        { maxAge: 11, id: 'generic-girl-child' },
                        { maxAge: 17, id: 'generic-girl-teen' },
                    ],
                },
                male: {
                    default: 'zhang-fei',
                    ageBands: [{ maxAge: 11, id: 'generic-boy-child' }],
                },
            },
        });

        const youngGirl = resolveGeneralPortraitResources({ id: 'child_g_5', gender: '女', age: 5 });
        assert.equals('sprites/generals/generic_girl_child_portrait', youngGirl.primary);

        const teenGirl = resolveGeneralPortraitResources({ id: 'child_g_15', gender: '女', age: 15 });
        assert.equals('sprites/generals/generic_girl_teen_portrait', teenGirl.primary);

        const adultGirl = resolveGeneralPortraitResources({ id: 'child_g_20', gender: '女', age: 20 });
        assert.equals('sprites/generals/da_qiao_portrait', adultGirl.primary);

        const youngBoy = resolveGeneralPortraitResources({ id: 'child_b_8', gender: '男', age: 8 });
        assert.equals('sprites/generals/generic_boy_child_portrait', youngBoy.primary);

        resetGeneralArtPaths();
    });

    return suite;
}
