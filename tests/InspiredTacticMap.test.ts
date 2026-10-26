/**
 * InspiredTacticMap.test.ts — 靈感戰法對應戰法庫（PROG-2-1135）
 */
import { TestSuite, assert } from './TestRunner';
import { INSPIRED_TACTIC_MAP, inspiredTacticName, toLibraryTacticId } from '../assets/scripts/core/systems/InspiredTacticMap';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');

export function createInspiredTacticMapSuite(): TestSuite {
    const suite = new TestSuite('InspiredTacticMap (靈感戰法對應戰法庫 PROG-2-1135)');

    suite.test('支援卡每個靈感戰法都有對照，且對到存在的戰法庫 id', () => {
        const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/tactic-library.json'), 'utf8'));
        const libraryIds = new Set((library.data as Array<{ id: string }>).map((t) => t.id));
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const cards = (Array.isArray(data) ? data : data.cards) as Array<{ Support: { Tactic_Inspire_Events?: Array<{ Tactic_ID: string }> } }>;
        for (const card of cards) {
            for (const event of card.Support.Tactic_Inspire_Events ?? []) {
                const entry = INSPIRED_TACTIC_MAP[event.Tactic_ID];
                assert.isTrue(!!entry, `${event.Tactic_ID} 沒有對照`);
                assert.isTrue(libraryIds.has(entry.libraryId), `${event.Tactic_ID} → ${entry.libraryId} 不在戰法庫`);
            }
        }
    });

    suite.test('轉換：靈感戰法轉戰法庫 id；戰法庫 id 原樣回傳；中文名可查', () => {
        assert.equals('tactic-spear-phalanx', toLibraryTacticId('TAC_LANCE_THRUST'));
        assert.equals('tactic-fire-scheme', toLibraryTacticId('tactic-fire-scheme'));
        assert.equals('長槍突刺', inspiredTacticName('TAC_LANCE_THRUST')!);
        assert.equals(undefined, inspiredTacticName('tactic-fire-scheme'));
    });

    suite.test('戰場組槽：學到的靈感戰法轉成戰法庫 id，重複對到同一招只佔一槽', () => {
        const general = {
            id: 'kid', name: 'kid', faction: 'shu', gender: '男', age: 20, hp: 1000,
            str: 80, int: 95, lea: 70, pol: 50, cha: 60, luk: 40,
            learnedTactics: ['TAC_LANCE_THRUST', 'TAC_SHIELD', 'TAC_FIRE_ATTACK'],
        } as unknown as GeneralConfig;
        const slots = buildBattleConfig(general, 'shu' as GeneralConfig['faction']).tacticSlots ?? [];
        assert.equals('tactic-spear-phalanx,tactic-fire-scheme', slots.map((s) => s.tacticId).join(','));
    });

    return suite;
}
