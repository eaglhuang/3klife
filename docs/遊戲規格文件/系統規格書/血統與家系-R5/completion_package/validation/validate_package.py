#!/usr/bin/env python3
"""Validate this documentation work package. This does not run product tests."""
import json,re,hashlib,pathlib,urllib.parse,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT.parent
HEAD="b35b349c01e728358a8ef9a21cbcb8fbdd9dadfe"
expected={f"R5F-{g}{i:02d}" for g,n in [("C",5),("U",2),("E",3),("B",10),("G",8),("S",8),("A",2)] for i in range(1,n+1)}
errors=[]; warnings=[]; records={}; cache_files=[]
for p in sorted(BASE.glob("*source-cache*b35b349c.json")):
    if not p.name.startswith(("3klife-r5-","3klife-crossgame-")): continue
    cache_files.append(p.name)
    d=json.loads(p.read_text(encoding="utf-8"))
    for r in d.get("records",d.get("sources",[])):
        path=r.get("path")
        if not path:
            url=r.get("display_url","")
            m=re.search(r"/blob/[^/]+/(.+?)(?:\?|#|$)",url)
            if m: path=urllib.parse.unquote(m.group(1))
        if not path or not isinstance(r.get("content"),str): continue
        body=r["content"]; raw=body.encode("utf-8")
        blob=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
        claimed=r.get("sha")
        if claimed and claimed!=blob:
            errors.append({"kind":"source_blob_mismatch","path":path,"expected":claimed,"actual":blob})
        if path in records and records[path]["content"]!=body:
            errors.append({"kind":"duplicate_source_disagreement","path":path})
        records[path]={"path":path,"content":body,"git_blob_sha":blob,"size_bytes":len(raw),
            "line_count":len(body.split("\n")),"sha256":hashlib.sha256(raw).hexdigest()}
invpath=ROOT/"evidence/system_inventory.json"
inventory=json.loads(invpath.read_text()) if invpath.exists() else {}
tree={x["path"]:x["git_blob_sha"] for x in inventory.get("files",[])}
for path,r in records.items():
    if path in tree and tree[path]!=r["git_blob_sha"]:
        errors.append({"kind":"baseline_tree_mismatch","path":path})
citations=[]; missing=set(); links=0; headings=0; markdown_tables=0
for p in sorted(ROOT.rglob("*.md")):
    body=p.read_text(encoding="utf-8")
    headings+=len(re.findall(r"^#{1,6} ",body,re.M))
    table_width=None
    for line_no,line in enumerate(body.splitlines(),1):
        if line.startswith("|") and line.rstrip().endswith("|"):
            width=len(re.split(r"(?<!\\)\|",line))-2
            if table_width is None:
                table_width=width; markdown_tables+=1
            elif width!=table_width:
                errors.append({"kind":"markdown_table_width","document":str(p.relative_to(ROOT)),"line":line_no,"expected":table_width,"actual":width})
        else: table_width=None
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)",body):
        links+=1; target=target.strip()
        if target.startswith(("https://","http://")):
            u=urllib.parse.urlsplit(target)
            if u.netloc!="github.com": continue
            m=re.match(r"/eaglhuang/3klife/blob/([^/]+)/(.+)",urllib.parse.unquote(u.path))
            if not m: continue
            ref,path=m.groups()
            if ref!=HEAD: errors.append({"kind":"unpinned_source_ref","document":str(p.relative_to(ROOT)),"url":target})
            span=re.fullmatch(r"L(\d+)(?:-L(\d+))?",u.fragment)
            start=int(span.group(1)) if span else None
            end=int(span.group(2) or span.group(1)) if span else None
            row={"document":str(p.relative_to(ROOT)),"path":path,"url":target,"start_line":start,"end_line":end}
            if path not in records: missing.add(path)
            elif span:
                source=records[path]; n=source["line_count"]
                if start<1 or end<start or end>n:
                    errors.append({"kind":"source_line_range","source_lines":n,**row})
                else:
                    row["excerpt"]="\n".join(source["content"].split("\n")[start-1:end])
                    row["source_git_blob_sha"]=source["git_blob_sha"]
            else:
                warnings.append({"kind":"source_without_line_range",**row})
            citations.append(row)
        elif not target.startswith(("#","mailto:")):
            local=urllib.parse.unquote(target.split("#",1)[0])
            if local and not (p.parent/local).exists():
                errors.append({"kind":"missing_local_link","document":str(p.relative_to(ROOT)),"target":target})
