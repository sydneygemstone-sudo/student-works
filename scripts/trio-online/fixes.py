from pathlib import Path
R=Path(__file__).resolve().parents[2]
p=R/'adventure-world/builds/trio-world-opus/cloudflare/worker.mjs'
s=p.read_text();s=s.replace('export const REVISION=', 'const REVISION=');p.write_text(s)
p=R/'scripts/trio-online/qa.cjs';s=p.read_text().replace('if(mf)await mf.dispose();if(server)', 'if(mf)try{await mf.dispose();}catch{}if(server)')
# A rejected fourth socket can open and close before the polling loop sees OPEN.
s=s.replace('await until(()=>ws.readyState===1||client.error);if(client.error)throw Error(client.error);ws.send(JSON.stringify({t:\'join\',name,skin:0,resumeToken}));', "await until(()=>ws.readyState===1||client.messages.some(x=>x.t==='error')||client.error);if(client.error)throw Error(client.error);if(ws.readyState===1)ws.send(JSON.stringify({t:'join',name,skin:0,resumeToken}));")
p.write_text(s)
print('Worker entrypoint compatibility and test reporting corrected.')
