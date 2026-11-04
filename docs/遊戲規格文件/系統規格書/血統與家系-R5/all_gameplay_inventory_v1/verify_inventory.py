"""Inventory integrity checks only. This is NOT gameplay acceptance."""
import pathlib,json,hashlib,collections
B=pathlib.Path(__file__).parent
M=json.load(open(B/'SOURCE_MANIFEST.json'));SHA=M['commit']
trees={x['prefix']:x['result'] for x in json.load(open(B/'trees.json'))}
assert all(not x['truncated'] for x in trees.values())
flat={}
for root,t in trees.items():
 for x in t['tree']:
  if x['type']=='blob':flat[('' if root=='root' else root+'/')+x['path']]=x
for r in M['files']:
 data=(B/'evidence'/r['path']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==r['sha256'],r['path']
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==r['blob_sha'],r['path']
 if r['path'] in flat:assert flat[r['path']]['sha']==r['blob_sha'],r['path']
code=json.load(open(B/'code_inventory.json'));tests=json.load(open(B/'test_inventory.json'));specs=json.load(open(B/'spec_inventory.json'));data=json.load(open(B/'data_catalog_inventory.json'));matrix=json.load(open(B/'system_matrix.json'));counts=json.load(open(B/'counts.json'))
for collection in [code,tests,specs]:
 for r in collection:assert r['path'] in flat and flat[r['path']]['sha']==r['blob_sha'],r['path']
for r in data:assert r['path'] in flat and flat[r['path']]['sha']==r['sha']
assert len({r['path'] for r in code})==852
assert len(tests)==1068 and len(specs)==309 and len(data)==56
assert dict(collections.Counter(x['read_status'] for x in code))==counts['code_read_status']
ids={d['id'] for d in matrix['provisional_gameplay_domains']+matrix['crosscutting_gates']}
assert len(matrix['provisional_gameplay_domains'])==42 and len(matrix['crosscutting_gates'])==4
for r in code:assert set(r['candidate_domains'])<=ids
for d in matrix['provisional_gameplay_domains']+matrix['crosscutting_gates']:
 assert d['full_acceptance']=='NOT_RUN'
 for p in d['source_candidates']+d['test_candidates']+d['spec_candidates']:assert p in flat,p
assert counts['full_gameplay_acceptance_pass']==0 and counts['new_execution_tests']==0
assert not any('G35' in x['candidate_domains'] for x in code if x['path'].endswith('/LegacyArena.ts'))
assert not any('G04' in x['candidate_domains'] for x in code if x['path'].endswith('/GeneralUnit.ts'))
print(json.dumps({'inventory_integrity':'PASS','source_files_verified':len(M['files']),'typescript_entries':len(code),'test_filenames_not_run':len(tests),'gameplay_domains':42,'crosscutting_gates':4,'full_gameplay_acceptance_pass':0,'new_gameplay_tests_run':0,'code_read_status':counts['code_read_status']},ensure_ascii=False,indent=2))
