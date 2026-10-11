const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/scripts/core/systems/FactorInheritance.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015 } }).outputText;
const sourceModule = { exports: {} };
new Function('module', 'exports', output)(sourceModule, sourceModule.exports);

// Read the actual Cocos build: TypeScript alone preserves iterator spread and cannot reproduce this bug.
function loadBuiltModule(bundlePath) {
    const definitions = new Map();
    const modules = new Map();
    const context = vm.createContext({
        System: { register(name, dependencies, factory) {
            if (Array.isArray(name)) {
                dependencies(() => {}, { meta: {} }).execute();
            } else definitions.set(name, { dependencies, factory });
        } },
    });
    const helpers = path.resolve(path.dirname(bundlePath), '../../src/chunks/bundle.js');
    for (const file of [helpers, bundlePath]) {
        vm.runInContext(fs.readFileSync(file, 'utf8'), context, { timeout: 10000 });
    }
    function load(name) {
        if (name === 'cc') return { cclegacy: { _RF: { push() {}, pop() {} } } };
        if (modules.has(name)) return modules.get(name);
        const definition = definitions.get(name);
        assert.ok(definition, `Missing built module: ${name}`);
        const exports = {};
        modules.set(name, exports);
        const declaration = definition.factory((key, value) => {
            if (typeof key === 'string') exports[key] = value;
            else Object.assign(exports, key);
            return value;
        });
        definition.dependencies.forEach((dependency, index) => {
            const resolved = dependency.startsWith('./') ? `chunks:///_virtual/${dependency.slice(2)}` : dependency;
            declaration.setters[index](load(resolved));
        });
        declaration.execute();
        return exports;
    }
    return load('chunks:///_virtual/FactorInheritance.ts');
}

function registerCases(label, getModule, options = {}) {
    test(`${label}: empty pool produces no phantom factor`, options, () => {
        const api = getModule();
        const factors = api.inheritFactors([], { random: () => 0 });
        assert.equal(factors.length, 0);
        assert.equal(api.toGeneConfigs(factors).length, 0);
    });
    test(`${label}: inherited genes retain identity, merge duplicates and respect the cap`, options, () => {
        const api = getModule();
        const sources = ['father', 'mother'].map(uid => ({ uid, generation: 1,
            factorIds: ['strength', 'strength', 'wisdom'],
            genes: [{ id: 'strength', type: 'blue' }, { id: 'wisdom', type: 'blue' }] }));
        const factors = api.inheritFactors(sources, { random: () => 0, maxFactors: 1 });
        assert.equal(factors.length, 1);
        assert.equal(factors[0].id, 'strength');
        assert.equal(factors[0].sourceUids.join(','), 'father,mother');
        const gene = api.toGeneConfigs(factors)[0];
        assert.equal(gene.id, 'strength');
        assert.equal(gene.type, 'blue');
        assert.equal(gene.level, 4);
        assert.equal(gene.displayName, 'strength');
        assert.equal(gene.isLocked, true);
    });
}

registerCases('TypeScript source', () => sourceModule.exports);
const bundle = process.env.COCOS_FACTOR_BUNDLE || path.join(root, 'build/web-desktop/assets/main/index.js');
let built;
registerCases('Actual Cocos Web bundle', () => built || (built = loadBuiltModule(bundle)),
    fs.existsSync(bundle) ? {} : { skip: 'Build Web first or set COCOS_FACTOR_BUNDLE; compiled verification has not run.' });
