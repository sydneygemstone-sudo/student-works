// Reuse the verified acceptance scenario against a newly created synthetic production room.
// Never clears student data, restarts production services, or logs room credentials.
const fs=require('fs'),path=require('path');let s=fs.readFileSync(path.join(__dirname,'qa.cjs'),'utf8');
s=s.replace("const R=path.resolve(__dirname,'../..'),O=path.join(R,'adventure-world/builds/trio-world-opus/cloudflare/qa-r2')", "const R=path.resolve(__dirname,'../..'),O=path.join(R,'adventure-world/builds/trio-world-opus/cloudflare/qa-live-r2')");
s=s.replace("scope:'Synthetic rooms only. Real Worker runtime via Miniflare, original protocol actions and browser forms. Protocol movement is simulated; not physical-iPad/full human gameplay certification.'", "scope:'Live Worker and published Pages. A newly created synthetic QA room only; no student rooms accessed. Movement is protocol-simulated, not physical-iPad or human playthrough certification. No production restart is performed.'");
s=s.replace(/async function startRuntime\(\)\{[^\n]+\}/, "async function startRuntime(){api='https://trio-world-opus.sydney-gemstone-games.workers.dev';}");
s=s.replace("front=`http://127.0.0.1:${server.address().port}`", "front='https://sydneygemstone-sudo.github.io/student-works'");
s=s.replaceAll("front||'https://sydneygemstone-sudo.github.io'", "'https://sydneygemstone-sudo.github.io'");
s=s.replaceAll('await mf.dispose();','');
s=s.replace('Progress survives Worker restart','Live task progress survives disconnect and authenticated reread');
s=s.replace('Submitted review survives a second Worker restart','Live revised submission persists on subsequent read');
s=s.replace('await wait(200);','await wait(700);');
s=s.replace('await until(()=>ws.readyState===1||client.error);if(client.error)throw Error(client.error);ws.send(JSON.stringify({t:\'join\',name,skin:0,resumeToken}));', "await until(()=>ws.readyState===1||client.messages.some(x=>x.t==='error')||client.error);if(client.error)throw Error(client.error);if(ws.readyState===1)ws.send(JSON.stringify({t:'join',name,skin:0,resumeToken}));");
// Removing a conditional disposal must not leave an accidental dangling if.
s=s.replace('if(mf)try{}catch{}','').replace('if(mf)if(server)','if(server)');
const target=path.join(__dirname,'.qa-live.generated.cjs');fs.writeFileSync(target,s);require(target);
