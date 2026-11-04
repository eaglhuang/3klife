#!/usr/bin/env python3
"""Verify merged bytes and bounded evidence denominator, not game acceptance."""
from pathlib import Path
import hashlib,json
b=Path(__file__).resolve().parent
m=json.loads((b/'ARTIFACT_SHA256.json').read_text())
actual={str(p.relative_to(b)) for p in b.rglob('*') if p.is_file()}
assert actual==set(m)|{'ARTIFACT_SHA256.json'}
for p,h in m.items():assert hashlib.sha256((b/p).read_bytes()).hexdigest()==h,p
idx=json.loads((b/'PACKAGE_INDEX.json').read_text());ledger=json.loads((b/'coverage-ledger.json').read_text());old=json.loads((b/'previous-batch-coverage-ledger.json').read_text());prior=json.loads((b/'previous-evidence-paths.json').read_text())
assert idx['commit']==ledger['commit']==old['commit']==prior['commit']=='96a83124094d3b2485bfb749ef37d567ad834559'
assert len(ledger['domains'])==42 and ledger['full_acceptance_count']==0
assert all(d['full_acceptance']=='NOT_RUN' for d in ledger['domains'])
assert len(idx['packages'])==4 and sum(p['characterization_cases_in_package'] for p in idx['packages'])==167
code=json.loads((b/'baseline-code-inventory.json').read_text());den={x['path'] for x in code};seen={x['path'] for x in code if x['read_status']!='UNREAD'}
assert len(den)==852 and len(seen)==79
seen|=set(prior['code_paths']);assert len(seen)==159==old['code_paths_in_baseline_or_any_packaged_evidence']
new=set()
for p in idx['packages']:
 assert p['independent_review']=='REVIEW_PASSED' and p['full_acceptance']=='NOT_RUN'
 assert (b/p['start_here']).is_file()
 assert sum(f.is_file() for f in (b/p['directory']).rglob('*'))==p['entry_count']
 s=json.loads((b/p['directory']/'SOURCE_MANIFEST.json').read_text());rows=s.get('sources',s.get('files'));assert len(rows)==p['source_files']
 new|={x['path'] for x in rows}&den
assert len(new)==ledger['current_batch_code_source_paths']==142
assert len(new-seen)==ledger['new_code_paths_added_to_union']==89
assert len(new|seen)==ledger['code_paths_in_baseline_or_any_packaged_evidence']==248
assert len(den-(new|seen))==ledger['code_paths_outside_that_union']==604
print(json.dumps({'merged_delivery':'PASS','files_verified':len(m),'reviewed_packages':4,'bounded_cases':167,'candidate_domains':42,'full_acceptance':0,'note':'Integrity/denominator verification only. Gameplay not rerun by this command.'},ensure_ascii=False))
