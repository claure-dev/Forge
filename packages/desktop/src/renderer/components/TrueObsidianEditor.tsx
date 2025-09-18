import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView, ViewUpdate, keymap, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { EditorState, Extension, StateField } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle, syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface TrueObsidianEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

// Custom highlight style for markdown
const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#ffffff', fontSize: '1.5em', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#ffffff', fontSize: '1.3em', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#ffffff', fontSize: '1.1em', fontWeight: 'bold' },
  { tag: tags.strong, color: '#ffffff', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#ffffff', fontStyle: 'italic' },
  { tag: tags.link, color: '#fb923c', textDecoration: 'underline' },
  { tag: tags.monospace, color: '#fb923c', backgroundColor: '#374151', padding: '2px 4px', borderRadius: '3px' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
]);

// Widget for bold text
class BoldWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const strong = document.createElement('strong');
    strong.className = 'text-white font-bold';
    strong.textContent = this.text;
    return strong;
  }
}

// Widget for italic text
class ItalicWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const em = document.createElement('em');
    em.className = 'text-white italic';
    em.textContent = this.text;
    return em;
  }
}

// Widget for headers
class HeadingWidget extends WidgetType {
  constructor(private text: string, private level: number) {
    super();
  }

  toDOM() {
    const heading = document.createElement(`h${this.level}`);
    const classes = {
      1: 'text-2xl font-bold text-white border-b border-gray-600 pb-2 mb-2',
      2: 'text-xl font-bold text-white border-b border-gray-700 pb-1 mb-2',
      3: 'text-lg font-bold text-white mb-2',
      4: 'text-base font-bold text-white mb-2',
      5: 'text-sm font-bold text-white mb-1',
      6: 'text-xs font-bold text-white mb-1'
    };
    heading.className = classes[this.level as keyof typeof classes] || classes[3];
    heading.textContent = this.text;
    return heading;
  }
}

// Widget for inline code
class InlineCodeWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const code = document.createElement('code');
    code.className = 'bg-gray-800 text-orange-300 px-1 py-0.5 rounded text-sm font-mono';
    code.textContent = this.text;
    return code;
  }
}

// Widget for wiki links
class WikiLinkWidget extends WidgetType {
  constructor(private text: string, private onWikiLinkClick?: (linkText: string) => void) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.className = 'text-orange-400 hover:text-orange-300 cursor-pointer underline decoration-orange-500/50 hover:decoration-orange-400 transition-colors';
    link.textContent = this.text;
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onWikiLinkClick) {
        this.onWikiLinkClick(this.text);
      }
    };
    return link;
  }
}

// Live preview field with decorations
const livePreviewField = (onWikiLinkClick?: (text: string) => void) => StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    const doc = tr.state.doc;
    const selection = tr.state.selection.main;
    const activeLine = doc.lineAt(selection.head).number;
    
    const builder: Decoration[] = [];
    
    // Parse the document for markdown elements
    try {
      syntaxTree(tr.state).iterate({
        enter: (node) => {
          const from = node.from;
          const to = node.to;
          const text = doc.sliceString(from, to);
          const line = doc.lineAt(from).number;
          
          // Don't render decorations on the currently active line
          if (line === activeLine) {
            return;
          }
          
          try {
            switch (node.type.name) {
              case 'StrongEmphasis':
                const boldMatch = text.match(/^\*\*(.*?)\*\*$/);
                if (boldMatch && boldMatch[1]) {
                  builder.push(
                    Decoration.replace({
                      widget: new BoldWidget(boldMatch[1])
                    }).range(from, to)
                  );
                }
                break;
                
              case 'Emphasis':
                const italicMatch = text.match(/^\*(.*?)\*$/);
                if (italicMatch && italicMatch[1]) {
                  builder.push(
                    Decoration.replace({
                      widget: new ItalicWidget(italicMatch[1])
                    }).range(from, to)
                  );
                }
                break;
                
              case 'ATXHeading1':
              case 'ATXHeading2':
              case 'ATXHeading3':
              case 'ATXHeading4':
              case 'ATXHeading5':
              case 'ATXHeading6':
                const level = parseInt(node.type.name.slice(-1));
                const headingMatch = text.match(/^#{1,6}\s+(.+)$/);
                if (headingMatch && headingMatch[1]) {
                  builder.push(
                    Decoration.replace({
                      widget: new HeadingWidget(headingMatch[1], level)
                    }).range(from, to)
                  );
                }
                break;
                
              case 'InlineCode':
                const codeMatch = text.match(/^`(.*?)`$/);
                if (codeMatch && codeMatch[1]) {
                  builder.push(
                    Decoration.replace({
                      widget: new InlineCodeWidget(codeMatch[1])
                    }).range(from, to)
                  );
                }
                break;
            }
            
            // Handle wiki links
            if (text.includes('[[') && text.includes(']]')) {
              const wikiMatches = text.matchAll(/\[\[(.*?)\]\]/g);
              for (const match of wikiMatches) {
                if (match[1] && match.index !== undefined) {
                  const start = from + match.index;
                  const end = start + match[0].length;
                  builder.push(
                    Decoration.replace({
                      widget: new WikiLinkWidget(match[1], onWikiLinkClick)
                    }).range(start, end)
                  );
                }
              }
            }
          } catch (error) {
            console.debug('Decoration error:', error);
          }
        }
      });
    } catch (error) {
      console.debug('SyntaxTree error:', error);
    }
    
    return Decoration.set(builder.sort((a, b) => a.from - b.from));
  },
  provide: f => EditorView.decorations.from(f)
});

// Theme for cursor line highlighting and proper scrolling
const cursorLineTheme = EditorView.theme({
  '.cm-line': {
    padding: '2px 0'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(251, 146, 60, 0.1)'
  },
  '.cm-focused .cm-activeLine': {
    backgroundColor: 'rgba(251, 146, 60, 0.15)'
  },
  '.cm-content': {
    padding: '16px',
    minHeight: '100%',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  '.cm-editor': {
    height: '100%'
  },
  '.cm-focused': {
    outline: 'none'
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    overflowY: 'auto',
    overflowX: 'auto'
  }
});

export const TrueObsidianEditor: React.FC<TrueObsidianEditorProps> = ({
  value,
  onChange,
  onWikiLinkClick
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  const updateListener = useCallback((update: ViewUpdate) => {
    if (update.docChanged) {
      const doc = update.state.doc;
      const value = doc.toString();
      onChange(value);
    }
  }, [onChange]);
  
  useEffect(() => {
    if (!editorRef.current) return;
    
    const extensions: Extension[] = [
      markdown({
        base: markdownLanguage,
        codeLanguages: []
      }),
      history(),
      autocompletion(),
      closeBrackets(),
      highlightSelectionMatches(),
      syntaxHighlighting(obsidianHighlightStyle),
      cursorLineTheme,
      oneDark,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap
      ]),
      EditorView.updateListener.of(updateListener),
    ];
    
    const startState = EditorState.create({
      doc: value,
      extensions
    });
    
    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });
    
    viewRef.current = view;
    
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);
  
  // Update content when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      });
    }
  }, [value]);
  
  return (
    <div className="h-full">
      <div ref={editorRef} className="h-full" />
    </div>
  );
};