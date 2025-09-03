import React, { useState, useRef, useEffect } from 'react';
import { InteractiveMarkdown } from './InteractiveMarkdown';

interface ObsidianLivePreviewProps {
  value: string;
  onChange: (value: string) => void;
  onFileSelect?: (fileName: string) => void;
}

interface EditableBlock {
  id: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'code';
}

export const ObsidianLivePreview: React.FC<ObsidianLivePreviewProps> = ({ value, onChange, onFileSelect }) => {
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Simple block parsing - split by double newlines for now
      if (!value || typeof value !== 'string') {
        setBlocks([]);
        return;
      }

      const sections = value.split(/\n\s*\n/).filter(section => section.trim());
      const newBlocks: EditableBlock[] = sections.map((section, index) => ({
        id: `block-${index}`,
        startLine: 0, // We'll simplify this for now
        endLine: 0,
        content: section.trim(),
        type: section.trim().startsWith('#') ? 'heading' : 'paragraph'
      }));

      setBlocks(newBlocks);
    } catch (error) {
      console.error('Error parsing blocks:', error);
      setBlocks([]);
    }
  }, [value]);

  const handleBlockClick = (blockId: string) => {
    if (editingBlock !== blockId) {
      setEditingBlock(blockId);
    }
  };

  const handleBlockEdit = (blockId: string, newContent: string) => {
    try {
      const blockIndex = parseInt(blockId.replace('block-', ''));
      const sections = value.split(/\n\s*\n/).filter(section => section.trim());
      
      if (blockIndex >= 0 && blockIndex < sections.length) {
        sections[blockIndex] = newContent;
        const newValue = sections.join('\n\n');
        onChange(newValue);
      }
    } catch (error) {
      console.error('Error editing block:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Escape') {
      setEditingBlock(null);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      setEditingBlock(null);
    }
  };

  const handleWikiLinkClick = (linkText: string) => {
    console.log('Wiki link clicked:', linkText);
    if (onFileSelect) {
      // Try to find the file - remove .md extension if present and add it back
      const fileName = linkText.endsWith('.md') ? linkText : `${linkText}.md`;
      onFileSelect(fileName);
    }
  };

  const handleTaskToggle = (taskIndex: number, checked: boolean) => {
    // Find the task in the content and toggle it
    const lines = value.split('\n');
    let currentTaskIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^(\s*)-\s+\[([ x])\]/)) {
        if (currentTaskIndex === taskIndex) {
          // Toggle the checkbox
          const newCheckState = checked ? 'x' : ' ';
          lines[i] = line.replace(/\[([ x])\]/, `[${newCheckState}]`);
          onChange(lines.join('\n'));
          break;
        }
        currentTaskIndex++;
      }
    }
  };

  const renderBlock = (block: EditableBlock) => {
    try {
      const isEditing = editingBlock === block.id;

      if (isEditing) {
        return (
          <div key={block.id} className="mb-4">
            <textarea
              value={block.content || ''}
              onChange={(e) => handleBlockEdit(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onBlur={() => setEditingBlock(null)}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600 font-mono text-sm resize-none"
              style={{ minHeight: '60px', height: 'auto' }}
              autoFocus
              rows={Math.max(2, (block.content || '').split('\n').length)}
            />
            <div className="text-xs text-gray-400 mt-1">Press Escape or Ctrl+Enter to finish editing</div>
          </div>
        );
      }

      return (
        <div
          key={block.id}
          onClick={() => handleBlockClick(block.id)}
          className="mb-4 p-2 rounded hover:bg-gray-800/50 cursor-text transition-colors group"
        >
          <InteractiveMarkdown
            content={block.content || ''}
            onWikiLinkClick={handleWikiLinkClick}
            onTaskToggle={handleTaskToggle}
          />
          <div className="opacity-0 group-hover:opacity-50 text-xs text-gray-500 mt-1">
            Click to edit
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering block:', error);
      return (
        <div key={block.id} className="mb-4 p-2 bg-red-900/20 rounded">
          <div className="text-red-400 text-sm">Error rendering block</div>
        </div>
      );
    }
  };

  return (
    <div ref={containerRef} className="h-full p-6 overflow-y-auto bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {blocks.length > 0 ? (
          blocks.map(renderBlock)
        ) : (
          <div
            onClick={() => setEditingBlock('new')}
            className="p-4 text-gray-400 hover:text-white cursor-text rounded hover:bg-gray-800/50"
          >
            Click to start writing...
          </div>
        )}
        
        {editingBlock === 'new' && (
          <div className="mb-4">
            <textarea
              value=""
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingBlock(null);
              }}
              onBlur={() => setEditingBlock(null)}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600 font-mono text-sm"
              placeholder="Start typing your markdown..."
              autoFocus
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );
};