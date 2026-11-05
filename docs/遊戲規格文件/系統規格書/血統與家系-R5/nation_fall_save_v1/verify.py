#!/usr/bin/env python3
"""Offline source-proof verification plus fresh external byte-identical replay."""
import pathlib,json,hashlib,tempfile,subprocess,sys
P=pathlib.Path(__file__).resolve().parent
HEAD='106f053db7b7d7af8d800722158c4a35bb65d3aa';F4='f4eca8189223b1cd7e4f4457019ddac73c46a9be';EFF='eff5c260ebff9fc13f8a2e5f03655477d7b4aa82'
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def read(p):return json.loads((P/p).read_text())
def files(p):
 entries=list(p.rglob('*'));assert not any(f.is_symlink() for f in entries),'Symlink rejected'
 return sorted(f.relative_to(p).as_posix() for f in entries if f.is_file())
def api(p):return json.loads(read(p)['structuredContent']['content'])
def check():
 seal=read('PACKAGE_SHA256.json');assert set(files(P))==set(seal)|{'PACKAGE_SHA256.json'}
 for p,h in seal.items():assert sha((P/p).read_bytes())==h,p
 m=read('SOURCE_MANIFEST.json');assert m['head']==HEAD
 prior='provenance/prior-birth-coverage/';oldseal=read(prior+'PACKAGE_SHA256.json')
 assert sha((P/prior/'PACKAGE_SHA256.json').read_bytes())=='026890dcddac7a79cd023ef034f937ceb86b9eb83c97b3ccd64046a3834c7f83', 'prior delivered seal identity'
 for rel in ['REPORT.md','results/module-call-trace.json','results/execution-scope.json']:
  assert sha((P/prior/rel).read_bytes())==oldseal[rel],rel
 from collections import Counter
 calls=[r for r in read(prior+'results/module-call-trace.json') if r['path']=='assets/scripts/core/systems/RivalPlayerEvents.ts' and r['symbol']=='resolveRivalPlayerEvents' and r['event']=='call']
 assert len(calls)==22 and dict(Counter(r['caseId'] for r in calls))=={'BN01':20,'BN03':1,'BN04':1}

 prefix='provenance/base-bridge/';c=api(prefix+'commit-api.json');p2=api(prefix+'commit-page2-api.json');base=read(prefix+'eff-source-manifest.json');bm={r['path']:r for r in base['files']}
 assert c['sha']==p2['sha']==F4 and base['sha']==EFF
 assert [r['sha'] for r in c['parents']]==[EFF] and [r['sha'] for r in p2['parents']]==[EFF]
 assert len(c['files'])==7 and p2['files']==[] and len(base['files'])==15580
 h=read(prefix+'head.json');assert h['requested_ref']=='master' and h['response']['commit']['sha']==F4
 bc=json.loads(read(prefix+'eff-git-commit.json')['content']);assert bc['sha']==EFF and bc['tree']['sha']==base['tree']
 def gh(kind,data):return hashlib.sha1(kind.encode()+b' '+str(len(data)).encode()+b'\0'+data).digest()
 tree={}
 for row in base['files']:
  parts=row['path'].split('/');assert all(x not in ('','.','..') for x in parts);node=tree
  for part in parts[:-1]:node=node.setdefault(part,{})
  assert parts[-1] not in node;node[parts[-1]]=(row['mode'].encode(),bytes.fromhex(row['git_blob_sha1']))
 def th(node):
  rows=[]
  for name,value in node.items():
   directory=isinstance(value,dict);mode,digest=(b'40000',th(value)) if directory else value
   rows.append((name.encode()+(b'/' if directory else b''),mode+b' '+name.encode()+b'\0'+digest))
  return gh('tree',b''.join(v for _,v in sorted(rows)))
 assert th(tree).hex()==base['tree']=='669df967f997eeb644e1093bb042159903c621e0'
 current='provenance/current-receipts/';cmp=api(current+'compare1.json');cmp2=api(current+'compare2.json');bridge=read('provenance/version-bridge.json')
 assert cmp['base_commit']['sha']==cmp['merge_base_commit']['sha']==cmp2['base_commit']['sha']==F4
 assert cmp['total_commits']==cmp['ahead_by']==cmp2['total_commits']==4 and cmp['behind_by']==0 and cmp2['commits']==[]
 assert cmp2.get('files',[])==[] and len(cmp['files'])==27 and len(cmp['commits'])==4
 assert read('provenance/changed-paths.json')==cmp['files']
 previous=F4
 for commit,b in zip(cmp['commits'],bridge['commits']):
  assert [x['sha'] for x in commit['parents']]==[previous]==b['parents'];assert commit['sha']==b['sha'];previous=commit['sha']
 assert previous==HEAD and bridge['head']==HEAD and bridge['base']==F4
 assert bridge['observed_utc']==['2026-11-04T22:00:57.510Z','2026-11-04T22:00:59.185Z']
 assert api(current+'master.json')['commit']['sha']==HEAD
 for number,commit in [(1675,F4),(1676,cmp['commits'][0]['sha'])]:
  pr=api(current+f'pr{number}.json');assert pr['number']==number and pr['merged'] is True and pr['merge_commit_sha']==commit and pr['merged_at']
 changes={r['filename']:r for r in cmp['files']};oldchanges={r['filename']:r for r in c['files']}
 identities=read('provenance/source-identities.json');assert len(identities)==22
 rawby={}
 for ident in identities:
  marker='/blob/'+HEAD+'/';assert marker in ident['url'];path=ident['url'].split(marker)[1];raw=read(current+pathlib.Path(path).name+'.json')['structuredContent'];b=raw['content'].encode();assert blob(b)==ident['actual_git_blob']==ident['expected_git_blob'];assert ident['matches'] is True
  assert raw.get('sha',blob(b))==blob(b);assert marker in raw.get('display_url','') or 'ref='+HEAD in raw.get('url','');rawby[path]=b
 assert len(m['sources'])==211 and set(files(P/'sources'))=={r['path'] for r in m['sources']}
 for r in m['sources']:
  path=r['path'];b=(P/'sources'/path).read_bytes();assert sha(b)==r['sha256'] and blob(b)==r['git_blob_sha1'] and len(b)==r['bytes'],path
  if path in changes:assert blob(b)==changes[path]['sha'] and rawby[path]==b,path
  elif path in oldchanges:
   assert blob(b)==oldchanges[path]['sha'],path
   raw=read(prefix+pathlib.Path(path).name+'.json')['structuredContent'];assert raw['content'].encode()==b
  else:assert blob(b)==bm[path]['git_blob_sha1'] and sha(b)==bm[path]['sha256'],path
  if path in rawby:assert rawby[path]==b
 for x in read('results/extractions.json'):
  raw=(P/'sources'/x['path']).read_bytes();assert sha(raw)==x['source_sha256'];fragment=raw.decode().encode('utf-16-le')[x['start_offset']*2:x['end_offset']*2].decode('utf-16-le');assert sha(fragment.encode())==x['sha256'];assert (P/'results'/x['file']).read_text()==fragment+'\n'
 compiler=read('probes/vendor/COMPILER.json');assert compiler['version']=='5.9.3' and sha((P/'probes/vendor/typescript.js').read_bytes())==compiler['sha256']
 result=read('results/results.json')['results'];assert [x['id'] for x in result]==['NF01','NF02'] and all(x['status']=='PASS' for x in result)
 return m
if __name__=='__main__':
 try:
  m=check()
  with tempfile.TemporaryDirectory(prefix='nation-fall-verify-') as tmp:
   out=pathlib.Path(sys.argv[1]).absolute() if len(sys.argv)>1 else pathlib.Path(tmp)/'replay';subprocess.run(['node',str(P/'probes/run.mjs'),str(out)],cwd=tmp,check=True)
   assert files(out)==files(P/'results')
   for rel in files(out):assert (out/rel).read_bytes()==(P/'results'/rel).read_bytes(),'Byte replay mismatch '+rel
  check();print(json.dumps({'verified':True,'head':HEAD,'sources':len(m['sources']),'cases':2,'external_byte_identical_replay':True,'source_proof':'eff complete Git tree + f4 seven-path bridge + four linear commits/27-path complete compare + PR merged + bounded HEAD observation'}))
 except Exception as e:print('VERIFY FAILED: '+str(e),file=sys.stderr);sys.exit(1)
