/**
 * UltimateScriptLines.test.ts — 奧義劇本句（PROG-2-1780）
 *
 * Unity 對照：EditMode Test，只驗句子挑選，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import {
    childUltimateAwakenLine,
    ultimateCastLine,
    ultimateUnlockLines,
    ultimateVitalityLowLine,
} from '../assets/scripts/core/systems/UltimateScriptLines';
import type { GeneralUltimateSlotConfig } from '../assets/scripts/core/models/GeneralUnit';

const slot = (n: number, ultimateId: string) => ({ slot: n, ultimateId, unlockReincarnation: n }) as GeneralUltimateSlotConfig;
const zhao = { name: '趙雲', ultimateSlots: [slot(2, 'u2'), slot(3, 'u3')] };
const generalOf = (id: string) => (id === 'zhao-yun' ? zhao : undefined);
const nameOf = (id: string) => ({ u2: '龍膽', u3: '七進七出' } as Record<string, string>)[id];

export function createUltimateScriptLinesSuite(): TestSuite {
    const suite = new TestSuite('UltimateScriptLines');

    suite.test('施放句：專屬句優先，其他只有 5 轉才有究極句', () => {
        assert.equals('長坂坡的英魂再現——七進七出，無人可擋！', ultimateCastLine({ ultimateId: 'ult-zhao-yun-3', slot: 3, generalName: '趙雲' }) ?? '');
        assert.equals('丞相最後的計策……星辰隕落，敵軍盡滅。', ultimateCastLine({ ultimateId: 'ult-zhuge-liang-5', slot: 5, generalName: '諸葛亮', ultimateName: '出師表' }) ?? '');
        assert.equals('這是呂布的全力一擊——【天下無雙】！！', ultimateCastLine({ ultimateId: 'ult-lu-bu-5', slot: 5, generalName: '呂布', ultimateName: '天下無雙' }) ?? '');
        assert.equals(null, ultimateCastLine({ ultimateId: 'ult-lu-bu-2', slot: 2, generalName: '呂布', ultimateName: '方天' }));
        assert.equals(null, ultimateCastLine({ ultimateId: 'ult-lu-bu-5', slot: 5, generalName: '呂布' }));
    });

    suite.test('解鎖句：只有轉數剛好達到的欄位；溢出、查無名稱都不說', () => {
        assert.equals('趙雲 突破極限——第 3 奧義【七進七出】覺醒！', ultimateUnlockLines([{ id: 'zhao-yun', overflow: false, rebirthCount: 3 }], generalOf, nameOf).join('|'));
        assert.equals(0, ultimateUnlockLines([{ id: 'zhao-yun', overflow: true, rebirthCount: 3 }], generalOf, nameOf).length);
        assert.equals(0, ultimateUnlockLines([{ id: 'zhao-yun', overflow: false, rebirthCount: 4 }], generalOf, nameOf).length);
        assert.equals(0, ultimateUnlockLines([{ id: 'zhao-yun', overflow: false, rebirthCount: 3 }], generalOf, () => undefined).length);
        assert.equals(0, ultimateUnlockLines([{ id: 'nobody', overflow: false, rebirthCount: 3 }], generalOf, nameOf).length);
    });

    suite.test('子嗣覺醒句依來源說父親或母親；精力句帶武將名', () => {
        assert.equals('血脈中沉睡的力量甦醒了——父親的奧義，在趙統身上重現！', childUltimateAwakenLine('趙統', true));
        assert.equals('血脈中沉睡的力量甦醒了——母親的奧義，在趙統身上重現！', childUltimateAwakenLine('趙統', false));
        assert.equals('趙雲 精力不足，無法發動奧義！', ultimateVitalityLowLine('趙雲'));
    });

    return suite;
}
