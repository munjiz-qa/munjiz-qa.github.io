// مشوار على الكمبيوتر: يفتح التطبيق من ملفاته المضمّنة، ويفتح الروابط الخارجية في المتصفح.
const { app, BrowserWindow, protocol, net, shell, session, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const ROOT = path.join(__dirname, '..', 'www');
if (!app.requestSingleInstanceLock()) app.quit();
function create() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 600, title: 'مشوار', backgroundColor: '#0f2a3d',
    icon: path.join(__dirname, '..', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto|tel):/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });
  win.loadURL('app://mishwar/mishwar/index.html');
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', req => {
    const u = new URL(req.url);
    const p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname)));
    if (!p.startsWith(ROOT)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(p).toString());
  });
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['geolocation', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  create();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
