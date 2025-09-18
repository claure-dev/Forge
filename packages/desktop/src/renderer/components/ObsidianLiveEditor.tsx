import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from 'remark-wiki-link';

interface ObsidianLiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

interface EditableBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'blockquote';
  content: string;
  level?: number; // for headings
  isEditing: boolean;
}

export const ObsidianLiveEditor: React.FC<ObsidianLiveEditorProps> = ({
  value,
  onChange,
  onWikiLinkClick
}) => {
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [frontmatterExpanded, setFrontmatterExpanded] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  
  // Parse markdown into editable blocks
  useEffect(() => {
    const parseMarkdown = (markdown: string): EditableBlock[] => {
      const lines = markdown.split('\n');
      const newBlocks: EditableBlock[] = [];
      let currentBlock: string[] = [];
      let blockType: EditableBlock['type'] = 'paragraph';
      let blockId = 0;

      const finishBlock = () => {
        if (currentBlock.length > 0) {
          const content = currentBlock.join('\n');
          const block: EditableBlock = {
            id: `block-${blockId++}`,
            type: blockType,
            content,
            isEditing: false
          };
          
          // Extract heading level
          if (blockType === 'heading') {
            const match = content.match(/^(#{1,6})\s/);
            block.level = match ? match[1].length : 1;
          }
          
          newBlocks.push(block);
          currentBlock = [];
          blockType = 'paragraph';
        }
      };

      let inCodeBlock = false;
      let inBlockquote = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip frontmatter
        if (i === 0 && trimmed === '---') {
          let endIndex = -1;
          for (let j = 1; j < lines.length; j++) {
            if (lines[j].trim() === '---') {
              endIndex = j;
              break;
            }
          }
          if (endIndex > 0) {
            i = endIndex;
            continue;
          }
        }

        // Code blocks
        if (trimmed.startsWith('```')) {
          if (!inCodeBlock) {
            finishBlock();
            blockType = 'code';
            inCodeBlock = true;
            currentBlock.push(line);
          } else {
            currentBlock.push(line);
            inCodeBlock = false;
            finishBlock();
          }
          continue;
        }

        if (inCodeBlock) {
          currentBlock.push(line);
          continue;
        }

        // Headings
        if (trimmed.match(/^#{1,6}\s/)) {
          finishBlock();
          blockType = 'heading';
          currentBlock.push(line);
          finishBlock();
          continue;
        }

        // Blockquotes
        if (trimmed.startsWith('>')) {
          if (!inBlockquote) {
            finishBlock();
            blockType = 'blockquote';
            inBlockquote = true;
          }
          currentBlock.push(line);
          continue;
        } else if (inBlockquote) {
          inBlockquote = false;
          finishBlock();
        }

        // Lists
        if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
          if (blockType !== 'list') {
            finishBlock();
            blockType = 'list';
          }
          currentBlock.push(line);
          continue;
        }

        // Empty lines
        if (trimmed === '') {
          if (blockType === 'list' || inBlockquote) {
            finishBlock();
          } else if (currentBlock.length > 0) {
            currentBlock.push(line);
          }
          continue;
        }

        // Regular paragraphs
        if (blockType !== 'paragraph') {
          finishBlock();
          blockType = 'paragraph';
        }
        currentBlock.push(line);
      }

      finishBlock();
      return newBlocks;
    };

    setBlocks(parseMarkdown(value));
  }, [value]);

  // Convert blocks back to markdown
  const blocksToMarkdown = useCallback((blocks: EditableBlock[]): string => {
    return blocks.map(block => block.content).join('\n\n');
  }, []);

  // Handle block editing
  const startEditing = (blockId: string) => {
    setEditingBlockId(blockId);
    setBlocks(prev => prev.map(block => ({
      ...block,
      isEditing: block.id === blockId
    })));
  };

  const stopEditing = () => {
    setEditingBlockId(null);
    setBlocks(prev => prev.map(block => ({
      ...block,
      isEditing: false
    })));
    
    // Update parent with new content
    onChange(blocksToMarkdown(blocks));
  };

  const updateBlockContent = (blockId: string, newContent: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, content: newContent } : block
    ));
  };

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isIPAddress = (value: string): boolean => {
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    return ipPattern.test(value.trim());
  };

  const isMACAddress = (value: string): boolean => {
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macPattern.test(value.trim());
  };

  const parseFrontmatter = (content: string) => {
    const lines = content.split('\n');
    if (lines[0]?.trim() !== '---') {
      return { data: null, content };
    }
    
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex === -1) {
      return { data: null, content };
    }
    
    const frontmatterLines = lines.slice(1, endIndex);
    const contentLines = lines.slice(endIndex + 1);
    
    const data: Record<string, any> = {};
    for (const line of frontmatterLines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (value.startsWith('[') && value.endsWith(']')) {
          data[key] = value.slice(1, -1).split(',').map(v => v.trim());
        } else {
          data[key] = value;
        }
      }
    }
    
    return {
      data: Object.keys(data).length > 0 ? data : null,
      content: contentLines.join('\n').trim()
    };
  };

  const handleWikiLink = (linkText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWikiLinkClick) {
      onWikiLinkClick(linkText);
    }
  };

  // Render individual block
  const renderBlock = (block: EditableBlock) => {
    if (block.isEditing) {
      return (
        <div key={block.id} className="mb-4">
          <textarea
            value={block.content}
            onChange={(e) => updateBlockContent(block.id, e.target.value)}
            onBlur={stopEditing}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                stopEditing();
              }
              if (e.key === 'Enter' && e.ctrlKey) {
                stopEditing();
              }
            }}
            className="w-full bg-gray-800 text-gray-100 p-3 font-mono text-sm rounded resize-none focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors border border-gray-700"
            style={{ 
              minHeight: '60px',
              height: `${Math.max(60, block.content.split('\n').length * 20 + 20)}px`
            }}
            autoFocus
          />
          <div className="text-xs text-gray-400 mt-1">
            Press Escape or Ctrl+Enter to finish editing
          </div>
        </div>
      );
    }

    // Rendered block
    return (
      <div
        key={block.id}
        onClick={() => startEditing(block.id)}
        className="mb-4 p-2 rounded hover:bg-orange-950/20 cursor-text transition-all duration-200 group border border-transparent hover:border-orange-800/30"
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            [remarkWikiLink, { 
              pageResolver: (name: string) => [name],
              hrefTemplate: (permalink: string) => `#${permalink}`,
              aliasDivider: '|'
            }]
          ]}
          components={{
            // Custom components similar to previous implementation
            input: ({ checked, type, ...props }) => {
              if (type === 'checkbox') {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      e.stopPropagation();
                      // Handle checkbox toggle
                      const newContent = block.content.replace(
                        checked ? /\[x\]/g : /\[ \]/g,
                        checked ? '[ ]' : '[x]'
                      );
                      updateBlockContent(block.id, newContent);
                      onChange(blocksToMarkdown(blocks));
                    }}
                    className="mr-2 w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-600 focus:ring-2 cursor-pointer"
                    {...props}
                  />
                );
              }
              return <input type={type} {...props} />;
            },
            
            code: ({ inline, className, children, ...props }) => {
              return inline ? (
                <code className="bg-gray-800 text-orange-300 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm font-mono text-gray-100" {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            
            a: ({ children, href, ...props }) => {
              if (href && href.startsWith('#')) {
                return (
                  <span
                    className="text-orange-400 hover:text-orange-300 cursor-pointer underline decoration-orange-500/50 hover:decoration-orange-400 transition-all duration-200"
                    onClick={(e) => handleWikiLink(String(children), e)}
                  >
                    {children}
                  </span>
                );
              }
              
              return (
                <a 
                  href={href} 
                  className="text-orange-400 hover:text-orange-300 underline decoration-orange-500/50 hover:decoration-orange-400 transition-all duration-200"
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  {...props}
                >
                  {children}
                </a>
              );
            },
            
            // Other standard components...
            h1: ({ children, ...props }) => (
              <h1 className="text-2xl font-bold text-white border-b border-gray-600 pb-2 mt-2 mb-4" {...props}>
                {children}
              </h1>
            ),
            
            h2: ({ children, ...props }) => (
              <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-1 mt-2 mb-3" {...props}>
                {children}
              </h2>
            ),
            
            h3: ({ children, ...props }) => (
              <h3 className="text-lg font-bold text-white mt-2 mb-2" {...props}>
                {children}
              </h3>
            ),
            
            p: ({ children, ...props }) => (
              <p className="text-gray-200 mb-2 leading-relaxed" {...props}>
                {children}
              </p>
            ),
            
            blockquote: ({ children, ...props }) => (
              <blockquote 
                className="border-l-4 border-orange-500 pl-4 italic text-gray-300 my-2 bg-gray-800/30 py-2 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            ),
          }}
        >
          {block.content}
        </ReactMarkdown>
        
        {/* Hover indicator */}
        <div className="opacity-0 group-hover:opacity-50 text-xs text-gray-500 mt-1">
          Click to edit this {block.type}
        </div>
      </div>
    );
  };

  const { data: frontmatterData, content: contentToRender } = parseFrontmatter(value);

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Render frontmatter if present */}
        {frontmatterData && Object.keys(frontmatterData).length > 0 && (
          <div className="mb-4 bg-gray-800 rounded-lg">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setFrontmatterExpanded(prev => !prev);
              }}
            >
              <div className="flex items-center space-x-2">
                <div className={`transform transition-transform duration-200 ${
                  frontmatterExpanded ? 'rotate-90' : ''
                }`}>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <span className="text-xs text-gray-400 font-mono">YAML Frontmatter</span>
              </div>
              {!frontmatterExpanded && (
                <div className="flex items-center space-x-2">
                  {frontmatterData.status && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      frontmatterData.status === 'active' ? 'bg-green-900/30 text-green-400' :
                      frontmatterData.status === 'inactive' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>
                      {frontmatterData.status}
                    </span>
                  )}
                  {frontmatterData.role && (
                    <span className="text-xs px-2 py-1 rounded bg-orange-900/30 text-orange-400">
                      {frontmatterData.role}
                    </span>
                  )}
                  {frontmatterData.type && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400">
                      {frontmatterData.type}
                    </span>
                  )}
                </div>
              )}
            </div>
            {frontmatterExpanded && (
              <div className="px-4 pb-4 space-y-1 border-t border-gray-700">
                {Object.entries(frontmatterData).map(([key, value]) => {
                  const valueStr = Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
                  const shouldShowCopy = isIPAddress(valueStr) || isMACAddress(valueStr);
                  
                  return (
                    <div key={key} className="flex items-center mt-2">
                      <span className="text-orange-400 font-mono text-sm mr-2 min-w-0">{key}:</span>
                      <span className="text-gray-200 text-sm flex-1">
                        {valueStr}
                      </span>
                      {shouldShowCopy && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(valueStr);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded transition-colors"
                          title={`Copy ${key}`}
                        >
                          {copiedValue === valueStr ? (
                            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Render blocks */}
        {blocks.map(renderBlock)}
        
        {/* Add new block button */}
        {editingBlockId === null && (
          <div
            onClick={() => {
              const newBlockId = `block-${Date.now()}`;
              const newBlock: EditableBlock = {
                id: newBlockId,
                type: 'paragraph',
                content: '',
                isEditing: true
              };
              setBlocks(prev => [...prev, newBlock]);
              setEditingBlockId(newBlockId);
            }}
            className="p-4 border-2 border-dashed border-orange-800/40 rounded cursor-pointer hover:border-orange-600/60 text-center text-orange-400/70 hover:text-orange-300 transition-all duration-200 bg-orange-950/10 hover:bg-orange-950/20"
          >
            Click to add new paragraph...
          </div>
        )}
      </div>
    </div>
  );
};