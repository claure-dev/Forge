const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');

interface ElectronAPI {
  aiQuery: (query: string, model?: string) => Promise<any>;
  preloadModel: (model: string) => Promise<any>;
  serverStatus: () => Promise<boolean>;
  readFile: (filePath: string) => Promise<{success: boolean; content?: string; error?: string}>;
  writeFile: (filePath: string, content: string) => Promise<{success: boolean; error?: string}>;
  listDirectory: (dirPath: string) => Promise<{success: boolean; files?: any[]; error?: string}>;
  selectVaultFolder: () => Promise<{success: boolean; path?: string}>;
  getVaultPath: () => Promise<string | undefined>;
  setVaultPath: (path: string) => Promise<{success: boolean}>;
  getRecentVaults: () => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI: ElectronAPI = {
  aiQuery: (query: string, model?: string) => ipcRenderer.invoke('ai-query', query, model),
  preloadModel: (model: string) => ipcRenderer.invoke('preload-model', model),
  serverStatus: () => ipcRenderer.invoke('server-status'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  selectVaultFolder: () => ipcRenderer.invoke('select-vault-folder'),
  getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
  setVaultPath: (path: string) => ipcRenderer.invoke('set-vault-path', path),
  getRecentVaults: () => ipcRenderer.invoke('get-recent-vaults'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('Preload script completed, electronAPI exposed');