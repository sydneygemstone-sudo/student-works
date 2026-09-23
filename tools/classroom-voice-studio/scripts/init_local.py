"""Create ignored local configuration; never overwrite an existing workspace."""
import argparse,hashlib,json,pathlib,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--reference',action='append',default=[],help='happy|angry|sad|sad_alt|afraid=authorized-reference.wav');args=p.parse_args()
for name in ('data/originals','data/references','data/generated','data/approved','data/library','runtime/jobs'):(ROOT/name).mkdir(parents=True,exist_ok=True)
for source in (ROOT/'config').glob('*.example.json'):
 target=source.with_name(source.name.replace('.example.json','.json'))
 if not target.exists():shutil.copy2(source,target)
path=ROOT/'config/voice-profile.json';profile=json.loads(path.read_text(encoding='utf-8'))
for argument in args.reference:
 key,value=argument.split('=',1)
 if key not in ('happy','angry','sad','sad_alt','afraid'):raise ValueError('Unknown reference slot')
 source=pathlib.Path(value).expanduser().resolve()
 if source.suffix.lower()!='.wav':raise ValueError('Use a local WAV reference')
 destination=ROOT/'data/references'/(key+'.wav');sha=hashlib.sha256(source.read_bytes()).hexdigest()
 if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()!=sha:raise ValueError('Existing different reference preserved')
 if not destination.exists():shutil.copy2(source,destination)
 profile['references'][key]={'file':destination.relative_to(ROOT).as_posix(),'sha256':sha}
path.write_text(json.dumps(profile,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'local_configuration_ready':True,'references':len(profile['references']),'model_environments_must_be_configured':True,'start':'python studio/server.py'}))
