// Deterministic online adapter; public/index.html remains the unmodified LAN release.
// The Git blob check fails closed if another release replaces that archived source.
const ORIGINAL_BLOB = '0383acf33132227d69596b3ff2c7a0e5debecbe3';
const CLOUD_BASE = 'https://trio-world-opus.sydney-gemstone-games.workers.dev';
try {
  const response = await fetch(new URL('../public/index.html', import.meta.url), {cache:'no-cache'});
  if (!response.ok) throw new Error('Original game unavailable: HTTP '+response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const header = new TextEncoder().encode('blob '+bytes.length+'\0');
  const input = new Uint8Array(header.length+bytes.length); input.set(header); input.set(bytes,header.length);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',input)),v=>v.toString(16).padStart(2,'0')).join('');
  if (hash !== ORIGINAL_BLOB) throw new Error('Original release changed; online adapter needs review. Expected '+ORIGINAL_BLOB+', got '+hash);
  let html = new TextDecoder().decode(bytes);
  function replace(oldValue,newValue) {
    if (html.split(oldValue).length !== 2) throw new Error('Source compatibility check failed: '+oldValue.slice(0,70));
    html = html.replace(oldValue,()=>newValue);
  }
  replace('<title>三人同乐世界</title>','<title>Trio World · 三人同乐世界 · 在线联机测试版</title>\n<meta name="robots" content="noindex,nofollow">\n<meta name="referrer" content="no-referrer">');
  replace('</style>',`
  #start { overflow:auto; padding:16px 0; touch-action:pan-y; }
  #start .card { max-height:94dvh; overflow:auto; touch-action:pan-y; }
  #room { font-size:14px!important; margin-top:6px; font-family:monospace; }
  .roomActions { display:flex; gap:8px; margin:10px 0; }
  .roomActions button { flex:1; padding:10px 5px; cursor:pointer; border:1px solid #bccde2; border-radius:10px; background:#edf5ff; color:#234; }
  #cloudStatus { font-size:12px; margin:10px 0; line-height:1.6; color:#345; }
  #start label { display:block; text-align:left; margin-top:12px; font-size:13px; }
  #banner { max-width:90vw; font-size:13px; text-align:center; z-index:60; }
</style>`);
  replace('<h1>🌈 三人同乐世界</h1>','<h1>🌈 三人同乐世界</h1><p style="margin-bottom:8px">Trio World · Online Playtest</p>');
  replace('<input id="name" maxlength="10" placeholder="输入你的名字">',`<input id="name" maxlength="10" placeholder="游戏昵称 / Nickname" autocomplete="off">
  <label for="room">邀请房间 / Private invitation room</label>
  <input id="room" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Room code">
  <div class="roomActions"><button id="newRoom" type="button">新房间 / New room</button><button id="copyRoom" type="button">复制邀请 / Copy invite</button></div>
  <div id="cloudStatus" role="status">一人创建房间，把邀请发给另外两人；三人打开同一链接。<br>Create a room and share the same invite. Up to 3 players. Use nicknames, not full names.</div>`);
  replace('<button id="go">进入世界 ▶</button>','<button id="go">一起进入 / Play online ▶</button>');
  replace("import * as THREE from './vendor/three.module.js';","import * as THREE from '../public/vendor/three.module.js';");
  replace('const QS = new URLSearchParams(location.search);',`const QS = new URLSearchParams(location.search);
const CLOUD_BASE = ${JSON.stringify(CLOUD_BASE)};
const roomOK = v => /^[a-f0-9]{24}$/.test(v);
const randomRoom = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), x => x.toString(16).padStart(2,'0')).join('');
let roomCode = new URLSearchParams(location.hash.slice(1)).get('room');
if (!roomOK(roomCode || '')) roomCode = randomRoom();
function setRoom(value) {
  roomCode = value; $('room').value = value;
  history.replaceState(null, '', location.pathname + location.search + '#room=' + value);
}
setRoom(roomCode);
$('newRoom').onclick = () => setRoom(randomRoom());
$('copyRoom').onclick = async () => {
  const code = $('room').value.trim().toLowerCase();
  if (!roomOK(code)) { $('cloudStatus').textContent = '房间码应为24位 / Use the 24-character room code'; return; }
  setRoom(code);
  try { await navigator.clipboard.writeText(location.href); $('cloudStatus').textContent = '邀请已复制，只发给两位朋友 / Invite copied. Share privately with two friends.'; }
  catch { $('cloudStatus').textContent = '请复制地址栏中的完整链接 / Copy the full browser address.'; }
};`);
  replace("try { mySkin = +(localStorage.getItem('tw_skin') || 0) % SKINS.length;","try { mySkin = Math.max(0, Math.min(4, Math.floor(+(localStorage.getItem('tw_skin') || 0)) || 0));");
  replace('let ws = null, connected = false;','let ws = null, connected = false, retryCount = 0, retryTimer = null, heartbeat = null, terminalConnectionError = false;');
  replace("  ws = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host);",`  clearTimeout(retryTimer); clearInterval(heartbeat);
  $('banner').textContent = '正在连接同一个世界 / Connecting to your room…';
  $('banner').style.display = 'block';
  ws = new WebSocket(CLOUD_BASE.replace(/^http/, 'ws') + '/ws/' + roomCode);`);
  replace("  ws.onopen = () => { connected = true; $('banner').style.display = 'none'; ws.send(JSON.stringify({ t: 'join', name: me.name, skin: mySkin })); };",`  ws.onopen = () => {
    ws.send(JSON.stringify({ t: 'join', name: me.name, skin: mySkin }));
    heartbeat = setInterval(() => { if (ws?.readyState === 1) ws.send('ping'); }, 25000);
  };`);
  replace("  ws.onclose = () => { connected = false; $('banner').style.display = 'block'; for (const id of [...others.keys()]) removeOther(id); setTimeout(connect, 1000); };",`  ws.onclose = () => {
    connected = false; clearInterval(heartbeat); $('banner').style.display = 'block';
    for (const id of [...others.keys()]) removeOther(id);
    renderOnline();
    if (terminalConnectionError) return;
    retryCount++;
    if (retryCount > 8) { $('banner').textContent = '连接未恢复，请刷新重试 / Connection unavailable. Refresh to retry.'; return; }
    $('banner').textContent = '连接中断，正在重连 / Reconnecting… (' + retryCount + '/8)';
    retryTimer = setTimeout(connect, Math.min(15000, 800 * 2 ** (retryCount - 1)) + Math.random() * 300);
  };`);
  replace('    const m = JSON.parse(e.data);',"    if (e.data === 'pong') return;\n    let m; try { m = JSON.parse(e.data); } catch { return; }");
  replace("      case 'init': me.id = m.id;", "      case 'error': terminalConnectionError = true; $('banner').textContent = m.text || '连接受限 / Connection refused'; $('banner').style.display = 'block'; break;\n      case 'init': connected = true; retryCount = 0; $('banner').style.display = 'none'; me.id = m.id;");
  replace('function interact() { if (focus) focus.act(); }',"function interact() { if (!connected) { toast('请等联机恢复再互动 / Wait for reconnection'); return; } if (focus) focus.act(); }");
  replace('  if (started) return; started = true;',`  if (started) return;
  const code = $('room').value.trim().toLowerCase();
  if (!roomOK(code)) { $('cloudStatus').textContent = '请检查房间码 / Check the room code.'; return; }
  setRoom(code); started = true;`);
  replace("function renderOnline() { $('online').innerHTML =", "function renderOnline() { $('online').dataset.connected = String(connected); $('online').innerHTML =");
  replace('function applyWorld(p) {',`function applyWorld(p) {
  if (p._init) {
    for (const k of ['fruits','wood','stars','fedAnimals']) world[k] = {};
    for (const id of Object.keys(produceMeshes)) if (!p.produce || !p.produce[id]) { scene.remove(produceMeshes[id]); delete produceMeshes[id]; delete produceKinds[id]; }
    world.produce = {};
  }`);
  replace('const pending = new Set();',`// Read-only QA snapshot; it does not grant gameplay control or expose room codes.
Object.defineProperty(window, '__TRIO_QA__', { value: () => ({connected, id:me.id, others:others.size, position:{x:me.pos.x,y:me.pos.y,z:me.pos.z}, remote:[...others].map(([id,o])=>({id,x:o.root.position.x,y:o.root.position.y,z:o.root.position.z})), world:JSON.parse(JSON.stringify(world))}) });
const pending = new Set();`);
  document.open(); document.write(html); document.close();
} catch (error) {
  const node = document.getElementById('error');
  if (node) node.textContent = '载入失败，请刷新重试 / Unable to load. Refresh to retry.\n'+String(error.message || error);
  console.error('TRIO_ONLINE_LOAD_FAILED', error);
}
