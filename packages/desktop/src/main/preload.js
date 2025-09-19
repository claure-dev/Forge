const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');

const electronAPI = {
  aiQuery: (query, model) => ipcRenderer.invoke('ai-query', query, model),
  serverStatus: () => ipcRenderer.invoke('server-status'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  selectVaultFolder: () => ipcRenderer.invoke('select-vault-folder'),
  getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
  setVaultPath: (path) => ipcRenderer.invoke('set-vault-path', path),
  getRecentVaults: () => ipcRenderer.invoke('get-recent-vaults'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('Preload script completed, electronAPI exposed');