import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow;
let aiServerProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    webPreferences: {
      preload: path.join(__dirname, '../main/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
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
      env: { ...process.env },
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
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Vault Folder',
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
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
ipcMain.handle('ai-query', async (event, query: string) => {
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query }),
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
  // Temporarily disable AI server to avoid connection spam
  console.log('Skipping AI server start for now');
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