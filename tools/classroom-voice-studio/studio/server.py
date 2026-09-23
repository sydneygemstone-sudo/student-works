"""Private loopback studio. Model jobs run serially in their own environments."""
from __future__ import annotations
import copy, hashlib, http.server, json, mimetypes, pathlib, re, secrets, shutil, subprocess, sys, threading, time, urllib.parse, uuid
from common import ROOT, now, read_json, write_json, safe_path, generation_key, digest, validate_item

class Studio:
    def __init__(self,root=ROOT,start_worker=True):
        self.root=root;self.lock=threading.RLock();self.stop=threading.Event();self.active=None
        self.jobs_dir=root/"runtime/jobs";self.jobs_dir.mkdir(parents=True,exist_ok=True)
        self.token=secrets.token_urlsafe(32)
        # Interrupted jobs are never silently regenerated; completed partial outputs survive.
        for path in self.jobs_dir.glob("*.json"):
            if ".result." in path.name:continue
            job=read_json(path)
            if job["status"] in ("running","recovering"):
                result=read_json(path.with_suffix(".result.json"),{})
                job["status"]=result.get("status") if result.get("status") in ("completed","partial","failed") else "recovering" if self.owned_process(job) else "interrupted"
                write_json(path,job)
        if start_worker:
            self.worker=threading.Thread(target=self.work,daemon=True);self.worker.start()
    def owned_process(self,job):
        pid=job.get("pid")
        if not isinstance(pid,int) or not re.fullmatch(r"[a-zA-Z0-9-]+",job["id"]):return False
        command=f"(Get-CimInstance Win32_Process -Filter 'ProcessId = {pid}').CommandLine"
        result=subprocess.run(["powershell.exe","-NoLogo","-NoProfile","-Command",command],capture_output=True,text=True,timeout=12,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        return "engine_runner.py" in result.stdout and job["id"] in result.stdout
    def project(self):return read_json(self.root/"config/project.json")
    def approvals(self):return read_json(self.root/"config/approvals.json",{})
    def library(self):return [read_json(p) for p in (self.root/"data/library").glob("*.json")]
    def playback(self):return read_json(self.root/"config/playback.json",{})
    def assets(self):
        approvals=self.approvals();playback=self.playback();result=[]
        for path in (self.root/"data/generated").glob("*.json"):
            asset=read_json(path);approval=approvals.get(asset["item_id"])
            asset["selected"]=bool(approval and approval["asset_id"]==asset["id"])
            asset["approval"]=approval if asset["selected"] else None
            asset["playback"]=playback.get(asset["id"],{"rate":1.0,"volume":1.0})
            result.append(asset)
        return sorted(result,key=lambda a:a["created"])
    def jobs(self):
        result=[]
        for path in sorted(self.jobs_dir.glob("*.json")):
            if ".result." in path.name:continue
            job=read_json(path);progress=read_json(path.with_suffix(".result.json"),{})
            result.append({k:v for k,v in job.items() if k!="items"}|{"progress":progress})
        return result
    def style_digest(self):
        p=self.project()
        ids={i["id"] for i in p["items"] if i["stage"]=="sample"}
        approved={k:v for k,v in self.approvals().items() if k in ids}
        return digest({"items":[i for i in p["items"] if i["id"] in ids],"selections":approved,"playback":{v["asset_id"]:self.playback().get(v["asset_id"]) for v in approved.values()},"mix":p["mix"]})
    def style_ready(self):
        p=self.project()
        return bool(p.get("sample_style_approved") and p.get("sample_approval",{}).get("digest")==self.style_digest())
    def state(self):
        return {"project":self.project(),"profile":read_json(self.root/"config/voice-profile.json"),"assets":self.assets(),"library":self.library(),"jobs":self.jobs(),"presets":read_json(self.root/"config/presets.json",{}),"style_ready":self.style_ready(),"token":self.token,"candidate_url":"http://127.0.0.1:18925/","status":"AWAITING_SAMPLE_REVIEW" if not self.style_ready() else "SAMPLE_STYLE_APPROVED"}
    def save_playback(self,aid,rate,volume):
        if not isinstance(rate,(float,int)) or not .65<=rate<=1.4 or not isinstance(volume,(float,int)) or not 0<=volume<=1:raise ValueError("Invalid playback controls")
        with self.lock:
            a=next((a for a in self.assets() if a["id"]==aid),None)
            if not a:raise ValueError("Unknown audio version")
            settings=self.playback();settings[aid]={"rate":round(rate,3),"volume":round(volume,3),"saved":now()}
            write_json(self.root/"config/playback.json",settings)
            if a["selected"] and a["stage"]=="sample":
                p=self.project();p["sample_style_approved"]=False;write_json(self.root/"config/project.json",p)
            self.export_manifest()
        return {"ok":True,"source_audio_unchanged":True}
    def save_item(self,item):
        with self.lock:
            p=self.project();old=next((i for i in p["items"] if i["id"]==item["id"]),None)
            if not old or any(item.get(k)!=old[k] for k in ("id","kind","stage","group")):raise ValueError("Item identity cannot be changed")
            validate_item(item)
            p["items"]=[item if i["id"]==item["id"] else i for i in p["items"]]
            if item!=old and item["stage"]=="sample":p["sample_style_approved"]=False
            write_json(self.root/"config/project.json",p)
            self.export_manifest()
        return {"ok":True}
    def generate(self,request):
        with self.lock:
            p=self.project();scope=request.get("scope","samples")
            if scope not in ("samples","story"):raise ValueError("Unknown scope")
            if scope=="story" and not self.style_ready():raise ValueError("请先听完并批准首批人声与三组动物风格")
            items=[i for i in p["items"] if i["stage"]==("sample" if scope=="samples" else "story")]
            if request.get("ids"):
                if set(request["ids"])-{i["id"] for i in items}:raise ValueError("Item outside selected scope")
                items=[i for i in items if i["id"] in request["ids"]]
            if request.get("kind"):items=[i for i in items if i["kind"]==request["kind"]]
            route=request.get("comparison_route")
            if route:
                if route not in ("cartoon","ensemble") or scope!="samples":raise ValueError("Invalid comparison route")
                definitions=read_json(self.root/"config/sfx-comparison-v2.json")["routes"][route]
                items=[copy.deepcopy(definitions[i["group"]]) for i in items if i["kind"]=="sfx" and i["group"] in definitions]
            for item in items:validate_item(item)
            if request.get("changed_only"):
                seeds={}
                for a in self.assets():
                    if a["qa"]["technical_pass"]:seeds.setdefault(a["generation_key"],set()).add(a["parameters"]["seed"])
                items=[i for i in items if not set(range(int(i["seed"]),int(i["seed"])+int(i.get("variants",1)))).issubset(seeds.get(generation_key(i),set()))]
            pending={generation_key(i) for path in self.jobs_dir.glob("*.json") if ".result." not in path.name for j in [read_json(path)] if j["status"] in ("queued","running","recovering") for i in j["items"]}
            items=[i for i in items if generation_key(i) not in pending]
            ids=[]
            for kind,engine in (("voice","index"),("sfx","moss")):
                chosen=[i for i in items if i["kind"]==kind]
                if not chosen:continue
                jid=time.strftime("%Y%m%d-%H%M%S")+"-"+uuid.uuid4().hex[:6]
                job={"id":jid,"engine":engine,"scope":scope,"comparison_route":route,"items":copy.deepcopy(chosen),"status":"queued","created":now()}
                write_json(self.jobs_dir/(jid+".json"),job);ids.append(jid)
            return {"ok":True,"jobs":ids,"item_count":len(items)}
    def retry(self,jid):
        if not re.fullmatch(r"[a-zA-Z0-9-]+",jid):raise ValueError("Invalid job")
        job=read_json(self.jobs_dir/(jid+".json"))
        if not job or job["status"] not in ("failed","partial","interrupted"):raise ValueError("Job cannot be retried")
        progress=read_json(self.jobs_dir/(jid+".result.json"),{})
        failures={f["item_id"] for f in progress.get("failures",[])}
        if not failures:
            completed={a["item_id"] for a in progress.get("assets",[])}
            failures={i["id"] for i in job["items"]}-completed
        return self.generate({"scope":job["scope"],"ids":sorted(failures),"comparison_route":job.get("comparison_route")}) if failures else {"ok":True,"jobs":[]}
    def approve(self,aid,note=""):
        with self.lock:
            asset=next((a for a in self.assets() if a["id"]==aid),None)
            if not asset or not asset["qa"]["technical_pass"]:raise ValueError("No technically valid asset")
            source=safe_path(asset["file"],self.root)
            if hashlib.sha256(source.read_bytes()).hexdigest()!=asset["qa"]["sha256"]:raise ValueError("Audio hash changed; regenerate or restore the verified file")
            item=next(i for i in self.project()["items"] if i["id"]==asset["item_id"])
            if generation_key(item)!=asset["generation_key"]:raise ValueError("台词或参数已修改，请生成并试听新版本")
            approvals=self.approvals()
            approvals[item["id"]]={"asset_id":aid,"sha256":asset["qa"]["sha256"],"at":now(),"note":str(note)[:1000],"by":"teacher","generation_key":asset["generation_key"]}
            target=self.root/"data/approved"/pathlib.Path(asset["file"]).name
            if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=asset["qa"]["sha256"]:raise ValueError("Approved audio hash mismatch")
            if not target.exists():shutil.copy2(source,target)
            write_json(self.root/"config/approvals.json",approvals)
            self.export_manifest()
            return {"ok":True}
    def approve_style(self):
        with self.lock:
            p=self.project();selected={a["item_id"]:a for a in self.assets() if a["selected"]}
            for item in p["items"]:
                if item["stage"]=="sample" and (item["id"] not in selected or selected[item["id"]]["generation_key"]!=generation_key(item)):
                    raise ValueError("请逐条选用十个人声小样及三组动物音效")
            p["sample_style_approved"]=True;p["sample_approval"]={"at":now(),"by":"teacher","digest":self.style_digest()}
            write_json(self.root/"config/project.json",p)
            return {"ok":True,"message":"风格已确认，可以生成完整故事；课堂入口仍需最终验收。"}
    def save_mix(self,mix):
        if set(mix)!={"voice","animals","environment","music","duck"} or any(not isinstance(v,(float,int)) or not 0<=v<=1 for v in mix.values()):raise ValueError("Invalid mix")
        with self.lock:
            p=self.project()
            if mix!=p["mix"]:p["sample_style_approved"]=False
            p["mix"]=mix;write_json(self.root/"config/project.json",p);self.export_manifest()
        return {"ok":True}
    def export_manifest(self):
        p=self.project();items={i["id"]:i for i in p["items"]};selected={}
        for a in self.assets():
            if a["selected"] and generation_key(items[a["item_id"]])==a["generation_key"]:selected[a["item_id"]]=a
        def track(item_id):
            a=selected.get(item_id)
            if not a:return None
            playback=a.get("playback",{"rate":1,"volume":1})
            return {"url":"/audio-approved/"+a["id"]+".wav","volume":items[item_id]["volume"]*playback["volume"],"playbackRate":playback["rate"],"loop":items[item_id].get("loop",False),"sha256":a["qa"]["sha256"]}
        scenes={}
        mapping={"party":("playing","garden"),"storm":("startled","storm"),"rescue":(None,"steps"),"feast":("reunion","home-rain")}
        for scene,(animals,environment) in mapping.items():
            scenes[scene]={"voice":{lang:track("story-"+scene+"-"+lang.lower()) for lang in ("ZH","EN")},"animals":track("sfx-"+animals) if animals else None,"environment":track("env-"+environment),"texts":{lang:items["story-"+scene+"-"+lang.lower()]["text"] for lang in ("ZH","EN")}}
        # Full scenes can only play once their narration has actually been approved.
        write_json(self.root/"data/approved/manifest.json",{"version":1,"status":"candidate_private","scenes":scenes,"mix":p["mix"],"generated":now(),"classroom_promoted":False})
    def work(self):
        while not self.stop.wait(.5):
            with self.lock:
                recovered=[(path,read_json(path)) for path in sorted(self.jobs_dir.glob("*.json")) if ".result." not in path.name and read_json(path)["status"]=="recovering"]
                if recovered:
                    path,job=recovered[0];result=read_json(path.with_suffix(".result.json"),{})
                    if result.get("status") in ("completed","partial","failed") or not self.owned_process(job):
                        job.update(status=result.get("status") if result.get("status") in ("completed","partial","failed") else "interrupted",finished=now());write_json(path,job)
                    else:self.stop.wait(3)
                    continue
                pending=[(path,read_json(path)) for path in sorted(self.jobs_dir.glob("*.json")) if ".result." not in path.name and read_json(path)["status"]=="queued"]
                if not pending:continue
                path,job=pending[0]
                try:
                    gpu=subprocess.run(["nvidia-smi","--query-gpu=memory.free","--format=csv,noheader,nounits"],capture_output=True,text=True,timeout=8,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
                    free_mb=float(gpu.stdout.strip().splitlines()[0])
                except Exception:free_mb=0
                if free_mb<(9000 if job["engine"]=="index" else 15200):
                    job["waiting_for_gpu"]=True;write_json(path,job);self.stop.wait(4);continue
                job.update(status="running",started=now(),waiting_for_gpu=False);write_json(path,job)
            settings=read_json(self.root/"config/engines.json")
            log_path=self.root/"runtime"/(job["id"]+".log")
            try:
                with log_path.open("w",encoding="utf-8") as log:
                    proc=subprocess.Popen([settings[job["engine"]+"_python"],str(self.root/"studio/engine_runner.py"),str(path)],cwd=self.root,stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
                    self.active=proc;job["pid"]=proc.pid;write_json(path,job)
                    proc.wait()
                result=read_json(path.with_suffix(".result.json"),{})
                job.update(status=result.get("status","failed"),finished=now(),exit_code=proc.returncode)
            except Exception as exc:
                job.update(status="failed",error_type=type(exc).__name__,finished=now())
            finally:
                self.active=None;write_json(path,job)
    def close(self):
        self.stop.set()
        if self.active and self.active.poll() is None:self.active.terminate();self.active.wait(timeout=20)

class Handler(http.server.BaseHTTPRequestHandler):
    studio=None
    def log_message(self,*args):pass
    def local_request(self):
        host=self.headers.get("Host","").split(":")[0].lower()
        return host in ("127.0.0.1","localhost","[::1]")
    def send_json(self,code,value):
        self.send_bytes(code,json.dumps(value,ensure_ascii=False).encode(),"application/json; charset=utf-8")
    def send_bytes(self,code,body,mime,extra=None):
        self.send_response(code);self.send_header("Content-Type",mime);self.send_header("Content-Length",len(body))
        self.send_header("Cache-Control","no-store");self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Referrer-Policy","no-referrer")
        for k,v in (extra or {}).items():self.send_header(k,v)
        self.end_headers()
        if self.command!="HEAD":self.wfile.write(body)
    def serve_file(self,path):
        data=path.read_bytes();headers={"Accept-Ranges":"bytes"}
        if self.headers.get("Range"):
            match=re.fullmatch(r"bytes=(\d*)-(\d*)",self.headers["Range"])
            if not match or not any(match.groups()):return self.send_bytes(416,b"","text/plain",{"Content-Range":f"bytes */{len(data)}"})
            a,b=match.groups()
            lo=int(a) if a else max(0,len(data)-int(b));hi=min(len(data)-1,int(b)) if a and b else len(data)-1
            if (not a and int(b)==0) or lo>hi or lo>=len(data):return self.send_bytes(416,b"","text/plain",{"Content-Range":f"bytes */{len(data)}"})
            headers["Content-Range"]=f"bytes {lo}-{hi}/{len(data)}";data=data[lo:hi+1];code=206
        else:code=200
        self.send_bytes(code,data,mimetypes.guess_type(path)[0] or "application/octet-stream",headers)
    def do_HEAD(self):self.do_GET()
    def do_GET(self):
        if not self.local_request():return self.send_json(403,{"error":"Loopback only"})
        path=urllib.parse.urlsplit(self.path).path
        try:
            if path=="/api/state":return self.send_json(200,self.studio.state())
            if path=="/healthz":return self.send_json(200,{"ok":True,"service":"naomi-private-studio"})
            if path in ("/","/app.js","/style.css","/mix.js","/deck.js"):
                return self.serve_file(self.studio.root/"studio/web"/("index.html" if path=="/" else path[1:]))
            if path.startswith("/media/"):
                aid=path.removeprefix("/media/")
                asset=next((a for a in self.studio.assets()+self.studio.library() if a["id"]==aid),None)
                if not asset:raise ValueError("Unknown asset")
                return self.serve_file(safe_path(asset["file"],self.studio.root))
            if path.startswith("/reference/"):
                rid=path.removeprefix("/reference/")
                ref=read_json(self.studio.root/"config/voice-profile.json")["references"].get(rid)
                if not ref:raise ValueError("Unknown reference")
                return self.serve_file(safe_path(ref["file"],self.studio.root))
            self.send_json(404,{"error":"Not found"})
        except (ValueError,KeyError,FileNotFoundError) as exc:self.send_json(404,{"error":str(exc)})
    def do_POST(self):
        if not self.local_request() or self.headers.get("X-Studio-Token")!=self.studio.token:return self.send_json(403,{"error":"Private studio token required"})
        origin=self.headers.get("Origin")
        if origin and urllib.parse.urlsplit(origin).netloc!=self.headers.get("Host"):return self.send_json(403,{"error":"Cross-origin write refused"})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not 0<length<100000:raise ValueError("Invalid request size")
            body=json.loads(self.rfile.read(length))
            if self.path=="/api/item":result=self.studio.save_item(body["item"])
            elif self.path=="/api/generate":result=self.studio.generate(body)
            elif self.path=="/api/retry":result=self.studio.retry(body["job_id"])
            elif self.path=="/api/approve":result=self.studio.approve(body["asset_id"],body.get("note",""))
            elif self.path=="/api/approve-style":result=self.studio.approve_style()
            elif self.path=="/api/mix":result=self.studio.save_mix(body["mix"])
            elif self.path=="/api/playback":result=self.studio.save_playback(body["asset_id"],body["rate"],body["volume"])
            elif self.path=="/api/preset":
                name=str(body["name"]).strip()[:40]
                if not name:raise ValueError("Preset name required")
                presets=read_json(self.studio.root/"config/presets.json",{})
                presets[name]={k:body["values"][k] for k in ("intensity","speed","pause_ms","volume")}
                write_json(self.studio.root/"config/presets.json",presets);result={"ok":True}
            else:raise ValueError("Unknown action")
            self.send_json(200,result)
        except (ValueError,KeyError,TypeError) as exc:self.send_json(400,{"error":str(exc)})

if __name__=="__main__":
    studio=Studio();studio.export_manifest();Handler.studio=studio
    server=http.server.ThreadingHTTPServer(("127.0.0.1",8916),Handler)
    write_json(ROOT/"runtime/studio-service.json",{"pid":__import__("os").getpid(),"host":"127.0.0.1","port":8916,"purpose":"Private Naomi listening and generation delivery","started":now()})
    try:server.serve_forever()
    finally:server.server_close();studio.close()
