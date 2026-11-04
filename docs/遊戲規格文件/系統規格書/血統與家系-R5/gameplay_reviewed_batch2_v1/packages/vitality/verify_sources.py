from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parent
manifest=json.loads((root/'SOURCE_MANIFEST.json').read_text())
assert manifest['commit']=='96a83124094d3b2485bfb749ef37d567ad834559'
for row in manifest['files']:
    b=(root/'evidence'/row['path']).read_bytes()
    assert len(b)==row['bytes'],row['path']
    assert hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
    assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==row['blob_sha'],row['path']
compiler=json.loads((root/'probes/vendor/COMPILER.json').read_text())
assert hashlib.sha256((root/'probes/vendor/typescript.js').read_bytes()).hexdigest()==compiler['sha256']
print(json.dumps({'sourceVerification':'PASS','commit':manifest['commit'],'files':len(manifest['files']),'compilerVersion':compiler['version'],'compilerSHA256':'PASS'}))
