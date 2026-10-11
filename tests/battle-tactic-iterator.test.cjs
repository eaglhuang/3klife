const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.test.json');
require('ts-node/register/transpile-only');
const source = require('../assets/scripts/core/systems/BattleRoster');
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
    return load('chunks:///_virtual/BattleRoster.ts');
}


function cases(label,getApi,options={}){
 const make=learnedTactics=>({id:'graduate',name:'Graduate',faction:'player',hp:100,str:40,lea:40,learnedTactics});
 test(`${label}: empty learned list creates no phantom slot`,options,()=>{
  const result=getApi().buildBattleConfig(make([]),'player');
  assert.equal(result.tacticSlots.length,0);
 });
 test(`${label}: learned tactics deduplicate while preserving order and cap`,options,()=>{
  const general=make(['one','one','two','three','four','five']);
  const result=getApi().buildBattleConfig(general,'player');
  assert.equal(result.tacticSlots.map(x=>x.tacticId).join(','),'one,two,three,four');
  assert.equal(general.learnedTactics.length,6);
 });
 test(`${label}: explicit slots retain existing precedence`,options,()=>{
  const general={...make(['learned']),tacticSlots:[{slotId:'explicit',tacticId:'equipped',source:'learned'}]};
  const result=getApi().buildBattleConfig(general,'player');
  assert.equal(result.tacticSlots[0].tacticId,'equipped');
 });
}
cases('TypeScript source',()=>source);
const bundle=process.env.COCOS_FACTOR_BUNDLE || path.join(root,'build/web-desktop/assets/main/index.js');
let compiled;
cases('Actual Cocos Web bundle',()=>compiled || (compiled=loadBuiltModule(bundle)),fs.existsSync(bundle)?{}:{skip:'Build Web first; compiled checks have not run.'});
