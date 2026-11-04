#!/usr/bin/env python3
"""Offline integrity and deterministic replay verification. No product writes."""
import argparse, hashlib, json, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--run-probes',action='store_true');args=parser.parse_args()
def digest(b):return hashlib.sha256(b).hexdigest()
def read(p):return (ROOT/p).read_bytes()
manifest=json.loads(read('SOURCE_MANIFEST.json'))
assert manifest['commit']=='96a83124094d3b2485bfb749ef37d567ad834559'
seen=set()
for e in manifest['sources']:
 assert e['path'] not in seen,e['path'];seen.add(e['path']);b=read(e['file'])
 assert len(b)==e['bytes'],e['file'];assert digest(b)==e['sha256'],e['file']
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==e['git_blob_sha'],e['file']
 assert '/blob/'+manifest['commit']+'/' in e['source_url'],e['source_url']
extractions=json.loads(read('probes/extractions.json'))
for e in extractions:
 text=read('evidence/'+e['path']).decode();assert digest(text.encode())==e['source_sha256']
 # TS uses UTF-16 code units for AST offsets, not Python Unicode codepoints.
 utf16=text.encode('utf-16-le');raw=utf16[e['start_offset']*2:e['end_offset']*2].decode('utf-16-le')
 assert digest(raw.encode())==e['slice_sha256'],e['file']
 assert read(e['file'])==(raw+'\n').encode(),e['file']
 start=text.encode('utf-16-le')[:e['start_offset']*2].decode('utf-16-le').count('\n')+1
 assert start==e['start_line'],e['file']
compiler=json.loads(read('probes/vendor/COMPILER.json'));assert compiler['version']=='5.9.3';assert digest(read('probes/vendor/typescript.js'))==compiler['sha256']
artifacts=json.loads(read('ARTIFACT_SHA256.json'))
def verify_artifacts():
 for name,h in artifacts.items():assert digest(read(name))==h,name
verify_artifacts()
result=json.loads(read('probes/results.json'));assert result['total']==44 and result['passed']==44 and result['failed']==0
assert all(x=='NOT_RUN' for x in result['full_acceptance'].values())
if args.run_probes:
 before=read('probes/results.json');r=subprocess.run(['node',str(ROOT/'probes/run.mjs')],cwd=ROOT,text=True,capture_output=True)
 if r.returncode:print(r.stdout);print(r.stderr,file=sys.stderr);raise SystemExit(r.returncode)
 assert read('probes/results.json')==before,'Replay result changed';verify_artifacts()
print(json.dumps({'integrity':'PASS','sources':len(seen),'original_ast_slices':len(extractions),'compiler':'TypeScript 5.9.3','observations':44,'replayed':args.run_probes,'full_acceptance':result['full_acceptance']},ensure_ascii=False))
