import React, { useState, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { FileBrowser } from './components/FileBrowser';
import { Editor } from './components/Editor';

const App: React.FC = () => {
  const [serverConnected, setServerConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [vaultPath, setVaultPath] = useState<string>('/home/adam/Projects/Forge/tests/fixtures/sample-vault');
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');

  // Calculate word count and reading time
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getReadingTime = (wordCount: number): string => {
    const wordsPerMinute = 225; // Average reading speed
    const minutes = Math.max(1, Math.round(wordCount / wordsPerMinute));
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
  };

  const wordCount = selectedFile ? getWordCount(fileContent) : 0;
  const readingTime = selectedFile ? getReadingTime(wordCount) : '';

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const status = await window.electronAPI.serverStatus();
        setServerConnected(status);
      } catch (error) {
        setServerConnected(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectVault = async () => {
    try {
      const result = await window.electronAPI.selectVaultFolder();
      if (result.success && result.path) {
        setVaultPath(result.path);
        setSelectedFile(null); // Clear selected file when switching vaults
        setShowVaultSelector(false);
      }
    } catch (error) {
      console.error('Error selecting vault:', error);
    }
  };

  const handleWikiLinkNavigation = async (fileName: string) => {
    console.log('Navigating to wiki link:', fileName);
    
    // Extract the actual filename from the wiki link (e.g., "Hardware/Router" -> "Router")
    const actualFileName = fileName.includes('/') ? fileName.split('/').pop() : fileName;
    const targetFileName = actualFileName?.endsWith('.md') ? actualFileName : `${actualFileName}.md`;
    
    console.log('Searching for file:', targetFileName);
    
    // Search for the file in the vault
    const searchForFile = async (dirPath: string, targetFileName: string): Promise<string | null> => {
      try {
        const result = await window.electronAPI.listDirectory(dirPath);
        if (!result.success) return null;
        
        for (const file of result.files) {
          if (file.isDirectory) {
            // Recursively search subdirectories
            const found = await searchForFile(file.path, targetFileName);
            if (found) return found;
          } else if (file.name.toLowerCase() === targetFileName.toLowerCase()) {
            return file.path;
          }
        }
        return null;
      } catch (error) {
        console.error('Error searching for file:', error);
        return null;
      }
    };

    const foundFilePath = await searchForFile(vaultPath, targetFileName);
    if (foundFilePath) {
      setSelectedFile(foundFilePath);
      console.log('Wiki link navigation successful:', foundFilePath);
    } else {
      console.warn('File not found for wiki link:', fileName, 'searched for:', targetFileName);
      // Could show a notification or create the file
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-900 via-gray-900 to-orange-950/30 text-white">
      {/* File Browser */}
      <div className="w-64 bg-gradient-to-b from-gray-800 to-orange-950/20 border-r border-orange-800/30 flex-shrink-0">
        <FileBrowser onFileSelect={setSelectedFile} vaultPath={vaultPath} selectedFile={selectedFile} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Status Bar */}
        <div className="bg-gradient-to-r from-gray-800 via-orange-950/20 to-gray-900 px-4 py-2 border-b border-orange-800/30 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  serverConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'
                }`}
              />
              <span className="text-sm">
                {serverConnected ? 'AI Server Connected' : 'AI Server Disconnected'}
              </span>
            </div>
            
            {/* Forge branding in status */}
            <div className="flex items-center space-x-1 text-xs text-orange-400">
              <span>🔥</span>
              <span>Forge Desktop</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedFile && (
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{readingTime}</span>
              </div>
            )}
            
            <span className="text-xs text-orange-300/70">
              {selectedFile ? selectedFile.split('/').pop() : 'No file selected'}
            </span>
            
            <button
              onClick={handleSelectVault}
              className="text-xs text-orange-300/70 hover:text-orange-100 hover:bg-orange-900/30 px-3 py-1 rounded transition-all duration-200 border border-orange-800/20 hover:border-orange-600/50"
            >
              📁 Select Vault
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <Editor 
              selectedFile={selectedFile} 
              onFileSelect={handleWikiLinkNavigation}
              onContentChange={setFileContent}
            />
          </div>
          
          {/* Chat Sidebar */}
          <div className="w-96 border-l border-orange-800/30 bg-gradient-to-b from-transparent to-orange-950/10 flex-shrink-0">
            <ChatInterface serverConnected={serverConnected} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;