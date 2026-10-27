/**
 * TeachingSpiritProvisional.test.ts — 教學戰暫定英靈與資料檔一致、符合取值規則（PROG-2-1208，OPEN-13）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { provisionalTeachingSpirit } from '../assets/scripts/core/systems/TeachingSpiritProvisional';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');
const RARITY_ORDER: Readonly<Record<string, number>> = { legendary: 4, epic: 3, rare: 2, common: 1 };

interface ProvisionalFile {
    spiritId: string;
    spiritName: string;
    geneIds: string[];
}

interface GeneralRow {
    id: string;
    rarityTier?: string;
    genes?: Array<{ id: string; isLocked?: boolean }>;
}

export function createTeachingSpiritProvisionalSuite(): TestSuite {
    const suite = new TestSuite('TeachingSpiritProvisional (PROG-2-1208 教學戰暫定英靈)');

    suite.test('程式常數與 teaching-spirit.provisional.json 一致', () => {
        const file = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'teaching-spirit.provisional.json'), 'utf8')) as ProvisionalFile;
        const spirit = provisionalTeachingSpirit();
        assert.equals(file.spiritId, spirit.spiritId);
        assert.equals(file.spiritName, spirit.spiritName);
        assert.equals(file.geneIds.join(','), spirit.geneIds.join(','));
    });

    suite.test('英靈是 generals.json 中稀有度最高、同級依 id 排序第一位的武將', () => {
        const generals = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'generals.json'), 'utf8')) as GeneralRow[];
        const expected = [...generals].sort((a, b) =>
            (RARITY_ORDER[b.rarityTier ?? ''] ?? 0) - (RARITY_ORDER[a.rarityTier ?? ''] ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
        assert.equals(expected.id, provisionalTeachingSpirit().spiritId);
    });

    suite.test('基因全部取自該武將未鎖定的因子', () => {
        const generals = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'generals.json'), 'utf8')) as GeneralRow[];
        const general = generals.find((g) => g.id === provisionalTeachingSpirit().spiritId)!;
        const unlocked = (general.genes ?? []).filter((g) => !g.isLocked).map((g) => g.id);
        for (const geneId of provisionalTeachingSpirit().geneIds) {
            assert.isTrue(unlocked.indexOf(geneId) >= 0);
        }
    });

    suite.test('回傳的輸入是複本，改動不會回寫到常數', () => {
        const spirit = provisionalTeachingSpirit();
        (spirit.geneIds as string[]).push('GENE_HACKED');
        assert.equals(3, provisionalTeachingSpirit().geneIds.length);
    });

    return suite;
}
