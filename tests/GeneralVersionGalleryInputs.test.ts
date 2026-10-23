/**
 * GeneralVersionGalleryInputs.test.ts — 圖鑑入口的暫定輸入（PROG-2-0719）headless 測試
 *
 * 鎖住：版本表取已知武將與名冊的並集；已擁有集合只含名冊武將的 Template_ID。
 */
import { assert, TestSuite } from './TestRunner';
import { galleryInputsFromGenerals } from '../assets/scripts/core/systems/ProvisionalGeneralVersions';

export function createGeneralVersionGalleryInputsSuite(): TestSuite {
    const suite = new TestSuite('GeneralVersionGalleryInputs (圖鑑入口暫定輸入 PROG-2-0719)');

    suite.test('版本表取已知武將與名冊的並集，重複武將只出現一次', () => {
        const known = [{ id: 'zhao-yun', name: '趙雲' }, { id: 'lu-bu', name: '呂布' }];
        const roster = [{ id: 'zhao-yun', name: '趙雲' }];
        const { table } = galleryInputsFromGenerals(known, roster);
        assert.equals(2, table.length);
        assert.equals('Zhao_Yun_V1', table[0].Template_ID);
    });

    suite.test('已擁有集合只含名冊武將的 Template_ID，不含只在已知清單的武將', () => {
        const known = [{ id: 'zhao-yun', name: '趙雲' }, { id: 'lu-bu', name: '呂布' }];
        const roster = [{ id: 'zhao-yun', name: '趙雲' }];
        const { owned } = galleryInputsFromGenerals(known, roster);
        assert.isTrue(owned.has('Zhao_Yun_V1'));
        assert.isFalse(owned.has('Lu_Bu_V1'));
        assert.equals(1, owned.size);
    });

    return suite;
}
