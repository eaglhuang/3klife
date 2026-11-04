/**
 * CareerTag.test.ts — 職能標籤 headless 測試（轉職與宿命系統 §E-4，PROG-2-1724）
 *
 * Unity 對照：EditMode Test 直接驗證判定結果與人物頁標頭文字。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { CAREER_TAG_COLOR, careerTagLabelOf, careerTagOf } from '../assets/scripts/core/systems/CareerTag';
import { buildGeneralDetailOverview } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';

function general(fields: Record<string, unknown>): GeneralConfig {
    return { id: 'g', name: '測試', faction: 'shu', role: 'Combat', ...fields } as unknown as GeneralConfig;
}

export function createCareerTagSuite(): TestSuite {
    const suite = new TestSuite('CareerTag (轉職與宿命 §E-4 職能標籤)');

    suite.test('未滿 5 歲或年齡不明沒有職能標籤', () => {
        assert.equals(null, careerTagOf(general({ age: 4, careerClass: 'Warrior' })));
        assert.equals(null, careerTagOf(general({ careerClass: 'Warrior' })));
        assert.equals('', careerTagLabelOf(general({ age: 3 })));
    });

    suite.test('主職依宿命紀錄：武官、文官', () => {
        assert.equals('warrior', careerTagOf(general({ age: 12, careerClass: 'Warrior' })));
        assert.equals('scholar', careerTagOf(general({ age: 12, careerClass: 'Scholar' })));
        assert.equals('文官', careerTagLabelOf(general({ age: 30, primaryClass: 'Scholar', careerClass: 'Warrior' })));
    });

    suite.test('副職與主職不同即雙職能；副職同主職仍是單職', () => {
        assert.equals('dual', careerTagOf(general({ age: 25, careerClass: 'Warrior', subClass: 'Scholar' })));
        assert.equals('warrior', careerTagOf(general({ age: 25, careerClass: 'Warrior', subClass: 'Warrior' })));
        assert.equals('雙職能', careerTagLabelOf(general({ age: 25, careerClass: 'Scholar', subClass: 'Warrior' })));
    });

    suite.test('沒有宿命紀錄的既有武將沿用退役分流的後備判定（武力統率高於智政為武官）', () => {
        assert.equals('warrior', careerTagOf(general({ age: 30, str: 90, lea: 80, int: 40, pol: 30 })));
        assert.equals('scholar', careerTagOf(general({ age: 30, str: 30, lea: 40, int: 90, pol: 85 })));
    });

    suite.test('三種職能各有顏色', () => {
        assert.isTrue(CAREER_TAG_COLOR.warrior !== CAREER_TAG_COLOR.scholar);
        assert.isTrue(CAREER_TAG_COLOR.dual !== CAREER_TAG_COLOR.warrior);
    });

    suite.test('人物頁標頭接上職能：蜀．先鋒．武官；未滿 5 歲不加', () => {
        assert.equals('蜀．先鋒．武官', buildGeneralDetailOverview(general({ age: 20, careerClass: 'Warrior' })).header.meta);
        assert.equals('蜀．先鋒．雙職能', buildGeneralDetailOverview(general({ age: 22, careerClass: 'Warrior', subClass: 'Scholar' })).header.meta);
        assert.equals('蜀．先鋒', buildGeneralDetailOverview(general({ age: 2, careerClass: 'Warrior' })).header.meta);
    });

    return suite;
}