# Validate machine-readable source references separately from Markdown links.
json_reference_count=0
def walk_source_refs(node, origin, pointer=""):
    global json_reference_count
    if isinstance(node,dict):
        if "url" in node and "start_line" in node and "end_line" in node and "path" in node:
            json_reference_count+=1
            path=node["path"]; start=node["start_line"]; end=node["end_line"]
            url=node["url"]
            if f"/blob/{HEAD}/" not in url:
                errors.append({"kind":"unpinned_json_source","document":origin,"pointer":pointer,"url":url})
            if path not in records: missing.add(path)
            elif not isinstance(start,int) or not isinstance(end,int) or start<1 or end<start or end>records[path]["line_count"]:
                errors.append({"kind":"json_source_line_range","document":origin,"pointer":pointer,"path":path,"start":start,"end":end})
            elif node.get("blob_sha") and node["blob_sha"]!=records[path]["git_blob_sha"]:
                errors.append({"kind":"json_source_blob_mismatch","document":origin,"pointer":pointer,"path":path})
        for k,v in node.items(): walk_source_refs(v,origin,pointer+"/"+str(k))
    elif isinstance(node,list):
        for i,v in enumerate(node): walk_source_refs(v,origin,pointer+"/"+str(i))
for name in ["authority_issues.json","feature_tracker.json","cross_gameplay_cases.json"]:
    jp=ROOT/"evidence"/name
    if jp.exists(): walk_source_refs(json.loads(jp.read_text()),"evidence/"+name)

required=["README.md","specs/01_權威與衝突帳.md","specs/02_全玩法接口矩陣.md",
"specs/03_38功能與待決補件追蹤.md","specs/04_共同資料事件時鐘契約.md","specs/05_跨玩法驗收案例.md",
"evidence/feature_tracker.json","evidence/cross_gameplay_cases.json"]
missing_outputs=[x for x in required if not (ROOT/x).exists()]
checks={"source_cache_files":len(cache_files),"unique_sources":len(records),"system_tree_sources_verified":sum(x in tree for x in records),
"markdown_links":links,"markdown_tables":markdown_tables,"json_source_references":json_reference_count,"headings":headings,"citations":len(citations),"missing_outputs":missing_outputs}
ap=ROOT/"evidence/authority_issues.json"
if ap.exists():
    issues=json.loads(ap.read_text()).get("items",[])
    checks["authority_issues"]=len(issues)
    if len(issues)!=28 or len({x.get("id") for x in issues})!=28:
        errors.append({"kind":"authority_issue_coverage"})
mp=ROOT/"specs/02_全玩法接口矩陣.md"
if mp.exists():
    matrix=mp.read_text(encoding="utf-8")
    entrances=set(re.findall(r"\bGP\d{2}-\d+\b",matrix))
    groups={x.split("-")[0] for x in entrances}
    expectations=set(re.findall(r"\bGP-A\d+\b",matrix))
    checks.update({"gameplay_groups":len(groups),"gameplay_entrances":len(entrances),"interface_expectations":len(expectations)})
    if len(groups)!=12 or len(entrances)!=53 or len(expectations)!=44:
        errors.append({"kind":"gameplay_matrix_coverage"})
fp=ROOT/"evidence/feature_tracker.json"
if fp.exists():
    data=json.loads(fp.read_text()); feats=data.get("features",[]) if isinstance(data,dict) else data
    checks["features"]=len(feats)
    ids=[x.get("feature_id",x.get("id")) for x in feats]
    expected={f"R5F-{g}{i:02d}" for g,n in [("C",5),("U",2),("E",3),("B",10),("G",8),("S",8),("A",2)] for i in range(1,n+1)}
    if len(ids)!=38 or set(ids)!=expected: errors.append({"kind":"feature_coverage","ids":ids})
    cases_old=[cid for f in feats for cid in f.get("existing_document_case_ids",[])]
    checks["existing_document_case_count"]=len(cases_old)
    if len(cases_old)!=346 or len(set(cases_old))!=346: errors.append({"kind":"original_case_coverage","count":len(cases_old)})
    optional=[f["feature_id"] for f in feats if f.get("scope")=="OPTIONAL_PROPOSAL_NOT_SELECTED"]
    checks["unselected_proposals"]=optional
    if set(optional)!={"R5F-S07","R5F-S08"}: errors.append({"kind":"proposal_scope","ids":optional})
    for f in feats:
        if f.get("implementationReady") is not False or f.get("test_status")!="NOT_RUN" or f.get("implementation_status")!="NOT_VERIFIED":
            errors.append({"kind":"feature_execution_status","feature":f.get("feature_id")})
    if isinstance(data,dict):
        for k,n in [("decisions",19),("gaps",17)]:
            if k in data:
                checks[k]=len(data[k])
                if len(data[k])!=n: errors.append({"kind":k+"_count","count":len(data[k])})
