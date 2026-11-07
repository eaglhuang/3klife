/**
 * BloodlineArtForbiddenZone — 血脈美術禁區審查清單（血脈視覺契約補遺 doc_ui_0008、命鏡過場 doc_ui_0005 §9；BVC-04；PROG-2-2061）
 *
 * 清單在 tests/fixtures/bloodline-art-review-checklist.json：
 * - auto 項：掃血脈相關 screen 的 layout（含 $ref 片段）與 skin、血脈相關 i18n 字串、血脈相關 sprite 檔名，
 *   不得出現科技 DNA／實驗室／HUD 等字詞。
 * - manual 項：留給美術驗收逐項人工確認，本測試只檢查每項都有規則與規格出處。
 *
 * Unity 對照：像一支 EditMode 測試掃血脈相關 Prefab 與字串表，擋掉不符世界觀的命名。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const RES_DIR = path.resolve(__dirname, '../assets/resources');
const UI_SPEC_DIR = path.join(RES_DIR, 'ui-spec');
const CHECKLIST_FILE = path.resolve(__dirname, 'fixtures/bloodline-art-review-checklist.json');

interface ChecklistItem {
    id: string;
    check: 'auto' | 'manual';
    rule: string;
    source: string;
    patterns?: string[];
}

interface Checklist {
    scopes: { screens: string[]; i18nKeyPattern: string; spriteNamePattern: string };
    items: ChecklistItem[];
}

interface Hit {
    item: string;
    where: string;
    text: string;
}

const checklist = JSON.parse(fs.readFileSync(CHECKLIST_FILE, 'utf8')) as Checklist;

function autoRules(items: readonly ChecklistItem[]): Array<{ id: string; re: RegExp }> {
    return items
        .filter((item) => item.check === 'auto')
        .map((item) => ({ id: item.id, re: new RegExp((item.patterns ?? []).join('|'), 'i') }));
}

function matchText(text: string, where: string, rules: ReturnType<typeof autoRules>, hits: Hit[]): void {
    for (const rule of rules) {
        if (rule.re.test(text)) hits.push({ item: rule.id, where, text });
    }
}

function readSpec(relative: string): unknown {
    const file = path.join(UI_SPEC_DIR, relative.endsWith('.json') ? relative : `${relative}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 掃一份 spec 的鍵名與字串值（遇到 $ref 片段遞迴展開，同一片段只掃一次） */
function scanSpec(spec: unknown, source: string, rules: ReturnType<typeof autoRules>, hits: Hit[], seen: Set<string>, at = ''): void {
    if (Array.isArray(spec)) {
        spec.forEach((item, index) => scanSpec(item, source, rules, hits, seen, `${at}[${index}]`));
        return;
    }
    if (!spec || typeof spec !== 'object') return;
    for (const [key, value] of Object.entries(spec as Record<string, unknown>)) {
        const here = at ? `${at}.${key}` : key;
        matchText(key, `${source} ${here}`, rules, hits);
        if (typeof value === 'string') matchText(value, `${source} ${here}`, rules, hits);
        if (key === '$ref' && typeof value === 'string' && !seen.has(value)) {
            seen.add(value);
            scanSpec(readSpec(value), value, rules, hits, seen);
        }
        scanSpec(value, source, rules, hits, seen, here);
    }
}

function scanScreens(rules: ReturnType<typeof autoRules>): Hit[] {
    const hits: Hit[] = [];
    const seen = new Set<string>();
    for (const screenId of checklist.scopes.screens) {
        const screen = readSpec(`screens/${screenId}`) as { layout?: string; skin?: string };
        scanSpec(screen, `screens/${screenId}`, rules, hits, seen);
        if (screen.layout) scanSpec(readSpec(`layouts/${screen.layout}`), `layouts/${screen.layout}`, rules, hits, seen);
        if (screen.skin) scanSpec(readSpec(`skins/${screen.skin}`), `skins/${screen.skin}`, rules, hits, seen);
    }
    return hits;
}

/** i18n 字典攤平成 key → 字串 */
function flatten(obj: unknown, prefix: string, out: Map<string, string>): void {
    if (typeof obj === 'string') {
        out.set(prefix, obj);
        return;
    }
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) flatten(value, prefix ? `${prefix}.${key}` : key, out);
}

function scanI18n(rules: ReturnType<typeof autoRules>): Hit[] {
    const hits: Hit[] = [];
    const keyRe = new RegExp(checklist.scopes.i18nKeyPattern, 'i');
    const dir = path.join(RES_DIR, 'i18n');
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
        const entries = new Map<string, string>();
        flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), '', entries);
        for (const [key, text] of entries) {
            if (keyRe.test(key)) matchText(text, `i18n/${file} ${key}`, rules, hits);
        }
    }
    return hits;
}

function listFiles(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listFiles(full, out);
        else if (!entry.name.endsWith('.meta')) out.push(full);
    }
}

function scanSpriteNames(rules: ReturnType<typeof autoRules>): Hit[] {
    const hits: Hit[] = [];
    const nameRe = new RegExp(checklist.scopes.spriteNamePattern, 'i');
    const files: string[] = [];
    listFiles(path.join(RES_DIR, 'sprites'), files);
    for (const file of files) {
        const relative = path.relative(RES_DIR, file).replace(/\\/g, '/');
        if (nameRe.test(relative)) matchText(path.basename(file), relative, rules, hits);
    }
    return hits;
}

function format(hits: readonly Hit[]): string {
    return hits.map((h) => `${h.item} ${h.where}：${h.text}`).join('\n');
}

export function createBloodlineArtForbiddenZoneSuite(): TestSuite {
    const suite = new TestSuite('BloodlineArtForbiddenZone (血脈美術禁區審查清單 BVC-04 PROG-2-2061)');
    const rules = autoRules(checklist.items);

    suite.test('清單每項都有規則與規格出處；auto 項都有字詞', () => {
        for (const item of checklist.items) {
            assert.isTrue(item.rule.length > 0 && item.source.length > 0, `${item.id} 缺規則或出處`);
            if (item.check === 'auto') assert.isTrue((item.patterns ?? []).length > 0, `${item.id} 沒有字詞`);
        }
        assert.isTrue(rules.length > 0 && checklist.items.some((item) => item.check === 'manual'));
    });

    suite.test('血脈相關 screen 的 layout／skin 無科技 DNA、實驗室、HUD 字詞', () => {
        const hits = scanScreens(rules);
        assert.equals(0, hits.length, format(hits));
    });

    suite.test('血脈相關 i18n 字串無禁區字詞', () => {
        const hits = scanI18n(rules);
        assert.equals(0, hits.length, format(hits));
    });

    suite.test('血脈相關 sprite 檔名無禁區字詞', () => {
        const hits = scanSpriteNames(rules);
        assert.equals(0, hits.length, format(hits));
    });

    suite.test('檢查器本身：三類禁區字詞都會被抓到，一般字詞不誤判', () => {
        const hits: Hit[] = [];
        scanSpec({ name: 'DnaHelixBg', children: [{ text: '基因實驗室' }, { slot: 'mirror.hud.frame' }, { name: 'LabelTitle' }] }, 'fake', rules, hits, new Set());
        assert.equals(JSON.stringify(['BVC-FZ-01', 'BVC-FZ-02', 'BVC-FZ-03']), JSON.stringify(hits.map((h) => h.item).sort()), format(hits));
    });

    return suite;
}
