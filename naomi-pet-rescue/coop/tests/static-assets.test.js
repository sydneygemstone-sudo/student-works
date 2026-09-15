const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { server, wss } = require('../server/index.js');

let baseUrl = '';

describe('Naomi 联机合作版 —— 本地静态资源与无外网依赖测试', () => {
  before(async () => {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      wss.close(() => {
        server.close(resolve);
      });
    });
  });

  test('1. 主入口 HTML 正确加载', async () => {
    const res = await fetch(`${baseUrl}/naomi-pet-rescue/coop/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const text = await res.text();
    assert.match(text, /小动物回家/);
    assert.match(text, /vendor\/three.min.js/);
  });

  test('2. Three.js 本地 vendored 文件加载正常（无外网 CDN 依赖）', async () => {
    const res = await fetch(`${baseUrl}/naomi-pet-rescue/coop/vendor/three.min.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /javascript/);
    const text = await res.text();
    assert.ok(text.length > 50000, 'Three.js 库内容必须完整');
  });

  test('3. 客户端脚本与样式表加载正常', async () => {
    const files = [
      ['style.css', /text\/css/],
      ['render3d.js', /javascript/],
      ['story-theatre.js', /javascript/],
      ['app.js', /javascript/],
      ['core/coop-engine.js', /javascript/],
    ];

    for (const [file, mimeRegex] of files) {
      const res = await fetch(`${baseUrl}/naomi-pet-rescue/coop/${file}`);
      assert.equal(res.status, 200, `文件 ${file} 应能成功返回 200`);
      assert.match(res.headers.get('content-type'), mimeRegex);
    }
  });

  test('4. 故事原版插画与配音资源加载正常', async () => {
    const imgRes = await fetch(`${baseUrl}/naomi-pet-rescue/coop/assets/story/garden-story.png`);
    assert.equal(imgRes.status, 200);
    assert.equal(imgRes.headers.get('content-type'), 'image/png');

    const audioRes = await fetch(`${baseUrl}/naomi-pet-rescue/coop/assets/story/rescue-indextts25.wav`);
    assert.equal(audioRes.status, 200);
    assert.equal(audioRes.headers.get('content-type'), 'audio/wav');
  });
});
