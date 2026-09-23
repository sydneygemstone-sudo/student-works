from __future__ import annotations
import hashlib, json, os, pathlib, re, tempfile, time
ROOT=pathlib.Path(__file__).resolve().parents[1]

def now():return time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
def read_json(path,default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default
def write_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=path.name+".",dir=path.parent)
    try:
        with os.fdopen(fd,"w",encoding="utf-8") as f:json.dump(value,f,ensure_ascii=False,indent=2)
        for attempt in range(8):
            try:
                os.replace(tmp,path)
                break
            except PermissionError:
                if attempt == 7: raise
                time.sleep(min(.025 * (2 ** attempt), .4))
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def safe_path(relative,base=ROOT):
    path=(base/relative).resolve()
    if not path.is_relative_to(base.resolve()):raise ValueError("Path outside private workspace")
    return path
def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def generation_key(item):
    return digest({k:v for k,v in item.items() if k not in ("label","volume")})
def validate_item(item):
    if not re.fullmatch(r"[a-z0-9-]{1,70}",item.get("id","")):raise ValueError("Invalid item ID")
    if item.get("stage") not in ("sample","story"):raise ValueError("Invalid stage")
    def number(name,lo,hi):
        value=item[name]
        if not isinstance(value,(int,float)) or not lo<=value<=hi:raise ValueError("Invalid "+name)
    number("volume",0,1);number("seed",0,2147483647)
    if item.get("kind")=="voice":
        if not item.get("text","").strip() or len(item["text"])>1800:raise ValueError("Text length must be 1–1800")
        if item.get("language") not in ("ZH","EN"):raise ValueError("ZH or EN required")
        if item.get("emotion_mode") not in ("reference","text","vector"):raise ValueError("Invalid emotion mode")
        if item.get("prosody","original") not in ("original","settled"):raise ValueError("Invalid prosody")
        if item.get("emotion") not in ("natural","happy","angry","sad","afraid"):raise ValueError("Invalid emotion")
        number("intensity",0,1);number("speed",.65,1.4);number("pause_ms",0,1500)
        if item.get("emotion_mode")=="text" and not item.get("emotion_text","").strip():raise ValueError("Emotion description required")
    elif item.get("kind")=="sfx":
        if not item.get("prompt","").strip() or len(item["prompt"])>2500:raise ValueError("SFX prompt required")
        if any(k in item for k in ("speaker_reference","emotion_reference","reference_audio")):raise ValueError("SFX must not accept a voice reference")
        if item.get("bus") not in ("animals","environment"):raise ValueError("Invalid SFX bus")
        if item.get("route","original") not in ("original","cartoon","ensemble"):raise ValueError("Invalid SFX route")
        if len(item.get("negative_prompt",""))>2500:raise ValueError("Negative prompt too long")
        if item.get("route")=="ensemble" and item["seconds"]<18:raise ValueError("Eight-animal arrangement needs at least 18 seconds")
        number("seconds",1,30);number("variants",1,4);number("steps",20,150);number("cfg",1,8)
    else:raise ValueError("Invalid item kind")
    return item

def require_consent(record=None):
    value=record if record is not None else read_json(ROOT/'config/consent.json',{})
    if not isinstance(value,dict) or value.get('subject_agreed') is not True:
        raise PermissionError('BLOCKED_CONSENT_NOT_RECORDED')
    if value.get('guardian_required') not in (True,False):
        raise PermissionError('BLOCKED_GUARDIAN_REQUIREMENT_UNKNOWN')
    if value.get('guardian_required') and value.get('guardian_agreed') is not True:
        raise PermissionError('BLOCKED_GUARDIAN_CONSENT_NOT_RECORDED')
    if value.get('purpose')!='classroom_voice' or not str(value.get('record_location','')).strip():
        raise PermissionError('BLOCKED_CONSENT_SCOPE_NOT_RECORDED')
    return True
