"""Generate/cache individual animal stems and arrange all eight into each B scene."""
from common import ROOT,read_json,write_json,digest,now
import hashlib,pathlib
import numpy as np,soundfile as sf

def fade(y,sr,seconds=.035):
    y=y.copy();n=min(int(sr*seconds),len(y)//4)
    if n:y[:n]*=np.linspace(0,1,n);y[-n:]*=np.linspace(1,0,n)
    return y

def make_ensemble(model,item,raw,variant,progress=None):
    config=read_json(ROOT/"config/sfx-comparison-v2.json");stems={}
    for key,spec in config["species"].items():
        seed=spec["seed"]+(variant-1)*100
        fingerprint=digest({"spec":spec,"seed":seed,"revision":read_json(ROOT/"config/engines.json")["moss_revision"]})[:14]
        aid="animal-"+key+"-"+fingerprint;path=ROOT/"data/library"/(aid+".wav")
        receipt=read_json(path.with_suffix(".json"))
        if not receipt or not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=receipt["qa"]["sha256"]:
            if progress:progress("B / "+key+" / generating stem")
            wav=model(prompt=spec["prompt"],seconds=spec["seconds"],num_inference_steps=spec["steps"],cfg_scale=spec["cfg"],seed=seed,negative_prompt="Human speech, human laughter, conversation, narration, music, harsh screaming.")
            y=wav[0].detach().float().cpu().numpy().mean(axis=0)
            if not np.isfinite(y).all():raise ValueError("Invalid stem")
            peak=float(np.max(np.abs(y)));rms=float(np.sqrt(np.mean(y*y)))
            if rms<1e-6:raise ValueError("Silent animal stem")
            y=fade(y,48000)*min(10**(-22/20)/rms,10**(-3/20)/max(peak,1e-6))
            sf.write(path,y,48000,subtype="PCM_16")
            receipt={"id":aid,"label":spec["label"],"species":key,"file":path.relative_to(ROOT).as_posix(),"kind":"library","created":now(),"qa":{"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"duration":len(y)/48000,"sample_rate":48000},"parameters":{"model":"MOSS-SoundEffect v2.0","prompt":spec["prompt"],"seed":seed,"steps":spec["steps"],"voice_reference_used":False}}
            write_json(path.with_suffix(".json"),receipt)
        y,sr=sf.read(path,dtype="float32");stems[key]=(y,sr,receipt)
    order={
        "playing":["owl","squirrel","bunny_baby","turtle","fox","hedgehog","raccoon","deer"],
        "startled":["squirrel","bunny_baby","deer","owl","raccoon","fox","hedgehog","turtle"],
        "reunion":["bunny_baby","fox","owl","raccoon","deer","squirrel","turtle","hedgehog"]
    }[item["group"]]
    sr=48000;seconds=max(18,float(item["seconds"]));out=np.zeros(int(sr*seconds),dtype="float32");cues=[]
    section={"playing":0,"startled":1,"reunion":2}[item["group"]]
    for index,key in enumerate(order):
        y,actual_sr,receipt=stems[key]
        assert actual_sr==sr
        width=int(1.65*sr)
        # Choose the most audible window within each third, keeping species separate.
        begin=max(0,int(len(y)*section/3)-int(.25*sr))
        end=min(len(y)-width,int(len(y)*(section+1)/3))
        candidates=range(begin,max(begin+1,end+1),int(.05*sr))
        start=max(candidates,key=lambda pos:float(np.mean(y[pos:pos+width]**2)))
        cue=fade(y[start:start+width],sr,.045)
        at=int((.25+index*2.05)*sr)
        out[at:at+len(cue)]+=cue
        cues.append({"species":key,"label":receipt["label"],"asset_id":receipt["id"],"start":round(at/sr,3),"end":round((at+len(cue))/sr,3),"source_start":round(start/sr,3),"source_sha256":receipt["qa"]["sha256"]})
    sf.write(raw,out,sr,subtype="FLOAT")
    return {"route":"ensemble","species_count":8,"composition":"Eight separately generated animal stems; different cue order and source excerpts for each scene.","cues":cues,"voice_reference_used":False}
