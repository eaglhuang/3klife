/**
 * StageChainNodes — 連環破主鏈節點表（WBS LVL-01，PROG-2-0252）
 *
 * 用 encounters.json 的真實試作主鏈「虎牢關→長板坡」測試。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildStageChainNodes,
    EncounterChainSource,
    StageChainNode,
    toChainStages,
    validateStageChainNodes,
} from '../assets/scripts/core/systems/StageChainNodes';
import { isStageUnlocked, markStageCleared } from '../assets/scripts/core/systems/StageChainProgress';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

function loadEncounters(): EncounterChainSource[] {
    const raw = fs.readFileSync('assets/resources/data/encounters.json', 'utf8');
    return (JSON.parse(raw) as { encounters: EncounterChainSource[] }).encounters;
}

const GENERAL_NAMES: Record<string, string> = { 'lu-bu': '呂布', 'cao-cao': '曹操' };
const resolveName = (id: string): string => GENERAL_NAMES[id] ?? id;

function node(stageId: string, order: number, extra: Partial<StageChainNode> = {}): StageChainNode {
    return {
        stageId,
        chainId: 'test-chain',
        order,
        boss: 'boss-x',
        theme: '攻城',
        requiredLoadout: [],
        previewIntel: { enemyName: 'x', coreMechanic: '攻城', riskTags: [], recommendedLoadout: [] },
        ...extra,
    };
}

export function createStageChainNodesSuite(): TestSuite {
    const suite = new TestSuite('StageChainNodes (連環破主鏈節點表 LVL-01)');

    suite.test('真實資料：主鏈只取帶 chainId 的遭遇戰，依 order 排序，虎牢關在前', () => {
        const nodes = buildStageChainNodes(loadEncounters(), resolveName);
        assert.equals(2, nodes.length);
        assert.equals('encounter-001', nodes[0].stageId);
        assert.equals('encounter-002', nodes[1].stageId);
        assert.equals('changban-chain', nodes[0].chainId);
        assert.equals('lu-bu', nodes[0].boss);
        assert.equals('cao-cao', nodes[1].boss);
    });

    suite.test('真實資料：Theme 與 Required_Loadout 有值，節點表通過驗證', () => {
        const nodes = buildStageChainNodes(loadEncounters(), resolveName);
        assert.equals('攻城', nodes[0].theme);
        assert.equals('夜襲', nodes[1].theme);
        assert.equals(0, nodes[0].requiredLoadout.length);
        assert.equals(0, validateStageChainNodes(nodes).length);
    });

    suite.test('Preview_Intel：敵將名稱走查表，核心機制取 Theme，風險標籤預設空', () => {
        const [first] = buildStageChainNodes(loadEncounters(), resolveName);
        assert.equals('呂布', first.previewIntel.enemyName);
        assert.equals('攻城', first.previewIntel.coreMechanic);
        assert.equals(0, first.previewIntel.riskTags.length);
    });

    suite.test('順序解鎖：長板坡要虎牢關通關後才解鎖；虎牢關永遠可進', () => {
        const nodes = buildStageChainNodes(loadEncounters(), resolveName);
        const stages = toChainStages(nodes);
        assert.isTrue(isStageUnlocked('encounter-001', stages, new Set()));
        assert.isFalse(isStageUnlocked('encounter-002', stages, new Set()));
        const cleared = markStageCleared(new Set(), 'encounter-001');
        assert.isTrue(isStageUnlocked('encounter-002', stages, cleared));
    });

    suite.test('獨立關卡（沒有 chainId）不進節點表', () => {
        const nodes = buildStageChainNodes([
            { id: 'solo-1', order: 1, enemyGeneralId: 'lu-bu', theme: '攻城' },
            ...loadEncounters(),
        ], resolveName);
        assert.equals(2, nodes.length);
        assert.isTrue(nodes.every((n) => n.chainId === 'changban-chain'));
    });

    suite.test('驗證：缺 Theme 與缺 Boss 會回報', () => {
        const errors = validateStageChainNodes([node('s1', 1, { theme: ' ' }), node('s2', 2, { boss: '' })]);
        assert.equals(2, errors.length);
        assert.isTrue(errors.some((e) => e.startsWith('s1') && e.includes('Theme')));
        assert.isTrue(errors.some((e) => e.startsWith('s2') && e.includes('Boss')));
    });

    suite.test('驗證：Stage_ID 重複、order 重複或跳號都會回報', () => {
        const duplicateId = validateStageChainNodes([node('s1', 1), node('s1', 2)]);
        assert.isTrue(duplicateId.some((e) => e.includes('Stage_ID 重複')));

        const duplicateOrder = validateStageChainNodes([node('s1', 1), node('s2', 1)]);
        assert.isTrue(duplicateOrder.some((e) => e.includes('連續不重複')));

        const gap = validateStageChainNodes([node('s1', 1), node('s2', 3)]);
        assert.isTrue(gap.some((e) => e.includes('連續不重複')));
    });

    return suite;
}
