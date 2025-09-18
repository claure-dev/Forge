import React, { useRef, useEffect, useState } from 'react';
import { ObsidianEditor } from './ObsidianEditor';

interface EditorProps {
  selectedFile: string | null;
  onFileSelect?: (fileName: string) => void;
  onContentChange?: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ selectedFile, onFileSelect, onContentChange }) => {
  const [content, setContent] = useState('# Welcome to Forge Desktop\n\nSelect a file from the file browser to start editing.');
  const [isModified, setIsModified] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const saveFile = async () => {
    if (!selectedFile || !isModified) return;
    
    try {
      const result = await window.electronAPI.writeFile(selectedFile, content);
      if (result.success) {
        setIsModified(false);
        setOriginalContent(content);
        console.log('File saved successfully');
      } else {
        console.error('Failed to save file:', result.error);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const loadFile = async () => {
      if (selectedFile) {
        console.log('Loading file:', selectedFile);
        try {
          const result = await window.electronAPI.readFile(selectedFile);
          console.log('File read result:', result);
          if (result.success && result.content !== undefined) {
            console.log('Setting file content, length:', result.content.length);
            setContent(result.content);
            setOriginalContent(result.content);
            setIsModified(false);
            onContentChange?.(result.content);
            
            // Scroll to top when a new file is loaded
            setTimeout(() => scrollToTop(), 100);
          } else {
            console.error('Failed to load file:', result.error);
            setContent(`# Error loading file\n\n${result.error}`);
          }
        } catch (error) {
          console.error('Error loading file:', error);
          setContent(`# Error loading file\n\n${error}`);
        }
      }
    };

    loadFile();
  }, [selectedFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, isModified, content]);

  const handleEditorChange = async (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setIsModified(newContent !== originalContent);
    onContentChange?.(newContent);
  };

  // Separate function to handle auto-save for checkbox toggles
  const handleCheckboxToggle = async (newContent: string) => {
    // This function will be called from the ObsidianEditor specifically for checkbox changes
    setContent(newContent);
    setIsModified(newContent !== originalContent);
    onContentChange?.(newContent);

    // Auto-save checkbox toggles immediately
    console.log('Auto-saving checkbox toggle');
    setTimeout(async () => {
      try {
        if (selectedFile) {
          const result = await window.electronAPI.writeFile(selectedFile, newContent);
          if (result.success) {
            setIsModified(false);
            setOriginalContent(newContent);
            console.log('Checkbox toggle saved successfully');
          } else {
            console.error('Failed to save checkbox toggle:', result.error);
          }
        }
      } catch (error) {
        console.error('Error saving checkbox toggle:', error);
      }
    }, 100);
  };

  const handleWikiLinkClick = (fileName: string) => {
    if (onFileSelect) {
      onFileSelect(fileName);
      // Scroll to top will happen automatically when the new file loads
    }
  };

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-orange-950/20 text-orange-300/70">
        <div className="text-center p-8 rounded-lg bg-orange-950/10 border border-orange-800/20">
          <div className="text-4xl mb-4 text-orange-500/80">🔥</div>
          <h2 className="text-xl mb-2 text-orange-200/80">No file selected</h2>
          <p>Choose a file from the sidebar to start forging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-gray-900 to-orange-950/20 p-4">
      <div className="h-full flex flex-col">
        {selectedFile && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-orange-800/30">
            <span className="text-sm text-orange-200/90 font-medium">{selectedFile.split('/').pop()}</span>
            <div className="flex items-center space-x-2">
              {isModified && <span className="text-xs text-orange-400 animate-pulse">✨</span>}
              <span className="text-xs text-orange-300/60">Ctrl+S to save • Live Preview (cursor reveals markdown syntax)</span>
            </div>
          </div>
        )}
        {/* Obsidian Editor - Fixed version */}
        <div className="flex-1 min-h-0 overflow-hidden" ref={scrollContainerRef}>
          <ObsidianEditor
            value={content}
            onChange={handleEditorChange}
            onCheckboxToggle={handleCheckboxToggle}
            onWikiLinkClick={handleWikiLinkClick}
          />
        </div>
      </div>
    </div>
  );
};