"""Check the fixed source files; never update the lock automatically."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
def main():
 lock=json.loads((ROOT/'LOCK.json').read_text());entry=json.loads((ROOT/'STACK-ENTRY.json').read_text())
 if lock['version']!=entry['version'] or lock['stack_id']!=entry['stack_id']:raise RuntimeError('Version mismatch')
 for name,expected in lock['files'].items():
  path=(ROOT/name).resolve()
  if not path.is_relative_to(ROOT) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=expected:raise RuntimeError('Source lock mismatch: '+name)
 print(json.dumps({'status':'PASS','stack_id':entry['stack_id'],'version':entry['version'],'files_verified':len(lock['files'])}))
if __name__=='__main__':main()
