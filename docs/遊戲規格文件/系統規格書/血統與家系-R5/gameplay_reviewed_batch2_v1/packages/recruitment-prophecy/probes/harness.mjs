// Bounded source harness. Never imports game bootstrap, Cocos, or runs game storage.
// Modules: remove import/re-export declarations and export keywords only, then Node's
// built-in TypeScript transform erases types/parameter properties. All function text
// is otherwise verbatim. Class methods are exact line slices, recorded with SHA-256.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../evidence/',import.meta.url);
export const receipts=[];
export const caseTraces={};
let activeCase=null;
const symbolOrigins={};
export function traceBegin(id){activeCase=id;caseTraces[id]=[];}
export function traceEnd(){activeCase=null;}
const symbolLocations=new Map();
function symbolLocation(path,symbol){
 const key=path+'#'+symbol;if(symbolLocations.has(key))return symbolLocations.get(key);
 const lines=source(path).split('\n');const escaped=symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(?:function\\s+|class\\s+)'+escaped+'\\b|^\\s+(?:(?:public|private|protected|async|get)\\s+)*'+escaped+'\\(');
 const line=lines.findIndex(l=>pattern.test(l))+1;
 const receipt=receipts.find(r=>r.kind==='EXACT_ORIGINAL_METHOD'&&r.path===path&&r.name===symbol);
 const result={line,...(receipt?{method_sha256:receipt.sha256,end_line:receipt.end_line}:{})};symbolLocations.set(key,result);return result;
}
function recordTrace(path,symbol,kind){if(activeCase)caseTraces[activeCase].push({path,symbol,kind,...symbolLocation(path,symbol)});}
function wrapFunction(fn,path,symbol){
 if(/^class\s/.test(Function.prototype.toString.call(fn)))instrumentPrototype(fn,path);
 return new Proxy(fn,{apply(target,self,args){recordTrace(path,symbol,'function');return Reflect.apply(target,self,args);},construct(target,args,newTarget){recordTrace(path,symbol,'constructor');return Reflect.construct(target,args,newTarget);}});
}
function instrumentPrototype(cls,path){
 for(const name of Object.getOwnPropertyNames(cls.prototype)){
  if(name==='constructor')continue;const d=Object.getOwnPropertyDescriptor(cls.prototype,name);
  if(typeof d.value==='function'){const fn=d.value;d.value=function(...args){recordTrace(path,name,'method');return Reflect.apply(fn,this,args);};}
  if(typeof d.get==='function'){const fn=d.get;d.get=function(){recordTrace(path,name,'getter');return Reflect.apply(fn,this,[]);};}
  Object.defineProperty(cls.prototype,name,d);
 }
 return cls;
}
function instrumentExports(mod,path){const out={};for(const [name,value] of Object.entries(mod)){out[name]=typeof value==='function'?wrapFunction(value,path,name):value;symbolOrigins[name]={path,symbol:name};}return out;}
function dependencyContract(src,deps){
 const imports=[...src.matchAll(/^import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/gm)];
 return imports.map(m=>({specifier:m[3],declaration:m[0],bindings:m[2].split(',').map(raw=>{const item=raw.trim();const name=item.replace(/^type\s+/,'').split(/\s+as\s+/).at(-1);const explicitTypeOnly=!!m[1]||/^type\s/.test(item);return {name,explicit_type_only:explicitTypeOnly,handling:explicitTypeOnly?'ERASED_TYPE_IMPORT':Object.hasOwn(deps,name)?'INJECTED_EXACT_SOURCE_SYMBOL':'SKIPPED_UNAVAILABLE_OR_ERASED_TYPE',origin:Object.hasOwn(deps,name)?symbolOrigins[name]??{fixture:true}:null};})}));
}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export async function nativeModule(path){
 const src=source(path);const mod=await import(new URL(path,root));receipts.push({kind:'NATIVE_UNCHANGED_MODULE',path,source_sha256:sha(src),exports:Object.keys(mod)});return instrumentExports(mod,path);
}
export function source(path){return fs.readFileSync(new URL(path,root),'utf8');}
export function sourceModule(path,deps={}){
 const src=source(path);
 const names=[...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+([\w$]+)/gm)].map(x=>x[1]);
 let clean=src.replace(/^import\s+[^\n]+\n/gm,'').replace(/^export\s*\{[^}]*\}\s*(?:from\s*['"][^'"]+['"])?;?\s*$/gm,'').replace(/^export\s+/gm,'');
 const js=stripTypeScriptTypes(clean,{mode:'transform'});
 receipts.push({kind:'MODULE_NO_IMPORT_EXPORT_WRAPPER',path,source_sha256:sha(src),transformed_sha256:sha(js),exports:names,dependency_contract:dependencyContract(src,deps),injected_parameter_names:Object.keys(deps)});
 return instrumentExports(new Function(...Object.keys(deps),js+'\nreturn {'+names.join(',')+'};')(...Object.values(deps)),path);
}
export function exactMethod(path,name){
 const lines=source(path).split('\n');
 const start=lines.findIndex(l=>new RegExp('^    (?:public |private |protected )?(?:async )?(?:get )?'+name+'\\(').test(l));
 if(start<0)throw new Error('Missing method '+name);
 let end=start+1;while(end<lines.length&&lines[end]!=='    }')end++;
 if(end===lines.length)throw new Error('No exact end '+name);
 const text=lines.slice(start,end+1).join('\n');
 receipts.push({kind:'EXACT_ORIGINAL_METHOD',path,name,start_line:start+1,end_line:end+1,sha256:sha(text),text});
 return text;
}
export function sourceClass(path,names,deps={}){
 const src='class BoundedOriginalMethods {\n'+names.map(n=>exactMethod(path,n)).join('\n')+'\n}\n';
 const js=stripTypeScriptTypes(src,{mode:'transform'});
 const used={};for(const [key,value] of Object.entries(deps))if(new RegExp('\\b'+key+'\\b').test(src))used[key]=value;
 receipts.push({kind:'CLASS_WRAPPER_DEPENDENCY_CONTRACT',path,methods:names,extraction:'FIXED_LINE_RANGE_TEXT_NOT_AST',dependency_contract:dependencyContract(source(path),used).filter(row=>row.bindings.some(b=>Object.hasOwn(used,b.name))),injected_referenced_symbols:Object.keys(used),fixtures:Object.keys(used).filter(name=>!symbolOrigins[name])});
 return instrumentPrototype(new Function(...Object.keys(deps),js+'\nreturn BoundedOriginalMethods;')(...Object.values(deps)),path);
}
export function writeReceipts(){fs.writeFileSync(new URL('./case-traces.json',import.meta.url),JSON.stringify({mechanism:'Outside-body invocation wrappers, original bodies unchanged; no argument values collected',cases:caseTraces},null,2)+'\n');fs.writeFileSync(new URL('./extraction-receipts.json',import.meta.url),JSON.stringify(receipts,null,2)+'\n');}
