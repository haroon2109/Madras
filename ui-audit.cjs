/* Temporary UI audit driver — headless Chrome via CDP. Deleted after use. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile, execSync } = require('child_process');

const wsMod = require('next/dist/compiled/ws');
const WebSocket = wsMod.WebSocket || wsMod;

const BASE = 'http://localhost:3000';
const DEBUG_PORT = 9223;
const SHOTS = '/tmp/ui-shots';
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

// Run the Next.js server as a child of THIS process so it survives the whole
// audit (background servers spawned from prior shell commands were reaped).
let serverProc = null;
async function startServer() {
  try { if (await up(BASE + '/login')) { console.log('server already up'); return; } } catch {}
  serverProc = require('child_process').spawn('npm', ['run', 'start'], { stdio: 'ignore', detached: false });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await up(BASE + '/login')) { console.log('server ready'); return; }
  }
  throw new Error('server did not start');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function up(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.on('message', (d) => {
      let msg;
      try { msg = JSON.parse(d.toString()); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.method + ': ' + JSON.stringify(msg.error))) : p.resolve(msg.result);
      } else if (msg.method) {
        this.listeners.forEach((fn) => fn(msg));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(fn) { this.listeners.push(fn); }
  waitEvent(method, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout waiting ' + method)), timeout);
      const fn = (msg) => {
        if (msg.method === method) {
          clearTimeout(t);
          this.listeners = this.listeners.filter((l) => l !== fn);
          resolve(msg.params);
        }
      };
      this.listeners.push(fn);
    });
  }
}

const AUDIT_FN = `(() => {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const docW = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  if (docW > vw + 1) issues.push({ type: 'page-hscroll', detail: 'scrollWidth ' + docW + ' > viewport ' + vw });

  const isHidden = (cs) => cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0;
  let n = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (++n > 5000) break;
    const cs = getComputedStyle(el);
    if (isHidden(cs)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    let anc = el.parentElement, inScroll = false, inFixed = false, inMap = false;
    while (anc) {
      if (anc.classList && anc.classList.contains('leaflet-container')) { inMap = true; break; }
      const acs = getComputedStyle(anc);
      if (acs.position === 'fixed') inFixed = true;
      const ox = acs.overflowX, oy = acs.overflowY;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip' || oy === 'auto' || oy === 'scroll' || oy === 'hidden' || oy === 'clip') { inScroll = true; break; }
      anc = anc.parentElement;
    }
    if (inMap || inScroll || inFixed) continue;
    if (r.right > vw + 1 || r.left < -1) {
      issues.push({ type: 'clipped-offscreen', tag: el.tagName, cls: String(el.className).slice(0, 90), rect: { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }, text: (el.textContent || '').trim().slice(0, 50) });
    }
    if (el.children.length === 0 && (el.textContent || '').trim().length > 0 && el.scrollWidth > el.clientWidth + 3 && cs.overflowX === 'visible') {
      issues.push({ type: 'text-bleed', tag: el.tagName, cls: String(el.className).slice(0, 90), text: (el.textContent || '').trim().slice(0, 50), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0) issues.push({ type: 'broken-img', src: (img.currentSrc || img.src).slice(0, 140) });
  }
  const sized = [];
  for (const sel of ['.leaflet-container', '.recharts-wrapper', 'canvas']) {
    const el = document.querySelector(sel);
    if (el) { const r = el.getBoundingClientRect(); sized.push({ sel, w: Math.round(r.width), h: Math.round(r.height) }); }
  }
  for (const s of sized) if (s.w < 80 || s.h < 40) issues.push({ type: 'collapsed-viz', ...s });
  return { vw, vh, docW, issues: issues.slice(0, 50), viz: sized };
})()`;

const ROUTES = [
  { path: '/', label: 'landing', delay: 1400 },
  { path: '/login', label: 'login', delay: 1200, preAuth: true },
  { path: '/signup', label: 'signup', delay: 1200, preAuth: true },
  { path: '/forgot-password', label: 'forgot-password', delay: 1200, preAuth: true },
  { path: '/weather', label: 'weather', delay: 1600, preAuth: true },
  { path: '/dashboard', label: 'dashboard', delay: 3000 },
  { path: '/zones', label: 'zones', delay: 1800 },
  { path: '/analytics', label: 'analytics', delay: 2400 },
  { path: '/decisions', label: 'decisions', delay: 2000 },
  { path: '/season', label: 'season', delay: 2200 },
  { path: '/tide', label: 'tide', delay: 2200 },
  { path: '/settings', label: 'settings', delay: 1400 },
  { path: '/report', label: 'report-city', delay: 2400 },
  { path: '/report/daily', label: 'report-daily', delay: 2400 },
  { path: '/report/zone', label: 'report-zone', delay: 2400 },
  { path: '/incidents', label: 'incidents', delay: 1600, admin: true },
  { path: '/accuracy', label: 'accuracy', delay: 1800, admin: true },
  { path: '/admin', label: 'admin', delay: 1800, admin: true },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false, dsf: 1 },
  { name: 'mobile', width: 390, height: 844, mobile: true, dsf: 2 },
];

async function connectPage() {
  const list = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024, perMessageDeflate: false });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  return cdp;
}

async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(res.exceptionDetails).slice(0, 300));
  return res.result.value;
}

async function navigate(cdp, url, delay) {
  const loaded = cdp.waitEvent('Page.loadEventFired', 30000).catch(() => {});
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(delay);
}

async function setViewport(cdp, vp) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, mobile: vp.mobile,
  });
}

async function shoot(cdp, name, fullPage) {
  const res = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!fullPage });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(res.data, 'base64'));
}

async function login(cdp, skipNav = false) {
  if (!skipNav) await navigate(cdp, BASE + '/login', 1500);
  const filled = await evaluate(cdp, `(() => {
    const setVal = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const email = document.querySelector('#email');
    const pass = document.querySelector('#password');
    if (!email || !pass) return false;
    setVal(email, 'admin@madras.local');
    setVal(pass, 'Madras@2026');
    return true;
  })()`);
  if (!filled) return false;
  await evaluate(cdp, `(() => { const b = document.querySelector('button[type="submit"]'); if (b) b.click(); return !!b; })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const p = await evaluate(cdp, 'location.pathname');
    if (p === '/dashboard') return true;
  }
  return false;
}

(async () => {
  await startServer();
  execSync(
    `google-chrome --headless=new --remote-debugging-port=${DEBUG_PORT} --user-data-dir=/tmp/chrome-ui-audit ` +
      `--no-first-run --no-default-browser-check --disable-gpu --hide-scrollbars --window-size=1440,900 about:blank & disown`,
    { shell: '/bin/bash', stdio: 'ignore' }
  );
  let cdp;
  for (let i = 0; i < 30; i++) {
    try { cdp = await connectPage(); break; } catch { await sleep(500); }
  }
  if (!cdp) throw new Error('could not connect to chrome');

  const consoleErrors = [];
  cdp.on((msg) => {
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push({ source: msg.params.entry.source, text: (msg.params.entry.text || '').slice(0, 220), url: (msg.params.entry.url || '').slice(0, 140) });
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push({ source: 'exception', text: (msg.params.exceptionDetails.text || '') + ' ' + ((msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description) || '').slice(0, 200) });
    }
  });

  const report = { login: false, results: [] };

  // Public / pre-auth routes first (logged out)
  await setViewport(cdp, VIEWPORTS[0]);
  const preAuth = ROUTES.filter((r) => r.preAuth);
  for (const r of preAuth) {
    const errorsBefore = consoleErrors.length;
    await navigate(cdp, BASE + r.path, r.delay);
    const audit = await evaluate(cdp, AUDIT_FN);
    await shoot(cdp, `${r.label}-desktop`, false);
    await shoot(cdp, `${r.label}-desktop-full`, true);
    report.results.push({ route: r.path, viewport: 'desktop', audit, newConsoleErrors: consoleErrors.slice(errorsBefore) });
  }

  // Log in at desktop size
  report.login = await login(cdp);

  let loggedIn = report.login;
  for (const vp of VIEWPORTS) {
    await setViewport(cdp, vp);
    // A viewport resize can drop the session cookie (Chrome clears cookies
    // for the new profile context), so re-establish it only when needed.
    const stillIn = await evaluate(cdp, `(async () => {
      try {
        const r = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!r.ok) return false;
        const j = await r.json();
        return !!(j && j.user);
      } catch { return false; }
    })()`);
    if (!stillIn) {
      loggedIn = await login(cdp, vp.name !== VIEWPORTS[0].name); // same page: skip nav if we're already on /login
      if (!loggedIn) {
        report.results.push({ route: '(login failed after resize)', viewport: vp.name, audit: { issues: [] } });
        continue;
      }
    }
    for (const r of ROUTES) {
      if (r.preAuth) continue;
      if (r.admin && !loggedIn) continue;
      const errorsBefore = consoleErrors.length;
      await navigate(cdp, BASE + r.path, r.delay);
      let audit;
      try { audit = await evaluate(cdp, AUDIT_FN); } catch (e) { audit = { evalError: String(e).slice(0, 200) }; }
      const pathname = await evaluate(cdp, 'location.pathname');
      await shoot(cdp, `${r.label}-${vp.name}`, false);
      await shoot(cdp, `${r.label}-${vp.name}-full`, true);
      report.results.push({ route: r.path, viewport: vp.name, redirectedTo: pathname, audit, newConsoleErrors: consoleErrors.slice(errorsBefore) });
    }
    loggedIn = await evaluate(cdp, `(async () => {
      try { const r = await fetch('/api/auth/session', { cache: 'no-store' }); const j = await r.json(); return !!(j && j.user); } catch { return false; }
    })()`);
  }

  report.consoleErrorsTotal = consoleErrors;
  fs.writeFileSync('/tmp/ui-audit-report.json', JSON.stringify(report, null, 2));

  // Compact stdout summary
  const lines = [];
  lines.push('LOGIN_OK=' + report.login);
  for (const res of report.results) {
    const issues = res.audit && res.audit.issues ? res.audit.issues : [{ type: 'AUDIT-FAIL', detail: JSON.stringify(res.audit).slice(0, 200) }];
    lines.push(`\n== ${res.route} [${res.viewport}]${res.redirectedTo && res.redirectedTo !== res.route ? ' (landed: ' + res.redirectedTo + ')' : ''}`);
    for (const i of issues) lines.push('  ' + JSON.stringify(i));
    for (const c of res.newConsoleErrors || []) lines.push('  console: ' + JSON.stringify(c).slice(0, 220));
  }
  console.log(lines.join('\n'));
  try { if (serverProc) serverProc.kill('SIGTERM'); } catch {}
  execSync('pkill -f "[c]hrome-ui-audit" || true', { shell: '/bin/bash' });
  process.exit(0);
})().catch((e) => {
  console.error('AUDIT CRASH:', e);
  try { if (serverProc) serverProc.kill('SIGTERM'); } catch {}
  execSync('pkill -f "[c]hrome-ui-audit" || true', { shell: '/bin/bash' });
  process.exit(1);
});
