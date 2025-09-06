import React, { useState, useEffect } from 'react';

const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === highlight.toLowerCase();
        return isMatch ? (
          <span key={index} className="bg-orange-500/30 text-orange-200">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
};

interface FileBrowserProps {
  onFileSelect: (filePath: string) => void;
  vaultPath: string;
  selectedFile?: string | null;
}

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

interface TreeNodeProps {
  item: FileItem;
  depth: number;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect: (filePath: string) => void;
  selectedFile?: string | null;
  searchQuery?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  item, 
  depth, 
  expandedFolders, 
  onToggle, 
  onFileSelect, 
  selectedFile,
  searchQuery 
}) => {
  const isExpanded = expandedFolders.has(item.path);
  const isSelected = selectedFile === item.path;
  const indentLevel = depth * 20;

  const handleClick = () => {
    if (item.isDirectory) {
      onToggle(item.path);
    } else {
      onFileSelect(item.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-orange-900/20 cursor-pointer rounded-sm transition-all duration-200 ${
          isSelected ? 'bg-gradient-to-r from-orange-900/30 to-red-900/20 border-l-2 border-orange-500 shadow-sm' : ''
        }`}
        style={{ paddingLeft: `${indentLevel + 8}px` }}
        onClick={handleClick}
      >
        {item.isDirectory && (
          <span className="w-4 h-4 flex items-center justify-center text-gray-400 mr-1">
            <svg
              className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        
        <span className="text-gray-400 w-4 mr-2 flex justify-center">
          {item.isDirectory ? (
            isExpanded ? '📂' : '📁'
          ) : (
            item.name.endsWith('.md') ? '📝' : '📄'
          )}
        </span>
        
        <span className={`text-sm truncate ${
          isSelected ? 'text-orange-300 font-medium' : 'text-gray-300'
        }`}>
          {searchQuery && searchQuery.trim() ? (
            <HighlightText text={item.name} highlight={searchQuery} />
          ) : (
            item.name
          )}
        </span>
      </div>
      
      {item.isDirectory && isExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({ onFileSelect, vaultPath, selectedFile }) => {
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([vaultPath]));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTree, setFilteredTree] = useState<FileItem[]>([]);

  const filterFileTree = (items: FileItem[], query: string): FileItem[] => {
    if (!query.trim()) return items;
    
    const searchTerm = query.toLowerCase();
    const filtered: FileItem[] = [];
    
    for (const item of items) {
      if (item.isDirectory) {
        // For directories, check if name matches or if any children match
        const filteredChildren = item.children ? filterFileTree(item.children, query) : [];
        const nameMatches = item.name.toLowerCase().includes(searchTerm);
        
        if (nameMatches || filteredChildren.length > 0) {
          filtered.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children
          });
        }
      } else {
        // For files, check if name matches
        if (item.name.toLowerCase().includes(searchTerm)) {
          filtered.push(item);
        }
      }
    }
    
    return filtered;
  };

  const loadFileTree = async (rootPath: string): Promise<FileItem[]> => {
    try {
      const result = await window.electronAPI.listDirectory(rootPath);
      if (!result.success || !result.files) {
        return [];
      }

      const items: FileItem[] = [];
      
      for (const file of result.files) {
        if (file.name.startsWith('.')) continue; // Skip hidden files
        
        if (file.isDirectory) {
          // Always add directories, load children if expanded
          const children = expandedFolders.has(file.path) ? await loadFileTree(file.path) : [];
          items.push({
            ...file,
            children: children.length > 0 ? children : undefined
          });
        } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          items.push(file);
        }
      }

      // Sort: directories first, then files, both alphabetically
      return items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error loading directory:', rootPath, error);
      return [];
    }
  };

  const refreshFileTree = async () => {
    setLoading(true);
    try {
      const tree = await loadFileTree(vaultPath);
      setFileTree(tree);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFileTree();
  }, [vaultPath, expandedFolders]);

  useEffect(() => {
    setFilteredTree(filterFileTree(fileTree, searchQuery));
  }, [fileTree, searchQuery]);

  const handleToggleFolder = async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 min-h-0" style={{
      border: '1px solid rgb(251 146 60 / 0.15)',
      boxShadow: `
        0 1px 3px rgb(0 0 0 / 0.12),
        inset 0 1px 0 rgb(255 255 255 / 0.02),
        inset 0 -1px 0 rgb(0 0 0 / 0.2),
        inset 1px 0 0 rgb(255 255 255 / 0.02),
        inset -1px 0 0 rgb(0 0 0 / 0.1)
      `
    }}>
      {/* Header with Forge branding - sparks on steel */}
      <div className="p-4 border-b border-orange-800/30 bg-gradient-to-r from-gray-800 via-orange-950/20 to-gray-800">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-md flex items-center justify-center shadow-lg shadow-orange-500/25">
            <span className="text-xs font-bold text-white">🔥</span>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Forge
          </h2>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {vaultPath.split('/').pop() || 'Vault'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-gray-800 text-gray-200 text-sm px-3 py-2 pl-8 rounded border border-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <div className="animate-spin w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full mr-2"></div>
            Loading...
          </div>
        ) : (searchQuery ? filteredTree : fileTree).length === 0 ? (
          <div className="text-gray-400 text-center p-4 text-sm">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </div>
        ) : (
          <div className="space-y-1">
            {(searchQuery ? filteredTree : fileTree).map((item) => (
              <TreeNode
                key={item.path}
                item={item}
                depth={0}
                expandedFolders={expandedFolders}
                onToggle={handleToggleFolder}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};