import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { forgeStore } from './store.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow;
let aiServerProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  const bounds = forgeStore.getWindowBounds();
  
  mainWindow = new BrowserWindow({
    x: bounds?.x,
    y: bounds?.y,
    width: bounds?.width || 1400,
    height: bounds?.height || 900,
    webPreferences: {
      preload: path.join(__dirname, '../../../src/main/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Save window bounds when moved or resized
  mainWindow.on('moved', () => {
    const bounds = mainWindow.getBounds();
    forgeStore.setWindowBounds(bounds);
  });

  mainWindow.on('resized', () => {
    const bounds = mainWindow.getBounds();
    forgeStore.setWindowBounds(bounds);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

async function startAIServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../../../packages/ai-server');
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    
    aiServerProcess = spawn(pythonPath, ['main.py'], {
      cwd: serverPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        PATH: process.env.PATH || '/usr/bin:/bin:/usr/local/bin',
      },
      shell: true,
    });

    aiServerProcess.stdout?.on('data', (data) => {
      console.log(`AI Server: ${data}`);
      if (data.toString().includes('Application startup complete')) {
        resolve();
      }
    });

    aiServerProcess.stderr?.on('data', (data) => {
      console.error(`AI Server Error: ${data}`);
    });

    aiServerProcess.on('close', (code) => {
      console.log(`AI Server exited with code ${code}`);
      aiServerProcess = null;
    });

    aiServerProcess.on('error', (error) => {
      console.error('Failed to start AI server:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('AI server startup timeout'));
    }, 30000);
  });
}

function stopAIServer(): void {
  if (aiServerProcess) {
    aiServerProcess.kill();
    aiServerProcess = null;
  }
}

// Vault selection handlers
ipcMain.handle('select-vault-folder', async () => {
  const { dialog } = await import('electron');
  const defaultPath = forgeStore.getVaultPath();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Vault Folder',
    defaultPath,
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    forgeStore.setVaultPath(selectedPath);
    return { success: true, path: selectedPath };
  }
  return { success: false };
});

// Store-related IPC handlers
ipcMain.handle('get-vault-path', () => {
  return forgeStore.getVaultPath();
});

ipcMain.handle('set-vault-path', (event, path: string) => {
  forgeStore.setVaultPath(path);
  return { success: true };
});

ipcMain.handle('get-recent-vaults', () => {
  return forgeStore.getRecentVaults();
});

// File system handlers
ipcMain.handle('read-file', async (event, filePath: string) => {
  console.log('Main process: Reading file:', filePath);
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    console.log('Main process: File read successful, length:', content.length);
    return { success: true, content };
  } catch (error) {
    console.error('Main process: File read error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('write-file', async (event, filePath: string, content: string) => {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('list-directory', async (event, dirPath: string) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const entries = await fs.readdir(dirPath);
    
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);
        return {
          name: entry,
          path: fullPath,
          isDirectory: stats.isDirectory(),
        };
      })
    );
    
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// IPC handlers
ipcMain.handle('ai-query', async (event, query: string, model: string = 'llama3.1:8b') => {
  console.log(`🔍 Main process received - Query: "${query.substring(0, 30)}...", Model: "${model}"`);
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query, model: model, session_id: 'forge-desktop' }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI query error:', error);
    throw error;
  }
});

ipcMain.handle('server-status', async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    return response.ok;
  } catch {
    return false;
  }
});


app.whenReady().then(async () => {
  // TODO: Fix AI server startup issues with Electron security restrictions
  // For now, AI server should be started manually: cd packages/ai-server && python3 main.py
  console.log('AI server should be started manually in separate terminal');
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopAIServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopAIServer();
});