cp=ROOT/"evidence/cross_gameplay_cases.json"
if cp.exists():
    data=json.loads(cp.read_text()); cases=data.get("cases",[]) if isinstance(data,dict) else data
    checks["cross_gameplay_cases"]=len(cases)
    coverage={f for c in cases for f in c.get("feature_refs",[])}
    checks["cross_case_feature_references"]=len(coverage)
    checks["features_without_cross_case"]=sorted(expected-coverage)
    checks["cross_cases_with_conditional_assertions"]=sum(bool(c.get("blocked_assertions")) for c in cases)
    matrix={"baseline_commit":HEAD,"scope":"Direct feature references in designed cases; not complete behavioral coverage or executed tests.","product_tests":"NOT_RUN","features":[{"feature_id":f,"case_ids":[c.get("id",c.get("case_id")) for c in cases if f in c.get("feature_refs",[])]} for f in sorted(expected)]}
    (ROOT/"evidence/case_feature_matrix.json").write_text(json.dumps(matrix,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if coverage!=expected:
        errors.append({"kind":"cross_case_feature_coverage","missing":sorted(expected-coverage),"unknown":sorted(coverage-expected)})
    ids=[x.get("id",x.get("case_id")) for x in cases]
    if len(cases)<40 or len(set(ids))!=len(ids): errors.append({"kind":"case_count_or_duplicates","count":len(cases)})
    for x in cases:
        status=x.get("status",x.get("test_status"))
        if status!="NOT_RUN": errors.append({"kind":"product_case_status","case":x.get("id"),"status":status})
        for key in ["given","when","then"]:
            if not x.get(key): errors.append({"kind":"missing_gwt","case":x.get("id"),"key":key})
        md=ROOT/"specs/05_跨玩法驗收案例.md"
        if md.exists() and not re.search(r"^#### "+re.escape(x.get("id",x.get("case_id","")))+r"[｜| ]",md.read_text(encoding="utf-8"),re.M):
            errors.append({"kind":"case_absent_from_markdown","case":x.get("id")})
(ROOT/"evidence").mkdir(exist_ok=True)
catalog={"baseline_commit":HEAD,"description":"Retrieved source bytes and verified Git blob hashes; this is not proof that every line or product behavior was reviewed.","sources":[{k:v for k,v in r.items() if k!="content"}|{"url":f"https://github.com/eaglhuang/3klife/blob/{HEAD}/{p}"} for p,r in sorted(records.items())]}
(ROOT/"evidence/source_catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(ROOT/"evidence/source_citations.json").write_text(json.dumps({"baseline_commit":HEAD,"citations":citations},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(ROOT/"validation/missing_source_paths.json").write_text(json.dumps(sorted(missing),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
status="PASS" if not errors and not missing_outputs and not missing else "INCOMPLETE" if missing_outputs or missing else "FAIL"
result={"validation_kind":"DOCUMENT_STRUCTURE_AND_SOURCE_LOCATORS_ONLY","status":status,"baseline_commit":HEAD,
"checked_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"checks":checks,"missing_source_paths":sorted(missing),
"errors":errors,"warnings":warnings,"product_tests":"NOT_RUN","semantic_entailment":"HUMAN_REVIEW_REQUIRED_NOT_PROVEN_BY_THIS_SCRIPT",
"limitations":["No product execution or UI rendering","No automatic proof that cited text entails each claim","Open decisions and missing external sources remain open"]}
(ROOT/"validation/validation_result.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":status,"checks":checks,"errors":errors,"missing_source_paths":sorted(missing),"warnings":len(warnings)},ensure_ascii=False,indent=2))

