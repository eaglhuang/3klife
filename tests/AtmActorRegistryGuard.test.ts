import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

type ActorRegistryGuard = {
    REGISTRY_RELATIVE_PATH: string;
    guardActorRegistry(repoRoot: string): () => boolean;
    isVolatileOnlyChange(beforeText: string, afterText: string): boolean;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const guard = require('../tools_node/atm-actor-registry-guard.js') as ActorRegistryGuard;

const REGISTRY_FILE = guard.REGISTRY_RELATIVE_PATH;

interface RegistryDoc {
    schemaId: string;
    specVersion: string;
    generatedAt: string;
    actors: Array<Record<string, string>>;
}

function serialize(doc: RegistryDoc): string {
    return `${JSON.stringify(doc, null, 2)}\n`;
}

function baseDoc(): RegistryDoc {
    return {
        schemaId: 'atm.actorRegistry',
        specVersion: '0.1.0',
        generatedAt: '2026-11-01T00:00:00.000Z',
        actors: [
            {
                actorId: 'claude-code-haiku-5-5',
                actorKind: 'ai-agent',
                displayName: 'Claude Code Haiku',
                createdAt: '2026-11-01T00:00:00.000Z',
                updatedAt: '2026-11-01T00:00:00.000Z',
            },
            {
                actorId: 'codex-gpt-6.1-sol',
                actorKind: 'ai-agent',
                displayName: 'Codex GPT 6.1 Sol',
                createdAt: '2026-10-01T00:00:00.000Z',
                updatedAt: '2026-10-01T00:00:00.000Z',
            },
        ],
    };
}

/** 模擬框架每次使用身分時的寫入：只更新 generatedAt 與該身分的 updatedAt。 */
function simulateFrameworkUse(repoRoot: string, actorId: string, now: string): void {
    const file = path.join(repoRoot, REGISTRY_FILE);
    const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as RegistryDoc;
    doc.generatedAt = now;
    for (const actor of doc.actors) {
        if (actor.actorId === actorId) actor.updatedAt = now;
    }
    fs.writeFileSync(file, serialize(doc), 'utf8');
}

function withTempRepo(run: (repoRoot: string) => void): void {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atm-registry-guard-'));
    try {
        fs.mkdirSync(path.join(repoRoot, path.dirname(REGISTRY_FILE)), { recursive: true });
        fs.writeFileSync(path.join(repoRoot, REGISTRY_FILE), serialize(baseDoc()), 'utf8');
        run(repoRoot);
    } finally {
        fs.rmSync(repoRoot, { recursive: true, force: true });
    }
}

export function createAtmActorRegistryGuardSuite(): TestSuite {
    const suite = new TestSuite('AtmActorRegistryGuard (actors.json 只差時間戳不寫檔)');

    suite.test('同一身分重複使用、內容不變時，actors.json 位元組完全不變', () => {
        withTempRepo((repoRoot) => {
            const file = path.join(repoRoot, REGISTRY_FILE);
            const original = fs.readFileSync(file);
            const restore = guard.guardActorRegistry(repoRoot);

            simulateFrameworkUse(repoRoot, 'codex-gpt-6.1-sol', '2026-11-15T17:12:00.000Z');
            assert.isTrue(restore(), '只差時間戳時應還原');
            assert.equals(original.toString('utf8'), fs.readFileSync(file).toString('utf8'));

            simulateFrameworkUse(repoRoot, 'codex-gpt-6.1-sol', '2026-11-15T17:20:00.000Z');
            simulateFrameworkUse(repoRoot, 'codex-gpt-6.1-sol', '2026-11-15T17:21:00.000Z');
            assert.isTrue(restore(), '多次使用後仍應還原');
            assert.isTrue(original.equals(fs.readFileSync(file)), '位元組必須與原始檔完全相同');
        });
    });

    suite.test('沒有任何寫入時 restore 不動檔案', () => {
        withTempRepo((repoRoot) => {
            const file = path.join(repoRoot, REGISTRY_FILE);
            const original = fs.readFileSync(file);
            const restore = guard.guardActorRegistry(repoRoot);
            assert.isFalse(restore());
            assert.isTrue(original.equals(fs.readFileSync(file)));
        });
    });

    suite.test('實質變化（新增身分）保留框架寫入結果', () => {
        withTempRepo((repoRoot) => {
            const file = path.join(repoRoot, REGISTRY_FILE);
            const restore = guard.guardActorRegistry(repoRoot);
            const doc = baseDoc();
            doc.actors.push({
                actorId: 'new-agent',
                actorKind: 'ai-agent',
                displayName: 'New Agent',
                createdAt: '2026-11-15T00:00:00.000Z',
                updatedAt: '2026-11-15T00:00:00.000Z',
            });
            fs.writeFileSync(file, serialize(doc), 'utf8');
            assert.isFalse(restore(), '有新增身分時不應還原');
            assert.isTrue(fs.readFileSync(file, 'utf8').includes('new-agent'));
        });
    });

    suite.test('實質變化（改 displayName）保留框架寫入結果', () => {
        withTempRepo((repoRoot) => {
            const file = path.join(repoRoot, REGISTRY_FILE);
            const restore = guard.guardActorRegistry(repoRoot);
            const doc = baseDoc();
            doc.actors[0].displayName = 'Renamed';
            fs.writeFileSync(file, serialize(doc), 'utf8');
            assert.isFalse(restore());
            assert.isTrue(fs.readFileSync(file, 'utf8').includes('Renamed'));
        });
    });

    suite.test('沒有 registry 檔時 guard 為 no-op 且不拋錯', () => {
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atm-registry-guard-empty-'));
        try {
            const restore = guard.guardActorRegistry(repoRoot);
            assert.isFalse(restore());
            assert.isFalse(fs.existsSync(path.join(repoRoot, REGISTRY_FILE)));
        } finally {
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    suite.test('isVolatileOnlyChange：解析失敗一律視為實質變化', () => {
        assert.isFalse(guard.isVolatileOnlyChange('not json', '{}'));
        const a = serialize(baseDoc());
        assert.isTrue(guard.isVolatileOnlyChange(a, a.replace('2026-11-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z')));
    });

    return suite;
}
