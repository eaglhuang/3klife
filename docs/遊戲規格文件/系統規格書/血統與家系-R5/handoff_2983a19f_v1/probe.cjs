const path = require('path');
const assert = require('assert/strict');
const root = path.join(__dirname, 'source');
require(path.join(root, 'node_modules/ts-node')).register({project:path.join(root,'tsconfig.test.json'),transpileOnly:true});
require(path.join(root,'tests/register-cc-test-stub.js'));
require(path.join(root,'tests/register-tsconfig-test-paths.js'));
const mod = p => require(path.join(root,'assets/scripts/core',p));
const ep=mod('systems/EpLegacyBonus.ts');
const kin=mod('systems/KinPurification.ts');
const div=mod('systems/DiversityFactor.ts');
const fat=mod('systems/BloodFatigue.ts');
const {GameSession,InMemoryRosterStore}=mod('managers/GameSession.ts');
const {PlayerSaveService}=mod('services/PlayerSaveService.ts');
const {MemoryStorageAdapter}=mod('storage/MemoryStorageAdapter.ts');
const results=[];
function check(name,f){const observed=f();results.push({name,status:'PASS',observed});}
(async()=>{
check('EP probability normalization and monotonic expectation 0..100',()=>{let prev=-Infinity; for(let i=0;i<=100;i++){const odds=ep.epBonusOdds(i);assert(Math.abs(odds.reduce((a,b)=>a+b,0)-1)<1e-12);assert(ep.meanEpBonus(i)>=prev-1e-12);prev=ep.meanEpBonus(i);}assert.deepEqual(ep.epBonusOdds(95),ep.epBonusOdds(100));return {difference86vs76:ep.meanEpBonus(86)-ep.meanEpBonus(76),fiveStatBonusDifference:5*(ep.meanEpBonus(86)-ep.meanEpBonus(76)),note:'bonus only; not full child P expectation'};});
check('m-only counterexample: actual inherited star changes',()=>{const input=[{id:'blue',level:3,sourceUids:['a']}];const targets=[{gene:{id:'blue',level:3,displayName:'藍'},ancestorName:'祖'}];const actual=kin.applyKinPurification(input,targets,{random:()=>0});assert.equal(actual.factors[0].level,4);assert.equal(input[0].level,3);return {before:3,after:4,roll:0,chance:kin.KIN_PURIFICATION_CHANCE,specConformance:'FAIL: changes star instead of cap only'};});
check('Missing pedigree produces diversity 1',()=>{assert.equal(div.diversityOfPair('f','m',undefined),1);assert.equal(div.diversityFactor({},{}),1);return {D:1,note:'missing ancestry not proof of complete unrelated ancestry'};});
check('h3 outcross -> h2 risk1%; then inbred -> h3 risk32%',()=>{const h2=fat.childBloodFatigue(3,0,false);assert.equal(h2,2);assert.equal(fat.birthFrailRisk(h2,false),.01);const h3=fat.childBloodFatigue(h2,0,true);assert.equal(h3,3);assert.equal(fat.birthFrailRisk(h3,true),.32);return {h2,h3};});
const store=new MemoryStorageAdapter();const save=new PlayerSaveService(store);const s=new GameSession(7);s.setAutoSave(false);s.setSaveService(save);s.startNewGame();const roster=[{id:'proof',name:'驗證',ep:76,bloodFatigue:2,genes:[],str:60,int:60,lea:60,pol:60,cha:60,luk:40}];s.setRosterStore(new InMemoryRosterStore(roster));const before=s.itemCount('oracle_token');assert.equal(await s.probePedigree('f','m'),true);await s.save();const t=new GameSession(7);t.setAutoSave(false);t.setRosterStore(new InMemoryRosterStore([]));t.setSaveService(save);await t.load();assert.equal(t.isPedigreeProbed('f','m'),true);assert.equal(t.roster.find(x=>x.id==='proof').ep,76);assert.equal(t.roster.find(x=>x.id==='proof').bloodFatigue,2);results.push({name:'GameSession save/load roundtrip',status:'PASS',observed:{ep:76,bloodFatigue:2,pedigreeProbe:true,storage:'MemoryStorageAdapter',notCovered:'browser storage, failed write, crash recovery'}});
console.log(JSON.stringify({sha:'2983a19f676e7a18c1a95aaccf34b62ce8a298fa',transpileOnly:true,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
