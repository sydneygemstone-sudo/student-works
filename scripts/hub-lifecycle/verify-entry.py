"""Validate the explicitly authorized entry extension; never relax the golden-source check."""
from pathlib import Path
import subprocess,json,hashlib
R=Path(__file__).resolve().parents[2]
BASE='a18e698073fecac2f6a70b07f5783771073f690e'
REV='hub-r6-lifecycle-20260925'
def git_bytes(path):return subprocess.check_output(['git','-C',str(R),'show',BASE+':'+path])
def digest(b):return hashlib.sha256(b).hexdigest()
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
entry_file=R/'HUB-ENTRY.json';lock_file=R/'docs/hub-standard/LOCK.json';spec_file=R/'docs/hub-standard/R6-LIFECYCLE-AND-AI-REVIEW.md'
old_entry=json.loads(git_bytes('HUB-ENTRY.json'));old_lock=json.loads(git_bytes('docs/hub-standard/LOCK.json'))
entry=json.loads(entry_file.read_text());lock=json.loads(lock_file.read_text())
expected={**old_entry,'lifecycle_overlay':{'revision':REV,'standard':'docs/hub-standard/R6-LIFECYCLE-AND-AI-REVIEW.md','scope':['martins-monster-quest/hub/','adventure-world/hub/'],'preflight':'python3 scripts/hub-lifecycle/build.py; node scripts/hub-lifecycle/qa.cjs','no_fallback':'Do not restore single-stage total progress, placeholder human star grading or untyped merge arrows.'}}
if entry!=expected:raise RuntimeError('Entry changed beyond the requested lifecycle extension; manual reconciliation required')
# Every pre-existing artifact except this deliberate entry metadata extension must remain pinned.
for name,value in old_lock['artifacts_sha256'].items():
 if name=='HUB-ENTRY.json':continue
 if lock['artifacts_sha256'].get(name)!=value:raise RuntimeError('Unapproved lock change: '+name)
 if digest((R/name).read_bytes())!=value:raise RuntimeError('Protected artifact changed: '+name)
for name,value in old_lock['baseline_files_sha256'].items():
 if lock['baseline_files_sha256'].get(name)!=value or digest((R/name).read_bytes())!=value:raise RuntimeError('Golden R5 file changed: '+name)
for field in ['standard_id','version','status','baseline_commit']:
 if lock.get(field)!=old_lock.get(field):raise RuntimeError('Lock identity changed: '+field)
old_hash=old_lock['artifacts_sha256']['HUB-ENTRY.json'];new_hash=digest(entry_file.read_bytes())
if lock['artifacts_sha256'].get('HUB-ENTRY.json')not in [old_hash,new_hash]:raise RuntimeError('Unexpected intermediate entry fingerprint')
# Updating an allowed entry hash is not permission to edit a protected game/template file.
lock['artifacts_sha256']['HUB-ENTRY.json']=new_hash
if spec_file.exists():
 name=spec_file.relative_to(R).as_posix();existing=lock['artifacts_sha256'].get(name);value=digest(spec_file.read_bytes())
 if existing and existing!=value:raise RuntimeError('Lifecycle contract drift: '+name)
 lock['artifacts_sha256'][name]=value
save(lock_file,lock)
subprocess.run(['python3',str(R/'scripts/verify_hub_standard.py'),'--self-test'],cwd=R,check=True)
save(R/'docs/hub-standard/LIFECYCLE-ENTRY-MIGRATION.json',{'revision':REV,'status':'PASS','basis':'User requested replacement of the scoring/progress/lineage contract; only the current presentation-entry metadata is extended.','base_ref':BASE,'old_entry_sha256':old_hash,'current_entry_sha256':new_hash,'golden_files_unchanged':True,'original_verifier_unchanged':True,'original_negative_self_tests':'PASS','lifecycle_contract_sha256':digest(spec_file.read_bytes())if spec_file.exists()else None})
print('Authorized lifecycle entry hash updated; original strict R5 check and all negative self-tests pass.')
