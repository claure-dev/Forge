import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkWikiLink from 'remark-wiki-link';
import matter from 'gray-matter';

interface InteractiveMarkdownProps {
  content: string;
  onWikiLinkClick?: (linkText: string) => void;
  onTaskToggle?: (index: number, checked: boolean) => void;
}

export const InteractiveMarkdown: React.FC<InteractiveMarkdownProps> = ({ 
  content, 
  onWikiLinkClick,
  onTaskToggle 
}) => {
  // Parse frontmatter
  const { data: frontmatter, content: markdownContent } = matter(content);
  
  // Track task index for checkboxes
  let taskIndex = 0;

  // Create components with handlers
  const components = {
    // Custom checkbox component
    input: ({ checked, ...props }: any) => {
      if (props.type === 'checkbox') {
        const currentTaskIndex = taskIndex++;
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();
          if (onTaskToggle) {
            onTaskToggle(currentTaskIndex, !checked);
          }
        };
        
        return (
          <input
            {...props}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            className="mr-2 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-600 focus:ring-2 cursor-pointer"
          />
        );
      }
      return <input {...props} />;
    },

    // Custom link component for wiki links
    a: ({ href, children, ...props }: any) => {
      // Check if it's a wiki link (starts with #)
      if (href && href.startsWith('#')) {
        return (
          <span
            className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
            onClick={() => {
              if (onWikiLinkClick) {
                onWikiLinkClick(String(children));
              }
            }}
          >
            {children}
          </span>
        );
      }
      
      return (
        <a 
          {...props} 
          href={href} 
          className="text-blue-400 hover:text-blue-300 underline"
          target="_blank" 
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },

    // Custom code block with syntax highlighting
    code: ({ node, inline, className, children, ...props }: any) => {
      return (
        <code
          className={`${
            inline 
              ? 'bg-gray-800 text-pink-300 px-1 py-0.5 rounded text-sm' 
              : 'block bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto'
          } font-mono`}
          {...props}
        >
          {children}
        </code>
      );
    },

    // Custom blockquote
    blockquote: ({ children, ...props }: any) => (
      <blockquote 
        className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Custom table styling
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-600" {...props}>
          {children}
        </table>
      </div>
    ),
    
    th: ({ children, ...props }: any) => (
      <th className="border border-gray-600 bg-gray-800 px-4 py-2 text-left font-semibold" {...props}>
        {children}
      </th>
    ),
    
    td: ({ children, ...props }: any) => (
      <td className="border border-gray-600 px-4 py-2" {...props}>
        {children}
      </td>
    ),
  };

  return (
    <div className="prose prose-invert max-w-none">
      {/* Render frontmatter if present */}
      {Object.keys(frontmatter).length > 0 && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <div className="text-xs text-gray-400 mb-2 font-mono">YAML Frontmatter</div>
          <div className="space-y-1">
            {Object.entries(frontmatter).map(([key, value]) => (
              <div key={key} className="flex">
                <span className="text-blue-300 font-mono text-sm mr-2">{key}:</span>
                <span className="text-gray-300 text-sm">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render markdown content */}
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkFrontmatter,
          [remarkWikiLink, { 
            pageResolver: (name: string) => [name],
            hrefTemplate: (permalink: string) => `#${permalink}`,
            aliasDivider: '|'
          }]
        ]}
        components={components}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
};