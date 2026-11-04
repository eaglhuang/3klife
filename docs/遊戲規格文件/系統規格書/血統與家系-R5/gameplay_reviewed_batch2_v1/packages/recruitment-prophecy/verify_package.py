#!/usr/bin/env python3
"""Offline exact-blob, artifact, original-method and deterministic rerun verifier."""
from pathlib import Path
import hashlib,json,subprocess,sys
B=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def verify():
 errors=[]
 manifest=json.loads((B/'SOURCE_MANIFEST.json').read_text())
 for r in manifest['sources']:
  p=B/r['file']; b=p.read_bytes()
  if sha(b)!=r['sha256'] or blob(b)!=r['git_blob_sha']: errors.append('source:'+r['path'])
 receipts=json.loads((B/'probes/extraction-receipts.json').read_text())
 for r in receipts:
  text=(B/'evidence'/r['path']).read_text()
  if r['kind']=='EXACT_ORIGINAL_METHOD':
   extracted='\n'.join(text.split('\n')[r['start_line']-1:r['end_line']])
   if extracted!=r['text'] or sha(extracted.encode())!=r['sha256']:errors.append('method:'+r['name'])
  elif r['kind'] in ('NATIVE_UNCHANGED_MODULE','MODULE_NO_IMPORT_EXPORT_WRAPPER') and sha(text.encode())!=r['source_sha256']: errors.append('module:'+r['path'])
 traces=json.loads((B/'probes/case-traces.json').read_text())['cases']
 results=json.loads((B/'probes/results.json').read_text())
 if set(traces)!=set(r['id'] for r in results['probes']):errors.append('trace_case_set')
 for case,entries in traces.items():
  if not entries:errors.append('empty_trace:'+case)
  for entry in entries:
   lines=(B/'evidence'/entry['path']).read_text().splitlines()
   if entry['line']<1 or entry['symbol'] not in lines[entry['line']-1]:errors.append('trace_source:'+case+':'+entry['symbol'])
 for r in json.loads((B/'source-references.json').read_text()):
  line=(B/'evidence'/r['path']).read_text().splitlines()[r['line']-1]
  if r['needle'] not in line:errors.append('reference:'+r['path']+':'+str(r['line']))
 for rel,expected in json.loads((B/'ARTIFACT_SHA256.json').read_text()).items():
  if not (B/rel).is_file() or sha((B/rel).read_bytes())!=expected:errors.append('artifact:'+rel)
 result={'source_count':len(manifest['sources']),'method_count':sum(r['kind']=='EXACT_ORIGINAL_METHOD' for r in receipts),'errors':errors,'full_acceptance':'NOT_RUN'}
 if errors:return result,1
 if '--rerun' in sys.argv:
  before=json.loads((B/'probes/results.json').read_text())
  receipt_before=(B/'probes/extraction-receipts.json').read_bytes()
  traces_before=(B/'probes/case-traces.json').read_bytes()
  p=subprocess.run(['node',str(B/'probes/run.mjs')],cwd=B,capture_output=True,text=True)
  after=json.loads((B/'probes/results.json').read_text())
  result['rerun_exit_code']=p.returncode;result['rerun_summary']=after['summary']
  if p.returncode or before!=after or receipt_before!=(B/'probes/extraction-receipts.json').read_bytes() or traces_before!=(B/'probes/case-traces.json').read_bytes():
   errors.append('rerun_not_identical');result['stderr']=p.stderr;result['stdout']=p.stdout
 result['status']='PASS' if not errors else 'FAIL'
 return result,1 if errors else 0
try:
 result,status=verify();print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit(status)
except Exception as e:
 print(json.dumps({'status':'ERROR','reason':str(e)},ensure_ascii=False));sys.exit(2)
