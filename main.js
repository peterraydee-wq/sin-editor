const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
let pty; try { pty = require('@lydell/node-pty'); } catch {}
const ptys = new Map(); let ptyId = 0;

Menu.setApplicationMenu(null);

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'target', '.next', '__pycache__']);
async function walk(dir, out = []) {
  const es = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of es) {
    if (out.length >= 20000) break;
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}

function createWindow() {
  const w = new BrowserWindow({
    width: 1280, height: 800, title: 'sin(editor)', backgroundColor: '#232a2e',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#232a2e', symbolColor: '#a7c080', height: 38 },
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required', // startup chime
    },
  });
  w.loadFile('index.html');
  let ok = false;
  w.on('close', async (e) => {
    if (ok) return;
    e.preventDefault();
    const dirty = await w.webContents.executeJavaScript('tabs.some(t => t.dirty)').catch(() => false);
    if (dirty && dialog.showMessageBoxSync(w, { type: 'question', buttons: ['cancel', 'discard & quit'], defaultId: 0, message: 'unsaved changes. quit anyway?' }) === 0) return;
    ok = true; w.close();
  });
  w.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F12') w.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
  ipcMain.handle('open-file', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    return r.canceled ? [] : r.filePaths;
  });
  ipcMain.handle('open-folder', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('save-as', async (_e, name) => {
    const r = await dialog.showSaveDialog({ defaultPath: name });
    return r.canceled ? null : r.filePath;
  });
  ipcMain.handle('read', async (_e, p, forced) => {
    const b = await fs.readFile(p);
    let enc = forced;
    if (!enc) {
      if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) enc = 'utf8bom';
      else if (b[0] === 0xff && b[1] === 0xfe) enc = 'utf16le';
      else if (b[0] === 0xfe && b[1] === 0xff) enc = 'utf16be';
      else { try { new TextDecoder('utf-8', { fatal: true }).decode(b); enc = 'utf8'; } catch { enc = 'latin1'; } }
    }
    let body = b;
    if (enc === 'utf8bom' && b[0] === 0xef) body = b.subarray(3);
    if ((enc === 'utf16le' && b[0] === 0xff) || (enc === 'utf16be' && b[0] === 0xfe)) body = b.subarray(2);
    const text = enc === 'utf16be' ? Buffer.from(body.subarray(0, body.length & ~1)).swap16().toString('utf16le')
      : enc === 'utf16le' ? body.toString('utf16le') : enc === 'latin1' ? body.toString('latin1') : body.toString('utf8');
    return { text, enc };
  });
  ipcMain.handle('write', (_e, p, t, enc = 'utf8') => {
    const bom = (...x) => Buffer.from(x);
    const data = enc === 'utf8bom' ? Buffer.concat([bom(0xef, 0xbb, 0xbf), Buffer.from(t, 'utf8')])
      : enc === 'utf16le' ? Buffer.concat([bom(0xff, 0xfe), Buffer.from(t, 'utf16le')])
      : enc === 'utf16be' ? Buffer.concat([bom(0xfe, 0xff), Buffer.from(t, 'utf16le').swap16()])
      : enc === 'latin1' ? Buffer.from(t, 'latin1') : Buffer.from(t, 'utf8');
    return fs.writeFile(p, data);
  });
  ipcMain.handle('ls', async (_e, p) => {
    const d = await fs.readdir(p, { withFileTypes: true });
    return d
      .map((x) => ({ name: x.name, path: path.join(p, x.name), dir: x.isDirectory() }))
      .sort((a, b) => b.dir - a.dir || a.name.localeCompare(b.name));
  });
  ipcMain.handle('pty-spawn', (e, cwd, cols, rows) => {
    if (!pty) throw new Error('node-pty is missing. run npm install');
    const sh = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    const id = ++ptyId;
    const p = pty.spawn(sh, [], { name: 'xterm-256color', cols, rows, cwd: cwd || os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } });
    p.onData((d) => !e.sender.isDestroyed() && e.sender.send('pty-data', id, d));
    p.onExit(() => { ptys.delete(id); if (!e.sender.isDestroyed()) e.sender.send('pty-exit', id); });
    ptys.set(id, p);
    return id;
  });
  ipcMain.on('pty-write', (_e, id, d) => ptys.get(id)?.write(d));
  ipcMain.on('pty-resize', (_e, id, c, r) => { try { ptys.get(id)?.resize(c, r); } catch {} });
  ipcMain.on('pty-kill', (_e, id) => { try { ptys.get(id)?.kill(); } catch {} });
  ipcMain.handle('create', async (_e, p, dir) => {
    await fs.mkdir(path.dirname(p), { recursive: true });
    if (dir) await fs.mkdir(p); else await fs.writeFile(p, '', { flag: 'wx' });
  });
  ipcMain.handle('rename', async (_e, a, b) => {
    if (await fs.access(b).then(() => true, () => false)) throw new Error('already exists');
    await fs.rename(a, b);
  });
  ipcMain.handle('trash', (_e, p) => shell.trashItem(p));
  ipcMain.on('overlay', (e, color, symbolColor) => {
    try { BrowserWindow.fromWebContents(e.sender)?.setTitleBarOverlay({ color, symbolColor, height: 38 }); } catch {}
  });
  ipcMain.handle('asset', (_e, rel) => {
    if (!/^[\w@./-]+$/.test(rel) || rel.includes('..')) throw new Error('bad asset path');
    return fs.readFile(path.join(__dirname, 'node_modules', rel), 'utf8');
  });
  ipcMain.on('open-url', (_e, u) => { if (/^(https?|mailto):/.test(u)) shell.openExternal(u); });
  ipcMain.handle('files', (_e, d) => walk(d));
  ipcMain.handle('grep', async (_e, d, q) => {
    const res = [], lq = q.toLowerCase();
    for (const p of await walk(d)) {
      if (res.length >= 200) break;
      let t;
      try { if ((await fs.stat(p)).size > 1e6) continue; t = await fs.readFile(p, 'utf8'); } catch { continue; }
      if (t.includes('\0') || !t.toLowerCase().includes(lq)) continue;
      t.split('\n').forEach((l, i) => {
        if (res.length < 200 && l.toLowerCase().includes(lq)) res.push({ p, line: i + 1, text: l.trim().slice(0, 200) });
      });
    }
    return res;
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => ptys.forEach((p) => { try { p.kill(); } catch {} }));
