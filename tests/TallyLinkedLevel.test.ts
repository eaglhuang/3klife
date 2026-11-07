/**
 * 虎符詳情顯示來源名將英靈卡的虎符層級（DUP-03；PROG-2-2081）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { applyBloodlineInfusion } from '../assets/scripts/core/systems/BloodlineInfusion';
import { tallyLinkedLevelText } from '../assets/scripts/ui/core/SpiritTallyChain';

const tallies: Record<string, TigerTallyCard> = {
    T1: { uid: 'T1', templateId: 't', sourceGeneralUid: 'zhao-yun', quality: 'SSR', score: 0, source: 'death', producedSeason: 1 },
    T2: { uid: 'T2', templateId: 't', sourceGeneralUid: 'nobody', quality: 'R', score: 0, source: 'reward', producedSeason: 1 },
};
const spirit = (level?: number) => ({ uid: 'zhao-yun', name: '趙雲', isSpiritRelic: true, linkedTallyLevel: level } as unknown as SpiritCard);

export function createTallyLinkedLevelSuite(): TestSuite {
    const suite = new TestSuite('TallyLinkedLevel (虎符詳情虎符層級 DUP-03 PROG-2-2081)');

    suite.test('依虎符來源名將的英靈卡顯示層級，缺值為 0', () => {
        assert.equals('虎符層級 3', tallyLinkedLevelText('T1', tallies, [spirit(3)]));
        assert.equals('虎符層級 0', tallyLinkedLevelText('T1', tallies, [spirit()]));
    });

    suite.test('沒有實例、來源沒有英靈卡時不顯示', () => {
        assert.equals('', tallyLinkedLevelText(undefined, tallies, [spirit(3)]));
        assert.equals('', tallyLinkedLevelText('T2', tallies, [spirit(3)]));
        assert.equals('', tallyLinkedLevelText('missing', tallies, [spirit(3)]));
    });

    suite.test('血脈灌注後層級跟著上升', () => {
        const before = spirit(1);
        const after = { ...before, ...applyBloodlineInfusion(before, 10) } as SpiritCard;
        assert.equals('虎符層級 2', tallyLinkedLevelText('T1', tallies, [after]));
    });

    suite.test('虎符詳情抽屜接線', () => {
        const src = readFileSync(join(__dirname, '../assets/scripts/ui/components/TigerTallyDetailComposite.ts'), 'utf8');
        assert.isTrue(src.includes('tallyLinkedLevelText(data.instanceUid, services().session.tallyCards, spirits, lookup)'));
        assert.isTrue(src.includes('seq === this._linkedLevelSeq'));
    });

    return suite;
}
