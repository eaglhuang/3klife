#!/usr/bin/env python3
"""Seal only this local documentation package; no upload or repository writes."""
import pathlib,json,hashlib,datetime
root=pathlib.Path(__file__).resolve().parents[1]
files=[]
for p in sorted(root.rglob("*")):
    if not p.is_file() or p.name=="package_manifest.json" or "__pycache__" in p.parts: continue
    b=p.read_bytes()
    files.append({"path":str(p.relative_to(root)),"size_bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
report=json.loads((root/"validation/validation_result.json").read_text())
out={"manifest_kind":"CURRENT_LOCAL_DOCUMENT_WORK_PACKAGE_NOT_ORIGINAL_R5_MANIFEST",
"baseline_commit":"b35b349c01e728358a8ef9a21cbcb8fbdd9dadfe",
"sealed_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
"document_validation_status":report["status"],"product_tests":"NOT_RUN",
"files":files,"file_count_excluding_this_manifest":len(files),"total_bytes_excluding_this_manifest":sum(x["size_bytes"] for x in files)}
(root/"package_manifest.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in out.items() if k!="files"},ensure_ascii=False,indent=2))

