const { execSync } = require('child_process');
const http = require('http');
const wsMod = require('next/dist/compiled/ws');
const WebSocket = wsMod.WebSocket || wsMod;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve(JSON.parse(d))); }).on('error', reject);
  });
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.on('message', (d) => { const m = JSON.parse(d.toString());
      if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else if (m.method) this.listeners.forEach((f) => f(m)); }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  on(f) { this.listeners.push(f); }
}
(async () => {
  execSync('google-chrome --headless=new --remote-debugging-port=9224 --user-data-dir=/tmp/chrome-ui-dbg --no-first-run --disable-gpu about:blank & disown', { shell: '/bin/bash', stdio: 'ignore' });
  let page;
  for (let i = 0; i < 30; i++) { try { const l = await getJSON('http://127.0.0.1:9224/json/list'); page = l.find((t) => t.type === 'page'); if (page) break; } catch {} await sleep(500); }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  const loaded = new Promise((r) => cdp.on((m) => m.method === 'Page.loadEventFired' && r()));
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
  await loaded; await sleep(2000);
  const res = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify({
    url: location.href,
    email: !!document.querySelector('#email'),
    pass: !!document.querySelector('#password'),
    submit: !!document.querySelector('button[type=submit]'),
    forms: document.forms.length,
    inputs: [...document.querySelectorAll('input')].map(i => ({ id: i.id, type: i.type, name: i.name })),
    bodySnippet: document.body.innerText.slice(0, 200)
  })`, returnByValue: true });
  console.log(res.result.value);
  const res2 = await cdp.send('Runtime.evaluate', { expression: `(() => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); return typeof (d && d.set); })()`, returnByValue: true });
  console.log('descriptor set type:', JSON.stringify(res2));
  process.exit(0);
})().catch((e) => { console.error('DBG CRASH', e); process.exit(1); });
