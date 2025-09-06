import React, { useEffect, useState } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { history } from '@milkdown/plugin-history';
import { cursor } from '@milkdown/plugin-cursor';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { block } from '@milkdown/plugin-block';

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

const MilkdownEditorInner: React.FC<MilkdownEditorProps> = ({ 
  value, 
  onChange, 
  onWikiLinkClick 
}) => {
  const [loading, setLoading] = useState(true);

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, value);
        
        // Set up change listener
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            onChange(markdown);
          }
        });
      })
      .use(nord) // Use Nord theme for dark mode
      .use(commonmark) // Basic markdown support
      .use(history) // Undo/redo
      .use(cursor) // Better cursor handling
      .use(listener) // Change detection
      .use(block) // Block-level editing features
  );

  useEffect(() => {
    // Update editor content when value prop changes (external changes)
    const editor = get();
    if (editor && editor.action) {
      try {
        editor.action((ctx) => {
          const currentValue = ctx.get(defaultValueCtx);
          if (currentValue !== value) {
            ctx.set(defaultValueCtx, value);
          }
        });
      } catch (error) {
        console.log('Editor not ready yet:', error);
      }
    }
  }, [value, get]);

  useEffect(() => {
    // Mark as loaded after a short delay
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-orange-400 animate-pulse">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Milkdown />
    </div>
  );
};

export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  return (
    <div className="h-full milkdown-editor-wrapper">
      <MilkdownProvider>
        <MilkdownEditorInner {...props} />
      </MilkdownProvider>
      
      {/* Custom styling for Milkdown to match our theme */}
      <style jsx global>{`
        .milkdown-editor-wrapper .milkdown {
          padding: 1.5rem;
          max-width: 64rem;
          margin: 0 auto;
          height: 100%;
        }
        
        .milkdown-editor-wrapper .milkdown .editor {
          background: transparent !important;
          color: #e5e7eb !important;
          min-height: 100%;
        }
        
        /* Override Nord theme colors to match our orange theme */
        .milkdown-editor-wrapper .milkdown .editor h1,
        .milkdown-editor-wrapper .milkdown .editor h2,
        .milkdown-editor-wrapper .milkdown .editor h3,
        .milkdown-editor-wrapper .milkdown .editor h4,
        .milkdown-editor-wrapper .milkdown .editor h5,
        .milkdown-editor-wrapper .milkdown .editor h6 {
          color: #ffffff !important;
          border-bottom-color: #6b7280 !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor a {
          color: #fb923c !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor code {
          background: #374151 !important;
          color: #fb923c !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor pre {
          background: #374151 !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor blockquote {
          border-left-color: #ea580c !important;
          background: rgba(234, 88, 12, 0.1) !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor .tableWrapper table {
          border-color: #6b7280 !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor .tableWrapper th {
          background: #374151 !important;
          border-color: #6b7280 !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor .tableWrapper td {
          border-color: #6b7280 !important;
        }
        
        /* Cursor and selection */
        .milkdown-editor-wrapper .milkdown .editor .ProseMirror-focused {
          outline: none !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor ::selection {
          background: rgba(251, 146, 60, 0.3) !important;
        }
        
        /* Block plugin styling */
        .milkdown-editor-wrapper .milkdown .editor .block-handle {
          background: #6b7280 !important;
        }
        
        .milkdown-editor-wrapper .milkdown .editor .block-handle:hover {
          background: #fb923c !important;
        }
      `}</style>
    </div>
  );
};