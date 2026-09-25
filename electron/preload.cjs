const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vanishDesktop', {
  platform: process.platform,
  version: '1.0.0',
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-always-on-top', flag)
});
