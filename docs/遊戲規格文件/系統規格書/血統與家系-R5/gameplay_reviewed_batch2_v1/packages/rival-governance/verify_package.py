#!/usr/bin/env python3
import argparse,hashlib,json,pathlib,subprocess,tempfile,os
ROOT=pathlib.Path(__file__).resolve().parent
ap=argparse.ArgumentParser();ap.add_argument('--run',action='store_true');args=ap.parse_args()
def sha(b):return hashlib.sha256(b).hexdigest()
m=json.loads((ROOT/'SOURCE_MANIFEST.json').read_text());assert m['commit']=='96a83124094d3b2485bfb749ef37d567ad834559'
assert len({f['path'] for f in m['files']})==len(m['files'])
for f in m['files']:
 b=(ROOT/'evidence'/f['path']).read_bytes();assert len(b)==f['bytes'];assert sha(b)==f['sha256'],f['path'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==f['blob_sha'],f['path']
r=json.loads((ROOT/'probes/results.json').read_text())
for e in r['extracted']:
 source=(ROOT/'evidence'/e['path']).read_text();raw=(ROOT/e['sliceFile']).read_text();u=source.encode('utf-16-le');piece=u[e['startUtf16']*2:e['endUtf16']*2].decode('utf-16-le');assert raw==piece,e['method'];assert sha(raw.encode())==e['sha256'],e['method']
compiler=json.loads((ROOT/'probes/vendor/COMPILER.json').read_text());assert sha((ROOT/'probes/vendor/typescript.js').read_bytes())==compiler['sha256'];assert compiler['version']=='5.9.3'
if (ROOT/'ARTIFACT_SHA256.json').exists():
 a=json.loads((ROOT/'ARTIFACT_SHA256.json').read_text())
 for f in a['files']:assert sha((ROOT/f['path']).read_bytes())==f['sha256'],f['path']
report={'sourceFilesVerified':len(m['files']),'exactOriginalMethodSlicesVerified':len(r['extracted']),'compiler':'5.9.3','fullDomainAcceptance':'NOT_RUN','artifactHashes':'PASS'}
if args.run:
 with tempfile.TemporaryDirectory(prefix='verify-run-',dir=ROOT) as tmp:
  output=pathlib.Path(tmp)/'results.json';env={**os.environ,'G23_PROBE_RESULTS':str(output)}
  cmd=['node','--loader',str(ROOT/'probes/ts-resolver.mjs'),str(ROOT/'probes/run.mjs')]
  process=subprocess.run(cmd,cwd=tmp,env=env,capture_output=True,text=True)
  report.update({'probeCommand':cmd,'probeExitCode':process.returncode,'stdout':process.stdout.strip()})
  assert process.returncode==0,process.stderr
  got=json.loads(output.read_text());assert got['probes']==45 and got['passed']==45 and got['failed']==0
  report['probes']={'count':got['probes'],'passed':got['passed'],'failed':got['failed']};report['ranFromIsolatedCwd']=True
print(json.dumps(report,ensure_ascii=False,indent=2))
