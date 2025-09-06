import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from 'remark-wiki-link';

interface ObsidianEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

export const ObsidianEditor: React.FC<ObsidianEditorProps> = ({ 
  value, 
  onChange, 
  onWikiLinkClick 
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [frontmatterExpanded, setFrontmatterExpanded] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit value when prop value changes (external file changes)
  useEffect(() => {
    if (!isEditMode) {
      setEditValue(value);
    }
  }, [value, isEditMode]);

  const enterEditMode = () => {
    setEditValue(value);
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    onChange(editValue);
    setIsEditMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      exitEditMode();
    }
    // Ctrl+Enter also exits edit mode
    if (e.ctrlKey && e.key === 'Enter') {
      exitEditMode();
    }
  };

  const handleWikiLink = (linkText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWikiLinkClick) {
      onWikiLinkClick(linkText);
    }
  };

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

  // Parse frontmatter manually (browser-compatible)
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
    
    // Simple YAML parsing for common cases
    const data: Record<string, any> = {};
    for (const line of frontmatterLines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Try to parse arrays
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

  // Auto-focus and resize textarea in edit mode
  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus();
      
      // Auto-resize textarea to content height
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [isEditMode]);

  if (isEditMode) {
    return (
      <div className="h-full flex flex-col">
        {/* Edit mode header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-800/30">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-orange-400 font-medium">📝 Edit Mode</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-orange-300/60">
            <span>Ctrl+Enter or Escape to finish • Click anywhere to edit</span>
            <button
              onClick={exitEditMode}
              className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* Full document textarea */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={exitEditMode}
              className="w-full bg-gray-800 text-gray-100 p-4 font-mono text-sm rounded resize-none focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors border border-gray-700"
              placeholder="Start writing markdown..."
              style={{ 
                minHeight: '500px',
                lineHeight: '1.5'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // View mode - rendered markdown
  return (
    <div className="h-full">
      {/* View mode header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-800/30">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-orange-400 font-medium">👁️ View Mode</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-orange-300/60">Click anywhere to edit</span>
          <button
            onClick={enterEditMode}
            className="px-3 py-1 bg-gray-700 text-orange-300 rounded text-xs hover:bg-gray-600 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Rendered markdown - clickable to enter edit mode */}
      <div
        onClick={(e) => {
          // Don't trigger edit mode if clicking on interactive elements
          const target = e.target as HTMLElement;
          const isInteractive = target.tagName === 'INPUT' || 
                               target.tagName === 'A' || 
                               target.tagName === 'BUTTON' ||
                               target.closest('input') || 
                               target.closest('a') ||
                               target.closest('button');
          
          if (!isInteractive) {
            enterEditMode();
          }
        }}
        className="cursor-text hover:bg-orange-950/10 transition-colors rounded p-6"
      >
        <div className="max-w-4xl mx-auto">
          {(() => {
            const { data: frontmatterData, content: contentToRender } = parseFrontmatter(value);
            
            return (
              <>
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

                <div className="prose prose-invert prose-lg max-w-none">
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
              // Interactive task checkboxes
              input: ({ checked, type, ...props }) => {
                if (type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        
                        // Find the checkbox in the raw markdown and toggle it
                        const newValue = value.replace(
                          checked ? /\[x\]/g : /\[ \]/g,
                          checked ? '[ ]' : '[x]'
                        );
                        onChange(newValue);
                      }}
                      className="mr-2 w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-600 focus:ring-2 cursor-pointer"
                      {...props}
                    />
                  );
                }
                return <input type={type} {...props} />;
              },

              // Code blocks
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
              
              // Blockquotes
              blockquote: ({ children, ...props }) => (
                <blockquote 
                  className="border-l-4 border-orange-500 pl-4 italic text-gray-300 my-4 bg-gray-800/30 py-2 rounded-r"
                  {...props}
                >
                  {children}
                </blockquote>
              ),
              
              // Tables
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-gray-600 bg-gray-800/50" {...props}>
                    {children}
                  </table>
                </div>
              ),
              
              th: ({ children, ...props }) => (
                <th className="border border-gray-600 bg-gray-700 px-4 py-2 text-left font-semibold text-white" {...props}>
                  {children}
                </th>
              ),
              
              td: ({ children, ...props }) => (
                <td className="border border-gray-600 px-4 py-2 text-gray-100" {...props}>
                  {children}
                </td>
              ),
              
              // Headings
              h1: ({ children, ...props }) => (
                <h1 className="text-2xl font-bold text-white border-b border-gray-600 pb-2 mt-8 mb-4" {...props}>
                  {children}
                </h1>
              ),
              
              h2: ({ children, ...props }) => (
                <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-1 mt-6 mb-3" {...props}>
                  {children}
                </h2>
              ),
              
              h3: ({ children, ...props }) => (
                <h3 className="text-lg font-bold text-white mt-5 mb-2" {...props}>
                  {children}
                </h3>
              ),
              
              // Links (including wiki links)
              a: ({ children, href, ...props }) => {
                if (href && href.startsWith('#')) {
                  // Wiki link
                  return (
                    <span
                      className="text-orange-400 hover:text-orange-300 cursor-pointer underline decoration-orange-500/50 hover:decoration-orange-400 transition-all duration-200"
                      onClick={(e) => handleWikiLink(String(children), e)}
                    >
                      {children}
                    </span>
                  );
                }
                
                // Regular link
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
              
              // Lists
              ul: ({ children, ...props }) => (
                <ul className="list-disc list-inside text-gray-200 space-y-1 ml-4" {...props}>
                  {children}
                </ul>
              ),
              
              ol: ({ children, ...props }) => (
                <ol className="list-decimal list-inside text-gray-200 space-y-1 ml-4" {...props}>
                  {children}
                </ol>
              ),
              
              // Paragraphs
              p: ({ children, ...props }) => (
                <p className="text-gray-200 mb-4 leading-relaxed" {...props}>
                  {children}
                </p>
              ),
            }}
          >
            {contentToRender}
          </ReactMarkdown>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};