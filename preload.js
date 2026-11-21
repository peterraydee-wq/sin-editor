const { contextBridge, ipcRenderer: ipc } = require('electron');

contextBridge.exposeInMainWorld('sin', {
  openFiles: () => ipc.invoke('open-file'),
  openFolder: () => ipc.invoke('open-folder'),
  saveAs: (name) => ipc.invoke('save-as', name),
  read: (p, enc) => ipc.invoke('read', p, enc),
  write: (p, t, enc) => ipc.invoke('write', p, t, enc),
  ls: (p) => ipc.invoke('ls', p),

  files: (d) => ipc.invoke('files', d),
  grep: (d, q) => ipc.invoke('grep', d, q),
  asset: (rel) => ipc.invoke('asset', rel),
  openExternal: (u) => ipc.send('open-url', u),
  create: (p, dir) => ipc.invoke('create', p, dir),
  rename: (a, b) => ipc.invoke('rename', a, b),
  trash: (p) => ipc.invoke('trash', p),
  overlay: (c, s) => ipc.send('overlay', c, s),
  term: {
    spawn: (cwd, c, r) => ipc.invoke('pty-spawn', cwd, c, r),
    write: (id, d) => ipc.send('pty-write', id, d),
    resize: (id, c, r) => ipc.send('pty-resize', id, c, r),
    kill: (id) => ipc.send('pty-kill', id),
    onData: (cb) => ipc.on('pty-data', (_e, id, d) => cb(id, d)),
    onExit: (cb) => ipc.on('pty-exit', (_e, id) => cb(id)),
  },
});
