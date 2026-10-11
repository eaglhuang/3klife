const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.test.json');
require('./register-cc-test-stub');
require('ts-node/register/transpile-only');
const source = require('../assets/scripts/core/systems/SyncManager');
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
        if (name === 'cc') return { ...require('cc'), cclegacy: { _RF: { push() {}, pop() {} } } };
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
    return load('chunks:///_virtual/SyncManager.ts');
}


function cases(label,getApi,options={}){
 const merge=(...batches)=>getApi().SyncManager.prototype.mergeActionRecords(...batches);
 test(`${label}: empty batches produce no phantom pending record`,options,()=>assert.equal(merge([],[]).length,0));
 test(`${label}: deduplicate by sequence plus hash and sort real records`,options,()=>{
  const first={Seq:2,Tx_Hash:'second',Data:{value:2}};
  const earlier={Seq:1,Tx_Hash:'first',Data:{value:1}};
  const distinct={Seq:2,Tx_Hash:'other',Data:{value:3}};
  const batch=[first,earlier];
  const result=merge(batch,[{...first},distinct]);
  assert.equal(result.length,3);
  assert.equal(result.map(r=>r.Seq).join(','),'1,2,2');
  assert.equal(result.map(r=>r.Tx_Hash).join(','),'first,second,other');
  assert.equal(result[1],first);
  assert.equal(batch[0],first);
  assert.equal(batch.length,2);
 });
}
cases('TypeScript source',()=>source);
const bundle=process.env.COCOS_FACTOR_BUNDLE || path.join(root,'build/web-desktop/assets/main/index.js');
let compiled;
cases('Actual Cocos Web bundle',()=>compiled || (compiled=loadBuiltModule(bundle)),fs.existsSync(bundle)?{}:{skip:'Build Web first; compiled checks have not run.'});