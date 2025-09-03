import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  aiQuery: (query: string) => Promise<any>;
  serverStatus: () => Promise<boolean>;
  readFile: (filePath: string) => Promise<{success: boolean; content?: string; error?: string}>;
  writeFile: (filePath: string, content: string) => Promise<{success: boolean; error?: string}>;
  listDirectory: (dirPath: string) => Promise<{success: boolean; files?: any[]; error?: string}>;
  selectVaultFolder: () => Promise<{success: boolean; path?: string}>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI: ElectronAPI = {
  aiQuery: (query: string) => ipcRenderer.invoke('ai-query', query),
  serverStatus: () => ipcRenderer.invoke('server-status'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  selectVaultFolder: () => ipcRenderer.invoke('select-vault-folder'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);