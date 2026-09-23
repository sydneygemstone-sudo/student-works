"""One local model per process, exclusively locked GPU, private logs only."""
from __future__ import annotations
import os
os.environ.update(HF_HUB_OFFLINE="1",TRANSFORMERS_OFFLINE="1",HF_HUB_DISABLE_TELEMETRY="1",DO_NOT_TRACK="1",TORCHDYNAMO_DISABLE="1",TOKENIZERS_PARALLELISM="false")
import contextlib, hashlib, json, pathlib, random, socket, sys, time, traceback
from common import ROOT, read_json,write_json,now,safe_path,generation_key,validate_item,require_consent

def offline():
    # Private inference has no network route, including accidental library telemetry.
    def denied(*args,**kwargs):raise RuntimeError("Network disabled during private inference")
    socket.socket.connect=denied
    socket.create_connection=denied

def audio_finish(raw,out,kind,loop=False,settled=False):
    import numpy as np, soundfile as sf
    y,sr=sf.read(raw,always_2d=True,dtype="float32")
    if not np.isfinite(y).all() or not len(y):raise ValueError("Non-finite or empty audio")
    y=np.mean(y,axis=1)
    tail_trim=0
    if settled and kind=="voice":
        # Remove only excess low-energy tail; do not pitch-flatten questions or cut voiced consonants.
        hop=max(1,int(.01*sr))
        energy=np.array([np.sqrt(np.mean(y[i:i+hop]**2)) for i in range(0,len(y),hop)])
        active=np.flatnonzero(energy>max(.0007,float(energy.max())*.012))
        if len(active):
            end=min(len(y),(int(active[-1])+1)*hop+int(.13*sr))
            tail_trim=round((len(y)-end)/sr,4);y=y[:end]
    if loop:
        n=min(int(.35*sr),len(y)//8)
        ramp=np.linspace(0,1,n,endpoint=False)
        seam=y[-n:]*(1-ramp)+y[:n]*ramp
        y=np.concatenate([seam,y[n:-n]])
    else:
        n=min(int(.015*sr),len(y)//4)
        y[:n]*=np.linspace(0,1,n);y[-n:]*=np.linspace(1,0,n)
    peak=float(np.max(np.abs(y)));rms=float(np.sqrt(np.mean(y*y)))
    if peak<1e-5 or rms<1e-6:raise ValueError("Silent generation")
    target=10**((-21 if kind=="voice" else -24)/20)
    gain=min(target/rms,10**(-2/20)/peak,8.)
    y*=gain
    sf.write(out,y,sr,subtype="PCM_16")
    checked,actual_sr=sf.read(out)
    return {"duration":round(len(checked)/actual_sr,3),"sample_rate":actual_sr,"channels":1,"peak_dbfs":round(20*np.log10(max(np.max(np.abs(checked)),1e-9)),2),"rms_dbfs":round(20*np.log10(max(np.sqrt(np.mean(checked**2)),1e-9)),2),"clipped_samples":int(np.sum(np.abs(checked)>=.999)),"tail_quiet_trim_seconds":tail_trim,"loop_crossfade_seconds":.35 if loop else 0,"loop_boundary_delta":round(float(abs(checked[0]-checked[-1])),6),"sha256":hashlib.sha256(out.read_bytes()).hexdigest(),"technical_pass":True,"perceptual_review":"pending"}

def reference(profile,key):
    ref=profile["references"].get(key)
    if not ref:raise ValueError("Student reference required; no example fallback")
    path=safe_path(ref["file"])
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=ref["sha256"]:raise ValueError("Reference missing or hash changed")
    return str(path)

def main(job_path):
    job=read_json(job_path);engine=job["engine"];settings=read_json(ROOT/"config/engines.json")
    if engine=="index": require_consent()
    result_path=job_path.with_suffix(".result.json")
    result={"job_id":job["id"],"engine":engine,"status":"running","started":now(),"assets":[],"failures":[]}
    write_json(result_path,result)
    import msvcrt
    lock=(ROOT/"runtime/gpu.lock").open("a+b")
    lock.seek(0);lock.write(b"0");lock.flush();lock.seek(0)
    try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    except OSError:raise RuntimeError("Another local model job owns GPU; retry after it finishes")
    try:
        offline()
        import torch
        torch.set_num_threads(6)
        if not torch.cuda.is_available():raise RuntimeError("CUDA GPU unavailable")
        if torch.cuda.mem_get_info()[0]<9*1024**3:raise RuntimeError("GPU currently busy; not interrupting other work")
        torch.cuda.reset_peak_memory_stats()
        model_start=time.monotonic()
        if engine=="index":
            base=pathlib.Path(settings["index_root"]);os.chdir(base);sys.path.insert(0,str(base))
            from indextts.infer_v2_5 import IndexTTS2
            model=IndexTTS2(cfg_path=str(base/"checkpoints/config.yaml"),model_dir=str(base/"checkpoints"),use_bf16=True,use_cuda_kernel=False,use_torch_compile=False,use_qwen_emo=True)
            profile=read_json(ROOT/"config/voice-profile.json")
            if not profile:raise RuntimeError("Student voice profile missing")
        elif engine=="moss":
            from moss_soundeffect_v2 import MossSoundEffectPipeline
            model=MossSoundEffectPipeline.from_pretrained(settings["moss_model"],torch_dtype=torch.bfloat16,device="cuda",local_files_only=True)
        else:raise ValueError("Unknown engine")
        result["load_seconds"]=round(time.monotonic()-model_start,2);write_json(result_path,result)
        for item in job["items"]:
            validate_item(item)
            for variant in range(1,int(item.get("variants",1))+1):
                aid=f'{job["id"]}-{item["id"]}-v{variant}'
                start=time.monotonic()
                result["current"]=item["id"]+f" / {variant}";write_json(result_path,result)
                try:
                    seed=int(item["seed"])+variant-1;random.seed(seed);torch.manual_seed(seed)
                    out=ROOT/"data/generated"/(aid+".wav");raw=ROOT/"data/generated"/(aid+".raw.wav")
                    params={"seed":seed}
                    if engine=="index":
                        spk=reference(profile,item["speaker_reference"])
                        params.update(speaker_reference=item["speaker_reference"],speaker_sha256=profile["references"][item["speaker_reference"]]["sha256"],emotion_mode=item["emotion_mode"])
                        emo={}
                        if item["emotion_mode"]=="reference":
                            emo["emo_audio_prompt"]=reference(profile,item["emotion_reference"])
                            params["emotion_reference"]=item["emotion_reference"]
                            params["emotion_sha256"]=profile["references"][item["emotion_reference"]]["sha256"]
                        else:
                            if item["emotion_mode"]=="text":
                                values=model.qwen_emo.inference(item["emotion_text"])
                                vector=list(values.values())
                                params["emotion_model"]="QwenEmotion 0.6B local"
                            else:
                                vector=[0.]*8
                                vector[{"happy":0,"angry":1,"sad":2,"afraid":3,"natural":7}[item["emotion"]]]=.75
                            emo["emo_vector"]=model.normalize_emo_vec(vector)
                            params["emotion_vector"]=emo["emo_vector"]
                        decoding={"temperature":.6,"top_p":.75,"top_k":30} if item.get("prosody")=="settled" else {}
                        model.infer(spk_audio_prompt=spk,text=item["text"],lang=item["language"],output_path=str(raw),emo_alpha=item["intensity"],use_random=False,interval_silence=int(item["pause_ms"]),duration_factor=1/float(item["speed"]),verbose=False,**emo,**decoding)
                        params.update(model="IndexTTS 2.5",duration_factor=1/float(item["speed"]),pause_ms=item["pause_ms"],intensity=item["intensity"])
                        params.update(prosody=item.get("prosody","original"),decoding=decoding)
                    else:
                        import soundfile as sf
                        if item.get("route")=="ensemble":
                            from soundscape import make_ensemble
                            def progress(message):
                                result["current"]=message;write_json(result_path,result)
                            params.update(make_ensemble(model,item,raw,variant,progress))
                        else:
                            negative=item.get("negative_prompt","Human speech, talking, shouting, music, harsh distortion.")
                            wav=model(prompt=item["prompt"],seconds=item["seconds"],num_inference_steps=int(item["steps"]),cfg_scale=item["cfg"],seed=seed,negative_prompt=negative)
                            sf.write(raw,wav[0].detach().float().cpu().numpy().T,48000,subtype="FLOAT")
                            params.update(route=item.get("route","original"),negative_prompt=negative)
                        params.update(model="MOSS-SoundEffect v2.0",revision=settings["moss_revision"],steps=item["steps"],cfg=item["cfg"],seconds=item["seconds"],voice_reference_used=False)
                    qa=audio_finish(raw,out,item["kind"],item.get("loop",False),item.get("prosody")=="settled")
                    asset={"id":aid,"item_id":item["id"],"kind":item["kind"],"stage":item["stage"],"group":item["group"],"language":item.get("language"),"bus":"voice" if item["kind"]=="voice" else item["bus"],"file":out.relative_to(ROOT).as_posix(),"generation_key":generation_key(item),"item_snapshot":item,"parameters":params,"qa":qa,"elapsed_seconds":round(time.monotonic()-start,2),"created":now(),"approval":None,"selected":False}
                    result["assets"].append(asset)
                    write_json(out.with_suffix(".json"),asset)
                except Exception as exc:
                    traceback.print_exc()
                    result["failures"].append({"item_id":item["id"],"variant":variant,"error_type":type(exc).__name__,"message":"Generation failed; inspect the private runtime log.","elapsed_seconds":round(time.monotonic()-start,2)})
                write_json(result_path,result)
        result["status"]="completed" if not result["failures"] else "partial" if result["assets"] else "failed"
        result["gpu_peak_mb"]=round(torch.cuda.max_memory_allocated()/1024**2)
        result["finished"]=now();result.pop("current",None);write_json(result_path,result)
    finally:
        lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1);lock.close()

if __name__=="__main__":
    sys.stdout.reconfigure(encoding="utf-8");sys.stderr.reconfigure(encoding="utf-8")
    path=pathlib.Path(sys.argv[1]).resolve()
    try:main(path)
    except Exception as exc:
        traceback.print_exc()
        result=read_json(path.with_suffix(".result.json"),{})
        result.update(status="failed",error_type=type(exc).__name__,message="Model startup failed. See private runtime log.",finished=now())
        write_json(path.with_suffix(".result.json"),result)
        raise SystemExit(1)
