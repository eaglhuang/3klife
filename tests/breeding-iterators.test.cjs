const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.test.json');
require('ts-node/register/transpile-only');
const source = require('../assets/scripts/core/systems/BreedingSystem');
const root = path.resolve(__dirname, '..');
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
    return load('chunks:///_virtual/BreedingSystem.ts');
}


function cases(label, getApi, options = {}) {
 test(`${label}: registry factor IDs are strings and deduplicated`, options, () => {
  const api=getApi();
  const profile=api.resolveAncestorProfile('parent', {getPerson:()=>({gene_refs:['gene_bravery','gene_bravery','gene_mountain'],core_tags:['brave']})});
  assert.equal(profile.factorIds.join(','),'gene_bravery,gene_mountain');
  assert.equal(profile.tags.join(','),'brave,gene_bravery,gene_mountain');
 });
 test(`${label}: repeated ancestor tags preserve resonance and deterministic ties`, options, () => {
  const api=getApi();
  const pedigree={F:'one',M:'two',FF:'three'};
  const profiles=new Map(['one','two','three'].map(uid=>[uid,{uid,tags:['zeta','alpha'],factorIds:[],genes:[]}]));
  const result=api.computeEpMvp(pedigree,profiles,false);
  assert.equal(result.topTag,'alpha');
  assert.equal(result.topTagCount,3);
  assert.equal(result.resonance,15);
  assert.equal(result.ep,65);
 });
}
cases('TypeScript source',()=>source);
const bundle=process.env.COCOS_FACTOR_BUNDLE || path.join(root,'build/web-desktop/assets/main/index.js');
let compiled;
cases('Actual Cocos Web bundle',()=>compiled || (compiled=loadBuiltModule(bundle)),fs.existsSync(bundle)?{}:{skip:'Build Web first; compiled checks have not run.'});