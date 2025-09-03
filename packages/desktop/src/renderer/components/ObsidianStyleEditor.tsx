import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from 'remark-wiki-link';

interface ObsidianStyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

export const ObsidianStyleEditor: React.FC<ObsidianStyleEditorProps> = ({ value, onChange, onWikiLinkClick }) => {
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [frontmatterExpanded, setFrontmatterExpanded] = useState<Record<number, boolean>>({});
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

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

  useEffect(() => {
    // Smart section parsing that respects code blocks and frontmatter
    const parseIntoSections = (content: string): string[] => {
      if (!content.trim()) return [];
      
      const lines = content.split('\n');
      const sections: string[] = [];
      let currentSection: string[] = [];
      let inCodeBlock = false;
      let inFrontmatter = false;
      let codeBlockDelimiter = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for frontmatter at the start
        if (i === 0 && line.trim() === '---') {
          inFrontmatter = true;
          currentSection.push(line);
          continue;
        }
        
        // End of frontmatter
        if (inFrontmatter && line.trim() === '---' && i > 0) {
          inFrontmatter = false;
          currentSection.push(line);
          continue;
        }
        
        // Check for code block start/end
        if (line.trim().match(/^```/)) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            codeBlockDelimiter = line.trim().match(/^```(.*)$/)?.[0] || '```';
          } else if (line.trim() === '```' || line.trim().startsWith('```')) {
            inCodeBlock = false;
            codeBlockDelimiter = '';
          }
          currentSection.push(line);
          continue;
        }
        
        // If we're in a code block or frontmatter, don't split on headers
        if (inCodeBlock || inFrontmatter) {
          currentSection.push(line);
          continue;
        }
        
        // Split on markdown headers (but not inside code blocks)
        if (line.match(/^#+\s/)) {
          // If we have content in current section, save it
          if (currentSection.length > 0) {
            sections.push(currentSection.join('\n').trim());
            currentSection = [];
          }
          currentSection.push(line);
        } else {
          currentSection.push(line);
        }
      }
      
      // Add the last section
      if (currentSection.length > 0) {
        sections.push(currentSection.join('\n').trim());
      }
      
      return sections.filter(section => section.trim());
    };
    
    const newSections = parseIntoSections(value);
    setSections(newSections.length > 0 ? newSections : [value]);
  }, [value]);

  const handleSectionEdit = (index: number, newContent: string) => {
    const updatedSections = [...sections];
    updatedSections[index] = newContent;
    const newValue = updatedSections.join('');
    onChange(newValue);
    setSections(updatedSections);
  };

  const handleSectionClick = (index: number) => {
    setEditingSection(index);
  };

  const handleFinishEditing = () => {
    setEditingSection(null);
  };

  const handleTaskToggle = (sectionIndex: number, taskText: string, isChecked: boolean) => {
    const section = sections[sectionIndex];
    const newCheckState = isChecked ? ' ' : 'x'; // Toggle the state
    const currentCheckState = isChecked ? 'x' : ' ';
    
    // Find and replace the specific task line
    const lines = section.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(`[${currentCheckState}]`) && line.includes(taskText)) {
        lines[i] = line.replace(`[${currentCheckState}]`, `[${newCheckState}]`);
        break;
      }
    }
    
    const updatedSection = lines.join('\n');
    handleSectionEdit(sectionIndex, updatedSection);
  };

  const handleWikiLink = (linkText: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent section editing
    if (onWikiLinkClick) {
      onWikiLinkClick(linkText);
    }
  };

  const renderSection = (section: string, index: number) => {
    const isEditing = editingSection === index;

    if (isEditing) {
      return (
        <div key={index} className="mb-4">
          <textarea
            value={section}
            onChange={(e) => handleSectionEdit(index, e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleFinishEditing();
              }
            }}
            className="w-full bg-gray-800 text-white p-4 font-mono text-sm rounded resize-none focus:ring-2 focus:ring-orange-500 transition-colors"
            style={{ minHeight: '100px' }}
            autoFocus
            rows={Math.max(3, section.split('\n').length)}
          />
          <div className="text-xs text-gray-400 mt-1">
            Press Escape to finish editing
          </div>
        </div>
      );
    }

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
    
    const { data: frontmatterData, content: contentToRender } = parseFrontmatter(section);

    return (
      <div
        key={index}
        onClick={(e) => {
          // Don't trigger section editing if clicking on interactive elements
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'SPAN' || target.closest('input') || target.closest('a')) {
            return;
          }
          handleSectionClick(index);
        }}
        className="mb-4 p-3 rounded hover:bg-orange-950/20 cursor-text transition-all duration-200 group border border-transparent hover:border-orange-800/30 hover:shadow-sm"
      >
        {/* Render frontmatter if present */}
        {frontmatterData && Object.keys(frontmatterData).length > 0 && (
          <div className="mb-4 bg-gray-800 rounded-lg">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setFrontmatterExpanded(prev => ({
                  ...prev,
                  [index]: !prev[index]
                }));
              }}
            >
              <div className="flex items-center space-x-2">
                <div className={`transform transition-transform duration-200 ${
                  frontmatterExpanded[index] ? 'rotate-90' : ''
                }`}>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <span className="text-xs text-gray-400 font-mono">YAML Frontmatter</span>
              </div>
              {!frontmatterExpanded[index] && (
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
            {frontmatterExpanded[index] && (
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
              input: ({ checked, type }) => {
                if (type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        // Find the task text by looking at the parent li element
                        const liElement = e.target.closest('li');
                        const fullText = liElement?.textContent || '';
                        // Remove the checkbox part to get just the task text
                        const taskText = fullText.replace(/^\s*[\[\]x\s]*/, '').trim();
                        handleTaskToggle(index, taskText, checked || false);
                      }}
                      className="mr-2 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-600 focus:ring-2 cursor-pointer"
                    />
                  );
                }
                return <input type={type} />;
              },

              // Custom styling for code blocks
              code: ({ node, inline, className, children, ...props }) => {
                return inline ? (
                  <code className="bg-gray-800 text-orange-300 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-hidden">
                    <code className="text-sm font-mono text-gray-100 whitespace-pre-wrap break-words" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              
              // Custom styling for blockquotes
              blockquote: ({ children, ...props }) => (
                <blockquote 
                  className="border-l-4 border-orange-500 pl-4 italic text-gray-300 my-4 bg-gray-800/30 py-2 rounded-r"
                  {...props}
                >
                  {children}
                </blockquote>
              ),
              
              // Custom styling for tables
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
              
              // Style headings
              h1: ({ children, ...props }) => (
                <h1 className="font-bold text-white border-b border-gray-600 pb-2 mt-8 mb-4" style={{ fontSize: '1.6rem', fontWeight: 700 }} {...props}>
                  {children}
                </h1>
              ),
              
              h2: ({ children, ...props }) => (
                <h2 className="font-bold text-white border-b border-gray-700 pb-1 mt-6 mb-3" style={{ fontSize: '1.3rem', fontWeight: 650 }} {...props}>
                  {children}
                </h2>
              ),
              
              h3: ({ children, ...props }) => (
                <h3 className="font-bold text-white mt-5 mb-2" style={{ fontSize: '1.15rem', fontWeight: 600 }} {...props}>
                  {children}
                </h3>
              ),
              
              // Interactive wiki links and regular links
              a: ({ children, href, ...props }) => {
                // Check if it's a wiki link (starts with #)
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
              
              // Style lists
              ul: ({ children, ...props }) => (
                <ul className="list-disc list-inside text-gray-200 space-y-1 ml-4" style={{ lineHeight: '1.6' }} {...props}>
                  {children}
                </ul>
              ),
              
              ol: ({ children, ...props }) => (
                <ol className="list-decimal list-inside text-gray-200 space-y-1 ml-4" style={{ lineHeight: '1.6' }} {...props}>
                  {children}
                </ol>
              ),
              
              // Style paragraphs
              p: ({ children, ...props }) => (
                <p className="text-gray-200 mb-4" style={{ lineHeight: '1.6' }} {...props}>
                  {children}
                </p>
              ),
            }}
          >
            {contentToRender}
          </ReactMarkdown>
        </div>
        
        {/* Hover indicator */}
        <div className="opacity-0 group-hover:opacity-50 text-xs text-gray-500 mt-1">
          Click to edit
        </div>
      </div>
    );
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        {sections.map(renderSection)}
        
        
        {/* Add new section */}
        {editingSection === null && (
          <div
            onClick={() => {
              const newSection = '\n\n';
              const updatedSections = [...sections, newSection];
              setSections(updatedSections);
              onChange(updatedSections.join(''));
              setEditingSection(updatedSections.length - 1);
            }}
            className="p-4 border-2 border-dashed border-orange-800/40 rounded cursor-pointer hover:border-orange-600/60 text-center text-orange-400/70 hover:text-orange-300 transition-all duration-200 bg-orange-950/10 hover:bg-orange-950/20"
          >
            Click to add new section...
          </div>
        )}
      </div>
    </div>
  );
};