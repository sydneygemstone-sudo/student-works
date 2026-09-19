// 原版 2D 互动版静态服务与全版本导航入口
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT || '8780', 10);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

function getLanIps() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (/^(utun|tun|tap|tailscale|wg|awdl|llw|bridge|vbox|docker)/i.test(name)) continue;
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('100.')) continue;
        ips.push({ name, address: net.address });
      }
    }
  }
  ips.sort((a, b) => (a.name === 'en0' ? -1 : 1));
  return ips;
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/naomi-pet-rescue/hub.html';
  }

  let filePath = path.join(ROOT_DIR, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(`404 Not Found: ${reqPath}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIps = getLanIps();
  const lanIp = lanIps.length > 0 ? lanIps[0].address : 'localhost';
  console.log(`======================================================================`);
  console.log(`🌲 Naomi《小动物回家》原版 2D 互动版与全版本导航服务`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🌐 本机导航入口:   http://localhost:${PORT}/naomi-pet-rescue/hub.html`);
  console.log(`📖 本机原版游戏:   http://localhost:${PORT}/naomi-pet-rescue/`);
  console.log(`📱 局域网/iPad:    http://${lanIp}:${PORT}/naomi-pet-rescue/`);
  console.log(`======================================================================`);
});
