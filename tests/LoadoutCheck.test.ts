import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { checkRecommendedLoadout, loadoutCheckLogLine, loadoutTagsOf, type TacticCounterTagTable } from '../assets/scripts/core/systems/LoadoutCheck';

function loadTagTable(): TacticCounterTagTable {
    const file = path.resolve(__dirname, '../assets/resources/data/tactic-counter-tags.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')).tags;
}

function loadEncounter(id: string): { requiredLoadout: string[]; highlyRecommendedLoadout: string[] } {
    const file = path.resolve(__dirname, '../assets/resources/data/encounters.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')).encounters.find((e: { id: string }) => e.id === id);
}

export function createLoadoutCheckSuite(): TestSuite {
    const suite = new TestSuite('LoadoutCheck (推薦戰法三態 LVL-04)');

    suite.test('必備與高建議都涵蓋 → 已具備，無缺口', () => {
        const r = checkRecommendedLoadout(['water-shield', 'anti-chaos'], ['water-shield'], ['anti-chaos']);
        assert.equals('ready', r.state);
        assert.equals(0, r.gaps.length);
    });

    suite.test('只缺高建議 → 缺少，列出該缺口', () => {
        const r = checkRecommendedLoadout(['water-shield'], ['water-shield'], ['anti-chaos']);
        assert.equals('missing', r.state);
        assert.equals('anti-chaos', r.gaps[0]);
    });

    suite.test('缺必備 → 高風險，仍可挑戰', () => {
        const r = checkRecommendedLoadout([], ['water-shield'], ['anti-chaos']);
        assert.equals('high-risk', r.state);
        assert.equals(true, r.canChallenge);
        assert.equals(2, r.gaps.length);
    });

    suite.test('空的需求清單 → 已具備', () => {
        assert.equals('ready', checkRecommendedLoadout([], [], []).state);
    });

    suite.test('戰法槽轉對策標籤：戰法庫 id 先轉規格 id，標籤去重（PROG-2-1763）', () => {
        const table: TacticCounterTagTable = { TAC_FIRE_ATTACK: ['火攻', '破城'], TAC_ARROW_RAIN: ['破城'] };
        assert.equals('火攻、破城', loadoutTagsOf(['tactic-fire-scheme', 'TAC_ARROW_RAIN', 'tactic-unknown'], table).join('、'));
    });

    suite.test('日誌文案三態：高風險標示仍可挑戰', () => {
        assert.equals('推薦戰法檢核：已具備', loadoutCheckLogLine(checkRecommendedLoadout(['a'], ['a'], [])));
        assert.equals('推薦戰法檢核：缺少夜戰', loadoutCheckLogLine(checkRecommendedLoadout(['反隱'], ['反隱'], ['夜戰'])));
        assert.equals('推薦戰法檢核：高風險，仍可挑戰（缺少反隱、夜戰）', loadoutCheckLogLine(checkRecommendedLoadout([], ['反隱'], ['夜戰'])));
    });

    suite.test('真實資料：張飛（火計＋鼓舞）打虎牢關已具備、打長板坡高風險', () => {
        const table = loadTagTable();
        const tags = loadoutTagsOf(['tactic-fire-scheme', 'tactic-morale-rally'], table);
        const siege = loadEncounter('encounter-001');
        const night = loadEncounter('encounter-002');
        assert.equals('ready', checkRecommendedLoadout(tags, siege.requiredLoadout, siege.highlyRecommendedLoadout).state);
        const r = checkRecommendedLoadout(tags, night.requiredLoadout, night.highlyRecommendedLoadout);
        assert.equals('high-risk', r.state);
        assert.equals('反隱、夜戰', r.gaps.join('、'));
    });

    suite.test('真實資料：關卡填的標籤都至少有一招戰法能提供', () => {
        const provided = new Set(Object.values(loadTagTable()).flat());
        for (const id of ['encounter-001', 'encounter-002']) {
            const e = loadEncounter(id);
            for (const tag of [...e.requiredLoadout, ...e.highlyRecommendedLoadout]) assert.equals(true, provided.has(tag), `${id}:${tag}`);
        }
    });

    return suite;
}
